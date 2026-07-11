"""Nightly feedback job (SPEC step 10 / PROGRESSION Part 3 & 7).

Per user, over the held-out last 3 recommendations that have a logged outcome,
compares the ML prediction's MAE against the rule engine's. If the model is not
beating the rules, it forces that user's blend cap to 0 — rules only — until it
earns its keep again. Both scores are logged.

Predictions are read from logged rows (the app writes rule_pred_e1rm, ml_pred_e1rm,
and the realized actual_e1rm on each recommendation) so this job is pure arithmetic
over history — it never re-runs either engine. Retraining the model itself is a
separate `--retrain` step that shells out to train.py on the exported table.

Input JSON: [{ "user_id", "performed_at", "rule_pred_e1rm", "ml_pred_e1rm",
               "actual_e1rm" }, ...]
Output JSON: [{ "user_id", "rule_mae", "ml_mae", "ml_alpha_cap", "n", "verdict" }, ...]
"""
from __future__ import annotations

import argparse
import json
import sys
from collections import defaultdict
from pathlib import Path

HOLDOUT = 3


def mae(pairs: list[tuple[float, float]]) -> float | None:
    if not pairs:
        return None
    return sum(abs(p - a) for p, a in pairs) / len(pairs)


def evaluate_user(rows: list[dict], holdout: int = HOLDOUT) -> dict:
    """Decide the ML blend cap for one user from their outcome history."""
    ordered = sorted(rows, key=lambda r: r["performed_at"])
    hold = ordered[-holdout:]

    def pairs(pred_key: str) -> list[tuple[float, float]]:
        return [
            (r[pred_key], r["actual_e1rm"])
            for r in hold
            if r.get(pred_key) is not None and r.get("actual_e1rm") is not None
        ]

    rule_mae = mae(pairs("rule_pred_e1rm"))
    ml_mae = mae(pairs("ml_pred_e1rm"))

    if rule_mae is None or ml_mae is None:
        # Not enough logged predictions on both sides to judge — leave ML enabled
        # (neutral); the blend's own cold-start gate still applies.
        return {
            "user_id": rows[0]["user_id"],
            "rule_mae": rule_mae,
            "ml_mae": ml_mae,
            "ml_alpha_cap": 1.0,
            "n": len(hold),
            "verdict": "insufficient_data",
        }

    ml_wins = ml_mae <= rule_mae
    return {
        "user_id": rows[0]["user_id"],
        "rule_mae": round(rule_mae, 3),
        "ml_mae": round(ml_mae, 3),
        "ml_alpha_cap": 1.0 if ml_wins else 0.0,
        "n": len(hold),
        "verdict": "ml_enabled" if ml_wins else "ml_disabled_rules_win",
    }


def run(rows: list[dict], holdout: int = HOLDOUT) -> list[dict]:
    by_user: dict[str, list[dict]] = defaultdict(list)
    for r in rows:
        by_user[r["user_id"]].append(r)
    return [evaluate_user(user_rows, holdout) for user_rows in by_user.values()]


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--input", type=Path, required=True, help="outcome rows JSON")
    ap.add_argument("--output", type=Path, help="write decisions JSON here")
    ap.add_argument("--retrain", type=Path, help="training-table JSON → retrain the model first")
    args = ap.parse_args()

    if args.retrain:
        # Retrain on the freshest exported table, then evaluate against outcomes.
        sys.path.insert(0, str(Path(__file__).resolve().parent))
        import train

        X, ye, yc = train.load_rows(args.retrain)
        reg, clf = train.train_models(X, ye, yc)
        import joblib

        out = Path(__file__).resolve().parent / "models" / "model.joblib"
        out.parent.mkdir(parents=True, exist_ok=True)
        joblib.dump(
            {"regressor": reg, "classifier": clf, "name": "elasticnet",
             "version": "nightly", "feature_count": X.shape[1]},
            out,
        )
        print(f"retrained → {out}")

    rows = json.loads(args.input.read_text())
    decisions = run(rows)
    for d in decisions:
        print(
            f"{d['user_id']}: rule_mae={d['rule_mae']} ml_mae={d['ml_mae']} "
            f"→ cap {d['ml_alpha_cap']} ({d['verdict']})"
        )
    if args.output:
        args.output.write_text(json.dumps(decisions, indent=2))
        print(f"wrote {args.output}")


if __name__ == "__main__":
    main()

"""Train the e1RM regressor + rep-completion classifier.

Build order per SPEC: ElasticNet (interpretable, works under 50 sessions) is the
default; `--model gbm` swaps in gradient boosting (sklearn HistGradientBoosting —
a drop-in for LightGBM without the native dependency). LightGBM can replace it
verbatim once data volume justifies it.

Data source:
  • --input training_table.json  — rows from TS buildTrainingTable
      [{ "features": [...51...], "label_e1rm": float, "label_completed": 0|1 }, ...]
  • otherwise a synthetic generator with a learnable signal (for a cold start /
    smoke training run).

Artifact: ml/models/model.joblib  (regressor, classifier, name, version, feature_count)
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))

from app.feature_spec import feature_count, feature_names  # noqa: E402

IDX = {name: i for i, name in enumerate(feature_names())}


def generate_synthetic(n: int, seed: int = 0) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Feature matrix + (e1RM, completed) labels with a genuine, learnable signal."""
    rng = np.random.default_rng(seed)
    N = feature_count()
    X = np.zeros((n, N))
    base = rng.uniform(100, 400, n)
    X[:, IDX["e1rm_roll3"]] = base + rng.normal(0, 3, n)
    X[:, IDX["e1rm_roll5"]] = base + rng.normal(0, 4, n)
    X[:, IDX["e1rm_roll10"]] = base + rng.normal(0, 5, n)
    slope = rng.normal(0.004 * base, 0.01 * base)  # lb/week (~0.4%)
    X[:, IDX["e1rm_slope_4wk"]] = slope
    X[:, IDX["e1rm_slope_8wk"]] = slope * 0.8
    X[:, IDX["days_since_last"]] = rng.uniform(2, 8, n)
    X[:, IDX["movement_weekly_tonnage"]] = rng.uniform(2000, 20000, n)
    acwr = rng.uniform(0.7, 1.7, n)
    X[:, IDX["acwr"]] = acwr
    X[:, IDX["rir_trend"]] = rng.normal(0, 0.5, n)
    failure = rng.uniform(0, 0.5, n)
    X[:, IDX["failure_rate_5"]] = failure
    rpe_trend = rng.normal(0, 0.3, n)
    X[:, IDX["rpe_trend"]] = rpe_trend
    X[:, IDX["training_age_months"]] = rng.uniform(1, 60, n)
    bw = rng.uniform(120, 240, n)
    X[:, IDX["bodyweight_lb"]] = bw
    X[:, IDX["relative_strength"]] = base / bw
    X[:, IDX["is_compound"]] = rng.integers(0, 2, n)
    X[:, IDX["is_unilateral"]] = rng.integers(0, 2, n)
    X[:, IDX["fatigue_cost"]] = rng.uniform(1, 5, n)

    # One valid movement pattern + equipment + two muscles per row.
    off_mp, off_eq, off_mus = 17, 17 + 9, 17 + 9 + 8
    for r in range(n):
        X[r, off_mp + rng.integers(0, 9)] = 1
        X[r, off_eq + rng.integers(0, 8)] = 1
        for m in rng.choice(17, size=2, replace=False):
            X[r, off_mus + m] = 1

    # Next-session e1RM: recent level nudged by trend, penalized by fatigue/failure.
    gain = 0.005 + 0.5 * (slope / base)
    gain -= 0.02 * np.maximum(0.0, acwr - 1.3)
    gain -= 0.03 * failure
    y_e1rm = base * (1.0 + gain) + rng.normal(0, 2, n)

    z = 2.0 - 4.0 * failure - 1.2 * np.maximum(0.0, rpe_trend) + 0.5 * X[:, IDX["rir_trend"]]
    p = 1.0 / (1.0 + np.exp(-z))
    y_completed = (rng.uniform(0, 1, n) < p).astype(int)
    return X, y_e1rm, y_completed


def load_rows(path: Path) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    rows = json.loads(Path(path).read_text())
    X = np.array([r["features"] for r in rows], dtype=float)
    y_e1rm = np.array([r["label_e1rm"] for r in rows], dtype=float)
    y_completed = np.array([int(r.get("label_completed", 0) or 0) for r in rows], dtype=int)
    if X.shape[1] != feature_count():
        raise ValueError(f"rows have {X.shape[1]} features, expected {feature_count()}")
    return X, y_e1rm, y_completed


def build_regressor(kind: str):
    from sklearn.pipeline import make_pipeline
    from sklearn.preprocessing import StandardScaler

    if kind == "gbm":
        from sklearn.ensemble import HistGradientBoostingRegressor

        return HistGradientBoostingRegressor(max_depth=3, learning_rate=0.08, max_iter=300)
    from sklearn.linear_model import ElasticNet

    return make_pipeline(StandardScaler(), ElasticNet(alpha=0.05, l1_ratio=0.3, max_iter=5000))


def build_classifier():
    from sklearn.linear_model import LogisticRegression
    from sklearn.pipeline import make_pipeline
    from sklearn.preprocessing import StandardScaler

    return make_pipeline(StandardScaler(), LogisticRegression(max_iter=2000))


def train_models(X, y_e1rm, y_completed, kind: str = "elasticnet"):
    reg = build_regressor(kind)
    reg.fit(X, y_e1rm)
    clf = build_classifier()
    # A single-class label set can't train a classifier; skip it if so.
    if len(np.unique(y_completed)) > 1:
        clf.fit(X, y_completed)
    else:
        clf = None
    return reg, clf


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--input", type=Path, help="training table JSON from TS buildTrainingTable")
    ap.add_argument("--model", choices=["elasticnet", "gbm"], default="elasticnet")
    ap.add_argument("--n", type=int, default=4000, help="synthetic sample size")
    ap.add_argument("--out", type=Path, default=ROOT / "models" / "model.joblib")
    ap.add_argument("--version", default="1")
    args = ap.parse_args()

    if args.input:
        X, y_e1rm, y_completed = load_rows(args.input)
        source = f"table:{args.input.name}"
    else:
        X, y_e1rm, y_completed = generate_synthetic(args.n)
        source = "synthetic"

    from sklearn.metrics import mean_absolute_error
    from sklearn.model_selection import train_test_split

    Xtr, Xte, ytr, yte, ctr, cte = train_test_split(X, y_e1rm, y_completed, test_size=0.2, random_state=0)
    reg, clf = train_models(Xtr, ytr, ctr, args.model)

    mae = mean_absolute_error(yte, reg.predict(Xte))
    # Naive baseline: predict the most recent rolling e1RM.
    naive = mean_absolute_error(yte, Xte[:, IDX["e1rm_roll3"]])
    print(f"source={source} model={args.model} n={len(X)}")
    print(f"holdout MAE: {mae:.2f} lb   (naive roll3 baseline: {naive:.2f} lb)")

    import joblib

    args.out.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(
        {
            "regressor": reg,
            "classifier": clf,
            "name": args.model,
            "version": args.version,
            "feature_count": feature_count(),
        },
        args.out,
    )
    print(f"saved {args.out}")


if __name__ == "__main__":
    main()

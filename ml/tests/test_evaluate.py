import evaluate


def _rows(user, preds):
    # preds: list of (rule_pred, ml_pred, actual)
    return [
        {
            "user_id": user,
            "performed_at": f"2026-01-{i + 1:02d}",
            "rule_pred_e1rm": rp,
            "ml_pred_e1rm": mp,
            "actual_e1rm": ac,
        }
        for i, (rp, mp, ac) in enumerate(preds)
    ]


def test_mae():
    assert evaluate.mae([(10, 12), (10, 8)]) == 2.0
    assert evaluate.mae([]) is None


def test_ml_beats_rules_keeps_cap_at_one():
    # ML nails the last 3; rules are off by 10.
    rows = _rows("u1", [(200, 200, 200), (210, 220, 220), (220, 231, 230), (230, 241, 240)])
    d = evaluate.evaluate_user(rows)
    assert d["ml_mae"] < d["rule_mae"]
    assert d["ml_alpha_cap"] == 1.0
    assert d["verdict"] == "ml_enabled"


def test_ml_worse_than_rules_forces_cap_zero():
    # ML wildly off on the holdout; rules close.
    rows = _rows("u2", [(200, 300, 200), (210, 300, 210), (220, 90, 220), (230, 400, 230)])
    d = evaluate.evaluate_user(rows)
    assert d["ml_mae"] > d["rule_mae"]
    assert d["ml_alpha_cap"] == 0.0
    assert d["verdict"] == "ml_disabled_rules_win"


def test_evaluates_only_the_last_three():
    # Early ML miss shouldn't count; holdout is the last 3, where ML is perfect.
    rows = _rows(
        "u3",
        [(200, 999, 200), (210, 210, 210), (220, 220, 220), (230, 230, 230)],
    )
    d = evaluate.evaluate_user(rows)
    assert d["n"] == 3
    assert d["ml_alpha_cap"] == 1.0


def test_insufficient_data_leaves_ml_enabled():
    rows = [
        {"user_id": "u4", "performed_at": "2026-01-01", "rule_pred_e1rm": 200,
         "ml_pred_e1rm": None, "actual_e1rm": 205},
    ]
    d = evaluate.evaluate_user(rows)
    assert d["verdict"] == "insufficient_data"
    assert d["ml_alpha_cap"] == 1.0


def test_run_groups_by_user():
    rows = _rows("a", [(1, 1, 1), (2, 2, 2), (3, 3, 3)]) + _rows("b", [(1, 9, 1), (2, 9, 2), (3, 9, 3)])
    out = {d["user_id"]: d for d in evaluate.run(rows)}
    assert set(out) == {"a", "b"}
    assert out["a"]["ml_alpha_cap"] == 1.0
    assert out["b"]["ml_alpha_cap"] == 0.0

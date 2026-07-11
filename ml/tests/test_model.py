import numpy as np
from sklearn.metrics import mean_absolute_error

import train
from app.feature_spec import feature_count, index_of
from app.model import E1RMModel, confidence, is_cold_start, suggested_alpha


def _fallback_features():
    v = [0.0] * feature_count()
    v[index_of("e1rm_roll3")] = 200.0
    v[index_of("e1rm_slope_4wk")] = 5.0
    v[index_of("failure_rate_5")] = 0.2
    return v


def test_fallback_predicts_recent_level_nudged_by_trend():
    m = E1RMModel()  # no artifact -> heuristic
    e1rm, prob = m.predict(_fallback_features())
    assert not m.is_trained
    assert abs(e1rm - 205.0) < 1e-6  # roll3 + slope
    assert abs(prob - 0.8) < 1e-6  # 1 - failure_rate


def test_alpha_and_confidence_rules():
    assert suggested_alpha(2, cold_start=True) == 0.0
    assert suggested_alpha(30, cold_start=False) == 0.8  # capped
    assert suggested_alpha(10, cold_start=False) == 0.5
    assert confidence(2, cold_start=True, is_trained=False) == 0.3
    assert is_cold_start(4) and not is_cold_start(5)


def test_trained_model_beats_naive_and_round_trips(tmp_path):
    X, y_e1rm, y_completed = train.generate_synthetic(2500, seed=2)
    cut = int(len(X) * 0.8)
    reg, clf = train.train_models(X[:cut], y_e1rm[:cut], y_completed[:cut])

    pred = reg.predict(X[cut:])
    mae = mean_absolute_error(y_e1rm[cut:], pred)
    naive = mean_absolute_error(y_e1rm[cut:], X[cut:, index_of("e1rm_roll3")])
    assert mae < naive  # the model captures signal beyond "repeat last e1RM"

    import joblib

    path = tmp_path / "model.joblib"
    joblib.dump(
        {
            "regressor": reg,
            "classifier": clf,
            "name": "elasticnet",
            "version": "test",
            "feature_count": feature_count(),
        },
        path,
    )
    loaded = E1RMModel.load(path)
    assert loaded.is_trained
    e1rm, prob = loaded.predict(list(X[cut]))
    assert np.isfinite(e1rm)
    assert 0.0 <= prob <= 1.0


def test_load_rejects_mismatched_feature_count(tmp_path):
    import joblib

    path = tmp_path / "bad.joblib"
    joblib.dump({"regressor": object(), "feature_count": 3}, path)
    # Wrong layout -> refuse the artifact, fall back to heuristic.
    assert not E1RMModel.load(path).is_trained

from fastapi.testclient import TestClient

from app.feature_spec import feature_count, index_of
from app.main import app

client = TestClient(app)


def _features():
    v = [0.0] * feature_count()
    v[index_of("e1rm_roll3")] = 200.0
    v[index_of("e1rm_roll5")] = 198.0
    v[index_of("failure_rate_5")] = 0.1
    return v


def test_health():
    r = client.get("/health")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "ok"
    assert body["feature_count"] == feature_count()


def test_predict_cold_start_uses_rules_only():
    r = client.post(
        "/predict",
        json={"features": _features(), "sessions_logged": 2, "sessions_for_exercise": 2},
    )
    assert r.status_code == 200
    b = r.json()
    assert b["cold_start"] is True
    assert b["suggested_alpha"] == 0.0  # rules only
    assert b["confidence"] == 0.3
    assert b["predicted_e1rm"] > 0
    assert 0.0 <= b["completion_probability"] <= 1.0


def test_predict_warm_blends_and_caps_alpha():
    r = client.post(
        "/predict",
        json={"features": _features(), "sessions_logged": 30, "sessions_for_exercise": 12},
    )
    b = r.json()
    assert b["cold_start"] is False
    assert b["suggested_alpha"] == 0.8  # min(0.8, 30/20)


def test_predict_rejects_wrong_feature_length():
    r = client.post(
        "/predict",
        json={"features": [0.0] * 10, "sessions_logged": 1, "sessions_for_exercise": 1},
    )
    assert r.status_code == 422


def test_cors_allows_cross_origin_browser_calls():
    r = client.post(
        "/predict",
        headers={"Origin": "https://workout-app-sage-three.vercel.app"},
        json={"features": _features(), "sessions_logged": 2, "sessions_for_exercise": 2},
    )
    assert r.headers.get("access-control-allow-origin") in ("*", "https://workout-app-sage-three.vercel.app")

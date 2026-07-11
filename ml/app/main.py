"""FastAPI ML service.

  GET  /health   → liveness + which model is loaded
  POST /predict  → next-session e1RM regression + completion probability

Blending (α·ml + (1−α)·rule), safety rails, and rounding stay on the TS side
(SPEC step 9). This service only produces the ML prediction, a suggested α, and a
confidence; the rule engine remains the permanent fallback.
"""
from __future__ import annotations

from fastapi import FastAPI

from .feature_spec import feature_count
from .model import (
    E1RMModel,
    confidence,
    is_cold_start,
    suggested_alpha,
)
from .schemas import PredictRequest, PredictResponse

app = FastAPI(title="Progressive Overload ML", version="1.0.0")

# Loaded once at import; reload by restarting the process after a retrain.
MODEL = E1RMModel.load()


@app.get("/health")
def health() -> dict:
    return {
        "status": "ok",
        "model": MODEL.name,
        "model_version": MODEL.version,
        "is_trained": MODEL.is_trained,
        "feature_count": feature_count(),
    }


@app.post("/predict", response_model=PredictResponse)
def predict(req: PredictRequest) -> PredictResponse:
    cold = is_cold_start(req.sessions_for_exercise)
    e1rm, prob = MODEL.predict(req.features)
    return PredictResponse(
        predicted_e1rm=round(e1rm, 2),
        completion_probability=round(prob, 4),
        confidence=confidence(req.sessions_for_exercise, cold, MODEL.is_trained),
        cold_start=cold,
        suggested_alpha=round(suggested_alpha(req.sessions_logged, cold), 4),
        model=MODEL.name,
        model_version=MODEL.version,
    )

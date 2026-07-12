"""FastAPI ML service.

  GET  /health   → liveness + which model is loaded
  POST /predict  → next-session e1RM regression + completion probability

Blending (α·ml + (1−α)·rule), safety rails, and rounding stay on the TS side
(SPEC step 9). This service only produces the ML prediction, a suggested α, and a
confidence; the rule engine remains the permanent fallback.
"""
from __future__ import annotations

import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .feature_spec import feature_count
from .model import (
    E1RMModel,
    confidence,
    is_cold_start,
    suggested_alpha,
)
from .push import router as push_router
from .schemas import PredictRequest, PredictResponse

app = FastAPI(title="Workout Tracker ML", version="1.0.0")

# The browser calls /predict cross-origin (from the Vercel app), so CORS is
# required. Restrict with ALLOWED_ORIGINS (comma-separated) in production; default
# is open since the endpoint is stateless and unauthenticated.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in os.environ.get("ALLOWED_ORIGINS", "*").split(",")],
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

# Loaded once at import; reload by restarting the process after a retrain.
MODEL = E1RMModel.load()

# Web Push: schedule/cancel rest-complete notifications (fires while the phone is
# locked). Needs an always-on machine so the scheduled task survives to send.
app.include_router(push_router)


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

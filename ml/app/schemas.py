"""Request/response schemas for /predict."""
from __future__ import annotations

from pydantic import BaseModel, Field, field_validator

from .feature_spec import feature_count


class PredictRequest(BaseModel):
    # Positional feature vector, ordered per feature_spec.json (what the TS
    # featureVectorToArray emits). Length is validated against the contract.
    features: list[float] = Field(..., description="Ordered feature vector")
    sessions_logged: int = Field(0, ge=0, description="Total sessions for the user")
    sessions_for_exercise: int = Field(
        0, ge=0, description="Sessions logged for this specific exercise"
    )

    @field_validator("features")
    @classmethod
    def _check_length(cls, v: list[float]) -> list[float]:
        expected = feature_count()
        if len(v) != expected:
            raise ValueError(f"expected {expected} features, got {len(v)}")
        return v


class PredictResponse(BaseModel):
    predicted_e1rm: float = Field(..., description="Regressed next-session e1RM, lb")
    completion_probability: float = Field(..., ge=0, le=1)
    confidence: float = Field(..., ge=0, le=1)
    cold_start: bool = Field(..., description="< 5 sessions for this exercise → rules only")
    suggested_alpha: float = Field(
        ..., ge=0, le=1, description="Blend weight for ML vs rule prediction"
    )
    model: str
    model_version: str

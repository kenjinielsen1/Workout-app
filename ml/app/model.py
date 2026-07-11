"""Model loading + prediction, with a permanent heuristic fallback.

The trained artifact is a joblib bundle {regressor, classifier, name, version}.
When no artifact is present (fresh deploy, cold catalog) the model degrades to a
transparent heuristic so /predict always answers — the TS rule engine remains the
real safety net regardless.
"""
from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import numpy as np

from .feature_spec import feature_count, index_of

COLD_START_THRESHOLD = 5
DEFAULT_MODEL_PATH = Path(__file__).resolve().parent.parent / "models" / "model.joblib"


def _clamp(x: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, x))


@dataclass
class E1RMModel:
    regressor: Any = None
    classifier: Any = None
    name: str = "fallback-heuristic"
    version: str = "0-fallback"

    @property
    def is_trained(self) -> bool:
        return self.regressor is not None

    @classmethod
    def load(cls, path: Path | str | None = None) -> "E1RMModel":
        path = Path(path or os.environ.get("MODEL_PATH", DEFAULT_MODEL_PATH))
        if not path.exists():
            return cls()  # heuristic fallback
        import joblib

        bundle = joblib.load(path)
        # A model trained on a different feature layout is unsafe to use.
        if int(bundle.get("feature_count", -1)) != feature_count():
            return cls()
        return cls(
            regressor=bundle.get("regressor"),
            classifier=bundle.get("classifier"),
            name=bundle.get("name", "trained"),
            version=bundle.get("version", "unknown"),
        )

    def predict(self, features: list[float]) -> tuple[float, float]:
        """Return (predicted_e1rm_lb, completion_probability)."""
        x = np.asarray(features, dtype=float).reshape(1, -1)

        if self.regressor is not None:
            e1rm = float(self.regressor.predict(x)[0])
        else:
            # Heuristic: most recent rolling e1RM available, nudged by trend.
            roll3 = features[index_of("e1rm_roll3")]
            roll5 = features[index_of("e1rm_roll5")]
            roll10 = features[index_of("e1rm_roll10")]
            base = next((v for v in (roll3, roll5, roll10) if v > 0), 0.0)
            slope = features[index_of("e1rm_slope_4wk")]  # lb/week
            e1rm = base + slope  # ~one week ahead

        if self.classifier is not None:
            prob = float(self.classifier.predict_proba(x)[0, 1])
        else:
            failure_rate = features[index_of("failure_rate_5")]
            prob = _clamp(1.0 - failure_rate, 0.05, 0.95)

        return e1rm, _clamp(prob, 0.0, 1.0)


def suggested_alpha(sessions_logged: int, cold_start: bool) -> float:
    """Blend weight for ML vs rule prediction (SPEC): 0 during cold start."""
    if cold_start:
        return 0.0
    return min(0.8, sessions_logged / 20.0)


def confidence(sessions_for_exercise: int, cold_start: bool, is_trained: bool) -> float:
    if cold_start:
        return 0.3  # rules-only regime
    base = 0.3 + 0.03 * sessions_for_exercise
    if not is_trained:
        base = min(base, 0.5)  # heuristic model can't earn high confidence
    return round(_clamp(base, 0.3, 0.9), 3)


def is_cold_start(sessions_for_exercise: int) -> bool:
    return sessions_for_exercise < COLD_START_THRESHOLD

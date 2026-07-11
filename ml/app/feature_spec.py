"""Loads the feature contract shared with the TypeScript pipeline.

ml/feature_spec.json is generated from src/lib/features.ts (`npm run feature:spec`),
so the ordered vector the service consumes is exactly the one featureVectorToArray
emits. Feature values arrive positionally; this module names them.
"""
from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path

_SPEC_PATH = Path(__file__).resolve().parent.parent / "feature_spec.json"


@lru_cache(maxsize=1)
def _spec() -> dict:
    with open(_SPEC_PATH, encoding="utf-8") as fh:
        return json.load(fh)


def feature_names() -> list[str]:
    return list(_spec()["feature_names"])


def feature_count() -> int:
    return int(_spec()["count"])


def index_of(name: str) -> int:
    """Position of a named feature in the vector (for the fallback heuristic)."""
    return feature_names().index(name)

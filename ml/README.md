# ML service

FastAPI service that regresses next-session e1RM and predicts rep completion.
The TypeScript rule engine ([../src/lib/progression.ts](../src/lib/progression.ts))
is the **permanent fallback**; this service only produces the ML prediction, a
suggested blend weight α, and a confidence. Blending, safety rails, and rounding
stay on the TS side (SPEC step 9).

## Contract

The feature vector layout is shared with the TS pipeline via
[`feature_spec.json`](feature_spec.json), generated from `src/lib/features.ts`
(`npm run feature:spec`). Features arrive **positionally**, ordered per that file
(what `featureVectorToArray` emits). A drift guard on the TS side fails if they
diverge.

## Endpoints

- `GET /health` → `{status, model, model_version, is_trained, feature_count}`
- `POST /predict`
  ```json
  { "features": [ … 51 floats … ], "sessions_logged": 30, "sessions_for_exercise": 12 }
  ```
  ```json
  { "predicted_e1rm": 231.5, "completion_probability": 0.82, "confidence": 0.66,
    "cold_start": false, "suggested_alpha": 0.8, "model": "elasticnet", "model_version": "1" }
  ```
  - **Cold start** (`sessions_for_exercise < 5`): `suggested_alpha = 0`,
    `confidence = 0.3` — the caller uses rules only.
  - `suggested_alpha = min(0.8, sessions_logged / 20)`.

## Models

Build order (SPEC): **ElasticNet** (interpretable, works under 50 sessions) is the
default; `--model gbm` swaps in gradient boosting (sklearn HistGradientBoosting, a
drop-in for LightGBM without the native dep). A logistic classifier predicts rep
completion. With no artifact present, the service degrades to a transparent
heuristic (recent rolling e1RM nudged by the 4-week slope).

## Develop

```bash
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt

pytest                       # unit + API tests
python train.py --n 4000     # train on synthetic data → models/model.joblib
python train.py --input training_table.json   # train on the real TS-exported table
uvicorn app.main:app --reload --port 8000
```

## Deploy

`docker build -t po-ml . && docker run -p 8000:8000 po-ml`. Train (or mount) a
`model.joblib` at `$MODEL_PATH`; until then `/predict` serves the fallback. The
nightly retrain + MAE-vs-rules gate is SPEC step 10.

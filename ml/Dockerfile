# ML service image. Deploy to Fly.io / Railway. Runs the heuristic fallback until
# a model.joblib is trained/mounted at $MODEL_PATH — the TS rule engine is the real
# safety net either way.
FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app
COPY feature_spec.json .
COPY train.py .

# Bake in a starter model so /predict serves real ElasticNet predictions rather
# than the heuristic fallback. The nightly evaluate/retrain replaces it with one
# trained on real logged outcomes (and gates it off if it underperforms the rules).
RUN python train.py --n 4000

ENV MODEL_PATH=/app/models/model.joblib
EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

// Thin client for the FastAPI ML service. Returns null whenever the service is
// unconfigured, unreachable, or errors — the caller then blends with α=0, i.e.
// falls back to the rule engine. The service being down must never break logging.

import type { MLPrediction } from './blend';

const ML_URL = import.meta.env.VITE_ML_URL;

export const isMLConfigured = Boolean(ML_URL);

export async function predict(
  features: number[],
  sessionsLogged: number,
  sessionsForExercise: number,
  timeoutMs = 2500,
): Promise<MLPrediction | null> {
  if (!ML_URL) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${ML_URL.replace(/\/$/, '')}/predict`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        features,
        sessions_logged: sessionsLogged,
        sessions_for_exercise: sessionsForExercise,
      }),
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const d = await res.json();
    return {
      predicted_e1rm: d.predicted_e1rm,
      completion_probability: d.completion_probability,
      confidence: d.confidence,
      cold_start: d.cold_start,
    };
  } catch {
    return null; // network error / timeout / abort → rule-only
  } finally {
    clearTimeout(timer);
  }
}

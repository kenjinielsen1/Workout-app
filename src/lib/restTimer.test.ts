import { describe, expect, it } from 'vitest';
import {
  clearRest,
  isExpired,
  loadRest,
  persistRest,
  remainingMs,
  remainingSec,
  restKey,
  startRest,
} from './restTimer';

// A tiny in-memory Storage stand-in so these stay pure (node env, no localStorage).
function mem() {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
  };
}

const T0 = 1_000_000_000_000; // fixed "now"

describe('wall-clock rest timer', () => {
  it('startRest records an absolute end timestamp, not a running counter', () => {
    const s = startRest(90, { now: T0 });
    expect(s.endsAt).toBe(T0 + 90_000);
    expect(s.durationSec).toBe(90);
    expect(s.notified).toBe(false);
  });

  it('remaining is derived from endsAt - now (recompute, never decrement)', () => {
    const s = startRest(90, { now: T0 });
    expect(remainingSec(s, T0)).toBe(90);
    expect(remainingSec(s, T0 + 30_000)).toBe(60); // reopen at 30s in → 60s left
    expect(remainingSec(s, T0 + 60_000)).toBe(30); // reopen at 60s in → 30s left
  });

  it('acceptance: wait past the end → remaining is 0 and expired (notification fires)', () => {
    const s = startRest(90, { now: T0 });
    expect(remainingMs(s, T0 + 90_000)).toBe(0);
    expect(remainingMs(s, T0 + 200_000)).toBe(0); // never negative
    expect(isExpired(s, T0 + 90_000)).toBe(true);
    expect(isExpired(s, T0 + 89_999)).toBe(false);
  });

  it('acceptance: reopen mid-rest shows the correct remaining, no drift', () => {
    // Rest started, "app killed", relaunched 60s later — recompute, not resume.
    const started = startRest(90, { now: T0 });
    const store = mem();
    persistRest('u1', started, store);

    const restored = loadRest('u1', store)!;
    expect(restored.endsAt).toBe(started.endsAt);
    // 60s of wall-clock elapsed while the app was dead → ~30s remain.
    expect(remainingSec(restored, T0 + 60_000)).toBe(30);
  });

  it('acceptance: return after it expired → restored state reads done, no stale number', () => {
    const started = startRest(90, { now: T0 });
    const store = mem();
    persistRest('u1', started, store);
    const restored = loadRest('u1', store)!;
    expect(isExpired(restored, T0 + 120_000)).toBe(true);
    expect(remainingSec(restored, T0 + 120_000)).toBe(0);
  });

  it('persists per-user and clears cleanly', () => {
    const store = mem();
    persistRest('a', startRest(60, { now: T0 }), store);
    persistRest('b', startRest(120, { now: T0 }), store);
    expect(store.getItem(restKey('a'))).not.toBeNull();
    expect(loadRest('a', store)!.durationSec).toBe(60);
    expect(loadRest('b', store)!.durationSec).toBe(120);
    clearRest('a', store);
    expect(loadRest('a', store)).toBeNull();
    expect(loadRest('b', store)).not.toBeNull();
  });

  it('loadRest tolerates a missing or corrupt entry', () => {
    const store = mem();
    expect(loadRest('nope', store)).toBeNull();
    store.setItem(restKey('bad'), '{ not json');
    expect(loadRest('bad', store)).toBeNull();
    store.setItem(restKey('bad2'), JSON.stringify({ durationSec: 5 })); // no endsAt
    expect(loadRest('bad2', store)).toBeNull();
  });
});

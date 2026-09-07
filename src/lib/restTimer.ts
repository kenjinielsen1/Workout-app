// Wall-clock rest timer (BUGFIXES.md Bugs 1 & 2).
//
// A PWA cannot keep a JS timer running while the phone is locked or backgrounded
// — iOS Safari suspends the page within seconds. So we do NOT run a background
// timer. We record the absolute clock time the rest ENDS, derive the visible
// countdown from `endsAt - now` on every tick, and schedule a notification for
// that fixed timestamp (see restNotify.ts). Backgrounding never "pauses" or
// "resumes" — on return we simply recompute. Nothing to drift.
//
// Persistence uses localStorage: it's on-device and survives reload AND a full
// app kill (the OFFLINE_FIRST requirement), and unlike IndexedDB it reads
// synchronously — so on launch we restore the countdown with no async flash of a
// stale/zero value. Matches the existing `po:workoutStart` clock in Home.

export interface RestState {
  /** Absolute wall-clock time (ms since epoch) the rest ends. */
  endsAt: number;
  /** Original rest length in seconds — for display/context only. */
  durationSec: number;
  /** Exercise the rest belongs to (notification body context). */
  exerciseName?: string;
  /** Whether the "rest complete" notification has already been shown for THIS
   *  rest, so a reload / re-focus doesn't fire it again. */
  notified: boolean;
}

export const restKey = (userId: string): string => `po:rest:${userId}`;

/** Milliseconds left, floored at 0. The visible number is always derived from
 *  this — never a stored counter that gets decremented. */
export function remainingMs(state: Pick<RestState, 'endsAt'>, now: number): number {
  return Math.max(0, state.endsAt - now);
}

/** Whole seconds left (ceil, so 89.2s reads "90" then counts down cleanly). */
export function remainingSec(state: Pick<RestState, 'endsAt'>, now: number): number {
  return Math.ceil(remainingMs(state, now) / 1000);
}

/** How late a "rest complete" alert may still be useful. Past this the rest is
 *  history, not a cue — announcing it would be an alert at a random time. */
export const NOTIFY_GRACE_MS = 5 * 60_000;

/** Beyond this a finished rest shouldn't linger in the UI either. */
export const STALE_REST_MS = 60 * 60_000;

/**
 * Whether this rest still warrants a "rest complete" alert.
 *
 * The naive test — expired and not yet notified — fires on the next app launch for
 * a rest that was still running when the app was closed. That launch can be days
 * later, which is exactly how a rest-timer alert arrives out of nowhere.
 */
export function shouldNotifyRest(state: Pick<RestState, 'endsAt' | 'notified'>, now: number): boolean {
  if (state.notified || !isExpired(state, now)) return false;
  return now - state.endsAt <= NOTIFY_GRACE_MS;
}

/** A finished rest old enough that it should simply be forgotten. */
export function isStaleRest(state: Pick<RestState, 'endsAt'>, now: number): boolean {
  return now - state.endsAt > STALE_REST_MS;
}

/** True once the rest has fully elapsed. */
export function isExpired(state: Pick<RestState, 'endsAt'>, now: number): boolean {
  return now >= state.endsAt;
}

/** Begin a rest: compute the absolute end timestamp. Pure — the caller persists
 *  and schedules the notification. */
export function startRest(
  durationSec: number,
  opts: { now?: number; exerciseName?: string } = {},
): RestState {
  const now = opts.now ?? Date.now();
  return {
    endsAt: now + durationSec * 1000,
    durationSec,
    exerciseName: opts.exerciseName,
    notified: false,
  };
}

// --- persistence (survives reload + full app kill) --------------------------

type Storage = Pick<globalThis.Storage, 'getItem' | 'setItem' | 'removeItem'>;

const memoryFallback = (): Storage => {
  const m = new Map<string, string>();
  return {
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => void m.set(k, v),
    removeItem: (k) => void m.delete(k),
  };
};

function store(explicit?: Storage): Storage {
  if (explicit) return explicit;
  try {
    if (typeof localStorage !== 'undefined') return localStorage;
  } catch {
    /* access can throw in sandboxed contexts */
  }
  return memoryFallback();
}

export function persistRest(userId: string, state: RestState, storage?: Storage): void {
  try {
    store(storage).setItem(restKey(userId), JSON.stringify(state));
  } catch {
    /* quota / private mode — the in-foreground timer still works */
  }
}

export function loadRest(userId: string, storage?: Storage): RestState | null {
  try {
    const raw = store(storage).getItem(restKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<RestState>;
    if (typeof parsed?.endsAt === 'number' && Number.isFinite(parsed.endsAt)) {
      return {
        endsAt: parsed.endsAt,
        durationSec: parsed.durationSec ?? 0,
        exerciseName: parsed.exerciseName,
        notified: parsed.notified ?? false,
      };
    }
  } catch {
    /* corrupt entry — treat as no rest */
  }
  return null;
}

export function clearRest(userId: string, storage?: Storage): void {
  try {
    store(storage).removeItem(restKey(userId));
  } catch {
    /* ignore */
  }
}

// React binding for the wall-clock rest timer (BUGFIXES.md Bugs 1 & 2).
//
// The visible countdown is DERIVED from `endsAt - now`, recomputed every tick
// while foregrounded and again on `visibilitychange` / launch. We never decrement
// a stored counter. On expiry we fire the notification once (foreground/on-return
// fallback); the scheduled trigger (restNotify) covers the app-closed case.

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  clearRest,
  isExpired,
  loadRest,
  persistRest,
  remainingSec,
  startRest,
  type RestState,
} from '../lib/restTimer';
import {
  cancelRestNotification,
  ensureNotifyPermission,
  notifyCapability,
  scheduleRestNotification,
  showRestCompleteNow,
  type NotifyCapability,
} from '../lib/restNotify';
import { cancelServerPush, scheduleServerPush } from '../lib/push';
import { haptic } from '../lib/haptics';

export interface UseRestTimer {
  /** Seconds remaining (0 once elapsed). Derived from the wall clock. */
  remaining: number;
  /** A rest is active and hasn't elapsed. */
  resting: boolean;
  /** A rest existed and has just elapsed (show "rest complete"). */
  done: boolean;
  /** Original rest length, for progress display. */
  durationSec: number;
  /** The exercise this rest leads into (the "next up" label). Survives switching
   *  the active lift, since it's read from the persisted rest, not a live prop. */
  exerciseName: string | undefined;
  /** Notification capability snapshot (drives the iOS install / permission UI). */
  capability: NotifyCapability;
  /** Begin a rest of `durationSec`. Requests permission on first use (gesture). */
  start: (durationSec: number, exerciseName?: string) => void;
  /** Clear the rest (dismiss button / new set), cancelling any pending notif. */
  dismiss: () => void;
}

export function useRestTimer(userId: string): UseRestTimer {
  const [state, setState] = useState<RestState | null>(() => loadRest(userId));
  const [now, setNow] = useState(() => Date.now());
  const [capability, setCapability] = useState<NotifyCapability>(() => notifyCapability());
  const stateRef = useRef<RestState | null>(state);
  stateRef.current = state;

  // Restore any live rest when the user changes (or on first mount).
  useEffect(() => {
    setState(loadRest(userId));
    setNow(Date.now());
  }, [userId]);

  // Fire the "rest complete" notification exactly once for a given rest. Persists
  // the `notified` flag so a reload after expiry doesn't re-alert.
  const fireIfExpired = useCallback(
    (s: RestState | null, t: number) => {
      if (!s || s.notified || !isExpired(s, t)) return;
      const updated = { ...s, notified: true };
      setState(updated);
      persistRest(userId, updated);
      haptic('affirm'); // the phone may be face-down on a bench (POLISH.md §2)
      void showRestCompleteNow();
    },
    [userId],
  );

  // Foreground ticking: recompute `now` ~4x/sec while a rest is active AND the tab
  // is visible. No timer runs while backgrounded — we recompute on return instead.
  useEffect(() => {
    if (!state || state.notified) return;
    let raf = 0;
    let interval = 0;
    const tick = () => {
      const t = Date.now();
      setNow(t);
      fireIfExpired(stateRef.current, t);
    };
    // 250ms interval is smooth enough for a MM:SS readout and cheap on battery.
    interval = window.setInterval(tick, 250);
    // rAF gives an immediate first frame after paint.
    raf = requestAnimationFrame(tick);
    return () => {
      clearInterval(interval);
      cancelAnimationFrame(raf);
    };
  }, [state, fireIfExpired]);

  // On return to the tab (or launch), recompute immediately — this is what makes
  // the timer "correct" after backgrounding even though it wasn't running.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      const fresh = loadRest(userId) ?? stateRef.current;
      if (fresh && fresh !== stateRef.current) setState(fresh);
      const t = Date.now();
      setNow(t);
      fireIfExpired(fresh, t);
      setCapability(notifyCapability()); // permission may have changed while away
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, [userId, fireIfExpired]);

  const start = useCallback(
    (durationSec: number, exerciseName?: string) => {
      const s = startRest(durationSec, { exerciseName });
      setState(s);
      persistRest(userId, s);
      setNow(Date.now());
      // Permission on first use (this runs inside the log-set gesture), then
      // schedule the fire-while-closed notification. Two mechanisms:
      //  · scheduleRestNotification — local Notification Triggers (where supported)
      //  · scheduleServerPush — Web Push from the server; the ONLY path that fires
      //    on a locked iPhone (iOS has no local scheduled-notification API).
      void ensureNotifyPermission().then((perm) => {
        setCapability(notifyCapability());
        if (perm === 'granted') {
          void scheduleRestNotification(s.endsAt);
          void scheduleServerPush(s.endsAt, exerciseName);
        }
      });
    },
    [userId],
  );

  const dismiss = useCallback(() => {
    setState(null);
    clearRest(userId);
    void cancelRestNotification();
    void cancelServerPush();
  }, [userId]);

  return {
    remaining: state ? remainingSec(state, now) : 0,
    resting: !!state && !isExpired(state, now),
    done: !!state && isExpired(state, now),
    durationSec: state?.durationSec ?? 0,
    exerciseName: state?.exerciseName,
    capability,
    start,
    dismiss,
  };
}

# Offline-First / Real-Time Requirements

> Companion to `SPEC.md` and `PROGRESSION.md`. This governs how the app behaves on
> a gym floor with bad or no connectivity. It is a hard architectural constraint,
> not a nice-to-have.

## The one rule everything else follows from

**The recommendation path must never touch the network.** The "what should I lift
next" number — next set, next session, rest timer, double-progression logic — is
computed by pure local TypeScript from data already on the device. No `fetch`, no
Supabase call, no `/predict` round-trip on the live path.

The ML service may only ever *improve* a recommendation the local rule engine has
already produced. It is never the source of truth in real time. The existing blend
already supports this: when offline, `α = 0` and the rule engine's output stands
unchanged.

## Two paths, kept separate

**Live path (must be local + synchronous):**
- Compute next-set target and rest timer
- Log a set (weight, reps, RIR)
- Within-session double progression (hit reps → next set updates instantly)
- Render today's session (already computed at the end of the last session)

**Deferred path (may be async, may require network):**
- Between-session readiness score, e1RM trend, ACWR — recomputed when a workout is
  *finished*, to set up the *next* visit
- ML refinement of thresholds and weights
- Supabase sync

Mid-workout, only the live path runs. The heavy autoregulation math from
`PROGRESSION.md` runs once, on session completion, to prepare next time.

## Local-write-first for logging

When a set is logged, write to on-device storage **synchronously** and update the
UI immediately. Never `await` a Supabase insert before the UI reflects the set. A
logged set must survive airplane mode, a killed app, and a dead zone.

- On-device store is the system of record during a session (IndexedDB, or SQLite
  if React Native).
- A background sync queue reconciles with Supabase whenever a connection exists.
- Sync is idempotent: each set/workout/recommendation carries a client-generated
  UUID so replaying the queue never duplicates rows.
- Conflict policy: last-write-wins per row is fine here — a single user on one
  device at a time. Do not build CRDTs.

## Today's session is precomputed

When a workout is marked complete, immediately compute and persist the *next*
session's prescription to the local store. Opening the app at the gym reads a ready
value — it never computes on open and never waits on a server.

## Installability

Real-time gym use means this must feel native: installable, launches offline, fast
on a mid-range phone.
- If web: make it a PWA — service worker caching the app shell, offline launch,
  add-to-home-screen. Vite supports this via `vite-plugin-pwa`.
- Cache the app shell and the local data layer; the app must fully boot with zero
  network.

## What to check in the current codebase

1. Find where the next-set / next-session target is computed. If it returns from a
   `fetch` or a Supabase call, that logic moves to a local pure function. The
   network version becomes an optional post-hoc refinement only.
2. Find the set-logging handler. If it `await`s a remote insert before updating
   state, invert it: local write + optimistic UI first, enqueue the sync.
3. Confirm the app boots and a full workout can be logged with the network fully
   disabled. That is the acceptance test.

## Acceptance tests

- **Airplane-mode workout:** disable all networking, log a complete multi-exercise
  session, kill the app mid-session, reopen — every logged set is present and the
  next-set targets were correct throughout.
- **Reconnect sync:** re-enable networking, assert all queued sets/workouts reach
  Supabase exactly once (no duplicates, no losses).
- **Cold open at the gym:** with a slow/flaky connection, opening the app shows
  today's prescription in under one second with no spinner on the recommendation.

# Feature — Alternating Exercise Pairing (ad hoc)

> Companion to `SPEC.md`, `FEATURES.md`. A **UI-only** feature. No engine changes, no schema changes, no persistence.

## What this is

Show two exercises on one screen and alternate between them, with normal prescribed rest between every set:

```
extensions → rest → laterals → rest → extensions → rest → laterals → ...
```

## What this is NOT

**This is not a superset.** A superset means minimal rest between paired movements, which creates fatigue carryover and would require engine changes (RIR interpretation, volume quality, dual rest periods). That is explicitly out of scope.

Here, full rest is taken between every set. Each muscle actually gets *more* rest than usual (it recovers through the other exercise's set plus both timers). The physiology is identical to performing the two exercises separately — only the clock is compressed. The user is filling rest time productively, not training harder.

## Why nothing else changes

Because rest is unchanged, **no engine logic is affected**:

- `correctedRIR()` — unchanged. Sets are performed rested; the existing bias correction holds.
- Progression / readiness — unchanged. Each exercise progresses on its own history, its own readiness score, its own double progression.
- Volume counting (`VOLUME.md`) — unchanged. Each set counts as a normal hard set for its muscle.
- Rest timer duration — unchanged. Normal prescribed rest.
- Sets are logged exactly as they are today, against their own exercise. Nothing marks them as "paired."

**Do not add a pairing field to `sets`, `workouts`, or any table.** The pairing exists only in view state for the duration of the session.

## Behavior

1. On the Today screen, the user selects a second exercise to pair with the current one. Ad hoc — chosen in the moment, not saved.
2. Both exercises render on one screen, each showing its own target (weight × reps) and its own set progress.
3. The user logs a set of A. Rest timer starts (normal duration, existing wall-clock model from `BUGFIXES.md`).
4. **The screen makes clear that B is up next when the timer fires.** This is the only genuinely new UI requirement — the timer already works, but the user needs to know which exercise the rest is leading into.
5. Log B, rest, back to A. Repeat until both are done.
6. Unpair at any time; the exercises revert to normal independent display. Nothing is persisted either way.

## Implementation (as built)

The pairing is pure Home view-state (`pairedId`, never persisted) plus one small prop:

- **`PairBar`** renders both exercises as two cells — each with its own target (weight × reps) and this-session working-set count — with the active cell highlighted. Tapping the inactive cell makes it the active (loggable) exercise; the ✕ unpairs.
- **`LogSet`** gains one optional prop, `nextUpName`. When set, the rest it starts is labelled with the *next* exercise (the one the rest leads into), and the rest-timer UI reads **"next up · {name}"**. Unset (the unpaired case) → byte-identical to today, no label.
- Alternation reuses the existing wall-clock rest (`po:rest:<user>` in `localStorage`): the single running rest survives the exercise switch, so switching from A to B keeps the same countdown.
- Nothing about the pairing is written to IndexedDB, Supabase, or `localStorage`. It dies with the session, a reload, or `Finish session`.

## Scope limits

- **Two exercises only.** Not three, not circuits.
- **Ad hoc only.** No saved pairings, no favorites, no templates.
- **No engine awareness.** The recommendation engine never knows a pairing happened.
- **No rest-time adjustment.** Each muscle gets more rest under alternation; leave the prescribed rest as-is.

## The one real UI requirement

The rest timer must show **which exercise is next**, not just a countdown. When the user finishes extensions, the timer is counting down to *laterals*.

## Tests

- Pairing two exercises leaves every logged set byte-identical to logging them unpaired (no pairing field, no altered values).
- Each exercise's target, readiness, and progression are computed independently and identically to the unpaired case.
- Rest timer duration is unchanged from the unpaired case.
- The rest timer displays the next exercise in the alternation.
- Unpairing mid-session leaves both exercises' state intact and correct.
- Nothing about the pairing survives a session end or an app reload (no persistence).
- Volume counting per muscle is identical to the unpaired case.

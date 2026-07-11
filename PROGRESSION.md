# Progression Trigger Spec — Evidence-Based

Companion to [SPEC.md](SPEC.md). This document governs **when** a load or rep
increase is emitted. **It supersedes the Phase 1 rules in the parent spec.**

## The Core Problem

The naive rule — "hit all reps with 2 RIR → add weight" — fails for three
documented reasons:

1. **RIR is not a measurement, it's an estimate with experience-dependent bias.**
   A novice's self-reported "2 RIR" is not the same physiological state as an
   experienced lifter's "2 RIR."
2. **A single session is noise.** Sleep, stress, caffeine, and time-of-day move
   performance by more than a typical weekly increment.
3. **Progression is not monotonic.** Fatigue accumulates. A lifter can be getting
   stronger while performing worse for 2–3 weeks.

An increase should be emitted when the **evidence for readiness clears a
threshold** — not on a fixed schedule, and not on a single good set.

---

## Part 1 — Correcting the RIR Input

### The evidence

- **Halperin et al. (2022)** meta-analysis, 414 participants: average
  underestimation of ~1 repetition. RIR is broadly usable.
- **Steele et al. (2017)**, n=141: systematic underprediction that scales
  inversely with experience. Experienced ~1–2 reps; less experienced ~4–5 reps.
- **Refalo et al. (2024)**, 24 trained individuals, bench @ 75% 1RM: mean error
  0.65 ± 0.78 reps, no meaningful effect of sex, experience, or relative strength
  within an already-trained population.
- Accuracy **degrades with rep count** — materially worse above ~12 reps/set.
- Accuracy is **better closer to failure** — a reported 3–4 RIR is less reliable
  than a reported 1–2 RIR.

### The implication

A raw `rir` field is a biased input. **Correct it before it touches any rule or
model.**

```ts
/**
 * Convert self-reported RIR into an estimated true RIR.
 * Bias is positive: users have MORE reps left than they report.
 */
function correctedRIR(reported: number, user: Profile, reps: number): number {
  const months = user.training_age_months;
  const experienceBias =
    months < 6   ? 3.5 :
    months < 12  ? 2.5 :
    months < 24  ? 1.8 :
    months < 48  ? 1.2 :
                   1.0;

  const repPenalty = reps > 12 ? 0.15 * (reps - 12) : 0;
  const distancePenalty = reported >= 3 ? 0.5 : 0;
  const personalOffset = user.rir_calibration_offset ?? 0;

  return reported + experienceBias + repPenalty + distancePenalty - personalOffset;
}
```

Every downstream consumer — e1RM, progression triggers, ML features — uses
`correctedRIR()`, never the raw field. **Store the raw value; never compute on
it.**

### Schema additions

```
user_profile.rir_calibration_offset   numeric  default 0
user_profile.rir_calibration_updated  timestamptz
user_profile.rir_calibration_n        int      -- number of failure tests contributing
```

---

## Part 2 — The Readiness Score

An increase is emitted only when a composite readiness score clears a threshold.
No single signal can trigger progression alone. Each signal returns a value in
`[-1, 1]`; positive means "ready to progress."

### S1 — Proximity margin (weight 0.30)

```ts
const s1 = clamp((correctedRIR_topSet - targetRIR) / 2, -1, 1);
```

`targetRIR` comes from the goal-specific proximity table (Part 3). Corrected
top-set RIR of 4 against a target of 2 → `s1 = 1.0`.

### S2 — e1RM trend (weight 0.25)

OLS slope of `adjusted_e1RM` over the last 4 sessions for this exercise.

```ts
const weeklyPct = (slope / currentE1RM) * 7;   // fraction per week
const s2 = clamp(weeklyPct / expectedWeeklyGain(user), -1, 1);
```

`expectedWeeklyGain`: 2.0% (<6mo), 1.0% (6–24mo), 0.4% (24–48mo), 0.2% (>48mo).
Require n≥4 sessions; with fewer, `s2 = 0` (neutral).

### S3 — Rep-quality consistency (weight 0.20)

```ts
const setsAtTarget = workingSets.filter(s => s.reps >= targetReps).length;
const s3 = (2 * setsAtTarget / workingSets.length) - 1;
```

All sets hit → +1. Half → 0. None → -1. **If the last working set had
`correctedRIR < 0.5`, cap `s3` at 0** — reaching failure on the final set means
the load is already at the ceiling.

### S4 — Fatigue state (weight 0.15)

ACWR = 7-day tonnage / 28-day tonnage, weighted by `fatigue_cost`. Inverted.

```ts
const s4 =
  acwr < 0.80 ? 0.5 :
  acwr < 1.30 ? 1.0 :
  acwr < 1.50 ? 0.0 :
                -1.0;
```

### S5 — Session RPE trend (weight 0.10)

```ts
const s5 = clamp(-rpeSlope / 0.5, -1, 1);
```

Slope of `session_rpe` over the last 4 sessions, inverted. Rising RPE at constant
tonnage is the earliest fatigue signal available without velocity.

### Composite

```ts
const readiness =
  0.30 * s1 + 0.25 * s2 + 0.20 * s3 + 0.15 * s4 + 0.10 * s5;
```

### Decision table

| Readiness | Action |
|---|---|
| ≥ 0.60 | Increase load by the exercise's increment |
| 0.25 – 0.59 | Add one rep to the top set (double progression) |
| -0.20 – 0.24 | Repeat the session exactly |
| -0.50 – -0.21 | Repeat, and flag: two consecutive → deload |
| < -0.50 | Deload 10%, floor to 2.5 lb |

"Repeat" is the widest band **by design** — most sessions should not change the
prescription.

---

## Part 3 — Goal-Specific Proximity Targets

| Goal | Target RIR (corrected) | Rationale |
|---|---|---|
| Hypertrophy | 1–3 | Refalo (2024): 1–3 short ≈ failure for hypertrophy, less fatigue |
| Strength | 3–5 | Robinson (2024), 67 studies: closer to failure → smaller strength gains |
| Endurance | 2–4 | Sparse evidence; conservative default |

Failure training is not required for hypertrophy and is counterproductive for
strength (Davies et al. 2016, 8 RCTs). The `targetRIR` in S1 is read from the
user's goal, not hardcoded.

### Rep-range gates

Load only increases when the user is at the **top** of the prescribed rep range.
Below that, add reps first.

| Goal | Rep range | Load increases at |
|---|---|---|
| Strength (compound) | 3–6 | 6 reps × all sets |
| Hypertrophy (compound) | 6–10 | 10 reps × all sets |
| Hypertrophy (isolation) | 8–15 | 15 reps × all sets |

This is double progression, and it is non-negotiable: **never add load and reps in
the same session.** After a load increase, reps reset to the bottom of the range.

---

## Part 4 — The Fatigue-Masking Problem

A lifter is adapting, but accumulated fatigue suppresses the expression of that
adaptation. A naive engine sees three flat sessions and deloads a lifter two weeks
from a PR.

**Detection:** `s2` flat-to-negative while `s4` elevated (ACWR > 1.3) and `s5`
rising — the fitness signal is likely masked by fatigue, not absent.

**Response:** do not deload the load. Cut volume (drop one working set) at the
same load for one session, then re-evaluate.

```ts
if (s2 <= 0 && acwr > 1.3 && rpeSlope > 0.2) {
  return { action: 'reduce_volume', sets: currentSets - 1, weight: currentWeight };
}
```

Distinguish from genuine stalling: flat e1RM with **normal** ACWR and **flat** RPE
gets a real deload.

---

## Part 5 — Hard Vetoes

Applied **after** the readiness score, **before** rounding. Any veto blocks the
increase regardless of readiness.

1. `acwr > 1.5` → no increase. Injury-risk threshold.
2. `sessions_this_exercise < 3` → no increase. Insufficient data.
3. `days_since_last_session > 14` → no increase. Detraining.
4. Any set logged `failed = true` → no increase.
5. Final working set `correctedRIR < 0.5` → no increase. Load ceiling.
6. `> 105%` of best historical e1RM → cap.
7. Pain/injury note in `workouts.notes` → freeze all progression for this movement
   pattern, flag for review.
8. Sessions since last deload `≥ 24` (≈6 weeks at 4×/wk) → force a deload week
   before any further increase.
9. Increase magnitude → capped at the smaller of 10% or 10 lb.

Vetoes are logged to `recommendations.rationale`.

---

## Part 6 — RIR Calibration Protocol

Once per week, on the final set of an **isolation** exercise (never a heavy
barbell compound — safety):

> Predict your RIR, then take this set to true failure.

Record `predicted_rir` and `actual_extra_reps`; error = `actual_extra_reps -
predicted_rir`.

```ts
// Exponentially weighted, so recent calibrations dominate
offset_new = 0.7 * offset_old + 0.3 * observed_error;
```

Cap contributions at n=10 before the offset is trusted; below that, fall back to
the experience-scaled prior. Surface the offset in the UI ("You typically have 2.3
more reps than you think") — the calibration itself is a training skill.

---

## Part 7 — Where ML Enters

The rule engine is the **permanent fallback**. ML replaces the thresholds, never
the structure. ML learns: the signal weights, the readiness threshold,
`expectedWeeklyGain`, and the per-user RIR bias. ML does **not** override the hard
vetoes in Part 5 — those are safety constraints, not hyperparameters.

```
α = min(0.8, sessions_logged / 20)
readiness_final = α × ml_readiness + (1 − α) × rule_readiness
```

Validation: the model must beat the rule engine on held-out prediction of "did the
user successfully complete the recommended session?" If not, `α = 0` for that
user. Log both scores nightly.

---

## Part 8 — Optional: Velocity-Based Training

If a barbell velocity sensor is ever available, it strictly dominates RIR
(González-Badillo & Sánchez-Medina, 2010: load–velocity is stable and near-linear
within an individual). **Do not build for this in v1.** Design `readinessSignals()`
so a velocity signal can be added as S6 with a high weight, and leave it there.

---

## Testing Requirements (beyond the parent spec)

1. **No-random-increase.** 500 sessions of a genuine plateau (e1RM flat, RIR
   honest at target, ACWR normal) → assert zero load increases.
2. **Fatigue-masking.** Rising fitness under rising fatigue → assert
   `reduce_volume`, not deload.
3. **Novice bias.** `training_age_months = 2`, `rir = 0` every set → corrected RIR
   ~3.5, increases still emitted.
4. **Veto coverage.** Each of the nine vetoes: construct a state with readiness ≥
   0.60 and assert no increase is emitted (caps assert the magnitude is bound).
5. **Double progression invariant.** 10k random states → no recommendation ever
   increases both load and target reps relative to the prior session.
6. **Calibration convergence.** True bias +2.0 → offset converges to within ±0.3
   within 10 calibration sets.

---

## Sources

| Claim | Source |
|---|---|
| RIR underprediction ~1 rep on average, n=414 | Halperin et al. (2022), scoping review + meta-analysis |
| Underprediction scales with inexperience (~1–2 vs ~4–5) | Steele et al. (2017), n=141 |
| Trained lifters: mean RIR error 0.65 ± 0.78 reps | Refalo et al. (2024), bench @ 75% 1RM, n=24 |
| Accuracy degrades above ~12 reps/set | Zourdos/MASS review synthesis |
| 1–3 RIR ≈ failure for hypertrophy in trained adults | Refalo et al. (2024) |
| Closer proximity to failure → smaller strength gains | Robinson et al. (2024), meta-regression, 67 studies |
| No strength advantage to failure training | Davies, Orr, Halaki & Hackett (2016), 8 pooled RCTs |
| Failure degrades bar velocity on subsequent sets (−22% vs −6% at 3-RIR) | Refalo et al. (2023) |
| Autoregulation > fixed %; VBT ≥ RIR-RPE | Larsen et al. (2021) systematic review |
| Load–velocity relationship stable and near-linear | González-Badillo & Sánchez-Medina (2010) |
| Rep/intensity zone anchors | Prilepin's table (sanity bound, **not** a hypertrophy prescription) |

> **Caveat:** Prilepin's table was derived from junior Olympic weightlifters doing
> only the competition lifts. It is a reasonable upper bound on volume at a given
> intensity — not a hypertrophy prescription.

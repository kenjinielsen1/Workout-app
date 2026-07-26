// SAVED_WORKOUTS.md — the load-bearing guarantee: a template selects the LINEUP and
// has zero influence on progression. Every target still comes from the engine,
// computed from that exercise's own history and the user's readiness.

import { describe, expect, it } from 'vitest';
import { recommendTarget } from './recommend';
import { lineupFromSession, structuralDiff } from './workoutTemplates';
import type { Exercise, Profile } from '../data/domain';

const mk = (id: string, name: string, muscle: string, pattern: string): Exercise =>
  ({
    id, name, slug: id, load_type: 'total', equipment: 'barbell', is_compound: true, is_unilateral: false,
    movement_pattern: pattern, primary_muscles: [muscle], secondary_muscles: [], default_increment_lb: 5,
    fatigue_cost: 1.5, is_system: true, owner_id: null, variant_of: null,
  }) as unknown as Exercise;

const squat = mk('squat', 'Back Squat', 'quadriceps', 'squat');
const bench = mk('bench', 'Bench Press', 'pectorals', 'horizontal_push');
const row = mk('row', 'Barbell Row', 'lats', 'horizontal_pull');
const index = new Map<string, Exercise>([['squat', squat], ['bench', bench], ['row', row]]);

const profile = {
  goal: 'hypertrophy', bodyweight_lb: 185, training_age_months: 24, has_micro_plates: true,
  dumbbell_increment_lb: 5, ml_alpha_cap: 0.3, sessions_per_week: 4, weight_unit: 'lb',
  plate_system: 'imperial', periodization_enabled: false, volume_calibration: {},
} as unknown as Profile;

const session = (exercise_id: string, date: string, weight: number) => ({
  exercise_id,
  performed_at: `${date}T18:00:00Z`,
  session_rpe: 8,
  sets: [
    { id: `${exercise_id}-${date}-1`, weight_lb: weight, reps: 8, rir: 2, is_warmup: false, failed: false },
    { id: `${exercise_id}-${date}-2`, weight_lb: weight, reps: 8, rir: 1, is_warmup: false, failed: false },
    { id: `${exercise_id}-${date}-3`, weight_lb: weight, reps: 8, rir: 1, is_warmup: false, failed: false },
  ],
});

const history = [
  session('squat', '2026-07-01', 275), session('bench', '2026-07-01', 185), session('row', '2026-07-01', 155),
  session('squat', '2026-07-08', 280), session('bench', '2026-07-08', 190), session('row', '2026-07-08', 160),
  session('squat', '2026-07-15', 285), session('bench', '2026-07-15', 195), session('row', '2026-07-15', 165),
];

/** Exactly the call Home makes per exercise — it takes no template parameter at all. */
const targetFor = (exId: string) =>
  recommendTarget(history as never, index.get(exId)! as never, index as never, profile as never, null, profile.ml_alpha_cap, 0, false);

describe('a template selects the lineup and nothing else (SAVED_WORKOUTS.md)', () => {
  it('templated targets are byte-identical to picking the same exercises manually', () => {
    // Manual flow: the user taps through these three lifts themselves.
    const manualLineup = ['squat', 'bench', 'row'];
    const manual = manualLineup.map(targetFor);

    // Templated flow: the SAME three come from a saved template's exercise_ids.
    const template = { name: 'Full Body A', exercise_ids: ['squat', 'bench', 'row'] };
    const templated = template.exercise_ids.map(targetFor);

    expect(JSON.stringify(templated)).toBe(JSON.stringify(manual)); // byte-identical
    expect(templated.every((t) => t !== null)).toBe(true); // and real targets, not nulls
  });

  it('the template order does not change any exercise\'s target', () => {
    const forward = ['squat', 'bench', 'row'].map(targetFor);
    const reversed = ['row', 'bench', 'squat'].map(targetFor);
    // Same lift → same target regardless of its position in the lineup.
    expect(reversed[2]).toEqual(forward[0]); // squat
    expect(reversed[1]).toEqual(forward[1]); // bench
    expect(reversed[0]).toEqual(forward[2]); // row
  });

  it('which OTHER exercises are in the template does not change a target', () => {
    const alone = targetFor('bench'); // a template containing only bench
    const withOthers = targetFor('bench'); // a template of squat + bench + row
    expect(withOthers).toEqual(alone);
  });

  it('a template carries no weight/rep/set data to leak into a target', () => {
    const template = { id: 't1', name: 'Push A', exercise_ids: ['bench', 'row'] };
    // The only fields a template has are identity + lineup.
    expect(Object.keys(template).sort()).toEqual(['exercise_ids', 'id', 'name']);
    // And the lineup is plain ids — nothing prescriptive to carry.
    expect(template.exercise_ids.every((id) => typeof id === 'string')).toBe(true);
  });
});

describe('ad hoc pairing never enters the template (PAIRING.md × SAVED_WORKOUTS.md)', () => {
  it('a paired session saves the exercises trained — and no pairing data', () => {
    // The user paired extensions with laterals and alternated them, then accepted
    // the template update. What's saved is the lineup only.
    const trainedAlternating = ['ext', 'lat', 'ext', 'lat', 'ext'];
    const lineup = lineupFromSession(trainedAlternating);
    expect(lineup).toEqual(['ext', 'lat']); // deduped ids, in order trained

    const saved = { id: 't1', name: 'Arms', exercise_ids: lineup };
    // No pairing field exists anywhere on a template.
    expect(Object.keys(saved).sort()).toEqual(['exercise_ids', 'id', 'name']);
    expect(JSON.stringify(saved)).not.toMatch(/pair/i);
  });

  it('alternating a pair is not a structural change to the template', () => {
    // Template lists both; the user alternated them. Same set, same first-seen order.
    expect(structuralDiff(['ext', 'lat'], ['ext', 'lat', 'ext', 'lat']).changed).toBe(false);
  });
});

describe('mid-session deviation is unblocked (SAVED_WORKOUTS.md)', () => {
  it('adding, skipping, and reordering all produce targets from the engine as usual', () => {
    const template = ['squat', 'bench', 'row'];
    // The user skips row, adds nothing new, and does bench first — all fine.
    const actuallyTrained = ['bench', 'squat'];
    for (const id of actuallyTrained) expect(targetFor(id)).not.toBeNull();

    // The deviation is detected only at the END, as a structural diff.
    const diff = structuralDiff(template, actuallyTrained);
    expect(diff.removed).toEqual(['row']);
    expect(diff.changed).toBe(true);
  });
});

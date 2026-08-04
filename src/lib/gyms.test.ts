import { describe, expect, it } from 'vitest';
import { effectiveEquipment, isGymScopedEquipment, scopeHistoryToGym, shouldConfirmGym, STALE_GYM_DAYS } from './gyms';
import { equipmentIncrement, snapToLoadable } from './rounding';
import type { Equipment } from './types';

const A = 'gym-a'; // home
const B = 'gym-b';

const ex = (id: string, equipment: Equipment) => ({ id, equipment });
const s = (exercise_id: string, gym_id: string | null, weight: number) => ({ exercise_id, gym_id, weight });

describe('which equipment splits by gym (MULTI_GYM.md rule 2)', () => {
  it('machines and cables split; barbell, dumbbell, bodyweight do not', () => {
    expect(isGymScopedEquipment('machine_selectorized')).toBe(true);
    expect(isGymScopedEquipment('machine_plate')).toBe(true);
    expect(isGymScopedEquipment('cable')).toBe(true);
    // Universal: 225 lb is 225 lb anywhere, a 45 lb bar is a 45 lb bar.
    expect(isGymScopedEquipment('barbell')).toBe(false);
    expect(isGymScopedEquipment('dumbbell')).toBe(false);
    expect(isGymScopedEquipment('bodyweight')).toBe(false);
    expect(isGymScopedEquipment('kettlebell')).toBe(false);
  });
});

describe('history scoping (MULTI_GYM.md rule 2)', () => {
  const history = [
    s('legpress', A, 300), s('legpress', B, 200), s('legpress', A, 310),
    s('squat', A, 275), s('squat', B, 280), // barbell at two gyms
  ];

  it('a machine at gym B sees only gym B history', () => {
    const scoped = scopeHistoryToGym(history, ex('legpress', 'machine_plate'), B, A);
    const legpress = scoped.filter((x) => x.exercise_id === 'legpress');
    expect(legpress.map((x) => x.weight)).toEqual([200]); // gym A's 300/310 excluded
  });

  it('a machine at gym A sees only gym A history', () => {
    const scoped = scopeHistoryToGym(history, ex('legpress', 'machine_plate'), A, A);
    expect(scoped.filter((x) => x.exercise_id === 'legpress').map((x) => x.weight)).toEqual([300, 310]);
  });

  // The load-bearing guarantee: the highest-quality data is never fragmented.
  it('BARBELL history is never split — all gyms, always', () => {
    for (const gym of [A, B]) {
      const scoped = scopeHistoryToGym(history, ex('squat', 'barbell'), gym, A);
      expect(scoped.filter((x) => x.exercise_id === 'squat').map((x) => x.weight)).toEqual([275, 280]);
    }
  });

  it('dumbbell history is never split either', () => {
    const db = [s('curl', A, 40), s('curl', B, 45)];
    expect(scopeHistoryToGym(db, ex('curl', 'dumbbell'), B, A)).toHaveLength(2);
  });

  it('scoping one machine leaves every OTHER exercise untouched (person-level context intact)', () => {
    const scoped = scopeHistoryToGym(history, ex('legpress', 'machine_plate'), B, A);
    // Both squat sessions survive, so ACWR/fatigue still see the full picture.
    expect(scoped.filter((x) => x.exercise_id === 'squat')).toHaveLength(2);
  });

  it('legacy rows with no gym_id count as the home gym', () => {
    const legacy = [s('legpress', null, 250), s('legpress', B, 200)];
    expect(scopeHistoryToGym(legacy, ex('legpress', 'cable'), A, A).map((x) => x.weight)).toEqual([250]);
    expect(scopeHistoryToGym(legacy, ex('legpress', 'cable'), B, A).map((x) => x.weight)).toEqual([200]);
  });

  it('a machine with no history at this gym yields nothing — the cold-start path', () => {
    const onlyA = [s('legpress', A, 300)];
    expect(scopeHistoryToGym(onlyA, ex('legpress', 'machine_selectorized'), B, A).filter((x) => x.exercise_id === 'legpress')).toEqual([]);
  });
});

describe('rounding resolves the CURRENT gym (MULTI_GYM.md)', () => {
  const base = { has_micro_plates: true, dumbbell_increment_lb: 5, plate_system: 'imperial' as const };

  it('order of resolution: gym override → catalog default → equipment default', () => {
    const gymOverride = { equipment: 'cable' as const, default_increment_lb: 5, weight_increment_lb: 7, weight_stack_min_lb: null };
    expect(equipmentIncrement(gymOverride, base)).toBe(7); // 1. the gym's real step

    const catalog = { equipment: 'kettlebell' as const, default_increment_lb: 10, weight_increment_lb: null, weight_stack_min_lb: null };
    expect(equipmentIncrement(catalog, base)).toBe(10); // 2. catalog hint

    const fallback = { equipment: 'cable' as const, default_increment_lb: 0, weight_increment_lb: null, weight_stack_min_lb: null };
    expect(equipmentIncrement(fallback, base)).toBe(10); // 3. conservative equipment default
  });

  it("a gym's equipment profile overrides the user's for rounding", () => {
    const bar = { equipment: 'barbell' as const, default_increment_lb: 5, weight_increment_lb: null, weight_stack_min_lb: null };
    // Home gym has micro plates → 2.5 grid.
    expect(equipmentIncrement(bar, effectiveEquipment(base, null))).toBe(2.5);
    // A hotel gym without them → the bar moves in 5s.
    expect(equipmentIncrement(bar, effectiveEquipment(base, { has_micro_plates: false }))).toBe(5);
    // And a gym's dumbbell step wins over the user's.
    const db = { equipment: 'dumbbell' as const, default_increment_lb: 5, weight_increment_lb: null, weight_stack_min_lb: null };
    expect(equipmentIncrement(db, effectiveEquipment(base, { dumbbell_increment_lb: 10 }))).toBe(10);
  });

  it('a metric gym yields the 20 kg bar floor and the 0.5 kg grid', () => {
    const bar = { equipment: 'barbell' as const, default_increment_lb: 5, weight_increment_lb: null, weight_stack_min_lb: null };
    const metric = effectiveEquipment(base, { plate_system: 'metric' });
    // Below the empty bar snaps to 20 kg (stored in lb).
    const floor = snapToLoadable(10, bar, metric, 'floor');
    expect(floor).toBeCloseTo(44.09, 1); // 20 kg
    // And the grid is 0.5 kg pairs, not the imperial 2.5 lb.
    const a = snapToLoadable(100, bar, metric, 'floor');
    const b = snapToLoadable(101, bar, metric, 'floor');
    expect(a).not.toBe(b); // moves on a finer metric step
  });
});

describe('stale non-home selection (MULTI_GYM.md)', () => {
  const now = Date.parse('2026-07-20T10:00:00Z');
  const daysAgo = (n: number) => now - n * 86_400_000;

  it('never confirms at the home gym — a normal day sees nothing', () => {
    expect(shouldConfirmGym(A, A, daysAgo(30), now)).toBe(false);
  });

  it('confirms once when a non-home gym has sat selected past the threshold', () => {
    expect(shouldConfirmGym(B, A, daysAgo(STALE_GYM_DAYS + 1), now)).toBe(true);
  });

  it('does not nag during a trip — recent use at the away gym is fine', () => {
    expect(shouldConfirmGym(B, A, daysAgo(1), now)).toBe(false);
  });

  it('a brand-new selection with no history does not confirm', () => {
    expect(shouldConfirmGym(B, A, null, now)).toBe(false);
  });
});

// --- engine integration: the split is real, and only where it should be --------
import { recommendTarget } from './recommend';
import { buildProgContext } from './progContext';

const HOME = 'gym-a';
const AWAY = 'gym-b';

const mkEx = (id: string, equipment: Equipment, pattern: string) =>
  ({ id, name: id, equipment, load_type: 'total', is_compound: true, movement_pattern: pattern,
     primary_muscles: ['quadriceps'], secondary_muscles: [], default_increment_lb: 5, fatigue_cost: 1.5 }) as never;

const legpress = mkEx('legpress', 'machine_plate', 'squat');
const squat = mkEx('squat', 'barbell', 'squat');
const engineIndex = new Map<string, never>([['legpress', legpress], ['squat', squat]]);

const prof = { goal: 'hypertrophy', bodyweight_lb: 185, training_age_months: 24, has_micro_plates: true,
  dumbbell_increment_lb: 5, plate_system: 'imperial', ml_alpha_cap: 0 } as never;

const sess = (exercise_id: string, gym_id: string, date: string, weight: number) => ({
  exercise_id, gym_id, performed_at: `${date}T18:00:00Z`, session_rpe: 8,
  sets: [
    { weight_lb: weight, reps: 10, rir: 2, is_warmup: false, failed: false },
    { weight_lb: weight, reps: 10, rir: 1, is_warmup: false, failed: false },
  ],
}) as never;

const engineHistory = [
  sess('legpress', HOME, '2026-07-01', 400), sess('legpress', HOME, '2026-07-08', 410),
  sess('squat', HOME, '2026-07-01', 275), sess('squat', AWAY, '2026-07-08', 280),
] as never[];

describe('engine honours gym scope (MULTI_GYM.md)', () => {
  it('a machine with no history at this gym cold-starts instead of using another gym\'s numbers', () => {
    const atHome = recommendTarget(engineHistory, legpress, engineIndex, prof, null, 0, null, false, { gymId: HOME, homeGymId: HOME });
    expect(atHome).not.toBeNull(); // knows this machine at home

    const away = recommendTarget(engineHistory, legpress, engineIndex, prof, null, 0, null, false, { gymId: AWAY, homeGymId: HOME });
    expect(away).toBeNull(); // → caller routes to cold-start estimation, never a bogus 410
  });

  it('BARBELL history is never split — the same target at either gym', () => {
    const a = recommendTarget(engineHistory, squat, engineIndex, prof, null, 0, null, false, { gymId: HOME, homeGymId: HOME });
    const b = recommendTarget(engineHistory, squat, engineIndex, prof, null, 0, null, false, { gymId: AWAY, homeGymId: HOME });
    expect(JSON.stringify(b)).toBe(JSON.stringify(a));
  });

  it('ACWR stays person-level — scoping a machine does not shrink it', () => {
    // Same movement pattern (squat) trained at both gyms; ACWR must see all of it.
    const home = buildProgContext(engineHistory, legpress, engineIndex, prof, undefined, null, false, { gymId: HOME, homeGymId: HOME });
    const unscoped = buildProgContext(engineHistory, legpress, engineIndex, prof, undefined, null, false, null);
    expect(home.acwr).toBe(unscoped.acwr); // identical despite the history split
  });

  it('a single-gym user (no scope passed) behaves exactly as before', () => {
    const scoped = recommendTarget(engineHistory, legpress, engineIndex, prof, null, 0, null, false, { gymId: HOME, homeGymId: HOME });
    const legacy = recommendTarget(engineHistory, legpress, engineIndex, prof, null, 0, null, false);
    expect(JSON.stringify(scoped)).toBe(JSON.stringify(legacy));
  });
});

describe('person-level data aggregates across ALL gyms (MULTI_GYM.md)', () => {
  it('weekly volume counts sets from every gym — a set trains a muscle anywhere', async () => {
    const { weeklyHardSets, weekStartOf } = await import('./volume');
    const volIndex = new Map([
      ['legpress', { primary_muscles: ['quadriceps'], secondary_muscles: [] }],
    ]);
    const week = weeklyHardSets(
      [
        // Same machine, same week, two different buildings.
        { exercise_id: 'legpress', gym_id: HOME, performed_at: '2026-07-14T18:00:00Z', sets: [{ reps: 10, rir: 1 }, { reps: 10, rir: 1 }] },
        { exercise_id: 'legpress', gym_id: AWAY, performed_at: '2026-07-16T18:00:00Z', sets: [{ reps: 10, rir: 1 }] },
      ] as never,
      volIndex as never,
      { training_age_months: 24 } as never,
      'hypertrophy',
      weekStartOf('2026-07-14T00:00:00Z'),
    );
    // 3 hard sets total — volume is NOT split by gym, unlike machine progression.
    expect(week.get('quadriceps')).toBe(3);
  });
});

import { describe, expect, it } from 'vitest';
import { collectWeeklySummary } from './weeklySummaryCollect';
import { buildWeeklySummary, summarySections } from './weeklySummary';
import type { AllSession, Exercise, Profile } from '../data/domain';

const bench = {
  id: 'bench', name: 'Bench Press', load_type: 'total', equipment: 'barbell', is_compound: true,
  primary_muscles: ['pectorals'], secondary_muscles: ['triceps'], movement_pattern: 'horizontal_push',
  fatigue_cost: 1, default_increment_lb: 5,
} as unknown as Exercise;
const index = new Map<string, Exercise>([['bench', bench]]);

const profile = {
  goal: 'hypertrophy', bodyweight_lb: 180, training_age_months: 24, sessions_per_week: 4,
  volume_calibration: {}, periodization_enabled: false, has_micro_plates: true, dumbbell_increment_lb: 5,
} as unknown as Profile;

// Two working sets on a date, at a given top weight.
const session = (date: string, weight: number, rpe: number | null = 8): AllSession => ({
  exercise_id: 'bench',
  performed_at: `${date}T18:00:00Z`,
  session_rpe: rpe,
  sets: [
    { id: `${date}-1`, weight_lb: weight, reps: 8, rir: 1, is_warmup: false, failed: false } as never,
    { id: `${date}-2`, weight_lb: weight, reps: 8, rir: 1, is_warmup: false, failed: false } as never,
  ],
});

describe('collectWeeklySummary (WEEKLY_SUMMARY.md — view over real data)', () => {
  // Three ISO weeks of bench, climbing then flat.
  const sessions = [
    session('2026-06-29', 185), // week of Jun 29
    session('2026-07-06', 195), // week of Jul 6
    session('2026-07-13', 205), // week of Jul 13 (target week)
  ];

  it('assembles a valid, report-only summary from sessions', () => {
    const input = collectWeeklySummary({ weekStart: '2026-07-13', allSessions: sessions, index, profile, unit: 'lb', generatedAt: '2026-07-20T02:00:00Z' });
    expect(input.sessions).toBe(1);
    expect(input.hardSets).toBe(2);
    expect(input.tonnageLb).toBeGreaterThan(0);
    // Bench trained this week; e1RM rose from last week → 'increased'.
    const bp = input.progression.find((p) => p.exercise === 'Bench Press')!;
    expect(bp.move).toBe('increased');
    expect(bp.currentE1RMLb).toBeGreaterThan(0);
    // Pectorals has volume; some other muscle the user trains is zero this week? Only
    // bench here, so pectorals + triceps are the universe. Both trained → no zeros.
    expect(input.volume.some((v) => v.muscle === 'pectorals' && v.hardSets > 0)).toBe(true);

    // The whole readout stays report-only.
    const text = summarySections(buildWeeklySummary(input)).flatMap((s) => s.lines).join('\n').toLowerCase();
    for (const p of ['consider', 'recommend', 'you should', 'next week']) expect(text.includes(p)).toBe(false);
  });

  it('reports a flat lift as flat once e1RM stops moving', () => {
    const flat = [session('2026-06-29', 205), session('2026-07-06', 205), session('2026-07-13', 205)];
    const input = collectWeeklySummary({ weekStart: '2026-07-13', allSessions: flat, index, profile, unit: 'lb', generatedAt: 'x' });
    const bp = input.progression.find((p) => p.exercise === 'Bench Press')!;
    expect(bp.weeksFlat).toBeGreaterThanOrEqual(2);
    const text = summarySections(buildWeeklySummary(input)).flatMap((s) => s.lines).join('\n');
    expect(text).toMatch(/Bench Press: e1RM \d+ lb, unchanged for \d+ weeks\./);
  });

  it('a week with no sessions collects as an untrained week', () => {
    const input = collectWeeklySummary({ weekStart: '2026-07-20', allSessions: sessions, index, profile, unit: 'lb', generatedAt: 'x' });
    expect(input.sessions).toBe(0);
    expect(summarySections(buildWeeklySummary(input))).toEqual([{ title: 'This week', lines: ['No sessions logged this week.'] }]);
  });
});

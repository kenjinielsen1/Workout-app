import { describe, expect, it } from 'vitest';
import { buildWeeklySummary, summarySections, type WeeklySummaryInput } from './weeklySummary';
import { landmarksFor } from './volumeLandmarks';

const base = (over: Partial<WeeklySummaryInput> = {}): WeeklySummaryInput => ({
  weekStart: '2026-07-13',
  weekEnd: '2026-07-19',
  generatedAt: '2026-07-20T02:00:00Z',
  unit: 'lb',
  sessions: 3,
  hardSets: 42,
  tonnageLb: 61000,
  daysTrained: 3,
  daysPlanned: 4,
  plannedDeload: false,
  hasFourWeekHistory: true,
  progression: [
    { exercise: 'Back Squat', primaryMuscle: 'quadriceps', currentE1RMLb: 315, deltaLastWeekLb: 5, delta4wLb: 15, move: 'increased', reason: '', weeksFlat: 0, e1rmSpark: []  },
    { exercise: 'Bench Press', primaryMuscle: 'pectorals', currentE1RMLb: 225, deltaLastWeekLb: 0, delta4wLb: 0, move: 'held', reason: 'readiness low', weeksFlat: 4, e1rmSpark: []  },
  ],
  volume: [
    { muscle: 'pectorals', hardSets: 14, landmarks: landmarksFor('pectorals') },
    { muscle: 'lats', hardSets: 4, landmarks: landmarksFor('lats') }, // below MEV
    { muscle: 'quadriceps', hardSets: 30, landmarks: landmarksFor('quadriceps') },
    { muscle: 'hamstrings', hardSets: 0, landmarks: landmarksFor('hamstrings') }, // zero
  ],
  balance: [{ label: 'Push : pull', ratio: '2.8 : 1' }],
  fatigue: { acwr: 1.15, acwrTrend: 'rising', avgRpe: 8.2, avgReadiness: 3.4, blockLabel: 'Accumulation — build volume · week 2 of 3' },
  prs: [{ exercise: 'Back Squat', e1rmLb: 315 }],
  contributors: {},
  ...over,
});

const allLines = (input: WeeklySummaryInput): string =>
  summarySections(buildWeeklySummary(input)).flatMap((s) => s.lines).join('\n').toLowerCase();

describe('weekly summary — report-only (WEEKLY_SUMMARY.md)', () => {
  // The core guard: nothing in the readout may prescribe.
  const FORBIDDEN = [
    'consider', 'try ', 'you should', 'should ', 'next week', 'add a set', 'we recommend',
    'recommend', 'you might', 'you could', 'shift volume', 'aim for', 'focus on', 'suggest',
  ];

  it('never prescribes — no suggestion/recommendation language anywhere', () => {
    for (const input of [base(), base({ plannedDeload: true }), base({ sessions: 0 })]) {
      const text = allLines(input);
      for (const phrase of FORBIDDEN) {
        expect(text.includes(phrase), `leaked prescription: "${phrase}"`).toBe(false);
      }
    }
  });

  it('states the gap and stops — below-MEV is named, not fixed', () => {
    const text = allLines(base());
    expect(text).toContain('below mev: lats');
    expect(text).not.toContain('row'); // no "add rows" style fix
  });
});

describe('weekly summary — blunt, not harsh (WEEKLY_SUMMARY.md)', () => {
  const SOFTENING = ['rough week', 'but every', 'at least', "don't worry", 'falling behind', 'only 2', 'keep your chin', 'bounce back'];

  it('no softening or consoling on a low / flat week', () => {
    const text = allLines(base({ sessions: 2, daysTrained: 2, progression: [
      { exercise: 'Bench Press', primaryMuscle: 'pectorals', currentE1RMLb: 225, deltaLastWeekLb: 0, delta4wLb: 0, move: 'held', reason: '', weeksFlat: 5, e1rmSpark: []  },
    ] }));
    for (const phrase of SOFTENING) expect(text.includes(phrase), `softened with "${phrase}"`).toBe(false);
  });

  it('a flat lift is stated as flat, with duration', () => {
    const text = allLines(base());
    expect(text).toContain('bench press: e1rm 225 lb, unchanged for 4 weeks.');
  });
});

describe('weekly summary — volume against PERSONAL landmarks', () => {
  it('names below-MEV, above-MRV, and zero-volume muscles', () => {
    const s = buildWeeklySummary(base());
    expect(s.belowMev).toContain('Lats');
    expect(s.zeroVolume).toContain('Hamstrings');
    const text = summarySections(s).flatMap((x) => x.lines).join('\n');
    expect(text).toContain('No volume this week: Hamstrings.');
  });

  it('classifies against the personal band, not the config prior', () => {
    // 10 sets is ABOVE the config MEV for pectorals, but this user's personal MEV
    // is raised to 12 — so 10 must read as below MEV. Proves the personal band wins.
    const prior = landmarksFor('pectorals');
    const personal = { ...prior, mev: 12, mav: Math.max(prior.mav, 16), mrv: Math.max(prior.mrv, 22) };
    const s = buildWeeklySummary(base({ volume: [{ muscle: 'pectorals', hardSets: 10, landmarks: personal }] }));
    expect(prior.mev).toBeLessThan(12); // sanity: config prior is lower
    expect(s.belowMev).toContain('Pectorals'); // 10 < personal MEV 12
  });
});

describe('weekly summary — safety & edge states', () => {
  it('a planned deload reports low volume as planned, never a shortfall', () => {
    const text = allLines(base({ plannedDeload: true, hardSets: 12, volume: [
      { muscle: 'pectorals', hardSets: 3, landmarks: landmarksFor('pectorals') },
    ] }));
    expect(text).toContain('planned deload week — low volume is intended, not a shortfall.');
    expect(text).not.toMatch(/fell short|short of|missed your|behind on|below your target/); // no blame framing
  });

  it('a zero-training week is a plain statement with no guilt or prompt', () => {
    const sections = summarySections(buildWeeklySummary(base({ sessions: 0 })));
    expect(sections).toHaveLength(1);
    expect(sections[0]!.lines).toEqual(['No sessions logged this week.']);
  });

  it('first week / thin history omits the 4-week trend fields', () => {
    const text = allLines(base({ hasFourWeekHistory: false }));
    expect(text).not.toContain('over 4 weeks');
  });

  it('PR section is the only warm one, and is silent when there were none', () => {
    const withPr = summarySections(buildWeeklySummary(base()));
    expect(withPr.find((x) => x.tone === 'pr')?.lines[0]).toMatch(/New best/);
    const noPr = summarySections(buildWeeklySummary(base({ prs: [] })));
    expect(noPr.some((x) => x.tone === 'pr')).toBe(false);
    expect(noPr.some((x) => /no pr|no personal record/i.test(x.lines.join()))).toBe(false); // says nothing
  });

  it('is deterministic — same input builds an identical summary (idempotent generation)', () => {
    expect(buildWeeklySummary(base())).toEqual(buildWeeklySummary(base()));
  });
});

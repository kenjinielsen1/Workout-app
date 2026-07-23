import { describe, expect, it } from 'vitest';
import { addOptions, reduceContributors, type AddArgs, type CatalogExercise } from './volumeSuggestions';
import type { Equipment, MovementPattern } from './types';

const ex = (id: string, name: string, primary: string[], secondary: string[], equipment: Equipment, pattern: MovementPattern, compound = false): CatalogExercise =>
  ({ id, name, primary_muscles: primary, secondary_muscles: secondary, equipment, movement_pattern: pattern, is_compound: compound });

const catalog: CatalogExercise[] = [
  ex('bb-row', 'Barbell Row', ['lats'], ['biceps'], 'barbell', 'horizontal_pull', true),
  ex('cable-row', 'Cable Row', ['lats'], ['biceps'], 'cable', 'horizontal_pull'),
  ex('pulldown', 'Lat Pulldown', ['lats'], ['biceps'], 'cable', 'vertical_pull'),
  ex('chin', 'Chin-up', ['lats'], ['biceps'], 'bodyweight', 'vertical_pull', true),
  ex('db-curl', 'Dumbbell Curl', ['biceps'], [], 'dumbbell', 'horizontal_pull'),
];

const baseArgs = (over: Partial<AddArgs> = {}): AddArgs => ({
  muscle: 'lats',
  catalog,
  doneThisWeek: new Set(),
  accessibleEquipment: new Set<Equipment>(['barbell', 'cable', 'bodyweight', 'dumbbell']),
  frozenPatterns: new Set<MovementPattern>(),
  fatigueFlagged: false,
  plannedDeload: false,
  ...over,
});

// The output is scanned for the summary's forbidden instruction language.
const FORBIDDEN = ['should', 'try ', 'consider', 'add a set', 'add 2', 'we recommend', 'this would bring you', 'aim for', 'you could', 'you might'];
const scan = (strings: string[]) => {
  const text = strings.join(' ').toLowerCase();
  for (const p of FORBIDDEN) expect(text.includes(p), `instruction leaked: "${p}"`).toBe(false);
};

describe('add side — lists, never instructs (VOLUME_SUGGESTIONS.md)', () => {
  it('returns catalog exercises training the muscle as primary, ordered plainly', () => {
    const r = addOptions(baseArgs());
    expect(r.kind).toBe('options');
    if (r.kind !== 'options') return;
    const names = r.options.map((o) => o.name);
    expect(names).toContain('Barbell Row');
    expect(names).not.toContain('Dumbbell Curl'); // biceps-primary, not lats
    // Compound-first ordering.
    expect(r.options[0]!.name).toMatch(/Barbell Row|Chin-up/);
    scan(names);
  });

  it('carries no set/rep prescription — only what each trains', () => {
    const r = addOptions(baseArgs());
    if (r.kind !== 'options') throw new Error('expected options');
    for (const o of r.options) {
      expect(Object.keys(o).sort()).toEqual(['id', 'name', 'primary', 'secondary']); // no sets/reps fields
    }
  });

  it('excludes what is already trained this week', () => {
    const r = addOptions(baseArgs({ doneThisWeek: new Set(['bb-row', 'cable-row']) }));
    if (r.kind !== 'options') throw new Error('expected options');
    const names = r.options.map((o) => o.name);
    expect(names).not.toContain('Barbell Row');
    expect(names).not.toContain('Cable Row');
    expect(names).toContain('Lat Pulldown');
  });

  it('filters to equipment the user actually has', () => {
    const r = addOptions(baseArgs({ accessibleEquipment: new Set<Equipment>(['barbell']) }));
    if (r.kind !== 'options') throw new Error('expected options');
    expect(r.options.map((o) => o.name)).toEqual(['Barbell Row']); // only barbell survives
  });
});

describe('add side — safety withholds (SCOPE_SAFETY.md)', () => {
  it('is withheld in a planned deload, with the factual state', () => {
    const r = addOptions(baseArgs({ plannedDeload: true }));
    expect(r).toEqual({ kind: 'withheld', reason: 'This is a planned deload week.' });
  });

  it('is withheld when fatigue is flagged', () => {
    const r = addOptions(baseArgs({ fatigueFlagged: true }));
    expect(r.kind).toBe('withheld');
  });

  it('never surfaces an exercise under an active pain-freeze pattern', () => {
    const r = addOptions(baseArgs({ frozenPatterns: new Set<MovementPattern>(['horizontal_pull']) }));
    if (r.kind !== 'options') throw new Error('expected options');
    expect(r.options.every((o) => o.name !== 'Barbell Row' && o.name !== 'Cable Row')).toBe(true);
    expect(r.options.map((o) => o.name)).toContain('Lat Pulldown'); // vertical_pull still fine
  });

  it('when every trainer is frozen, returns the factual state and lists nothing', () => {
    const r = addOptions(baseArgs({ frozenPatterns: new Set<MovementPattern>(['horizontal_pull', 'vertical_pull']) }));
    expect(r).toEqual({ kind: 'withheld', reason: 'This movement pattern is currently frozen following a pain log.' });
  });
});

describe('reduce side — facts, nominates nothing', () => {
  const week = [
    { id: 'bench', name: 'Bench Press', primary: ['pectorals'], secondary: ['triceps'], hardSets: 9 },
    { id: 'incline', name: 'Incline DB Press', primary: ['pectorals'], secondary: ['front_delts'], hardSets: 6 },
    { id: 'dip', name: 'Dip', primary: ['triceps'], secondary: ['pectorals'], hardSets: 4 },
    { id: 'row', name: 'Row', primary: ['lats'], secondary: [], hardSets: 5 },
  ];

  it('lists current contributors with weighted set counts, ranked', () => {
    const c = reduceContributors('pectorals', week);
    expect(c.map((x) => [x.name, x.sets])).toEqual([
      ['Bench Press', 9],
      ['Incline DB Press', 6],
      ['Dip', 2], // secondary → 4 × 0.5
    ]);
    expect(c.some((x) => x.name === 'Row')).toBe(false); // doesn't train pectorals
    scan(c.map((x) => x.name));
  });

  it('has no field nominating anything for removal', () => {
    const c = reduceContributors('pectorals', week);
    for (const entry of c) expect(Object.keys(entry).sort()).toEqual(['id', 'name', 'sets']);
  });
});

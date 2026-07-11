import { describe, expect, it } from 'vitest';
import { BAR_WEIGHT_LB, ROUNDING_INCREMENT_LB } from './constants';
import { isLoadable, snapToLoadable } from './rounding';
import {
  recommend,
  repRange,
  type EngineExercise,
  type EngineProfile,
  type ExerciseSession,
  type PerformedSet,
} from './overloadEngine';

// --- fixtures ---------------------------------------------------------------
const squat: EngineExercise = {
  name: 'Back Squat',
  movement_pattern: 'squat',
  equipment: 'barbell',
  load_type: 'total',
  is_compound: true,
  default_increment_lb: 10,
};
const bench: EngineExercise = {
  name: 'Bench Press',
  movement_pattern: 'horizontal_push',
  equipment: 'barbell',
  load_type: 'total',
  is_compound: true,
  default_increment_lb: 5,
};
const dbCurl: EngineExercise = {
  name: 'Dumbbell Curl',
  movement_pattern: 'isolation',
  equipment: 'dumbbell',
  load_type: 'per_hand',
  is_compound: false,
  default_increment_lb: 5,
};
const bbCurl: EngineExercise = {
  name: 'Barbell Curl',
  movement_pattern: 'isolation',
  equipment: 'barbell',
  load_type: 'total',
  is_compound: false,
  default_increment_lb: 2.5,
};

const strength: EngineProfile = {
  bodyweight_lb: 185,
  has_micro_plates: true,
  dumbbell_increment_lb: 5,
  goal: 'strength',
};

// N identical working sets.
function sets(
  n: number,
  weight: number,
  reps: number,
  rir: number | null,
  failed = false,
): PerformedSet[] {
  return Array.from({ length: n }, () => ({ weight_lb: weight, reps, rir, failed }));
}

function session(
  weight: number,
  reps: number,
  rir: number | null,
  target_reps: number,
  opts: { n?: number; failed?: boolean; pain?: boolean } = {},
): ExerciseSession {
  return {
    target_reps,
    pain_flag: opts.pain,
    sets: sets(opts.n ?? 3, weight, reps, rir, opts.failed),
  };
}

// --- decision rules ---------------------------------------------------------
describe('increase_load', () => {
  it('adds the lower-body increment when reps are hit with 2+ RIR', () => {
    const r = recommend(squat, strength, [session(225, 5, 3, 5)]);
    expect(r.action).toBe('increase_load');
    expect(r.target_weight_lb).toBe(235); // reset reps to range min, +10 lb... weight only
    expect(isLoadable(r.target_weight_lb, squat, strength)).toBe(true);
  });

  it('resets reps to the bottom of the range when already at the top', () => {
    // strength compound range is 3-5; hitting 5 at rir 3 -> +load, reps reset to 3.
    const r = recommend(squat, strength, [session(225, 5, 3, 5)]);
    expect(r.target_reps).toBe(3);
    expect(r.target_weight_lb).toBe(235);
  });

  it('keeps reps unchanged when below the top of the range', () => {
    const r = recommend(squat, strength, [session(225, 3, 2, 3)]);
    expect(r.action).toBe('increase_load');
    expect(r.target_reps).toBe(3);
  });

  it('uses +5 for upper-body compounds', () => {
    const r = recommend(bench, strength, [session(185, 5, 2, 5)]);
    expect(r.target_weight_lb).toBe(190);
  });

  it('uses +5 per hand for dumbbells and snaps to the 5 lb grid', () => {
    const r = recommend(dbCurl, strength, [session(30, 8, 2, 8)]);
    expect(r.action).toBe('increase_load');
    expect(r.target_weight_lb).toBe(35);
    expect(isLoadable(r.target_weight_lb, dbCurl, strength)).toBe(true);
  });

  it('uses +2.5 for a barbell isolation lift when micro plates exist', () => {
    const r = recommend(bbCurl, strength, [session(65, 8, 2, 8)]);
    expect(r.target_weight_lb).toBe(67.5);
  });
});

describe('add_rep (double progression)', () => {
  it('holds load and adds a rep when reps are hit at 0-1 RIR with headroom', () => {
    const r = recommend(squat, strength, [session(225, 3, 1, 3)]);
    expect(r.action).toBe('add_rep');
    expect(r.target_weight_lb).toBe(225);
    expect(r.target_reps).toBe(4);
  });

  it('never increases load and reps in the same session', () => {
    const r = recommend(squat, strength, [session(225, 3, 1, 3)]);
    const weightUp = r.target_weight_lb > 225;
    const repsUp = r.target_reps > 3;
    expect(weightUp && repsUp).toBe(false);
  });
});

describe('deload_missed', () => {
  it('backs off ~10% when 2+ sets miss the rep target', () => {
    const s: ExerciseSession = {
      target_reps: 5,
      sets: [
        { weight_lb: 225, reps: 5, rir: 0 },
        { weight_lb: 225, reps: 3, rir: 0 }, // missed
        { weight_lb: 225, reps: 2, rir: 0 }, // missed
      ],
    };
    const r = recommend(squat, strength, [s]);
    expect(r.action).toBe('deload_missed');
    expect(r.target_weight_lb).toBeLessThan(225);
    expect(r.target_weight_lb).toBe(202.5); // floor(225*0.9)=202.5
    expect(isLoadable(r.target_weight_lb, squat, strength)).toBe(true);
  });

  it('a single missed set is not enough to deload', () => {
    const s: ExerciseSession = {
      target_reps: 5,
      sets: [
        { weight_lb: 225, reps: 5, rir: 1 },
        { weight_lb: 225, reps: 5, rir: 1 },
        { weight_lb: 225, reps: 4, rir: 0 }, // one miss
      ],
    };
    const r = recommend(squat, strength, [s]);
    expect(r.action).not.toBe('deload_missed');
  });
});

describe('deload_plateau', () => {
  it('deloads and resets the rep range after 3 flat sessions', () => {
    const flat = [
      session(225, 3, 1, 3),
      session(225, 3, 1, 3),
      session(225, 3, 1, 3),
    ];
    const r = recommend(squat, strength, flat);
    expect(r.action).toBe('deload_plateau');
    expect(r.target_reps).toBe(repRange('strength', true).min); // 3
    expect(r.target_weight_lb).toBeLessThan(225);
  });

  it('two flat sessions is not yet a plateau', () => {
    const r = recommend(squat, strength, [
      session(225, 3, 1, 3),
      session(225, 3, 1, 3),
    ]);
    expect(r.action).not.toBe('deload_plateau');
  });

  it('a clear rir>=2 session on the third beats plateau and increases', () => {
    const r = recommend(squat, strength, [
      session(225, 3, 1, 3),
      session(225, 3, 1, 3),
      session(225, 3, 2, 3), // easy this time
    ]);
    expect(r.action).toBe('increase_load');
  });
});

describe('freeze on pain', () => {
  it('freezes progression when the last session logged pain', () => {
    const r = recommend(squat, strength, [session(225, 5, 3, 5, { pain: true })]);
    expect(r.action).toBe('freeze');
    expect(r.target_weight_lb).toBe(225);
    expect(r.target_reps).toBe(5);
  });
});

describe('repeat / missing RIR', () => {
  it('holds when RIR is not recorded (no clear signal)', () => {
    const r = recommend(squat, strength, [session(225, 5, null, 5)]);
    expect(r.action).toBe('repeat');
    expect(r.target_weight_lb).toBe(225);
  });
});

// --- cold start -------------------------------------------------------------
describe('cold start', () => {
  it('flags low confidence and rule-based rationale under 5 sessions', () => {
    const r = recommend(squat, strength, [session(225, 5, 3, 5)]);
    expect(r.is_cold_start).toBe(true);
    expect(r.confidence).toBe(0.3);
    expect(r.rationale).toContain('[rule-based]');
  });

  it('drops the cold-start flag at 5+ sessions', () => {
    const hist = Array.from({ length: 5 }, () => session(225, 3, 3, 3));
    const r = recommend(squat, strength, hist);
    expect(r.is_cold_start).toBe(false);
    expect(r.confidence).toBe(0.5);
  });
});

// --- warmups are excluded ---------------------------------------------------
describe('warmup handling', () => {
  it('ignores warmup sets when picking the top set and counting misses', () => {
    const s: ExerciseSession = {
      target_reps: 5,
      sets: [
        { weight_lb: 45, reps: 10, rir: 5, is_warmup: true },
        { weight_lb: 135, reps: 8, rir: 5, is_warmup: true },
        { weight_lb: 225, reps: 5, rir: 3 },
        { weight_lb: 225, reps: 5, rir: 3 },
      ],
    };
    const r = recommend(squat, strength, [s]);
    expect(r.action).toBe('increase_load');
    expect(r.target_weight_lb).toBe(235); // based on the 225 working sets, not warmups
  });
});

// --- synthetic multi-session progressions -----------------------------------
/** Feed each recommendation back as the next session, logged exactly as prescribed. */
function simulate(
  ex: EngineExercise,
  user: EngineProfile,
  start: ExerciseSession,
  steps: number,
  loggedRir: number,
  loggedReps: (target: number) => number,
): { action: string; weight: number; reps: number }[] {
  const history: ExerciseSession[] = [start];
  const trace: { action: string; weight: number; reps: number }[] = [];
  for (let i = 0; i < steps; i++) {
    const r = recommend(ex, user, history);
    trace.push({ action: r.action, weight: r.target_weight_lb, reps: r.target_reps });
    history.push(
      session(r.target_weight_lb, loggedReps(r.target_reps), loggedRir, r.target_reps),
    );
  }
  return trace;
}

describe('synthetic progressions', () => {
  it('linear: hitting reps easily drives weight strictly upward, always loadable', () => {
    const trace = simulate(squat, strength, session(225, 3, 3, 3), 6, 3, (t) => t);
    for (let i = 1; i < trace.length; i++) {
      expect(trace[i]!.weight).toBeGreaterThan(trace[i - 1]!.weight);
      expect(isLoadable(trace[i]!.weight, squat, strength)).toBe(true);
    }
  });

  it('regression: repeatedly missing reps deloads downward but never below the 45 lb bar', () => {
    // Log only 1 rep against a target of 5 every session -> 3 misses -> deload.
    const trace = simulate(squat, strength, session(225, 1, 0, 5), 20, 0, () => 1);
    for (const step of trace) {
      expect(step.action).toBe('deload_missed');
      expect(step.weight).toBeGreaterThanOrEqual(BAR_WEIGHT_LB);
      expect(isLoadable(step.weight, squat, strength)).toBe(true);
    }
    // It bottoms out at the empty bar and holds there.
    expect(trace[trace.length - 1]!.weight).toBe(BAR_WEIGHT_LB);
  });

  it('plateau: grinding at the top of the rep range (rir 1) triggers a reset deload', () => {
    // At the rep cap (5) with rir 1: can't add load (rir<2) or reps (at cap), so
    // the engine repeats until 3 flat sessions accumulate -> deload_plateau.
    const trace = simulate(squat, strength, session(225, 5, 1, 5), 5, 1, (t) => t);
    expect(trace.slice(0, 2).every((t) => t.action === 'repeat')).toBe(true);
    expect(trace.some((t) => t.action === 'deload_plateau')).toBe(true);
  });
});

// --- global invariants ------------------------------------------------------
describe('invariants across many inputs', () => {
  const exercises = [squat, bench, dbCurl, bbCurl];
  const profiles: EngineProfile[] = [
    strength,
    { ...strength, has_micro_plates: false },
    { ...strength, goal: 'hypertrophy' },
    { ...strength, goal: 'endurance' },
  ];

  it('every target is loadable and never raises load and reps together', () => {
    let checks = 0;
    for (let i = 0; i < 2000; i++) {
      const ex = exercises[i % exercises.length]!;
      const user = profiles[i % profiles.length]!;
      const w = 45 + Math.floor(Math.random() * 80) * 2.5; // loadable-ish start
      const reps = 1 + Math.floor(Math.random() * 12);
      const target = 1 + Math.floor(Math.random() * 12);
      const rir = Math.random() < 0.2 ? null : Math.floor(Math.random() * 5);
      const failed = Math.random() < 0.2;
      const n = 1 + Math.floor(Math.random() * 4);
      const hist = [session(w, reps, rir, target, { n, failed })];

      const r = recommend(ex, user, hist);
      expect(isLoadable(r.target_weight_lb, ex, user)).toBe(true);
      expect(Number((r.target_weight_lb % ROUNDING_INCREMENT_LB).toFixed(4))).toBe(0);

      // Compare against the on-grid normalization of the logged weight — snapping
      // an off-grid log to a loadable value is not itself a "load increase".
      const baseWeight = snapToLoadable(w, ex, user, 'nearest');
      const weightUp = r.target_weight_lb > baseWeight;
      const repsUp = r.target_reps > target;
      expect(weightUp && repsUp).toBe(false);
      checks++;
    }
    expect(checks).toBe(2000);
  });
});

// --- guards -----------------------------------------------------------------
describe('guards', () => {
  it('throws on empty history', () => {
    expect(() => recommend(squat, strength, [])).toThrow();
  });

  it('throws when the most recent session has only warmups', () => {
    const s: ExerciseSession = {
      target_reps: 5,
      sets: [{ weight_lb: 45, reps: 10, rir: 5, is_warmup: true }],
    };
    expect(() => recommend(squat, strength, [s])).toThrow();
  });
});

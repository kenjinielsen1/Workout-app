import { describe, expect, it } from 'vitest';
import { AnsweredEntries, checkLoadable, RECALIBRATE_AFTER_KEEPS } from './entryCheck';

const machine = { equipment: 'machine_selectorized' as const, default_increment_lb: 10, weight_increment_lb: null, weight_stack_min_lb: null };
const barbell = { equipment: 'barbell' as const, default_increment_lb: 5, weight_increment_lb: null, weight_stack_min_lb: null };
const user = { has_micro_plates: true, dumbbell_increment_lb: 5, plate_system: 'imperial' as const };

describe('manual entry is checked against the grid (FIXES_ENTRY.md bug 1)', () => {
  it('an on-grid entry passes silently — the common case stays frictionless', () => {
    expect(checkLoadable(180, machine, user)).toBeNull();
    expect(checkLoadable(225, barbell, user)).toBeNull();
  });

  it('an off-grid entry reports both the snapped value and the reason', () => {
    const r = checkLoadable(187, machine, user);
    expect(r).not.toBeNull();
    expect(r!.snapped).toBe(190); // nearest selectable on a 10 lb stack
    expect(r!.increment).toBe(10); // the "10 lb steps" shown in the prompt
  });

  it('resolves the CURRENT gym\'s override first (MULTI_GYM.md order)', () => {
    // The same machine measured at 7 lb steps at this gym.
    const calibrated = { ...machine, weight_increment_lb: 7 };
    const r = checkLoadable(20, calibrated, user);
    expect(r?.increment).toBe(7); // gym override beats the catalog/equipment default
  });

  it('never rewrites anything itself — it only reports', () => {
    const entered = 187;
    const r = checkLoadable(entered, machine, user);
    expect(entered).toBe(187); // the caller decides; nothing is mutated here
    expect(r!.snapped).not.toBe(entered);
  });

  it('ignores junk input rather than prompting on it', () => {
    expect(checkLoadable(0, machine, user)).toBeNull();
    expect(checkLoadable(NaN, machine, user)).toBeNull();
  });
});

describe('the fix must not become a repeating prompt', () => {
  it('does not re-ask for the same exercise + weight in a session', () => {
    const answered = new AnsweredEntries();
    expect(answered.has('leg-press', 187)).toBe(false);
    answered.record('leg-press', 187, true);
    expect(answered.has('leg-press', 187)).toBe(true);
    // A different weight, or a different lift, is still a fresh question.
    expect(answered.has('leg-press', 195)).toBe(false);
    expect(answered.has('chest-press', 187)).toBe(false);
  });

  it('repeated "keep" on one exercise means OUR increment is wrong', () => {
    const answered = new AnsweredEntries();
    answered.record('leg-press', 187, true);
    expect(answered.keptCount('leg-press')).toBeLessThan(RECALIBRATE_AFTER_KEEPS);
    answered.record('leg-press', 193, true);
    // Threshold reached → the caller surfaces the increment-calibration prompt
    // instead of continuing to warn.
    expect(answered.keptCount('leg-press')).toBeGreaterThanOrEqual(RECALIBRATE_AFTER_KEEPS);
  });

  it('accepting the snap does not count as overruling us', () => {
    const answered = new AnsweredEntries();
    answered.record('leg-press', 187, false);
    answered.record('leg-press', 193, false);
    expect(answered.keptCount('leg-press')).toBe(0);
  });
});

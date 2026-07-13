import { describe, expect, it } from 'vitest';
import {
  formatWeight,
  formatWeightUnit,
  fromInput,
  LB_PER_KG,
  roundDisplay,
  toDisplay,
} from './units';

describe('unit conversion (UNITS.md — convert only at the edges)', () => {
  it('toDisplay / fromInput are inverses in kg (no rounding)', () => {
    for (const kg of [20, 60, 100, 142.5]) {
      const lb = fromInput(kg, 'kg');
      expect(toDisplay(lb, 'kg')).toBeCloseTo(kg, 9);
    }
  });

  it('is a pass-through for lb users (regression guard)', () => {
    for (const lb of [45, 135, 225, 317.5]) {
      expect(toDisplay(lb, 'lb')).toBe(lb);
      expect(fromInput(lb, 'lb')).toBe(lb);
      expect(formatWeight(lb, 'lb')).toBe(String(lb));
    }
  });

  it('round-trips a kg entry through lb storage within display tolerance', () => {
    // Enter 100 kg → store lb → redisplay kg. Equal within 0.5 kg display rounding.
    const entered = 100;
    const storedLb = fromInput(entered, 'kg');
    const shown = roundDisplay(storedLb, 'kg');
    expect(Math.abs(shown - entered)).toBeLessThanOrEqual(0.5);
    expect(storedLb).toBeCloseTo(220.462, 3);
  });

  it('does not drift across repeated toggles (lb stays the source of truth)', () => {
    const storedLb = fromInput(102.5, 'kg'); // logged once in kg
    // Simulate the user toggling unit back and forth many times. The DISPLAY is
    // recomputed from the unchanged stored lb each time — never re-stored.
    let shownKg = 0;
    for (let i = 0; i < 100; i++) {
      shownKg = roundDisplay(storedLb, 'kg'); // kg view
      void toDisplay(storedLb, 'lb'); // lb view
    }
    expect(shownKg).toBe(102.5); // identical every time; no accumulation
  });

  it('kg display rounds to the 0.5 kg plate grid', () => {
    // 101 lb ≈ 45.8 kg → rounds to 46.0; 100 kg exact.
    expect(roundDisplay(fromInput(46.0, 'kg'), 'kg')).toBe(46);
    expect(roundDisplay(fromInput(45.7, 'kg'), 'kg')).toBe(45.5);
    expect(formatWeightUnit(fromInput(60, 'kg'), 'kg')).toBe('60 kg');
  });

  it('LB_PER_KG is the standard factor', () => {
    expect(LB_PER_KG).toBeCloseTo(2.2046226218, 9);
  });
});

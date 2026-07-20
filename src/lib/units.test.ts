import { describe, expect, it } from 'vitest';
import {
  formatPercent,
  formatTonnage,
  formatWeight,
  formatWeightUnit,
  fromInput,
  LB_PER_KG,
  roundDisplay,
  toDisplay,
} from './units';

describe('display formatting (POLISH.md §5 — round at the render boundary)', () => {
  it('formatPercent rounds and signs, never leaking float artifacts', () => {
    expect(formatPercent(0.032, 1)).toBe('+3.2%');
    expect(formatPercent(-0.048, 1)).toBe('−4.8%'); // real minus glyph
    expect(formatPercent(0)).toBe('0%');
    // 0.077 * 100 = 7.700000000000001 → must not reach the screen.
    expect(formatPercent(0.077, 1)).toBe('+7.7%');
    expect(formatPercent(0.031)).toBe('+3%'); // default 0 decimals
  });

  it('formatTonnage compacts thousands and rounds the rest', () => {
    expect(formatTonnage(1250)).toBe('1.3k');
    expect(formatTonnage(940.4)).toBe('940');
    expect(formatTonnage(0)).toBe('0');
  });
});

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

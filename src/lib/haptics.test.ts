// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { haptic, hapticsEnabled, setHapticsEnabled } from './haptics';

describe('haptics (POLISH.md §2)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal('navigator', { vibrate: vi.fn(() => true) });
  });
  afterEach(() => vi.unstubAllGlobals());

  it('defaults to enabled and fires a pattern per intent', () => {
    expect(hapticsEnabled()).toBe(true);
    haptic('tick');
    haptic('strong');
    expect(navigator.vibrate).toHaveBeenCalledTimes(2);
    // The PR buzz is a multi-pulse pattern; a plain tick is a single short pulse.
    expect(navigator.vibrate).toHaveBeenNthCalledWith(1, 12);
    expect(Array.isArray((navigator.vibrate as ReturnType<typeof vi.fn>).mock.calls[1]![0])).toBe(true);
  });

  it('does not vibrate when the user has turned haptics off', () => {
    setHapticsEnabled(false);
    expect(hapticsEnabled()).toBe(false);
    haptic('tick');
    expect(navigator.vibrate).not.toHaveBeenCalled();
  });

  it('re-enabling restores buzzing', () => {
    setHapticsEnabled(false);
    setHapticsEnabled(true);
    haptic('affirm');
    expect(navigator.vibrate).toHaveBeenCalledOnce();
  });

  it('is a silent no-op where the Vibration API is unsupported (iOS PWA)', () => {
    vi.stubGlobal('navigator', {}); // no vibrate
    expect(() => haptic('strong')).not.toThrow();
  });
});

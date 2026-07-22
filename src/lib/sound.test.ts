// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { playCue, setSoundEnabled, soundEnabled } from './sound';

// Minimal Web Audio mock: record oscillator creation so we can assert cues fire.
function mockAudio() {
  const started: number[] = [];
  const osc = () => ({
    type: 'sine',
    frequency: { setValueAtTime: vi.fn() },
    connect: () => ({ connect: vi.fn() }),
    start: (t: number) => started.push(t),
    stop: vi.fn(),
  });
  const gain = () => ({ gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() }, connect: (n: unknown) => n });
  class AC {
    state = 'running';
    currentTime = 0;
    destination = {};
    resume = vi.fn();
    createOscillator = osc;
    createGain = gain;
  }
  vi.stubGlobal('AudioContext', AC as unknown as typeof AudioContext);
  return { started };
}

describe('sound cues (POLISH.md §2)', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.unstubAllGlobals());

  it('is opt-out (on by default) and plays a blip per cue', () => {
    const { started } = mockAudio();
    expect(soundEnabled()).toBe(true);
    playCue('tick');
    expect(started.length).toBe(1); // one oscillator for a tick
    playCue('strong');
    expect(started.length).toBe(4); // PR is a three-note rise
  });

  it('is silent when the user turns sound off', () => {
    const { started } = mockAudio();
    setSoundEnabled(false);
    playCue('affirm');
    expect(started.length).toBe(0);
  });

  it('no-ops without Web Audio support, never throwing', () => {
    vi.stubGlobal('AudioContext', undefined);
    vi.stubGlobal('webkitAudioContext', undefined);
    expect(() => playCue('strong')).not.toThrow();
  });
});

// Audible feedback cues (POLISH.md §2, the iOS-viable tactile substitute). iOS
// PWAs can't fire haptics, but the Web Audio API works: the AudioContext unlocks
// on the first user tap (where our cues fire) and then plays reliably — including
// a later rest-timer chime, since the context stays unlocked once resumed.
//
// Cues are short synthesized blips (no audio files to ship). Off by default is the
// usual choice, but this is opt-OUT here because the user asked to try it; the
// setting is per-device (localStorage), never synced. Silent mode / low volume can
// still swallow it, so the visible confirmation bar remains the guaranteed signal.

export type CueKind =
  | 'tick' // set logged
  | 'affirm' // hit target / rest fired
  | 'strong' // PR
  | 'soft'; // miss

const KEY = 'po:sound';

export function soundEnabled(): boolean {
  try {
    return localStorage.getItem(KEY) !== 'off';
  } catch {
    return true;
  }
}

export function setSoundEnabled(on: boolean): void {
  try {
    localStorage.setItem(KEY, on ? 'on' : 'off');
  } catch {
    /* private mode — nothing to persist */
  }
}

let ctx: AudioContext | null = null;
function audioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  try {
    if (!ctx) ctx = new AC();
    if (ctx.state === 'suspended') void ctx.resume(); // unlock inside the tap (iOS)
    return ctx;
  } catch {
    return null;
  }
}

/** One short percussive blip with a fast attack + exponential decay. */
function blip(ac: AudioContext, freq: number, at: number, dur: number, peak = 0.09, type: OscillatorType = 'sine'): void {
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, at);
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(peak, at + 0.006);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  osc.connect(gain).connect(ac.destination);
  osc.start(at);
  osc.stop(at + dur + 0.02);
}

/** Play the cue for an intent. No-op when disabled or unsupported. */
export function playCue(kind: CueKind): void {
  if (!soundEnabled()) return;
  const ac = audioContext();
  if (!ac) return;
  const t = ac.currentTime;
  switch (kind) {
    case 'tick':
      blip(ac, 880, t, 0.07);
      break;
    case 'affirm':
      blip(ac, 880, t, 0.06);
      blip(ac, 1320, t + 0.05, 0.08);
      break;
    case 'strong': // PR — a short rising three-note
      blip(ac, 660, t, 0.09, 0.1);
      blip(ac, 990, t + 0.08, 0.09, 0.1);
      blip(ac, 1320, t + 0.16, 0.14, 0.11);
      break;
    case 'soft':
      blip(ac, 320, t, 0.1, 0.07);
      break;
  }
}

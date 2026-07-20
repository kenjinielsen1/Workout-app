// Haptic micro-feedback (POLISH.md §2). In the gym — chalky hands, phone propped
// on a rack, poor sightline — the user needs to FEEL a tap register or they tap
// again and double-log.
//
// This uses the Web Vibration API, which fires real haptics on Android. iOS PWA
// ignores navigator.vibrate(), so every caller ALSO drives a visible state change
// (a logged row appears, a button depresses): the tactile layer is an enhancement,
// never the sole confirmation. The setting is a per-DEVICE preference (haptics is
// a property of the phone in your hand, not the account), so it lives in
// localStorage and is never synced.

const KEY = 'po:haptics';

export type HapticKind =
  | 'tick' // set logged — the short anti-double-log confirm
  | 'affirm' // hit target / rest fired — a touch more affirmative
  | 'strong' // PR — the signature buzz (DESIGN.md)
  | 'soft'; // miss / veto / deload — acknowledged, not punished

// Durations in ms; arrays alternate vibrate/pause. Kept short — feedback, not alarm.
const PATTERNS: Record<HapticKind, number | number[]> = {
  tick: 12,
  affirm: [16, 40, 24],
  strong: [28, 55, 28, 55, 55],
  soft: 22,
};

export function hapticsEnabled(): boolean {
  try {
    return localStorage.getItem(KEY) !== 'off';
  } catch {
    return true; // default on; storage blocked (private mode) → still try to buzz
  }
}

export function setHapticsEnabled(on: boolean): void {
  try {
    localStorage.setItem(KEY, on ? 'on' : 'off');
  } catch {
    /* quota / private mode — nothing to persist, no harm */
  }
}

/** Fire a haptic of the given intent. No-op when disabled or unsupported (iOS);
 *  the caller's visual state change is the guaranteed confirmation. */
export function haptic(kind: HapticKind): void {
  if (!hapticsEnabled()) return;
  try {
    navigator.vibrate?.(PATTERNS[kind]);
  } catch {
    /* unsupported / blocked — the visual fallback carries it */
  }
}

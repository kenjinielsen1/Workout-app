// Haptic micro-feedback (POLISH.md §2). In the gym — chalky hands, phone propped
// on a rack, poor sightline — the user needs to FEEL a tap register or they tap
// again and double-log.
//
// Two mechanisms, because the platforms differ:
//   · Android / standards: the Web Vibration API (navigator.vibrate) — rich
//     patterns, fires from any context.
//   · iOS (17.4+): no Vibration API at all, but toggling a hidden
//     <input type="checkbox" switch> plays a system haptic. It ONLY fires inside a
//     user gesture and gives ONE fixed haptic (no intensity variation). Every
//     tap-driven call here runs inside a gesture (Hit target / Log set / a PR
//     committed from that tap), so those buzz; a non-gesture call (rest-timer
//     expiry) can't buzz on iOS — the notification covers that case.
//
// Either way every caller ALSO drives a visible state change (a logged row appears,
// a button depresses): the tactile layer is an enhancement, never the sole confirm.
// The setting is a per-DEVICE preference (haptics is a property of the phone in your
// hand, not the account), so it lives in localStorage and is never synced.

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

// The iOS haptic surface: a single hidden switch input. Toggling it (via a click
// inside a user gesture) plays the system selection haptic on iOS 17.4+. Created
// lazily and reused; display:none is fine — the haptic rides the toggle, not paint.
let iosSwitch: HTMLLabelElement | null = null;
function iosHapticFallback(): void {
  if (typeof document === 'undefined') return;
  if (!iosSwitch) {
    const label = document.createElement('label');
    label.setAttribute('aria-hidden', 'true');
    label.style.display = 'none';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.setAttribute('switch', ''); // iOS 17.4+ switch control
    input.tabIndex = -1;
    label.appendChild(input);
    (document.body ?? document.head).appendChild(label);
    iosSwitch = label;
  }
  try {
    iosSwitch.click();
  } catch {
    /* ignore */
  }
}

/** Fire a haptic of the given intent. No-op when disabled. Uses the Vibration API
 *  where present (Android), else the iOS <input switch> trick. The caller's visible
 *  state change is the guaranteed confirmation on any platform. */
export function haptic(kind: HapticKind): void {
  if (!hapticsEnabled()) return;
  const nav = typeof navigator !== 'undefined' ? navigator : undefined;
  if (nav && typeof nav.vibrate === 'function') {
    try {
      nav.vibrate(PATTERNS[kind]);
      return;
    } catch {
      /* fall through to the iOS path */
    }
  }
  iosHapticFallback();
}

// Rest-complete notifications (BUGFIXES.md Bugs 1 & 2).
//
// Two mechanisms, in order of preference:
//   A. Notification Triggers API — schedule a notification for a future timestamp
//      with NO code running at fire time. Fires even if the app is closed/locked.
//      Support is limited (feature-detected below).
//   B. Fallback — the foreground tick and visibilitychange handler in the hook
//      call showRestCompleteNow() when now >= endsAt. Covers "user came back right
//      after it ended" where triggered notifications aren't available.
//
// Everything here is feature-detected and never throws: if notifications are
// unsupported or denied, the in-foreground visual countdown still works.

const TITLE = 'Rest complete';
const BODY = 'Time for your next set.';
export const REST_TAG = 'rest-timer'; // reused as the tag so a new rest replaces the old notif

export interface NotifyCapability {
  /** Notification + service worker APIs exist at all (iOS < 16.4 / old browsers: false). */
  supported: boolean;
  /** Current permission, or 'unsupported'. */
  permission: NotificationPermission | 'unsupported';
  /** iOS Safari tab: notifications require the PWA be installed to the home screen. */
  needsInstall: boolean;
  /** Notification Triggers API present — can schedule a fire-while-closed alert. */
  canSchedule: boolean;
}

/** iOS-only flag: true when running as an installed standalone PWA. */
function isStandalone(): boolean {
  try {
    // iOS Safari exposes navigator.standalone; other platforms use display-mode.
    const iosStandalone = (navigator as unknown as { standalone?: boolean }).standalone;
    if (typeof iosStandalone === 'boolean') return iosStandalone;
    return typeof matchMedia !== 'undefined' && matchMedia('(display-mode: standalone)').matches;
  } catch {
    return false;
  }
}

/** True on iPhone/iPad (incl. iPadOS reporting as Mac with touch). */
function isIOS(): boolean {
  try {
    const ua = navigator.userAgent || '';
    return /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && 'ontouchend' in document);
  } catch {
    return false;
  }
}

export function notifyCapability(): NotifyCapability {
  const hasNotification = typeof Notification !== 'undefined';
  const hasSW = typeof navigator !== 'undefined' && 'serviceWorker' in navigator;
  const supported = hasNotification && hasSW;
  return {
    supported,
    permission: hasNotification ? Notification.permission : 'unsupported',
    // Only iOS actually blocks tab notifications; on iOS require standalone.
    needsInstall: supported && isIOS() && !isStandalone(),
    canSchedule:
      supported &&
      'showTrigger' in Notification.prototype &&
      typeof (globalThis as Record<string, unknown>).TimestampTrigger !== 'undefined',
  };
}

/** Request permission — call this on the FIRST rest start (a user gesture), never
 *  on app load (load-time prompts get reflexively denied). Returns the outcome. */
export async function ensureNotifyPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (typeof Notification === 'undefined') return 'unsupported';
  if (Notification.permission !== 'default') return Notification.permission;
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

/**
 * Mechanism A: schedule a notification to fire at `endsAt` with no app running.
 * Returns why it couldn't, so the caller knows to lean on the fallback.
 */
export async function scheduleRestNotification(
  endsAt: number,
): Promise<'scheduled' | 'no-permission' | 'unsupported'> {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') {
    return 'no-permission';
  }
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return 'unsupported';
  const cap = notifyCapability();
  if (!cap.canSchedule) return 'unsupported';
  try {
    const reg = await navigator.serviceWorker.ready;
    const Trigger = (globalThis as Record<string, unknown>).TimestampTrigger as {
      new (ts: number): unknown;
    };
    await reg.showNotification(TITLE, {
      body: BODY,
      tag: REST_TAG,
      // @ts-expect-error showTrigger is not yet in the DOM lib types
      showTrigger: new Trigger(endsAt),
    });
    return 'scheduled';
  } catch {
    return 'unsupported';
  }
}

/** Mechanism B: show the notification right now (foreground expiry / on-return). */
export async function showRestCompleteNow(): Promise<void> {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  try {
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.ready;
      await reg.showNotification(TITLE, { body: BODY, tag: REST_TAG });
      return;
    }
  } catch {
    /* fall through to the page-level Notification */
  }
  try {
    new Notification(TITLE, { body: BODY, tag: REST_TAG });
  } catch {
    /* nothing more we can do; the visual timer already showed "rest complete" */
  }
}

/** Cancel a pending scheduled notification (rest dismissed / a new set logged). */
export async function cancelRestNotification(): Promise<void> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    const notifs = await reg.getNotifications({ tag: REST_TAG, includeTriggered: true } as GetNotificationOptions);
    notifs.forEach((n) => n.close());
  } catch {
    /* ignore — a stale notif at worst */
  }
}

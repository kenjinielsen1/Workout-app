// Web Push subscription + server scheduling for rest-complete alerts that fire
// while the phone is locked (BUGFIXES.md). This is the iOS path: iOS Safari has
// no local scheduled-notification API, so a server (the ML service) must push at
// the moment rest ends. Everything here is feature-detected and no-throw — if
// push isn't configured or supported, the in-app timer + on-return alert still
// work.

const VAPID_PUBLIC = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;
const PUSH_URL = import.meta.env.VITE_ML_URL as string | undefined;

/** True only when both the VAPID public key and the push server URL are set. */
export function pushConfigured(): boolean {
  return !!VAPID_PUBLIC && !!PUSH_URL;
}

/** VAPID keys travel as base64url; the browser wants the raw bytes. */
export function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const normalized = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(normalized);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

function pushSupported(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    'serviceWorker' in navigator &&
    typeof PushManager !== 'undefined'
  );
}

/** Reuse the existing push subscription or create one. Null if unsupported. */
export async function getPushSubscription(): Promise<PushSubscriptionJSON | null> {
  if (!pushConfigured() || !pushSupported()) return null;
  try {
    const reg = await navigator.serviceWorker.ready;
    const existing = await reg.pushManager.getSubscription();
    const sub =
      existing ??
      (await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC!) as unknown as BufferSource,
      }));
    return sub.toJSON();
  } catch {
    return null; // permission not granted, or subscribe failed — fall back
  }
}

/** Ask the server to push a rest-complete notification at `endsAt`. */
export async function scheduleServerPush(endsAt: number, exerciseName?: string): Promise<boolean> {
  if (!pushConfigured()) return false;
  const subscription = await getPushSubscription();
  if (!subscription) return false;
  const delaySeconds = Math.max(0, Math.round((endsAt - Date.now()) / 1000));
  try {
    const res = await fetch(`${PUSH_URL}/rest/push`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        subscription,
        delay_seconds: delaySeconds,
        exercise_name: exerciseName,
      }),
      keepalive: true, // survive the page being backgrounded right after
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Cancel a pending server push (rest dismissed). Best-effort. */
export async function cancelServerPush(): Promise<void> {
  if (!pushConfigured() || !pushSupported()) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (!sub) return;
    await fetch(`${PUSH_URL}/rest/cancel`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ subscription: sub.toJSON() }),
      keepalive: true,
    });
  } catch {
    /* ignore — a stale push at worst, deduped by tag */
  }
}

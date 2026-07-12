import { describe, expect, it } from 'vitest';
import {
  cancelServerPush,
  getPushSubscription,
  pushConfigured,
  scheduleServerPush,
  urlBase64ToUint8Array,
} from './push';

// In the test env VITE_VAPID_PUBLIC_KEY and VITE_ML_URL are '' (vite.config.ts),
// so push is unconfigured — the safe default that must never touch the network.

describe('web push client (graceful, unconfigured by default)', () => {
  it('pushConfigured is false without a VAPID key + server URL', () => {
    expect(pushConfigured()).toBe(false);
  });

  it('getPushSubscription resolves null when unconfigured/unsupported', async () => {
    await expect(getPushSubscription()).resolves.toBeNull();
  });

  it('scheduleServerPush no-ops (false) when unconfigured — no fetch', async () => {
    await expect(scheduleServerPush(Date.now() + 90_000, 'Squat')).resolves.toBe(false);
  });

  it('cancelServerPush never throws when unconfigured', async () => {
    await expect(cancelServerPush()).resolves.toBeUndefined();
  });

  it('urlBase64ToUint8Array decodes a VAPID-style base64url key to raw bytes', () => {
    // "hello" → base64url "aGVsbG8" (no padding, url-safe).
    const bytes = urlBase64ToUint8Array('aGVsbG8');
    expect(Array.from(bytes)).toEqual([104, 101, 108, 108, 111]);
  });

  it('urlBase64ToUint8Array handles url-safe chars and missing padding', () => {
    // 0xFF 0xFE 0xFD → standard base64 "//79" → url-safe "__79".
    const bytes = urlBase64ToUint8Array('__79');
    expect(Array.from(bytes)).toEqual([255, 254, 253]);
  });
});

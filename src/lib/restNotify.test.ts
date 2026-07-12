import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ensureNotifyPermission,
  notifyCapability,
  scheduleRestNotification,
  showRestCompleteNow,
} from './restNotify';

afterEach(() => {
  vi.unstubAllGlobals();
});

function stubNotification(permission: NotificationPermission, extras: Record<string, unknown> = {}) {
  const Notif = function () {} as unknown as typeof Notification;
  Object.assign(Notif, { permission, requestPermission: vi.fn() });
  Object.assign(Notif.prototype as object, extras);
  vi.stubGlobal('Notification', Notif);
}

describe('notifyCapability', () => {
  it('reports unsupported when the Notification API is absent', () => {
    vi.stubGlobal('Notification', undefined);
    vi.stubGlobal('navigator', { userAgent: 'node' });
    const cap = notifyCapability();
    expect(cap.supported).toBe(false);
    expect(cap.permission).toBe('unsupported');
    expect(cap.needsInstall).toBe(false);
    expect(cap.canSchedule).toBe(false);
  });

  it('flags needsInstall on an iOS Safari tab (not standalone)', () => {
    stubNotification('default');
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Safari',
      serviceWorker: {},
      standalone: false,
    });
    const cap = notifyCapability();
    expect(cap.supported).toBe(true);
    expect(cap.needsInstall).toBe(true);
  });

  it('does NOT flag needsInstall once installed to the home screen', () => {
    stubNotification('granted');
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Safari',
      serviceWorker: {},
      standalone: true,
    });
    expect(notifyCapability().needsInstall).toBe(false);
  });

  it('detects the Notification Triggers API when present', () => {
    stubNotification('granted', { showTrigger: null });
    vi.stubGlobal('navigator', { userAgent: 'Android Chrome', serviceWorker: {} });
    vi.stubGlobal('TimestampTrigger', function () {});
    expect(notifyCapability().canSchedule).toBe(true);
  });
});

describe('graceful degradation (permission denied / unsupported)', () => {
  it('showRestCompleteNow never throws when notifications are denied', async () => {
    stubNotification('denied');
    vi.stubGlobal('navigator', { userAgent: 'x' });
    await expect(showRestCompleteNow()).resolves.toBeUndefined();
  });

  it('scheduleRestNotification returns no-permission when not granted', async () => {
    stubNotification('default');
    vi.stubGlobal('navigator', { serviceWorker: {}, userAgent: 'x' });
    await expect(scheduleRestNotification(Date.now() + 90_000)).resolves.toBe('no-permission');
  });

  it('scheduleRestNotification returns unsupported without the Triggers API', async () => {
    stubNotification('granted'); // granted, but no showTrigger on the prototype
    vi.stubGlobal('navigator', {
      serviceWorker: { ready: Promise.resolve({ showNotification: vi.fn() }) },
      userAgent: 'x',
    });
    await expect(scheduleRestNotification(Date.now() + 90_000)).resolves.toBe('unsupported');
  });

  it('ensureNotifyPermission is a no-op that reports unsupported without the API', async () => {
    vi.stubGlobal('Notification', undefined);
    await expect(ensureNotifyPermission()).resolves.toBe('unsupported');
  });
});

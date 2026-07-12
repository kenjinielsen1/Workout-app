// Web Push handlers, imported into the Workbox-generated service worker
// (vite.config.ts → workbox.importScripts). Plain JS on purpose: the SW runs
// outside the app bundle. Fires the rest-complete notification the server pushes,
// even while the phone is locked and the app is closed.

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (_e) {
    data = {};
  }
  const title = data.title || 'Rest complete';
  const body = data.body || 'Time for your next set.';
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      tag: data.tag || 'rest-timer', // replaces any prior rest notif
      renotify: true,
      icon: '/icon.svg',
      badge: '/icon.svg',
    }),
  );
});

// Tapping the notification focuses the app (or opens it).
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    (async () => {
      const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of clients) {
        if ('focus' in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow('/');
    })(),
  );
});

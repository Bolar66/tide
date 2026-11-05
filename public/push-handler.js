/* Imported into the generated service worker (workbox importScripts). */
self.addEventListener('push', (event) => {
  let data = { title: 'Tide', body: 'Uusi viesti', tag: 'tide' };
  try {
    data = { ...data, ...event.data.json() };
  } catch {
    /* generic fallback */
  }
  event.waitUntil(
    Promise.all([
      self.registration.showNotification(data.title, {
        body: data.body,
        tag: data.tag,
        data: { url: data.url ?? '' },
        icon: 'pwa-192x192.png',
        badge: 'pwa-64x64.png',
      }),
      // Let an open app fetch the new message right away.
      self.clients.matchAll({ type: 'window' }).then((clients) => clients.forEach((c) => c.postMessage({ type: 'tide-push' }))),
    ]),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      // Reminders may point at a view, e.g. "#/calendar" for the heads-up.
      const hash = event.notification.data?.url ?? '';
      const open = clients.find((c) => 'focus' in c);
      if (open) {
        if (hash && 'navigate' in open) open.navigate(self.registration.scope + hash).catch(() => undefined);
        return open.focus();
      }
      return self.clients.openWindow(self.registration.scope + hash);
    }),
  );
});

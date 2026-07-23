/**
 * SkillSphere Service Worker — handles Web Push Notifications.
 *
 * This file lives in client/public/ so it's served at the root scope (/).
 * It listens for push events from the server and displays native
 * desktop/mobile notifications even when the browser tab is closed.
 */

/* eslint-disable no-restricted-globals */

// ── Push Event ───────────────────────────────────────
// Triggered by the server via web-push when a notification is sent
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: 'SkillSphere', body: event.data ? event.data.text() : '' };
  }

  const options = {
    body: data.body || '',
    icon: data.icon || '/images/logo192.png',
    badge: '/images/logo192.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/',
      dateOfArrival: Date.now(),
    },
    actions: [
      { action: 'open', title: 'Open' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'SkillSphere', options)
  );
});

// ── Notification Click ───────────────────────────────
// When user clicks the notification, open the relevant page
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  const url = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a tab with our app is already open, focus it and navigate
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          client.navigate(url);
          return;
        }
      }
      // Otherwise open a new tab
      return self.clients.openWindow(url);
    })
  );
});

// ── Service Worker Lifecycle ─────────────────────────
self.addEventListener('install', (event) => {
  // Activate immediately, don't wait for old SW to retire
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Claim all open tabs so push works immediately
  event.waitUntil(self.clients.claim());
});

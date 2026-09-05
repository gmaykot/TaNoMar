/// <reference lib="webworker" />
import {
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
  precacheAndRoute,
} from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import {
  parsePushPayload,
  shouldShowPushNotification,
} from './features/notifications/push/shouldShowPushNotification';

declare let self: ServiceWorkerGlobalScope;

precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();
registerRoute(
  new NavigationRoute(createHandlerBoundToURL('/index.html'), {
    denylist: [/^\/api\//],
  }),
);

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') void self.skipWaiting();
});

self.addEventListener('push', (event) => {
  event.waitUntil(handlePush(event));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target =
    typeof event.notification.data?.url === 'string' ? event.notification.data.url : '/';
  event.waitUntil(openApp(target));
});

async function handlePush(event: PushEvent) {
  const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  if (!shouldShowPushNotification(windows)) return;
  const payload = parsePushPayload(event.data ? event.data.json() : null);
  await self.registration.showNotification(payload.title, {
    body: payload.body,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    data: { url: '/' },
  });
}

async function openApp(url: string) {
  const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  const existing = windows.find((client) => 'focus' in client);
  if (existing) {
    await existing.focus();
    if ('navigate' in existing) await existing.navigate(url);
    return;
  }
  await self.clients.openWindow(url);
}

import { precacheAndRoute } from 'workbox-precaching';

declare const self: {
  __WB_MANIFEST: never[];
  addEventListener: (type: string, handler: (event: any) => void) => void;
  registration: { showNotification: (title: string, options: object) => Promise<void> };
};

declare const clients: { openWindow: (url: string) => Promise<unknown> };

precacheAndRoute(self.__WB_MANIFEST);

self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {};
  const title = data.title ?? 'WC26 Predictor';
  const options = {
    body: data.body ?? '',
    icon: '/pwa-192x192.png',
    badge: '/pwa-64x64.png',
    data: { url: data.url ?? '/' },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data?.url as string) ?? '/';
  event.waitUntil(clients.openWindow(url));
});

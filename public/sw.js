// Minimal Service Worker to satisfy PWA desktop installability requirements
const CACHE_NAME = 'lekha-script-pwa-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Pass through network requests dynamically
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});

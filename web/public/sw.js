// PlantAI Service Worker for Offline Execution
const CACHE_NAME = 'plantai-cache-v1';
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/logo.svg',
  '/favicon.ico',
  '/favicon-32x32.png',
  '/apple-touch-icon.png',
  '/species/credits.json',
  '/species/neutral_leaf.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && !name.startsWith('plantai-models-'))
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Skip supabase API requests and browser-sync/vite dev websockets
  if (url.origin !== self.location.origin && !url.hostname.includes('fonts.gstatic.com')) {
    return;
  }

  // Network-first for HTML navigation, stale-while-revalidate for assets
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match('/') || caches.match('/index.html');
      })
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Return cached and update in background
        fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse));
          }
        }).catch(() => {});
        return cachedResponse;
      }

      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200) {
          return networkResponse;
        }

        // Cache local assets
        if (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/species/')) {
          const clonedResponse = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clonedResponse));
        }

        return networkResponse;
      }).catch(() => {
        // Fallback for missing species image
        if (url.pathname.startsWith('/species/')) {
          return caches.match('/species/neutral_leaf.svg');
        }
        return new Response('Network error occurred while offline', { status: 503 });
      });
    })
  );
});


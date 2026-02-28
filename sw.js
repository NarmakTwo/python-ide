const CACHE_NAME = 'my-site-cache-v1';
const DEBUG = true;

const log = (message, color = '#7f8c8d') => {
  if (DEBUG) console.log(`%c${message}`, `color: ${color}`);
};

// No precaching on install — just activate ASAP
self.addEventListener('install', (event) => {
  log('[SW] Install: Skipping waiting...', '#3498db');
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  log('[SW] Activate: Cleaning up old caches...', '#9b59b6');
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.map((key) => {
        if (key !== CACHE_NAME) {
          log(`[SW] Deleting obsolete cache: ${key}`);
          return caches.delete(key);
        }
      })
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Only handle GET requests over http/https — ignore chrome-extension, data:, etc.
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (!url.protocol.startsWith('http')) return;

  const pathname = url.pathname;

  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.match(event.request).then((cachedResponse) => {

        const fetchPromise = fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            log(`[SW] Caching & serving: ${pathname}`, '#2ecc71');
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        }).catch(() => {
          console.warn(`[SW] Fetch failed for ${pathname} (offline)`);
        });

        if (cachedResponse) {
          log(`[SW] Serving from cache: ${pathname}`, '#f39c12');
          // Refresh cache in background (stale-while-revalidate)
          fetchPromise;
          return cachedResponse;
        }

        log(`[SW] Not in cache, fetching: ${pathname}`, '#e74c3c');
        return fetchPromise;
      });
    })
  );
});
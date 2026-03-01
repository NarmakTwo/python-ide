/**
 * Nuilith Service Worker
 * Handlers: Offline Cache + Synchronous Input Bridge
 */

const CACHE_NAME = 'nuilith-cache-v1';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './index.js',
    './worker.js',
    './style.css',
    './programiz.css'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => Promise.all(
            keys.map((key) => {
                if (key !== CACHE_NAME) return caches.delete(key);
            })
        )).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // --- THE INPUT TRAP ---
    if (url.pathname.includes('/get_input')) {
        event.respondWith(
            new Promise((resolve) => {
                const channel = new MessageChannel();
                
                channel.port1.onmessage = (msg) => {
                    resolve(new Response(String(msg.data ?? ''), {
                        status: 200,
                        headers: { 'Content-Type': 'text/plain' }
                    }));
                };

                self.clients.matchAll().then((clients) => {
                    // Must post to the WINDOW (page), not the worker - only the page has term.read()
                    const client = clients.find(c => c.type === 'window') || clients[0];
                    if (client) {
                        client.postMessage({ type: 'INPUT_REQUEST' }, [channel.port2]);
                    } else {
                        resolve(new Response('', { status: 200, headers: { 'Content-Type': 'text/plain' } }));
                    }
                });
            })
        );
        return;
    }

    event.respondWith(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.match(event.request).then((cachedResponse) => {
                const fetchPromise = fetch(event.request).then((networkResponse) => {
                    if (networkResponse && networkResponse.status === 200) {
                        cache.put(event.request, networkResponse.clone());
                    }
                    return networkResponse;
                }).catch(() => {});

                return cachedResponse || fetchPromise;
            });
        })
    );
});
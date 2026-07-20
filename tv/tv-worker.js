// Reelix TV - Service Worker

const CACHE_NAME = 'reelix-tv-v1';
const ASSETS = [
    '/ReelixTV/tv/',
    '/ReelixTV/tv/index.html',
    '/ReelixTV/tv/tv-styles.css',
    '/ReelixTV/tv/tv-app.js',
    '/ReelixTV/tv/manifest.json',
    '/ReelixTV/icons/icon-192.png',
    '/ReelixTV/icons/icon-512.png'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(ASSETS))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.filter(key => key !== CACHE_NAME)
                    .map(key => caches.delete(key))
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);
    
    // Cache static assets
    if (ASSETS.some(asset => url.pathname.includes(asset) || url.pathname === asset)) {
        event.respondWith(
            caches.match(event.request)
                .then(cached => cached || fetch(event.request))
        );
        return;
    }
    
    // Network first for everything else
    event.respondWith(
        fetch(event.request)
            .then(response => {
                const clone = response.clone();
                caches.open(CACHE_NAME).then(cache => {
                    cache.put(event.request, clone);
                });
                return response;
            })
            .catch(() => caches.match(event.request))
    );
});

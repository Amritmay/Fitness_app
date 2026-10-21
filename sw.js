// Offline support: network-first (so edits show up immediately), falling back to cache.
// Bump CACHE when you add files so old caches are cleaned up.
const CACHE = 'ascend-v16';
const FILES = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/app.css',
  './js/app.js',
  './js/data.js',
  './js/store.js',
  './js/engine.js',
  './js/ui.js',
  './js/timer.js',
  './js/wheel.js',
  './js/celebrate.js',
  './js/biomech.js',
  './js/eta.js',
  './js/views/log.js',
  './js/views/onboarding.js',
  './js/views/today.js',
  './js/views/skills.js',
  './js/views/progress.js',
  './js/views/profile.js',
  './icons/icon.svg',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    fetch(req, { cache: 'no-cache' })
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req, { ignoreSearch: true }).then((r) => r || caches.match('./index.html')))
  );
});

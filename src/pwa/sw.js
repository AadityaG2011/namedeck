// sw.js — service worker.
// Strategy:
//   - App shell / navigations: NETWORK-FIRST, so a new deploy shows on the next online
//     launch; falls back to the cached shell when offline.
//   - Other GET assets (manifest, icons): cache-first for speed and offline use.
// Bump CACHE when you want to force-clear old caches.

var CACHE = 'namedeck-v1';
var SHELL = './index.html';
var ASSETS = [
  SHELL,
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE)
      .then(function (c) { return c.addAll(ASSETS); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(keys.map(function (k) { return k === CACHE ? null : caches.delete(k); }));
      })
      .then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return; // only handle GETs

  // App shell / navigations: network-first so new deploys appear; cache as offline backup.
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then(function (res) {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(SHELL, copy); });
          return res;
        })
        .catch(function () { return caches.match(SHELL); })
    );
    return;
  }

  // Everything else: cache-first, falling back to the network.
  e.respondWith(
    caches.match(req).then(function (hit) { return hit || fetch(req); })
  );
});

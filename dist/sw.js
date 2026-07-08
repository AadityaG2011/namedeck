// sw.js — service worker: caches the app shell so NameDeck opens offline and loads fast.
// Bump CACHE (e.g. v1 -> v2) when the shell changes to force clients to refresh.

var CACHE = 'namedeck-v1';
var ASSETS = [
  './index.html',
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
  e.respondWith(
    caches.match(req).then(function (hit) {
      return hit || fetch(req).catch(function () {
        // Offline and uncached: fall back to the app shell for navigations.
        if (req.mode === 'navigate') return caches.match('./index.html');
      });
    })
  );
});

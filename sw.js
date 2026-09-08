/* AGIMAT ONLINE service worker — PWA install + resilient startup.
   v2: core files precached; the index.html fallback applies ONLY to page
   navigations (v1 wrongly served index.html for failed game.js fetches,
   which broke launches while the Render free instance was waking up). */
const VERSION = 'agimat-v17';
const PRECACHE = ['/', '/index.html', '/style.css', '/game.js', '/three.module.min.js',
  '/manifest.webmanifest', '/img/icons/icon-192.png', '/img/icons/icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  if (url.pathname.startsWith('/api/') || url.pathname === '/ws') return;
  if (url.pathname.startsWith('/data/')) return;               // live game data: always fresh
  e.respondWith(
    fetch(e.request).then(res => {
      if (res.ok && url.origin === location.origin) {
        const copy = res.clone();
        caches.open(VERSION).then(c => c.put(e.request, copy));
      }
      return res;
    }).catch(() =>
      caches.match(e.request).then(hit => {
        if (hit) return hit;
        /* only page NAVIGATIONS may fall back to the shell */
        if (e.request.mode === 'navigate') return caches.match('/index.html');
        return Response.error();
      })
    )
  );
});

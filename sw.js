/* AGIMAT ONLINE service worker — PWA install + lightweight offline shell.
   Strategy: network-first for everything (the game is online-only anyway),
   falling back to cache so the shell still opens without signal.
   API/WS are never cached. Bump VERSION to force-refresh old clients. */
const VERSION = 'agimat-v1';
const PRECACHE = ['/', '/index.html', '/style.css', '/manifest.webmanifest',
  '/img/icons/icon-192.png', '/img/icons/icon-512.png'];

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
  if (e.request.method !== 'GET') return;                       // API posts etc.
  if (url.pathname.startsWith('/api/') || url.pathname === '/ws') return;
  if (url.pathname.startsWith('/data/')) return;                // live game data: always fresh
  e.respondWith(
    fetch(e.request).then(res => {
      if (res.ok && url.origin === location.origin) {
        const copy = res.clone();
        caches.open(VERSION).then(c => c.put(e.request, copy));
      }
      return res;
    }).catch(() => caches.match(e.request).then(hit => hit || caches.match('/index.html')))
  );
});

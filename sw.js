/* Ad astra · Reprise — Service Worker
   Stratégie : cache-first pour l'app shell, network-first pour le reste (même origine uniquement).
   CACHE_VERSION doit toujours suivre APP_VERSION (app.js) et le titre du README.
   Mise à jour : la nouvelle version s'installe en arrière-plan puis attend ;
   app.js (Updater) propose de relancer l'appli. Pas de skipWaiting automatique. */

const CACHE_VERSION = 'ad-astra-v1.0.0';
const APP_SHELL = [
  './',
  './index.html',
  './app.js',
  './manifest.webmanifest',
  './icon.svg',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
  './apple-touch-icon.png',
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_VERSION).then(cache => cache.addAll(APP_SHELL)));
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;       // jamais d'autre origine

  // Navigation (y compris ?tab=...) : la page de l'appli, depuis le cache en priorité.
  if (req.mode === 'navigate') {
    event.respondWith(
      caches.match('./index.html', { ignoreSearch: true }).then(hit => hit || fetch(req))
    );
    return;
  }

  const inShell = APP_SHELL.some(p => new URL(p, self.location).pathname === url.pathname);
  if (inShell) {
    event.respondWith(caches.match(req).then(hit => hit || fetch(req)));
    return;
  }

  // Reste : réseau d'abord, cache en secours.
  event.respondWith(
    fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE_VERSION).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req))
  );
});

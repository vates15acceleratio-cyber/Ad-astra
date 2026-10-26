/* Ad astra · Reprise — Service Worker
   Stratégie : cache-first pour l'app shell, network-first pour le reste (même origine uniquement).
   CACHE_VERSION doit toujours suivre APP_VERSION (app.js) et le titre du README.
   Mise à jour : la nouvelle version s'installe en arrière-plan puis attend ;
   app.js (Updater) propose de relancer l'appli. Pas de skipWaiting automatique. */

const CACHE_VERSION = 'ad-astra-v1.2.0';
const APP_SHELL = [
  './',
  './index.html',
  './app.js',
  './splash.js',
  './croquis.js',
  './illustrations.js',
  './figure.svg',
  './mark.svg',
  './cinzel-700-latin.woff2',
  './manifest.webmanifest',
  './icon.svg',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
  './apple-touch-icon.png',
];
// Illustrations d'exercices (liste générée par tools/build-illus.js)
const ILLUS_FILES = ["./img/exo/aa-bird-dog-1.webp","./img/exo/aa-bird-dog-2.webp","./img/exo/aa-body-saw-1.webp","./img/exo/aa-body-saw-2.webp","./img/exo/aa-corde-1.webp","./img/exo/aa-corde-2.webp","./img/exo/aa-fente-arriere-1.webp","./img/exo/aa-fente-arriere-2.webp","./img/exo/aa-fente-basse-1.webp","./img/exo/aa-negative-1.webp","./img/exo/aa-negative-2.webp","./img/exo/aa-negative-3.webp","./img/exo/aa-pompes-claquees-1.webp","./img/exo/aa-pompes-claquees-2.webp","./img/exo/aa-releve-genoux-1.webp","./img/exo/aa-releve-genoux-2.webp","./img/exo/aa-squat-profond-1.webp","./img/exo/aa-squat-saute-1.webp","./img/exo/aa-squat-saute-2.webp","./img/exo/aa-suspension-1.webp","./img/exo/ab-deadbug-1.webp","./img/exo/ab-deadbug-2.webp","./img/exo/ab-dragon-1.webp","./img/exo/ab-dragon-2.webp","./img/exo/ab-hollow-1.webp","./img/exo/ab-leg-raise-susp-1.webp","./img/exo/ab-leg-raise-susp-2.webp","./img/exo/ab-russian-1.webp","./img/exo/ab-russian-2.webp","./img/exo/ab-side-plank-1.webp","./img/exo/cal-lsit-1.webp","./img/exo/cal-pistol-1.webp","./img/exo/cal-pistol-2.webp","./img/exo/cal-pistol-assiste-1.webp","./img/exo/cal-pistol-assiste-2.webp","./img/exo/dos-rowing-aus-1.webp","./img/exo/dos-rowing-aus-2.webp","./img/exo/dos-tractions-1.webp","./img/exo/dos-tractions-2.webp","./img/exo/q-fentes-bulg-1.webp","./img/exo/q-fentes-bulg-2.webp"];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_VERSION).then(cache => cache.addAll(APP_SHELL.concat(ILLUS_FILES).map(u => new Request(u, { cache: 'reload' })))));
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

  const inShell = APP_SHELL.concat(ILLUS_FILES).some(p => new URL(p, self.location).pathname === url.pathname);
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

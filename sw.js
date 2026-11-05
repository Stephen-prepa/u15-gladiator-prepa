// Prépa U15 HBCCS — sw.js — dernière modification : version z25 (05/11/2026)
const CACHE_NAME = 'prepa-u15-hbccs-v2';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  // Code de l'application (découpé en fichiers) : chaque fichier DOIT exister, sinon le mode hors-ligne ne s'installe pas
  './css/style.css',
  './js/00-version.js',
  './js/01-audio-voix.js',
  './js/02-etat-supabase.js',
  './js/03-seances-base.js',
  './js/04-moteur-seance.js',
  './js/05-espace-coachs.js',
  './js/06-joueurs-presences.js',
  './js/07-compositions-score.js',
  './js/08-createur-seances.js',
  './js/09-lecture-terrain.js',
  './js/10-types-exercice.js',
  './js/11-schema-modele.js',
  './js/12-editeur-schema-plein-ecran.js',
  './js/13-accueil-coach.js',
  './js/14-schemas-tactiques.js',
  './js/15-editeur-schemas-base.js',
  './js/16-editeur-schemas-outils.js',
  './js/17-stats-evaluations.js',
  './js/18-reglages-affichage.js',
  './js/19-init.js',
  './js/20-espace-joueurs.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Never cache Supabase calls (progression des joueurs) — always go to network
  if (url.hostname.endsWith('.supabase.co')) {
    return;
  }

  // HTML / navigation requests: network-first so updates show up immediately,
  // falling back to cache only when offline.
  // Le code de l'appli (fichiers .js et .css du site) suit la même règle que la page : réseau d'abord,
  // pour qu'une mise à jour soit visible tout de suite et que le vieux code ne reste jamais servi depuis le cache.
  const isAppCode = url.origin === self.location.origin && /\.(js|css)$/.test(url.pathname);
  const isNavigation = event.request.mode === 'navigate' || url.pathname.endsWith('index.html') || url.pathname === '/' || isAppCode;
  if (isNavigation) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse.ok) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return networkResponse;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Autres fichiers (manifest, icônes, images, audio) : cache-first, refresh cache in background
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (event.request.method === 'GET' && networkResponse.ok) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return networkResponse;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    })
  );
});

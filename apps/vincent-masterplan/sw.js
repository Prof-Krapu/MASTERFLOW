const CACHE_NAME = 'masterplan-vincent-v6';
const ASSETS = [
  './',
  './index.html',
  './builder.js',
  './manifest.json',
  './assets/icon-180.png',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './assets/lycee-des-flandres.svg',
  './assets/masterflow-wordmark.svg',
  './assets/profkrapu-avatar.png',
  './assets/student-placeholder-neutral.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
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
  if (event.request.method !== 'GET') return;
  // Ne jamais servir ni mettre en cache /api/ : l'URL contient la clé
  // personnelle Pronote et le planning complet. Passthrough réseau brut.
  if (new URL(event.request.url).pathname.startsWith('/api/')) return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetched = fetch(event.request).then((response) => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => cached);
      return cached || fetched;
    })
  );
});

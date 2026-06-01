/**
 * Service Worker for Laboratorio de Visión Artificial e Interacción
 * Enables fully offline capabilities by caching static assets and MediaPipe webassembly models.
 */

const CACHE_NAME = "vision-lab-v1";
const MEDIAPIPE_CACHE_NAME = "mediapipe-models-v1";

// Assets to cache immediately on installation
const PRECACHE_ASSETS = [
  "/",
  "/index.html",
];

// Install event: cache precached assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[Service Worker] Precaching app shell");
      return cache.addAll(PRECACHE_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate event: clean up outdated caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== MEDIAPIPE_CACHE_NAME) {
            console.log("[Service Worker] Removing old cache:", cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event: handle requests offline
self.addEventListener("fetch", (event) => {
  const requestUrl = new URL(event.request.url);

  // We optimize caching for CDNs (jsDelivr / MediaPipe assets) which are immutable
  const isCDNRequest = requestUrl.hostname.includes("jsdelivr") || requestUrl.pathname.includes("@mediapipe");

  if (isCDNRequest) {
    event.respondWith(
      caches.open(MEDIAPIPE_CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            // Serve from cache immediately for fast offline bootstrap
            return cachedResponse;
          }

          // Otherwise, fetch from network and cache
          return fetch(event.request)
            .then((networkResponse) => {
              if (networkResponse.status === 200) {
                cache.put(event.request, networkResponse.clone());
              }
              return networkResponse;
            })
            .catch((err) => {
              console.warn("[Service Worker] CDN Fetch failed while offline:", err);
              // Fallback to cache if anything happens during network failure
              return caches.match(event.request);
            });
        });
      })
    );
  } else {
    // Stale-while-revalidate / Network-first strategy for local assets (Vite index, scripts, CSS)
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        const fetchPromise = fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse.status === 200) {
              const responseClone = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, responseClone);
              });
            }
            return networkResponse;
          })
          .catch((err) => {
            // Silent network failure while offline (will use cache)
            return null;
          });

        // Return cached version if exists, fallback to network response
        return cachedResponse || fetchPromise;
      })
    );
  }
});

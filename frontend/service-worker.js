const CACHE_NAME = "drivelegal-cache-v2";

const APP_SHELL = [
  "/",
  "/index.html",
  "/styles.css",
  "/app.js",
  "/manifest.json",
  "/js/offline.js",
  "/js/api.js",
];

// INSTALL EVENT
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("Caching App Shell");
      return cache.addAll(APP_SHELL);
    }),
  );

  self.skipWaiting();
});

// ACTIVATE EVENT
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log("Deleting old cache:", cache);
            return caches.delete(cache);
          }
        }),
      );
    }),
  );

  self.clients.claim();
});

// FETCH EVENT
self.addEventListener("fetch", (event) => {
  const request = event.request;

  // API CALLS -> NETWORK FIRST
  if (request.url.includes("/api/")) {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          return caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, networkResponse.clone());
            return networkResponse;
          });
        })
        .catch(() => {
          return caches.match(request);
        }),
    );

    return;
  }

  // STATIC ASSETS -> STALE WHILE REVALIDATE
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, networkResponse.clone());
          });

          return networkResponse;
        })
        .catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    }),
  );
});

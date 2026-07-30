// Minimal offline-fallback service worker for PUBLIC.
// Caches only the branded offline page; steps out of the way of everything else
// (audio, images, fonts) so the app's own IndexedDB/offline handling stays in charge.

const CACHE = "public-offline-v1";
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.add(OFFLINE_URL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  // Only intercept page navigations. When the network fails, show the offline page.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).catch(async () => {
        const cache = await caches.open(CACHE);
        return (await cache.match(OFFLINE_URL)) || Response.error();
      })
    );
  }
});

// Replace the legacy worker so installed clients stop serving the offline page.
self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    await caches.delete("public-offline-v1");
    await self.clients.claim();
  })());
});

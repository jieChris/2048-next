self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      if (typeof caches !== "undefined" && caches.keys) {
        const names = await caches.keys();
        await Promise.all(names.map((name) => caches.delete(name)));
      }
      await self.clients.claim();
      await self.registration.unregister();
    })()
  );
});

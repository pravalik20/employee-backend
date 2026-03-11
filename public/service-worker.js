const CACHE_NAME = "employee-app-v1";

const FILES_TO_CACHE = [
  "/employee-list.html",
  "/cart.html",
  "/admin-login.html",
  "/admin-employees.html",
  "/manifest.json"
];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(FILES_TO_CACHE))
  );
});

self.addEventListener("fetch", e => {
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});
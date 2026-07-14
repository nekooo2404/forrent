const CACHE_NAME = "forrent-static-v3";
const OFFLINE_URL = "/offline";
const PRECACHE = [
  OFFLINE_URL,
  "/brand/forrent-logo.png",
  "/brand/forrent-icon-192.png",
  "/brand/forrent-icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))),
  );
  self.clients.claim();
});

function isPublicNavigation(url) {
  const exact = ["/", "/homepage", "/rooms", "/blogs", "/contact", "/privacy", "/terms", OFFLINE_URL];
  return exact.includes(url.pathname) || url.pathname.startsWith("/rooms/") || url.pathname.startsWith("/blogs/");
}

async function navigationWithOfflineFallback(request) {
  try {
    return await fetch(request);
  } catch {
    return caches.match(OFFLINE_URL);
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) await cache.put(request, response.clone());
  return response;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/") || url.pathname.startsWith("/admin")) return;

  if (request.mode === "navigate" && isPublicNavigation(url)) {
    event.respondWith(navigationWithOfflineFallback(request));
    return;
  }

  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/brand/")) {
    event.respondWith(cacheFirst(request));
  }
});

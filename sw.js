/* SosAvto service worker.
   - API and dynamic server routes are never cached, so listings, logins and prices are always live.
   - Pages: network first, falling back to the last visited copy, then to the offline page.
   - Static assets: served from cache immediately and refreshed in the background. */
const VERSION = 'v1';
const STATIC = 'sosavto-static-' + VERSION;
const PAGES = 'sosavto-pages-' + VERSION;
const OFFLINE_URL = '/assets/offline.html';
const PRECACHE = [OFFLINE_URL, '/assets/icon-192.png', '/assets/icon-512.png', '/assets/favicon.svg'];
const NEVER_CACHE = /^\/(api\/|elan$|sitemap\.xml$|admin\.html$|media\/)/;

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(STATIC).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== STATIC && k !== PAGES).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (NEVER_CACHE.test(url.pathname)) {
    if (request.mode === 'navigate') event.respondWith(fetch(request).catch(offlinePage));
    return;
  }
  if (request.mode === 'navigate') {
    event.respondWith(networkFirstPage(request));
  } else if (url.pathname.startsWith('/assets/')) {
    event.respondWith(staleWhileRevalidate(request));
  }
});

async function offlinePage() {
  return (await caches.match(OFFLINE_URL)) || new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } });
}

async function networkFirstPage(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const copy = response.clone();
      caches.open(PAGES).then((cache) => cache.put(request, copy)).catch(() => {});
    }
    return response;
  } catch (error) {
    return (await caches.match(request)) || offlinePage();
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(STATIC);
  const cached = await cache.match(request);
  const refresh = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => null);
  if (cached) return cached;
  return (await refresh) || new Response('', { status: 504 });
}

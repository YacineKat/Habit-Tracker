// Service Worker for Habit Tracker PWA

const CACHE_NAME = 'habit-tracker-v2.1.0';
const CORE_CACHE_URLS = [
  '/index.html',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js',
];

async function warmCoreCache() {
  const cache = await caches.open(CACHE_NAME);

  await Promise.allSettled(
    CORE_CACHE_URLS.map(async (url) => {
      try {
        await cache.add(url);
      } catch (err) {
        // Ignore warm-up failures for individual resources.
      }
    }),
  );
}

function isCacheableRequest(url) {
  const isChartCdn = url.href.includes('cdn.jsdelivr.net/npm/chart.js');
  const isLocalAsset = url.origin === self.location.origin && url.pathname.startsWith('/assets/');
  const isIndex = url.origin === self.location.origin && url.pathname === '/index.html';

  return isChartCdn || isLocalAsset || isIndex;
}

async function networkFirstNavigation(request) {
  const cache = await caches.open(CACHE_NAME);

  try {
    const response = await fetch(request);
    if (response && response.ok) {
      cache.put('/index.html', response.clone());
    }
    return response;
  } catch (err) {
    const cachedIndex = await cache.match('/index.html');
    if (cachedIndex) return cachedIndex;
    throw err;
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(warmCoreCache());
  self.skipWaiting();
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  const url = new URL(request.url);
  if (!isCacheableRequest(url)) {
    event.respondWith(fetch(request));
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const networkResponse = fetch(request)
        .then((response) => {
          if (response && response.ok) {
            caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone()));
          }
          return response;
        })
        .catch(() => cachedResponse);

      return cachedResponse || networkResponse;
    }),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
          return Promise.resolve();
        }),
      );
    }),
  );

  self.clients.claim();
});
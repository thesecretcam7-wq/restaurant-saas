const CACHE_NAME = 'restaurant-saas-v2';
const STATIC_ASSETS = ['/', '/menu', '/manifest.webmanifest'];

// Install: Cache static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Caching static assets');
        return cache.addAll(STATIC_ASSETS).catch(() => {
          console.log('Some assets could not be cached');
        });
      })
  );
  self.skipWaiting();
});

// Activate: Clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME)
          .map((k) => {
            console.log('Deleting old cache:', k);
            return caches.delete(k);
          })
      )
    )
  );
  self.clients.claim();
});

// Fetch: Network first, fallback to cache
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET requests
  if (request.method !== 'GET') return;

  // Skip cross-origin requests
  if (url.origin !== location.origin) return;

  // Handle API requests differently (network only, with timeout)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      Promise.race([
        fetch(request),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('API timeout')), 5000)
        ),
      ]).catch(() =>
        // caches.match returns a Promise, must await it before fallback
        caches.match(request).then(
          (cached) => cached || new Response('API unavailable', { status: 503 })
        )
      )
    );
    return;
  }

  // For non-API requests: Network first, fall back to cache
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Only cache successful responses
        if (!response || response.status !== 200 || response.type === 'error') {
          return response;
        }

        const clonedResponse = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, clonedResponse);
        });
        return response;
      })
      .catch(() =>
        // caches.match returns a Promise, must await it before fallback
        caches.match(request).then(
          (cached) => cached || new Response('Offline - Page not cached', {
            status: 503,
            statusText: 'Service Unavailable',
          })
        )
      )
  );
});

// Handle messages from client
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

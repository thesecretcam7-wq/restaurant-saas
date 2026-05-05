const CACHE_NAME = 'eccofood-v4';
const STATIC_ASSETS = ['/', '/login', '/register', '/planes', '/manifest.webmanifest'];

function offlinePage() {
  return new Response(`<!doctype html>
    <html lang="es">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Eccofood sin conexion</title>
        <style>
          body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f7f5f0;color:#15130f;font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
          main{max-width:420px;margin:24px;padding:28px;border:1px solid rgba(0,0,0,.1);border-radius:20px;background:white;box-shadow:0 24px 80px rgba(0,0,0,.08)}
          h1{margin:0 0 10px;font-size:26px;line-height:1.05}
          p{margin:0;color:rgba(21,19,15,.65);font-weight:650;line-height:1.55}
          button{margin-top:22px;width:100%;height:46px;border:0;border-radius:12px;background:#e43d30;color:white;font-weight:900;cursor:pointer}
        </style>
      </head>
      <body>
        <main>
          <h1>Sin conexion</h1>
          <p>No pudimos cargar esta pagina ahora. Si estabas intentando iniciar sesion, revisa internet e intenta de nuevo.</p>
          <button onclick="location.reload()">Reintentar</button>
        </main>
      </body>
    </html>`, {
    status: 503,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

function apiUnavailable() {
  return new Response(JSON.stringify({
    error: 'Sin conexion. Revisa internet e intenta de nuevo.',
    offline: true,
  }), {
    status: 503,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

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

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (url.origin !== location.origin) return;

  const isOperationalRoute =
    url.pathname.includes('/admin/') ||
    url.pathname.includes('/staff/pos') ||
    url.pathname.includes('/pos-display') ||
    url.pathname.includes('/kitchen');

  if (request.method !== 'GET') {
    if (url.pathname.startsWith('/api/')) {
      event.respondWith(fetch(request).catch(() => apiUnavailable()));
    }
    return;
  }

  if (url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(request).catch(() => apiUnavailable()));
    return;
  }

  if (isOperationalRoute) {
    event.respondWith(fetch(request).catch(() => offlinePage()));
    return;
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (!response || response.status !== 200 || response.type === 'error') {
          return response;
        }

        const responseForRequestCache = response.clone();
        const responseForPathCache = request.mode === 'navigate' ? response.clone() : null;
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, responseForRequestCache);
          if (responseForPathCache) {
            cache.put(url.pathname, responseForPathCache);
          }
        });
        return response;
      })
      .catch(() =>
        caches.match(request, { ignoreSearch: true }).then(
          (cached) => cached || caches.match(url.pathname).then((pathCached) => pathCached || offlinePage())
        )
      )
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

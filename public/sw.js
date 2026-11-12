const CACHE_NAME = 'eccofood-v23';
const CACHE_PREFIX = 'eccofood-';
const NETWORK_TIMEOUT_MS = 3500;

// Compatibility for already-open terminals: intercept their former anonymous
// cart calls and use the same authenticated API as the updated application.
const legacyCartScopes = new Map();
async function bridgeLegacyCart(request) {
  const url = new URL(request.url);
  const eq = key => { const value = url.searchParams.get(key) || ''; return value.startsWith('eq.') ? value.slice(3) : ''; };
  const id = eq('id');
  const remembered = id && legacyCartScopes.get(id);
  let tenantId = eq('tenant_id') || (remembered && remembered.tenantId);
  let sessionId = eq('cart_session_id') || (remembered && remembered.sessionId);
  let payload;
  if (!['GET','HEAD','POST','PATCH'].includes(request.method)) return Response.json({code:'42501',message:'Operación no permitida'},{status:403});
  try {
    if (request.method === 'POST' || request.method === 'PATCH') {
      payload = await request.clone().json();
      if (Array.isArray(payload)) { if (payload.length !== 1) throw new Error('Invalid cart'); payload = payload[0]; }
      tenantId = tenantId || payload.tenant_id;
      sessionId = sessionId || payload.cart_session_id;
    }
    if (!tenantId || ((request.method !== 'GET' && request.method !== 'HEAD') && !sessionId)) return Response.json({code:'42501',message:'Recarga el TPV para actualizar el carrito. La cuenta local se conserva.'},{status:409});
    const display = !sessionId && (request.method === 'GET' || request.method === 'HEAD');
    const params = new URLSearchParams({tenantId});
    if (sessionId) params.set('sessionId',sessionId);
    const reading = request.method === 'GET' || request.method === 'HEAD';
    const endpoint = '/api/pos/cart' + (display ? '/display' : '') + (reading ? '?' + params : '');
    const response = await fetch(new URL(endpoint,location.origin), {
      method: reading ? 'GET' : request.method,credentials:'same-origin',cache:'no-store',signal:request.signal,
      ...(!reading ? {headers:{'Content-Type':'application/json'},body:JSON.stringify({tenantId,sessionId,cartId:id||undefined,action:payload.abandoned_at?'clear':'save',cart:payload})} : {}),
    });
    const result = await response.json();
    if (!response.ok) return Response.json({code:response.status===401||response.status===403?'42501':'CART_UNAVAILABLE',message:result.error || 'No se pudo sincronizar el carrito'}, {status:response.status});
    let cart = result.cart;
    if (cart && cart.id && tenantId && sessionId) {
      legacyCartScopes.set(cart.id,{tenantId,sessionId});
      if (legacyCartScopes.size>256) legacyCartScopes.delete(legacyCartScopes.keys().next().value);
    }
    if (request.method==='HEAD' || (!reading && !(request.headers.get('prefer')||'').includes('return=representation'))) return new Response(null,{status:request.method==='HEAD'?200:204});
    const select=url.searchParams.get('select');
    if(cart && select && select!=='*')cart=Object.fromEntries(select.split(',').filter(key=>Object.hasOwn(cart,key)).map(key=>[key,cart[key]]));
    const single=(request.headers.get('accept')||'').includes('vnd.pgrst.object');
    return Response.json(single?cart:cart?[cart]:[],{headers:{'Cache-Control':'private, no-store'}});
  } catch { return Response.json({code:'CART_UNAVAILABLE',message:'Sin conexión. La cuenta local se conserva.'},{status:503}); }
}
const STATIC_ASSETS = [
  '/favicon.ico',
  '/icons/icon.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/apple-touch-icon.png',
];

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

function cacheSuccessfulResponse(request, response) {
  if (!response || response.status !== 200 || response.type === 'error') return response;

  try {
    const responseForRequestCache = response.clone();
    const url = new URL(request.url);
    const responseForPathCache = request.mode === 'navigate' ? response.clone() : null;

    caches.open(CACHE_NAME).then((cache) => {
      cache.put(request, responseForRequestCache).catch(() => {});
      if (responseForPathCache) {
        cache.put(url.pathname, responseForPathCache).catch(() => {});
      }
    }).catch(() => {});
  } catch (error) {
    console.warn('Skipping cache because response could not be cloned', error);
  }

  return response;
}

function matchInEccofoodCaches(request, options) {
  return caches.match(request, options).then((matched) => {
    if (matched) return matched;

    return caches.keys().then((keys) => {
      const eccofoodKeys = keys.filter((key) => key.indexOf(CACHE_PREFIX) === 0 && key !== CACHE_NAME);
      return eccofoodKeys.reduce(
        (chain, key) =>
          chain.then((previous) => {
            if (previous) return previous;
            return caches.open(key).then((cache) => cache.match(request, options));
          }),
        Promise.resolve(undefined)
      );
    });
  });
}

function cachedResponseOrOffline(request) {
  const url = new URL(request.url);
  return matchInEccofoodCaches(request, { ignoreSearch: true }).then((cached) => {
    if (cached) return cached;
    return matchInEccofoodCaches(url.pathname).then((pathCached) => pathCached || offlinePage());
  });
}

function cacheFirst(request) {
  return matchInEccofoodCaches(request, { ignoreSearch: true }).then((cached) => {
    if (cached) return cached;
    return fetch(request).then((response) => cacheSuccessfulResponse(request, response));
  });
}

function fetchWithTimeout(request, timeoutMs = NETWORK_TIMEOUT_MS) {
  if (typeof AbortController === 'undefined') return fetch(request);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  return fetch(request, { signal: controller.signal }).finally(() => {
    clearTimeout(timeout);
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
          .filter((key) => key.indexOf(CACHE_PREFIX) === 0 && key !== CACHE_NAME && key !== 'eccofood-v22')
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (url.origin === 'https://csdooyggiuhzovehykna.supabase.co' && url.pathname === '/rest/v1/pos_carts') {
    event.respondWith(bridgeLegacyCart(request));
    return;
  }
  if (url.origin !== location.origin) return;

  const isLocalDevelopment =
    (location.hostname === 'localhost' || location.hostname === '127.0.0.1') &&
    location.port === '3000';

  if (isLocalDevelopment) {
    event.respondWith(fetch(request));
    return;
  }

  const isAuthRoute =
    url.pathname.startsWith('/api/auth/') ||
    url.pathname.endsWith('/acceso') ||
    url.pathname.includes('/acceso/') ||
    url.pathname.endsWith('/admin/login') ||
    url.pathname === '/owner-login' ||
    url.pathname === '/login' ||
    url.pathname === '/register';

  // Login/register must always go straight to the server. A stale service worker
  // should never turn credentials into a fake 503/offline response.
  if (isAuthRoute) return;

  const isOperationalRoute =
    url.pathname.includes('/admin/') ||
    url.pathname.includes('/staff/pos') ||
    url.pathname.includes('/pos-display') ||
    url.pathname.includes('/kitchen') ||
    url.pathname.includes('/kiosko');

  if (request.method !== 'GET') {
    return;
  }

  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(cacheFirst(request));
    return;
  }

  const isPwaIdentityAsset =
    url.pathname.endsWith('/manifest.webmanifest') ||
    url.pathname.endsWith('/apple-touch-icon.png') ||
    url.pathname.endsWith('/icon-192.png') ||
    url.pathname.endsWith('/icon-512.png');

  if (isPwaIdentityAsset) {
    event.respondWith(
      fetch(request)
        .then((response) => cacheSuccessfulResponse(request, response))
        .catch(() => matchInEccofoodCaches(request, { ignoreSearch: true }))
    );
    return;
  }

  // Private admin documents and RSC payloads must not be restored from stale
  // caches: they may contain expired sessions and another user's financial data.
  if (url.pathname.includes('/admin/')) {
    event.respondWith(
      (self.navigator.onLine === false ? Promise.reject(new Error('offline')) : fetchWithTimeout(request, 15000))
        .catch(() => request.mode === 'navigate' ? offlinePage() : apiUnavailable())
    );
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetchWithTimeout(request)
        .then((response) => cacheSuccessfulResponse(request, response))
        .catch(() => cachedResponseOrOffline(request))
    );
    return;
  }

  if (url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(request));
    return;
  }

  if (isOperationalRoute) {
    event.respondWith(
      fetchWithTimeout(request)
        .then((response) => cacheSuccessfulResponse(request, response))
        .catch(() => cachedResponseOrOffline(request))
    );
    return;
  }

  event.respondWith(
    fetchWithTimeout(request)
      .then((response) => {
        if (!response || response.status !== 200 || response.type === 'error') {
          return response;
        }

        return cacheSuccessfulResponse(request, response);
      })
      .catch(() => cachedResponseOrOffline(request))
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {};
  }

  const title = data.title || 'Pedido listo';
  const targetUrl = data.url || '/';
  const options = {
    body: data.body || 'Hay productos listos para entregar.',
    icon: data.icon || '/icons/icon-192.png',
    badge: data.badge || '/icons/icon-192.png',
    tag: data.tag || 'eccofood-service-ready',
    renotify: true,
    requireInteraction: true,
    vibrate: [180, 70, 180, 70, 260],
    data: {
      url: targetUrl,
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = new URL(event.notification.data?.url || '/', self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client && client.url === targetUrl) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
      return undefined;
    })
  );
});

// A deliberately small adapter: cart helpers keep their existing semantics,
// but browsers can only reach the authorized cart API, never the database table.
export function createPOSCartClient() {
  return {
    from(table: string) {
      if (table !== 'pos_carts') throw new Error('Unsupported cart table')
      const filters: Record<string, unknown> = {}
      let method = 'GET', payload: any, single = false
      const q: any = {
        select() { return q }, eq(key: string, value: unknown) { filters[key] = value; return q },
        is() { return q }, order() { return q }, limit() { return q },
        insert(value: any) { method = 'POST'; payload = value; return q },
        update(value: any) { method = 'PATCH'; payload = value; return q },
        maybeSingle() { single = true; return q },
        then(resolve: any, reject: any) {
          return (async () => {
            const tenantId = filters.tenant_id || payload?.tenant_id
            const sessionId = filters.cart_session_id || payload?.cart_session_id
            const params = new URLSearchParams({ tenantId: String(tenantId || ''), sessionId: String(sessionId || '') })
            const response = await fetch('/api/pos/cart' + (method === 'GET' ? '?' + params : ''), {
              method, credentials: 'same-origin', cache: 'no-store', signal: AbortSignal.timeout(8000),
              ...(method !== 'GET' ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
                tenantId, sessionId, cartId: filters.id, action: payload?.abandoned_at ? 'clear' : 'save', cart: payload,
              }) } : {}),
            })
            const result = await response.json()
            if (!response.ok) {
              if (response.status === 401 && typeof window !== 'undefined') window.dispatchEvent(new Event('eccofood:cart-auth-required'))
              return { data: null, error: { message: result.error || 'No se pudo sincronizar el carrito', status: response.status } }
            }
            if (method !== 'GET') notifyLocalDisplay(String(tenantId), String(sessionId))
            return { data: single ? result.cart : result.cart ? [result.cart] : [], error: null }
          })().then(resolve, reject)
        },
      }
      return q
    },
  }
}
export function notifyLocalDisplay(tenantId: string, sessionId: string) {
  if (typeof BroadcastChannel === 'undefined') return
  const channel = new BroadcastChannel('eccofood-cart:' + tenantId + ':' + sessionId)
  channel.postMessage({ type: 'changed' }); channel.close()
}

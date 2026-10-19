import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { describe, expect, it, vi } from 'vitest'

function worker(online: boolean, fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response('fresh'))) {
  const listeners = new Map<string, (event: unknown) => void>()
  const cacheMatch = vi.fn().mockResolvedValue(new Response('stale-private-page'))
  runInNewContext(readFileSync('public/sw.js', 'utf8'), {
    self: { navigator: { onLine: online }, addEventListener: (name: string, callback: (event: unknown) => void) => listeners.set(name, callback) },
    location: { origin: 'https://app.test', hostname: 'app.test', port: '' },
    caches: { match: cacheMatch }, fetch: fetcher, URL, Response, AbortController, setTimeout, clearTimeout, console,
  })
  return {
    fetcher, cacheMatch,
    async request(mode: string) {
      let response: Promise<Response> | undefined
      listeners.get('fetch')!({
        request: { url: 'https://app.test/cafebarelcruce/admin/dashboard', mode, method: 'GET' },
        respondWith: (value: Promise<Response>) => { response = value },
      })
      return response!
    },
  }
}

describe('private admin pages in the service worker', () => {
  it('does not restore a cached dashboard or contact the server offline', async () => {
    const sw = worker(false)
    const response = await sw.request('navigate')
    expect(response.status).toBe(503)
    expect(await response.text()).toContain('Sin conexion')
    expect(sw.fetcher).not.toHaveBeenCalled()
    expect(sw.cacheMatch).not.toHaveBeenCalled()
  })

  it('returns JSON, never old HTML, for an offline RSC request', async () => {
    const sw = worker(false)
    const response = await sw.request('cors')
    expect(await response.json()).toMatchObject({ offline: true })
    expect(sw.cacheMatch).not.toHaveBeenCalled()
  })

  it('fetches a fresh dashboard online without caching private data', async () => {
    const sw = worker(true)
    expect(await (await sw.request('navigate')).text()).toBe('fresh')
    expect(sw.fetcher).toHaveBeenCalledTimes(1)
    expect(sw.cacheMatch).not.toHaveBeenCalled()
  })
})

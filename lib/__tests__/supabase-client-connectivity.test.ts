import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { browserFactory, startRefresh, stopRefresh } = vi.hoisted(() => {
  const startRefresh = vi.fn().mockResolvedValue(undefined)
  const stopRefresh = vi.fn().mockResolvedValue(undefined)
  return {
    startRefresh, stopRefresh,
    browserFactory: vi.fn(() => ({ auth: { startAutoRefresh: startRefresh, stopAutoRefresh: stopRefresh } })),
  }
})

vi.mock('@supabase/ssr', () => ({ createBrowserClient: browserFactory }))

beforeEach(() => {
  vi.resetModules()
  vi.clearAllMocks()
})

afterEach(() => vi.unstubAllGlobals())

describe('browser session refresh lifecycle', () => {
  it('keeps one client and pauses refresh offline and in hidden tabs', async () => {
    const browser = new EventTarget()
    const documentState = Object.assign(new EventTarget(), { visibilityState: 'visible' })
    const networkState = { onLine: false }
    vi.stubGlobal('window', browser)
    vi.stubGlobal('document', documentState)
    vi.stubGlobal('navigator', networkState)
    const { createClient } = await import('../supabase/client')

    expect(createClient()).toBe(createClient())
    expect(browserFactory).toHaveBeenCalledTimes(1)
    expect(browserFactory.mock.calls[0]).toEqual(expect.arrayContaining([
      expect.objectContaining({ auth: { autoRefreshToken: false } }),
    ]))
    expect(startRefresh).not.toHaveBeenCalled()
    expect(stopRefresh).toHaveBeenCalledTimes(1)

    networkState.onLine = true
    browser.dispatchEvent(new Event('online'))
    expect(startRefresh).toHaveBeenCalledTimes(1)
    documentState.visibilityState = 'hidden'
    documentState.dispatchEvent(new Event('visibilitychange'))
    expect(stopRefresh).toHaveBeenCalledTimes(2)
    documentState.visibilityState = 'visible'
    documentState.dispatchEvent(new Event('visibilitychange'))
    expect(startRefresh).toHaveBeenCalledTimes(2)
    networkState.onLine = false
    browser.dispatchEvent(new Event('offline'))
    expect(stopRefresh).toHaveBeenCalledTimes(3)
  })

  it('does not start browser refresh timers during server rendering', async () => {
    vi.stubGlobal('window', undefined)
    const { createClient } = await import('../supabase/client')
    createClient()
    expect(browserFactory.mock.calls[0]).toEqual(expect.arrayContaining([
      expect.objectContaining({ auth: { autoRefreshToken: false } }),
    ]))
    expect(startRefresh).not.toHaveBeenCalled()
  })
})

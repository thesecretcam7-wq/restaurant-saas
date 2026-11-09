import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

beforeEach(() => { vi.resetModules(); vi.useFakeTimers() })
afterEach(() => vi.useRealTimers())

describe('one navigation loading state', () => {
  it('keeps the loader active through a route-to-client-data handoff and overlapping page requests', async () => {
    const state = await import('../navigation-loading')
    state.beginNavigationLoading()
    const routeDone = state.retainPageLoading()
    state.finishNavigationLoading()
    const dataDone = state.retainPageLoading()
    routeDone()
    expect(state.getNavigationLoadingSnapshot()).toBe(true)
    dataDone()
    expect(state.getNavigationLoadingSnapshot()).toBe(false)
  })

  it('expires an abandoned navigation without cancelling a page still loading', async () => {
    const state = await import('../navigation-loading')
    state.beginNavigationLoading()
    const dataDone = state.retainPageLoading()
    await vi.advanceTimersByTimeAsync(12001)
    expect(state.getNavigationLoadingSnapshot()).toBe(true)
    dataDone()
    expect(state.getNavigationLoadingSnapshot()).toBe(false)
  })

  it('restarts the navigation timeout for a second destination and tolerates duplicate cleanup', async () => {
    const state = await import('../navigation-loading')
    state.beginNavigationLoading()
    await vi.advanceTimersByTimeAsync(11000)
    state.beginNavigationLoading()
    const done = state.retainPageLoading()
    done(); done()
    await vi.advanceTimersByTimeAsync(2000)
    expect(state.getNavigationLoadingSnapshot()).toBe(true)
    state.finishNavigationLoading()
    expect(state.getNavigationLoadingSnapshot()).toBe(false)
  })
})

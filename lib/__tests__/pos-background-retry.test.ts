import { describe, expect, it } from 'vitest'
import { createPOSBackgroundRetry } from '../pos-background-retry'

describe('POS background upload retries', () => {
  it('contains new sales and focus events during failure backoff, then retries', () => {
    let time = 0
    const retry = createPOSBackgroundRetry(() => time)
    for (const delay of [15_000, 30_000, 60_000, 120_000, 120_000]) {
      expect(retry.begin()).toBe(true)
      expect(retry.begin(true)).toBe(false)
      retry.complete(false)
      time += delay - 1
      for (let i = 0; i < 50; i++) expect(retry.begin()).toBe(false)
      time++
    }
    expect(retry.begin()).toBe(true)
    retry.complete(true)
    expect(retry.begin()).toBe(true)
    retry.complete(false)
    time += 15_000
    expect(retry.begin()).toBe(true)
  })

  it('permits a manual retry without permitting concurrent uploads', () => {
    const retry = createPOSBackgroundRetry(() => 0)
    expect(retry.begin()).toBe(true)
    retry.complete(false)
    expect(retry.begin()).toBe(false)
    expect(retry.begin(true)).toBe(true)
    expect(retry.begin(true)).toBe(false)
    retry.complete(true)
    expect(retry.begin()).toBe(true)
  })
})

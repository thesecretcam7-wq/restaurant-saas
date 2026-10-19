import { describe, expect, it } from 'vitest'
import { createRefreshGate } from '../refresh-gate'

const visibleOnline = { online: true, visible: true }

describe('refreshing an old admin screen', () => {
  it('refreshes a restored stale screen once for simultaneous return events', () => {
    const gate = createRefreshGate(1_000, () => 60_000)
    expect(gate.begin(visibleOnline)).toBe(true)
    expect(gate.begin(visibleOnline)).toBe(false)
    expect(gate.begin({ ...visibleOnline, force: true })).toBe(false)
    gate.complete(true)
    expect(gate.begin(visibleOnline)).toBe(false)
  })

  it('does not immediately fetch a freshly rendered page twice', () => {
    const gate = createRefreshGate(55_000, () => 60_000)
    expect(gate.begin(visibleOnline)).toBe(false)
    expect(gate.begin({ ...visibleOnline, force: true })).toBe(true)
  })

  it('waits for internet and a visible screen without interrupting editing', () => {
    const gate = createRefreshGate(1_000, () => 60_000)
    expect(gate.begin({ online: false, visible: true })).toBe(false)
    expect(gate.begin({ online: true, visible: false })).toBe(false)
    expect(gate.begin({ ...visibleOnline, editing: true })).toBe(false)
    expect(gate.begin(visibleOnline)).toBe(true)
  })

  it('backs off after a failed refresh while permitting an explicit retry', () => {
    let time = 60_000
    const gate = createRefreshGate(1_000, () => time)
    expect(gate.begin(visibleOnline)).toBe(true)
    gate.complete(false)
    time = 90_000
    expect(gate.begin(visibleOnline)).toBe(false)
    expect(gate.begin({ ...visibleOnline, force: true })).toBe(true)
    gate.complete(false)
    time = 150_000
    expect(gate.begin(visibleOnline)).toBe(true)
  })
})

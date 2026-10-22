import { describe, expect, it } from 'vitest'
import { getPOSProductLayout } from '../pos-product-layout'

describe('adaptive POS product layout', () => {
  it.each([[620, 350], [980, 525], [1400, 760], [285, 125], [480, 280], [1800, 1800]])(
    'fits complete rows and columns inside %i x %i without unused horizontal space', (width, height) => {
      const layout = getPOSProductLayout(width, height)
      const usedHeight = layout.rows * layout.rowHeight + (layout.rows - 1) * layout.gap
      expect(usedHeight).toBeCloseTo(height, 6)
      expect(layout.rowHeight).toBeGreaterThanOrEqual(112)
      const columnWidth = (width - layout.gap * (layout.columns - 1)) / layout.columns
      expect(columnWidth).toBeGreaterThanOrEqual(150)
      expect(usedHeight + layout.gap).toBeGreaterThan(height)
    },
  )

  it('reduces columns instead of overflowing a narrow viewport', () => {
    expect(getPOSProductLayout(130, 280).columns).toBe(1)
    expect(getPOSProductLayout(620, 350).columns).toBe(3)
    expect(getPOSProductLayout(980, 350).columns).toBe(6)
  })

  it('keeps a usable card size when the viewport is temporarily hidden or too short', () => {
    expect(getPOSProductLayout(0, 0)).toMatchObject({ columns: 1, rows: 1, rowHeight: 112 })
    expect(getPOSProductLayout(400, 60).rowHeight).toBe(112)
  })

  it('preserves the larger grid spacing in the non-compact mode', () => {
    const layout = getPOSProductLayout(700, 420, false)
    expect(layout).toMatchObject({ gap: 12, columns: 4 })
    expect(layout.rows * layout.rowHeight + (layout.rows - 1) * layout.gap).toBe(420)
  })
})

'use client'

import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { getPOSProductLayout } from '@/lib/pos-product-layout'

export function POSProductGrid({ children, className, compact = true }: {
  children: ReactNode
  className?: string
  compact?: boolean
}) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const [layout, setLayout] = useState(() => getPOSProductLayout(0, 126, compact))

  useLayoutEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) return
    const grid = viewport.querySelector<HTMLDivElement>('.pos-product-grid')
    if (!grid) return
    let frame = 0
    const measure = () => {
      const style = getComputedStyle(viewport)
      const width = viewport.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight)
      const height = viewport.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom)
      if (width <= 0 || height <= 0) return
      viewport.style.scrollPaddingBlock = `${style.paddingTop} ${style.paddingBottom}`
      // Keep the entire name and price visible, reserving space above them
      // for the quantity badge. Measure actual wrapping at this column width.
      let contentHeight = 112
      for (const card of Array.from(grid.children)) {
        const name = card.querySelector<HTMLElement>('.pos-product-card-name, .pos-product-card-name-on-image')
        const price = card.querySelector<HTMLElement>('.pos-product-card-price, .pos-product-card-price-on-image')
        if (!name || !price) continue
        const nameStyle = getComputedStyle(name)
        const priceStyle = getComputedStyle(price)
        contentHeight = Math.max(contentHeight, Math.ceil(
          name.getBoundingClientRect().height + price.getBoundingClientRect().height
          + (parseFloat(nameStyle.marginBottom) || 0) + (parseFloat(priceStyle.marginBottom) || 0) + 32
        ))
      }
      const next = getPOSProductLayout(width, height, compact, contentHeight)
      setLayout(previous => previous.columns === next.columns && previous.rowHeight === next.rowHeight
        && previous.gap === next.gap ? previous : next)
    }
    const scheduleMeasure = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(measure)
    }
    measure()
    const observer = new ResizeObserver(scheduleMeasure)
    observer.observe(viewport)
    const productsObserver = new MutationObserver(scheduleMeasure)
    productsObserver.observe(grid, { childList: true, subtree: true, characterData: true })
    document.fonts?.addEventListener('loadingdone', scheduleMeasure)
    return () => {
      observer.disconnect()
      productsObserver.disconnect()
      document.fonts?.removeEventListener('loadingdone', scheduleMeasure)
      cancelAnimationFrame(frame)
    }
  }, [compact, layout.columns])

  return (
    <div ref={viewportRef} className={`pos-product-viewport ${className || ''}`}>
      <div className="pos-product-grid" style={{
        display: 'grid', gap: layout.gap,
        gridTemplateColumns: `repeat(${layout.columns}, minmax(0, 1fr))`,
        gridAutoRows: layout.rowHeight,
      }}>
        {children}
      </div>
    </div>
  )
}

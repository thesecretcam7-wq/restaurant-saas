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
    const measure = () => {
      const style = getComputedStyle(viewport)
      const width = viewport.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight)
      const height = viewport.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom)
      if (width <= 0 || height <= 0) return
      viewport.style.scrollPaddingBlock = `${style.paddingTop} ${style.paddingBottom}`
      const next = getPOSProductLayout(width, height, compact)
      setLayout(previous => previous.columns === next.columns && previous.rowHeight === next.rowHeight
        && previous.gap === next.gap ? previous : next)
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(viewport)
    return () => observer.disconnect()
  }, [compact])

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

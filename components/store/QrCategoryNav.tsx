'use client'

import { useEffect, useState } from 'react'

interface Category {
  id: string
  name: string
}

interface QrCategoryNavProps {
  categories: Category[]
  showFeatured: boolean
  featuredLabel: string
  activeColor: string
  activeTextColor: string
  inactiveColor: string
  inactiveTextColor: string
  borderColor: string
}

export default function QrCategoryNav({
  categories,
  showFeatured,
  featuredLabel,
  activeColor,
  activeTextColor,
  inactiveColor,
  inactiveTextColor,
  borderColor,
}: QrCategoryNavProps) {
  const [activeId, setActiveId] = useState(showFeatured ? 'destacados' : categories[0]?.id || '')

  useEffect(() => {
    const syncFromHash = () => {
      const hash = window.location.hash.replace('#', '')
      if (hash === 'destacados') {
        setActiveId('destacados')
        return
      }
      if (hash.startsWith('cat-')) {
        setActiveId(hash.replace('cat-', ''))
        return
      }
      setActiveId(showFeatured ? 'destacados' : categories[0]?.id || '')
    }

    syncFromHash()
    window.addEventListener('hashchange', syncFromHash)
    return () => window.removeEventListener('hashchange', syncFromHash)
  }, [categories, showFeatured])

  const chipStyle = (id: string) => {
    const active = activeId === id
    return {
      backgroundColor: active ? activeColor : inactiveColor,
      borderColor: active ? activeColor : borderColor,
      color: active ? activeTextColor : inactiveTextColor,
    }
  }

  return (
    <nav className="mx-auto flex max-w-3xl snap-x gap-2 overflow-x-auto px-3 pb-3 scrollbar-hide sm:px-4">
      {showFeatured && (
        <a
          href="#destacados"
          onClick={() => setActiveId('destacados')}
          className="h-10 flex-shrink-0 snap-start rounded-full border px-4 py-2.5 text-xs font-black shadow-sm transition active:scale-[0.98] sm:px-5"
          style={chipStyle('destacados')}
        >
          {featuredLabel}
        </a>
      )}
      {categories.map(category => (
        <a
          key={category.id}
          href={`#cat-${category.id}`}
          onClick={() => setActiveId(category.id)}
          className="h-10 flex-shrink-0 snap-start rounded-full border px-4 py-2.5 text-xs font-black shadow-sm transition active:scale-[0.98] sm:px-5"
          style={chipStyle(category.id)}
        >
          {category.name}
        </a>
      ))}
    </nav>
  )
}

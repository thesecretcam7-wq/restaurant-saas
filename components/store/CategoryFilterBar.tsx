'use client'

import { useState, useCallback } from 'react'

interface Category {
  id: string
  name: string
}

interface CategoryFilterBarProps {
  categories: Category[]
  primary: string
  activeTextColor?: string
  inactiveTextColor?: string
  borderColor?: string
  inactiveColor?: string
  btnCls: string
}

export default function CategoryFilterBar({
  categories,
  primary,
  activeTextColor = 'white',
  inactiveTextColor,
  borderColor,
  inactiveColor = '#f3f4f6',
  btnCls,
}: CategoryFilterBarProps) {
  const [activeCatId, setActiveCatId] = useState<string | null>(null)

  if (categories.length === 0) return null

  const handleShowAll = useCallback(() => {
    setActiveCatId(null)
    const featured = document.querySelector('[data-featured]') as HTMLElement | null
    const allSections = document.querySelectorAll('main > section') as NodeListOf<HTMLElement>
    if (featured) featured.style.display = 'block'
    allSections.forEach(s => (s.style.display = 'block'))
    window.scrollTo({ top: 0 })
  }, [])

  const handleShowCategory = useCallback((catId: string) => {
    setActiveCatId(catId)
    const featured = document.querySelector('[data-featured]') as HTMLElement | null
    const selectedSection = document.querySelector(`#cat-${catId}`) as HTMLElement | null
    const allSections = document.querySelectorAll('main > section') as NodeListOf<HTMLElement>

    if (featured) featured.style.display = 'none'
    allSections.forEach(s => {
      s.style.display = s.id === `cat-${catId}` ? 'block' : 'none'
    })
    if (selectedSection) selectedSection.scrollIntoView({ block: 'start' })
  }, [])

  return (
    <div className="mx-auto flex max-w-7xl snap-x gap-2 overflow-x-auto border-t border-black/[0.04] bg-white/95 px-3 py-2.5 scrollbar-hide sm:px-6 sm:py-3 lg:px-8">
      <button
        onClick={handleShowAll}
        className={`h-10 snap-start whitespace-nowrap border px-4 text-xs font-black shadow-sm transition active:scale-[0.98] sm:px-5 sm:hover:-translate-y-0.5 ${btnCls}`}
        style={{
          backgroundColor: activeCatId === null ? primary : inactiveColor,
          color: activeCatId === null ? activeTextColor : inactiveTextColor || primary,
          borderColor: activeCatId === null ? primary : borderColor || `${primary}40`,
        }}
      >
        Todo
      </button>
      {categories.map(cat => (
        <button
          key={cat.id}
          onClick={() => handleShowCategory(cat.id)}
          className={`h-10 snap-start whitespace-nowrap border px-4 text-xs font-black shadow-sm transition active:scale-[0.98] sm:px-5 sm:hover:-translate-y-0.5 ${btnCls}`}
          style={{
            backgroundColor: activeCatId === cat.id ? primary : inactiveColor,
            color: activeCatId === cat.id ? activeTextColor : inactiveTextColor || primary,
            borderColor: activeCatId === cat.id ? primary : borderColor || `${primary}40`,
          }}
        >
          {cat.name}
        </button>
      ))}
    </div>
  )
}

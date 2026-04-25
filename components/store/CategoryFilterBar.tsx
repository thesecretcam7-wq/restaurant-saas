'use client'

import { useState, useCallback } from 'react'

interface Category {
  id: string
  name: string
}

interface CategoryFilterBarProps {
  categories: Category[]
  primary: string
  btnCls: string
}

export default function CategoryFilterBar({ categories, primary, btnCls }: CategoryFilterBarProps) {
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
    <div className="max-w-lg mx-auto flex gap-2 px-4 pb-4 overflow-x-auto scrollbar-hide border-b border-gray-100">
      <button
        onClick={handleShowAll}
        className={`px-4 py-2 text-xs font-bold whitespace-nowrap border transition-colors ${btnCls}`}
        style={{
          backgroundColor: activeCatId === null ? primary : 'white',
          color: activeCatId === null ? 'white' : primary,
          borderColor: activeCatId === null ? primary : `${primary}40`,
        }}
      >
        Todo
      </button>
      {categories.map(cat => (
        <button
          key={cat.id}
          onClick={() => handleShowCategory(cat.id)}
          className={`px-4 py-2 text-xs font-semibold whitespace-nowrap border transition-colors ${btnCls}`}
          style={{
            backgroundColor: activeCatId === cat.id ? primary : 'white',
            color: activeCatId === cat.id ? 'white' : primary,
            borderColor: activeCatId === cat.id ? primary : `${primary}40`,
          }}
        >
          {cat.name}
        </button>
      ))}
    </div>
  )
}

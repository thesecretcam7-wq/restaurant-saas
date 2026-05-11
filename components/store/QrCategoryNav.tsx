'use client'

import { useEffect, useRef, useState } from 'react'

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
  const navRef = useRef<HTMLElement | null>(null)

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

  useEffect(() => {
    const sectionIds = [
      ...(showFeatured ? ['destacados'] : []),
      ...categories.map(category => `cat-${category.id}`),
    ]
    const sections = sectionIds
      .map(id => document.getElementById(id))
      .filter((section): section is HTMLElement => Boolean(section))

    if (!sections.length) return

    const observer = new IntersectionObserver(
      entries => {
        const visible = entries
          .filter(entry => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]

        if (!visible?.target?.id) return
        setActiveId(visible.target.id === 'destacados' ? 'destacados' : visible.target.id.replace('cat-', ''))
      },
      {
        root: null,
        rootMargin: '-112px 0px -58% 0px',
        threshold: [0.16, 0.28, 0.42, 0.6],
      }
    )

    sections.forEach(section => observer.observe(section))
    return () => observer.disconnect()
  }, [categories, showFeatured])

  useEffect(() => {
    const activeChip = navRef.current?.querySelector(`[data-chip-id="${activeId}"]`) as HTMLElement | null
    activeChip?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
  }, [activeId])

  const chipStyle = (id: string) => {
    const active = activeId === id
    return {
      backgroundColor: active ? activeColor : inactiveColor,
      borderColor: active ? activeColor : borderColor,
      color: active ? activeTextColor : inactiveTextColor,
    }
  }

  return (
    <nav ref={navRef} className="mx-auto flex max-w-3xl snap-x gap-2 overflow-x-auto px-3 pb-3 scrollbar-hide sm:px-4">
      {showFeatured && (
        <a
          data-chip-id="destacados"
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
          data-chip-id={category.id}
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

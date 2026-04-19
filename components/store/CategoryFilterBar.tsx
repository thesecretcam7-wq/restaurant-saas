'use client'

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
  if (categories.length === 0) return null

  const showAll = () => {
    const allSections = document.querySelectorAll('main > section')
    const featured = document.querySelector('[data-featured]') as HTMLElement | null
    if (featured) featured.style.display = 'block'
    allSections.forEach(s => (s as HTMLElement).style.display = 'block')
    updateButtons(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const showCategory = (catId: string) => {
    const allSections = document.querySelectorAll('main > section')
    const featured = document.querySelector('[data-featured]') as HTMLElement | null
    const selectedSection = document.querySelector(`#cat-${catId}`) as HTMLElement | null
    if (featured) featured.style.display = 'none'
    allSections.forEach(s => (s as HTMLElement).style.display = 'none')
    if (selectedSection) {
      selectedSection.style.display = 'block'
      selectedSection.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
    updateButtons(catId)
  }

  const updateButtons = (activeCatId: string | null) => {
    const allBtn = document.querySelector('[data-filter-all]') as HTMLElement | null
    const catBtns = document.querySelectorAll('[data-filter-cat]')

    if (allBtn) {
      allBtn.style.backgroundColor = activeCatId === null ? primary : 'white'
      allBtn.style.color = activeCatId === null ? 'white' : primary
      allBtn.style.borderColor = activeCatId === null ? primary : `${primary}40`
    }

    catBtns.forEach(btn => {
      const el = btn as HTMLElement
      const id = el.getAttribute('data-filter-cat')
      el.style.backgroundColor = id === activeCatId ? primary : 'white'
      el.style.color = id === activeCatId ? 'white' : primary
      el.style.borderColor = id === activeCatId ? primary : `${primary}40`
    })
  }

  return (
    <div className="max-w-lg mx-auto flex gap-2 px-4 pb-4 overflow-x-auto scrollbar-hide border-b border-gray-100">
      <button
        data-filter-all
        onClick={showAll}
        className={`px-4 py-2 text-xs font-bold whitespace-nowrap border transition-all ${btnCls}`}
        style={{ backgroundColor: primary, color: 'white', borderColor: primary }}
      >
        Todo
      </button>
      {categories.map(cat => (
        <button
          key={cat.id}
          data-filter-cat={cat.id}
          onClick={() => showCategory(cat.id)}
          className={`px-4 py-2 text-xs font-semibold whitespace-nowrap bg-white border transition-all ${btnCls}`}
          style={{ borderColor: `${primary}40`, color: primary }}
        >
          {cat.name}
        </button>
      ))}
    </div>
  )
}

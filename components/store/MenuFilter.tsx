'use client'

import { useState, useEffect } from 'react'

interface MenuFilterProps {
  categories: any[]
  items: any[]
  primary: string
}

export default function MenuFilter({ categories, items, primary }: MenuFilterProps) {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Filter categories that have items
  const categoriesWithItems = categories.filter(cat =>
    items.some(i => i.category_id === cat.id)
  )

  // Get items for selected category
  const selectedItems = selectedCategoryId
    ? items.filter(i => i.category_id === selectedCategoryId)
    : []

  if (!mounted) return null

  return (
    <>
      {/* Category filter buttons */}
      {categoriesWithItems.length > 0 && (
        <div className="max-w-lg mx-auto flex gap-2 px-4 pb-4 overflow-x-auto scrollbar-hide border-b border-gray-100">
          {categoriesWithItems.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategoryId(selectedCategoryId === cat.id ? null : cat.id)}
              className="px-4 py-2 text-xs font-semibold whitespace-nowrap rounded-full transition-all border"
              style={{
                backgroundColor: selectedCategoryId === cat.id ? primary : 'white',
                color: selectedCategoryId === cat.id ? 'white' : primary,
                borderColor: selectedCategoryId === cat.id ? primary : `${primary}40`
              }}
            >
              {cat.name}
            </button>
          ))}
        </div>
      )}

      {/* Show selected category items or message */}
      {selectedCategoryId ? (
        selectedItems.length > 0 ? (
          <div className="max-w-lg mx-auto">
            {selectedItems.map(item => (
              <div key={item.id} className="p-4 border-b">
                {item.name} - ${item.price}
              </div>
            ))}
          </div>
        ) : (
          <div className="max-w-lg mx-auto p-6 text-center text-gray-500">
            Sin productos en esta categoría
          </div>
        )
      ) : (
        <div className="max-w-lg mx-auto p-6 text-center text-gray-500">
          Selecciona una categoría para ver los productos
        </div>
      )}
    </>
  )
}

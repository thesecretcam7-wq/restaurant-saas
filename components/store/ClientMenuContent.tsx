'use client'

import { useState } from 'react'
import AddToCartButton from './AddToCartButton'
import { MenuGridItem, MenuCompactItem, MenuListItem } from '@/components/store/MenuItems'

interface Category {
  id: string
  name: string
  sort_order: number
}

interface MenuItem {
  id: string
  name: string
  description?: string
  price: number
  image_url?: string
  featured: boolean
  category_id?: string
}

interface ClientMenuContentProps {
  categories: Category[]
  items: MenuItem[]
  featured: MenuItem[]
  slug: string
  tenantId: string
  primary: string
  br: string
  cardCls: string
  btnCls: string
  layout: string
  currencyInfo: any
}

export default function ClientMenuContent({
  categories,
  items,
  featured,
  slug,
  tenantId,
  primary,
  br,
  cardCls,
  btnCls,
  layout,
  currencyInfo
}: ClientMenuContentProps) {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)

  const filteredItems = selectedCategoryId
    ? items.filter(i => i.category_id === selectedCategoryId)
    : items

  const categoriesWithItems = categories.filter(cat =>
    items.some(i => i.category_id === cat.id)
  )

  return (
    <div>
      {/* Category pills */}
      {categoriesWithItems.length > 0 && (
        <div className="max-w-lg mx-auto flex gap-2 px-4 pb-4 overflow-x-auto scrollbar-hide border-b border-gray-100">
          <button
            onClick={() => setSelectedCategoryId(null)}
            className={`px-4 py-2 text-xs font-bold whitespace-nowrap rounded-full transition-all shadow-sm hover:shadow-md active:scale-95 ${btnCls}`}
            style={{
              backgroundColor: !selectedCategoryId ? primary : '#f3f4f6',
              color: !selectedCategoryId ? '#fff' : primary
            }}
          >
            Todo
          </button>
          {categoriesWithItems.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategoryId(cat.id)}
              className={`px-4 py-2 text-xs font-semibold whitespace-nowrap rounded-full transition-all ${btnCls}`}
              style={{
                backgroundColor: selectedCategoryId === cat.id ? primary : 'white',
                color: selectedCategoryId === cat.id ? 'white' : primary,
                borderColor: selectedCategoryId === cat.id ? primary : `${primary}40`,
                borderWidth: '1px'
              }}
            >
              {cat.name}
            </button>
          ))}
        </div>
      )}

      {/* Featured section */}
      {featured.length > 0 && !selectedCategoryId && (
        <section className="scroll-mt-20 max-w-lg mx-auto px-4 py-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-6 rounded-full" style={{ backgroundColor: primary }} />
            <h2 className="text-lg font-black text-gray-900 tracking-tight">
              ⭐ Lo más pedido
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {featured.map(item => (
              <div key={item.id} className={`overflow-hidden flex flex-col ${cardCls}`} style={{ borderRadius: br }}>
                {item.image_url ? (
                  <div className="relative overflow-hidden h-32">
                    <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="h-32 flex items-center justify-center text-4xl" style={{ backgroundColor: `${primary}10` }}>🍽️</div>
                )}
                <div className="p-3 flex flex-col flex-1">
                  <p className="font-bold text-gray-900 text-sm line-clamp-1">{item.name}</p>
                  {item.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 flex-1">{item.description}</p>}
                  <div className="flex items-center justify-between mt-2 gap-2">
                    <p className="font-extrabold text-sm" style={{ color: primary }}>
                      {item.price.toFixed(2)}
                    </p>
                    <AddToCartButton item={item} tenantId={tenantId} color={primary} small />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Filtered products */}
      {selectedCategoryId && (
        <main className="max-w-lg mx-auto px-4 py-6">
          {filteredItems.length > 0 ? (
            <div className="space-y-6">
              {layout === 'grid' ? (
                <div className="grid grid-cols-2 gap-3">
                  {filteredItems.map(item => (
                    <MenuGridItem key={item.id} item={item} tenantId={tenantId} primary={primary} br={br} cardCls={cardCls} currencyInfo={currencyInfo} />
                  ))}
                </div>
              ) : layout === 'compact' ? (
                <div className={`overflow-hidden divide-y divide-gray-50 ${cardCls}`} style={{ borderRadius: br }}>
                  {filteredItems.map(item => (
                    <MenuCompactItem key={item.id} item={item} tenantId={tenantId} primary={primary} currencyInfo={currencyInfo} />
                  ))}
                </div>
              ) : (
                <div className="space-y-2.5">
                  {filteredItems.map(item => (
                    <MenuListItem key={item.id} item={item} tenantId={tenantId} primary={primary} br={br} cardCls={cardCls} currencyInfo={currencyInfo} />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="text-5xl mb-3">🍽️</div>
              <p className="text-gray-500 font-medium">No hay productos en esta categoría</p>
            </div>
          )}
        </main>
      )}

      {/* All products (when no category selected) */}
      {!selectedCategoryId && (
        <main className="max-w-lg mx-auto px-4 py-6 space-y-8">
          {categoriesWithItems.map(cat => {
            const catItems = items.filter(i => i.category_id === cat.id)
            return (
              <section key={cat.id}>
                <h2 className="text-base font-extrabold text-gray-900 mb-3 flex items-center justify-between">
                  {cat.name}
                  <span className="text-xs font-semibold text-muted-foreground bg-gray-100 px-2 py-0.5 rounded-full">{catItems.length}</span>
                </h2>
                {layout === 'grid' ? (
                  <div className="grid grid-cols-2 gap-3">
                    {catItems.map(item => (
                      <MenuGridItem key={item.id} item={item} tenantId={tenantId} primary={primary} br={br} cardCls={cardCls} currencyInfo={currencyInfo} />
                    ))}
                  </div>
                ) : layout === 'compact' ? (
                  <div className={`overflow-hidden divide-y divide-gray-50 ${cardCls}`} style={{ borderRadius: br }}>
                    {catItems.map(item => (
                      <MenuCompactItem key={item.id} item={item} tenantId={tenantId} primary={primary} currencyInfo={currencyInfo} />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {catItems.map(item => (
                      <MenuListItem key={item.id} item={item} tenantId={tenantId} primary={primary} br={br} cardCls={cardCls} currencyInfo={currencyInfo} />
                    ))}
                  </div>
                )}
              </section>
            )
          })}

          {items.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="text-5xl mb-3">🍽️</div>
              <p className="text-gray-500 font-medium">El menú aún no está disponible</p>
              <p className="text-muted-foreground text-sm mt-1">Vuelve pronto</p>
            </div>
          )}
        </main>
      )}
    </div>
  )
}

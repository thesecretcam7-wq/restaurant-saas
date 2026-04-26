'use client'

import { useState } from 'react'
import AddToCartButton from './AddToCartButton'
import { formatPriceWithCurrency } from '@/lib/currency'

interface Topping {
  id: string
  name: string
  price: number
}

interface MenuItemProps {
  item: any
  tenantId: string
  primary: string
  br: string
  cardCls: string
  currencyInfo: any
  toppings?: Topping[]
}

interface MenuCompactItemProps {
  item: any
  tenantId: string
  primary: string
  currencyInfo: any
  toppings?: Topping[]
}

/* ─── LIST layout (default) ─── */
export function MenuListItem({ item, tenantId, primary, br, cardCls, currencyInfo, toppings = [] }: MenuItemProps) {
  const [imageLoaded, setImageLoaded] = useState(!item.image_url)

  return (
    <div className={`flex items-center gap-3 p-3 overflow-hidden ${cardCls}`} style={{ borderRadius: br }}>
      {item.image_url ? (
        <div className="relative flex-shrink-0 w-20 h-20 overflow-hidden" style={{ borderRadius: `calc(${br} * 0.6)` }}>
          {!imageLoaded && <div className="absolute inset-0 bg-gray-200 animate-pulse" />}
          <img
            src={item.image_url}
            alt={item.name}
            className={`w-20 h-20 object-cover transition-opacity duration-200 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
            onLoad={() => setImageLoaded(true)}
            loading="lazy"
            style={{ borderRadius: `calc(${br} * 0.6)` }}
          />
        </div>
      ) : (
        <div className="w-20 h-20 flex-shrink-0 flex items-center justify-center text-3xl" style={{ backgroundColor: `${primary}10`, borderRadius: `calc(${br} * 0.6)` }}>
          🍽️
        </div>
      )}
      <div className="flex-1 min-w-0 py-0.5">
        <p className="font-bold text-gray-900 text-sm line-clamp-1">{item.name}</p>
        {item.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{item.description}</p>}
        <p className="font-extrabold text-sm mt-1.5" style={{ color: primary }}>{formatPriceWithCurrency(item.price, currencyInfo.code, currencyInfo.locale)}</p>
      </div>
      <div className="flex-shrink-0">
        <AddToCartButton item={item} tenantId={tenantId} color={primary} small toppings={toppings} />
      </div>
    </div>
  )
}

/* ─── GRID layout ─── */
export function MenuGridItem({ item, tenantId, primary, br, cardCls, currencyInfo, toppings = [] }: MenuItemProps) {
  const [imageLoaded, setImageLoaded] = useState(!item.image_url)

  return (
    <div className={`overflow-hidden flex flex-col ${cardCls}`} style={{ borderRadius: br }}>
      {item.image_url ? (
        <div className="relative w-full h-28 overflow-hidden">
          {!imageLoaded && <div className="absolute inset-0 bg-gray-200 animate-pulse" />}
          <img
            src={item.image_url}
            alt={item.name}
            className={`w-full h-28 object-cover transition-opacity duration-200 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
            onLoad={() => setImageLoaded(true)}
            loading="lazy"
          />
        </div>
      ) : (
        <div className="h-28 flex items-center justify-center text-3xl" style={{ backgroundColor: `${primary}10` }}>🍽️</div>
      )}
      <div className="p-2.5 flex flex-col flex-1">
        <p className="font-bold text-gray-900 text-xs line-clamp-1">{item.name}</p>
        {item.description && <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2 flex-1">{item.description}</p>}
        <div className="flex items-center justify-between mt-2 gap-1">
          <p className="font-extrabold text-sm" style={{ color: primary }}>{formatPriceWithCurrency(item.price, currencyInfo.code, currencyInfo.locale)}</p>
          <AddToCartButton item={item} tenantId={tenantId} color={primary} small toppings={toppings} />
        </div>
      </div>
    </div>
  )
}

/* ─── COMPACT layout ─── */
export function MenuCompactItem({ item, tenantId, primary, currencyInfo, toppings = [] }: MenuCompactItemProps) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 text-sm">{item.name}</p>
        {item.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{item.description}</p>}
      </div>
      <p className="font-extrabold text-sm flex-shrink-0" style={{ color: primary }}>{formatPriceWithCurrency(item.price, currencyInfo.code, currencyInfo.locale)}</p>
      <div className="flex-shrink-0">
        <AddToCartButton item={item} tenantId={tenantId} color={primary} small toppings={toppings} />
      </div>
    </div>
  )
}

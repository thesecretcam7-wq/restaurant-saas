'use client'

import { useState } from 'react'
import Image from 'next/image'
import AddToCartButton from './AddToCartButton'
import { formatPriceWithCurrency } from '@/lib/currency'
import type { MenuItem } from '@/lib/types'

interface Topping {
  id: string
  name: string
  price: number
}

interface CurrencyInfo {
  code: string
  symbol: string
  locale: string
}

interface MenuItemProps {
  item: MenuItem
  tenantId: string
  primary: string
  br: string
  cardCls: string
  currencyInfo: CurrencyInfo
  toppings?: Topping[]
  index?: number
}

interface MenuCompactItemProps {
  item: MenuItem
  tenantId: string
  primary: string
  currencyInfo: CurrencyInfo
  toppings?: Topping[]
  index?: number
}

export function MenuListItem({ item, tenantId, primary, br, cardCls, currencyInfo, toppings = [], index = 0 }: MenuItemProps) {
  const [imageLoaded, setImageLoaded] = useState(!item.image_url)
  const hasToppings = toppings.length > 0

  return (
    <div
      className={`menu-rise flex items-center gap-3 overflow-hidden border border-black/8 bg-white p-2.5 shadow-sm transition active:scale-[0.99] sm:p-3 sm:hover:-translate-y-0.5 sm:hover:shadow-xl ${cardCls}`}
      style={{ borderRadius: br, animationDelay: `${index * 45}ms` }}
    >
      {item.image_url ? (
        <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden sm:h-24 sm:w-24" style={{ borderRadius: `calc(${br} * 0.6)` }}>
          {!imageLoaded && <div className="absolute inset-0 animate-pulse bg-gray-200" />}
          <Image
            src={item.image_url}
            alt={item.name}
            fill
            sizes="(max-width: 640px) 80px, 96px"
            className={`object-cover transition duration-500 sm:hover:scale-105 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
            onLoad={() => setImageLoaded(true)}
            style={{ borderRadius: `calc(${br} * 0.6)` }}
          />
        </div>
      ) : (
        <div className="h-20 w-20 flex-shrink-0 sm:h-24 sm:w-24" style={{ backgroundColor: `${primary}10`, borderRadius: `calc(${br} * 0.6)` }} />
      )}
      <div className="min-w-0 flex-1 py-0.5">
        <p className="line-clamp-2 text-sm font-black leading-5 text-[#15130f]">{item.name}</p>
        {item.description && <p className="mt-0.5 line-clamp-2 text-xs font-semibold text-black/48">{item.description}</p>}
        {hasToppings && <p className="mt-1 text-[11px] font-black uppercase tracking-wide" style={{ color: primary }}>Personalizar adicionales</p>}
        <p className="mt-1.5 text-sm font-black" style={{ color: primary }}>
          {formatPriceWithCurrency(item.price, currencyInfo.code, currencyInfo.locale)}
        </p>
      </div>
      <div className="flex-shrink-0">
        <AddToCartButton item={item} tenantId={tenantId} color={primary} small toppings={toppings} currencyInfo={currencyInfo} />
      </div>
    </div>
  )
}

export function MenuGridItem({ item, tenantId, primary, br, cardCls, currencyInfo, toppings = [], index = 0 }: MenuItemProps) {
  const [imageLoaded, setImageLoaded] = useState(!item.image_url)
  const hasToppings = toppings.length > 0

  return (
    <div
      className={`menu-rise group flex flex-col overflow-hidden border border-black/8 bg-white shadow-sm transition active:scale-[0.99] sm:hover:-translate-y-0.5 sm:hover:shadow-xl ${cardCls}`}
      style={{ borderRadius: br, animationDelay: `${index * 45}ms` }}
    >
      {item.image_url ? (
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-black/[0.03]">
          {!imageLoaded && <div className="absolute inset-0 animate-pulse bg-gray-200" />}
          <Image
            src={item.image_url}
            alt={item.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            className={`object-cover transition duration-500 sm:group-hover:scale-105 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
            onLoad={() => setImageLoaded(true)}
          />
          {hasToppings && (
            <span className="absolute left-2 top-2 rounded-full px-2.5 py-1 text-[10px] font-black text-white shadow-lg" style={{ backgroundColor: primary }}>
              Adicionales
            </span>
          )}
        </div>
      ) : (
        <div className="aspect-[4/3] w-full" style={{ backgroundColor: `${primary}10` }} />
      )}
      <div className="flex flex-1 flex-col p-2.5">
        <p className="line-clamp-2 min-h-10 text-sm font-black leading-5 text-[#15130f]">{item.name}</p>
        {item.description && <p className="mt-1 line-clamp-2 flex-1 text-xs font-semibold text-black/48">{item.description}</p>}
        {hasToppings && <p className="mt-1 text-[11px] font-black uppercase tracking-wide" style={{ color: primary }}>Toca + para elegir</p>}
        <div className="mt-2 flex items-center justify-between gap-1">
          <p className="text-base font-black" style={{ color: primary }}>
            {formatPriceWithCurrency(item.price, currencyInfo.code, currencyInfo.locale)}
          </p>
          <AddToCartButton item={item} tenantId={tenantId} color={primary} small toppings={toppings} currencyInfo={currencyInfo} />
        </div>
      </div>
    </div>
  )
}

export function MenuCompactItem({ item, tenantId, primary, currencyInfo, toppings = [], index = 0 }: MenuCompactItemProps) {
  const hasToppings = toppings.length > 0

  return (
    <div className="menu-rise flex items-center justify-between gap-3 px-4 py-3" style={{ animationDelay: `${index * 35}ms` }}>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-black text-[#15130f]">{item.name}</p>
        {item.description && <p className="mt-0.5 line-clamp-1 text-xs font-semibold text-black/48">{item.description}</p>}
        {hasToppings && <p className="mt-1 text-[10px] font-black uppercase tracking-wide" style={{ color: primary }}>Adicionales</p>}
      </div>
      <p className="flex-shrink-0 text-sm font-extrabold" style={{ color: primary }}>
        {formatPriceWithCurrency(item.price, currencyInfo.code, currencyInfo.locale)}
      </p>
      <div className="flex-shrink-0">
        <AddToCartButton item={item} tenantId={tenantId} color={primary} small toppings={toppings} currencyInfo={currencyInfo} />
      </div>
    </div>
  )
}

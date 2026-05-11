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
  priceColor?: string
  buttonColor?: string
  textColor?: string
  mutedTextColor?: string
  br: string
  cardCls: string
  currencyInfo: CurrencyInfo
  toppings?: Topping[]
  freeToppingsLabel?: string
  index?: number
}

interface MenuCompactItemProps {
  item: MenuItem
  tenantId: string
  primary: string
  priceColor?: string
  buttonColor?: string
  textColor?: string
  mutedTextColor?: string
  currencyInfo: CurrencyInfo
  toppings?: Topping[]
  freeToppingsLabel?: string
  index?: number
}

export function MenuListItem({
  item,
  tenantId,
  primary,
  priceColor = primary,
  buttonColor = primary,
  textColor = '#15130f',
  mutedTextColor = 'rgba(0,0,0,0.48)',
  br,
  cardCls,
  currencyInfo,
  toppings = [],
  freeToppingsLabel = 'Ingredientes gratis',
  index = 0,
}: MenuItemProps) {
  const [imageLoaded, setImageLoaded] = useState(!item.image_url)
  const hasToppings = toppings.length > 0
  const hasOnlyFreeToppings = hasToppings && toppings.every(topping => Number(topping.price || 0) === 0)

  return (
    <div
      className={`menu-rise flex items-center gap-3 overflow-hidden border border-black/8 bg-white p-2.5 shadow-sm transition active:scale-[0.99] sm:p-3 sm:hover:-translate-y-0.5 sm:hover:shadow-xl ${cardCls}`}
      style={{
        borderRadius: br,
        animationDelay: `${index * 45}ms`,
        backgroundImage: `linear-gradient(135deg, ${primary}12, transparent 58%)`,
      }}
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
          <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" style={{ borderRadius: `calc(${br} * 0.6)` }} />
        </div>
      ) : (
        <div className="h-20 w-20 flex-shrink-0 sm:h-24 sm:w-24" style={{ background: `linear-gradient(135deg, ${primary}22, ${priceColor}18)`, borderRadius: `calc(${br} * 0.6)` }} />
      )}
      <div className="min-w-0 flex-1 py-0.5">
        <p className="line-clamp-2 text-sm font-black leading-5" style={{ color: textColor }}>{item.name}</p>
        {item.description && <p className="mt-0.5 line-clamp-2 text-xs font-semibold" style={{ color: mutedTextColor }}>{item.description}</p>}
        {hasToppings && <p className="mt-1 text-[11px] font-black uppercase tracking-wide" style={{ color: priceColor }}>{hasOnlyFreeToppings ? freeToppingsLabel : 'Personalizar adicionales'}</p>}
        <p className="mt-1.5 text-sm font-black" style={{ color: priceColor }}>
          {formatPriceWithCurrency(item.price, currencyInfo.code, currencyInfo.locale)}
        </p>
      </div>
      <div className="flex-shrink-0">
        <AddToCartButton item={item} tenantId={tenantId} color={buttonColor} small toppings={toppings} currencyInfo={currencyInfo} freeToppingsLabel={freeToppingsLabel} />
      </div>
    </div>
  )
}

export function MenuGridItem({
  item,
  tenantId,
  primary,
  priceColor = primary,
  buttonColor = primary,
  textColor = '#15130f',
  mutedTextColor = 'rgba(0,0,0,0.48)',
  br,
  cardCls,
  currencyInfo,
  toppings = [],
  freeToppingsLabel = 'Ingredientes gratis',
  index = 0,
}: MenuItemProps) {
  const [imageLoaded, setImageLoaded] = useState(!item.image_url)
  const hasToppings = toppings.length > 0
  const hasOnlyFreeToppings = hasToppings && toppings.every(topping => Number(topping.price || 0) === 0)

  return (
    <div
      className={`menu-rise group flex flex-col overflow-hidden border border-black/8 bg-white shadow-sm transition active:scale-[0.99] sm:hover:-translate-y-0.5 sm:hover:shadow-xl ${cardCls}`}
      style={{
        borderRadius: br,
        animationDelay: `${index * 45}ms`,
        backgroundImage: `linear-gradient(135deg, ${primary}12, transparent 60%)`,
      }}
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
          <div className="absolute inset-0 bg-gradient-to-t from-black/62 via-black/10 to-transparent" />
          {hasToppings && (
            <span className="absolute left-2 top-2 rounded-full px-2.5 py-1 text-[10px] font-black text-white shadow-lg" style={{ backgroundColor: buttonColor }}>
              {hasOnlyFreeToppings ? freeToppingsLabel : 'Adicionales'}
            </span>
          )}
          <span className="absolute bottom-2 left-2 rounded-full bg-white/92 px-3 py-1.5 text-sm font-black shadow-lg backdrop-blur" style={{ color: priceColor }}>
            {formatPriceWithCurrency(item.price, currencyInfo.code, currencyInfo.locale)}
          </span>
        </div>
      ) : (
        <div className="aspect-[4/3] w-full" style={{ background: `linear-gradient(135deg, ${primary}22, ${priceColor}18)` }} />
      )}
      <div className="flex flex-1 flex-col p-2.5">
        <p className="line-clamp-2 min-h-10 text-sm font-black leading-5" style={{ color: textColor }}>{item.name}</p>
        {item.description && <p className="mt-1 line-clamp-2 flex-1 text-xs font-semibold" style={{ color: mutedTextColor }}>{item.description}</p>}
        {hasToppings && <p className="mt-1 text-[11px] font-black uppercase tracking-wide" style={{ color: priceColor }}>{hasOnlyFreeToppings ? 'Elige ingredientes gratis' : 'Toca + para elegir'}</p>}
        <div className="mt-2 flex items-center justify-between gap-1">
          <p className={`text-base font-black ${item.image_url ? 'sr-only' : ''}`} style={{ color: priceColor }}>
            {formatPriceWithCurrency(item.price, currencyInfo.code, currencyInfo.locale)}
          </p>
          <AddToCartButton item={item} tenantId={tenantId} color={buttonColor} small toppings={toppings} currencyInfo={currencyInfo} freeToppingsLabel={freeToppingsLabel} />
        </div>
      </div>
    </div>
  )
}

export function MenuCompactItem({
  item,
  tenantId,
  primary,
  priceColor = primary,
  buttonColor = primary,
  textColor = '#15130f',
  mutedTextColor = 'rgba(0,0,0,0.48)',
  currencyInfo,
  toppings = [],
  freeToppingsLabel = 'Ingredientes gratis',
  index = 0,
}: MenuCompactItemProps) {
  const hasToppings = toppings.length > 0
  const hasOnlyFreeToppings = hasToppings && toppings.every(topping => Number(topping.price || 0) === 0)

  return (
    <div className="menu-rise flex items-center justify-between gap-3 px-4 py-3" style={{ animationDelay: `${index * 35}ms` }}>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-black" style={{ color: textColor }}>{item.name}</p>
        {item.description && <p className="mt-0.5 line-clamp-1 text-xs font-semibold" style={{ color: mutedTextColor }}>{item.description}</p>}
        {hasToppings && <p className="mt-1 text-[10px] font-black uppercase tracking-wide" style={{ color: priceColor }}>{hasOnlyFreeToppings ? freeToppingsLabel : 'Adicionales'}</p>}
      </div>
      <p className="flex-shrink-0 text-sm font-extrabold" style={{ color: priceColor }}>
        {formatPriceWithCurrency(item.price, currencyInfo.code, currencyInfo.locale)}
      </p>
      <div className="flex-shrink-0">
        <AddToCartButton item={item} tenantId={tenantId} color={buttonColor} small toppings={toppings} currencyInfo={currencyInfo} freeToppingsLabel={freeToppingsLabel} />
      </div>
    </div>
  )
}

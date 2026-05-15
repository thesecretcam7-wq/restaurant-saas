'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { createPortal } from 'react-dom'
import { useCartStore } from '@/lib/store/cart'

function HomeIcon({ active, color, inactiveColor }: { active: boolean; color: string; inactiveColor: string }) {
  return (
    <svg width="23" height="23" viewBox="0 0 24 24" fill={active ? color : 'none'} stroke={active ? color : inactiveColor} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z"/>
      <path d="M9 21V12h6v9"/>
    </svg>
  )
}

function MenuIcon({ active, color, inactiveColor }: { active: boolean; color: string; inactiveColor: string }) {
  return (
    <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke={active ? color : inactiveColor} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/>
      <path d="M7 2v20"/>
      <path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3v7"/>
    </svg>
  )
}

function CartIcon({ active, color, inactiveColor }: { active: boolean; color: string; inactiveColor: string }) {
  return (
    <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke={active ? color : inactiveColor} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
      <line x1="3" y1="6" x2="21" y2="6"/>
      <path d="M16 10a4 4 0 0 1-8 0"/>
    </svg>
  )
}

function OrdersIcon({ active, color, inactiveColor }: { active: boolean; color: string; inactiveColor: string }) {
  return (
    <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke={active ? color : inactiveColor} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
      <polyline points="10 9 9 9 8 9"/>
    </svg>
  )
}

export default function BottomNav({
  tenantId,
  primaryColor,
  basePath,
  themeMode = 'dark',
}: {
  tenantId: string
  primaryColor?: string
  basePath?: string
  themeMode?: 'dark' | 'light'
}) {
  const [mounted, setMounted] = useState(false)
  const pathname = usePathname()
  const { items } = useCartStore()
  const cartCount = mounted ? items.reduce((s, i) => s + i.qty, 0) : 0
  const color = primaryColor || '#4F46E5'
  const isLight = themeMode === 'light'
  const inactiveColor = isLight ? 'rgba(21,19,15,.62)' : 'rgba(255,247,223,.72)'
  const pathBase = basePath ?? `/${tenantId}`
  const homePath = pathBase || '/'

  const isHome = pathname === homePath || pathname === `${homePath}/`
  const isMenu = pathname.startsWith(`${pathBase}/menu`) || pathname.startsWith(`${pathBase}/categoria`)
  const isCart = pathname.startsWith(`${pathBase}/carrito`) || pathname.startsWith(`${pathBase}/checkout`)
  const isOrders = pathname.startsWith(`${pathBase}/mis-pedidos`)

  const tabs = [
    { href: homePath, label: 'Inicio', Icon: HomeIcon, active: isHome },
    { href: `${pathBase}/menu`, label: 'Menu', Icon: MenuIcon, active: isMenu },
    { href: `${pathBase}/carrito`, label: 'Carrito', Icon: CartIcon, active: isCart, badge: cartCount },
    { href: `${pathBase}/mis-pedidos`, label: 'Pedidos', Icon: OrdersIcon, active: isOrders },
  ]

  useEffect(() => {
    setMounted(true)
  }, [])

  const nav = (
    <nav
      className="!fixed bottom-0 left-0 right-0 z-[9999] px-3 pb-3 pt-2"
      style={{
        position: 'fixed',
        inset: 'auto 0 0 0',
        paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.75rem)',
        background: isLight
          ? 'linear-gradient(to top, rgba(248,245,238,.96), rgba(248,245,238,.84) 68%, rgba(248,245,238,0))'
          : 'linear-gradient(to top, rgba(0,0,0,.94), rgba(0,0,0,.72) 68%, rgba(0,0,0,0))',
        transform: 'translate3d(0, 0, 0)',
        WebkitTransform: 'translate3d(0, 0, 0)',
        isolation: 'isolate',
      }}
      aria-label="Navegacion de tienda"
    >
      <div className="mx-auto flex h-[72px] max-w-md items-center gap-1 rounded-[28px] border border-[#e7b43f]/24 px-2 backdrop-blur-2xl" style={{ backgroundColor: isLight ? 'rgba(255,255,255,.9)' : 'rgba(8,8,7,.88)', boxShadow: isLight ? '0 -18px 52px rgba(21,19,15,.12), inset 0 1px 0 rgba(255,255,255,.9)' : '0 -18px 52px rgba(0,0,0,.54), inset 0 1px 0 rgba(255,255,255,.08)' }}>
        {tabs.map(({ href, label, Icon, active, badge }) => (
          <Link
            key={href}
            href={href}
            aria-label={label}
            className={`relative flex h-[58px] flex-1 touch-manipulation flex-col items-center justify-center gap-1 rounded-[22px] transition-all duration-200 active:scale-[0.96] ${
              active
                ? 'bg-[#e7b43f]/18 shadow-[0_0_24px_rgba(231,180,63,.18),inset_0_0_0_1px_rgba(231,180,63,0.42)]'
                : 'hover:bg-white/8'
            }`}
          >
            {active && (
              <span className="absolute -top-1 h-1 w-8 rounded-full bg-[#ffcf64] shadow-[0_0_18px_rgba(255,207,100,.85)]" />
            )}
            <div className="relative">
              {active && (
                <span className="absolute inset-0 scale-150 rounded-full opacity-20 blur-sm" style={{ backgroundColor: color }} />
              )}
              <Icon active={active} color={color} inactiveColor={inactiveColor} />
              {badge ? (
                <span
                  className="absolute -right-2 -top-2 flex h-[19px] min-w-[19px] items-center justify-center rounded-full px-1 text-[9px] font-black text-[#080704] shadow-[0_0_18px_rgba(255,207,100,.55)]"
                  style={{ background: 'linear-gradient(135deg, #ffcf64, #ff8a1a)' }}
                >
                  {badge > 9 ? '9+' : badge}
                </span>
              ) : null}
            </div>
            <span className="text-[11px] font-black leading-none tracking-wide" style={{ color: active ? color : inactiveColor }}>
              {label}
            </span>
          </Link>
        ))}
      </div>
    </nav>
  )

  if (!mounted) return nav
  return createPortal(nav, document.body)
}

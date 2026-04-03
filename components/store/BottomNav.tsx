'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { useCartStore } from '@/lib/store/cart'

function HomeIcon({ active, color }: { active: boolean; color: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? color : 'none'} stroke={active ? color : '#94A3B8'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z"/>
      <path d="M9 21V12h6v9"/>
    </svg>
  )
}

function MenuIcon({ active, color }: { active: boolean; color: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? color : '#94A3B8'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/>
      <path d="M7 2v20"/>
      <path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3v7"/>
    </svg>
  )
}

function CartIcon({ active, color }: { active: boolean; color: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? color : '#94A3B8'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
      <line x1="3" y1="6" x2="21" y2="6"/>
      <path d="M16 10a4 4 0 0 1-8 0"/>
    </svg>
  )
}

function OrdersIcon({ active, color }: { active: boolean; color: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? color : '#94A3B8'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
      <polyline points="10 9 9 9 8 9"/>
    </svg>
  )
}

export default function BottomNav({ tenantId, primaryColor }: { tenantId: string; primaryColor?: string }) {
  const pathname = usePathname()
  const { items } = useCartStore()
  const cartCount = items.reduce((s, i) => s + i.qty, 0)
  const color = primaryColor || '#3B82F6'

  const isHome = pathname === `/${tenantId}` || pathname === `/${tenantId}/`
  const isMenu = pathname.startsWith(`/${tenantId}/menu`) || pathname.startsWith(`/${tenantId}/categoria`)
  const isCart = pathname.startsWith(`/${tenantId}/carrito`) || pathname.startsWith(`/${tenantId}/checkout`)
  const isOrders = pathname.startsWith(`/${tenantId}/mis-pedidos`)

  const tabs = [
    { href: `/${tenantId}`, label: 'Inicio', Icon: HomeIcon, active: isHome },
    { href: `/${tenantId}/menu`, label: 'Menú', Icon: MenuIcon, active: isMenu },
    { href: `/${tenantId}/carrito`, label: 'Carrito', Icon: CartIcon, active: isCart, badge: cartCount },
    { href: `/${tenantId}/mis-pedidos`, label: 'Pedidos', Icon: OrdersIcon, active: isOrders },
  ]

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-xl border-t border-gray-100"
      style={{ boxShadow: '0 -4px 24px rgba(0,0,0,0.08)', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="max-w-lg mx-auto flex">
        {tabs.map(({ href, label, Icon, active, badge }) => (
          <Link key={href} href={href} className="flex-1 flex flex-col items-center py-2.5 gap-0.5 relative">
            <div className="relative">
              {active && (
                <span className="absolute inset-0 scale-150 rounded-full opacity-10" style={{ backgroundColor: color }} />
              )}
              <Icon active={active} color={color} />
              {badge ? (
                <span
                  className="absolute -top-1.5 -right-1.5 min-w-[17px] h-[17px] text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1"
                  style={{ backgroundColor: '#EF4444' }}
                >
                  {badge > 9 ? '9+' : badge}
                </span>
              ) : null}
            </div>
            <span className="text-[10px] font-semibold tracking-wide" style={{ color: active ? color : '#94A3B8' }}>
              {label}
            </span>
          </Link>
        ))}
      </div>
    </nav>
  )
}

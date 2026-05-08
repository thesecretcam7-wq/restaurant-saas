'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LockKeyhole, CreditCard, Mail } from 'lucide-react'
import type { TenantAccessInfo } from '@/lib/tenant-access'

interface TenantAccessGuardProps {
  access: TenantAccessInfo
  slug: string
  restaurantName?: string | null
  children: React.ReactNode
}

function canOpenWhileBlocked(pathname: string) {
  return (
    pathname.includes('/admin/configuracion/planes') ||
    pathname.includes('/admin/login') ||
    pathname.includes('/acceso') ||
    pathname.includes('/account/cambiar-plan') ||
    pathname.includes('/account/suscripcion') ||
    pathname.includes('/account/facturas')
  )
}

export default function TenantAccessGuard({
  access,
  slug,
  restaurantName,
  children,
}: TenantAccessGuardProps) {
  const pathname = usePathname()

  if (access.allowed || canOpenWhileBlocked(pathname)) {
    return <>{children}</>
  }

  const isSubscriptionExpired = access.reason === 'subscription_expired'

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f5f3ee] px-4 py-10">
      <div className="w-full max-w-lg rounded-3xl border border-black/10 bg-white p-8 text-center shadow-2xl shadow-black/10">
        <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-red-50 text-red-600">
          <LockKeyhole className="size-8" />
        </div>
        <p className="mt-6 text-xs font-black uppercase tracking-[0.24em] text-black/38">
          {restaurantName || 'Eccofood'}
        </p>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-[#15130f]">
          {isSubscriptionExpired ? 'Suscripcion vencida' : 'Prueba gratuita vencida'}
        </h1>
        <p className="mt-4 text-sm font-semibold leading-6 text-black/55">
          Para seguir usando la tienda, el TPV, cocina, pedidos e inventario, activa o renueva un plan.
          Tu informacion no se borra; queda guardada hasta que reactives el acceso.
        </p>
        <div className="mt-7 grid gap-3 sm:grid-cols-2">
          <Link
            href={`/${slug}/admin/configuracion/planes`}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#15130f] px-5 text-sm font-black text-white transition hover:bg-black"
          >
            <CreditCard className="size-4" />
            Ver planes
          </Link>
          <a
            href="mailto:support@eccofood.com"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-black/10 bg-white px-5 text-sm font-black text-[#15130f] transition hover:bg-black/5"
          >
            <Mail className="size-4" />
            Soporte
          </a>
        </div>
      </div>
    </div>
  )
}

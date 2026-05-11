import Link from 'next/link'
import type { RestaurantSettings } from '@/lib/types'

interface Props {
  tenantId: string
  settings: RestaurantSettings
  primary: string
  borderRadius: string
  basePath?: string
}

export default function ActionsSection({ tenantId, settings, primary, borderRadius, basePath }: Props) {
  const pathBase = basePath ?? `/${tenantId}`

  return (
    <section className="px-4 pt-4 grid grid-cols-2 gap-3">
      <Link
        href={`${pathBase}/menu`}
        className="flex flex-col items-center justify-center gap-2 p-5 text-white shadow-md active:scale-[0.97] transition-transform"
        style={{ background: `linear-gradient(135deg, ${primary}, ${primary}bb)`, borderRadius }}
      >
        <span className="text-2xl">🍽️</span>
        <span className="text-sm font-bold">Ver Menú</span>
      </Link>
      {settings?.reservations_enabled ? (
        <Link
          href={`${pathBase}/reservas`}
          className="flex flex-col items-center justify-center gap-2 p-5 bg-white border border-gray-100 shadow-sm active:scale-[0.97] transition-transform"
          style={{ borderRadius }}
        >
          <span className="text-2xl">📅</span>
          <span className="text-sm font-bold text-gray-800">Reservar</span>
        </Link>
      ) : (
        <Link
          href={`${pathBase}/mis-pedidos`}
          className="flex flex-col items-center justify-center gap-2 p-5 bg-white border border-gray-100 shadow-sm active:scale-[0.97] transition-transform"
          style={{ borderRadius }}
        >
          <span className="text-2xl">🧾</span>
          <span className="text-sm font-bold text-gray-800">Mis Pedidos</span>
        </Link>
      )}
    </section>
  )
}

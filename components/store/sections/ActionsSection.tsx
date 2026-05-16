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
        className="store-action-card flex flex-col items-center justify-center gap-2 border p-5 shadow-sm active:scale-[0.97] transition-transform"
        style={{
          backgroundColor: 'var(--brand-surface-color, #ffffff)',
          borderColor: 'var(--store-border, rgba(0,0,0,.1))',
          borderRadius,
          color: 'var(--brand-text-color, #15130f)',
        }}
      >
        <span className="text-2xl">🍽️</span>
        <span className="text-sm font-bold">Ver Menú</span>
      </Link>
      {settings?.reservations_enabled ? (
        <Link
          href={`${pathBase}/reservas`}
          className="store-action-card flex flex-col items-center justify-center gap-2 border p-5 shadow-sm active:scale-[0.97] transition-transform"
          style={{
            backgroundColor: 'var(--brand-surface-color, #ffffff)',
            borderColor: 'var(--store-border, rgba(0,0,0,.1))',
            borderRadius,
            color: 'var(--brand-text-color, #15130f)',
          }}
        >
          <span className="text-2xl">📅</span>
          <span className="text-sm font-bold">Reservar</span>
        </Link>
      ) : (
        <Link
          href={`${pathBase}/mis-pedidos`}
          className="store-action-card flex flex-col items-center justify-center gap-2 border p-5 shadow-sm active:scale-[0.97] transition-transform"
          style={{
            backgroundColor: 'var(--brand-surface-color, #ffffff)',
            borderColor: 'var(--store-border, rgba(0,0,0,.1))',
            borderRadius,
            color: 'var(--brand-text-color, #15130f)',
          }}
        >
          <span className="text-2xl">🧾</span>
          <span className="text-sm font-bold">Mis Pedidos</span>
        </Link>
      )}
    </section>
  )
}

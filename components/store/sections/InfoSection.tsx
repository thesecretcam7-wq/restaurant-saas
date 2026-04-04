import type { RestaurantSettings } from '@/lib/types'

interface Props {
  settings: RestaurantSettings
  primary: string
  borderRadius: string
  cardClasses: string
}

export default function InfoSection({ settings, primary, borderRadius, cardClasses }: Props) {
  if (!settings?.address && !settings?.phone && !settings?.email) return null

  return (
    <section className="px-4 pt-4 pb-2">
      <div className={`overflow-hidden ${cardClasses}`} style={{ borderRadius }}>
        <div className="px-4 py-3 border-b border-gray-50">
          <h3 className="font-bold text-gray-900">Información</h3>
        </div>
        <div className="divide-y divide-gray-50">
          {settings.address && (
            <div className="flex items-center gap-3 px-4 py-3">
              <span className="text-lg">📍</span>
              <div>
                <p className="text-xs text-gray-400 font-medium">Dirección</p>
                <p className="text-sm text-gray-800 font-medium">{settings.address}{settings.city ? `, ${settings.city}` : ''}</p>
              </div>
            </div>
          )}
          {settings.phone && (
            <a href={`tel:${settings.phone}`} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
              <span className="text-lg">📞</span>
              <div>
                <p className="text-xs text-gray-400 font-medium">Teléfono</p>
                <p className="text-sm font-medium" style={{ color: primary }}>{settings.phone}</p>
              </div>
            </a>
          )}
          {settings.email && (
            <a href={`mailto:${settings.email}`} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
              <span className="text-lg">✉️</span>
              <div>
                <p className="text-xs text-gray-400 font-medium">Email</p>
                <p className="text-sm font-medium" style={{ color: primary }}>{settings.email}</p>
              </div>
            </a>
          )}
          {settings.delivery_enabled && (
            <div className="flex items-center gap-3 px-4 py-3">
              <span className="text-lg">🚗</span>
              <div>
                <p className="text-xs text-gray-400 font-medium">Delivery</p>
                <p className="text-sm text-gray-800 font-medium">
                  {settings.delivery_time_minutes} min · {settings.delivery_fee > 0 ? `$${Number(settings.delivery_fee).toLocaleString('es-CO')} envío` : 'Envío gratis'}
                  {settings.delivery_min_order > 0 ? ` · Mínimo $${Number(settings.delivery_min_order).toLocaleString('es-CO')}` : ''}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

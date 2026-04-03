import { getTenantContext } from '@/lib/tenant'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import BottomNav from '@/components/store/BottomNav'

interface HomePageProps {
  params: Promise<{ domain: string }>
}

export default async function HomePage({ params }: HomePageProps) {
  const { domain: tenantId } = await params
  const context = await getTenantContext(tenantId)
  const { tenant, settings, branding } = context

  if (!tenant) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center px-6">
          <div className="text-6xl mb-4">🔍</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Restaurante no encontrado</h1>
          <p className="text-gray-500">No existe un restaurante en esta dirección.</p>
        </div>
      </div>
    )
  }

  const supabase = await createClient()
  const { data: featured } = await supabase
    .from('menu_items')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('featured', true)
    .eq('available', true)
    .limit(8)

  const primary = branding?.primary_color || '#3B82F6'
  const appName = branding?.app_name || tenant.organization_name
  const heroImage = settings?.featured_image_url

  return (
    <div className="min-h-screen bg-gray-50 pb-[72px]">
      {/* Hero */}
      <div className="relative h-[55vh] min-h-[360px] overflow-hidden">
        {heroImage ? (
          <img src={heroImage} alt={appName} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full" style={{ background: `linear-gradient(135deg, ${primary}dd 0%, ${primary}99 50%, #0f172a 100%)` }} />
        )}
        {/* Gradient overlay */}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.55) 60%, rgba(0,0,0,0.85) 100%)' }} />

        {/* Admin link top right */}
        <div className="absolute top-4 right-4 z-10">
          <Link
            href={`/${tenantId}/admin/login`}
            className="px-3 py-1.5 rounded-full text-xs font-medium bg-white/20 backdrop-blur-sm text-white border border-white/30"
          >
            Admin
          </Link>
        </div>

        {/* Content */}
        <div className="absolute bottom-0 left-0 right-0 p-6 pb-8">
          {tenant.logo_url && (
            <div className="mb-3">
              <img src={tenant.logo_url} alt={appName} className="w-16 h-16 rounded-2xl object-cover shadow-lg border-2 border-white/30" />
            </div>
          )}
          <h1 className="text-3xl font-extrabold text-white mb-1 leading-tight">{appName}</h1>
          {(branding?.tagline || settings?.description) && (
            <p className="text-white/80 text-sm mb-4 line-clamp-2">{branding?.tagline || settings?.description}</p>
          )}

          {/* Quick info pills */}
          <div className="flex flex-wrap gap-2 mb-5">
            {settings?.delivery_enabled && (
              <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-sm text-white text-xs font-medium">
                <span>🚗</span> {settings.delivery_time_minutes ?? 30} min
              </span>
            )}
            {settings?.city && (
              <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-sm text-white text-xs font-medium">
                <span>📍</span> {settings.city}
              </span>
            )}
            {settings?.cash_payment_enabled && (
              <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-sm text-white text-xs font-medium">
                <span>💳</span> Efectivo y tarjeta
              </span>
            )}
          </div>

          {/* CTAs */}
          <div className="flex gap-3">
            <Link
              href={`/${tenantId}/menu`}
              className="flex-1 py-3.5 rounded-2xl text-sm font-bold text-center shadow-lg active:scale-95 transition-transform"
              style={{ backgroundColor: primary, color: '#fff' }}
            >
              Ver Menú
            </Link>
            {settings?.reservations_enabled && (
              <Link
                href={`/${tenantId}/reservas`}
                className="flex-1 py-3.5 rounded-2xl text-sm font-bold text-center bg-white/20 backdrop-blur-sm text-white border border-white/40 active:scale-95 transition-transform"
              >
                Reservar Mesa
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Popular section */}
      {featured && featured.length > 0 && (
        <section className="pt-6 pb-2">
          <div className="px-4 flex items-center justify-between mb-3">
            <h2 className="text-lg font-extrabold text-gray-900">🔥 Lo más pedido</h2>
            <Link href={`/${tenantId}/menu`} className="text-sm font-semibold" style={{ color: primary }}>
              Ver todo
            </Link>
          </div>
          <div className="flex gap-3 px-4 overflow-x-auto pb-2 scrollbar-hide">
            {featured.map(item => (
              <Link
                key={item.id}
                href={`/${tenantId}/menu`}
                className="flex-shrink-0 w-40 bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 active:scale-95 transition-transform"
              >
                {item.image_url ? (
                  <img src={item.image_url} alt={item.name} className="w-full h-28 object-cover" />
                ) : (
                  <div className="w-full h-28 flex items-center justify-center text-4xl" style={{ backgroundColor: `${primary}15` }}>🍽️</div>
                )}
                <div className="p-2.5">
                  <p className="text-xs font-semibold text-gray-900 line-clamp-1">{item.name}</p>
                  <p className="text-sm font-bold mt-0.5" style={{ color: primary }}>${Number(item.price).toLocaleString('es-CO')}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Info card */}
      {(settings?.address || settings?.phone || settings?.email) && (
        <section className="px-4 pt-4 pb-2">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
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
                <a href={`tel:${settings.phone}`} className="flex items-center gap-3 px-4 py-3">
                  <span className="text-lg">📞</span>
                  <div>
                    <p className="text-xs text-gray-400 font-medium">Teléfono</p>
                    <p className="text-sm font-medium" style={{ color: primary }}>{settings.phone}</p>
                  </div>
                </a>
              )}
              {settings?.delivery_enabled && (
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
      )}

      {/* Services quick actions */}
      <section className="px-4 pt-4 grid grid-cols-2 gap-3">
        <Link
          href={`/${tenantId}/menu`}
          className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl text-white shadow-md active:scale-95 transition-transform"
          style={{ background: `linear-gradient(135deg, ${primary}, ${primary}bb)` }}
        >
          <span className="text-2xl">🍽️</span>
          <span className="text-sm font-bold">Ver Menú</span>
        </Link>
        {settings?.reservations_enabled ? (
          <Link
            href={`/${tenantId}/reservas`}
            className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-white border border-gray-100 shadow-sm active:scale-95 transition-transform"
          >
            <span className="text-2xl">📅</span>
            <span className="text-sm font-bold text-gray-800">Reservar</span>
          </Link>
        ) : (
          <Link
            href={`/${tenantId}/mis-pedidos`}
            className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-white border border-gray-100 shadow-sm active:scale-95 transition-transform"
          >
            <span className="text-2xl">🧾</span>
            <span className="text-sm font-bold text-gray-800">Mis Pedidos</span>
          </Link>
        )}
      </section>

      <p className="text-center text-[10px] text-gray-300 mt-8 mb-4">Powered by Restaurant SaaS</p>

      <BottomNav tenantId={tenantId} primaryColor={primary} />
    </div>
  )
}

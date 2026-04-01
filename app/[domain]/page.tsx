import { getTenantContext } from '@/lib/tenant'
import Link from 'next/link'

interface HomePageProps {
  params: Promise<{ domain: string }>
}

export default async function HomePage({ params }: HomePageProps) {
  const { domain: tenantId } = await params
  const context = await getTenantContext(tenantId)

  const { tenant, settings, branding } = context

  if (!tenant) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Restaurant Not Found</h1>
          <p>This restaurant is not configured yet.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {tenant.logo_url && (
              <img
                src={tenant.logo_url}
                alt={tenant.organization_name}
                className="h-8 w-8 object-cover rounded"
              />
            )}
            <h1 className="text-xl font-bold" style={{ color: branding?.primary_color }}>
              {branding?.app_name || tenant.organization_name}
            </h1>
          </div>
          <nav className="hidden md:flex gap-6">
            <Link href={`/${tenantId}/menu`} className="text-gray-600 hover:text-gray-900">
              Menu
            </Link>
            {settings?.reservations_enabled && (
              <Link href={`/${tenantId}/reservas`} className="text-gray-600 hover:text-gray-900">
                Reservas
              </Link>
            )}
            <Link href={`/${tenantId}/mis-pedidos`} className="text-gray-600 hover:text-gray-900">
              Mis Pedidos
            </Link>
          </nav>
          <Link
            href={`/${tenantId}/(admin)/login`}
            className="px-4 py-2 rounded-lg font-medium"
            style={{
              backgroundColor: branding?.primary_color || '#3B82F6',
              color: 'white',
            }}
          >
            Admin
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section
        className="flex-1 flex items-center justify-center px-4 py-20"
        style={{ backgroundColor: branding?.background_color }}
      >
        <div className="text-center max-w-2xl">
          <h2 className="text-4xl md:text-5xl font-bold mb-4" style={{ color: branding?.primary_color }}>
            {branding?.app_name || tenant.organization_name}
          </h2>
          <p className="text-xl text-gray-600 mb-8">{branding?.tagline || settings?.description}</p>

          {settings?.address && (
            <div className="mb-6 text-gray-700">
              <p className="font-medium">{settings.address}</p>
              {settings.phone && <p className="text-sm">{settings.phone}</p>}
            </div>
          )}

          <div className="flex gap-4 justify-center">
            <Link
              href={`/${tenantId}/menu`}
              className="px-8 py-3 rounded-lg font-semibold text-white"
              style={{ backgroundColor: branding?.primary_color || '#3B82F6' }}
            >
              Ver Menu
            </Link>
            {settings?.reservations_enabled && (
              <Link
                href={`/${tenantId}/reservas`}
                className="px-8 py-3 rounded-lg font-semibold border-2"
                style={{
                  borderColor: branding?.primary_color || '#3B82F6',
                  color: branding?.primary_color || '#3B82F6',
                }}
              >
                Hacer Reserva
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Features Section */}
      {(settings?.delivery_enabled || settings?.reservations_enabled) && (
        <section className="bg-gray-50 py-16 px-4">
          <div className="max-w-7xl mx-auto">
            <h3 className="text-2xl font-bold text-center mb-12">¿Cómo funciona?</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {settings.delivery_enabled && (
                <div className="bg-white rounded-lg p-6 text-center shadow-sm">
                  <div
                    className="w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center text-white"
                    style={{ backgroundColor: branding?.accent_color || '#F59E0B' }}
                  >
                    🚗
                  </div>
                  <h4 className="font-semibold mb-2">Delivery Rápido</h4>
                  <p className="text-gray-600 text-sm">
                    Entrega en tu puerta en {settings.delivery_time_minutes} minutos
                  </p>
                </div>
              )}
              {settings.cash_payment_enabled && (
                <div className="bg-white rounded-lg p-6 text-center shadow-sm">
                  <div
                    className="w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center text-white"
                    style={{ backgroundColor: branding?.accent_color || '#F59E0B' }}
                  >
                    💳
                  </div>
                  <h4 className="font-semibold mb-2">Múltiples Pagos</h4>
                  <p className="text-gray-600 text-sm">Tarjeta, transferencia o efectivo al llegar</p>
                </div>
              )}
              {settings.reservations_enabled && (
                <div className="bg-white rounded-lg p-6 text-center shadow-sm">
                  <div
                    className="w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center text-white"
                    style={{ backgroundColor: branding?.accent_color || '#F59E0B' }}
                  >
                    📅
                  </div>
                  <h4 className="font-semibold mb-2">Reservas Fáciles</h4>
                  <p className="text-gray-600 text-sm">Reserva tu mesa con unos pocos clics</p>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <p className="mb-2">{tenant.organization_name}</p>
          {settings?.address && <p className="text-sm text-gray-400">{settings.address}</p>}
          {settings?.phone && <p className="text-sm text-gray-400">{settings.phone}</p>}
          <p className="text-xs text-gray-500 mt-4">© 2024. Powered by Restaurant SaaS</p>
        </div>
      </footer>
    </div>
  )
}

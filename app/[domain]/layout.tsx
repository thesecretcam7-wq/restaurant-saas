import { getTenantContext } from '@/lib/tenant'
import { Toaster } from 'react-hot-toast'
import StoreNavigationLoader from '@/components/store/StoreNavigationLoader'

export const dynamic = 'force-dynamic'

interface TenantLayoutProps {
  children: React.ReactNode
  params: Promise<{ domain: string }>
}

export default async function TenantLayout({
  children,
  params,
}: TenantLayoutProps) {
  try {
    const { domain: tenantId } = await params
    const context = await getTenantContext(tenantId)

    if (!context.tenant) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 px-4">
            <div className="max-w-md w-full bg-white rounded-lg shadow-2xl p-8">
              <div className="text-center mb-6">
                <div className="text-5xl mb-4">🔍</div>
                <h1 className="text-2xl font-bold text-slate-900 mb-2">
                  Restaurante No Encontrado
                </h1>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-slate-700">
                  No encontramos un restaurante en esta dirección.
                </p>
              </div>

              <div className="space-y-4">
                <p className="text-slate-600 text-sm">
                  <strong>Podrías estar accediendo desde:</strong>
                </p>
                <ul className="text-sm text-slate-600 space-y-2">
                  <li>✓ Un dominio personalizado no configurado</li>
                  <li>✓ Un slug/subdominio incorrecto</li>
                  <li>✓ Un restaurante que fue eliminado</li>
                </ul>
              </div>

              <hr className="my-6" />

              <div className="space-y-3">
                <a
                  href="/"
                  className="block w-full text-center bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                >
                  Ir a Inicio
                </a>
                <a
                  href="mailto:soporte@restaurantsaas.com"
                  className="block w-full text-center bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold py-2 px-4 rounded-lg transition-colors"
                >
                  Contactar Soporte
                </a>
              </div>

              <p className="text-xs text-slate-500 text-center mt-6">
                Si eres propietario del restaurante y ves este mensaje,{' '}
                <a href="mailto:soporte@restaurantsaas.com" className="text-blue-600 hover:underline">
                  contáctanos
                </a>
              </p>
            </div>
          </div>
    )
  }

  const branding = context.branding

  // Eccofood Default Brand Colors - Professional Foundation
  const eccofoodDefaults = {
    primary: '#0066FF',
    secondary: '#10B981',
    accent: '#F97316',
    background: '#FFFFFF',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  }

  // Tenant custom colors with Eccofood fallbacks
  const primaryColor = branding?.primary_color || eccofoodDefaults.primary
  const secondaryColor = branding?.secondary_color || eccofoodDefaults.secondary
  const accentColor = branding?.accent_color || eccofoodDefaults.accent
  const backgroundColor = branding?.background_color || eccofoodDefaults.background
  const fontFamily = branding?.font_family || eccofoodDefaults.fontFamily

  return (
    <>
      <style>{`
        :root {
          /* Multi-Tenant Branding with Eccofood Defaults */
          /* Store pages use tenant colors or Eccofood professional defaults */
          --primary-color: ${primaryColor};
          --secondary-color: ${secondaryColor};
          --accent-color: ${accentColor};
          --background-color: ${backgroundColor};
          --font-family: ${fontFamily};

          /* Admin pages always use Eccofood brand (no tenant override) */
          --admin-primary: #0066FF;
          --admin-secondary: #10B981;
          --admin-accent: #F97316;
        }

        /* Ensure proper color contrast for accessibility */
        * {
          --tw-bg-opacity: 1;
          --tw-text-opacity: 1;
        }
      `}</style>
      <div className="min-h-full flex flex-col" style={{ backgroundColor }}>
        {children}
        <StoreNavigationLoader color={primaryColor} />
        <Toaster position="bottom-right" />
      </div>
    </>
    )
  } catch (error) {
    console.error('TenantLayout error:', error)
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-2xl p-8">
          <div className="text-center mb-6">
            <div className="text-5xl mb-4">⚠️</div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">
              Error al Cargar
            </h1>
          </div>
          <p className="text-slate-600 text-sm mb-6">
            Hubo un problema al cargar el restaurante. Por favor intenta más tarde.
          </p>
          <a
            href="/"
            className="block w-full text-center bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
          >
            Ir a Inicio
          </a>
        </div>
      </div>
    )
  }
}

import { getTenantContext } from '@/lib/tenant'
import { Toaster } from 'react-hot-toast'

export const dynamic = 'force-dynamic'

interface TenantLayoutProps {
  children: React.ReactNode
  params: Promise<{ domain: string }>
}

export default async function TenantLayout({
  children,
  params,
}: TenantLayoutProps) {
  const { domain: tenantId } = await params
  const context = await getTenantContext(tenantId)

  if (!context.tenant) {
    return (
      <html>
        <body>
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
        </body>
      </html>
    )
  }

  const branding = context.branding
  const cssVariables = branding
    ? {
        '--primary-color': branding.primary_color,
        '--secondary-color': branding.secondary_color,
        '--accent-color': branding.accent_color,
        '--background-color': branding.background_color,
        '--font-family': branding.font_family,
      }
    : {}

  return (
    <html
      lang="es"
      style={cssVariables as React.CSSProperties}
      className="scroll-smooth"
    >
      <head>
        <title>{branding?.app_name || context.tenant.organization_name}</title>
        <meta name="description" content={branding?.tagline || ''} />
        {branding?.favicon_url && (
          <link rel="icon" href={branding.favicon_url} />
        )}
        {branding?.font_url && (
          <link href={branding.font_url} rel="stylesheet" />
        )}
      </head>
      <body className="min-h-full flex flex-col bg-[var(--background-color)]">
        {children}
        <Toaster position="bottom-right" />
      </body>
    </html>
  )
}

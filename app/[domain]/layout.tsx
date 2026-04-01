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
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <h1 className="text-2xl font-bold mb-4">Restaurant Not Found</h1>
              <p>This restaurant is not configured yet.</p>
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

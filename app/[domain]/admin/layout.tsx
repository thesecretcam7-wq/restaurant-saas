import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getTenantContext } from '@/lib/tenant'

interface AdminLayoutProps {
  children: React.ReactNode
  params: Promise<{ domain: string }>
}

export default async function AdminLayout({ children, params }: AdminLayoutProps) {
  const { domain: slug } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/login`)

  // Look up tenant: by id if UUID, by slug otherwise
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug)

  let tenant = null
  if (isUUID) {
    const result = await supabase
      .from('tenants')
      .select('id, organization_name, status, owner_id')
      .eq('id', slug)
      .single()
    tenant = result.data
  } else {
    const result = await supabase
      .from('tenants')
      .select('id, organization_name, status, owner_id')
      .eq('slug', slug)
      .single()
    tenant = result.data
  }

  if (!tenant || tenant.owner_id !== user.id) redirect(`/login`)

  const tenantId = tenant.id
  const context = await getTenantContext(tenantId)
  const branding = context.branding

  const navLinks = [
    { href: `/${tenantId}/admin/dashboard`, label: 'Dashboard', icon: '📊' },
    { href: `/${tenantId}/admin/pedidos`, label: 'Pedidos', icon: '🛍️' },
    { href: `/${tenantId}/admin/productos`, label: 'Productos', icon: '🍽️' },
    { href: `/${tenantId}/admin/reservas`, label: 'Reservas', icon: '📅' },
    { href: `/${tenantId}/admin/clientes`, label: 'Clientes', icon: '👥' },
    { href: `/${tenantId}/admin/ventas`, label: 'Ventas', icon: '📈' },
    { href: `/${tenantId}/admin/configuracion/restaurante`, label: 'Configuración', icon: '⚙️' },
  ]

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r flex flex-col fixed inset-y-0 left-0 z-30">
        <div className="p-4 border-b">
          <div className="flex items-center gap-2">
            {context.tenant?.logo_url && (
              <img src={context.tenant.logo_url} alt="" className="w-8 h-8 rounded object-cover" />
            )}
            <div>
              <p className="font-semibold text-sm truncate" style={{ color: branding?.primary_color }}>
                {branding?.app_name || tenant.organization_name}
              </p>
              <p className="text-xs text-gray-500">Panel Admin</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navLinks.map(link => (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <span>{link.icon}</span>
              <span>{link.label}</span>
            </Link>
          ))}
        </nav>

        <div className="p-3 border-t space-y-1">
          <Link
            href={`/${tenantId}`}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100"
            target="_blank"
          >
            <span>👁️</span>
            <span>Ver tienda</span>
          </Link>
          <form action="/api/auth/logout" method="POST">
            <button
              type="submit"
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 text-left"
            >
              <span>🚪</span>
              <span>Cerrar sesión</span>
            </button>
          </form>
        </div>
      </aside>

      {/* Main content */}
      <main className="ml-64 flex-1 p-8 min-h-screen">
        {children}
      </main>
    </div>
  )
}

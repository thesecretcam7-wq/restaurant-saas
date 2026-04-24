import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getTenantContext } from '@/lib/tenant'
import { StaffNameDisplay } from '@/components/admin/StaffNameDisplay'
import { cookies } from 'next/headers'

interface AdminLayoutProps {
  children: React.ReactNode
  params: Promise<{ domain: string }>
}

export default async function AdminLayout({ children, params }: AdminLayoutProps) {
  const { domain: slug } = await params
  const supabase = await createClient()
  const cookieStore = await cookies()

  const { data: { user } } = await supabase.auth.getUser()

  // Check for staff session cookie
  const staffSessionCookie = cookieStore.get('staff_session')?.value
  let staffSession = null
  if (staffSessionCookie) {
    try {
      staffSession = JSON.parse(staffSessionCookie)
    } catch (e) {
      // Invalid session cookie
    }
  }

  if (!user && !staffSession) redirect(`/login`)

  // Look up tenant: by id if UUID, by slug otherwise
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug)

  let tenant = null
  if (isUUID) {
    const result = await supabase
      .from('tenants')
      .select('id, slug, organization_name, status, owner_id')
      .eq('id', slug)
      .single()
    if (result.error) {
      console.error('Admin layout error fetching tenant by ID:', result.error)
    }
    tenant = result.data
  } else {
    const result = await supabase
      .from('tenants')
      .select('id, slug, organization_name, status, owner_id')
      .eq('slug', slug)
      .single()
    if (result.error) {
      console.error('Admin layout error fetching tenant by slug:', result.error)
    }
    tenant = result.data
  }

  if (!tenant) redirect(`/login`)

  // Check authorization: owner or staff with admin permissions
  const isOwner = user && tenant.owner_id === user.id
  const isStaffWithAdminAccess = staffSession && staffSession.permissions?.some((p: string) => p.startsWith('admin_'))

  if (!isOwner && !isStaffWithAdminAccess) redirect(`/unauthorized`)

  const tenantId = tenant.id
  const context = await getTenantContext(tenantId)
  const branding = context.branding

  const tenantSlug = tenant.slug || slug

  // Get all tenants for the owner (for tenant switcher)
  let userTenants: { id: string; slug: string; organization_name: string }[] = []
  if (isOwner && user) {
    const { data: tenantsData } = await supabase
      .from('tenants')
      .select('id, slug, organization_name')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false })
    userTenants = tenantsData || []
  }

  const navLinks = [
    { href: `/${tenantSlug}/admin/dashboard`, label: 'Dashboard', icon: '📊' },
    { href: `/${tenantSlug}/admin/pedidos`, label: 'Pedidos', icon: '🛍️' },
    { href: `/${tenantSlug}/admin/productos`, label: 'Productos', icon: '🍽️' },
    { href: `/${tenantSlug}/admin/reservas`, label: 'Reservas', icon: '📅' },
    { href: `/${tenantSlug}/admin/clientes`, label: 'Clientes', icon: '👥' },
    { href: `/${tenantSlug}/admin/ventas`, label: 'Ventas', icon: '📈' },
    { href: `/${tenantSlug}/admin/cierres`, label: 'Cierres de Caja', icon: '🔒' },
    { href: `/${tenantSlug}/admin/configuracion/restaurante`, label: 'Configuración', icon: '⚙️' },
    { href: `/${tenantSlug}/admin/pos`, label: 'TPV/POS', icon: '💳' },
    { href: `/${tenantSlug}/admin/inventario`, label: 'Inventario', icon: '📦' },
    { href: `/${tenantSlug}/admin/configuracion/mesas`, label: 'Mesas', icon: '🪑' },
    { href: `/${tenantSlug}/admin/cuenta/cambiar-contrasena`, label: 'Cambiar Contraseña', icon: '🔑', divider: true },
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
          {/* Tenant Switcher */}
          {isOwner && userTenants.length > 1 && (
            <div className="mb-4 pb-4 border-b">
              <p className="text-xs font-semibold text-gray-500 px-3 mb-2">MIS RESTAURANTES</p>
              <div className="space-y-1">
                {userTenants.map(t => (
                  <Link
                    key={t.id}
                    href={`/${t.slug}/admin/dashboard`}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                      t.slug === tenantSlug
                        ? 'bg-blue-100 text-blue-700 font-semibold'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <span>{t.organization_name.includes('Demo') ? '🎮' : '🏪'}</span>
                    <span className="truncate">{t.organization_name}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {navLinks.map(link => (
            <div key={link.href}>
              {link.divider && <div className="my-2 border-t" />}
              <Link
                href={link.href}
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <span>{link.icon}</span>
                <span>{link.label}</span>
              </Link>
            </div>
          ))}
        </nav>

        <div className="p-3 border-t space-y-1">
          <StaffNameDisplay />
          <Link
            href={`/${tenantSlug}/menu`}
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
      <main className="ml-64 flex-1 p-0 min-h-screen max-h-screen overflow-y-auto">
        {children}
      </main>
    </div>
  )
}

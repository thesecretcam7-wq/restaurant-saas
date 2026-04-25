import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getTenantContext } from '@/lib/tenant'
import { AdminSidebar } from '@/components/admin/AdminSidebar'
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

  // Cajeros belong in the TPV, not the admin panel
  if (staffSession?.role === 'cajero') {
    redirect(`/${tenant.slug || slug}/staff/pos`)
  }

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
      <AdminSidebar
        tenantSlug={tenantSlug}
        restaurantName={branding?.app_name || tenant.organization_name}
        logoUrl={context.tenant?.logo_url}
        primaryColor={branding?.primary_color}
        navLinks={navLinks}
        userTenants={userTenants}
        isOwner={!!isOwner}
      />

      {/* Main content — desktop offset, full width on mobile */}
      <main className="md:ml-64 flex-1 p-0 min-h-screen max-h-screen overflow-y-auto w-full pt-14 md:pt-0">
        {children}
      </main>
    </div>
  )
}

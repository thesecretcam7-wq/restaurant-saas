import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getTenantContext } from '@/lib/tenant'
import { AdminSidebar } from '@/components/admin/AdminSidebar'
import { AdminContent } from './AdminContent'
import { SectionColorProvider } from '@/components/admin/SectionColorProvider'
import { getTenantAccessInfo } from '@/lib/tenant-access'
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

  const staffSessionCookie = cookieStore.get('staff_session')?.value
  let staffSession = null
  if (staffSessionCookie) {
    try {
      staffSession = JSON.parse(staffSessionCookie)
    } catch {
      staffSession = null
    }
  }

  if (!user && !staffSession) redirect('/login')

  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug)
  const tenantQuery = supabase
    .from('tenants')
    .select('id, slug, organization_name, status, owner_id, trial_ends_at, subscription_plan, subscription_stripe_id, subscription_expires_at, created_at')

  const { data: tenant, error } = isUUID
    ? await tenantQuery.eq('id', slug).single()
    : await tenantQuery.eq('slug', slug).single()

  if (error) console.error('Admin layout error fetching tenant:', error)
  if (!tenant) redirect('/login')

  const isOwner = user && tenant.owner_id === user.id
  const isStaffWithAdminAccess = staffSession && staffSession.permissions?.some((p: string) => p.startsWith('admin_'))

  if (!isOwner && !isStaffWithAdminAccess) redirect('/unauthorized')
  if (staffSession?.role === 'cajero') redirect(`/${tenant.slug || slug}/staff/pos`)

  const tenantSlug = tenant.slug || slug
  const access = getTenantAccessInfo(tenant)
  const context = await getTenantContext(tenant.id)
  const branding = context.branding
  const storeEnabled = (context.tenant as any)?.metadata?.store_enabled !== false

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
    { href: `/${tenantSlug}/admin/dashboard`, label: 'Dashboard', icon: 'dashboard' },
    { href: `/${tenantSlug}/admin/pedidos`, label: 'Pedidos', icon: 'orders' },
    { href: `/${tenantSlug}/acceso`, label: 'Acceso personal', icon: 'staffAccess' },
    { href: `/${tenantSlug}/admin/configuracion/personal`, label: 'Empleados', icon: 'personal' },
    { href: `/${tenantSlug}/admin/qr-carta`, label: 'QR Carta', icon: 'qr' },
    { href: `/${tenantSlug}/admin/productos`, label: 'Productos', icon: 'products' },
    { href: `/${tenantSlug}/admin/banners`, label: 'Banners', icon: 'banners' },
    { href: `/${tenantSlug}/admin/reservas`, label: 'Reservas', icon: 'reservations' },
    { href: `/${tenantSlug}/admin/clientes`, label: 'Clientes', icon: 'customers' },
    { href: `/${tenantSlug}/admin/ventas`, label: 'Ventas', icon: 'sales' },
    { href: `/${tenantSlug}/admin/ai-insights`, label: 'IA Insights', icon: 'ai' },
    { href: `/${tenantSlug}/admin/cierres`, label: 'Cierres de Caja', icon: 'cash' },
    { href: `/${tenantSlug}/admin/auditoria`, label: 'Auditoria', icon: 'audit' },
    { href: `/${tenantSlug}/admin/salud`, label: 'Salud del sistema', icon: 'health' },
    { href: `/${tenantSlug}/admin/configuracion/restaurante`, label: 'Configuracion', icon: 'settings' },
    { href: `/${tenantSlug}/admin/inventario`, label: 'Inventario', icon: 'inventory' },
    { href: `/${tenantSlug}/admin/cuenta/cambiar-contrasena`, label: 'Cambiar Contrasena', icon: 'password', divider: true },
  ]

  return (
    <div className="min-h-screen bg-[#f5f3ee] flex relative overflow-hidden">
      <AdminSidebar
        tenantSlug={tenantSlug}
        restaurantName={branding?.app_name || tenant.organization_name}
        logoUrl={context.tenant?.logo_url}
        primaryColor={branding?.primary_color}
        navLinks={navLinks}
        userTenants={userTenants}
        isOwner={!!isOwner}
        tenantId={tenant.id}
        storeEnabled={storeEnabled}
      />

      <SectionColorProvider>
        <AdminContent trialEndsAt={access.trialEndsAt} slug={tenantSlug}>{children}</AdminContent>
      </SectionColorProvider>
    </div>
  )
}

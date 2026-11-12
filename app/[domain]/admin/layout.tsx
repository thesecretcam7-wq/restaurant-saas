import { redirect } from 'next/navigation'
import { getTenantContext } from '@/lib/tenant'
import { AdminSidebar } from '@/components/admin/AdminSidebar'
import { AdminContent } from './AdminContent'
import { SectionColorProvider } from '@/components/admin/SectionColorProvider'
import { getTenantAccessInfo } from '@/lib/tenant-access'
import { cookies } from 'next/headers'
import { resolveAdminAccess } from '@/lib/admin-access'
import { TenantAuthError } from '@/lib/tenant-auth-error'
import { AdminConnectionNotice } from '@/components/admin/AdminConnectionNotice'

interface AdminLayoutProps {
  children: React.ReactNode
  params: Promise<{ domain: string }>
}

export default async function AdminLayout({ children, params }: AdminLayoutProps) {
  const { domain: slug } = await params
  const cookieStore = await cookies()
  let resolved
  try {
    resolved = await resolveAdminAccess(slug, cookieStore)
  } catch (error) {
    if (!(error instanceof TenantAuthError) || error.status < 500) throw error
    return <main className="mx-auto max-w-xl p-6"><AdminConnectionNotice unavailable /></main>
  }
  const { tenant, user, staffSession, isOwner, isStaffAdmin: isStaffWithAdminAccess, ownerClient: supabase } = resolved
  if (!tenant) redirect('/login')

  if (!isOwner && !isStaffWithAdminAccess) redirect('/unauthorized')
  if (!isOwner && isStaffWithAdminAccess && staffSession?.role === 'cajero') redirect(`/${tenant.slug || slug}/staff/pos`)

  const tenantSlug = tenant.slug || slug
  const access = getTenantAccessInfo(tenant)
  const context = await getTenantContext(tenant.id)
  const branding = context.branding
  const storeEnabled = (context.tenant as any)?.metadata?.store_enabled !== false

  let userTenants: { id: string; slug: string; organization_name: string }[] = []
  if (isOwner && user && supabase) {
    const { data: tenantsData } = await supabase
      .from('tenants')
      .select('id, slug, organization_name')
      .retry(false)
      .abortSignal(AbortSignal.timeout(8_000))
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false })
    userTenants = tenantsData || []
  }

  const navLinks = [
    { href: `/${tenantSlug}/admin/dashboard`, label: 'Dashboard', icon: 'dashboard' },
    { href: `/${tenantSlug}/admin/pedidos`, label: 'Pedidos', icon: 'orders' },
    { href: `/${tenantSlug}/acceso`, label: 'Acceso personal', icon: 'staffAccess' },
    { href: `/${tenantSlug}/admin/qr-carta`, label: 'QR Carta', icon: 'qr' },
    { href: `/${tenantSlug}/admin/mesas-qr`, label: 'QR Mesas', icon: 'tableQr' },
    { href: `/${tenantSlug}/admin/productos`, label: 'Productos', icon: 'products' },
    { href: `/${tenantSlug}/admin/banners`, label: 'Banners', icon: 'banners' },
    { href: `/${tenantSlug}/admin/reservas`, label: 'Reservas', icon: 'reservations' },
    { href: `/${tenantSlug}/admin/clientes`, label: 'Clientes', icon: 'customers' },
    { href: `/${tenantSlug}/admin/ventas`, label: 'Ventas', icon: 'sales' },
    { href: `/${tenantSlug}/admin/finanzas`, label: 'Finanzas', icon: 'finances' },
    { href: `/${tenantSlug}/admin/ai-insights`, label: 'IA Insights', icon: 'ai' },
    { href: `/${tenantSlug}/admin/cierres`, label: 'Cierres de Caja', icon: 'cash' },
    { href: `/${tenantSlug}/admin/auditoria`, label: 'Auditoria', icon: 'audit' },
    { href: `/${tenantSlug}/admin/salud`, label: 'Salud del sistema', icon: 'health' },
    { href: `/${tenantSlug}/admin/configuracion/restaurante`, label: 'Configuracion', icon: 'settings' },
    { href: `/${tenantSlug}/admin/inventario`, label: 'Inventario', icon: 'inventory' },
    { href: `/${tenantSlug}/admin/compras`, label: 'Compras', icon: 'purchases' },
    { href: `/${tenantSlug}/admin/menu-tv`, label: 'Menu TV', icon: 'menuTv' },
    { href: `/${tenantSlug}/admin/cuenta/cambiar-contrasena`, label: 'Cambiar Contrasena', icon: 'password', divider: true },
  ]

  return (
    <div className="admin-app-shell ecco-premium-app min-h-screen flex relative overflow-hidden">
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
        <AdminContent
          trialEndsAt={access.reason === 'trial_active' || access.reason === 'trial_expired' ? access.trialEndsAt : null}
          slug={tenantSlug}
        >{children}</AdminContent>
      </SectionColorProvider>
    </div>
  )
}

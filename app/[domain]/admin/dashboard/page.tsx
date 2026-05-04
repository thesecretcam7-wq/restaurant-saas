import { getTenantBySlugOrId } from '@/lib/getTenant'
import { getMonthlyOrderCount, getTenantPlanInfo } from '@/lib/checkPlan'
import { createServiceClient } from '@/lib/supabase/server'
import Link from 'next/link'
import {
  BadgeCheck,
  CalendarDays,
  CheckCircle2,
  Circle,
  ClipboardList,
  CreditCard,
  ExternalLink,
  Monitor,
  LayoutTemplate,
  Palette,
  Package,
  ReceiptText,
  ShoppingBag,
  Store,
  TrendingUp,
  UsersRound,
} from 'lucide-react'

interface DashboardProps {
  params: Promise<{ domain: string }>
}

const statusTone: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  confirmed: 'bg-sky-50 text-sky-700 border-sky-200',
  preparing: 'bg-orange-50 text-orange-700 border-orange-200',
  ready: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  on_the_way: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  delivered: 'bg-green-50 text-green-700 border-green-200',
  cancelled: 'bg-red-50 text-red-700 border-red-200',
}

const statusLabel: Record<string, string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmado',
  preparing: 'Preparando',
  ready: 'Listo',
  on_the_way: 'En camino',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
}

export default async function DashboardPage({ params }: DashboardProps) {
  const { domain: slugOrId } = await params
  const tenant = await getTenantBySlugOrId(slugOrId)

  if (!tenant) {
    return (
      <div className="admin-empty">
        <p className="text-lg font-black text-[#15130f]">Restaurante no encontrado</p>
        <p className="mt-1 text-sm">No pudimos encontrar ese restaurante.</p>
      </div>
    )
  }

  const tenantId = tenant.id
  const tenantSlug = tenant.slug || slugOrId
  const supabase = createServiceClient()
  const today = new Date()
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString()

  const [
    ordersRes,
    revenueRes,
    reservationsRes,
    customersRes,
    recentOrdersRes,
    planInfo,
    monthOrders,
    productsRes,
    brandingRes,
    settingsRes,
    tenantConfigRes,
  ] = await Promise.all([
    supabase.from('orders').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId),
    supabase.from('orders').select('total').eq('tenant_id', tenantId).eq('payment_status', 'paid').gte('created_at', startOfMonth),
    supabase.from('reservations').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('status', 'confirmed'),
    supabase.from('customers').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId),
    supabase.from('orders').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false }).limit(8),
    getTenantPlanInfo(tenantId),
    getMonthlyOrderCount(tenantId),
    supabase.from('menu_items').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId),
    supabase.from('tenant_branding').select('primary_color, secondary_color, accent_color, logo_url, app_name, hero_image_url, page_config').eq('tenant_id', tenantId).maybeSingle(),
    supabase.from('restaurant_settings').select('display_name, address, phone').eq('tenant_id', tenantId).maybeSingle(),
    supabase.from('tenants').select('organization_name, stripe_account_id, metadata').eq('id', tenantId).maybeSingle(),
  ])

  const totalOrders = ordersRes.count || 0
  const monthRevenue = (revenueRes.data || []).reduce((sum, o) => sum + Number(o.total), 0)
  const confirmedReservations = reservationsRes.count || 0
  const totalCustomers = customersRes.count || 0
  const recentOrders = recentOrdersRes.data || []
  const organizationName = tenantConfigRes.data?.organization_name || 'Restaurante'

  const pageConfig = tenantConfigRes.data?.metadata?.page_config || brandingRes.data?.page_config
  const hasBranding = !!(
    brandingRes.data?.logo_url ||
    brandingRes.data?.hero_image_url ||
    (brandingRes.data?.primary_color && brandingRes.data.primary_color !== '#3B82F6') ||
    (brandingRes.data?.secondary_color && brandingRes.data.secondary_color !== '#111827') ||
    (brandingRes.data?.accent_color && brandingRes.data.accent_color !== brandingRes.data.primary_color) ||
    (brandingRes.data?.app_name && brandingRes.data.app_name !== organizationName)
  )
  const hasRestaurantInfo = !!(settingsRes.data?.display_name && (settingsRes.data?.phone || settingsRes.data?.address))
  const hasPageDesign = !!(pageConfig && Object.keys(pageConfig).length > 0)

  const onboardingSteps = [
    {
      label: 'Personaliza tu marca',
      description: 'Logo, colores y nombre publico.',
      done: hasBranding,
      href: `/${tenantSlug}/admin/configuracion/branding`,
      icon: Palette,
    },
    {
      label: 'Completa informacion del restaurante',
      description: 'Direccion, telefono y datos visibles.',
      done: hasRestaurantInfo,
      href: `/${tenantSlug}/admin/configuracion/restaurante`,
      icon: Store,
    },
    {
      label: 'Agrega productos al menu',
      description: 'Categorias, precios, fotos y disponibilidad.',
      done: (productsRes.count || 0) > 0,
      href: `/${tenantSlug}/admin/productos/nuevo`,
      icon: Package,
    },
    {
      label: 'Disena tu pagina',
      description: 'Hero, secciones, galeria y llamadas a la accion.',
      done: hasPageDesign,
      href: `/${tenantSlug}/admin/configuracion/pagina`,
      icon: LayoutTemplate,
    },
    {
      label: 'Conecta pagos',
      description: 'Stripe para tarjetas y pagos digitales.',
      done: !!tenantConfigRes.data?.stripe_account_id,
      href: `/${tenantSlug}/admin/configuracion/stripe`,
      icon: CreditCard,
    },
  ]
  const completedSteps = onboardingSteps.filter(s => s.done).length
  const orderLimit = planInfo.limits.orders_per_month
  const hasLimit = orderLimit !== Infinity
  const orderPct = hasLimit ? Math.min((monthOrders / orderLimit) * 100, 100) : 0

  const stats = [
    { label: 'Pedidos totales', value: totalOrders.toLocaleString('es-CO'), icon: ShoppingBag, tone: 'text-[#e43d30]' },
    { label: 'Ingresos del mes', value: `$${monthRevenue.toLocaleString('es-CO')}`, icon: TrendingUp, tone: 'text-[#1c8b5f]' },
    { label: 'Reservas activas', value: confirmedReservations.toLocaleString('es-CO'), icon: CalendarDays, tone: 'text-[#6d5dfc]' },
    { label: 'Clientes', value: totalCustomers.toLocaleString('es-CO'), icon: UsersRound, tone: 'text-[#c47a16]' },
  ]

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <p className="admin-eyebrow">Centro operativo</p>
          <h1 className="admin-title">Dashboard</h1>
          <p className="admin-subtitle">Resumen ejecutivo de ventas, pedidos, configuracion y accesos rapidos del restaurante.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Link href={`/${tenantSlug}/menu`} className="admin-button-ghost">
            <ExternalLink className="size-4" />
            Ver tienda
          </Link>
          <Link href={`/${tenantSlug}/kitchen`} className="admin-button-ghost">
            <ClipboardList className="size-4" />
            Comandero
          </Link>
          <Link href={`/${tenantSlug}/admin/kds`} className="admin-button-ghost">
            <Monitor className="size-4" />
            Cocina KDS
          </Link>
          <Link href={`/${tenantSlug}/admin/pos`} className="admin-button-primary">
            <CreditCard className="size-4" />
            Abrir TPV
          </Link>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-4">
        {stats.map(({ label, value, icon: Icon, tone }) => (
          <article key={label} className="admin-card p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-black uppercase text-black/42">{label}</p>
              <Icon className={`size-5 ${tone}`} />
            </div>
            <p className="mt-5 text-3xl font-black tracking-tight text-[#15130f]">{value}</p>
          </article>
        ))}
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="admin-panel p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-black text-[#15130f]">Plan {planInfo.label}</p>
              <p className="mt-1 text-sm font-semibold text-black/52">
                {hasLimit ? `${monthOrders} de ${orderLimit} pedidos usados este mes.` : 'Pedidos ilimitados activos este mes.'}
              </p>
            </div>
            {planInfo.isTrial && planInfo.trialActive && <span className="admin-chip">Prueba activa</span>}
          </div>
          {hasLimit && (
            <div className="mt-5">
              <div className="h-2 overflow-hidden rounded-full bg-black/8">
                <div className="h-full rounded-full bg-[#e43d30]" style={{ width: `${orderPct}%` }} />
              </div>
            </div>
          )}
          <div className="mt-5 flex flex-wrap gap-2">
            <Link href={`/${tenantSlug}/admin/configuracion/planes`} className="admin-button-ghost">Gestionar plan</Link>
            <Link href={`/${tenantSlug}/admin/ventas`} className="admin-button-ghost">Ver ventas</Link>
          </div>
        </section>

        <section className="admin-panel p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-black text-[#15130f]">Puesta a punto</p>
              <p className="mt-1 text-sm font-semibold text-black/52">{completedSteps}/{onboardingSteps.length} pasos completos segun tu configuracion real</p>
            </div>
            <BadgeCheck className="size-6 text-[#1c8b5f]" />
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-black/8">
            <div className="h-full rounded-full bg-[#1c8b5f]" style={{ width: `${(completedSteps / onboardingSteps.length) * 100}%` }} />
          </div>
          <div className="mt-4 space-y-2">
            {onboardingSteps.map(({ label, description, done, href, icon: Icon }) => (
              <Link
                key={label}
                href={href}
                className="group flex items-center gap-3 rounded-2xl border border-black/8 bg-white/55 px-3 py-3 transition hover:border-[#e43d30]/25 hover:bg-white"
              >
                <div className={`grid size-10 place-items-center rounded-xl ${done ? 'bg-[#1c8b5f]/10 text-[#1c8b5f]' : 'bg-black/5 text-black/40'}`}>
                  <Icon className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-black text-[#15130f]">{label}</p>
                  <p className="truncate text-xs font-semibold text-black/45">{description}</p>
                </div>
                {done ? (
                  <CheckCircle2 className="size-5 shrink-0 text-[#1c8b5f]" />
                ) : (
                  <Circle className="size-5 shrink-0 text-black/22 transition group-hover:text-[#e43d30]" />
                )}
              </Link>
            ))}
          </div>
        </section>
      </div>

      <div className="mt-5">
        <section className="admin-panel overflow-hidden">
          <div className="flex items-center justify-between border-b border-black/10 px-5 py-4">
            <div>
              <h2 className="font-black text-[#15130f]">Pedidos recientes</h2>
              <p className="text-xs font-semibold text-black/45">Ultimos movimientos de la operacion</p>
            </div>
            <Link href={`/${tenantSlug}/admin/pedidos`} className="text-sm font-black text-[#e43d30]">Ver todos</Link>
          </div>
          {recentOrders.length === 0 ? (
            <div className="admin-empty m-5">
              <ReceiptText className="mb-3 size-8 text-black/24" />
              <p className="font-black text-[#15130f]">Aun no hay pedidos</p>
              <p className="mt-1 text-sm">Cuando entren, apareceran aqui.</p>
            </div>
          ) : (
            <div className="divide-y divide-black/8">
              {recentOrders.map(order => (
                <Link key={order.id} href={`/${tenantSlug}/admin/pedidos/${order.id}`} className="grid gap-3 px-5 py-4 transition hover:bg-white/70 sm:grid-cols-[1fr_auto_auto] sm:items-center">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-[#15130f]">{order.order_number || `Pedido ${order.id.slice(0, 8)}`}</p>
                    <p className="truncate text-xs font-semibold text-black/48">{order.customer_name || 'Cliente'} · {order.customer_phone || 'Sin telefono'}</p>
                  </div>
                  <span className={`w-fit rounded-full border px-2.5 py-1 text-xs font-black ${statusTone[order.status] || 'border-black/10 bg-black/5 text-black/58'}`}>
                    {statusLabel[order.status] || order.status}
                  </span>
                  <p className="text-sm font-black text-[#15130f]">${Number(order.total).toLocaleString('es-CO')}</p>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

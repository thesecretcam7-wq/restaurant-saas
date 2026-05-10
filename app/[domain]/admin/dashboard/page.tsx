import { getTenantBySlugOrId } from '@/lib/getTenant'
import { getMonthlyOrderCount, getTenantPlanInfo } from '@/lib/checkPlan'
import { createServiceClient } from '@/lib/supabase/server'
import Link from 'next/link'
import {
  BadgeCheck,
  Brain,
  CalendarDays,
  CheckCircle2,
  Circle,
  CreditCard,
  LayoutTemplate,
  Lightbulb,
  Palette,
  Package,
  ReceiptText,
  ShoppingBag,
  Sparkles,
  Store,
  Target,
  TrendingUp,
  TriangleAlert,
  UsersRound,
  Zap,
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
  const startOfTodayDate = new Date(today)
  startOfTodayDate.setHours(0, 0, 0, 0)
  const startOfToday = startOfTodayDate.toISOString()
  const startOfYesterdayDate = new Date(startOfTodayDate)
  startOfYesterdayDate.setDate(startOfYesterdayDate.getDate() - 1)
  const startOfYesterday = startOfYesterdayDate.toISOString()
  const sevenDaysAgoDate = new Date(today)
  sevenDaysAgoDate.setDate(sevenDaysAgoDate.getDate() - 7)
  const sevenDaysAgo = sevenDaysAgoDate.toISOString()

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
    intelligenceOrdersRes,
    intelligenceItemsRes,
    inventoryRes,
    topCustomersRes,
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
    supabase.from('orders').select('id, total, created_at, status, payment_status, payment_method, delivery_type, customer_name, customer_phone').eq('tenant_id', tenantId).gte('created_at', sevenDaysAgo).order('created_at', { ascending: false }).limit(500),
    supabase.from('order_items').select('name, quantity, price, created_at, status, started_at, completed_at').eq('tenant_id', tenantId).gte('created_at', sevenDaysAgo).limit(1000),
    supabase.from('inventory').select('product_name, current_stock, min_stock, max_stock, cost_per_unit').eq('tenant_id', tenantId).limit(200),
    supabase.from('customers').select('name, phone, email, total_spent, total_orders, last_order_at').eq('tenant_id', tenantId).order('total_spent', { ascending: false }).limit(8),
  ])

  const totalOrders = ordersRes.count || 0
  const monthRevenue = (revenueRes.data || []).reduce((sum, o) => sum + Number(o.total), 0)
  const confirmedReservations = reservationsRes.count || 0
  const totalCustomers = customersRes.count || 0
  const recentOrders = recentOrdersRes.data || []
  const organizationName = tenantConfigRes.data?.organization_name || 'Restaurante'
  const intelligenceOrders = intelligenceOrdersRes.data || []
  const intelligenceItems = intelligenceItemsRes.data || []
  const inventory = inventoryRes.data || []
  const topCustomers = topCustomersRes.data || []

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

  const todayOrders = intelligenceOrders.filter(order => new Date(order.created_at) >= startOfTodayDate)
  const yesterdayOrders = intelligenceOrders.filter(order => {
    const date = new Date(order.created_at)
    return date >= startOfYesterdayDate && date < startOfTodayDate
  })
  const todayRevenue = todayOrders.filter(o => o.payment_status === 'paid').reduce((sum, o) => sum + Number(o.total || 0), 0)
  const yesterdayRevenue = yesterdayOrders.filter(o => o.payment_status === 'paid').reduce((sum, o) => sum + Number(o.total || 0), 0)
  const revenueDelta = yesterdayRevenue > 0 ? Math.round(((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100) : todayRevenue > 0 ? 100 : 0
  const avgTicket = todayOrders.length > 0 ? todayRevenue / todayOrders.length : 0

  const ordersByHour = intelligenceOrders.reduce((acc: Record<number, { count: number; revenue: number }>, order: any) => {
    const hour = new Date(order.created_at).getHours()
    if (!acc[hour]) acc[hour] = { count: 0, revenue: 0 }
    acc[hour].count += 1
    acc[hour].revenue += Number(order.total || 0)
    return acc
  }, {})
  const peakHour = Object.entries(ordersByHour)
    .sort(([, a], [, b]) => b.count - a.count)[0]
  const peakHourLabel = peakHour ? `${String(peakHour[0]).padStart(2, '0')}:00` : 'Sin datos'
  const nextPeakHour = Number(peakHour?.[0] || 19)
  const predictedOrders = Math.max(3, Math.round((peakHour?.[1].count || Math.max(todayOrders.length, 1)) * 0.8))
  const recommendedStaff = Math.max(2, Math.min(8, Math.ceil(predictedOrders / 6) + 1))

  const productMap = intelligenceItems.reduce((acc: Record<string, { name: string; quantity: number; revenue: number }>, item: any) => {
    const name = item.name || 'Producto'
    if (!acc[name]) acc[name] = { name, quantity: 0, revenue: 0 }
    acc[name].quantity += Number(item.quantity || 1)
    acc[name].revenue += Number(item.price || 0) * Number(item.quantity || 1)
    return acc
  }, {})
  const topProducts = Object.values(productMap).sort((a, b) => b.quantity - a.quantity).slice(0, 5)
  const starProduct = topProducts[0]
  const comboProduct = topProducts[1]

  const lowStock = inventory
    .filter((item: any) => Number(item.current_stock || 0) <= Number(item.min_stock || 0))
    .slice(0, 4)
  const inventoryValue = inventory.reduce((sum: number, item: any) => sum + (Number(item.current_stock || 0) * Number(item.cost_per_unit || 0)), 0)

  const deliveredItems = intelligenceItems.filter((item: any) => item.started_at && item.completed_at)
  const avgPrepTime = deliveredItems.length > 0
    ? Math.round(deliveredItems.reduce((sum: number, item: any) => {
      const start = new Date(item.started_at).getTime()
      const end = new Date(item.completed_at).getTime()
      return sum + Math.max((end - start) / 60000, 0)
    }, 0) / deliveredItems.length)
    : 0

  const repeatCustomerCount = topCustomers.filter((customer: any) => Number(customer.total_orders || 0) > 1).length
  const inactiveCustomers = topCustomers.filter((customer: any) => {
    if (!customer.last_order_at) return false
    const last = new Date(customer.last_order_at)
    const days = (Date.now() - last.getTime()) / 86400000
    return days > 21
  }).slice(0, 3)

  const aiAlerts = [
    lowStock.length > 0 && {
      title: `${lowStock.length} ingrediente${lowStock.length > 1 ? 's' : ''} en nivel bajo`,
      text: `Revisa ${lowStock.map((i: any) => i.product_name).slice(0, 2).join(', ')} antes del siguiente pico.`,
      tone: 'amber',
    },
    revenueDelta < -10 && {
      title: 'Ventas por debajo de ayer',
      text: `Hoy vas ${Math.abs(revenueDelta)}% abajo. Activa una promo corta en hora valle.`,
      tone: 'red',
    },
    avgPrepTime > 18 && {
      title: 'Cocina lenta',
      text: `Tiempo promedio de preparacion: ${avgPrepTime} min. Refuerza cocina en hora pico.`,
      tone: 'red',
    },
    starProduct && {
      title: `${starProduct.name} esta empujando ventas`,
      text: `Vendio ${starProduct.quantity} unidades esta semana. Ponlo en banner o combo.`,
      tone: 'green',
    },
  ].filter(Boolean) as { title: string; text: string; tone: string }[]

  const ceoBrief = todayOrders.length > 0
    ? `Hoy llevas ${todayOrders.length} pedidos y $${todayRevenue.toLocaleString('es-CO')} en ventas pagadas. ${revenueDelta >= 0 ? `Vas ${revenueDelta}% arriba de ayer.` : `Vas ${Math.abs(revenueDelta)}% abajo de ayer.`} El pico probable es ${peakHourLabel}.`
    : `Aun no hay pedidos hoy. Prepara una accion rapida: destaca ${starProduct?.name || 'tu producto estrella'} y revisa inventario antes de la noche.`

  const aiActions = [
    {
      title: 'Producto para promocionar',
      value: starProduct?.name || 'Sin datos suficientes',
      text: starProduct ? `Tiene traccion real: ${starProduct.quantity} unidades vendidas.` : 'Cuando entren ventas, Eccofood detectara el producto lider.',
      icon: Target,
    },
    {
      title: 'Combo sugerido',
      value: starProduct && comboProduct ? `${starProduct.name} + ${comboProduct.name}` : 'Pendiente de ventas',
      text: starProduct && comboProduct ? 'Usalo como recomendacion en kiosko o carta QR.' : 'Necesitamos al menos dos productos con ventas.',
      icon: Sparkles,
    },
    {
      title: 'Personal recomendado',
      value: `${recommendedStaff} personas`,
      text: `Para un pico aproximado de ${predictedOrders} pedidos cerca de ${String(nextPeakHour).padStart(2, '0')}:00.`,
      icon: UsersRound,
    },
    {
      title: 'Inventario estimado',
      value: `$${inventoryValue.toLocaleString('es-CO')}`,
      text: lowStock.length > 0 ? 'Hay productos bajo minimo. Prioridad de compra hoy.' : 'Inventario sin alertas criticas segun minimos.',
      icon: Package,
    },
  ]

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <p className="admin-eyebrow">Centro operativo</p>
          <h1 className="admin-title">Dashboard</h1>
          <p className="admin-subtitle">Resumen ejecutivo de ventas, pedidos, operacion e inteligencia del restaurante.</p>
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

      <section className="mt-5 overflow-hidden rounded-[1.4rem] border border-black/10 bg-[#15130f] text-white shadow-2xl shadow-black/10">
        <div className="grid gap-0 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="relative p-5 sm:p-7">
            <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-[#e43d30]/20 blur-3xl" />
            <div className="relative">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/10 px-3 py-1.5 text-xs font-black uppercase text-[#f4b860]">
                <Brain className="size-4" />
                CEO Brief inteligente
              </div>
              <h2 className="max-w-3xl text-3xl font-black leading-tight text-white drop-shadow-[0_2px_16px_rgba(0,0,0,0.45)] sm:text-4xl">
                <span className="mb-2 inline-flex max-w-full rounded-xl bg-white px-3 py-1 text-[#15130f] shadow-lg shadow-black/20">
                  <span className="truncate">{organizationName}</span>
                </span>
                <span className="block">Lo importante para decidir hoy</span>
              </h2>
              <p className="mt-4 max-w-3xl text-base font-semibold leading-7 text-white/68">
                {ceoBrief}
              </p>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-white/[0.07] p-4">
                  <p className="text-xs font-black uppercase text-white/38">Ticket medio hoy</p>
                  <p className="mt-2 text-2xl font-black">${Math.round(avgTicket).toLocaleString('es-CO')}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.07] p-4">
                  <p className="text-xs font-black uppercase text-white/38">Pico probable</p>
                  <p className="mt-2 text-2xl font-black">{peakHourLabel}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.07] p-4">
                  <p className="text-xs font-black uppercase text-white/38">Clientes recurrentes</p>
                  <p className="mt-2 text-2xl font-black">{repeatCustomerCount}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-white/10 bg-white/[0.04] p-5 sm:p-7 xl:border-l xl:border-t-0">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-black">Alertas accionables</h3>
                <p className="text-xs font-semibold text-white/42">Prioridades que el dueno deberia mirar.</p>
              </div>
              <TriangleAlert className="size-5 text-[#f4b860]" />
            </div>
            <div className="space-y-3">
              {(aiAlerts.length > 0 ? aiAlerts : [{
                title: 'Operacion estable',
                text: 'No hay alertas criticas con los datos actuales. Mantente revisando ventas e inventario.',
                tone: 'green',
              }]).slice(0, 4).map(alert => (
                <div key={alert.title} className="rounded-2xl border border-white/10 bg-black/18 p-4">
                  <p className={`text-sm font-black ${alert.tone === 'red' ? 'text-red-200' : alert.tone === 'amber' ? 'text-amber-200' : 'text-emerald-200'}`}>
                    {alert.title}
                  </p>
                  <p className="mt-1 text-sm font-semibold leading-6 text-white/58">{alert.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_1fr]">
        <section className="admin-panel p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="admin-eyebrow">IA operativa</p>
              <h2 className="mt-1 text-xl font-black text-[#15130f]">Recomendaciones para vender mas</h2>
            </div>
            <Lightbulb className="size-6 text-[#e43d30]" />
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {aiActions.map(({ title, value, text, icon: Icon }) => (
              <article key={title} className="rounded-2xl border border-black/8 bg-white/60 p-4">
                <div className="flex items-start gap-3">
                  <div className="grid size-10 flex-shrink-0 place-items-center rounded-xl bg-[#15130f] text-white">
                    <Icon className="size-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-black uppercase text-black/38">{title}</p>
                    <p className="mt-1 line-clamp-2 text-base font-black text-[#15130f]">{value}</p>
                    <p className="mt-2 text-xs font-semibold leading-5 text-black/50">{text}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="admin-panel p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="admin-eyebrow">Prediccion</p>
              <h2 className="mt-1 text-xl font-black text-[#15130f]">Demanda y preparacion</h2>
            </div>
            <Zap className="size-6 text-[#e43d30]" />
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            {[
              ['Pedidos esperados', predictedOrders, 'proximo pico'],
              ['Personal sugerido', recommendedStaff, 'personas en turno'],
              ['Prep. promedio', avgPrepTime || 'N/D', avgPrepTime ? 'minutos' : 'sin datos KDS'],
            ].map(([label, value, detail]) => (
              <div key={String(label)} className="rounded-2xl border border-black/8 bg-white/60 p-4">
                <p className="text-xs font-black uppercase text-black/38">{String(label)}</p>
                <p className="mt-2 text-3xl font-black text-[#15130f]">{String(value)}</p>
                <p className="mt-1 text-xs font-semibold text-black/45">{String(detail)}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-2xl border border-[#e43d30]/15 bg-[#e43d30]/6 p-4">
            <p className="text-sm font-black text-[#15130f]">Sugerencia de turno</p>
            <p className="mt-1 text-sm font-semibold leading-6 text-black/56">
              Refuerza caja y cocina cerca de {peakHourLabel}. Si la demanda baja antes del pico, usa un banner de combo para mover ticket medio.
            </p>
          </div>
        </section>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <section className="admin-panel p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="admin-eyebrow">Productos</p>
              <h2 className="mt-1 text-xl font-black text-[#15130f]">Top ventas y margen</h2>
            </div>
            <TrendingUp className="size-6 text-[#1c8b5f]" />
          </div>
          <div className="mt-5 space-y-3">
            {topProducts.length === 0 ? (
              <div className="admin-empty min-h-40">
                <p className="font-black text-[#15130f]">Sin ventas suficientes</p>
                <p className="mt-1 text-sm">Cuando entren pedidos, la IA detectara productos ganadores.</p>
              </div>
            ) : topProducts.map((product, index) => (
              <div key={product.name} className="flex items-center gap-3 rounded-2xl border border-black/8 bg-white/60 p-3">
                <span className="grid size-9 place-items-center rounded-xl bg-[#15130f] text-sm font-black text-white">{index + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-black text-[#15130f]">{product.name}</p>
                  <p className="text-xs font-semibold text-black/45">{product.quantity} unidades vendidas</p>
                </div>
                <p className="text-sm font-black text-[#1c8b5f]">${Math.round(product.revenue).toLocaleString('es-CO')}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="admin-panel p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="admin-eyebrow">Clientes</p>
              <h2 className="mt-1 text-xl font-black text-[#15130f]">Fidelizacion inteligente</h2>
            </div>
            <UsersRound className="size-6 text-[#6d5dfc]" />
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-black/8 bg-white/60 p-4">
              <p className="text-sm font-black text-[#15130f]">Clientes top</p>
              <div className="mt-3 space-y-2">
                {topCustomers.slice(0, 4).map((customer: any) => (
                  <div key={customer.email || customer.phone || customer.name} className="flex items-center justify-between gap-3 rounded-xl bg-black/[0.035] px-3 py-2">
                    <span className="truncate text-xs font-black text-black/62">{customer.name || customer.phone || 'Cliente'}</span>
                    <span className="text-xs font-black text-[#15130f]">${Number(customer.total_spent || 0).toLocaleString('es-CO')}</span>
                  </div>
                ))}
                {topCustomers.length === 0 && <p className="text-sm font-semibold text-black/45">Aun no hay clientes suficientes.</p>}
              </div>
            </div>
            <div className="rounded-2xl border border-black/8 bg-white/60 p-4">
              <p className="text-sm font-black text-[#15130f]">Recuperacion sugerida</p>
              <p className="mt-2 text-sm font-semibold leading-6 text-black/55">
                {inactiveCustomers.length > 0
                  ? `${inactiveCustomers.length} cliente${inactiveCustomers.length > 1 ? 's' : ''} top no han vuelto en mas de 21 dias. Envia promocion personalizada.`
                  : 'Sin clientes top inactivos detectados. Mantén ofertas para recurrencia.'}
              </p>
            </div>
          </div>
        </section>
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

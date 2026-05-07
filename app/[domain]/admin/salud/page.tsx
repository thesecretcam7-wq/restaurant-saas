import { getTenantIdFromSlug } from '@/lib/tenant'
import { createServiceClient } from '@/lib/supabase/server'
import { LocalPrintAgentStatus } from '@/components/admin/LocalPrintAgentStatus'
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  CreditCard,
  Package,
  Printer,
  ShieldCheck,
  Store,
  Truck,
  UsersRound,
  XCircle,
} from 'lucide-react'

interface Props {
  params: Promise<{ domain: string }>
}

type HealthItem = {
  title: string
  description: string
  status: 'ok' | 'warning' | 'danger'
  action?: string
  icon: any
}

function statusClasses(status: HealthItem['status']) {
  if (status === 'ok') return 'border-emerald-200 bg-emerald-50 text-emerald-700'
  if (status === 'warning') return 'border-amber-200 bg-amber-50 text-amber-700'
  return 'border-red-200 bg-red-50 text-red-700'
}

function StatusIcon({ status }: { status: HealthItem['status'] }) {
  if (status === 'ok') return <CheckCircle2 className="size-5 text-emerald-600" />
  if (status === 'warning') return <AlertTriangle className="size-5 text-amber-600" />
  return <XCircle className="size-5 text-red-600" />
}

export default async function SystemHealthPage({ params }: Props) {
  const { domain: slug } = await params
  const tenantId = await getTenantIdFromSlug(slug)

  if (!tenantId) {
    return <div className="admin-empty">Restaurante no encontrado</div>
  }

  const supabase = createServiceClient()
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString()
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  const [
    tenantRes,
    settingsRes,
    productsRes,
    staffRes,
    printerRes,
    failedPrintsRes,
    delayedOrdersRes,
    voidsRes,
  ] = await Promise.all([
    supabase
      .from('tenants')
      .select('id, organization_name, stripe_account_id, stripe_account_status, subscription_stripe_id, metadata')
      .eq('id', tenantId)
      .maybeSingle(),
    supabase
      .from('restaurant_settings')
      .select('tax_rate, delivery_enabled, delivery_fee, delivery_min_order, cash_payment_enabled, default_receipt_printer_id, printer_auto_print')
      .eq('tenant_id', tenantId)
      .maybeSingle(),
    supabase
      .from('menu_items')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId),
    supabase
      .from('staff_members')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId),
    supabase
      .from('printer_devices')
      .select('id, name, status, is_default, config, last_used_at')
      .eq('tenant_id', tenantId)
      .order('is_default', { ascending: false }),
    supabase
      .from('printer_logs')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('status', 'failed')
      .gte('created_at', dayAgo),
    supabase
      .from('order_items')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('status', 'pending')
      .lte('created_at', tenMinutesAgo),
    supabase
      .from('audit_logs')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .in('action', ['sale.voided', 'order.cancelled']),
  ])

  const tenant = tenantRes.data as any
  const settings = settingsRes.data as any
  const printers = (printerRes.data || []) as any[]
  const defaultPrinter = printers.find((printer) => printer.is_default || printer.id === settings?.default_receipt_printer_id)
  const storeEnabled = tenant?.metadata?.store_enabled !== false

  const healthItems: HealthItem[] = [
    {
      title: 'Productos cargados',
      description: `${productsRes.count || 0} productos disponibles para tienda, kiosko, TPV y comandero.`,
      status: (productsRes.count || 0) > 0 ? 'ok' : 'danger',
      action: (productsRes.count || 0) > 0 ? undefined : 'Carga productos antes de vender.',
      icon: Package,
    },
    {
      title: 'Personal y PIN',
      description: `${staffRes.count || 0} empleados registrados para operar por roles.`,
      status: (staffRes.count || 0) > 0 ? 'ok' : 'warning',
      action: (staffRes.count || 0) > 0 ? undefined : 'Crea empleados para no compartir la cuenta del dueño.',
      icon: UsersRound,
    },
    {
      title: 'Impresora predeterminada',
      description: defaultPrinter ? `${defaultPrinter.name} configurada para recibos.` : 'No hay impresora predeterminada para tickets.',
      status: defaultPrinter ? 'ok' : 'danger',
      action: defaultPrinter ? undefined : 'Configura una impresora de Windows o USB.',
      icon: Printer,
    },
    {
      title: 'Auto impresion',
      description: settings?.printer_auto_print === false ? 'La auto-impresion esta desactivada.' : 'La auto-impresion esta activa.',
      status: settings?.printer_auto_print === false ? 'warning' : 'ok',
      action: settings?.printer_auto_print === false ? 'Activa auto-imprimir si quieres tickets automaticos.' : undefined,
      icon: Printer,
    },
    {
      title: 'Errores de impresion 24h',
      description: `${failedPrintsRes.count || 0} errores registrados en las ultimas 24 horas.`,
      status: (failedPrintsRes.count || 0) === 0 ? 'ok' : 'warning',
      action: (failedPrintsRes.count || 0) === 0 ? undefined : 'Revisa agente local, driver y papel antes del turno.',
      icon: AlertTriangle,
    },
    {
      title: 'IVA',
      description: Number(settings?.tax_rate || 0) > 0 ? `IVA activo al ${Number(settings.tax_rate)}%.` : 'IVA desactivado o en 0%.',
      status: Number(settings?.tax_rate || 0) > 0 ? 'ok' : 'warning',
      action: Number(settings?.tax_rate || 0) > 0 ? undefined : 'Si el restaurante cobra IVA, define el porcentaje.',
      icon: CreditCard,
    },
    {
      title: 'Delivery',
      description: settings?.delivery_enabled ? `Delivery activo. Costo: ${Number(settings.delivery_fee || 0).toFixed(2)}.` : 'Delivery esta desactivado.',
      status: settings?.delivery_enabled ? 'ok' : 'warning',
      action: settings?.delivery_enabled ? undefined : 'Activalo si el restaurante hace domicilios.',
      icon: Truck,
    },
    {
      title: 'Stripe restaurante',
      description: tenant?.stripe_account_id ? `Cuenta ${tenant.stripe_account_status || 'pendiente'} conectada.` : 'El restaurante no ha conectado Stripe.',
      status: tenant?.stripe_account_status === 'verified' ? 'ok' : 'warning',
      action: tenant?.stripe_account_status === 'verified' ? undefined : 'Completa la conexion para pagos online.',
      icon: CreditCard,
    },
    {
      title: 'Tienda online',
      description: storeEnabled ? 'La tienda esta visible para clientes.' : 'La tienda esta desactivada.',
      status: storeEnabled ? 'ok' : 'warning',
      action: storeEnabled ? undefined : 'Activa la tienda cuando el menu este listo.',
      icon: Store,
    },
    {
      title: 'Pedidos atrasados KDS',
      description: `${delayedOrdersRes.count || 0} items llevan mas de 10 minutos sin confirmar.`,
      status: (delayedOrdersRes.count || 0) === 0 ? 'ok' : 'danger',
      action: (delayedOrdersRes.count || 0) === 0 ? undefined : 'Revisa cocina: hay pedidos sin atender.',
      icon: Activity,
    },
    {
      title: 'Auditoria',
      description: `${voidsRes.count || 0} anulaciones/cancelaciones registradas.`,
      status: 'ok',
      action: 'Las acciones delicadas quedan guardadas para revision del dueño.',
      icon: ShieldCheck,
    },
  ]

  const okCount = healthItems.filter((item) => item.status === 'ok').length
  const warningCount = healthItems.filter((item) => item.status === 'warning').length
  const dangerCount = healthItems.filter((item) => item.status === 'danger').length
  const score = Math.round((okCount / healthItems.length) * 100)

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <p className="admin-eyebrow">Operacion</p>
          <h1 className="admin-title">Salud del sistema</h1>
          <p className="admin-subtitle">Diagnostico rapido de ventas, impresora, pagos, delivery, seguridad y cocina.</p>
        </div>
        <div className="rounded-2xl bg-[#15130f] px-5 py-4 text-right text-white shadow-xl">
          <p className="text-xs font-black uppercase text-white/45">Score operativo</p>
          <p className="text-3xl font-black">{score}%</p>
        </div>
      </div>

      <div className="mb-5 grid gap-4 md:grid-cols-4">
        <article className="admin-card p-5">
          <p className="text-xs font-black uppercase text-black/42">Correcto</p>
          <p className="mt-2 text-3xl font-black text-emerald-600">{okCount}</p>
        </article>
        <article className="admin-card p-5">
          <p className="text-xs font-black uppercase text-black/42">Atencion</p>
          <p className="mt-2 text-3xl font-black text-amber-600">{warningCount}</p>
        </article>
        <article className="admin-card p-5">
          <p className="text-xs font-black uppercase text-black/42">Critico</p>
          <p className="mt-2 text-3xl font-black text-red-600">{dangerCount}</p>
        </article>
        <article className="admin-card p-5">
          <p className="text-xs font-black uppercase text-black/42">Restaurante</p>
          <p className="mt-2 truncate text-lg font-black text-[#15130f]">{tenant?.organization_name || 'Restaurante'}</p>
        </article>
      </div>

      <div className="mb-5">
        <LocalPrintAgentStatus />
      </div>

      <section className="grid gap-4 lg:grid-cols-2">
        {healthItems.map((item) => {
          const Icon = item.icon
          return (
            <article key={item.title} className="admin-card p-5">
              <div className="flex items-start gap-4">
                <span className={`flex size-11 shrink-0 items-center justify-center rounded-xl border ${statusClasses(item.status)}`}>
                  <Icon className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="font-black text-[#15130f]">{item.title}</h2>
                    <StatusIcon status={item.status} />
                  </div>
                  <p className="mt-1 text-sm font-semibold text-black/55">{item.description}</p>
                  {item.action && <p className="mt-3 rounded-lg bg-black/5 px-3 py-2 text-xs font-bold text-black/55">{item.action}</p>}
                </div>
              </div>
            </article>
          )
        })}
      </section>
    </div>
  )
}

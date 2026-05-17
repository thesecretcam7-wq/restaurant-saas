import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowRight, CircleDollarSign, Headphones, Store, UserRoundCheck } from 'lucide-react'
import EccofoodLogo from '@/components/EccofoodLogo'
import { isOwnerEmail } from '@/lib/owner-auth'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

type TenantRow = {
  id: string
  organization_name: string
  owner_email: string
  owner_name: string | null
  status: string
  subscription_plan: string | null
  subscription_expires_at: string | null
  trial_ends_at: string | null
  created_at: string
  slug: string
  metadata?: Record<string, unknown> | null
}

type SupportRow = {
  id: string
  restaurant_name: string | null
  contact_name: string
  contact_email: string
  subject: string
  status: string
  priority: string
  created_at: string
}

const planPrices: Record<string, number> = {
  basic: 49.99,
  pro: 99.99,
  premium: 299.99,
}

const statusText: Record<string, string> = {
  trial: 'Prueba',
  active: 'Activo',
  suspended: 'Suspendido',
  cancelled: 'Cancelado',
}

function money(value: number) {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(value)
}

function shortDate(value: string | null) {
  if (!value) return '-'
  return new Date(value).toLocaleDateString('es-CO')
}

export default async function OwnerDashboard() {
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()

  if (!isOwnerEmail(user?.email)) {
    redirect('/login')
  }

  const supabase = createServiceClient()

  const { data: tenants } = await supabase
    .from('tenants')
    .select('id, organization_name, owner_email, owner_name, status, subscription_plan, subscription_expires_at, trial_ends_at, created_at, slug, metadata')
    .order('created_at', { ascending: false })

  const { data: supportRequests, error: supportError } = await supabase
    .from('owner_support_requests')
    .select('id, restaurant_name, contact_name, contact_email, subject, status, priority, created_at')
    .order('created_at', { ascending: false })
    .limit(5)

  const allTenants = (tenants || []) as TenantRow[]
  const now = new Date()
  const activeClients = allTenants.filter(tenant => tenant.status === 'active').length
  const trialClients = allTenants.filter(tenant => tenant.status === 'trial').length
  const manualClients = allTenants.filter(tenant => tenant.metadata?.billing_source === 'manual').length
  const expiredTrials = allTenants.filter(tenant => {
    if (tenant.status !== 'trial' || !tenant.trial_ends_at) return false
    return new Date(tenant.trial_ends_at) < now
  }).length
  const monthlyEstimate = allTenants.reduce((total, tenant) => {
    if (tenant.status !== 'active' || !tenant.subscription_plan) return total
    return total + (planPrices[tenant.subscription_plan] || 0)
  }, 0)
  const openSupport = (supportRequests || []).filter(request => request.status === 'open').length

  const cards = [
    { label: 'Clientes inscritos', value: allTenants.length, note: 'Restaurantes registrados', icon: Store, href: '/gestionar-cuentas?estado=all' },
    { label: 'Clientes activos', value: activeClients, note: `${manualClients} manuales`, icon: UserRoundCheck, href: '/gestionar-cuentas?estado=active' },
    { label: 'MRR estimado', value: money(monthlyEstimate), note: 'Segun planes activos', icon: CircleDollarSign, href: '/admin/ingresos' },
    { label: 'Preguntas abiertas', value: supportError ? '-' : openSupport, note: supportError ? 'Activa la tabla de soporte' : 'Mensajes pendientes', icon: Headphones, href: '/admin/soporte' },
  ]

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <nav className="border-b border-border bg-background/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <EccofoodLogo size="sm" textClassName="font-bold text-foreground text-lg tracking-tight" />
          </Link>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Dueno de Eccofood</p>
            <p className="text-sm font-semibold text-foreground">{user?.email}</p>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/30 bg-primary/10 mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            <span className="text-xs text-primary font-semibold">Panel interno</span>
          </div>
          <h1 className="text-4xl font-black text-foreground">Control de Eccofood</h1>
          <p className="text-muted-foreground mt-2">Clientes inscritos, cuentas manuales, pagos, pruebas gratis y preguntas de soporte.</p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {cards.map(card => {
            const Icon = card.icon
            return (
              <Link key={card.label} href={card.href} className="group rounded-2xl border border-border bg-card/70 p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:bg-primary/5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-bold text-muted-foreground">{card.label}</p>
                    <p className="mt-2 text-3xl font-black text-foreground">{card.value}</p>
                    <p className="mt-1 text-xs font-semibold text-muted-foreground">{card.note}</p>
                  </div>
                  <div className="rounded-xl bg-primary/10 p-3 text-primary">
                    <Icon className="size-5" />
                  </div>
                </div>
              </Link>
            )
          })}
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-4">
          <Link href="/gestionar-cuentas" className="rounded-2xl border border-border bg-white p-5 shadow-sm transition hover:border-primary/40">
            <h2 className="font-black text-gray-950">Gestionar cuentas</h2>
            <p className="mt-2 text-sm font-semibold text-gray-500">Activar manual, suspender, extender prueba y elegir plan.</p>
          </Link>
          <Link href="/admin/soporte" className="rounded-2xl border border-border bg-white p-5 shadow-sm transition hover:border-primary/40">
            <h2 className="font-black text-gray-950">Bandeja de preguntas</h2>
            <p className="mt-2 text-sm font-semibold text-gray-500">Ver mensajes, cambiar estado y guardar notas internas.</p>
          </Link>
          <Link href="/admin/ingresos" className="rounded-2xl border border-border bg-white p-5 shadow-sm transition hover:border-primary/40">
            <h2 className="font-black text-gray-950">Ingresos</h2>
            <p className="mt-2 text-sm font-semibold text-gray-500">Ver ingresos estimados, vencimientos y planes.</p>
          </Link>
          <Link href="/soporte" className="rounded-2xl border border-border bg-white p-5 shadow-sm transition hover:border-primary/40">
            <h2 className="font-black text-gray-950">Formulario publico</h2>
            <p className="mt-2 text-sm font-semibold text-gray-500">Pagina donde los clientes pueden escribirte.</p>
          </Link>
        </div>

        <div className="mt-8 grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
          <section className="rounded-2xl border border-border bg-card/70 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between border-b border-border p-5">
              <div>
                <h2 className="text-xl font-black text-foreground">Clientes recientes</h2>
                <p className="text-sm font-semibold text-muted-foreground">Ultimos restaurantes inscritos.</p>
              </div>
              <Link href="/gestionar-cuentas" className="inline-flex items-center gap-1 text-sm font-black text-primary">
                Ver todos <ArrowRight className="size-4" />
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/30">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-black text-muted-foreground">Restaurante</th>
                    <th className="px-5 py-3 text-left text-xs font-black text-muted-foreground">Plan</th>
                    <th className="px-5 py-3 text-left text-xs font-black text-muted-foreground">Estado</th>
                    <th className="px-5 py-3 text-left text-xs font-black text-muted-foreground">Vence prueba</th>
                    <th className="px-5 py-3 text-left text-xs font-black text-muted-foreground">Creado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {allTenants.slice(0, 8).map(tenant => (
                    <tr key={tenant.id}>
                      <td className="px-5 py-4">
                        <p className="font-black text-foreground">{tenant.organization_name}</p>
                        <p className="text-xs font-semibold text-muted-foreground">{tenant.owner_email}</p>
                      </td>
                      <td className="px-5 py-4 text-sm font-bold text-muted-foreground">{tenant.subscription_plan || '-'}</td>
                      <td className="px-5 py-4">
                        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-black text-primary">
                          {statusText[tenant.status] || tenant.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-sm font-bold text-muted-foreground">{shortDate(tenant.trial_ends_at)}</td>
                      <td className="px-5 py-4 text-sm font-bold text-muted-foreground">{shortDate(tenant.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-card/70 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-foreground">Soporte reciente</h2>
                <p className="text-sm font-semibold text-muted-foreground">Ultimas preguntas recibidas.</p>
              </div>
              <Link href="/admin/soporte" className="text-sm font-black text-primary">Abrir</Link>
            </div>

            {supportError ? (
              <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-900">
                Falta pegar la migracion de soporte en Supabase.
              </div>
            ) : (supportRequests || []).length === 0 ? (
              <div className="mt-5 rounded-xl border border-border bg-background p-4 text-sm font-bold text-muted-foreground">
                Todavia no hay preguntas.
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                {((supportRequests || []) as SupportRow[]).map(request => (
                  <div key={request.id} className="rounded-xl border border-border bg-white p-4">
                    <div className="flex items-center justify-between gap-3">
                      <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-black text-blue-700">{request.status}</span>
                      <span className="text-[11px] font-bold text-gray-400">{shortDate(request.created_at)}</span>
                    </div>
                    <p className="mt-3 font-black text-gray-950">{request.subject}</p>
                    <p className="mt-1 text-xs font-semibold text-gray-500">{request.restaurant_name || request.contact_name}</p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-border bg-card/70 p-5">
            <p className="text-sm font-bold text-muted-foreground">En prueba</p>
            <p className="mt-2 text-3xl font-black text-foreground">{trialClients}</p>
          </div>
          <div className="rounded-2xl border border-border bg-card/70 p-5">
            <p className="text-sm font-bold text-muted-foreground">Pruebas vencidas</p>
            <p className="mt-2 text-3xl font-black text-foreground">{expiredTrials}</p>
          </div>
          <div className="rounded-2xl border border-border bg-card/70 p-5">
            <p className="text-sm font-bold text-muted-foreground">Cuentas manuales</p>
            <p className="mt-2 text-3xl font-black text-foreground">{manualClients}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

import { createServiceClient } from '@/lib/supabase/server'
import { getTenantIdFromSlug } from '@/lib/tenant'
import { ShieldCheck, FileText, UserRound, Clock3 } from 'lucide-react'

interface Props {
  params: Promise<{ domain: string }>
}

type AuditLog = {
  id: string
  action: string
  actor_type: string
  actor_id: string | null
  actor_role: string | null
  entity_type: string
  entity_id: string | null
  reason: string | null
  metadata: Record<string, any> | null
  created_at: string
}

const actionLabel: Record<string, string> = {
  'sale.voided': 'Venta anulada',
  'order.cancelled': 'Pedido cancelado',
  'printer.created': 'Impresora creada',
  'printer.updated': 'Impresora actualizada',
  'printer.deleted': 'Impresora eliminada',
}

function formatActor(log: AuditLog) {
  if (log.actor_type === 'owner') return 'Dueño'
  if (log.actor_type === 'staff') return log.actor_role ? `Personal: ${log.actor_role}` : 'Personal'
  return 'Sistema'
}

export default async function AuditPage({ params }: Props) {
  const { domain: slug } = await params
  const tenantId = await getTenantIdFromSlug(slug)

  if (!tenantId) {
    return <div className="admin-empty">Restaurante no encontrado</div>
  }

  const supabase = createServiceClient()
  const { data } = await supabase
    .from('audit_logs')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(100)

  const logs = (data || []) as AuditLog[]
  const voidedSales = logs.filter(log => log.action === 'sale.voided').length
  const cancelledOrders = logs.filter(log => log.action === 'order.cancelled').length

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <p className="admin-eyebrow">Control</p>
          <h1 className="admin-title">Auditoria</h1>
          <p className="admin-subtitle">Historial de anulaciones y acciones delicadas del restaurante.</p>
        </div>
        <span className="hidden size-12 items-center justify-center rounded-xl bg-[#15130f] text-white sm:flex">
          <ShieldCheck className="size-5" />
        </span>
      </div>

      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        {[
          { label: 'Eventos guardados', value: logs.length.toString(), icon: FileText },
          { label: 'Ventas anuladas', value: voidedSales.toString(), icon: ShieldCheck },
          { label: 'Pedidos cancelados', value: cancelledOrders.toString(), icon: Clock3 },
        ].map(({ label, value, icon: Icon }) => (
          <article key={label} className="admin-card p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-black uppercase text-black/42">{label}</p>
              <Icon className="size-5 text-[#e43d30]" />
            </div>
            <p className="mt-4 text-3xl font-black text-[#15130f]">{value}</p>
          </article>
        ))}
      </div>

      <section className="admin-panel overflow-hidden">
        {logs.length === 0 ? (
          <div className="admin-empty m-5">
            <ShieldCheck className="mb-3 size-8 text-black/24" />
            <p className="font-black text-[#15130f]">Todavia no hay eventos sensibles</p>
            <p className="mt-1 text-sm font-semibold text-black/45">Cuando alguien anule una venta o cancele un pedido, quedara registrado aqui.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-white/50">
                <tr>
                  <th className="px-5 py-3 text-left">Fecha</th>
                  <th className="px-5 py-3 text-left">Accion</th>
                  <th className="px-5 py-3 text-left">Responsable</th>
                  <th className="px-5 py-3 text-left">Pedido</th>
                  <th className="px-5 py-3 text-left">Motivo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/8">
                {logs.map(log => (
                  <tr key={log.id} className="transition hover:bg-white/70">
                    <td className="whitespace-nowrap px-5 py-4 text-xs font-bold text-black/45">
                      {new Date(log.created_at).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                    <td className="px-5 py-4">
                      <span className="rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-black text-red-700">
                        {actionLabel[log.action] || log.action}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-2 font-black text-[#15130f]">
                        <UserRound className="size-4 text-black/35" />
                        {formatActor(log)}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-black text-[#15130f]">
                      {log.metadata?.order_number || log.entity_id || '-'}
                    </td>
                    <td className="min-w-80 px-5 py-4 font-semibold text-black/55">
                      {log.reason || 'Sin motivo escrito'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

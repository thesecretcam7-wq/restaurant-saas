export type SaleState = 'paid' | 'pending' | 'voided'
export type SalePerson = { name: string | null; type: string; id: string | null }
export type SaleReviewEvent = { action: string; at: string; by: string | null; reason: string | null }
export type SaleReviewTicket = {
  id: string; number: string; createdAt: string; updatedAt: string | null; table: number | null
  total: number; state: SaleState; payment: string; paymentGroup: 'cash' | 'card' | 'mixed' | 'other'
  waiter: string | null; registeredBy: SalePerson | null; paidBy: SalePerson | null
  unidentified: boolean; edited: boolean; events: SaleReviewEvent[]
  registeredViaSync: boolean
  items: { name: string; quantity: number; unitPrice: number; amount: number }[]
}
export const REVIEW_AUDIT_ACTIONS = ['order.registered','sale.registered_paid','sale.paid','sale.edited','sale.voided','order.cancelled','sale.payment_method_corrected']
export function normalizeSaleSearch(value: unknown) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
}
const cancelled = new Set(['cancelled','canceled','voided','deleted','anulado','cancelado'])
export function reviewSaleState(order: { payment_status?: string; status?: string }): SaleState {
  if (cancelled.has(normalizeSaleSearch(order.status)) || ['refunded','voided','cancelled'].includes(normalizeSaleSearch(order.payment_status))) return 'voided'
  return order.payment_status === 'paid' ? 'paid' : 'pending'
}
export function reviewPayment(value: unknown): Pick<SaleReviewTicket,'payment'|'paymentGroup'> {
  const method = normalizeSaleSearch(value)
  if (['cash','efectivo'].includes(method)) return { payment: 'Efectivo', paymentGroup: 'cash' }
  if (['stripe','card','tarjeta','wompi','tap_to_pay'].includes(method)) return { payment: 'Tarjeta', paymentGroup: 'card' }
  if (['mixed','mixto'].includes(method)) return { payment: 'Mixto', paymentGroup: 'mixed' }
  return { payment: method ? String(value) : 'Sin indicar', paymentGroup: 'other' }
}
const number = (value: unknown) => { const n = Number(value); return Number.isFinite(n) ? n : 0 }
function person(log: any): SalePerson | null {
  if (!log || !['staff','owner'].includes(log.actor_type)) return null
  return { name: String(log.actor_name || (log.actor_type === 'owner' ? 'Propietario' : '')).trim() || null,
    type: log.actor_type, id: log.actor_id || null }
}
export function reviewTicket(order: any, audit: any[] = []): SaleReviewTicket {
  const logs = audit.filter(log => log.entity_id === order.id)
    .sort((a,b) => String(a.created_at).localeCompare(String(b.created_at)))
  const registeredBy = person(logs.find(log => ['order.registered','sale.registered_paid'].includes(log.action)))
  const paidBy = person(logs.find(log => ['sale.paid','sale.registered_paid'].includes(log.action)))
  const rawWaiter = String(order.waiter_name || '').trim()
  const waiter = ['tpv','qr mesa','sistema','mostrador'].includes(normalizeSaleSearch(rawWaiter)) ? null : rawWaiter || null
  return {
    id: order.id, number: String(order.order_number || 'Sin número'), createdAt: order.created_at,
    updatedAt: order.updated_at || null, table: order.table_number == null ? null : number(order.table_number),
    total: number(order.total), state: reviewSaleState(order), ...reviewPayment(order.payment_method),
    waiter, registeredBy, paidBy, unidentified: !waiter && !registeredBy?.name && !paidBy?.name,
    registeredViaSync: logs.some(log => log.action === 'sale.registered_paid' && log.metadata?.source === 'pos-offline'),
    edited: logs.some(log => ['sale.edited','sale.payment_method_corrected'].includes(log.action)),
    events: logs.map(log => ({ action: log.action, at: log.created_at, by: person(log)?.name || null, reason: log.reason || null })),
    items: (Array.isArray(order.items) ? order.items : []).map((item: any) => {
      const qty = number(item.qty ?? item.quantity ?? 1)
      const quantity = qty > 0 ? qty : 1, unitPrice = number(item.price)
      return { name: String(item.name || 'Producto sin nombre'), quantity, unitPrice, amount: Math.round(quantity * unitPrice * 100) / 100 }
    }),
  }
}
export function salePeople(ticket: SaleReviewTicket) {
  return [...new Set([ticket.waiter,ticket.registeredBy?.name,ticket.paidBy?.name].filter((name): name is string => Boolean(name)))]
}
export function filterReviewTickets(tickets: SaleReviewTicket[], filters: { search: string; state: string; person: string; payment: string }) {
  const query = normalizeSaleSearch(filters.search)
  return tickets.filter(ticket => {
    if (filters.state !== 'all' && ticket.state !== filters.state) return false
    if (filters.payment !== 'all' && ticket.paymentGroup !== filters.payment) return false
    if (filters.person === '__unknown__' && !ticket.unidentified) return false
    if (filters.person && filters.person !== '__unknown__' && !salePeople(ticket).includes(filters.person)) return false
    return !query || normalizeSaleSearch([ticket.number,ticket.table == null ? '' : 'mesa '+ticket.table,
      ...ticket.items.map(item => item.name),...salePeople(ticket)].join(' ')).includes(query)
  })
}
export function reviewSummary(tickets: SaleReviewTicket[]) {
  const paid = tickets.filter(ticket => ticket.state === 'paid'), pending = tickets.filter(ticket => ticket.state === 'pending')
  const sum = (rows: SaleReviewTicket[]) => Math.round(rows.reduce((total,ticket) => total + ticket.total, 0) * 100) / 100
  return { paid: paid.length, paidTotal: sum(paid), pending: pending.length, pendingTotal: sum(pending),
    voided: tickets.filter(ticket => ticket.state === 'voided').length, unidentified: paid.filter(ticket => ticket.unidentified).length }
}

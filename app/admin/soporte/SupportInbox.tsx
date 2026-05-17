'use client'

import { useMemo, useState } from 'react'
import { Loader2, Save } from 'lucide-react'

export interface SupportRequest {
  id: string
  tenant_id: string | null
  restaurant_name: string | null
  contact_name: string
  contact_email: string
  contact_phone: string | null
  subject: string
  message: string
  status: 'open' | 'in_progress' | 'resolved' | 'closed'
  priority: 'low' | 'normal' | 'high' | 'urgent'
  owner_notes: string | null
  created_at: string
  tenants?: {
    organization_name: string | null
    slug: string | null
    subscription_plan: string | null
    status: string | null
  } | null
}

interface SupportInboxProps {
  initialRequests: SupportRequest[]
  tableReady: boolean
}

const statusLabels: Record<SupportRequest['status'], string> = {
  open: 'Pendiente',
  in_progress: 'En proceso',
  resolved: 'Resuelto',
  closed: 'Cerrado',
}

const priorityLabels: Record<SupportRequest['priority'], string> = {
  low: 'Baja',
  normal: 'Normal',
  high: 'Alta',
  urgent: 'Urgente',
}

export default function SupportInbox({ initialRequests, tableReady }: SupportInboxProps) {
  const [requests, setRequests] = useState(initialRequests)
  const [filter, setFilter] = useState<'all' | SupportRequest['status']>('all')
  const [savingId, setSavingId] = useState<string | null>(null)
  const [error, setError] = useState('')

  const filteredRequests = useMemo(() => {
    if (filter === 'all') return requests
    return requests.filter(request => request.status === filter)
  }, [filter, requests])

  const updateLocal = (id: string, patch: Partial<SupportRequest>) => {
    setRequests(prev => prev.map(request => request.id === id ? { ...request, ...patch } : request))
  }

  const saveRequest = async (request: SupportRequest) => {
    setError('')
    setSavingId(request.id)

    try {
      const response = await fetch('/api/support-requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: request.id,
          status: request.status,
          ownerNotes: request.owner_notes || '',
        }),
      })
      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'No se pudo guardar el cambio.')
      }
    } catch (err) {
      setError('No se pudo conectar con soporte.')
      console.error(err)
    } finally {
      setSavingId(null)
    }
  }

  if (!tableReady) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-900">
        <h2 className="text-lg font-black">Falta activar la tabla de soporte</h2>
        <p className="mt-2 text-sm font-semibold">
          Pega en Supabase la migracion `20260517_create_owner_support_requests.sql` para guardar preguntas de clientes.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card/70 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-black text-foreground">Preguntas y soporte</h2>
          <p className="text-sm font-semibold text-muted-foreground">Mensajes enviados desde la pagina de soporte.</p>
        </div>
        <select
          value={filter}
          onChange={(event) => setFilter(event.target.value as typeof filter)}
          className="h-11 rounded-xl border border-border bg-background px-3 text-sm font-bold text-foreground outline-none"
        >
          <option value="all">Todos</option>
          <option value="open">Pendientes</option>
          <option value="in_progress">En proceso</option>
          <option value="resolved">Resueltos</option>
          <option value="closed">Cerrados</option>
        </select>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
          {error}
        </div>
      )}

      {filteredRequests.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card/70 p-10 text-center">
          <p className="font-black text-foreground">No hay mensajes en esta vista</p>
          <p className="mt-2 text-sm font-semibold text-muted-foreground">Cuando un cliente escriba, aparecera aqui.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredRequests.map(request => (
            <article key={request.id} className="rounded-2xl border border-border bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
                      {statusLabels[request.status]}
                    </span>
                    <span className={`rounded-full px-3 py-1 text-xs font-black ${
                      request.priority === 'urgent' ? 'bg-red-50 text-red-700' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {priorityLabels[request.priority]}
                    </span>
                  </div>
                  <h3 className="mt-3 text-lg font-black text-gray-950">{request.subject}</h3>
                  <p className="mt-1 text-sm font-semibold text-gray-500">
                    {request.contact_name} · {request.contact_email}
                    {request.contact_phone ? ` · ${request.contact_phone}` : ''}
                  </p>
                  <p className="mt-1 text-xs font-bold text-gray-400">
                    {request.restaurant_name || request.tenants?.organization_name || 'Sin restaurante'} · {new Date(request.created_at).toLocaleString('es-CO')}
                  </p>
                </div>

                <div className="flex gap-2">
                  <select
                    value={request.status}
                    onChange={(event) => updateLocal(request.id, { status: event.target.value as SupportRequest['status'] })}
                    className="h-10 rounded-xl border border-gray-200 px-3 text-xs font-black text-gray-700 outline-none"
                  >
                    <option value="open">Pendiente</option>
                    <option value="in_progress">En proceso</option>
                    <option value="resolved">Resuelto</option>
                    <option value="closed">Cerrado</option>
                  </select>
                  <button
                    onClick={() => saveRequest(request)}
                    disabled={savingId === request.id}
                    className="inline-flex h-10 items-center gap-2 rounded-xl bg-gray-950 px-3 text-xs font-black text-white disabled:opacity-70"
                  >
                    {savingId === request.id ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                    Guardar
                  </button>
                </div>
              </div>

              <p className="mt-4 whitespace-pre-wrap rounded-xl bg-gray-50 p-4 text-sm font-semibold leading-6 text-gray-700">
                {request.message}
              </p>

              <label className="mt-4 block space-y-2">
                <span className="text-xs font-black uppercase tracking-wide text-gray-500">Notas internas</span>
                <textarea
                  value={request.owner_notes || ''}
                  onChange={(event) => updateLocal(request.id, { owner_notes: event.target.value })}
                  rows={3}
                  className="w-full resize-none rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 outline-none focus:border-[#ff6b1a]"
                  placeholder="Escribe seguimiento, llamada pendiente, respuesta enviada..."
                />
              </label>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}

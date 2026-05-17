'use client'

import { useEffect, useState } from 'react'
import { PLAN_PRICES } from '@/lib/subscription-pricing'

interface Invoice {
  id: string
  date: string
  amount: number
  plan: string
  status: 'paid' | 'pending' | 'failed'
  dueDate?: string
}

export default function InvoicesList({ tenantId }: { tenantId: string }) {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<'all' | 'paid' | 'pending' | 'failed'>('all')

  useEffect(() => {
    fetchInvoices()
  }, [])

  const fetchInvoices = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/customer/invoices?tenantId=${tenantId}`)
      if (!response.ok) throw new Error('Error cargando facturas')
      const data = await response.json()
      setInvoices(data.invoices || [])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
      // For demo, create sample invoices
      setInvoices([
        {
          id: 'INV-001',
          date: '2026-04-26',
          amount: PLAN_PRICES.basic,
          plan: 'Plan Básico',
          status: 'paid',
          dueDate: '2026-05-26',
        },
        {
          id: 'INV-002',
          date: '2026-03-26',
          amount: PLAN_PRICES.basic,
          plan: 'Plan Básico',
          status: 'paid',
          dueDate: '2026-04-26',
        },
        {
          id: 'INV-003',
          date: '2026-02-26',
          amount: PLAN_PRICES.basic,
          plan: 'Plan Básico',
          status: 'paid',
          dueDate: '2026-03-26',
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  const filteredInvoices = filterStatus === 'all'
    ? invoices
    : invoices.filter(inv => inv.status === filterStatus)

  const totalPaid = invoices
    .filter(inv => inv.status === 'paid')
    .reduce((sum, inv) => sum + inv.amount, 0)

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      paid: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      failed: 'bg-red-100 text-red-800',
    }
    const labels: Record<string, string> = {
      paid: 'Pagado',
      pending: 'Pendiente',
      failed: 'Fallido',
    }
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${colors[status]}`}>
        {labels[status]}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-600">Cargando facturas...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <div className="bg-white rounded-xl shadow p-6 border-l-4 border-blue-500">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p className="text-sm text-gray-600 mb-2">Total de Facturas</p>
            <p className="text-3xl font-bold text-gray-900">{invoices.length}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-2">Total Pagado (Este Año)</p>
            <p className="text-3xl font-bold text-green-600">${totalPaid.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-2">Próxima Facturación</p>
            <p className="text-lg font-semibold text-gray-900">
              {invoices.length > 0
                ? new Date(invoices[0].dueDate || invoices[0].date).toLocaleDateString('es-CO')
                : '-'}
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label className="text-sm font-semibold text-gray-700 mb-2 block">Filtrar por Estado</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Todos los estados</option>
              <option value="paid">Pagados</option>
              <option value="pending">Pendientes</option>
              <option value="failed">Fallidos</option>
            </select>
          </div>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        {filteredInvoices.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No hay facturas con el filtro seleccionado
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">Número</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">Fecha</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">Plan</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">Monto</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">Estado</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">Vencimiento</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredInvoices.map(invoice => (
                  <tr key={invoice.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-mono text-sm text-gray-900">{invoice.id}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {new Date(invoice.date).toLocaleDateString('es-CO')}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">{invoice.plan}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                      ${invoice.amount.toFixed(2)}
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(invoice.status)}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('es-CO') : '-'}
                    </td>
                    <td className="px-6 py-4">
                      <button className="text-blue-600 hover:text-blue-700 font-semibold text-sm">
                        Ver PDF
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Help Section */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">¿Necesitas ayuda?</h3>
        <p className="text-gray-700 mb-4">
          Si tienes preguntas sobre tus facturas o pagos, contacta a nuestro equipo de soporte a través del chat o envía un email a support@eccofood.com
        </p>
        <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold">
          Contactar Soporte
        </button>
      </div>
    </div>
  )
}

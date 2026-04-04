'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useEffect, useState } from 'react'

interface Customer {
  id: string
  name: string
  email: string | null
  phone: string
  orders_count: number
  total_spent: number
  last_order_date: string | null
  created_at: string
}

export default function ClientesPage() {
  const params = useParams()
  const domain = params.domain as string

  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const res = await fetch(`/api/customers?domain=${domain}`)
        if (!res.ok) throw new Error('Error fetching customers')
        const data = await res.json()
        setCustomers(data.customers || [])
      } catch (err) {
        console.error('Error fetching customers:', err)
      } finally {
        setLoading(false)
      }
    }

    if (domain) fetchCustomers()
  }, [domain])

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(search.toLowerCase()) ||
    customer.phone.includes(search) ||
    (customer.email && customer.email.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Clientes</h1>
        <p className="text-slate-600 mt-1">Gestiona y analiza tu base de clientes</p>
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <p className="text-sm font-medium text-slate-600">Total Clientes</p>
          <p className="text-3xl font-bold text-slate-900 mt-2">{customers.length}</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <p className="text-sm font-medium text-slate-600">Clientes Activos (30d)</p>
          <p className="text-3xl font-bold text-slate-900 mt-2">
            {customers.filter(c => {
              if (!c.last_order_date) return false
              const date = new Date(c.last_order_date)
              const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
              return date > thirtyDaysAgo
            }).length}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <p className="text-sm font-medium text-slate-600">Ingreso Promedio</p>
          <p className="text-3xl font-bold text-slate-900 mt-2">
            ${customers.length > 0
              ? Math.round(customers.reduce((sum, c) => sum + c.total_spent, 0) / customers.length)
              : 0
            }
          </p>
        </div>
      </div>

      {/* Search */}
      <div>
        <input
          type="text"
          placeholder="Buscar por nombre, teléfono o email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Customers Table */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-slate-600">Cargando clientes...</p>
            </div>
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <p className="text-slate-600 text-lg font-medium">
                {customers.length === 0 ? 'No hay clientes aún' : 'No se encontraron resultados'}
              </p>
              <p className="text-slate-500 text-sm">
                {customers.length === 0 ? 'Los clientes aparecerán cuando realicen compras' : 'Intenta con otro término de búsqueda'}
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Cliente</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Teléfono</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Email</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Órdenes</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Total Gastado</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Última Compra</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Miembro desde</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredCustomers.map(customer => (
                  <tr key={customer.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-medium text-slate-900">{customer.name}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{customer.phone}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {customer.email ? (
                        <a href={`mailto:${customer.email}`} className="text-blue-600 hover:text-blue-700">
                          {customer.email}
                        </a>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{customer.orders_count}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-slate-900">
                      ${customer.total_spent.toLocaleString('es-CO')}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {customer.last_order_date
                        ? new Date(customer.last_order_date).toLocaleDateString('es-CO')
                        : '—'}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {new Date(customer.created_at).toLocaleDateString('es-CO')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Tips */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <h3 className="font-semibold text-green-900 mb-2">💡 Datos Útiles</h3>
        <ul className="text-green-800 text-sm space-y-1">
          <li>• Contacta a clientes regulares con ofertas especiales</li>
          <li>• Identifica tus clientes VIP (mayor gastado)</li>
          <li>• Recupera clientes inactivos con promociones</li>
          <li>• Personaliza ofertas según el historial de compras</li>
        </ul>
      </div>
    </div>
  )
}

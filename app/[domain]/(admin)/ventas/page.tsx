'use client'

import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'

interface SalesData {
  totalRevenue: number
  totalOrders: number
  averageOrderValue: number
  paidOrders: number
  pendingPayments: number
  ordersThisMonth: number
  revenueThisMonth: number
  dailySales: { date: string; sales: number; orders: number }[]
  topProducts: { name: string; quantity: number; revenue: number }[]
}

export default function VentasPage() {
  const params = useParams()
  const domain = params.domain as string

  const [salesData, setSalesData] = useState<SalesData | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<'week' | 'month' | 'year'>('month')

  useEffect(() => {
    const fetchSalesData = async () => {
      try {
        const res = await fetch(`/api/analytics?domain=${domain}&period=${period}`)
        if (!res.ok) throw new Error('Error fetching analytics')
        const data = await res.json()
        setSalesData(data)
      } catch (err) {
        console.error('Error fetching sales data:', err)
      } finally {
        setLoading(false)
      }
    }

    if (domain) fetchSalesData()
  }, [domain, period])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Cargando analytics...</p>
        </div>
      </div>
    )
  }

  if (!salesData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-slate-600">Error al cargar datos de ventas</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Ventas y Analytics</h1>
          <p className="text-slate-600 mt-1">Analiza el desempeño de tu restaurante</p>
        </div>
        <div className="flex gap-2">
          {(['week', 'month', 'year'] as const).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                period === p
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {p === 'week' && 'Esta Semana'}
              {p === 'month' && 'Este Mes'}
              {p === 'year' && 'Este Año'}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <p className="text-sm font-medium text-slate-600">Ingresos Totales</p>
          <p className="text-3xl font-bold text-slate-900 mt-2">
            ${salesData.totalRevenue.toLocaleString('es-CO')}
          </p>
          <p className="text-xs text-slate-500 mt-2">
            +${salesData.revenueThisMonth.toLocaleString('es-CO')} este {period === 'week' ? 'semana' : period === 'month' ? 'mes' : 'año'}
          </p>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <p className="text-sm font-medium text-slate-600">Total Órdenes</p>
          <p className="text-3xl font-bold text-slate-900 mt-2">{salesData.totalOrders}</p>
          <p className="text-xs text-slate-500 mt-2">+{salesData.ordersThisMonth} este {period === 'week' ? 'semana' : period === 'month' ? 'mes' : 'año'}</p>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <p className="text-sm font-medium text-slate-600">Valor Promedio</p>
          <p className="text-3xl font-bold text-slate-900 mt-2">
            ${Math.round(salesData.averageOrderValue).toLocaleString('es-CO')}
          </p>
          <p className="text-xs text-slate-500 mt-2">Por orden</p>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <p className="text-sm font-medium text-slate-600">Pagos Pendientes</p>
          <p className="text-3xl font-bold text-red-600 mt-2">${salesData.pendingPayments.toLocaleString('es-CO')}</p>
          <p className="text-xs text-slate-500 mt-2">{salesData.totalOrders - salesData.paidOrders} órdenes</p>
        </div>
      </div>

      {/* Daily Sales Chart */}
      {salesData.dailySales && salesData.dailySales.length > 0 && (
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-4">Ventas por Día</h2>
          <div className="space-y-4">
            {salesData.dailySales.map(day => (
              <div key={day.date} className="flex items-center gap-4">
                <div className="w-24 text-sm text-slate-600">
                  {new Date(day.date).toLocaleDateString('es-CO', { month: 'short', day: 'numeric' })}
                </div>
                <div className="flex-1">
                  <div className="h-8 bg-slate-100 rounded relative overflow-hidden">
                    <div
                      className="h-full bg-blue-500 relative"
                      style={{
                        width: `${(day.sales / Math.max(...salesData.dailySales.map(d => d.sales), 1)) * 100}%`,
                      }}
                    >
                      <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-white">
                        ${day.sales.toLocaleString('es-CO')}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="w-20 text-right text-sm text-slate-600">{day.orders} órdenes</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top Products */}
      {salesData.topProducts && salesData.topProducts.length > 0 && (
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-4">Productos Más Vendidos</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">Producto</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">Cantidad Vendida</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">Ingresos</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">% del Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {salesData.topProducts.map((product, idx) => (
                  <tr key={idx}>
                    <td className="px-4 py-3 font-medium text-slate-900">{product.name}</td>
                    <td className="px-4 py-3 text-slate-600">{product.quantity}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      ${product.revenue.toLocaleString('es-CO')}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {Math.round((product.revenue / salesData.totalRevenue) * 100)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Status Overview */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Estado de Pagos</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Pagadas</span>
              <div className="flex items-center gap-2">
                <div className="w-32 h-2 bg-slate-100 rounded overflow-hidden">
                  <div
                    className="h-full bg-green-500"
                    style={{ width: `${(salesData.paidOrders / (salesData.totalOrders || 1)) * 100}%` }}
                  />
                </div>
                <span className="text-sm font-medium text-slate-900 w-12 text-right">
                  {Math.round((salesData.paidOrders / (salesData.totalOrders || 1)) * 100)}%
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Pendientes</span>
              <div className="flex items-center gap-2">
                <div className="w-32 h-2 bg-slate-100 rounded overflow-hidden">
                  <div
                    className="h-full bg-yellow-500"
                    style={{
                      width: `${((salesData.totalOrders - salesData.paidOrders) / (salesData.totalOrders || 1)) * 100}%`,
                    }}
                  />
                </div>
                <span className="text-sm font-medium text-slate-900 w-12 text-right">
                  {Math.round(((salesData.totalOrders - salesData.paidOrders) / (salesData.totalOrders || 1)) * 100)}%
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-bold text-blue-900 mb-4">💡 Recomendaciones</h3>
          <ul className="text-blue-800 text-sm space-y-2">
            <li>• Revisa pagos pendientes regularmente</li>
            <li>• Promociona tus productos más vendidos</li>
            <li>• Analiza tendencias semanales</li>
            <li>• Optimiza inventario según demanda</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

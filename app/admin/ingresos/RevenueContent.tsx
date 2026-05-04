'use client'

import { useEffect, useState } from 'react'
import { LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts'

interface RevenueStats {
  totalRevenue: number
  activeSubscriptions: number
  expiredSubscriptions: number
  monthlyRevenue: number
  last30DaysRevenue: number
  churnRate: number
  upcomingExpirations: Array<{
    id: string
    organization_name: string
    owner_email: string
    subscription_expires_at: string
    subscription_plan: string | null
    daysUntilExpiration: number
  }>
  revenueByPlan: Array<{
    plan: string
    count: number
    revenue: number
  }>
  monthlyTrend: Array<{
    month: string
    revenue: number
    activeCount: number
  }>
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

export default function RevenueContent() {
  const [stats, setStats] = useState<RevenueStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/ingresos/stats')
      if (!response.ok) throw new Error('Failed to fetch stats')
      const data = await response.json()
      setStats(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error fetching stats')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-600">Cargando datos...</div>
      </div>
    )
  }

  if (error || !stats) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-800 px-6 py-4 rounded-lg">
        Error: {error || 'No se pudieron cargar los datos'}
      </div>
    )
  }

  const mrrMonthly = stats.monthlyRevenue
  const mrr30Days = stats.last30DaysRevenue
  const totalSubs = stats.activeSubscriptions + stats.expiredSubscriptions

  return (
    <div className="space-y-8">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow p-6 border-l-4 border-blue-500">
          <div className="text-sm text-gray-600 font-medium">Ingresos Totales</div>
          <div className="text-3xl font-bold text-gray-900 mt-2">${stats.totalRevenue.toFixed(2)}</div>
          <div className="text-xs text-gray-500 mt-1">Todos los planes activos</div>
        </div>

        <div className="bg-white rounded-xl shadow p-6 border-l-4 border-green-500">
          <div className="text-sm text-gray-600 font-medium">Subscripciones Activas</div>
          <div className="text-3xl font-bold text-gray-900 mt-2">{stats.activeSubscriptions}</div>
          <div className="text-xs text-gray-500 mt-1">Con pago al día</div>
        </div>

        <div className="bg-white rounded-xl shadow p-6 border-l-4 border-orange-500">
          <div className="text-sm text-gray-600 font-medium">Subscripciones Vencidas</div>
          <div className="text-3xl font-bold text-gray-900 mt-2">{stats.expiredSubscriptions}</div>
          <div className="text-xs text-gray-500 mt-1">Requieren acción</div>
        </div>

        <div className="bg-white rounded-xl shadow p-6 border-l-4 border-red-500">
          <div className="text-sm text-gray-600 font-medium">Tasa de Pérdida (Churn)</div>
          <div className="text-3xl font-bold text-gray-900 mt-2">{stats.churnRate.toFixed(1)}%</div>
          <div className="text-xs text-gray-500 mt-1">Del total de subscripciones</div>
        </div>
      </div>

      {/* Revenue Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Revenue Trend */}
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Tendencia de Ingresos (6 meses)</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={stats.monthlyTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => typeof value === 'number' ? `$${value.toFixed(2)}` : value} />
              <Legend />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#3b82f6"
                strokeWidth={2}
                name="Ingresos ($)"
                dot={{ fill: '#3b82f6' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Revenue by Plan */}
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Ingresos por Plan</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={stats.revenueByPlan}
                dataKey="revenue"
                nameKey="plan"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label={({ name, value }) => `${name}: $${value.toFixed(0)}`}
              >
                {stats.revenueByPlan.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => typeof value === 'number' ? `$${value.toFixed(2)}` : value} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Plan Distribution */}
      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Distribución de Suscriptores por Plan</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={stats.revenueByPlan}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="plan" />
            <YAxis yAxisId="left" />
            <YAxis yAxisId="right" orientation="right" />
            <Tooltip />
            <Legend />
            <Bar yAxisId="left" dataKey="count" fill="#3b82f6" name="Cantidad de Suscriptores" />
            <Bar yAxisId="right" dataKey="revenue" fill="#10b981" name="Ingresos ($)" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Upcoming Expirations */}
      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Vencimientos Próximos (30 días)</h2>
        {stats.upcomingExpirations.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No hay vencimientos próximos en los próximos 30 días</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">Restaurante</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">Propietario</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">Plan</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">Vencimiento</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">Días Restantes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {stats.upcomingExpirations.map(exp => (
                  <tr key={exp.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-900">{exp.organization_name}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{exp.owner_email}</td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold">
                        {exp.subscription_plan}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {new Date(exp.subscription_expires_at).toLocaleDateString('es-CO')}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`font-semibold ${
                        exp.daysUntilExpiration <= 7 ? 'text-red-600' :
                        exp.daysUntilExpiration <= 14 ? 'text-orange-600' :
                        'text-green-600'
                      }`}>
                        {exp.daysUntilExpiration} días
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

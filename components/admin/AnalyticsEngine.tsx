'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { TrendingUp, Users, Clock, DollarSign } from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface AnalyticsData {
  totalSales: number;
  totalOrders: number;
  avgOrderValue: number;
  topProducts: any[];
  ordersPerHour: any[];
  paymentMethods: any[];
  avgPrepTime: number;
  topCustomers: any[];
  ordersTrend: any[];
}

export function AnalyticsEngine({ tenantId }: { tenantId: string }) {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month'>('month');

  useEffect(() => {
    fetchAnalytics();
  }, [tenantId, dateRange]);

  async function fetchAnalytics() {
    setLoading(true);
    try {
      let startDate = new Date();

      if (dateRange === 'today') {
        startDate.setHours(0, 0, 0, 0);
      } else if (dateRange === 'week') {
        startDate.setDate(startDate.getDate() - 7);
      } else if (dateRange === 'month') {
        startDate.setDate(startDate.getDate() - 30);
      }

      // Fetch orders
      const { data: orders } = await supabase
        .from('orders')
        .select('*')
        .eq('tenant_id', tenantId)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });

      if (!orders) return;

      // Calculate metrics
      const totalSales = orders.reduce((sum, o) => sum + Number(o.total), 0);
      const avgOrderValue = totalSales / orders.length;

      // Payment methods breakdown
      const paymentMethods = orders.reduce((acc: any, order: any) => {
        const method = order.payment_method || 'unknown';
        const existing = acc.find((p: any) => p.method === method);
        if (existing) {
          existing.count++;
          existing.total += Number(order.total);
        } else {
          acc.push({ method, count: 1, total: Number(order.total) });
        }
        return acc;
      }, []);

      // Orders per hour
      const ordersPerHour = orders.reduce((acc: any, order: any) => {
        const hour = new Date(order.created_at).getHours();
        const existing = acc.find((o: any) => o.hour === hour);
        if (existing) {
          existing.count++;
        } else {
          acc.push({ hour, count: 1 });
        }
        return acc;
      }, []);

      // Fetch order items for detailed analytics
      const { data: orderItems } = await supabase
        .from('order_items')
        .select('*')
        .eq('tenant_id', tenantId)
        .gte('created_at', startDate.toISOString());

      // Top products
      const topProducts = orderItems
        ? orderItems.reduce((acc: any, item: any) => {
            const existing = acc.find((p: any) => p.name === item.name);
            if (existing) {
              existing.quantity += item.quantity;
              existing.revenue += Number(item.price) * item.quantity;
            } else {
              acc.push({
                name: item.name,
                quantity: item.quantity,
                revenue: Number(item.price) * item.quantity,
              });
            }
            return acc;
          }, [])
            .sort((a: any, b: any) => b.quantity - a.quantity)
            .slice(0, 10)
        : [];

      // Average prep time
      const avgPrepTime = orderItems
        ? Math.round(
            orderItems
              .filter((item: any) => item.started_at && item.completed_at)
              .reduce((sum: number, item: any) => {
                const start = new Date(item.started_at).getTime();
                const end = new Date(item.completed_at).getTime();
                return sum + (end - start) / 1000 / 60; // Convert to minutes
              }, 0) /
              orderItems.filter((item: any) => item.started_at && item.completed_at).length
          )
        : 0;

      // Top customers
      const { data: customers } = await supabase
        .from('customers')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('total_spent', { ascending: false })
        .limit(5);

      // Orders trend: daily count + revenue for selected range
      const days = dateRange === 'today' ? 1 : dateRange === 'week' ? 7 : 30
      const ordersTrend = Array.from({ length: days }, (_, i) => {
        const d = new Date()
        d.setDate(d.getDate() - (days - 1 - i))
        const dayStr = d.toISOString().split('T')[0]
        const dayOrders = orders.filter(o => o.created_at.startsWith(dayStr))
        return {
          date: dayStr,
          label: days === 1
            ? `${d.getHours()}:00`
            : d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' }),
          orders: dayOrders.length,
          revenue: dayOrders.reduce((s, o) => s + Number(o.total), 0),
        }
      })

      setAnalytics({
        totalSales,
        totalOrders: orders.length,
        avgOrderValue,
        topProducts,
        ordersPerHour: ordersPerHour.sort((a: { hour: number; count: number }, b: { hour: number; count: number }) => a.hour - b.hour),
        paymentMethods,
        avgPrepTime,
        topCustomers: customers || [],
        ordersTrend,
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="p-8 text-center">Cargando analítica...</div>;
  }

  if (!analytics) {
    return <div className="p-8 text-center text-red-600">Error al cargar datos</div>;
  }

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Analítica</h1>
          <div className="flex gap-2">
            {(['today', 'week', 'month'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={`px-4 py-2 rounded-lg font-semibold transition ${
                  dateRange === range
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-100'
                }`}
              >
                {range === 'today' && 'Hoy'}
                {range === 'week' && 'Última Semana'}
                {range === 'month' && 'Último Mes'}
              </button>
            ))}
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-semibold">Ventas Totales</p>
                <p className="text-3xl font-bold text-gray-900">
                  ${analytics.totalSales.toFixed(2)}
                </p>
              </div>
              <DollarSign className="w-12 h-12 text-blue-600 opacity-10" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-semibold">Órdenes Totales</p>
                <p className="text-3xl font-bold text-gray-900">{analytics.totalOrders}</p>
              </div>
              <TrendingUp className="w-12 h-12 text-green-600 opacity-10" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-semibold">Valor Promedio</p>
                <p className="text-3xl font-bold text-gray-900">
                  ${analytics.avgOrderValue.toFixed(2)}
                </p>
              </div>
              <DollarSign className="w-12 h-12 text-orange-600 opacity-10" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-semibold">Tiempo Preparación</p>
                <p className="text-3xl font-bold text-gray-900">{analytics.avgPrepTime}min</p>
              </div>
              <Clock className="w-12 h-12 text-red-600 opacity-10" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Top Products */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Productos Más Vendidos</h2>
            <div className="space-y-3">
              {analytics.topProducts.slice(0, 5).map((product, i) => (
                <div key={i} className="flex justify-between items-center border-b pb-3">
                  <div>
                    <p className="font-semibold text-gray-900">{product.name}</p>
                    <p className="text-sm text-gray-600">{product.quantity} unidades</p>
                  </div>
                  <p className="font-bold text-blue-600">${product.revenue.toFixed(2)}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Payment Methods */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Métodos de Pago</h2>
            <div className="space-y-3">
              {analytics.paymentMethods.map((method, i) => (
                <div key={i} className="flex justify-between items-center border-b pb-3">
                  <div>
                    <p className="font-semibold text-gray-900 capitalize">{method.method}</p>
                    <p className="text-sm text-gray-600">{method.count} transacciones</p>
                  </div>
                  <p className="font-bold text-blue-600">${method.total.toFixed(2)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Orders Trend */}
        {analytics.ordersTrend.length > 1 && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Tendencia de Pedidos</h2>
              <span className="text-sm text-gray-500">
                {dateRange === 'today' ? 'Hoy por hora' : dateRange === 'week' ? 'Últimos 7 días' : 'Últimos 30 días'}
              </span>
            </div>
            <div className="flex items-end gap-1 h-32">
              {analytics.ordersTrend.map((day, i) => {
                const maxOrders = Math.max(...analytics.ordersTrend.map(d => d.orders), 1)
                const height = Math.max((day.orders / maxOrders) * 100, day.orders > 0 ? 8 : 2)
                const showLabel = analytics.ordersTrend.length <= 7 || i % Math.ceil(analytics.ordersTrend.length / 7) === 0
                return (
                  <div key={i} className="flex-1 flex flex-col items-center justify-end h-full group relative">
                    {day.orders > 0 && (
                      <div className="absolute bottom-full mb-1 hidden group-hover:flex flex-col items-center z-10">
                        <div className="bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap">
                          {day.orders} pedidos
                        </div>
                        <div className="w-2 h-2 bg-gray-900 rotate-45 -mt-1" />
                      </div>
                    )}
                    <div
                      className={`w-full rounded-t transition-all ${day.orders > 0 ? 'bg-blue-500 hover:bg-blue-600' : 'bg-gray-100'}`}
                      style={{ height: `${height}%` }}
                    />
                    {showLabel && (
                      <p className="text-[10px] text-gray-400 mt-1 truncate w-full text-center">{day.label}</p>
                    )}
                  </div>
                )
              })}
            </div>
            <div className="mt-4 grid grid-cols-3 gap-4 pt-4 border-t border-gray-100">
              <div className="text-center">
                <p className="text-xs text-gray-500">Día con más pedidos</p>
                <p className="font-bold text-gray-900 text-sm">
                  {analytics.ordersTrend.reduce((max, d) => d.orders > max.orders ? d : max, analytics.ordersTrend[0])?.label || '—'}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-500">Promedio diario</p>
                <p className="font-bold text-gray-900 text-sm">
                  {(analytics.ordersTrend.reduce((s, d) => s + d.orders, 0) / analytics.ordersTrend.filter(d => d.orders > 0).length || 0).toFixed(1)} pedidos
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-500">Días activos</p>
                <p className="font-bold text-gray-900 text-sm">
                  {analytics.ordersTrend.filter(d => d.orders > 0).length} / {analytics.ordersTrend.length}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Orders per Hour */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Órdenes por Hora</h2>
          <div className="grid grid-cols-12 gap-2 h-32">
            {analytics.ordersPerHour.map((data, i) => {
              const maxOrders = Math.max(...analytics.ordersPerHour.map((o) => o.count), 1);
              const height = (data.count / maxOrders) * 100;
              return (
                <div key={i} className="flex flex-col items-center">
                  <div className="w-full bg-gradient-to-t from-blue-600 to-blue-400 rounded-t" style={{ height: `${height}%` }}></div>
                  <p className="text-xs text-gray-600 mt-2">{data.hour}h</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Customers */}
        {analytics.topCustomers.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Clientes Principales</h2>
            <div className="space-y-3">
              {analytics.topCustomers.map((customer, i) => (
                <div key={i} className="flex justify-between items-center border-b pb-3">
                  <div>
                    <p className="font-semibold text-gray-900">{customer.name}</p>
                    <p className="text-sm text-gray-600">{customer.total_orders} órdenes</p>
                  </div>
                  <p className="font-bold text-blue-600">${customer.total_spent?.toFixed(2) || '0.00'}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

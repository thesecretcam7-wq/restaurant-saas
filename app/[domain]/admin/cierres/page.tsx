'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Check, AlertCircle, TrendingUp } from 'lucide-react';
import { getCurrencyByCountry, formatPriceWithCurrency } from '@/lib/currency';

interface CashClosing {
  id: string;
  staff_name: string;
  closed_at: string;
  cash_sales: number;
  card_sales: number;
  total_sales: number;
  expected_total: number;
  actual_cash_count: number;
  difference: number;
  is_balanced: boolean;
  transaction_count: number;
  orders_completed: number;
  notes?: string;
}

export default function CashClosingsPage() {
  const params = useParams();
  const slug = params.domain as string;
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [country, setCountry] = useState<string>('CO');
  const [closings, setClosings] = useState<CashClosing[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClosing, setSelectedClosing] = useState<CashClosing | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const supabase = createClient();

        // Resolver tenant ID y país - intenta por slug primero, luego por ID
        let tenantData = null;

        // Intenta por slug primero
        const { data: bySlug } = await supabase
          .from('tenants')
          .select('id, country')
          .eq('slug', slug)
          .single();

        if (bySlug) {
          tenantData = bySlug;
        } else {
          // Si no encontró por slug, intenta por ID (el slug podría ser un UUID)
          const { data: byId } = await supabase
            .from('tenants')
            .select('id, country')
            .eq('id', slug)
            .single();
          tenantData = byId;
        }

        const tid = tenantData?.id || slug;
        const tenantCountry = tenantData?.country || 'CO';
        setTenantId(tid);
        setCountry(tenantCountry);

        // Cargar cierres de caja
        const { data, error } = await supabase
          .from('cash_closings')
          .select('*')
          .eq('tenant_id', tid)
          .order('closed_at', { ascending: false })
          .limit(50);

        if (!error && data) {
          setClosings(data);
        }
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [slug]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600 font-medium">Cargando cierres de caja...</p>
        </div>
      </div>
    );
  }

  const currencyInfo = getCurrencyByCountry(country);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Cierres de Caja</h1>
        <p className="text-gray-500 mt-1">Histórico de cierres de caja diarios</p>
      </div>

      {/* Stats Summary */}
      {closings.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border p-5">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total de Cierres</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{closings.length}</p>
          </div>
          <div className="bg-white rounded-xl border p-5">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Cierres Balanceados</p>
            <p className="text-3xl font-bold text-green-600 mt-1">
              {closings.filter((c) => c.is_balanced).length}
            </p>
          </div>
          <div className="bg-white rounded-xl border p-5">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Ventas</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">
              {formatPriceWithCurrency(closings.reduce((sum, c) => sum + c.total_sales, 0), currencyInfo.code, currencyInfo.locale)}
            </p>
          </div>
          <div className="bg-white rounded-xl border p-5">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Diferencia Promedio</p>
            <p className={`text-3xl font-bold mt-1 ${closings.some((c) => Math.abs(c.difference) > 5) ? 'text-red-600' : 'text-green-600'}`}>
              {formatPriceWithCurrency((closings.reduce((sum, c) => sum + Math.abs(c.difference), 0) / closings.length), currencyInfo.code, currencyInfo.locale)}
            </p>
          </div>
        </div>
      )}

      {/* Closings List */}
      <div className="bg-white rounded-xl border overflow-hidden">
        {closings.length === 0 ? (
          <div className="flex items-center justify-center p-12">
            <div className="text-center">
              <p className="text-2xl mb-2">📭</p>
              <p className="text-gray-500 font-medium">No hay cierres de caja aún</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">Fecha y Hora</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">Personal</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">Transacciones</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600">Ventas en Efectivo</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600">Monto Esperado</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600">Monto Real</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600">Diferencia</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600">Estado</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {closings.map((closing) => (
                  <tr key={closing.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                      {new Date(closing.closed_at).toLocaleString('es-CO', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{closing.staff_name}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{closing.transaction_count}</td>
                    <td className="px-6 py-4 text-sm text-right text-gray-900 font-medium">
                      {formatPriceWithCurrency(closing.cash_sales, currencyInfo.code, currencyInfo.locale)}
                    </td>
                    <td className="px-6 py-4 text-sm text-right text-gray-900 font-medium">
                      {formatPriceWithCurrency(closing.expected_total, currencyInfo.code, currencyInfo.locale)}
                    </td>
                    <td className="px-6 py-4 text-sm text-right text-gray-900 font-medium">
                      {formatPriceWithCurrency(closing.actual_cash_count, currencyInfo.code, currencyInfo.locale)}
                    </td>
                    <td className={`px-6 py-4 text-sm text-right font-bold ${Math.abs(closing.difference) < 0.01 ? 'text-green-600' : Math.abs(closing.difference) > 5 ? 'text-red-600' : 'text-yellow-600'}`}>
                      {formatPriceWithCurrency(Math.abs(closing.difference), currencyInfo.code, currencyInfo.locale)}
                      {closing.difference > 0 && ' (Faltante)'}
                      {closing.difference < 0 && ' (Sobrante)'}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {closing.is_balanced ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                          <Check className="w-4 h-4" />
                          Balanceado
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
                          <AlertCircle className="w-4 h-4" />
                          Diferencia
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => setSelectedClosing(closing)}
                        className="text-blue-600 hover:text-blue-700 font-medium text-sm transition"
                      >
                        Ver detalles
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedClosing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Detalle del Cierre de Caja</h2>

            <div className="grid grid-cols-2 gap-6 mb-6">
              <div>
                <p className="text-sm text-gray-600 mb-1">Fecha y Hora</p>
                <p className="text-lg font-semibold text-gray-900">
                  {new Date(selectedClosing.closed_at).toLocaleString('es-CO')}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Personal</p>
                <p className="text-lg font-semibold text-gray-900">{selectedClosing.staff_name}</p>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg mb-6 space-y-4">
              <h3 className="font-semibold text-gray-900">Resumen de Ventas</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Ventas en Efectivo</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatPriceWithCurrency(selectedClosing.cash_sales, currencyInfo.code, currencyInfo.locale)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Ventas con Tarjeta</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatPriceWithCurrency(selectedClosing.card_sales, currencyInfo.code, currencyInfo.locale)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Transacciones</p>
                  <p className="text-2xl font-bold text-gray-900">{selectedClosing.transaction_count}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Órdenes Completadas</p>
                  <p className="text-2xl font-bold text-gray-900">{selectedClosing.orders_completed}</p>
                </div>
              </div>
            </div>

            <div className={`p-4 rounded-lg mb-6 ${selectedClosing.is_balanced ? 'bg-green-50' : 'bg-yellow-50'}`}>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Monto Esperado</p>
                  <p className="text-xl font-bold text-gray-900">
                    {formatPriceWithCurrency(selectedClosing.expected_total, currencyInfo.code, currencyInfo.locale)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Monto Real Contado</p>
                  <p className="text-xl font-bold text-gray-900">
                    {formatPriceWithCurrency(selectedClosing.actual_cash_count, currencyInfo.code, currencyInfo.locale)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Diferencia</p>
                  <p className={`text-xl font-bold ${selectedClosing.is_balanced ? 'text-green-600' : 'text-red-600'}`}>
                    {formatPriceWithCurrency(Math.abs(selectedClosing.difference), currencyInfo.code, currencyInfo.locale)}
                  </p>
                </div>
              </div>
            </div>

            {selectedClosing.notes && (
              <div className="bg-blue-50 p-4 rounded-lg mb-6">
                <p className="text-sm text-blue-600 font-medium mb-2">Notas</p>
                <p className="text-gray-700">{selectedClosing.notes}</p>
              </div>
            )}

            <button
              onClick={() => setSelectedClosing(null)}
              className="w-full px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

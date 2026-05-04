'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Brain, TrendingUp, Users, Clock } from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface ForecastData {
  hour: number;
  predictedOrders: number;
  predictedRevenue: number;
  demandTrend: 'low' | 'medium' | 'high';
  recommendedStaff: number;
}

interface Recommendation {
  name: string;
  quantity?: number;
  revenue?: number;
}

export function AIInsights({ tenantId }: { tenantId: string }) {
  const [forecast, setForecast] = useState<ForecastData[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [insights, setInsights] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'demand' | 'recommendations'>('demand');

  useEffect(() => {
    fetchAIData();
  }, [tenantId]);

  async function fetchAIData() {
    setLoading(true);
    try {
      const [forecastRes, recsRes] = await Promise.all([
        fetch(`/api/ai/demand-forecast?tenantId=${tenantId}`, { credentials: 'include' }),
        fetch(`/api/ai/recommendations?tenantId=${tenantId}&type=popular`, {
          credentials: 'include',
        }),
      ]);

      if (forecastRes.ok) {
        const data = await forecastRes.json();
        setForecast(data.forecast);
        setInsights(data.insights);
      }

      if (recsRes.ok) {
        const data = await recsRes.json();
        setRecommendations(data.recommendations);
      }
    } catch (error) {
      console.error('Error fetching AI data:', error);
    } finally {
      setLoading(false);
    }
  }

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'high':
        return 'bg-red-100 text-red-900';
      case 'medium':
        return 'bg-yellow-100 text-yellow-900';
      case 'low':
        return 'bg-green-100 text-green-900';
      default:
        return 'bg-gray-100 text-gray-900';
    }
  };

  if (loading) {
    return <div className="p-8 text-center">Cargando análisis de IA...</div>;
  }

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex items-center gap-3">
          <Brain className="w-8 h-8 text-purple-600" />
          <h1 className="text-3xl font-bold text-gray-900">Inteligencia Artificial</h1>
        </div>

        {/* Key Insights */}
        {insights && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-semibold">Promedio por Día</p>
                  <p className="text-3xl font-bold text-gray-900">{insights.avgOrdersPerDay}</p>
                  <p className="text-sm text-gray-600 mt-1">órdenes</p>
                </div>
                <TrendingUp className="w-12 h-12 text-blue-600 opacity-10" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-semibold">Ingresos Diarios Promedio</p>
                  <p className="text-3xl font-bold text-gray-900">${insights.avgRevenuePerDay}</p>
                </div>
                <Clock className="w-12 h-12 text-green-600 opacity-10" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div>
                <p className="text-gray-600 text-sm font-semibold">Horarios Pico</p>
                <p className="text-xl font-bold text-gray-900 mt-2">{insights.bestHours}</p>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-4 mb-8 border-b">
          <button
            onClick={() => setTab('demand')}
            className={`px-6 py-3 font-semibold border-b-2 transition ${
              tab === 'demand'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <Clock className="w-5 h-5 inline mr-2" /> Pronóstico de Demanda
          </button>
          <button
            onClick={() => setTab('recommendations')}
            className={`px-6 py-3 font-semibold border-b-2 transition ${
              tab === 'recommendations'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <TrendingUp className="w-5 h-5 inline mr-2" /> Recomendaciones
          </button>
        </div>

        {/* Demand Forecast Tab */}
        {tab === 'demand' && (
          <div className="grid gap-6">
            {/* Hourly Forecast */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Pronóstico por Hora</h2>
              <div className="space-y-3">
                {forecast.map((hour) => (
                  <div key={hour.hour} className="flex items-center gap-4 p-4 border rounded-lg">
                    <div className="w-12 font-bold text-gray-900 text-center">
                      {String(hour.hour).padStart(2, '0')}:00
                    </div>

                    <div className="flex-1">
                      <div className="flex justify-between mb-2">
                        <span className="text-sm font-semibold text-gray-700">
                          Órdenes Estimadas
                        </span>
                        <span className="text-sm font-bold text-gray-900">
                          {hour.predictedOrders}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{
                            width: `${(hour.predictedOrders / 10) * 100}%`,
                          }}
                        ></div>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-sm text-gray-600">Demanda</p>
                      <span
                        className={`inline-block px-3 py-1 rounded text-sm font-semibold ${getTrendColor(
                          hour.demandTrend
                        )}`}
                      >
                        {hour.demandTrend === 'high' && 'Alta'}
                        {hour.demandTrend === 'medium' && 'Media'}
                        {hour.demandTrend === 'low' && 'Baja'}
                      </span>
                    </div>

                    <div className="text-right">
                      <p className="text-sm text-gray-600">Personal Sugerido</p>
                      <p className="font-bold text-gray-900 flex items-center gap-1">
                        <Users className="w-4 h-4" /> {hour.recommendedStaff}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Peak Hours Summary */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Análisis de Horarios</h2>
              <div className="bg-blue-50 border-l-4 border-blue-600 p-4 rounded">
                <p className="text-blue-900">
                  <span className="font-bold">💡 Recomendación:</span> Aumenta tu personal durante
                  los horarios picos para mejorar la velocidad de servicio y reducir tiempos de
                  espera. Considera promociones en horarios de baja demanda para equilibrar la carga.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Recommendations Tab */}
        {tab === 'recommendations' && (
          <div>
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Productos Más Populares</h2>

              {recommendations.length === 0 ? (
                <p className="text-gray-600 text-center py-8">
                  No hay datos suficientes para hacer recomendaciones
                </p>
              ) : (
                <div className="space-y-4">
                  {recommendations.map((rec, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">{rec.name}</p>
                          {rec.quantity && (
                            <p className="text-sm text-gray-600">
                              {rec.quantity} unidades vendidas
                            </p>
                          )}
                        </div>
                      </div>
                      {rec.revenue && (
                        <p className="font-bold text-blue-600">${rec.revenue.toFixed(2)}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="bg-green-50 border-l-4 border-green-600 p-4 rounded mt-6">
                <p className="text-green-900">
                  <span className="font-bold">💡 Recomendación:</span> Destaca estos productos en
                  tu menú y promociona en puntos estratégicos del restaurante. Considera crear
                  combos o ofertas que incluyan estos artículos populares.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

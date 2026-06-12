'use client';

import { useEffect, useState } from 'react';
import { Brain, Clock, CreditCard, RefreshCw, Sparkles, Target, TrendingUp, Users } from 'lucide-react';

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
  action?: string;
}

interface Advice {
  title: string;
  text: string;
  priority: 'high' | 'medium' | 'low';
}

interface CurrencyInfo {
  code: string;
  locale: string;
}

function money(value: number, currency?: CurrencyInfo | null) {
  return new Intl.NumberFormat(currency?.locale || 'es-ES', {
    style: 'currency',
    currency: currency?.code || 'EUR',
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function priorityClass(priority: Advice['priority']) {
  if (priority === 'high') return 'border-red-200 bg-red-50 text-red-900';
  if (priority === 'medium') return 'border-amber-200 bg-amber-50 text-amber-900';
  return 'border-sky-200 bg-sky-50 text-sky-900';
}

function trendLabel(trend: ForecastData['demandTrend']) {
  if (trend === 'high') return 'Alta';
  if (trend === 'medium') return 'Media';
  return 'Baja';
}

export function AIInsights({ tenantId }: { tenantId: string }) {
  const [forecast, setForecast] = useState<ForecastData[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [insights, setInsights] = useState<any>(null);
  const [advice, setAdvice] = useState<Advice[]>([]);
  const [currency, setCurrency] = useState<CurrencyInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetchAIData();
  }, [tenantId]);

  async function fetchAIData() {
    setLoading(true);
    setError(null);
    try {
      const [forecastRes, recsRes] = await Promise.all([
        fetch(`/api/ai/demand-forecast?tenantId=${tenantId}`, { credentials: 'include', cache: 'no-store' }),
        fetch(`/api/ai/recommendations?tenantId=${tenantId}&type=popular`, {
          credentials: 'include',
          cache: 'no-store',
        }),
      ]);

      if (!forecastRes.ok) throw new Error('No se pudo cargar el analisis operativo');
      const forecastData = await forecastRes.json();
      setForecast(forecastData.forecast || []);
      setInsights(forecastData.insights || null);
      setAdvice(forecastData.advice || []);
      setCurrency(forecastData.currency || null);

      if (recsRes.ok) {
        const recData = await recsRes.json();
        setRecommendations(recData.recommendations || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar IA Insights');
    } finally {
      setLoading(false);
    }
  }

  const peakForecast = forecast
    .filter(item => item.predictedOrders > 0)
    .sort((a, b) => b.predictedOrders - a.predictedOrders)
    .slice(0, 6);

  if (loading) {
    return <div className="admin-empty m-6">Analizando ventas reales...</div>;
  }

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <p className="admin-eyebrow">IA Insights</p>
          <h1 className="admin-title">Recomendaciones para vender mejor</h1>
          <p className="admin-subtitle">
            Lectura accionable basada en tickets pagados, productos vendidos y horarios reales.
          </p>
        </div>
        <button
          type="button"
          onClick={fetchAIData}
          className="admin-button-secondary inline-flex items-center gap-2"
        >
          <RefreshCw className="size-4" />
          Actualizar
        </button>
      </div>

      {error && (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-800">
          {error}
        </div>
      )}

      {insights && (
        <section className="admin-dark-insight overflow-hidden rounded-[1.4rem] border border-black/10 bg-[#15130f] p-5 text-white shadow-2xl shadow-black/10 sm:p-7">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/10 px-3 py-1.5 text-xs font-black uppercase text-[#f4b860]">
            <Brain className="size-4" />
            Resumen del dueno
          </div>
          <div className="grid gap-4 lg:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-white/[0.07] p-4">
              <p className="text-xs font-black uppercase text-white/45">
                {insights.turnLabel || 'Ventas del turno'}
              </p>
              <p className="mt-3 text-3xl font-black">{money(insights.todayRevenue, currency)}</p>
              <p className="mt-1 text-sm font-bold text-white/60">{insights.todayOrders || 0} pedidos pagados</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.07] p-4">
              <p className="text-xs font-black uppercase text-white/45">Ticket medio</p>
              <p className="mt-3 text-3xl font-black">{money(insights.avgTicket, currency)}</p>
              <p className="mt-1 text-sm font-bold text-white/60">Hoy: {money(insights.todayAvgTicket, currency)}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.07] p-4">
              <p className="text-xs font-black uppercase text-white/45">Mejores horas</p>
              <p className="mt-3 text-2xl font-black">{insights.bestHours || 'Sin datos'}</p>
              <p className="mt-1 text-sm font-bold text-white/60">Segun ultimos 30 dias</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.07] p-4">
              <p className="text-xs font-black uppercase text-white/45">Pago digital</p>
              <p className="mt-3 text-3xl font-black">{insights.cardShare || 0}%</p>
              <p className="mt-1 text-sm font-bold text-white/60">Tarjeta / datáfono / Wompi</p>
            </div>
          </div>
        </section>
      )}

      <section className="mt-5 grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="admin-card p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="admin-eyebrow">Acciones sugeridas</p>
              <h2 className="text-2xl font-black text-[#15130f]">Que hacer ahora</h2>
            </div>
            <Sparkles className="size-6 text-[#e43d30]" />
          </div>

          {advice.length === 0 ? (
            <div className="admin-empty">Aun faltan ventas pagadas para generar recomendaciones fuertes.</div>
          ) : (
            <div className="space-y-3">
              {advice.map((item, index) => (
                <article key={`${item.title}-${index}`} className={`rounded-xl border p-4 ${priorityClass(item.priority)}`}>
                  <div className="flex items-start gap-3">
                    <Target className="mt-0.5 size-5 shrink-0" />
                    <div>
                      <h3 className="font-black">{item.title}</h3>
                      <p className="mt-1 text-sm font-semibold leading-6 opacity-80">{item.text}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        <div className="admin-card p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="admin-eyebrow">Productos reales</p>
              <h2 className="text-2xl font-black text-[#15130f]">Top ventas</h2>
            </div>
            <TrendingUp className="size-6 text-[#1c8b5f]" />
          </div>

          {recommendations.length === 0 ? (
            <div className="admin-empty">Sin productos vendidos suficientes.</div>
          ) : (
            <div className="space-y-3">
              {recommendations.slice(0, 6).map((rec, index) => (
                <article key={`${rec.name}-${index}`} className="rounded-xl border border-black/8 bg-white p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-black text-[#15130f]">{index + 1}. {rec.name}</p>
                      <p className="mt-1 text-sm font-bold text-black/50">
                        {rec.quantity || 0} unidades · {money(rec.revenue || 0, currency)}
                      </p>
                    </div>
                    <CreditCard className="size-5 shrink-0 text-black/25" />
                  </div>
                  {rec.action && <p className="mt-3 text-sm font-semibold leading-6 text-black/62">{rec.action}</p>}
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="mt-5 admin-card p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="admin-eyebrow">Demanda</p>
            <h2 className="text-2xl font-black text-[#15130f]">Horas donde conviene estar listo</h2>
          </div>
          <Clock className="size-6 text-[#6d5dfc]" />
        </div>

        {peakForecast.length === 0 ? (
          <div className="admin-empty">Todavia no hay suficientes ventas para detectar horarios pico.</div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {peakForecast.map((hour) => (
              <article key={hour.hour} className="rounded-xl border border-black/8 bg-white p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-2xl font-black text-[#15130f]">{String(hour.hour).padStart(2, '0')}:00</p>
                    <p className="mt-1 text-sm font-bold text-black/52">Demanda {trendLabel(hour.demandTrend).toLowerCase()}</p>
                  </div>
                  <Users className="size-5 text-black/28" />
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-lg bg-black/[0.035] p-3">
                    <p className="font-black text-black/45">Pedidos</p>
                    <p className="mt-1 text-lg font-black text-[#15130f]">{hour.predictedOrders}</p>
                  </div>
                  <div className="rounded-lg bg-black/[0.035] p-3">
                    <p className="font-black text-black/45">Personal</p>
                    <p className="mt-1 text-lg font-black text-[#15130f]">{hour.recommendedStaff}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

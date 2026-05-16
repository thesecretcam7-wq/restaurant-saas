'use client';

import { useEffect, useState } from 'react';
import { Search, Loader2, AlertCircle } from 'lucide-react';
import { useTouchDevice } from '@/lib/hooks/useTouchDevice';
import { getCurrencyByCountry, formatPriceWithCurrency } from '@/lib/currency';
import { EditSaleButton } from './EditSaleButton';
import { ReprintReceiptButton } from './ReprintReceiptButton';
import { NumericKeyboard } from './NumericKeyboard';

interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  total: number;
  payment_status: string;
  payment_method?: string | null;
  status: string;
  items: { name: string; qty?: number; quantity?: number; price: number }[];
  created_at: string;
  delivery_type: 'delivery' | 'pickup';
  table_number?: number | null;
}

interface POSOrderLookupProps {
  domain: string;
  country?: string;
  onOrderSelected: (order: Order) => void;
  onVoidOrder?: (order: Order) => Promise<boolean | void>;
}

export function POSOrderLookup({ domain, country = 'CO', onOrderSelected, onVoidOrder }: POSOrderLookupProps) {
  const isTouchDevice = useTouchDevice();
  const currencyInfo = getCurrencyByCountry(country);
  const [searchInput, setSearchInput] = useState('');
  const [results, setResults] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [voidingOrderId, setVoidingOrderId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const [showSearchKeyboard, setShowSearchKeyboard] = useState(false);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();

    setLoading(true);
    setError(null);
    setResults([]);

    try {
      const params = new URLSearchParams({ domain, limit: '200' });
      if (searchInput.trim()) params.set('order_number', searchInput.trim());

      const response = await fetch(`/api/orders/search?${params.toString()}`);

      if (!response.ok) {
        throw new Error('Error al buscar pedido');
      }

      const data = await response.json();
      setResults(data.orders || []);
      setSearched(true);

      if (!data.orders || data.orders.length === 0) {
        setError(searchInput.trim() ? 'No se encontraron pedidos con ese numero' : 'No hay ventas registradas hoy');
      }
    } catch (err) {
      setError('Error al buscar. Intenta de nuevo.');
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function loadTodayOrders() {
      setLoading(true);
      setError(null);
      setResults([]);

      try {
        const params = new URLSearchParams({ domain, limit: '200' });
        const response = await fetch(`/api/orders/search?${params.toString()}`);
        if (!response.ok) throw new Error('Error al cargar ventas del dia');

        const data = await response.json();
        if (cancelled) return;

        setResults(data.orders || []);
        setSearched(true);
        if (!data.orders || data.orders.length === 0) {
          setError('No hay ventas registradas hoy');
        }
      } catch (err) {
        if (!cancelled) {
          setError('Error al cargar ventas del dia');
          console.error('Today orders error:', err);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadTodayOrders();
    return () => {
      cancelled = true;
    };
  }, [domain]);

  const getPaymentStatusLabel = (status: string) => {
    const labels: { [key: string]: string } = {
      pending: '⏳ Pendiente',
      paid: '✅ Pagado',
      failed: '❌ Falló',
    };
    return labels[status] || status;
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'text-green-400 bg-green-950/30';
      case 'pending':
        return 'text-yellow-400 bg-yellow-950/30';
      case 'failed':
        return 'text-red-400 bg-red-950/30';
      default:
        return 'text-gray-400 bg-gray-950/30';
    }
  };

  const isOnlinePaymentOrder = (order: Order) => {
    const method = String(order.payment_method || '').toLowerCase();
    return ['wompi', 'stripe', 'online', 'card'].includes(method);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-CO', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  async function handleVoidOrder(order: Order) {
    if (!onVoidOrder) return;
    setVoidingOrderId(order.id);
    try {
      const voided = await onVoidOrder(order);
      if (voided !== false) {
        setResults((current) =>
          current.map((item) =>
            item.id === order.id ? { ...item, status: 'cancelled' } : item
          )
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo anular la venta');
    } finally {
      setVoidingOrderId(null);
    }
  }

  function handleOrderEdited(updatedOrder: Partial<Order> & { id: string }) {
    setResults((current) =>
      current.map((item) =>
        item.id === updatedOrder.id
          ? {
              ...item,
              ...updatedOrder,
              total: Number(updatedOrder.total ?? item.total),
              items: Array.isArray(updatedOrder.items) ? updatedOrder.items : item.items,
            }
          : item
      )
    );
  }

  return (
    <div className="w-full h-full flex flex-col bg-gradient-to-b from-gray-900 to-gray-950">
      {/* Search Bar */}
      <div className="p-4 border-b border-gray-800 shrink-0">
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="text"
            inputMode={isTouchDevice ? 'none' : 'search'}
            readOnly={isTouchDevice}
            value={searchInput}
            onPointerDown={(event) => {
              if (!isTouchDevice) return;
              event.preventDefault();
              setShowSearchKeyboard(true);
            }}
            onFocus={() => {
              if (isTouchDevice) setShowSearchKeyboard(true);
            }}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Buscar por número de pedido..."
            className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:bg-gray-800/50 text-sm"
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg px-4 py-2 font-semibold text-sm transition-all flex items-center gap-2"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
            Buscar
          </button>
        </form>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto">
        {error && (
          <div className="m-4 p-3 bg-red-950/30 border border-red-600/50 rounded-lg flex items-start gap-2 text-sm text-red-300">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {searched && results.length === 0 && !error && (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <div className="text-3xl mb-2">🔍</div>
              <p className="text-sm">No se encontraron resultados</p>
            </div>
          </div>
        )}

        {results.length > 0 && (
          <div className="p-3 space-y-2">
            {results.map((order) => {
              const canLoadForPayment =
                order.status !== 'cancelled' &&
                order.payment_status !== 'paid' &&
                !isOnlinePaymentOrder(order);

              return (
              <div
                key={order.id}
                onClick={() => {
                  if (canLoadForPayment) onOrderSelected(order);
                }}
                className={`bg-gray-800/50 border border-gray-700 hover:border-blue-600 hover:bg-gray-800 rounded-lg p-3 transition-all active:scale-95 ${
                  canLoadForPayment ? 'cursor-pointer' : 'cursor-default'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-white text-sm">
                      {order.order_number}
                    </p>
                    <p className="text-gray-400 text-xs truncate">
                      {order.customer_name}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="font-bold text-green-400 text-sm">
                      {formatPriceWithCurrency(order.total, currencyInfo.code, currencyInfo.locale)}
                    </span>
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded ${getPaymentStatusColor(
                        order.payment_status
                      )}`}
                    >
                      {getPaymentStatusLabel(order.payment_status)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                  <span>{formatDate(order.created_at)}</span>
                  <span>
                    {order.delivery_type === 'delivery'
                      ? '🚚 Entrega'
                      : '📍 Recojo'}
                  </span>
                </div>

                {order.items && order.items.length > 0 && (
                  <div className="border-t border-gray-700 pt-2 space-y-0.5">
                    {order.items.slice(0, 2).map((item, i) => (
                      <p key={i} className="text-gray-400 text-xs">
                        {(item.qty ?? item.quantity ?? 1)}× {item.name}
                      </p>
                    ))}
                    {order.items.length > 2 && (
                      <p className="text-gray-500 text-xs">
                        +{order.items.length - 2} más
                      </p>
                    )}
                  </div>
                )}

                {order.status === 'cancelled' ? (
                  <div className="w-full mt-2 rounded-lg bg-red-950/35 border border-red-500/35 py-2 text-center text-red-200 font-semibold text-xs">
                    Ticket anulado
                  </div>
                ) : order.payment_status === 'paid' ? (
                  <div className="mt-2 grid grid-cols-2 gap-2" onClick={(e) => e.stopPropagation()}>
                    <EditSaleButton
                      tenantId={domain}
                      orderId={order.id}
                      orderNumber={order.order_number}
                      onEdited={handleOrderEdited}
                    />
                    <ReprintReceiptButton tenantId={domain} orderId={order.id} orderNumber={order.order_number} />
                    <button
                      onClick={() => handleVoidOrder(order)}
                      disabled={!onVoidOrder || voidingOrderId === order.id}
                      className="col-span-2 rounded-lg bg-red-600 py-2 text-xs font-semibold text-white transition-all hover:bg-red-700 disabled:opacity-50"
                    >
                      {voidingOrderId === order.id ? 'Anulando...' : 'Anular venta'}
                    </button>
                  </div>
                ) : isOnlinePaymentOrder(order) ? (
                  <div className="w-full mt-2 rounded-lg bg-amber-500/15 border border-amber-400/35 py-2 text-center text-amber-100 font-semibold text-xs">
                    Pago Wompi en verificacion
                  </div>
                ) : (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onOrderSelected(order);
                    }}
                    className="w-full mt-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2 font-semibold text-xs transition-all"
                  >
                    Cargar para cobrar
                  </button>
                )}
              </div>
            );
            })}
          </div>
        )}

        {!searched && (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <div className="text-4xl mb-3">🔎</div>
              <p className="text-sm font-medium">
                Busca un número de pedido para cargar
              </p>
              <p className="text-xs text-gray-600 mt-1">
                Ej: ORD-1234 o solo 1234
              </p>
            </div>
          </div>
        )}
      </div>

      <NumericKeyboard
        isOpen={showSearchKeyboard}
        title="Numero de ticket"
        initialValue={Number(searchInput.replace(/\D/g, '')) || 0}
        onConfirm={(value) => {
          setSearchInput(value > 0 ? Math.trunc(value).toString() : '');
          setShowSearchKeyboard(false);
        }}
        onCancel={() => setShowSearchKeyboard(false)}
        allowDecimal={false}
      />
    </div>
  );
}

'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, Loader2, Pencil, Printer, Search, Trash2 } from 'lucide-react';
import { ReprintReceiptButton } from './ReprintReceiptButton';

interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  subtotal?: number;
  tax?: number;
  delivery_fee?: number;
  total: number;
  payment_status: string;
  payment_method?: string | null;
  status: string;
  items: { name: string; qty?: number; quantity?: number; price: number; menu_item_id?: string; item_id?: string; notes?: string | null }[];
  created_at: string;
  delivery_type: 'delivery' | 'pickup' | 'takeaway' | 'dine-in';
  table_number?: number | null;
}

interface POSOrderLookupProps {
  domain: string;
  onOrderSelected: (order: Order) => void;
  onVoidOrder?: (order: Order) => Promise<boolean | void>;
  onRemoveItem?: (order: Order, itemIndex: number) => Promise<Order | null | void>;
}

export function POSOrderLookup({ domain, onOrderSelected, onVoidOrder, onRemoveItem }: POSOrderLookupProps) {
  const [searchInput, setSearchInput] = useState('');
  const [results, setResults] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [voidingOrderId, setVoidingOrderId] = useState<string | null>(null);
  const [removingItem, setRemovingItem] = useState<{ orderId: string; itemIndex: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const [showingToday, setShowingToday] = useState(false);

  const loadTodayOrders = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/orders/search?domain=${domain}&today=1&limit=40`,
        { credentials: 'include', cache: 'no-store' }
      );

      if (!response.ok) throw new Error('Error al cargar tickets del dia');

      const data = await response.json();
      setResults(data.orders || []);
      setSearched(false);
      setShowingToday(true);
    } catch (err) {
      setError('No se pudieron cargar los tickets del dia.');
      console.error('Today orders error:', err);
    } finally {
      setLoading(false);
    }
  }, [domain]);

  useEffect(() => {
    loadTodayOrders();
  }, [loadTodayOrders]);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();

    if (!searchInput.trim()) {
      setError('Por favor ingresa un numero de pedido');
      return;
    }

    setLoading(true);
    setError(null);
    setResults([]);
    setShowingToday(false);

    try {
      const response = await fetch(
        `/api/orders/search?domain=${domain}&order_number=${encodeURIComponent(searchInput)}`,
        { credentials: 'include', cache: 'no-store' }
      );

      if (!response.ok) throw new Error('Error al buscar pedido');

      const data = await response.json();
      setResults(data.orders || []);
      setSearched(true);

      if (!data.orders || data.orders.length === 0) {
        setError('No se encontraron pedidos con ese numero');
      }
    } catch (err) {
      setError('Error al buscar. Intenta de nuevo.');
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleVoidOrder(order: Order) {
    if (!onVoidOrder) return;
    setVoidingOrderId(order.id);
    try {
      const voided = await onVoidOrder(order);
      if (voided !== false) {
        setResults((current) =>
          current.map((item) => item.id === order.id ? { ...item, status: 'cancelled' } : item)
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo anular la venta');
    } finally {
      setVoidingOrderId(null);
    }
  }

  async function handleRemoveItem(order: Order, itemIndex: number) {
    if (!onRemoveItem) return;
    if ((order.items || []).length <= 1) {
      setError('No puedes quitar el ultimo producto. Anula el ticket completo.');
      return;
    }

    setRemovingItem({ orderId: order.id, itemIndex });
    setError(null);
    try {
      const updatedOrder = await onRemoveItem(order, itemIndex);
      if (updatedOrder) {
        setResults((current) =>
          current.map((item) => item.id === order.id ? { ...item, ...updatedOrder } : item)
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo quitar el producto');
    } finally {
      setRemovingItem(null);
    }
  }

  const getPaymentStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: 'Pendiente',
      paid: 'Pagado',
      failed: 'Fallo',
    };
    return labels[status] || status;
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'text-green-300 bg-green-950/35 border-green-500/25';
      case 'pending':
        return 'text-yellow-300 bg-yellow-950/35 border-yellow-500/25';
      case 'failed':
        return 'text-red-300 bg-red-950/35 border-red-500/25';
      default:
        return 'text-gray-300 bg-gray-950/35 border-gray-600/25';
    }
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

  const formatMoney = (value: number) => `$ ${Number(value || 0).toLocaleString('es-CO')}`;

  return (
    <div className="flex h-full w-full flex-col bg-gradient-to-b from-gray-900 to-gray-950">
      <div className="shrink-0 border-b border-gray-800 p-4">
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Buscar por numero de pedido..."
            className="min-w-0 flex-1 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white outline-none placeholder:text-gray-500 focus:border-blue-500 focus:bg-gray-800/50"
          />
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Buscar
          </button>
        </form>
        {showingToday && (
          <div className="mt-3 flex items-center justify-between gap-2 text-xs">
            <span className="font-semibold text-gray-400">
              Tickets de hoy: <strong className="text-white">{results.length}</strong>
            </span>
            <button
              type="button"
              onClick={loadTodayOrders}
              disabled={loading}
              className="rounded-lg border border-gray-700 px-2 py-1 font-bold text-gray-300 transition hover:border-blue-500 hover:text-white disabled:opacity-50"
            >
              Actualizar
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {error && (
          <div className="m-4 flex items-start gap-2 rounded-lg border border-red-600/50 bg-red-950/30 p-3 text-sm text-red-300">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {loading && results.length === 0 && (
          <div className="flex h-full items-center justify-center text-gray-500">
            <div className="text-center">
              <Loader2 className="mx-auto mb-3 h-7 w-7 animate-spin text-blue-400" />
              <p className="text-sm">Cargando tickets...</p>
            </div>
          </div>
        )}

        {searched && results.length === 0 && !error && !loading && (
          <div className="flex h-full items-center justify-center text-gray-500">
            <p className="text-sm">No se encontraron resultados</p>
          </div>
        )}

        {results.length > 0 && (
          <div className="space-y-2 p-3">
            {results.map((order) => (
              <div
                key={order.id}
                className="rounded-lg border border-gray-700 bg-gray-800/50 p-3 transition-all hover:border-blue-600 hover:bg-gray-800"
              >
                <button type="button" onClick={() => onOrderSelected(order)} className="block w-full text-left">
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-white">{order.order_number}</p>
                      <p className="truncate text-xs text-gray-400">{order.customer_name}</p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span className="text-sm font-bold text-green-400">{formatMoney(order.total)}</span>
                      <span className={`rounded border px-2 py-0.5 text-xs font-semibold ${getPaymentStatusColor(order.payment_status)}`}>
                        {getPaymentStatusLabel(order.payment_status)}
                      </span>
                    </div>
                  </div>

                  <div className="mb-2 flex items-center justify-between text-xs text-gray-500">
                    <span>{formatDate(order.created_at)}</span>
                    <span>{order.delivery_type === 'delivery' ? 'Entrega' : order.delivery_type === 'dine-in' ? `Mesa ${order.table_number || ''}` : 'Recojo'}</span>
                  </div>
                </button>

                {order.items && order.items.length > 0 && (
                  <div className="space-y-1 border-t border-gray-700 pt-2">
                    {order.items.map((item, i) => (
                      <div key={`${order.id}-${i}`} className="flex items-center justify-between gap-2 rounded-md px-1 py-0.5 text-xs text-gray-400 hover:bg-gray-900/70">
                        <span className="min-w-0 flex-1 truncate">
                          {(item.qty ?? item.quantity ?? 1)}x {item.name}
                        </span>
                        <span className="shrink-0 text-gray-500">{formatMoney(Number(item.price || 0))}</span>
                        {onRemoveItem && order.status !== 'cancelled' && (
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(order, i)}
                            disabled={removingItem?.orderId === order.id && removingItem.itemIndex === i}
                            className="grid h-7 w-7 place-items-center rounded-md border border-red-500/20 text-red-300 transition hover:bg-red-500/15 hover:text-red-100 disabled:opacity-40"
                            title="Quitar producto del recibo"
                          >
                            {removingItem?.orderId === order.id && removingItem.itemIndex === i
                              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              : <Trash2 className="h-3.5 w-3.5" />}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {order.status === 'cancelled' ? (
                  <div className="mt-2 w-full rounded-lg border border-red-500/35 bg-red-950/35 py-2 text-center text-xs font-semibold text-red-200">
                    Ticket anulado
                  </div>
                ) : order.payment_status === 'paid' ? (
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    <ReprintReceiptButton tenantId={domain} orderId={order.id} orderNumber={order.order_number} />
                    <button
                      type="button"
                      onClick={() => onOrderSelected(order)}
                      className="inline-flex items-center justify-center gap-1 rounded-lg bg-cyan-600 px-2 py-2 text-xs font-black text-white transition hover:bg-cyan-500"
                      title="Cargar al carrito para quitar o agregar productos"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleVoidOrder(order)}
                      disabled={!onVoidOrder || voidingOrderId === order.id}
                      className="inline-flex items-center justify-center rounded-lg bg-red-600 px-3 py-2 text-xs font-black text-white transition hover:bg-red-700 disabled:opacity-50"
                    >
                      {voidingOrderId === order.id ? 'Anulando...' : 'Anular venta'}
                    </button>
                  </div>
                ) : (
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => onOrderSelected(order)}
                      className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-black text-white transition-all hover:bg-blue-700"
                    >
                      Cobrar
                    </button>
                    <button
                      type="button"
                      onClick={() => onOrderSelected(order)}
                      className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-600 px-3 py-2 text-xs font-black text-gray-200 transition hover:border-blue-500 hover:text-white"
                      title="Cargar, modificar y cobrar"
                    >
                      <Printer className="h-3.5 w-3.5" />
                      Modificar
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {!searched && !showingToday && !loading && (
          <div className="flex h-full items-center justify-center text-gray-500">
            <div className="text-center">
              <p className="text-sm font-medium">Busca un numero de pedido para cargar</p>
              <p className="mt-1 text-xs text-gray-600">Ej: ORD-1234 o solo 1234</p>
            </div>
          </div>
        )}

        {showingToday && results.length === 0 && !error && !loading && (
          <div className="flex h-full items-center justify-center text-gray-500">
            <div className="px-6 text-center">
              <p className="text-sm font-medium">No hay tickets registrados hoy</p>
              <p className="mt-1 text-xs text-gray-600">Tambien puedes buscar por numero de pedido.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

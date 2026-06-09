'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, Clock, Loader2, PackageCheck, RefreshCw, Truck, UserRound } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

type ServiceItem = {
  id: string;
  order_id: string;
  name: string;
  quantity: number;
  price: number;
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivered' | 'cancelled';
  notes?: string | null;
  prepared_by?: string | null;
  completed_at?: string | null;
  created_at: string;
  updated_at?: string | null;
  requires_kitchen?: boolean | null;
  orders: {
    order_number: string;
    table_number: number | null;
    waiter_name: string | null;
    created_at: string;
    status: string;
    delivery_type: string | null;
    customer_name: string | null;
    customer_phone: string | null;
  } | null;
};

type ServiceOrder = {
  orderId: string;
  orderNumber: string;
  tableNumber: number | null;
  waiterName: string | null;
  deliveryType: string | null;
  customerName: string | null;
  createdAt: string;
  items: ServiceItem[];
};

function useElapsedMinutes(createdAt: string) {
  const [minutes, setMinutes] = useState(() =>
    Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000)
  );

  useEffect(() => {
    const timer = window.setInterval(() => {
      setMinutes(Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000));
    }, 30000);

    return () => window.clearInterval(timer);
  }, [createdAt]);

  return minutes;
}

function groupItemsByOrder(items: ServiceItem[]) {
  const grouped = new Map<string, ServiceOrder>();

  items.forEach((item) => {
    if (!grouped.has(item.order_id)) {
      grouped.set(item.order_id, {
        orderId: item.order_id,
        orderNumber: item.orders?.order_number || `#${item.order_id.slice(0, 8)}`,
        tableNumber: item.orders?.table_number ?? null,
        waiterName: item.orders?.waiter_name ?? null,
        deliveryType: item.orders?.delivery_type ?? null,
        customerName: item.orders?.customer_name ?? null,
        createdAt: item.orders?.created_at || item.created_at,
        items: [],
      });
    }

    grouped.get(item.order_id)!.items.push(item);
  });

  return Array.from(grouped.values()).sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
}

function restoreItems(currentItems: ServiceItem[], previousItems: ServiceItem[]) {
  const previousIds = new Set(previousItems.map((item) => item.id));

  return [...currentItems.filter((item) => !previousIds.has(item.id)), ...previousItems].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
}

function OrderDeliveryCard({
  order,
  updatingItemIds,
  onDeliverItems,
}: {
  order: ServiceOrder;
  updatingItemIds: Set<string>;
  onDeliverItems: (items: ServiceItem[]) => void;
}) {
  const minutes = useElapsedMinutes(order.createdAt);
  const meta = order.deliveryType === 'delivery'
    ? 'Domicilio'
    : order.deliveryType === 'pickup'
      ? 'Recoger'
      : order.tableNumber
        ? `Mesa ${order.tableNumber}`
        : 'Sala';
  const canDeliverAll = order.items.some((item) => !updatingItemIds.has(item.id));

  return (
    <article className="overflow-hidden rounded-xl border border-white/10 bg-slate-900 shadow-xl shadow-black/20">
      <div className="border-b border-white/10 bg-slate-950 px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate text-lg font-black text-white">{order.orderNumber}</p>
              <span className="rounded-md border border-cyan-300/20 bg-cyan-400/10 px-2 py-1 text-[11px] font-black uppercase tracking-wide text-cyan-100">
                {meta}
              </span>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-400">
              {order.customerName && (
                <span className="inline-flex items-center gap-1">
                  <UserRound className="size-3.5" />
                  {order.customerName}
                </span>
              )}
              {order.waiterName && <span>{order.waiterName}</span>}
            </div>
          </div>
          <div className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-amber-300/25 bg-amber-400/10 px-2.5 py-1.5 text-sm font-black text-amber-100">
            <Clock className="size-4" />
            {minutes}m
          </div>
        </div>
      </div>

      <div className="space-y-2 p-3">
        {order.items.map((item) => {
          const updating = updatingItemIds.has(item.id);

          return (
            <div key={item.id} className="flex items-start gap-2 rounded-lg border border-white/10 bg-white/[0.05] p-2.5">
              <span className="shrink-0 rounded-md bg-white/10 px-2 py-1 text-sm font-black text-white">
                x{item.quantity}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold leading-snug text-white">{item.name}</p>
                {item.notes && <p className="mt-1 text-xs font-semibold text-amber-200">{item.notes}</p>}
              </div>
              <button
                type="button"
                disabled={updating}
                onClick={() => onDeliverItems([item])}
                className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-emerald-500 px-3 text-xs font-black text-white shadow-lg shadow-emerald-950/30 transition hover:bg-emerald-400 active:scale-95 disabled:opacity-60"
              >
                {updating ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
                Entregado
              </button>
            </div>
          );
        })}
      </div>

      <div className="border-t border-white/10 p-3">
        <button
          type="button"
          disabled={!canDeliverAll}
          onClick={() => onDeliverItems(order.items)}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-cyan-500 text-sm font-black uppercase tracking-wide text-slate-950 transition hover:bg-cyan-300 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <PackageCheck className="size-5" />
          Entregar todo
        </button>
      </div>
    </article>
  );
}

export function ServiceDeliveryScreen({ tenantId }: { tenantId: string }) {
  const [items, setItems] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatingItemIds, setUpdatingItemIds] = useState<Set<string>>(new Set());
  const firstFetchDone = useRef(false);

  const fetchItems = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true);

    try {
      const res = await fetch(`/api/order-items?tenantId=${tenantId}&status=ready&requiresKitchen=false`);
      if (!res.ok) throw new Error('No se pudieron cargar las entregas');
      const data: ServiceItem[] = await res.json();
      setItems(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar las entregas');
    } finally {
      setLoading(false);
      setRefreshing(false);
      firstFetchDone.current = true;
    }
  }, [tenantId]);

  useEffect(() => {
    fetchItems();

    const subscription = supabase
      .channel(`service-delivery:${tenantId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'order_items', filter: `tenant_id=eq.${tenantId}` },
        () => fetchItems(true)
      )
      .subscribe();

    const interval = window.setInterval(() => fetchItems(true), 5000);

    return () => {
      window.clearInterval(interval);
      subscription.unsubscribe();
    };
  }, [fetchItems, tenantId]);

  const orders = useMemo(() => groupItemsByOrder(items), [items]);

  const setItemsUpdating = useCallback((itemIds: string[], updating: boolean) => {
    setUpdatingItemIds((current) => {
      const next = new Set(current);
      itemIds.forEach((itemId) => {
        if (updating) next.add(itemId);
        else next.delete(itemId);
      });
      return next;
    });
  }, []);

  const markDelivered = useCallback(async (targetItems: ServiceItem[]) => {
    const itemIds = targetItems.map((item) => item.id);
    if (itemIds.length === 0) return;

    const itemIdSet = new Set(itemIds);
    const deliveredBy = sessionStorage.getItem('staff_name') || 'Camarero';

    setItemsUpdating(itemIds, true);
    setItems((current) => current.filter((item) => !itemIdSet.has(item.id)));

    try {
      const res = await fetch('/api/order-items', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          itemIds,
          status: 'delivered',
          prepared_by: deliveredBy,
          syncOrderStatus: false,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || 'No se pudo confirmar la entrega');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo confirmar la entrega');
      setItems((current) => restoreItems(current, targetItems));
    } finally {
      setItemsUpdating(itemIds, false);
    }
  }, [setItemsUpdating, tenantId]);

  if (loading && !firstFetchDone.current) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <div className="text-center">
          <Loader2 className="mx-auto size-10 animate-spin text-cyan-300" />
          <p className="mt-4 text-sm font-black uppercase tracking-wide text-slate-300">Cargando entregas</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-slate-950/95 px-4 py-3 shadow-xl shadow-black/20 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl border border-cyan-300/20 bg-cyan-400/10 text-cyan-100">
              <Truck className="size-5" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-lg font-black tracking-wide">Entregas de sala</p>
              <p className="text-xs font-semibold text-slate-400">{items.length} productos listos</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => fetchItems()}
            className="grid size-10 place-items-center rounded-lg border border-white/10 bg-white/10 text-white transition hover:bg-white/20"
            title="Actualizar"
            aria-label="Actualizar"
          >
            <RefreshCw className={`size-5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </header>

      <section className="mx-auto max-w-5xl space-y-3 p-3 sm:p-4">
        {error && (
          <div className="rounded-lg border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-100">
            {error}
          </div>
        )}

        {orders.length === 0 ? (
          <div className="mt-14 rounded-xl border border-white/10 bg-white/[0.04] px-6 py-14 text-center">
            <PackageCheck className="mx-auto size-12 text-slate-500" />
            <p className="mt-4 text-lg font-black text-white">Sin entregas pendientes</p>
            <p className="mt-1 text-sm font-semibold text-slate-500">Las bebidas y productos directos apareceran aqui.</p>
          </div>
        ) : (
          orders.map((order) => (
            <OrderDeliveryCard
              key={order.orderId}
              order={order}
              updatingItemIds={updatingItemIds}
              onDeliverItems={markDelivered}
            />
          ))
        )}
      </section>
    </main>
  );
}

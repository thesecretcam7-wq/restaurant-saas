'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, BellRing, CheckCircle2, Clock, Loader2, PackageCheck, RefreshCw, Truck, UserRound, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { formatStaffOrderNumber } from '@/lib/order-display';
import { useServiceReadyAlert } from '@/lib/hooks/useServiceReadyAlert';

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
    display_number?: number | string | null;
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

type ServiceDeliveryTheme = {
  isLightTheme?: boolean;
  primaryColor?: string;
  accentColor?: string;
  backgroundColor?: string;
  surfaceColor?: string;
  buttonPrimaryColor?: string;
  textPrimaryColor?: string;
  textSecondaryColor?: string;
  borderColor?: string;
};

type DeliveryBrand = {
  isLightTheme: boolean;
  primary: string;
  accent: string;
  background: string;
  surface: string;
  soft: string;
  button: string;
  buttonText: string;
  text: string;
  muted: string;
  border: string;
};

function hexToRgb(hex: string) {
  const normalized = hex.replace('#', '').trim();
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return null;
  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16),
  };
}

function isDark(hex: string) {
  const rgb = hexToRgb(hex);
  if (!rgb) return true;
  return (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255 < 0.55;
}

function readableText(background: string, dark = '#15130f', light = '#ffffff') {
  return isDark(background) ? light : dark;
}

function useDeliveryBrand(theme?: ServiceDeliveryTheme) {
  return useMemo<DeliveryBrand>(() => {
    const isLightTheme = theme?.isLightTheme !== false;
    const primary = theme?.primaryColor || (isLightTheme ? '#ff5a00' : '#D4AF37');
    const background = theme?.backgroundColor || (isLightTheme ? '#f4f4f5' : '#0B0E14');
    const surface = theme?.surfaceColor || (isLightTheme ? '#ffffff' : '#1A1F2C');
    const button = theme?.buttonPrimaryColor || primary;

    return {
      isLightTheme,
      primary,
      accent: theme?.accentColor || (isLightTheme ? '#ff1f1f' : '#D35A37'),
      background,
      surface,
      soft: `${primary}14`,
      button,
      buttonText: readableText(button),
      text: theme?.textPrimaryColor || (isLightTheme ? '#07111f' : '#ffffff'),
      muted: theme?.textSecondaryColor || (isLightTheme ? 'rgba(7,17,31,.70)' : '#8b97a8'),
      border: theme?.borderColor || (isLightTheme ? 'rgba(7,17,31,.12)' : 'rgba(212,175,55,.18)'),
    };
  }, [theme]);
}

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
        orderNumber: formatStaffOrderNumber({
          display_number: item.orders?.display_number,
          order_number: item.orders?.order_number,
          id: item.order_id,
        }),
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
  brand,
}: {
  order: ServiceOrder;
  updatingItemIds: Set<string>;
  onDeliverItems: (items: ServiceItem[]) => void;
  brand: DeliveryBrand;
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
    <article className="overflow-hidden rounded-xl border shadow-xl shadow-black/10" style={{ backgroundColor: brand.surface, borderColor: brand.border }}>
      <div className="border-b px-4 py-3" style={{ backgroundColor: brand.isLightTheme ? '#ffffff' : '#07111f', borderColor: brand.border }}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate text-lg font-black" style={{ color: brand.text }}>{order.orderNumber}</p>
              <span className="rounded-md border px-2 py-1 text-[11px] font-black uppercase tracking-wide" style={{ backgroundColor: brand.soft, borderColor: brand.primary, color: brand.primary }}>
                {meta}
              </span>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs font-semibold" style={{ color: brand.muted }}>
              {order.customerName && (
                <span className="inline-flex items-center gap-1">
                  <UserRound className="size-3.5" />
                  {order.customerName}
                </span>
              )}
              {order.waiterName && <span>{order.waiterName}</span>}
            </div>
          </div>
          <div className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-sm font-black" style={{ backgroundColor: '#fef3c7', borderColor: '#f59e0b', color: '#92400e' }}>
            <Clock className="size-4" />
            {minutes}m
          </div>
        </div>
      </div>

      <div className="space-y-2 p-3">
        {order.items.map((item) => {
          const updating = updatingItemIds.has(item.id);

          return (
            <div key={item.id} className="flex items-start gap-2 rounded-lg border p-2.5" style={{ backgroundColor: brand.isLightTheme ? '#f8fafc' : 'rgba(255,255,255,0.06)', borderColor: brand.border }}>
              <span className="shrink-0 rounded-md px-2 py-1 text-sm font-black" style={{ backgroundColor: brand.soft, color: brand.text }}>
                x{item.quantity}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold leading-snug" style={{ color: brand.text }}>{item.name}</p>
                {item.notes && <p className="mt-1 text-xs font-semibold" style={{ color: brand.accent }}>{item.notes}</p>}
              </div>
              <button
                type="button"
                disabled={updating}
                onClick={() => onDeliverItems([item])}
                className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-3 text-xs font-black shadow-lg shadow-black/10 transition active:scale-95 disabled:opacity-60"
                style={{ backgroundColor: brand.button, color: brand.buttonText }}
              >
                {updating ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
                Entregado
              </button>
            </div>
          );
        })}
      </div>

      <div className="border-t p-3" style={{ borderColor: brand.border }}>
        <button
          type="button"
          disabled={!canDeliverAll}
          onClick={() => onDeliverItems(order.items)}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg text-sm font-black uppercase tracking-wide transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
          style={{ backgroundColor: brand.button, color: brand.buttonText }}
        >
          <PackageCheck className="size-5" />
          Entregar todo
        </button>
      </div>
    </article>
  );
}

export function ServiceDeliveryScreen({
  tenantId,
  tenantSlug,
  theme,
}: {
  tenantId: string;
  tenantSlug: string;
  theme?: ServiceDeliveryTheme;
}) {
  const [items, setItems] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatingItemIds, setUpdatingItemIds] = useState<Set<string>>(new Set());
  const firstFetchDone = useRef(false);
  const brand = useDeliveryBrand(theme);
  const { alertsReady, trackReadyItems, triggerServiceAlert, unlockAlerts } = useServiceReadyAlert();

  const fetchItems = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true);

    try {
      const res = await fetch(`/api/order-items?tenantId=${tenantId}&status=ready`);
      if (!res.ok) throw new Error('No se pudieron cargar las entregas');
      const data: ServiceItem[] = await res.json();
      trackReadyItems(data);
      setItems(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar las entregas');
    } finally {
      setLoading(false);
      setRefreshing(false);
      firstFetchDone.current = true;
    }
  }, [tenantId, trackReadyItems]);

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
          deliveryConfirmation: true,
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

  const deliveryContent = (
    <DeliveryOrdersContent
      error={error}
      orders={orders}
      updatingItemIds={updatingItemIds}
      onDeliverItems={markDelivered}
      brand={brand}
    />
  );

  if (loading && !firstFetchDone.current) {
    return (
      <main className="flex min-h-screen items-center justify-center" style={{ backgroundColor: brand.background, color: brand.text }}>
        <div className="text-center">
          <Loader2 className="mx-auto size-10 animate-spin" style={{ color: brand.primary }} />
          <p className="mt-4 text-sm font-black uppercase tracking-wide" style={{ color: brand.muted }}>Cargando entregas</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen" style={{ backgroundColor: brand.background, backgroundImage: brand.isLightTheme ? 'linear-gradient(180deg, #ffffff 0%, #f4f4f5 58%, #e5e7eb 100%)' : `linear-gradient(135deg, ${brand.background} 0%, ${brand.surface} 54%, ${brand.background} 100%)`, color: brand.text }}>
      <header className="sticky top-0 z-20 border-b px-3 py-3 shadow-xl shadow-black/10 backdrop-blur" style={{ backgroundColor: brand.isLightTheme ? 'rgba(255,255,255,0.95)' : 'rgba(11,14,20,0.95)', borderColor: brand.border }}>
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-2">
          <a
            href={`/${tenantSlug}/kitchen`}
            className="grid size-10 shrink-0 place-items-center rounded-lg border transition active:scale-95"
            style={{ backgroundColor: brand.surface, borderColor: brand.border, color: brand.text }}
            aria-label="Volver"
            title="Volver"
          >
            <ArrowLeft className="size-5" />
          </a>
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl border" style={{ backgroundColor: brand.soft, borderColor: brand.primary, color: brand.primary }}>
              <Truck className="size-5" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-lg font-black tracking-wide" style={{ color: brand.text }}>Entregas de sala</p>
              <p className="text-xs font-semibold" style={{ color: brand.muted }}>{items.length} productos listos</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => {
                void unlockAlerts();
                window.setTimeout(triggerServiceAlert, 160);
              }}
              className="grid size-10 place-items-center rounded-lg border transition active:scale-95"
              style={{
                backgroundColor: alertsReady ? brand.soft : brand.surface,
                borderColor: alertsReady ? brand.primary : brand.border,
                color: alertsReady ? brand.primary : brand.text,
              }}
              title={alertsReady ? 'Probar alerta' : 'Activar alertas'}
              aria-label={alertsReady ? 'Probar alerta' : 'Activar alertas'}
            >
              <BellRing className={`size-5 ${alertsReady ? '' : 'animate-pulse'}`} />
            </button>
            <button
              type="button"
              onClick={() => fetchItems()}
              className="grid size-10 place-items-center rounded-lg border transition"
              style={{ backgroundColor: brand.surface, borderColor: brand.border, color: brand.text }}
              title="Actualizar"
              aria-label="Actualizar"
            >
              <RefreshCw className={`size-5 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </header>
      {!alertsReady && (
        <div className="border-b px-3 py-2" style={{ backgroundColor: brand.surface, borderColor: brand.border }}>
          <button
            type="button"
            onClick={() => {
              void unlockAlerts();
              window.setTimeout(triggerServiceAlert, 160);
            }}
            className="mx-auto flex h-10 w-full max-w-5xl items-center justify-center gap-2 rounded-lg border text-sm font-black transition active:scale-[0.99]"
            style={{ backgroundColor: brand.soft, borderColor: brand.primary, color: brand.primary }}
          >
            <BellRing className="size-4" />
            Activar sonido y vibracion
          </button>
        </div>
      )}
      {deliveryContent}
    </main>
  );
}

export function ServiceDeliveryWidget({
  tenantId,
  theme,
  onClose,
}: {
  tenantId: string;
  theme?: ServiceDeliveryTheme;
  onClose: () => void;
}) {
  const [items, setItems] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSecondLoading, setShowSecondLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatingItemIds, setUpdatingItemIds] = useState<Set<string>>(new Set());
  const brand = useDeliveryBrand(theme);

  const fetchItems = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true);

    try {
      const res = await fetch(`/api/order-items?tenantId=${tenantId}&status=ready`);
      if (!res.ok) throw new Error('No se pudieron cargar las entregas');
      const data: ServiceItem[] = await res.json();
      setItems(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar las entregas');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [tenantId]);

  useEffect(() => {
    fetchItems();
    const loaderTimer = window.setTimeout(() => setShowSecondLoading(false), 650);

    const subscription = supabase
      .channel(`service-delivery-widget:${tenantId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'order_items', filter: `tenant_id=eq.${tenantId}` },
        () => fetchItems(true)
      )
      .subscribe();

    const interval = window.setInterval(() => fetchItems(true), 5000);

    return () => {
      window.clearTimeout(loaderTimer);
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
          deliveryConfirmation: true,
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

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/38 p-3 backdrop-blur-sm sm:items-center">
      <div
        className="flex max-h-[82dvh] w-full max-w-md flex-col overflow-hidden rounded-2xl border shadow-2xl shadow-black/30"
        style={{ backgroundColor: brand.background, borderColor: brand.border, color: brand.text }}
      >
        <div className="flex items-center justify-between border-b px-4 py-3" style={{ backgroundColor: brand.surface, borderColor: brand.border }}>
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl border" style={{ backgroundColor: brand.soft, borderColor: brand.primary, color: brand.primary }}>
              <Truck className="size-5" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-base font-black" style={{ color: brand.text }}>Entregas</p>
              <p className="text-xs font-semibold" style={{ color: brand.muted }}>{items.length} productos listos</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fetchItems()}
              className="grid size-10 place-items-center rounded-lg border"
              style={{ backgroundColor: brand.surface, borderColor: brand.border, color: brand.text }}
              aria-label="Actualizar"
              title="Actualizar"
            >
              <RefreshCw className={`size-5 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="grid size-10 place-items-center rounded-lg border text-xl font-black"
              style={{ backgroundColor: brand.surface, borderColor: brand.border, color: brand.text }}
              aria-label="Cerrar"
              title="Cerrar"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {loading || showSecondLoading ? (
            <div className="grid min-h-52 place-items-center p-6 text-center">
              <div>
                <Loader2 className="mx-auto size-10 animate-spin" style={{ color: brand.primary }} />
                <p className="mt-4 text-sm font-black" style={{ color: brand.text }}>Cargando entregas</p>
                <p className="mt-1 text-xs font-semibold" style={{ color: brand.muted }}>Buscando pedidos listos...</p>
              </div>
            </div>
          ) : (
            <DeliveryOrdersContent
              error={error}
              orders={orders}
              updatingItemIds={updatingItemIds}
              onDeliverItems={markDelivered}
              brand={brand}
              emptyClassName="mt-2"
            />
          )}
        </div>
      </div>
    </div>
  );
}

function DeliveryOrdersContent({
  error,
  orders,
  updatingItemIds,
  onDeliverItems,
  brand,
  emptyClassName = 'mt-14',
}: {
  error: string | null;
  orders: ServiceOrder[];
  updatingItemIds: Set<string>;
  onDeliverItems: (items: ServiceItem[]) => void;
  brand: DeliveryBrand;
  emptyClassName?: string;
}) {
  return (
    <section className="mx-auto max-w-5xl space-y-3 p-3 sm:p-4">
      {error && (
        <div className="rounded-lg border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-700">
          {error}
        </div>
      )}

      {orders.length === 0 ? (
        <div className={`${emptyClassName} rounded-xl border px-6 py-14 text-center shadow-xl shadow-black/5`} style={{ backgroundColor: brand.surface, borderColor: brand.border }}>
          <PackageCheck className="mx-auto size-12" style={{ color: brand.primary }} />
          <p className="mt-4 text-lg font-black" style={{ color: brand.text }}>Sin entregas pendientes</p>
          <p className="mt-1 text-sm font-semibold" style={{ color: brand.muted }}>Las bebidas y platos listos apareceran aqui.</p>
        </div>
      ) : (
        orders.map((order) => (
          <OrderDeliveryCard
            key={order.orderId}
            order={order}
            updatingItemIds={updatingItemIds}
            onDeliverItems={onDeliverItems}
            brand={brand}
          />
        ))
      )}
    </section>
  );
}

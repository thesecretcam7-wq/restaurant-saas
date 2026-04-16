'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Maximize2, Minimize2, Volume2, VolumeX, Clock, CheckCircle2, ChefHat } from 'lucide-react';

// Type for Wake Lock Sentinel
type WakeLockSentinel = any;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface OrderItemWithOrder {
  id: string;
  order_id: string;
  name: string;
  quantity: number;
  price: number;
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivered' | 'cancelled';
  notes?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  prepared_by?: string | null;
  created_at: string;
  orders: {
    order_number: string;
    table_number: number | null;
    waiter_name: string | null;
    created_at: string;
    status: string;
  } | null;
}

interface KDSOrder {
  orderId: string;
  orderNumber: string;
  tableNumber: number | null;
  waiterName: string | null;
  createdAt: string;
  items: OrderItemWithOrder[];
  kdsStatus: 'pending' | 'preparing' | 'ready';
}

// ─── Timer Hook ───────────────────────────────────────────────────────────────
function useElapsedMinutes(createdAt: string): number {
  const [minutes, setMinutes] = useState(() =>
    Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000)
  );

  useEffect(() => {
    const calc = () =>
      setMinutes(Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000));
    const interval = setInterval(calc, 30000);
    return () => clearInterval(interval);
  }, [createdAt]);

  return minutes;
}

// ─── Urgency Helpers ─────────────────────────────────────────────────────────
function getUrgencyBorder(minutes: number) {
  if (minutes < 5) return 'border-green-500';
  if (minutes < 10) return 'border-yellow-500';
  return 'border-red-500';
}

function getUrgencyBg(minutes: number) {
  if (minutes < 5) return 'bg-green-950/40';
  if (minutes < 10) return 'bg-yellow-950/40';
  return 'bg-red-950/40';
}

function getTimerColor(minutes: number) {
  if (minutes < 5) return 'text-green-400';
  if (minutes < 10) return 'text-yellow-400';
  return 'text-red-400';
}

function getTimerPulse(minutes: number) {
  return minutes >= 10 ? 'animate-pulse' : '';
}

// ─── Group items by order ─────────────────────────────────────────────────────
function groupItemsByOrder(items: OrderItemWithOrder[]): KDSOrder[] {
  const orderMap = new Map<string, KDSOrder>();

  items.forEach((item) => {
    if (!orderMap.has(item.order_id)) {
      orderMap.set(item.order_id, {
        orderId: item.order_id,
        orderNumber: item.orders?.order_number ?? `#${item.order_id.slice(0, 8)}`,
        tableNumber: item.orders?.table_number ?? null,
        waiterName: item.orders?.waiter_name ?? null,
        createdAt: item.orders?.created_at ?? item.created_at,
        items: [],
        kdsStatus: 'pending',
      });
    }
    orderMap.get(item.order_id)!.items.push(item);
  });

  // Calculate kdsStatus for each order
  orderMap.forEach((order) => {
    const active = order.items.filter(
      (i) => i.status !== 'cancelled' && i.status !== 'delivered'
    );
    const allReady = active.length > 0 && active.every((i) => i.status === 'ready');
    const anyPreparing = active.some((i) => i.status === 'preparing');

    if (allReady) order.kdsStatus = 'ready';
    else if (anyPreparing) order.kdsStatus = 'preparing';
    else order.kdsStatus = 'pending';
  });

  // Sort oldest first (highest urgency at top)
  return Array.from(orderMap.values()).sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
}

// ─── Sound ───────────────────────────────────────────────────────────────────
function useSound() {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(false); // Require explicit permission
  const [soundPermissionGranted, setSoundPermissionGranted] = useState(false);

  const initAudio = useCallback(() => {
    if (!audioCtxRef.current) {
      try {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      } catch (_) {}
    }
  }, []);

  const unlockSound = useCallback(() => {
    initAudio();
    const ctx = audioCtxRef.current;
    // Resume audio context if suspended (iOS requirement)
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(err => console.error('Resume audio context failed:', err));
    }
    setSoundPermissionGranted(true);
    setSoundEnabled(true);
  }, [initAudio]);

  const playBeeps = useCallback((frequencies: number[], duration: number = 0.15, gap: number = 0.2) => {
    if (!soundEnabled) return;
    initAudio();
    const ctx = audioCtxRef.current;
    if (!ctx) return;

    // Ensure audio context is running
    if (ctx.state === 'suspended') {
      ctx.resume().catch(err => console.error('Resume audio context failed:', err));
    }

    const beep = (start: number, freq: number, dur: number) => {
      try {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = freq;
        osc.type = 'sine';
        // Set to maximum volume
        gain.gain.setValueAtTime(1.0, start);
        gain.gain.exponentialRampToValueAtTime(0.01, start + dur);
        osc.start(start);
        osc.stop(start + dur);
      } catch (err) {
        console.error('Beep error:', err);
      }
    };

    let time = ctx.currentTime;
    frequencies.forEach((freq) => {
      beep(time, freq, duration);
      time += duration + gap;
    });
  }, [soundEnabled, initAudio]);

  const playNewOrder = useCallback(() => {
    playBeeps([880, 1100], 0.15, 0.2); // 2 quick beeps
  }, [playBeeps]);

  const playDelayedAlert = useCallback(() => {
    playBeeps([600, 600, 600], 0.2, 0.3); // 3 slower beeps at 600Hz
  }, [playBeeps]);

  return {
    soundEnabled,
    setSoundEnabled,
    soundPermissionGranted,
    setSoundPermissionGranted,
    playNewOrder,
    playDelayedAlert,
    unlockSound,
    initAudio,
  };
}

// ─── Order Card ───────────────────────────────────────────────────────────────
function OrderCard({
  order,
  onAction,
  actionLabel,
  actionColor,
  loading,
}: {
  order: KDSOrder;
  onAction: (order: KDSOrder) => void;
  actionLabel: string;
  actionColor: string;
  loading: boolean;
}) {
  const minutes = useElapsedMinutes(order.createdAt);

  return (
    <div
      className={`border-2 rounded-xl p-4 flex flex-col gap-3 transition-all ${getUrgencyBorder(minutes)} ${getUrgencyBg(minutes)} ${getTimerPulse(minutes)}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xl font-black text-white tracking-wide">{order.orderNumber}</p>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            {order.tableNumber && (
              <span className="text-sm font-semibold text-muted-foreground">
                Mesa {order.tableNumber}
              </span>
            )}
            {order.waiterName && (
              <>
                <span className="text-gray-600">·</span>
                <span className="text-sm text-muted-foreground">{order.waiterName}</span>
              </>
            )}
          </div>
        </div>
        {/* Timer */}
        <div className={`flex items-center gap-1 font-bold text-lg ${getTimerColor(minutes)}`}>
          <Clock className="w-4 h-4" />
          <span>{minutes}m</span>
        </div>
      </div>

      {/* Items */}
      <div className="space-y-1.5 border-t border-border pt-2">
        {order.items
          .filter((i) => i.status !== 'cancelled' && i.status !== 'delivered')
          .map((item) => (
            <div key={item.id} className="flex items-start gap-2">
              <span className="text-white font-bold text-base min-w-[1.5rem]">
                {item.quantity}×
              </span>
              <div>
                <p className="text-white font-medium text-base leading-tight">{item.name}</p>
                {item.notes && (
                  <p className="text-yellow-400 text-sm">⚠️ {item.notes}</p>
                )}
              </div>
            </div>
          ))}
      </div>

      {/* Action Button */}
      <button
        onClick={() => onAction(order)}
        disabled={loading}
        className={`w-full py-3 rounded-lg font-black text-white text-sm tracking-wide transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${actionColor}`}
      >
        {actionLabel}
      </button>
    </div>
  );
}

// ─── Column ───────────────────────────────────────────────────────────────────
function KDSColumn({
  title,
  orders,
  actionLabel,
  actionColor,
  headerColor,
  icon,
  onAction,
  loading,
}: {
  title: string;
  orders: KDSOrder[];
  actionLabel: string;
  actionColor: string;
  headerColor: string;
  icon: React.ReactNode;
  onAction: (order: KDSOrder) => void;
  loading: boolean;
}) {
  return (
    <div className="flex flex-col bg-muted/80 rounded-2xl overflow-hidden border border-border">
      {/* Column Header */}
      <div className={`px-4 py-3 flex items-center justify-between ${headerColor}`}>
        <div className="flex items-center gap-2">
          {icon}
          <span className="font-black text-white text-lg tracking-wide">{title}</span>
        </div>
        <span className="bg-black/30 text-white font-black text-lg rounded-full w-8 h-8 flex items-center justify-center">
          {orders.length}
        </span>
      </div>

      {/* Cards */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 max-h-[calc(100vh-160px)]">
        {orders.length === 0 ? (
          <div className="text-center py-12 text-gray-600">
            <p className="text-4xl mb-2">🍽️</p>
            <p className="text-sm">Sin órdenes</p>
          </div>
        ) : (
          orders.map((order) => (
            <OrderCard
              key={order.orderId}
              order={order}
              onAction={onAction}
              actionLabel={actionLabel}
              actionColor={actionColor}
              loading={loading}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ─── Main KDSScreen Component ────────────────────────────────────────────────
export function KDSScreen({ tenantId }: { tenantId: string }) {
  const [items, setItems] = useState<OrderItemWithOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [wakeLockActive, setWakeLockActive] = useState(false);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const delayedAlertedOrders = useRef(new Set<string>());
  const {
    soundEnabled,
    setSoundEnabled,
    soundPermissionGranted,
    playNewOrder,
    playDelayedAlert,
    unlockSound,
    initAudio,
  } = useSound();
  const knownOrderIds = useRef(new Set<string>());

  // ── Fullscreen ──
  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  async function toggleFullscreen() {
    try {
      if (!isFullscreen) await document.documentElement.requestFullscreen();
      else await document.exitFullscreen();
    } catch (_) {}
  }

  // ── Wake Lock ──
  async function activateWakeLock() {
    try {
      if ('wakeLock' in navigator) {
        const sentinel = await (navigator as any).wakeLock.request('screen');
        wakeLockRef.current = sentinel;
        setWakeLockActive(true);
        console.log('Wake Lock activated successfully');

        // Handle release event (battery saver, user action, etc)
        const handleRelease = () => {
          console.log('Wake Lock released by system');
          wakeLockRef.current = null;
          setWakeLockActive(false);
        };
        sentinel.addEventListener('release', handleRelease);

        // Release wake lock on visibility change
        const handleVisibilityChange = async () => {
          if (document.hidden && wakeLockRef.current) {
            try {
              await wakeLockRef.current.release();
              wakeLockRef.current = null;
              setWakeLockActive(false);
              console.log('Wake Lock released on tab hide');
            } catch (_) {}
          } else if (!document.hidden && !wakeLockRef.current) {
            try {
              const newSentinel = await (navigator as any).wakeLock.request('screen');
              wakeLockRef.current = newSentinel;
              setWakeLockActive(true);
              console.log('Wake Lock re-activated on tab show');
              newSentinel.addEventListener('release', handleRelease);
            } catch (err) {
              console.error('Re-activate wake lock failed:', err);
            }
          }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => {
          document.removeEventListener('visibilitychange', handleVisibilityChange);
          sentinel.removeEventListener('release', handleRelease);
        };
      } else {
        console.warn('Wake Lock API not supported');
        setWakeLockActive(false);
      }
    } catch (err) {
      console.error('Wake Lock error:', err);
      setWakeLockActive(false);
    }
  }

  // ── Delayed Order Alerts ──
  useEffect(() => {
    const checkDelayedOrders = () => {
      // Compute orders being prepared
      const activeItems = items.filter(
        (i) => i.status !== 'delivered' && i.status !== 'cancelled'
      );
      const allOrders = groupItemsByOrder(activeItems);
      const preparingOrders = allOrders.filter((o) => o.kdsStatus === 'preparing');

      preparingOrders.forEach((order) => {
        const minutes = Math.floor((Date.now() - new Date(order.createdAt).getTime()) / 60000);
        if (minutes > 15 && !delayedAlertedOrders.current.has(order.orderId)) {
          playDelayedAlert();
          delayedAlertedOrders.current.add(order.orderId);
        }
      });
    };

    const interval = setInterval(checkDelayedOrders, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, [items, playDelayedAlert]);

  // ── Fetch ──
  const fetchOrderItems = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/order-items?tenantId=${tenantId}&status=pending,confirmed,preparing,ready`
      );
      if (!res.ok) throw new Error('Failed to fetch');
      const data: OrderItemWithOrder[] = await res.json();
      setItems(data);
      // Track known order IDs
      data.forEach((item) => knownOrderIds.current.add(item.order_id));
    } catch (err) {
      console.error('KDS fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  // ── Realtime ──
  useEffect(() => {
    fetchOrderItems();

    const subscription = supabase
      .channel(`kds-order-items:${tenantId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'order_items', filter: `tenant_id=eq.${tenantId}` },
        async (payload) => {
          console.log('[KDS] New order item:', payload.new);
          const newItem = payload.new as OrderItemWithOrder;
          const isNewOrder = !knownOrderIds.current.has(newItem.order_id);
          if (isNewOrder) {
            playNewOrder();
            knownOrderIds.current.add(newItem.order_id);
          }
          // Re-fetch to get full data with order join
          await fetchOrderItems();
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'order_items', filter: `tenant_id=eq.${tenantId}` },
        async (payload) => {
          console.log('[KDS] Order item updated:', payload.new);
          // Re-fetch to get full data with order join (same as INSERT)
          await fetchOrderItems();
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'order_items', filter: `tenant_id=eq.${tenantId}` },
        (payload) => {
          console.log('[KDS] Order item deleted:', payload.old);
          setItems((prev) => prev.filter((item) => item.id !== payload.old.id));
        }
      )
      .subscribe((status, err) => {
        console.log('[KDS] Subscription status:', status);
        if (err) console.error('[KDS] Subscription error:', err);
      });

    return () => {
      console.log('[KDS] Unsubscribing from realtime');
      subscription.unsubscribe();
    };
  }, [tenantId, fetchOrderItems, playNewOrder]);

  // ── Polling Fallback (si Realtime no funciona) ──
  useEffect(() => {
    const interval = setInterval(() => {
      console.log('[KDS] Polling fallback - refetching data');
      fetchOrderItems();
    }, 10000);
    return () => clearInterval(interval);
  }, [fetchOrderItems]);

  // ── Update all items in an order ──
  async function updateOrderStatus(order: KDSOrder, targetStatus: string) {
    const activeItems = order.items.filter(
      (i) => i.status !== 'cancelled' && i.status !== 'delivered'
    );
    if (activeItems.length === 0) return;

    setActionLoading(true);
    try {
      await Promise.all(
        activeItems.map((item) =>
          fetch(`/api/order-items/${item.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tenantId, status: targetStatus }),
          })
        )
      );
      console.log('[KDS] Status updated successfully, refetching...');
      // Refetch immediately after successful update
      await fetchOrderItems();
    } catch (err) {
      console.error('KDS update error:', err);
    } finally {
      setActionLoading(false);
    }
  }

  // ── Group and filter ──
  const activeItems = items.filter(
    (i) => i.status !== 'delivered' && i.status !== 'cancelled'
  );
  const allOrders = groupItemsByOrder(activeItems);
  const pendingOrders = allOrders.filter((o) => o.kdsStatus === 'pending');
  const preparingOrders = allOrders.filter((o) => o.kdsStatus === 'preparing');
  const readyOrders = allOrders.filter((o) => o.kdsStatus === 'ready');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-950 text-white text-2xl gap-3">
        <ChefHat className="w-8 h-8 animate-pulse" />
        <span>Cargando KDS...</span>
      </div>
    );
  }

  return (
    // Clicking anywhere inits audio (required by iOS/Safari)
    <div
      className={`bg-gray-950 text-white flex flex-col select-none overflow-hidden ${isFullscreen ? 'fixed inset-0 z-50' : 'h-screen'}`}
      onClick={initAudio}
    >
      {/* ── Top Bar ── */}
      <div className="flex items-center justify-between px-4 py-2 bg-muted border-b border-gray-800 shrink-0">
        <div className="flex items-center gap-2">
          <ChefHat className="w-6 h-6 text-orange-400" />
          <span className="font-black text-lg tracking-wide text-white">COCINA</span>
          <span className="text-gray-500 text-sm ml-2">
            {allOrders.length} orden{allOrders.length !== 1 ? 'es' : ''} activa{allOrders.length !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Sound Toggle */}
          <button
            onClick={(e) => { e.stopPropagation(); setSoundEnabled((v) => !v); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card hover:bg-muted text-sm font-medium transition"
            title={soundEnabled ? 'Silenciar alertas' : 'Activar alertas'}
          >
            {soundEnabled ? (
              <Volume2 className="w-4 h-4 text-green-400" />
            ) : (
              <VolumeX className="w-4 h-4 text-gray-500" />
            )}
            <span className={soundEnabled ? 'text-green-400' : 'text-gray-500'}>
              {soundEnabled ? 'Sonido' : 'Mudo'}
            </span>
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={(e) => { e.stopPropagation(); toggleFullscreen(); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card hover:bg-muted text-sm font-medium transition text-muted-foreground"
            title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
          >
            {isFullscreen ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
            <span className="hidden sm:inline">
              {isFullscreen ? 'Salir' : 'Fullscreen'}
            </span>
          </button>
        </div>
      </div>

      {/* ── Permission Banners ── */}
      {!soundPermissionGranted && (
        <div className="bg-red-950/80 border-b border-red-900 px-4 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🔊</span>
            <span className="text-sm font-medium text-white">Se requieren permisos de sonido para alertas de órdenes</span>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              unlockSound();
              // Test sound immediately
              setTimeout(() => {
                playNewOrder();
              }, 300);
            }}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium text-sm transition"
          >
            Permitir Sonido 🔊
          </button>
        </div>
      )}

      {!wakeLockActive && (
        <div className="bg-orange-950/80 border-b border-orange-900 px-4 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🔒</span>
            <span className="text-sm font-medium text-white">Se requieren permisos para mantener la pantalla encendida</span>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              activateWakeLock();
            }}
            className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium text-sm transition"
          >
            Bloquear Pantalla 🔒
          </button>
        </div>
      )}

      {/* ── Legend ── */}
      <div className="flex items-center gap-4 px-4 py-1.5 bg-muted/50 border-b border-gray-800 shrink-0 text-xs text-gray-500">
        <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> &lt;5 min</div>
        <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-500 inline-block" /> 5–10 min</div>
        <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> &gt;10 min (urgente)</div>
      </div>

      {/* ── Columns ── */}
      <div className="flex-1 grid grid-cols-3 gap-3 p-3 overflow-hidden">
        <KDSColumn
          title="PENDIENTES"
          orders={pendingOrders}
          actionLabel="🔥 INICIAR PREPARACIÓN"
          actionColor="bg-blue-600 hover:bg-blue-700"
          headerColor="bg-red-900/60"
          icon={<span className="text-lg">🔴</span>}
          onAction={(o) => updateOrderStatus(o, 'preparing')}
          loading={actionLoading}
        />

        <KDSColumn
          title="EN PREPARACIÓN"
          orders={preparingOrders}
          actionLabel="✅ ORDEN LISTA"
          actionColor="bg-green-600 hover:bg-green-700"
          headerColor="bg-blue-900/60"
          icon={<span className="text-lg">🔵</span>}
          onAction={(o) => updateOrderStatus(o, 'ready')}
          loading={actionLoading}
        />

        <KDSColumn
          title="LISTOS PARA ENTREGAR"
          orders={readyOrders}
          actionLabel="🎯 MARCAR ENTREGADO"
          actionColor="bg-gray-600 hover:bg-muted"
          headerColor="bg-green-900/60"
          icon={<CheckCircle2 className="w-5 h-5 text-green-400" />}
          onAction={(o) => updateOrderStatus(o, 'delivered')}
          loading={actionLoading}
        />
      </div>
    </div>
  );
}

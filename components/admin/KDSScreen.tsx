'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  BellRing,
  CheckCircle2,
  ChefHat,
  Clock,
  Flame,
  LockKeyhole,
  Maximize2,
  Minimize2,
  ShieldCheck,
  Timer,
  Utensils,
  Volume2,
  VolumeX,
  Zap,
} from 'lucide-react';

  // Wake Lock
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
    delivery_type: string | null;
    customer_name: string | null;
    customer_phone: string | null;
  } | null;
}

interface KDSOrder {
  orderId: string;
  orderNumber: string;
  tableNumber: number | null;
  waiterName: string | null;
  deliveryType: string | null;
  customerName: string | null;
  createdAt: string;
  items: OrderItemWithOrder[];
  kdsStatus: 'pending' | 'preparing' | 'ready';
}

// Timer Hook
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

// Urgency Helpers
function getUrgencyBorder(minutes: number) {
  if (minutes < 5) return 'border-emerald-400/70 shadow-emerald-500/10';
  if (minutes < 10) return 'border-amber-400/80 shadow-amber-500/20';
  return 'border-red-400/90 shadow-red-500/30';
}

function getUrgencyBg(minutes: number) {
  if (minutes < 5) return 'bg-slate-950';
  if (minutes < 10) return 'bg-gradient-to-br from-slate-950 to-amber-950/70';
  return 'bg-gradient-to-br from-slate-950 to-red-950/80';
}

function getTimerColor(minutes: number) {
  if (minutes < 5) return 'text-emerald-300 bg-emerald-400/10 border-emerald-400/30';
  if (minutes < 10) return 'text-amber-200 bg-amber-400/15 border-amber-400/40';
  return 'text-red-100 bg-red-500/20 border-red-400/50';
}

function getTimerPulse(minutes: number) {
  return minutes >= 10 ? 'animate-pulse' : '';
}

// Group items by order
function groupItemsByOrder(items: OrderItemWithOrder[]): KDSOrder[] {
  const orderMap = new Map<string, KDSOrder>();

  items.forEach((item) => {
    if (!orderMap.has(item.order_id)) {
      orderMap.set(item.order_id, {
        orderId: item.order_id,
        orderNumber: item.orders?.order_number ?? `#${item.order_id.slice(0, 8)}`,
        tableNumber: item.orders?.table_number ?? null,
        waiterName: item.orders?.waiter_name ?? null,
        deliveryType: item.orders?.delivery_type ?? null,
        customerName: item.orders?.customer_name ?? null,
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

// Sound
function useSound() {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const alertAudioRef = useRef<HTMLAudioElement | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [soundPermissionGranted, setSoundPermissionGranted] = useState(false);
  const [audioStatus, setAudioStatus] = useState<string>('');

  const initAudio = useCallback(() => {
    if (!audioCtxRef.current) {
      try {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      } catch (_) {}
    }
    if (!alertAudioRef.current) {
      const audio = new Audio('/sounds/kds-alert.wav');
      audio.preload = 'auto';
      audio.volume = 1;
      alertAudioRef.current = audio;
    }
  }, []);

  const unlockSound = useCallback(() => {
    initAudio();
    const ctx = audioCtxRef.current;
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().then(() => {
        console.log('Audio context resumed successfully');
        setAudioStatus('Audio listo');
      }).catch(err => {
        console.error('Resume audio context failed:', err);
        setAudioStatus(`Error de audio: ${err}`);
      });
    }
    setSoundPermissionGranted(true);
    setSoundEnabled(true);
    console.log('Sound permission granted');
  }, [initAudio]);

  // Generar sonido de alerta en base64 para HTMLAudioElement fallback
  const generateToneDataUrl = useCallback((frequency: number, duration: number) => {
    const sampleRate = 44100;
    const samples = Math.round((sampleRate * duration) / 1000);
    const audioData = new Float32Array(samples);

    for (let i = 0; i < samples; i++) {
      const t = i / sampleRate;
      const envelope = Math.max(0, 1 - i / samples);
      const tone = Math.sin(2 * Math.PI * frequency * t) * 0.82;
      const harmonic = Math.sin(2 * Math.PI * frequency * 1.5 * t) * 0.28;
      audioData[i] = Math.max(-0.95, Math.min(0.95, (tone + harmonic) * envelope));
    }

    // Convertir a WAV y retornar como data URL
    const wavBlob = createWavBlob(audioData, sampleRate);
    return URL.createObjectURL(wavBlob);
  }, []);

  const createWavBlob = (audioData: Float32Array, sampleRate: number) => {
    const frameLength = audioData.length;
    const numberOfChannels = 1;
    const sampleRateHz = sampleRate;
    const bitsPerSample = 16;
    const byteRate = sampleRateHz * numberOfChannels * (bitsPerSample / 8);
    const blockAlign = numberOfChannels * (bitsPerSample / 8);

    const wavArrayBuffer = new ArrayBuffer(44 + frameLength * 2);
    const view = new DataView(wavArrayBuffer);

    // RIFF header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 44 + frameLength * 2 - 8, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, numberOfChannels, true);
    view.setUint32(24, sampleRateHz, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitsPerSample, true);
    writeString(36, 'data');
    view.setUint32(40, frameLength * 2, true);

    // Escribir samples de audio
    let offset = 44;
    for (let i = 0; i < frameLength; i++) {
      view.setInt16(offset, audioData[i] < 0 ? audioData[i] * 0x8000 : audioData[i] * 0x7FFF, true);
      offset += 2;
    }

    return new Blob([wavArrayBuffer], { type: 'audio/wav' });
  };

  const playBeeps = useCallback((frequencies: number[], duration: number = 0.15, gap: number = 0.2) => {
    if (!soundEnabled) {
      setAudioStatus('Sonido deshabilitado');
      return;
    }

    setAudioStatus('Reproduciendo alerta...');
    console.log('Playing beeps:', frequencies);

    const fileAlert = alertAudioRef.current;
    if (fileAlert) {
      fileAlert.currentTime = 0;
      fileAlert.play().catch(() => {});
    }

    // Intenta con Web Audio API primero
    initAudio();
    const ctx = audioCtxRef.current;

    if (ctx && ctx.state !== 'closed') {
      try {
        if (ctx.state === 'suspended') {
          ctx.resume().catch(() => {});
        }

        const master = ctx.createGain();
        const compressor = ctx.createDynamicsCompressor();
        compressor.threshold.setValueAtTime(-28, ctx.currentTime);
        compressor.knee.setValueAtTime(18, ctx.currentTime);
        compressor.ratio.setValueAtTime(12, ctx.currentTime);
        compressor.attack.setValueAtTime(0.002, ctx.currentTime);
        compressor.release.setValueAtTime(0.18, ctx.currentTime);
        master.gain.setValueAtTime(0.95, ctx.currentTime);
        master.connect(compressor);
        compressor.connect(ctx.destination);

        const beep = (start: number, freq: number, dur: number) => {
          const gain = ctx.createGain();
          gain.connect(master);
          gain.gain.setValueAtTime(0.0001, start);
          gain.gain.exponentialRampToValueAtTime(0.95, start + 0.01);
          gain.gain.exponentialRampToValueAtTime(0.02, start + dur);

          const tones = [
            { ratio: 1, type: 'square' as OscillatorType },
            { ratio: 1.5, type: 'sawtooth' as OscillatorType },
            { ratio: 2, type: 'triangle' as OscillatorType },
          ];

          tones.forEach(({ ratio, type }) => {
            const osc = ctx.createOscillator();
            osc.connect(gain);
            osc.frequency.value = freq * ratio;
            osc.type = type;
            osc.start(start);
            osc.stop(start + dur);
          });
        };

        let time = ctx.currentTime;
        frequencies.forEach((freq) => {
          beep(time, freq, duration);
          time += duration + gap;
        });

        setAudioStatus('Alerta reproducida');
        console.log('Beeps scheduled with Web Audio API');
        return;
      } catch (err) {
        console.error('Web Audio API error:', err);
      }
    }

    // Fallback: Usar HTMLAudioElement para Android
    try {
      setAudioStatus('Reproduciendo alerta de respaldo...');
      frequencies.forEach((freq, idx) => {
        setTimeout(() => {
          const dataUrl = generateToneDataUrl(freq, duration * 1000);
          const audio = new Audio(dataUrl);
          audio.volume = 1.0;
          audio.play().catch(err => {
            console.error('HTML Audio play error:', err);
            setAudioStatus(`Error de audio: ${err}`);
          });
        }, (duration + gap) * 1000 * idx);
      });

      setAudioStatus('Alerta reproducida');
    } catch (err) {
      console.error('Fallback error:', err);
        setAudioStatus(`Error de audio: ${err}`);
    }
  }, [soundEnabled, initAudio, generateToneDataUrl]);

  const playNewOrder = useCallback(() => {
    playBeeps([740, 980, 1240], 0.22, 0.07);
    // Vibration as fallback for Android
    if ('vibrate' in navigator) {
      navigator.vibrate([100, 50, 100]); // vibrate pattern: 100ms on, 50ms off, 100ms on
    }
  }, [playBeeps]);

  const playDelayedAlert = useCallback(() => {
    playBeeps([520, 520, 520, 760], 0.24, 0.08);
    // Stronger vibration for delayed alert
    if ('vibrate' in navigator) {
      navigator.vibrate([200, 100, 200, 100, 200]); // stronger vibration pattern
    }
  }, [playBeeps]);

  return {
    soundEnabled,
    setSoundEnabled,
    soundPermissionGranted,
    setSoundPermissionGranted,
    audioStatus,
    setAudioStatus,
    playNewOrder,
    playDelayedAlert,
    unlockSound,
    initAudio,
  };
}

// Order Card
function OrderCard({
  order,
  onAction,
  actionLabel,
  actionColor,
  loading,
  onPlayTestSound,
}: {
  order: KDSOrder;
  onAction: (order: KDSOrder) => void;
  actionLabel: string;
  actionColor: string;
  loading: boolean;
  onPlayTestSound?: () => void;
}) {
  const minutes = useElapsedMinutes(order.createdAt);

  // Determine urgency badge
  const getUrgencyBadge = (mins: number) => {
    if (mins < 5) return { label: 'A tiempo', color: 'bg-emerald-400/10 text-emerald-200 border-emerald-400/30' };
    if (mins < 10) return { label: 'Moderado', color: 'bg-amber-400/15 text-amber-100 border-amber-400/40' };
    return { label: 'Urgente', color: 'bg-red-500/20 text-red-100 border-red-400/50' };
  };

  const urgency = getUrgencyBadge(minutes);

  return (
    <div
      className={`rounded-2xl border transition-all duration-200 overflow-hidden shadow-2xl ${getUrgencyBorder(minutes)} ${getUrgencyBg(minutes)} ${getTimerPulse(minutes)}`}
      style={{
        borderWidth: '2px',
      }}
    >
      {/* Card Content */}
      <div className="p-4 flex flex-col gap-3 h-full relative">
        <div className="absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />
        {/* Header with Order Number and Timer */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            {/* Order Number - Large and Bold */}
            <p className="text-4xl font-black text-white tracking-wider leading-tight">
              {order.orderNumber}
            </p>

            {/* Meta Info */}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {order.deliveryType === 'delivery' && (
                <span className="text-xs font-bold bg-violet-400/15 text-violet-100 px-2.5 py-1 rounded-lg border border-violet-300/20">
                  A domicilio
                </span>
              )}
              {order.deliveryType === 'pickup' && (
                <span className="text-xs font-bold bg-emerald-400/15 text-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-300/20">
                  Para recoger
                </span>
              )}
              {order.tableNumber && (
                <span className="text-xs font-semibold bg-cyan-400/15 text-cyan-100 px-2.5 py-1 rounded-lg border border-cyan-300/20">
                  Mesa {order.tableNumber}
                </span>
              )}
              {order.waiterName && (
                <span className="text-xs font-medium text-slate-200 px-2.5 py-1 bg-white/10 rounded-lg border border-white/10">
                  {order.waiterName}
                </span>
              )}
              {(order.deliveryType === 'delivery' || order.deliveryType === 'pickup') && order.customerName && (
                <span className="text-xs font-medium text-slate-200 px-2.5 py-1 bg-white/10 rounded-lg border border-white/10 truncate max-w-[120px]">
                  {order.customerName}
                </span>
              )}
            </div>
          </div>

          {/* Timer - Right Side */}
          <div className="flex flex-col items-end gap-2">
            <div className={`flex items-center gap-2 rounded-xl px-3 py-2 font-black text-lg border ${getTimerColor(minutes)} transition-all`}>
              <Clock className="w-5 h-5" />
              <span>{minutes}m</span>
            </div>
            {onPlayTestSound && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onPlayTestSound();
                }}
                className="grid h-8 w-8 place-items-center rounded-lg bg-white/10 hover:bg-white/20 border border-white/10 text-xs font-semibold text-white transition active:scale-95"
                title="Test sound"
              >
                <BellRing className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Urgency Badge */}
        <div className={`border rounded-xl px-3 py-2 text-xs font-bold text-center uppercase tracking-[0.18em] ${urgency.color}`}>
          {urgency.label}
        </div>

        {/* Items List */}
        <div className="flex-1 space-y-2 border-t border-white/10 pt-3">
          {order.items
            .filter((i) => i.status !== 'cancelled' && i.status !== 'delivered')
            .map((item) => (
              <div key={item.id} className="flex items-start gap-3 rounded-xl bg-white/[0.06] border border-white/10 p-3">
                <span className="text-white font-black text-base bg-white/10 rounded-lg px-2.5 py-1 min-w-fit leading-none">
                  x{item.quantity}
                </span>
                <div className="flex-1">
                  <p className="text-white font-semibold text-sm leading-snug">{item.name}</p>
                  {item.notes && (
                    <p className="text-amber-200 text-xs mt-1 leading-snug">
                      Nota: {item.notes}
                    </p>
                  )}
                </div>
              </div>
            ))}
        </div>

        {/* Action Button */}
        <button
          onClick={() => onAction(order)}
          disabled={loading}
          className={`w-full py-3.5 rounded-xl font-black text-white text-sm tracking-[0.14em] transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg ${actionColor}`}
        >
          {actionLabel}
        </button>
      </div>
    </div>
  );
}

// Column
function KDSColumn({
  title,
  orders,
  actionLabel,
  actionColor,
  headerColor,
  icon,
  onAction,
  loading,
  onPlayTestSound,
}: {
  title: string;
  orders: KDSOrder[];
  actionLabel: string;
  actionColor: string;
  headerColor: string;
  icon: React.ReactNode;
  onAction: (order: KDSOrder) => void;
  loading: boolean;
  onPlayTestSound?: () => void;
}) {
  return (
    <div className="flex flex-col rounded-3xl overflow-hidden border border-white/10 bg-slate-950/92 h-full shadow-2xl shadow-black/30 backdrop-blur-xl">
      {/* Column Header */}
      <div className={`px-4 py-4 flex items-center justify-between border-b border-white/10 ${headerColor}`}>
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-white/10 border border-white/10">{icon}</span>
          <div>
            <span className="font-black text-white text-base tracking-[0.18em] block">{title}</span>
            <span className="text-xs text-slate-400 mt-0.5">{orders.length} {orders.length === 1 ? 'orden' : 'ordenes'}</span>
          </div>
        </div>
        <span className="bg-white text-slate-950 font-black text-lg rounded-xl px-3 py-2 border border-white/20 shadow-sm">
          {orders.length}
        </span>
      </div>

      {/* Cards Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[calc(100vh-230px)]">
        {orders.length === 0 ? (
          <div className="text-center py-16 flex flex-col items-center justify-center h-full">
            <Utensils className="h-12 w-12 text-slate-500" />
            <p className="text-sm font-medium text-slate-300">Sin ordenes</p>
            <p className="text-xs text-slate-500 mt-1">Esperando nuevas ordenes...</p>
          </div>
        ) : (
          orders.map((order, index) => (
            <div key={order.orderId} className="animate-fade-in" style={{ animationDelay: `${index * 50}ms` }}>
              <OrderCard
                order={order}
                onAction={onAction}
                actionLabel={actionLabel}
                actionColor={actionColor}
                loading={loading}
                onPlayTestSound={onPlayTestSound}
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// Main KDSScreen Component
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
    audioStatus,
    playNewOrder,
    playDelayedAlert,
    unlockSound,
    initAudio,
  } = useSound();
  const knownOrderIds = useRef(new Set<string>());

  // Fullscreen
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

  // Wake Lock
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

  // Wake Lock
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

  // Delayed Order Alerts
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

  // Fetch
  const fetchOrderItems = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/order-items?tenantId=${tenantId}&status=pending,confirmed,preparing,ready`
      );
      if (!res.ok) throw new Error('Failed to fetch');
      const data: OrderItemWithOrder[] = await res.json();

      // Detect new orders and play sound
      const newOrderIds = new Set<string>();
      data.forEach((item) => {
        if (!knownOrderIds.current.has(item.order_id)) {
          newOrderIds.add(item.order_id);
          knownOrderIds.current.add(item.order_id);
        }
      });

      // Play sound if new orders detected
      if (newOrderIds.size > 0) {
        console.log('[KDS] New orders detected via polling:', newOrderIds.size);
        playNewOrder();
      }

      setItems(data);
    } catch (err) {
      console.error('KDS fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [tenantId, playNewOrder]);

  // Realtime
  useEffect(() => {
    fetchOrderItems();

    const subscription = supabase
      .channel(`kds-order-items:${tenantId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'order_items', filter: `tenant_id=eq.${tenantId}` },
        async (payload) => {
          console.log('[KDS] REALTIME EVENT RECEIVED - New order item:', payload.new);
          const newItem = payload.new as OrderItemWithOrder;
          const isNewOrder = !knownOrderIds.current.has(newItem.order_id);
          console.log(`[KDS] Is new order? ${isNewOrder} | Order ID: ${newItem.order_id}`);
          if (isNewOrder) {
            console.log('[KDS] Playing sound from REALTIME event');
            playNewOrder();
            knownOrderIds.current.add(newItem.order_id);
          }
  // Fetch
          await fetchOrderItems();
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'order_items', filter: `tenant_id=eq.${tenantId}` },
        async (payload) => {
          console.log('[KDS] Order item updated:', payload.new);
  // Fetch
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

  // Realtime
  useEffect(() => {
    const interval = setInterval(() => {
      console.log('[KDS] Polling fallback - refetching data');
      fetchOrderItems();
    }, 3000); // More aggressive fallback: every 3 seconds
    return () => clearInterval(interval);
  }, [fetchOrderItems]);

  // Update all items in an order
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
  // Fetch
      await fetchOrderItems();
    } catch (err) {
      console.error('KDS update error:', err);
    } finally {
      setActionLoading(false);
    }
  }

  // Group and filter
  const activeItems = items.filter(
    (i) => i.status !== 'delivered' && i.status !== 'cancelled'
  );
  const allOrders = groupItemsByOrder(activeItems);
  const pendingOrders = allOrders.filter((o) => o.kdsStatus === 'pending');
  const preparingOrders = allOrders.filter((o) => o.kdsStatus === 'preparing');
  const readyOrders = allOrders.filter((o) => o.kdsStatus === 'ready');

  // Trust-building metrics
  const totalDeliveredItems = items.filter((i) => i.status === 'delivered').length;
  const avgPrepTime = allOrders.length > 0
    ? Math.round(
        allOrders.reduce((sum, order) => {
          const minutes = Math.floor((Date.now() - new Date(order.createdAt).getTime()) / 60000);
          return sum + minutes;
        }, 0) / allOrders.length
      )
    : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-950 text-white">
        <div className="text-center space-y-6">
          <div className="flex justify-center">
            <div className="relative w-20 h-20">
              <ChefHat className="w-20 h-20 text-cyan-300 animate-bounce" />
            </div>
          </div>
          <div>
            <p className="text-2xl font-black tracking-wider mb-2 text-white">Cargando cocina digital</p>
            <p className="text-slate-400 text-sm">Preparando la pantalla de servicio...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    // Clicking anywhere inits audio (required by iOS/Safari)
    <div
      className={`bg-slate-950 text-white flex flex-col select-none overflow-hidden ${isFullscreen ? 'fixed inset-0 z-50' : 'h-screen'}`}
      onClick={initAudio}
    >
      {/* Top Bar */}
      <div className="bg-slate-950/95 border-b border-white/10 shrink-0 shadow-2xl shadow-black/30">
        <div className="flex items-center justify-between px-6 py-4">
          {/* Left Section */}
          <div className="flex items-center gap-4">
            <div className="bg-cyan-400/10 backdrop-blur-sm rounded-2xl p-3 border border-cyan-300/20 shadow-lg shadow-cyan-500/10">
              <ChefHat className="w-6 h-6 text-cyan-200" />
            </div>
            <div>
              <span className="font-black text-xl tracking-[0.22em] text-white block">KITCHEN DISPLAY</span>
              <span className="text-slate-400 text-sm font-medium">
                {allOrders.length} orden{allOrders.length !== 1 ? 'es' : ''} activa{allOrders.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          {/* Right Section - Controls */}
          <div className="flex items-center gap-2">
            {/* Sound Toggle */}
            <button
              onClick={(e) => { e.stopPropagation(); setSoundEnabled((v) => !v); }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/15 text-sm font-semibold text-white transition-all duration-200"
              title={soundEnabled ? 'Silenciar alertas' : 'Activar alertas'}
            >
              {soundEnabled ? (
                <>
                  <Volume2 className="w-5 h-5" />
                  <span>Sonido</span>
                </>
              ) : (
                <>
                  <VolumeX className="w-5 h-5" />
                  <span>Mudo</span>
                </>
              )}
            </button>

            {/* Fullscreen Toggle */}
            <button
              onClick={(e) => { e.stopPropagation(); toggleFullscreen(); }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/15 text-sm font-semibold text-white transition-all duration-200"
              title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
            >
              {isFullscreen ? (
                <>
                  <Minimize2 className="w-5 h-5" />
                  <span className="hidden sm:inline">Salir</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-5 h-5" />
                  <span className="hidden sm:inline">Fullscreen</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Permission banners */}
      {!soundPermissionGranted && (
        <div className="bg-red-950/90 border-b border-red-400/20 px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4 flex-1">
            <BellRing className="h-8 w-8 text-red-200 animate-pulse" />
            <div>
              <p className="text-sm font-bold text-red-100">Se requieren permisos de sonido</p>
              <p className="text-xs text-red-200/80 mt-1">Las alertas de ordenes no funcionaran sin audio habilitado</p>
              {audioStatus && <p className="text-xs text-red-100 mt-2 font-medium">{audioStatus}</p>}
            </div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              unlockSound();
              setTimeout(() => {
                playNewOrder();
              }, 300);
            }}
            className="px-6 py-2.5 bg-red-500 hover:bg-red-400 text-white rounded-xl font-bold text-sm transition-all duration-200 whitespace-nowrap ml-4"
          >
            Habilitar Sonido
          </button>
        </div>
      )}

      {!wakeLockActive && (
        <div className="bg-amber-950/90 border-b border-amber-400/20 px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <LockKeyhole className="h-8 w-8 text-amber-200" />
            <div>
              <p className="text-sm font-bold text-amber-100">Activar proteccion de pantalla</p>
              <p className="text-xs text-amber-200/80 mt-1">Manten la pantalla activa durante el servicio</p>
            </div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              activateWakeLock();
            }}
            className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl font-bold text-sm transition-all duration-200 whitespace-nowrap ml-4"
          >
            Bloquear Pantalla
          </button>
        </div>
      )}

      {/* Legend / urgency guide */}
      <div className="bg-slate-900 border-b border-white/10 px-6 py-3 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-8 text-xs font-medium">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500 ring-2 ring-green-400/30" />
              <span className="text-slate-300">Menos de 5 min <span className="text-slate-500">(A tiempo)</span></span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-amber-500 ring-2 ring-amber-400/30" />
              <span className="text-slate-300">5 a 10 minutos <span className="text-slate-500">(Moderado)</span></span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500 ring-2 ring-red-400/30 animate-pulse" />
              <span className="text-slate-300">Mas de 10 min <span className="text-slate-500 font-bold">(Urgente)</span></span>
            </div>
          </div>

          {/* Trust-Building Stats */}
          <div className="flex items-center gap-6 ml-auto">
            <div className="flex items-center gap-2 text-center">
              <ShieldCheck className="h-4 w-4 text-emerald-300" />
              <div className="text-2xl font-black text-emerald-300">{totalDeliveredItems}</div>
              <span className="text-xs text-slate-400 font-medium">Completadas</span>
            </div>
            <div className="w-px h-4 bg-white/10" />
            <div className="flex items-center gap-2 text-center">
              <Zap className="h-4 w-4 text-cyan-300" />
              <div className="text-2xl font-black text-cyan-300">{avgPrepTime}m</div>
              <span className="text-xs text-slate-400 font-medium">Tiempo prom.</span>
            </div>
          </div>
        </div>
      </div>

      {/* Columns */}
      <div className="flex-1 grid grid-cols-3 gap-4 p-6 overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.14),transparent_34%),linear-gradient(180deg,#020617,#0f172a)]">
        <KDSColumn
          title="PENDIENTES"
          orders={pendingOrders}
          actionLabel="INICIAR"
          actionColor="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-400 hover:to-cyan-400 shadow-blue-500/30"
          headerColor="bg-gradient-to-r from-blue-500/20 to-cyan-400/10 border-l-4 border-blue-400"
          icon={<Flame className="h-5 w-5 text-blue-200" />}
          onAction={(o) => updateOrderStatus(o, 'preparing')}
          loading={actionLoading}
          onPlayTestSound={playNewOrder}
        />

        <KDSColumn
          title="EN PREPARACION"
          orders={preparingOrders}
          actionLabel="LISTO"
          actionColor="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 shadow-amber-500/30"
          headerColor="bg-gradient-to-r from-amber-500/20 to-orange-400/10 border-l-4 border-amber-400"
          icon={<Timer className="h-5 w-5 text-amber-100" />}
          onAction={(o) => updateOrderStatus(o, 'ready')}
          loading={actionLoading}
          onPlayTestSound={playNewOrder}
        />

        <KDSColumn
          title="LISTOS"
          orders={readyOrders}
          actionLabel="ENTREGADO"
          actionColor="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 shadow-emerald-500/30"
          headerColor="bg-gradient-to-r from-emerald-500/20 to-teal-400/10 border-l-4 border-emerald-400"
          icon={<CheckCircle2 className="w-5 h-5 text-emerald-100" />}
          onAction={(o) => updateOrderStatus(o, 'delivered')}
          loading={actionLoading}
          onPlayTestSound={playNewOrder}
        />
      </div>
    </div>
  );
}

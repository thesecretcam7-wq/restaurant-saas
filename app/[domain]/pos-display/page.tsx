'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { Clock, Lock, Maximize2, Minimize2, ReceiptText, ShieldCheck, ShoppingBag, UtensilsCrossed } from 'lucide-react';
import { getCurrencyByCountry, formatPriceWithCurrency } from '@/lib/currency';
import { deriveBrandPalette, readableTextColor } from '@/lib/brand-colors';

interface CartItem {
  name: string;
  price: number;
  quantity: number;
}

interface PosCart {
  items: CartItem[];
  subtotal: number;
  total: number;
  discount: number;
  updated_at: string;
}

interface DisplayBranding {
  app_name?: string | null;
  primary_color?: string | null;
  secondary_color?: string | null;
  accent_color?: string | null;
  background_color?: string | null;
  text_primary_color?: string | null;
  text_secondary_color?: string | null;
  logo_url?: string | null;
}

type WakeLockSentinel = { release: () => Promise<void>; addEventListener?: (event: string, cb: () => void) => void } | null;

export default function CustomerDisplayPage() {
  return (
    <Suspense fallback={<CustomerDisplayLoading />}>
      <CustomerDisplayContent />
    </Suspense>
  );
}

function CustomerDisplayLoading() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#f7f5f0]">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-black/10 border-t-black" />
    </main>
  );
}

function CustomerDisplayContent() {
  const searchParams = useSearchParams();
  const tenantId = searchParams.get('tid');
  const country = searchParams.get('country') || 'CO';
  const currencyInfo = getCurrencyByCountry(country);

  const [cart, setCart] = useState<PosCart | null>(null);
  const [branding, setBranding] = useState<DisplayBranding | null>(null);
  const [taxRate, setTaxRate] = useState(0);
  const [time, setTime] = useState(new Date());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [wakeLocked, setWakeLocked] = useState(false);
  const [wakeLockSupported, setWakeLockSupported] = useState(true);
  const [displayMode, setDisplayMode] = useState(false);
  const wakeLockRef = useRef<WakeLockSentinel>(null);

  const supabase = useMemo(
    () =>
      createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ),
    []
  );

  const palette = deriveBrandPalette({
    primary: branding?.primary_color,
    secondary: branding?.secondary_color,
    accent: branding?.accent_color,
    background: branding?.background_color,
    textPrimary: branding?.text_primary_color,
    textSecondary: branding?.text_secondary_color,
  });
  const { primary, secondary, accent, background, pageText, mutedText } = palette;
  const primaryText = readableTextColor(primary);
  const secondaryText = readableTextColor(secondary);
  const restaurantName = branding?.app_name || 'Restaurante';
  const logoUrl = branding?.logo_url || null;

  function fmt(amount: number) {
    return formatPriceWithCurrency(amount, currencyInfo.code, currencyInfo.locale);
  }

  const requestWakeLock = useCallback(async () => {
    if (typeof navigator === 'undefined' || !('wakeLock' in navigator)) {
      setWakeLockSupported(false);
      return;
    }

    try {
      if (wakeLockRef.current) return;
      const sentinel = await (navigator as any).wakeLock.request('screen');
      wakeLockRef.current = sentinel;
      setWakeLocked(true);
      sentinel.addEventListener?.('release', () => {
        wakeLockRef.current = null;
        setWakeLocked(false);
      });
    } catch {
      setWakeLocked(false);
    }
  }, []);

  const releaseWakeLock = useCallback(async () => {
    try {
      await wakeLockRef.current?.release();
    } catch {}
    wakeLockRef.current = null;
    setWakeLocked(false);
  }, []);

  const enterDisplayMode = useCallback(async () => {
    setDisplayMode(true);
    await requestWakeLock();
    try {
      if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
    } catch {}
  }, [requestWakeLock]);

  const exitDisplayMode = useCallback(async () => {
    setDisplayMode(false);
    await releaseWakeLock();
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
    } catch {}
  }, [releaseWakeLock]);

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const syncFullscreen = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', syncFullscreen);
    return () => document.removeEventListener('fullscreenchange', syncFullscreen);
  }, []);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && displayMode) requestWakeLock();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [displayMode, requestWakeLock]);

  useEffect(() => {
    return () => {
      void releaseWakeLock();
    };
  }, [releaseWakeLock]);

  useEffect(() => {
    if (!tenantId) return;

    async function fetchBranding() {
      try {
        const [brandingRes, settingsRes] = await Promise.all([
          fetch(`/api/tenant/branding?tenantId=${tenantId}`, { cache: 'no-store' }),
          fetch(`/api/settings/${tenantId}`, { cache: 'no-store' }),
        ]);

        if (brandingRes.ok) {
          const json = await brandingRes.json();
          setBranding({
            ...(json.branding || {}),
            logo_url: json.branding?.logo_url || json.tenant?.logo_url || null,
          });
        }

        if (settingsRes.ok) {
          const json = await settingsRes.json();
          setTaxRate(Number(json.settings?.tax_rate ?? json.tax_rate ?? 0));
        }
      } catch {}
    }

    fetchBranding();
  }, [tenantId]);

  useEffect(() => {
    if (!tenantId) return;

    async function fetchCart() {
      const { data } = await supabase
        .from('pos_carts')
        .select('items, subtotal, total, discount, updated_at')
        .eq('tenant_id', tenantId)
        .is('abandoned_at', null)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data && data.items && data.items.length > 0) {
        setCart(data as PosCart);
      } else {
        setCart(null);
      }
    }

    fetchCart();
    const poll = setInterval(fetchCart, 2000);

    const channel = supabase
      .channel(`customer-display:${tenantId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pos_carts',
          filter: `tenant_id=eq.${tenantId}`,
        },
        fetchCart
      )
      .subscribe();

    return () => {
      clearInterval(poll);
      channel.unsubscribe();
    };
  }, [tenantId, supabase]);

  const hasItems = !!cart?.items?.length;
  const itemCount = cart?.items.reduce((sum, item) => sum + item.quantity, 0) || 0;
  const taxableSubtotal = cart ? Math.max(0, Number(cart.subtotal || 0) - Number(cart.discount || 0)) : 0;
  const taxAmount = taxRate > 0 ? taxableSubtotal * (taxRate / 100) : 0;
  const updatedLabel = cart?.updated_at
    ? new Date(cart.updated_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
    : time.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

  return (
    <main
      className="h-screen select-none overflow-hidden"
      style={{ backgroundColor: background, color: pageText, fontFamily: 'Inter, system-ui, sans-serif' }}
    >
      <div className="flex h-full flex-col">
        <header className="flex shrink-0 items-center justify-between gap-4 border-b px-6 py-4 lg:px-10" style={{ borderColor: palette.border, backgroundColor: palette.surface }}>
          <div className="flex items-center gap-4">
            <div className="grid h-16 w-24 place-items-center overflow-visible">
              {logoUrl ? (
                <img src={logoUrl} alt={restaurantName} className="h-20 max-h-none w-28 max-w-none object-contain" />
              ) : (
                <UtensilsCrossed className="h-8 w-8" style={{ color: secondaryText }} />
              )}
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em]" style={{ color: mutedText }}>
                Pantalla del cliente
              </p>
              <h1 className="text-2xl font-black tracking-tight lg:text-3xl" style={{ color: pageText }}>
                {restaurantName}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-3 rounded-2xl border px-4 py-3 md:flex" style={{ borderColor: palette.border, backgroundColor: palette.neutralSoft }}>
              <Clock className="h-5 w-5" style={{ color: primary }} />
              <div className="text-right">
                <p className="text-2xl font-black tabular-nums" style={{ color: pageText }}>
                  {time.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                </p>
                <p className="text-xs font-semibold capitalize" style={{ color: mutedText }}>
                  {time.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                </p>
              </div>
            </div>
            <button
              onClick={displayMode ? exitDisplayMode : enterDisplayMode}
              className="flex h-12 items-center gap-2 rounded-2xl px-4 text-sm font-black shadow-sm transition active:scale-95"
              style={{ backgroundColor: displayMode ? secondary : primary, color: displayMode ? secondaryText : primaryText }}
            >
              {displayMode ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              <span className="hidden sm:inline">{displayMode ? 'Salir' : 'Pantalla completa'}</span>
            </button>
          </div>
        </header>

        <div className="flex shrink-0 items-center justify-between gap-3 px-6 py-3 text-xs font-black lg:px-10" style={{ backgroundColor: secondary, color: secondaryText }}>
          <span className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" style={{ color: accent }} />
            {displayMode && wakeLocked ? 'Pantalla bloqueada y activa' : displayMode && !wakeLockSupported ? 'Pantalla completa activa. Este navegador no permite bloquear reposo.' : displayMode ? 'Pantalla completa activa' : 'Modo mostrador disponible'}
          </span>
          <span className="flex items-center gap-2">
            <Lock className="h-4 w-4" />
            Ultima actualizacion {updatedLabel}
          </span>
        </div>

        {!hasItems ? (
          <section className="grid min-h-0 flex-1 place-items-center px-6 py-8 lg:px-10">
            <div className="w-full max-w-6xl">
              <div className="grid items-center gap-8 lg:grid-cols-[1fr_0.68fr]">
                <div>
                  <p className="mb-5 inline-flex rounded-full px-4 py-2 text-sm font-black uppercase tracking-[0.16em]" style={{ backgroundColor: palette.primarySoft, color: primary }}>
                    Listo para tomar pedido
                  </p>
                  <h2 className="max-w-3xl text-6xl font-black leading-[0.92] tracking-tight lg:text-7xl" style={{ color: pageText }}>
                    Bienvenido
                  </h2>
                  <p className="mt-6 max-w-xl text-2xl font-semibold leading-snug" style={{ color: mutedText }}>
                    El detalle de tu compra aparecera aqui mientras el cajero agrega los productos.
                  </p>
                </div>

                <div className="rounded-[2rem] border p-8 shadow-2xl shadow-black/10" style={{ backgroundColor: secondary, borderColor: palette.border, color: secondaryText }}>
                  <div className="grid aspect-square place-items-center rounded-[1.5rem]" style={{ backgroundColor: palette.primarySoft }}>
                    <ShoppingBag className="h-32 w-32" style={{ color: primary }} />
                  </div>
                  <div className="mt-8 flex items-center justify-between">
                    <span className="text-sm font-black uppercase tracking-[0.18em]" style={{ color: secondaryText }}>
                      Pedido actual
                    </span>
                    <span className="rounded-full px-3 py-1 text-sm font-black" style={{ backgroundColor: primary, color: primaryText }}>
                      En espera
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        ) : (
          <section className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_390px] gap-5 px-6 py-5 lg:grid-cols-[minmax(0,1fr)_430px] lg:px-10">
            <div className="flex min-h-0 flex-col rounded-[2rem] border shadow-xl shadow-black/5" style={{ borderColor: palette.border, backgroundColor: palette.surface }}>
              <div className="flex shrink-0 items-center justify-between border-b px-6 py-4" style={{ borderColor: palette.border }}>
                <div className="flex items-center gap-3">
                  <div className="grid h-12 w-12 place-items-center rounded-2xl" style={{ backgroundColor: palette.primarySoft }}>
                    <ReceiptText className="h-6 w-6" style={{ color: primary }} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black" style={{ color: palette.text }}>Tu pedido</h2>
                    <p className="text-sm font-semibold text-gray-500">{itemCount} productos agregados</p>
                  </div>
                </div>
                <span className="rounded-full px-4 py-2 text-sm font-black" style={{ backgroundColor: palette.primarySoft, color: primary }}>
                  En caja
                </span>
              </div>

              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4 lg:p-5">
                {cart!.items.map((item, i) => (
                  <div
                    key={`${item.name}-${i}`}
                    className="grid grid-cols-[64px_minmax(0,1fr)_auto] items-center gap-4 rounded-2xl border px-5 py-4 shadow-sm"
                    style={{ borderColor: palette.border, backgroundColor: palette.cardSurface }}
                  >
                    <div className="grid h-14 w-14 place-items-center rounded-2xl text-xl font-black" style={{ backgroundColor: primary, color: primaryText }}>
                      {item.quantity}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-2xl font-black" style={{ color: palette.text }}>{item.name}</p>
                      <p className="mt-1 text-sm font-semibold" style={{ color: mutedText }}>{fmt(item.price)} c/u</p>
                    </div>
                    <p className="text-3xl font-black tabular-nums" style={{ color: primary }}>
                      {fmt(item.price * item.quantity)}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <aside className="flex min-h-0 flex-col justify-between rounded-[2rem] p-7 shadow-2xl shadow-black/10" style={{ backgroundColor: secondary, color: secondaryText }}>
              <div>
                <p className="text-sm font-black uppercase tracking-[0.18em] opacity-70">Resumen</p>
                <div className="mt-8 space-y-4">
                  <div className="flex items-center justify-between text-lg">
                    <span className="opacity-70">Subtotal</span>
                    <span className="font-black tabular-nums">{fmt(cart!.subtotal)}</span>
                  </div>
                  {cart!.discount > 0 && (
                    <div className="flex items-center justify-between rounded-2xl px-4 py-3 text-lg" style={{ backgroundColor: `${accent}22`, color: accent }}>
                      <span className="font-bold">Descuento</span>
                      <span className="font-black tabular-nums">-{fmt(cart!.discount)}</span>
                    </div>
                  )}
                  {taxRate > 0 && (
                    <div className="flex items-center justify-between text-lg">
                      <span className="opacity-70">IVA {taxRate}%</span>
                      <span className="font-black tabular-nums">{fmt(taxAmount)}</span>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <div className="mb-6 h-px w-full bg-white/15" />
                <p className="text-sm font-black uppercase tracking-[0.2em] opacity-70">Total a pagar</p>
                <p className="mt-3 text-6xl font-black leading-none tabular-nums" style={{ color: accent }}>
                  {fmt(cart!.total)}
                </p>
                <p className="mt-6 rounded-2xl px-5 py-4 text-center text-lg font-black" style={{ backgroundColor: primary, color: primaryText }}>
                  Gracias por tu compra
                </p>
              </div>
            </aside>
          </section>
        )}
      </div>
    </main>
  );
}

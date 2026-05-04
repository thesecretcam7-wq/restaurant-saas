'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { Clock, ReceiptText, ShoppingBag, UtensilsCrossed } from 'lucide-react';
import { getCurrencyByCountry, formatPriceWithCurrency } from '@/lib/currency';

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
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  return luminance < 0.5;
}

function readableText(background: string, preferred?: string | null, fallbackDark = '#15130f', fallbackLight = '#ffffff') {
  if (preferred && preferred !== background) return preferred;
  return isDark(background) ? fallbackLight : fallbackDark;
}

export default function CustomerDisplayPage() {
  const searchParams = useSearchParams();
  const tenantId = searchParams.get('tid');
  const country = searchParams.get('country') || 'CO';
  const currencyInfo = getCurrencyByCountry(country);

  const [cart, setCart] = useState<PosCart | null>(null);
  const [branding, setBranding] = useState<DisplayBranding | null>(null);
  const [time, setTime] = useState(new Date());

  const supabase = useMemo(
    () =>
      createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ),
    []
  );

  const primary = branding?.primary_color || '#E4002B';
  const secondary = branding?.secondary_color || '#111827';
  const accent = branding?.accent_color || primary;
  const background = branding?.background_color || '#f7f5f0';
  const pageText = readableText(background, branding?.text_primary_color);
  const mutedText = readableText(background, branding?.text_secondary_color, 'rgba(21,19,15,0.58)', 'rgba(255,255,255,0.68)');
  const primaryText = readableText(primary);
  const secondaryText = readableText(secondary);
  const restaurantName = branding?.app_name || 'Restaurante';
  const logoUrl = branding?.logo_url || null;

  function fmt(amount: number) {
    return formatPriceWithCurrency(amount, currencyInfo.code, currencyInfo.locale);
  }

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!tenantId) return;

    async function fetchBranding() {
      try {
        const res = await fetch(`/api/tenant/branding?tenantId=${tenantId}`, { cache: 'no-store' });
        if (!res.ok) return;
        const json = await res.json();
        setBranding({
          ...(json.branding || {}),
          logo_url: json.branding?.logo_url || json.tenant?.logo_url || null,
        });
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

  return (
    <main
      className="min-h-screen select-none overflow-hidden"
      style={{ backgroundColor: background, color: pageText, fontFamily: 'Inter, system-ui, sans-serif' }}
    >
      <div className="flex min-h-screen flex-col">
        <header className="flex items-center justify-between px-10 py-7">
          <div className="flex items-center gap-4">
            <div
              className="grid h-16 w-16 place-items-center overflow-hidden rounded-2xl border shadow-sm"
              style={{ backgroundColor: secondary, borderColor: `${primary}55` }}
            >
              {logoUrl ? (
                <img src={logoUrl} alt={restaurantName} className="h-full w-full object-contain bg-white p-2" />
              ) : (
                <UtensilsCrossed className="h-8 w-8" style={{ color: secondaryText }} />
              )}
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em]" style={{ color: mutedText }}>
                Pantalla del cliente
              </p>
              <h1 className="text-3xl font-black tracking-tight" style={{ color: pageText }}>
                {restaurantName}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-2xl border px-4 py-3" style={{ borderColor: `${primary}55`, backgroundColor: 'rgba(255,255,255,0.12)' }}>
            <Clock className="h-5 w-5" style={{ color: primary }} />
            <div className="text-right">
              <p className="text-2xl font-black tabular-nums" style={{ color: pageText }}>
                {time.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
              </p>
              <p className="text-xs font-semibold" style={{ color: mutedText }}>
                {time.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
            </div>
          </div>
        </header>

        {!hasItems ? (
          <section className="grid flex-1 place-items-center px-10 pb-12">
            <div className="w-full max-w-5xl">
              <div className="grid grid-cols-[1fr_0.72fr] items-center gap-10">
                <div>
                  <p className="mb-5 inline-flex rounded-full px-4 py-2 text-sm font-black uppercase tracking-[0.16em]" style={{ backgroundColor: `${primary}20`, color: primary }}>
                    Listo para tomar pedido
                  </p>
                  <h2 className="max-w-3xl text-7xl font-black leading-[0.92] tracking-tight" style={{ color: pageText }}>
                    Bienvenido
                  </h2>
                  <p className="mt-6 max-w-xl text-2xl font-semibold leading-snug" style={{ color: mutedText }}>
                    El detalle de tu compra aparecera aqui mientras el cajero agrega los productos.
                  </p>
                </div>

                <div className="rounded-[2rem] border p-8 shadow-2xl" style={{ backgroundColor: secondary, borderColor: `${primary}55`, color: secondaryText }}>
                  <div className="grid aspect-square place-items-center rounded-[1.5rem]" style={{ backgroundColor: `${primary}22` }}>
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
          <section className="grid flex-1 grid-cols-[1fr_430px] gap-8 px-10 pb-10">
            <div className="flex min-h-0 flex-col rounded-[2rem] border bg-white/80 shadow-xl" style={{ borderColor: `${primary}45` }}>
              <div className="flex items-center justify-between border-b px-7 py-5" style={{ borderColor: `${primary}35` }}>
                <div className="flex items-center gap-3">
                  <div className="grid h-12 w-12 place-items-center rounded-2xl" style={{ backgroundColor: `${primary}20` }}>
                    <ReceiptText className="h-6 w-6" style={{ color: primary }} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black" style={{ color: '#15130f' }}>Tu pedido</h2>
                    <p className="text-sm font-semibold text-gray-500">{itemCount} productos agregados</p>
                  </div>
                </div>
                <span className="rounded-full px-4 py-2 text-sm font-black" style={{ backgroundColor: `${accent}22`, color: accent }}>
                  En caja
                </span>
              </div>

              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-6">
                {cart!.items.map((item, i) => (
                  <div
                    key={`${item.name}-${i}`}
                    className="grid grid-cols-[70px_1fr_auto] items-center gap-5 rounded-2xl border bg-white px-5 py-4 shadow-sm"
                    style={{ borderColor: '#e7e2d8' }}
                  >
                    <div className="grid h-14 w-14 place-items-center rounded-2xl text-xl font-black" style={{ backgroundColor: primary, color: primaryText }}>
                      {item.quantity}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-2xl font-black text-[#15130f]">{item.name}</p>
                      <p className="mt-1 text-sm font-semibold text-gray-500">{fmt(item.price)} c/u</p>
                    </div>
                    <p className="text-3xl font-black tabular-nums" style={{ color: primary }}>
                      {fmt(item.price * item.quantity)}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <aside className="flex flex-col justify-between rounded-[2rem] p-7 shadow-2xl" style={{ backgroundColor: secondary, color: secondaryText }}>
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

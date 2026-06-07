'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { AlertCircle, CheckCircle, Minus, Plus, ReceiptText, ShoppingBag, Utensils, X } from 'lucide-react';
import { formatPriceWithCurrency, getCurrencyByCountry } from '@/lib/currency';

interface MenuItem {
  id: string;
  tenant_id: string;
  name: string;
  price: number;
  description?: string | null;
  image_url?: string | null;
  category_id?: string | null;
}

interface Category {
  id: string;
  name: string;
}

interface CartItem {
  menu_item_id: string;
  name: string;
  price: number;
  quantity: number;
  image_url?: string | null;
}

interface TableQrPayload {
  qrCode: {
    id: string;
    uniqueCode: string;
    tableId: string;
  };
  tenant: {
    id: string;
    slug: string;
    name: string;
    logoUrl?: string | null;
    country?: string | null;
  };
  table: {
    id: string;
    table_number: number;
    seats?: number | null;
    location?: string | null;
    status?: string | null;
  };
  menu: MenuItem[];
  categories: Category[];
  settings: {
    country?: string | null;
    country_code?: string | null;
    currency?: string | null;
    currency_symbol?: string | null;
    tax_rate?: number | null;
  };
  branding: {
    app_name?: string | null;
    logo_url?: string | null;
    primary_color?: string | null;
    button_primary_color?: string | null;
    background_color?: string | null;
    text_primary_color?: string | null;
  };
}

export default function TableOrderPage() {
  const params = useParams();
  const code = String(params.code || '');

  const [data, setData] = useState<TableQrPayload | null>(null);
  const [csrfToken, setCsrfToken] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderNotes, setOrderNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCart, setShowCart] = useState(false);
  const [orderDone, setOrderDone] = useState<{ orderNumber?: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 12000);

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const [qrResponse, csrfResponse] = await Promise.all([
          fetch(`/api/table-qr?code=${encodeURIComponent(code)}`, { cache: 'no-store', signal: controller.signal }),
          fetch('/api/csrf-token', { credentials: 'include', cache: 'no-store', signal: controller.signal }).catch(() => null),
        ]);

        const qrPayload = await qrResponse.json();
        if (!qrResponse.ok) throw new Error(qrPayload.error || 'Codigo QR invalido');

        const csrfPayload = csrfResponse ? await csrfResponse.json().catch(() => null) : null;
        const token = csrfPayload?.token || csrfResponse?.headers.get('x-csrf-token') || '';

        if (!cancelled) {
          setData(qrPayload);
          setCsrfToken(token);
          setActiveCategory(qrPayload.categories?.[0]?.id || null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof DOMException && err.name === 'AbortError'
            ? 'La carta esta tardando en responder. Revisa la conexion y vuelve a escanear el QR.'
            : err instanceof Error ? err.message : 'Error al cargar la carta');
        }
      } finally {
        window.clearTimeout(timeoutId);
        if (!cancelled) setLoading(false);
      }
    }

    if (code) {
      load();
    } else {
      window.clearTimeout(timeoutId);
      setError('Codigo QR invalido');
      setLoading(false);
    }

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [code]);

  const theme = useMemo(() => {
    const primary = data?.branding?.button_primary_color || data?.branding?.primary_color || '#f97316';
    return {
      primary,
      accent: '#16a34a',
      pageBg: data?.branding?.background_color || '#f8fafc',
      text: data?.branding?.text_primary_color || '#0f172a',
    };
  }, [data]);

  const currencyInfo = useMemo(() => {
    const country = data?.settings?.country_code || data?.settings?.country || data?.tenant?.country || 'CO';
    const countryCurrency = getCurrencyByCountry(country);
    return data?.settings?.currency
      ? {
          ...countryCurrency,
          code: data.settings.currency,
          symbol: data.settings.currency_symbol || countryCurrency.symbol,
        }
      : countryCurrency;
  }, [data]);

  const menu = data?.menu || [];
  const categories = data?.categories || [];
  const filteredMenu = activeCategory ? menu.filter((item) => item.category_id === activeCategory) : menu;
  const tableNumber = data?.table?.table_number;
  const restaurantName = data?.branding?.app_name || data?.tenant?.name || 'Restaurante';
  const logoUrl = data?.branding?.logo_url || data?.tenant?.logoUrl || null;
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const money = (value: number) => formatPriceWithCurrency(Number(value || 0), currencyInfo.code, currencyInfo.locale);

  function addToCart(item: MenuItem) {
    setCart((current) => {
      const existing = current.find((cartItem) => cartItem.menu_item_id === item.id);
      if (existing) {
        return current.map((cartItem) =>
          cartItem.menu_item_id === item.id
            ? { ...cartItem, quantity: cartItem.quantity + 1 }
            : cartItem
        );
      }
      return [
        ...current,
        {
          menu_item_id: item.id,
          name: item.name,
          price: Number(item.price || 0),
          quantity: 1,
          image_url: item.image_url,
        },
      ];
    });
  }

  function removeFromCart(itemId: string) {
    setCart((current) => {
      const existing = current.find((cartItem) => cartItem.menu_item_id === itemId);
      if (!existing) return current;
      if (existing.quantity <= 1) return current.filter((cartItem) => cartItem.menu_item_id !== itemId);
      return current.map((cartItem) =>
        cartItem.menu_item_id === itemId
          ? { ...cartItem, quantity: cartItem.quantity - 1 }
          : cartItem
      );
    });
  }

  async function submitOrder() {
    if (!data || cart.length === 0 || submitting) return;

    if (!csrfToken) {
      setError('Cargando seguridad del pedido. Intenta de nuevo.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken,
        },
        body: JSON.stringify({
          tenantId: data.tenant.id,
          tenantSlug: data.tenant.slug,
          source: 'table-qr',
          tableId: data.table.id,
          tableQrCode: code,
          tableNumber: data.table.table_number,
          deliveryType: 'dine-in',
          paymentMethod: null,
          customerInfo: {
            name: `Mesa ${data.table.table_number}`,
            phone: null,
            email: null,
          },
          notes: orderNotes.trim() || null,
          items: cart.map((item) => ({
            item_id: item.menu_item_id,
            menu_item_id: item.menu_item_id,
            name: item.name,
            price: item.price,
            qty: item.quantity,
            quantity: item.quantity,
          })),
        }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'No se pudo enviar el pedido');

      setCart([]);
      setOrderNotes('');
      setShowCart(false);
      setOrderDone({ orderNumber: result.orderNumber });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al enviar el pedido');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-50 px-6">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-slate-300 border-t-orange-500" />
          <p className="mt-4 text-sm font-bold text-slate-500">Cargando carta...</p>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-50 px-6">
        <div className="max-w-sm rounded-2xl border border-red-100 bg-white p-6 text-center shadow-sm">
          <AlertCircle className="mx-auto h-10 w-10 text-red-500" />
          <p className="mt-4 text-sm font-bold text-slate-900">{error}</p>
        </div>
      </div>
    );
  }

  if (orderDone) {
    return (
      <div className="grid min-h-screen place-items-center px-6 text-center" style={{ backgroundColor: theme.pageBg }}>
        <div className="w-full max-w-sm rounded-3xl border border-white/70 bg-white p-7 shadow-xl">
          <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-emerald-100">
            <CheckCircle className="h-11 w-11 text-emerald-600" />
          </div>
          <p className="mt-6 text-xs font-black uppercase tracking-wide text-emerald-700">Pedido enviado</p>
          <h1 className="mt-2 text-2xl font-black text-slate-950">Mesa {tableNumber}</h1>
          {orderDone.orderNumber && (
            <p className="mt-2 text-sm font-bold text-slate-500">{orderDone.orderNumber}</p>
          )}
          <button
            type="button"
            onClick={() => setOrderDone(null)}
            className="mt-7 h-12 w-full rounded-2xl text-sm font-black text-white shadow-lg active:scale-95"
            style={{ backgroundColor: theme.primary }}
          >
            Pedir algo mas
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-28" style={{ backgroundColor: theme.pageBg, color: theme.text }}>
      <header className="sticky top-0 z-30 border-b border-black/5 bg-white/95 px-4 py-3 shadow-sm backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          {logoUrl ? (
            <img src={logoUrl} alt="" className="h-12 w-14 rounded-xl object-contain" />
          ) : (
            <div className="grid h-12 w-12 place-items-center rounded-xl text-white" style={{ backgroundColor: theme.primary }}>
              <Utensils className="h-6 w-6" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-black text-slate-950">{restaurantName}</p>
            <p className="text-sm font-bold text-slate-500">Mesa {tableNumber}</p>
          </div>
          <button
            type="button"
            onClick={() => setShowCart(true)}
            className="relative grid h-11 w-11 place-items-center rounded-full bg-slate-100 text-slate-900"
          >
            <ShoppingBag className="h-5 w-5" />
            {cartCount > 0 && (
              <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full px-1 text-[11px] font-black text-white" style={{ backgroundColor: theme.accent }}>
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {categories.length > 0 && (
        <div className="sticky top-[69px] z-20 border-b border-black/5 bg-white/90 px-4 py-3 backdrop-blur">
          <div className="mx-auto flex max-w-2xl gap-2 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveCategory(null)}
              className="h-10 flex-shrink-0 rounded-full border px-4 text-xs font-black"
              style={{
                backgroundColor: activeCategory === null ? theme.primary : '#f8fafc',
                borderColor: activeCategory === null ? theme.primary : '#e2e8f0',
                color: activeCategory === null ? '#ffffff' : '#334155',
              }}
            >
              Todo
            </button>
            {categories.map((category) => {
              const active = activeCategory === category.id;
              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setActiveCategory(category.id)}
                  className="h-10 flex-shrink-0 rounded-full border px-4 text-xs font-black"
                  style={{
                    backgroundColor: active ? theme.primary : '#f8fafc',
                    borderColor: active ? theme.primary : '#e2e8f0',
                    color: active ? '#ffffff' : '#334155',
                  }}
                >
                  {category.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <main className="mx-auto max-w-2xl px-4 py-4">
        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-2xl border border-red-100 bg-red-50 p-3 text-sm font-bold text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {filteredMenu.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center text-sm font-bold text-slate-500">
            No hay productos disponibles.
          </div>
        ) : (
          <div className="space-y-3">
            {filteredMenu.map((item) => {
              const inCart = cart.find((cartItem) => cartItem.menu_item_id === item.id);
              return (
                <article key={item.id} className="flex gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                  {item.image_url ? (
                    <img src={item.image_url} alt={item.name} className="h-20 w-20 flex-shrink-0 rounded-xl object-cover" />
                  ) : (
                    <div className="grid h-20 w-20 flex-shrink-0 place-items-center rounded-xl bg-orange-50 text-orange-600">
                      <Utensils className="h-7 w-7" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <h2 className="line-clamp-2 text-sm font-black text-slate-950">{item.name}</h2>
                    {item.description && (
                      <p className="mt-1 line-clamp-2 text-xs font-semibold text-slate-500">{item.description}</p>
                    )}
                    <p className="mt-2 text-sm font-black" style={{ color: theme.primary }}>{money(item.price)}</p>
                  </div>
                  <div className="flex flex-shrink-0 flex-col items-center justify-center gap-2">
                    {inCart ? (
                      <>
                        <button
                          type="button"
                          onClick={() => addToCart(item)}
                          className="grid h-9 w-9 place-items-center rounded-full text-white shadow-sm active:scale-95"
                          style={{ backgroundColor: theme.primary }}
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                        <span className="text-sm font-black text-slate-950">{inCart.quantity}</span>
                        <button
                          type="button"
                          onClick={() => removeFromCart(item.id)}
                          className="grid h-9 w-9 place-items-center rounded-full bg-slate-100 text-slate-700 active:scale-95"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => addToCart(item)}
                        className="grid h-10 w-10 place-items-center rounded-full text-white shadow-sm active:scale-95"
                        style={{ backgroundColor: theme.primary }}
                      >
                        <Plus className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>

      {cartCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-black/10 bg-white px-4 py-3 shadow-[0_-12px_40px_rgba(15,23,42,0.12)]">
          <button
            type="button"
            onClick={() => setShowCart(true)}
            className="mx-auto flex h-14 w-full max-w-2xl items-center justify-between rounded-2xl px-4 font-black text-white active:scale-[0.99]"
            style={{ backgroundColor: theme.primary }}
          >
            <span className="grid h-8 min-w-8 place-items-center rounded-full bg-white/20 px-2 text-sm">{cartCount}</span>
            <span>Ver pedido</span>
            <span>{money(total)}</span>
          </button>
        </div>
      )}

      {showCart && (
        <div className="fixed inset-0 z-50 flex items-end">
          <button
            type="button"
            aria-label="Cerrar carrito"
            className="absolute inset-0 bg-slate-950/55 backdrop-blur-sm"
            onClick={() => setShowCart(false)}
          />
          <section className="relative max-h-[88vh] w-full overflow-hidden rounded-t-3xl bg-white shadow-2xl">
            <div className="mx-auto max-w-2xl">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4">
                <div>
                  <p className="text-lg font-black text-slate-950">Tu pedido</p>
                  <p className="text-xs font-bold text-slate-500">Mesa {tableNumber}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCart(false)}
                  className="grid h-10 w-10 place-items-center rounded-full bg-slate-100 text-slate-700"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="max-h-[48vh] overflow-y-auto px-4 py-3">
                {cart.length === 0 ? (
                  <div className="py-10 text-center text-sm font-bold text-slate-500">El pedido esta vacio.</div>
                ) : (
                  <div className="space-y-3">
                    {cart.map((item) => (
                      <div key={item.menu_item_id} className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => removeFromCart(item.menu_item_id)}
                            className="grid h-8 w-8 place-items-center rounded-full bg-white text-slate-700"
                          >
                            <Minus className="h-4 w-4" />
                          </button>
                          <span className="w-5 text-center text-sm font-black text-slate-950">{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() => {
                              const menuItem = menu.find((entry) => entry.id === item.menu_item_id);
                              if (menuItem) addToCart(menuItem);
                            }}
                            className="grid h-8 w-8 place-items-center rounded-full text-white"
                            style={{ backgroundColor: theme.primary }}
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-black text-slate-950">{item.name}</p>
                          <p className="text-xs font-bold text-slate-500">{money(item.price * item.quantity)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <label className="mt-4 block">
                  <span className="text-xs font-black uppercase tracking-wide text-slate-500">Notas</span>
                  <textarea
                    value={orderNotes}
                    onChange={(event) => setOrderNotes(event.target.value)}
                    rows={2}
                    placeholder="Sin cebolla, alergias, indicaciones..."
                    className="mt-2 w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-950 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-200"
                  />
                </label>
              </div>

              <div className="border-t border-slate-100 px-4 py-4">
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-500">Total</span>
                  <span className="text-2xl font-black text-slate-950">{money(total)}</span>
                </div>
                <button
                  type="button"
                  onClick={submitOrder}
                  disabled={submitting || cart.length === 0}
                  className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl text-sm font-black text-white shadow-lg transition active:scale-[0.99] disabled:bg-slate-300"
                  style={submitting || cart.length === 0 ? undefined : { backgroundColor: theme.accent }}
                >
                  <ReceiptText className="h-5 w-5" />
                  {submitting ? 'Enviando...' : 'Enviar pedido'}
                </button>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

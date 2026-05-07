'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { Plus, Minus, X, CheckCircle } from 'lucide-react';
import { formatPriceWithCurrency, getCurrencyByCountry } from '@/lib/currency';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface MenuItem {
  id: string;
  name: string;
  price: number;
  description?: string;
  image_url?: string;
  category_id?: string;
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
}

export default function TableOrderPage() {
  const params = useParams();
  const code = params.code as string;

  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [qrData, setQrData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCart, setShowCart] = useState(false);
  const [orderDone, setOrderDone] = useState(false);
  const [currencyInfo, setCurrencyInfo] = useState(() => getCurrencyByCountry('ES'));

  useEffect(() => { fetchQRData(); }, [code]);

  async function fetchQRData() {
    try {
      const { data: qrCodeData, error: qrError } = await supabase
        .from('table_qr_codes')
        .select('*, tables(*), tenants(id)')
        .eq('unique_code', code)
        .single();

      if (qrError || !qrCodeData) { setError('Código QR inválido'); return; }
      setQrData(qrCodeData);

      const [menuRes, catRes, settingsRes] = await Promise.all([
        supabase.from('menu_items').select('*').eq('tenant_id', qrCodeData.tenant_id).eq('available', true).order('category_id, name'),
        supabase.from('menu_categories').select('id, name').eq('tenant_id', qrCodeData.tenant_id).order('name'),
        supabase
          .from('restaurant_settings')
          .select('currency, currency_symbol, country, country_code')
          .eq('tenant_id', qrCodeData.tenant_id)
          .maybeSingle(),
      ]);

      setMenu(menuRes.data || []);
      setCategories(catRes.data || []);
      const settings = settingsRes.data as any;
      const country = settings?.country_code || settings?.country || 'ES';
      const countryCurrency = getCurrencyByCountry(country);
      setCurrencyInfo(settings?.currency
        ? { ...countryCurrency, code: settings.currency, symbol: settings.currency_symbol || countryCurrency.symbol }
        : countryCurrency
      );
    } catch {
      setError('Error al cargar el menú');
    } finally {
      setLoading(false);
    }
  }

  function addToCart(item: MenuItem) {
    setCart(prev => {
      const existing = prev.find(c => c.menu_item_id === item.id);
      if (existing) return prev.map(c => c.menu_item_id === item.id ? { ...c, quantity: c.quantity + 1 } : c);
      return [...prev, { menu_item_id: item.id, name: item.name, price: item.price, quantity: 1 }];
    });
  }

  function removeFromCart(itemId: string) {
    setCart(prev => {
      const existing = prev.find(c => c.menu_item_id === itemId);
      if (!existing) return prev;
      if (existing.quantity === 1) return prev.filter(c => c.menu_item_id !== itemId);
      return prev.map(c => c.menu_item_id === itemId ? { ...c, quantity: c.quantity - 1 } : c);
    });
  }

  async function submitOrder() {
    if (cart.length === 0) return;
    setSubmitting(true);
    setError(null);
    try {
      const sessionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const response = await fetch('/api/table-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: qrData.tenant_id,
          tableId: qrData.table_id,
          sessionId,
          uniqueCode: code,
          orderItems: cart,
        }),
      });
      if (!response.ok) throw new Error();
      setCart([]);
      setShowCart(false);
      setOrderDone(true);
    } catch {
      setError('Error al enviar el pedido. Intenta de nuevo.');
    } finally {
      setSubmitting(false);
    }
  }

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const filteredMenu = activeCategory ? menu.filter(i => i.category_id === activeCategory) : menu;
  const money = (value: number) => formatPriceWithCurrency(Number(value || 0), currencyInfo.code, currencyInfo.locale);
  const tableNumber = qrData?.tables?.table_number ?? '—';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Cargando menú...</p>
        </div>
      </div>
    );
  }

  if (error && menu.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen bg-white p-6">
        <p className="text-red-500 font-medium text-center">{error}</p>
      </div>
    );
  }

  if (orderDone) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-white p-6 text-center">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-5">
          <CheckCircle className="w-10 h-10 text-green-500" />
        </div>
        <h2 className="text-2xl font-black text-gray-900 mb-2">¡Pedido enviado!</h2>
        <p className="text-gray-400 text-sm mb-8">El personal te atenderá en la mesa {tableNumber}.</p>
        <button
          onClick={() => setOrderDone(false)}
          className="bg-blue-600 text-white font-bold px-8 py-3 rounded-2xl text-base"
        >
          Agregar más items
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-safe-top pb-3 flex-shrink-0">
        <p className="text-xs text-gray-400 font-medium uppercase tracking-widest">Mesa</p>
        <h1 className="text-xl font-black text-gray-900 leading-tight">{tableNumber}</h1>
      </div>

      {/* Categories */}
      {categories.length > 0 && (
        <div className="bg-white border-b border-gray-100 flex-shrink-0">
          <div className="flex gap-2 px-4 py-2.5 overflow-x-auto scrollbar-hide">
            <button
              onClick={() => setActiveCategory(null)}
              className={`px-3.5 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap flex-shrink-0 transition-colors ${
                !activeCategory ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
              }`}
            >
              Todo
            </button>
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-3.5 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap flex-shrink-0 transition-colors ${
                  activeCategory === cat.id ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Menu items */}
      <div className="flex-1 overflow-y-auto pb-24">
        <div className="divide-y divide-gray-100">
          {filteredMenu.map(item => {
            const inCart = cart.find(c => c.menu_item_id === item.id);
            return (
              <div key={item.id} className="bg-white flex items-center gap-3 px-4 py-3 active:bg-gray-50">
                {item.image_url ? (
                  <img src={item.image_url} alt={item.name} className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-gray-100 flex items-center justify-center text-2xl flex-shrink-0">
                    🍽️
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm leading-tight">{item.name}</p>
                  {item.description && (
                    <p className="text-gray-400 text-xs mt-0.5 line-clamp-1">{item.description}</p>
                  )}
                  <p className="text-blue-600 font-bold text-sm mt-1">{money(item.price)}</p>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {inCart ? (
                    <>
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center active:scale-95 transition-transform"
                      >
                        <Minus className="w-3.5 h-3.5 text-gray-600" />
                      </button>
                      <span className="w-5 text-center font-bold text-sm text-gray-900">{inCart.quantity}</span>
                      <button
                        onClick={() => addToCart(item)}
                        className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center active:scale-95 transition-transform"
                      >
                        <Plus className="w-3.5 h-3.5 text-white" />
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => addToCart(item)}
                      className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center active:scale-95 transition-transform"
                    >
                      <Plus className="w-3.5 h-3.5 text-white" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Sticky Cart Bar */}
      {cartCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-3 pb-safe-bottom">
          <button
            onClick={() => setShowCart(true)}
            className="w-full bg-blue-600 active:bg-blue-700 text-white rounded-2xl py-3.5 px-4 flex items-center justify-between font-bold transition-colors"
          >
            <span className="bg-blue-500 rounded-lg px-2.5 py-0.5 text-sm font-bold min-w-[2rem] text-center">
              {cartCount}
            </span>
            <span className="text-base">Ver pedido</span>
            <span className="text-base">{money(total)}</span>
          </button>
        </div>
      )}

      {/* Cart Bottom Sheet */}
      {showCart && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowCart(false)}
          />
          <div className="relative bg-white rounded-t-3xl max-h-[85vh] flex flex-col shadow-2xl">
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
              <div className="w-10 h-1 bg-gray-200 rounded-full" />
            </div>

            {/* Sheet Header */}
            <div className="flex items-center justify-between px-4 pb-3 pt-1 flex-shrink-0">
              <div>
                <h2 className="text-lg font-black text-gray-900">Tu pedido</h2>
                <p className="text-xs text-gray-400">Mesa {tableNumber}</p>
              </div>
              <button
                onClick={() => setShowCart(false)}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center"
              >
                <X className="w-4 h-4 text-gray-600" />
              </button>
            </div>

            <div className="border-t border-gray-100" />

            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
              {cart.map(item => (
                <div key={item.menu_item_id} className="flex items-center gap-3">
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => removeFromCart(item.menu_item_id)}
                      className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center active:scale-95 transition-transform"
                    >
                      <Minus className="w-3 h-3 text-gray-600" />
                    </button>
                    <span className="w-5 text-center font-black text-sm text-gray-900">{item.quantity}</span>
                    <button
                      onClick={() => { const m = menu.find(mi => mi.id === item.menu_item_id); if (m) addToCart(m); }}
                      className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center active:scale-95 transition-transform"
                    >
                      <Plus className="w-3 h-3 text-blue-600" />
                    </button>
                  </div>
                  <span className="flex-1 text-sm font-semibold text-gray-900">{item.name}</span>
                  <span className="text-sm font-bold text-gray-700 flex-shrink-0">
                    {money(item.price * item.quantity)}
                  </span>
                </div>
              ))}
            </div>

            {/* Total + Submit */}
            <div className="px-4 pt-3 pb-safe-bottom border-t border-gray-100 flex-shrink-0">
              <div className="flex justify-between items-center mb-4">
                <span className="text-base font-semibold text-gray-700">Total</span>
                <span className="text-2xl font-black text-gray-900">{money(total)}</span>
              </div>
              {error && (
                <p className="text-red-500 text-sm mb-3 text-center">{error}</p>
              )}
              <button
                onClick={submitOrder}
                disabled={submitting}
                className="w-full bg-blue-600 disabled:bg-gray-300 active:bg-blue-700 text-white font-black py-4 rounded-2xl text-base transition-colors mb-2"
              >
                {submitting ? 'Enviando...' : '🔔 Enviar a cocina'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

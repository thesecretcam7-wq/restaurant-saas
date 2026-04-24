'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { ChefHat, Plus, Minus, Trash2, Send, Search, CheckCircle, ShoppingCart, X, ChevronLeft } from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Category { id: string; name: string; sort_order: number; }
interface MenuItem { id: string; name: string; price: number; category_id: string; description: string | null; image_url: string | null; }
interface CartItem { menu_item_id: string; name: string; price: number; quantity: number; notes: string; }

interface Props {
  tenantId: string;
  tenantName: string;
}

export function KitchenClient({ tenantId, tenantName }: Props) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [tableNumber, setTableNumber] = useState('');
  const [waiterName, setWaiterName] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');
  const [cartOpen, setCartOpen] = useState(false);

  useEffect(() => {
    // Auto-fill waiter name from login session
    try {
      const name = sessionStorage.getItem('staff_name');
      if (name) setWaiterName(name);
    } catch {}

    async function load() {
      const [{ data: cats }, { data: items }] = await Promise.all([
        supabase.from('menu_categories').select('id, name, sort_order').eq('tenant_id', tenantId).eq('active', true).order('sort_order'),
        supabase.from('menu_items').select('id, name, price, category_id, description, image_url').eq('tenant_id', tenantId).eq('available', true),
      ]);
      setCategories(cats || []);
      setMenuItems(items || []);
      if (cats && cats.length > 0) setSelectedCategory(cats[0].id);
      setLoading(false);
    }
    load();
  }, [tenantId]);

  const filteredItems = menuItems.filter(item => {
    const matchesCat = !selectedCategory || item.category_id === selectedCategory;
    const matchesSearch = !search || item.name.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const addToCart = useCallback((item: MenuItem) => {
    setCart(prev => {
      const existing = prev.find(c => c.menu_item_id === item.id);
      if (existing) return prev.map(c => c.menu_item_id === item.id ? { ...c, quantity: c.quantity + 1 } : c);
      return [...prev, { menu_item_id: item.id, name: item.name, price: item.price, quantity: 1, notes: '' }];
    });
  }, []);

  const updateQty = (id: string, delta: number) => {
    setCart(prev => prev.map(c => c.menu_item_id === id ? { ...c, quantity: Math.max(0, c.quantity + delta) } : c).filter(c => c.quantity > 0));
  };

  const removeFromCart = (id: string) => setCart(prev => prev.filter(c => c.menu_item_id !== id));

  const getQty = (id: string) => cart.find(c => c.menu_item_id === id)?.quantity || 0;
  const cartCount = cart.reduce((s, c) => s + c.quantity, 0);
  const total = cart.reduce((sum, c) => sum + c.price * c.quantity, 0);

  const sendOrder = async () => {
    if (!tableNumber || cart.length === 0) return;
    setSending(true);
    try {
      const orderRes = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          items: cart.map(c => ({ item_id: c.menu_item_id, name: c.name, qty: c.quantity, price: c.price })),
          customerInfo: { name: `Mesa ${tableNumber}`, email: '', phone: '' },
          deliveryType: 'dine-in',
          tableNumber: parseInt(tableNumber),
          waiterName: waiterName || 'Mesero',
          paymentMethod: 'cash',
        }),
      });

      const order = await orderRes.json();
      if (!orderRes.ok || !order.order?.id) throw new Error(order.error || 'Error creando orden');

      await fetch('/api/order-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          orderId: order.order.id,
          items: cart.map(c => ({ menu_item_id: c.menu_item_id, name: c.name, quantity: c.quantity, price: c.price, notes: c.notes || null })),
        }),
      });

      setSuccess(true);
      setCart([]);
      setTableNumber('');
      setCartOpen(false);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      alert('Error enviando pedido. Intenta de nuevo.');
    } finally {
      setSending(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-center text-white">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-400">Cargando comandero...</p>
      </div>
    </div>
  );

  // Cart panel content (shared between mobile overlay and desktop sidebar)
  const CartPanel = ({ isMobile = false }: { isMobile?: boolean }) => (
    <div className={`flex flex-col h-full bg-gray-900 ${isMobile ? '' : 'border-l border-gray-800'}`}>
      {/* Cart header (mobile only) */}
      {isMobile && (
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
          <h2 className="text-white font-bold text-lg">Pedido</h2>
          <button onClick={() => setCartOpen(false)} className="w-9 h-9 rounded-xl bg-gray-800 flex items-center justify-center">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>
      )}

      {/* Table number */}
      <div className="px-4 py-3 border-b border-gray-800">
        <label className="text-gray-400 text-xs uppercase tracking-wide mb-1.5 block">Número de mesa</label>
        <input
          type="number"
          inputMode="numeric"
          placeholder="Ej: 5"
          value={tableNumber}
          onChange={e => setTableNumber(e.target.value)}
          className="w-full bg-gray-800 text-white text-2xl font-bold px-3 py-3 rounded-xl border border-gray-700 focus:outline-none focus:border-emerald-500 text-center"
        />
      </div>

      {/* Cart items */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
        {cart.length === 0 ? (
          <div className="text-center text-gray-600 py-12">
            <p className="text-4xl mb-3">🍽️</p>
            <p className="text-sm">Agrega productos</p>
          </div>
        ) : cart.map(item => (
          <div key={item.menu_item_id} className="bg-gray-800 rounded-2xl p-3">
            <div className="flex items-start justify-between gap-2">
              <p className="text-white text-sm font-semibold flex-1 leading-snug">{item.name}</p>
              <button onClick={() => removeFromCart(item.menu_item_id)} className="text-gray-600 hover:text-red-400 active:scale-90 transition-all flex-shrink-0 mt-0.5">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center justify-between mt-2.5">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => updateQty(item.menu_item_id, -1)}
                  className="w-9 h-9 bg-gray-700 rounded-xl flex items-center justify-center active:scale-90 transition-all"
                >
                  <Minus className="w-3.5 h-3.5 text-white" />
                </button>
                <span className="text-white font-black text-lg w-6 text-center">{item.quantity}</span>
                <button
                  onClick={() => updateQty(item.menu_item_id, 1)}
                  className="w-9 h-9 bg-emerald-700 rounded-xl flex items-center justify-center active:scale-90 transition-all"
                >
                  <Plus className="w-3.5 h-3.5 text-white" />
                </button>
              </div>
              <span className="text-emerald-400 font-bold text-sm">${(item.price * item.quantity).toLocaleString('es-CO')}</span>
            </div>

            {editingNote === item.menu_item_id ? (
              <div className="mt-2.5 flex gap-1.5">
                <input
                  autoFocus
                  type="text"
                  placeholder="sin cebolla, bien cocido..."
                  value={noteText}
                  onChange={e => setNoteText(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      setCart(prev => prev.map(c => c.menu_item_id === item.menu_item_id ? { ...c, notes: noteText } : c));
                      setEditingNote(null);
                    }
                  }}
                  className="flex-1 bg-gray-700 border border-gray-600 focus:border-yellow-500 text-white text-xs px-3 py-2 rounded-xl focus:outline-none transition-colors"
                />
                <button
                  onClick={() => { setCart(prev => prev.map(c => c.menu_item_id === item.menu_item_id ? { ...c, notes: noteText } : c)); setEditingNote(null); }}
                  className="text-emerald-400 text-xs px-3 font-bold bg-gray-700 rounded-xl"
                >
                  OK
                </button>
              </div>
            ) : (
              <button
                onClick={() => { setEditingNote(item.menu_item_id); setNoteText(item.notes); }}
                className="mt-2 text-xs"
              >
                {item.notes
                  ? <span className="text-yellow-400 italic">📝 {item.notes}</span>
                  : <span className="text-gray-600 hover:text-gray-400">+ Agregar nota</span>
                }
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-gray-800 space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">{cartCount} items</span>
          <span className="text-white font-bold text-base">${total.toLocaleString('es-CO')}</span>
        </div>
        <button
          onClick={sendOrder}
          disabled={cart.length === 0 || !tableNumber || sending}
          className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-black rounded-2xl flex items-center justify-center gap-2 transition-colors text-base active:scale-95"
        >
          {sending ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <><Send className="w-5 h-5" /> Enviar a Cocina</>
          )}
        </button>
        {!tableNumber && cart.length > 0 && (
          <p className="text-yellow-500 text-xs text-center">Ingresa el número de mesa</p>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-emerald-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <ChefHat className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-tight">Comandero</p>
            <p className="text-gray-400 text-xs">{tenantName}</p>
          </div>
        </div>
        <input
          type="text"
          placeholder="Tu nombre"
          value={waiterName}
          onChange={e => setWaiterName(e.target.value)}
          className="bg-gray-800 text-white text-sm px-3 py-2 rounded-xl border border-gray-700 w-32 focus:outline-none focus:border-emerald-500 min-w-0"
        />
      </header>

      {success && (
        <div className="bg-emerald-600 text-white px-4 py-3 flex items-center gap-2 justify-center">
          <CheckCircle className="w-5 h-5" />
          <span className="font-semibold">¡Pedido enviado a cocina!</span>
        </div>
      )}

      {/* Mobile-only: table number bar always visible */}
      <div className="lg:hidden bg-gray-900 border-b border-gray-800 px-4 py-2 flex items-center gap-3">
        <span className="text-gray-400 text-sm font-medium flex-shrink-0">Mesa</span>
        <input
          type="number"
          inputMode="numeric"
          placeholder="Número de mesa"
          value={tableNumber}
          onChange={e => setTableNumber(e.target.value)}
          className={`flex-1 bg-gray-800 text-white font-black text-lg px-3 py-2 rounded-xl border focus:outline-none text-center transition-colors ${
            tableNumber ? 'border-emerald-500 text-emerald-400' : 'border-gray-700 focus:border-emerald-500'
          }`}
        />
        {tableNumber && (
          <button
            onClick={() => setTableNumber('')}
            className="text-gray-500 hover:text-red-400 text-sm flex-shrink-0"
          >
            ✕
          </button>
        )}
      </div>

      {/* Main layout: side-by-side on lg+, stacked on mobile */}
      <div className="flex flex-1 overflow-hidden">
        {/* Menu panel — full width on mobile, left panel on desktop */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Search */}
          <div className="px-3 py-2 bg-gray-900 border-b border-gray-800">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="Buscar..."
                value={search}
                onChange={e => { setSearch(e.target.value); setSelectedCategory(null); }}
                className="w-full bg-gray-800 text-white text-sm pl-9 pr-3 py-2.5 rounded-xl border border-gray-700 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Categories */}
          {!search && (
            <div className="flex gap-2 px-3 py-2 overflow-x-auto flex-shrink-0 bg-gray-900 border-b border-gray-800 scrollbar-hide">
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                    selectedCategory === cat.id ? 'bg-emerald-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          )}

          {/* Items — 1 col on mobile, 2 col on sm, 3+ on desktop */}
          <div className="flex-1 overflow-y-auto pb-24 lg:pb-4">
            {/* Mobile: list view (1 col) */}
            <div className="lg:hidden divide-y divide-gray-800">
              {filteredItems.map(item => {
                const qty = getQty(item.id);
                return (
                  <div key={item.id} className="flex items-center gap-3 px-4 py-3 bg-gray-950 active:bg-gray-900 transition-colors">
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.name} className="w-16 h-16 rounded-xl object-cover flex-shrink-0 bg-gray-800" />
                    ) : (
                      <div className="w-16 h-16 rounded-xl bg-gray-800 flex items-center justify-center flex-shrink-0 text-2xl">🍽️</div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-semibold text-sm leading-snug line-clamp-2">{item.name}</p>
                      {item.description && <p className="text-gray-500 text-xs mt-0.5 line-clamp-1">{item.description}</p>}
                      <p className="text-emerald-400 font-black text-sm mt-1">${item.price.toLocaleString('es-CO')}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {qty > 0 ? (
                        <>
                          <button
                            onClick={() => updateQty(item.id, -1)}
                            className="w-10 h-10 rounded-xl bg-gray-700 text-white font-bold text-xl flex items-center justify-center active:scale-95"
                          >
                            −
                          </button>
                          <span className="text-white font-black text-lg w-6 text-center">{qty}</span>
                          <button
                            onClick={() => addToCart(item)}
                            className="w-10 h-10 rounded-xl bg-emerald-600 text-white font-bold text-xl flex items-center justify-center active:scale-95"
                          >
                            +
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => addToCart(item)}
                          className="w-10 h-10 rounded-xl bg-emerald-600 text-white font-bold text-xl flex items-center justify-center active:scale-95"
                        >
                          +
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
              {filteredItems.length === 0 && (
                <div className="text-center text-gray-600 py-16">
                  <p className="text-3xl mb-2">🍽️</p>
                  <p className="text-sm">Sin productos</p>
                </div>
              )}
            </div>

            {/* Desktop: grid view (2-3 cols) */}
            <div className="hidden lg:block p-3">
              <div className="grid grid-cols-2 xl:grid-cols-3 gap-2">
                {filteredItems.map(item => {
                  const qty = getQty(item.id);
                  return (
                    <button
                      key={item.id}
                      onClick={() => addToCart(item)}
                      className="relative bg-gray-900 border border-gray-800 rounded-xl p-3 text-left hover:border-emerald-600 transition-colors active:scale-95"
                    >
                      {qty > 0 && (
                        <span className="absolute top-2 right-2 w-6 h-6 bg-emerald-600 text-white text-xs font-bold rounded-full flex items-center justify-center">
                          {qty}
                        </span>
                      )}
                      {item.image_url && (
                        <img src={item.image_url} alt={item.name} className="w-full h-14 object-contain rounded-lg mb-1" />
                      )}
                      <p className="text-white text-sm font-semibold leading-tight line-clamp-2">{item.name}</p>
                      <p className="text-emerald-400 text-sm font-bold mt-1">${item.price.toLocaleString('es-CO')}</p>
                    </button>
                  );
                })}
                {filteredItems.length === 0 && (
                  <div className="col-span-3 text-center text-gray-600 py-12">Sin productos</div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Desktop cart sidebar (hidden on mobile) */}
        <div className="hidden lg:flex lg:w-80 xl:w-96 flex-col flex-shrink-0">
          <CartPanel />
        </div>
      </div>

      {/* Mobile: floating cart button */}
      {cartCount > 0 && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-20 px-4 pb-4 pt-2 bg-gradient-to-t from-gray-950 via-gray-950/95 to-transparent">
          <button
            onClick={() => setCartOpen(true)}
            className="w-full h-14 rounded-2xl bg-emerald-600 text-white font-black text-base flex items-center justify-between px-5 shadow-2xl active:scale-95 transition-all"
          >
            <span className="bg-white/20 rounded-lg px-2.5 py-1 text-sm font-black">{cartCount}</span>
            <span className="flex items-center gap-2"><ShoppingCart className="w-5 h-5" /> Ver pedido</span>
            <span>${total.toLocaleString('es-CO')}</span>
          </button>
        </div>
      )}

      {/* Mobile: cart bottom sheet */}
      {cartOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/60" onClick={() => setCartOpen(false)} />
          <div className="relative bg-gray-900 rounded-t-3xl flex flex-col max-h-[90vh]">
            <CartPanel isMobile />
          </div>
        </div>
      )}
    </div>
  );
}

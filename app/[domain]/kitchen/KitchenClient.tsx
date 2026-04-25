'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { ChefHat, Plus, Minus, Trash2, Send, Search, CheckCircle, ShoppingCart, X } from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Category { id: string; name: string; sort_order: number; }
interface MenuItem { id: string; name: string; price: number; category_id: string; description: string | null; image_url: string | null; }
interface CartItem { menu_item_id: string; name: string; price: number; quantity: number; notes: string; }
interface Table { id: string; table_number: number; seats: number; status: string; }

interface Props { tenantId: string; tenantName: string; }

const CART_KEY = (tenantId: string) => `kitchen_cart_${tenantId}`;

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
  const [csrfToken, setCsrfToken] = useState('');
  const [tables, setTables] = useState<Table[]>([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(CART_KEY(tenantId));
      if (saved) {
        const { cart: savedCart, tableNumber: savedTable } = JSON.parse(saved);
        if (savedCart?.length) setCart(savedCart);
        if (savedTable) setTableNumber(savedTable);
      }
    } catch {}
  }, [tenantId]);

  useEffect(() => {
    try { localStorage.setItem(CART_KEY(tenantId), JSON.stringify({ cart, tableNumber })); } catch {}
  }, [cart, tableNumber, tenantId]);

  useEffect(() => {
    try { const name = sessionStorage.getItem('staff_name'); if (name) setWaiterName(name); } catch {}

    fetch('/api/csrf-token')
      .then(r => { const t = r.headers.get('x-csrf-token'); if (t) setCsrfToken(t); })
      .catch(() => {});

    async function load() {
      const [{ data: cats }, { data: items }, { data: tbls }] = await Promise.all([
        supabase.from('menu_categories').select('id, name, sort_order').eq('tenant_id', tenantId).eq('active', true).order('sort_order'),
        supabase.from('menu_items').select('id, name, price, category_id, description, image_url').eq('tenant_id', tenantId).eq('available', true),
        supabase.from('tables').select('id, table_number, seats, status').eq('tenant_id', tenantId).neq('status', 'maintenance').order('table_number'),
      ]);
      setCategories(cats || []);
      setMenuItems(items || []);
      setTables(tbls || []);
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
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
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
      if (!orderRes.ok || !order.orderId) throw new Error(order.error || 'Error creando orden');

      setSuccess(true);
      setCart([]);
      setTableNumber('');
      setCartOpen(false);
      try { localStorage.removeItem(CART_KEY(tenantId)); } catch {}
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      console.error('[sendOrder]', msg);
      alert(`Error: ${msg}`);
    } finally {
      setSending(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center text-gray-700">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-500">Cargando comandero...</p>
      </div>
    </div>
  );

  const CartPanel = ({ isMobile = false }: { isMobile?: boolean }) => (
    <div className={`flex flex-col h-full bg-white ${isMobile ? '' : 'border-l border-gray-200'}`}>
      {isMobile && (
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h2 className="text-gray-900 font-bold text-lg">Pedido</h2>
          <button onClick={() => setCartOpen(false)} className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
      )}

      <div className="px-4 py-3 border-b border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <label className="text-gray-500 text-xs uppercase tracking-wide">Mesa</label>
          {tableNumber && (
            <button onClick={() => setTableNumber('')} className="text-gray-400 hover:text-red-500 text-xs transition-colors">✕ Quitar</button>
          )}
        </div>
        {tables.length === 0 ? (
          <p className="text-gray-400 text-xs text-center py-2">Sin mesas configuradas</p>
        ) : (
          <div className="grid grid-cols-4 gap-1.5">
            {tables.map(t => (
              <button
                key={t.id}
                onClick={() => setTableNumber(String(t.table_number))}
                className={`py-2.5 rounded-xl text-sm font-black transition active:scale-95 border ${
                  tableNumber === String(t.table_number)
                    ? 'bg-emerald-600 border-emerald-500 text-white shadow-sm'
                    : 'bg-gray-50 border-gray-200 text-gray-700 hover:border-emerald-400 hover:text-emerald-700'
                }`}
              >
                {t.table_number}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
        {cart.length === 0 ? (
          <div className="text-center text-gray-400 py-12">
            <p className="text-4xl mb-3">🍽️</p>
            <p className="text-sm">Agrega productos</p>
          </div>
        ) : (
          <>
            <div className="flex justify-end">
              <button
                onClick={() => { setCart([]); try { localStorage.removeItem(CART_KEY(tenantId)); } catch {} }}
                className="text-xs text-red-500 hover:text-red-600 flex items-center gap-1 py-1 px-2 rounded-lg hover:bg-red-50 transition"
              >
                <Trash2 className="w-3 h-3" /> Limpiar todo
              </button>
            </div>
            {cart.map(item => (
              <div key={item.menu_item_id} className="bg-gray-50 border border-gray-200 rounded-2xl p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-gray-900 text-sm font-semibold flex-1 leading-snug">{item.name}</p>
                  <button onClick={() => removeFromCart(item.menu_item_id)} className="text-gray-400 hover:text-red-500 active:scale-90 transition-all flex-shrink-0 mt-0.5">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex items-center justify-between mt-2.5">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateQty(item.menu_item_id, -1)}
                      className="w-9 h-9 bg-gray-200 rounded-xl flex items-center justify-center active:scale-90 transition-all"
                    >
                      <Minus className="w-3.5 h-3.5 text-gray-700" />
                    </button>
                    <span className="text-gray-900 font-black text-lg w-6 text-center">{item.quantity}</span>
                    <button
                      onClick={() => updateQty(item.menu_item_id, 1)}
                      className="w-9 h-9 bg-emerald-600 rounded-xl flex items-center justify-center active:scale-90 transition-all"
                    >
                      <Plus className="w-3.5 h-3.5 text-white" />
                    </button>
                  </div>
                  <span className="text-emerald-600 font-bold text-sm">${(item.price * item.quantity).toLocaleString('es-CO')}</span>
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
                      className="flex-1 bg-white border border-gray-200 focus:border-yellow-400 text-gray-900 text-xs px-3 py-2 rounded-xl focus:outline-none transition-colors"
                    />
                    <button
                      onClick={() => { setCart(prev => prev.map(c => c.menu_item_id === item.menu_item_id ? { ...c, notes: noteText } : c)); setEditingNote(null); }}
                      className="text-emerald-600 text-xs px-3 font-bold bg-gray-100 rounded-xl"
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
                      ? <span className="text-yellow-600 italic">📝 {item.notes}</span>
                      : <span className="text-gray-400 hover:text-gray-600">+ Agregar nota</span>
                    }
                  </button>
                )}
              </div>
            ))}
          </>
        )}
      </div>

      <div className="px-4 py-4 border-t border-gray-200 space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">{cartCount} items</span>
          <span className="text-gray-900 font-bold text-base">${total.toLocaleString('es-CO')}</span>
        </div>
        <button
          onClick={sendOrder}
          disabled={cart.length === 0 || !tableNumber || sending}
          className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-black rounded-2xl flex items-center justify-center gap-2 transition-colors text-base active:scale-95"
        >
          {sending ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <><Send className="w-5 h-5" /> Enviar a Cocina</>
          )}
        </button>
        {!tableNumber && cart.length > 0 && (
          <p className="text-yellow-600 text-xs text-center">Ingresa el número de mesa</p>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-emerald-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <ChefHat className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-gray-900 font-bold text-sm leading-tight">Comandero</p>
            <p className="text-gray-500 text-xs">{tenantName}</p>
          </div>
        </div>
        <input
          type="text"
          placeholder="Tu nombre"
          value={waiterName}
          onChange={e => setWaiterName(e.target.value)}
          className="bg-gray-50 text-gray-900 text-sm px-3 py-2 rounded-xl border border-gray-200 w-32 focus:outline-none focus:border-emerald-500 min-w-0"
        />
      </header>

      {success && (
        <div className="bg-emerald-600 text-white px-4 py-3 flex items-center gap-2 justify-center">
          <CheckCircle className="w-5 h-5" />
          <span className="font-semibold">¡Pedido enviado a cocina!</span>
        </div>
      )}

      <div className="lg:hidden bg-white border-b border-gray-200 px-3 py-2">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-gray-500 text-xs font-bold uppercase tracking-wide">Mesa</span>
          {tableNumber && (
            <span className="text-emerald-600 font-black text-sm ml-1">#{tableNumber}</span>
          )}
          {tableNumber && (
            <button onClick={() => setTableNumber('')} className="ml-auto text-gray-400 hover:text-red-500 text-xs">✕ Quitar</button>
          )}
        </div>
        {tables.length === 0 ? (
          <p className="text-gray-400 text-xs">Sin mesas configuradas</p>
        ) : (
          <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-0.5">
            {tables.map(t => (
              <button
                key={t.id}
                onClick={() => setTableNumber(String(t.table_number))}
                className={`flex-shrink-0 w-10 h-10 rounded-xl text-sm font-black transition active:scale-95 border ${
                  tableNumber === String(t.table_number)
                    ? 'bg-emerald-600 border-emerald-500 text-white'
                    : 'bg-gray-100 border-gray-200 text-gray-700 hover:border-emerald-400'
                }`}
              >
                {t.table_number}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="px-3 py-2 bg-white border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar..."
                value={search}
                onChange={e => { setSearch(e.target.value); setSelectedCategory(null); }}
                className="w-full bg-gray-50 text-gray-900 text-sm pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {!search && (
            <div className="flex gap-2 px-3 py-2 overflow-x-auto flex-shrink-0 bg-white border-b border-gray-200 scrollbar-hide">
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                    selectedCategory === cat.id ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          )}

          <div className="flex-1 overflow-y-auto pb-24 lg:pb-4">
            <div className="lg:hidden divide-y divide-gray-100">
              {filteredItems.map(item => {
                const qty = getQty(item.id);
                return (
                  <div key={item.id} className="flex items-center gap-3 px-4 py-3 bg-white active:bg-gray-50 transition-colors">
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.name} className="w-16 h-16 rounded-xl object-cover flex-shrink-0 bg-gray-100" />
                    ) : (
                      <div className="w-16 h-16 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0 text-2xl">🍽️</div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-900 font-semibold text-sm leading-snug line-clamp-2">{item.name}</p>
                      {item.description && <p className="text-gray-400 text-xs mt-0.5 line-clamp-1">{item.description}</p>}
                      <p className="text-emerald-600 font-black text-sm mt-1">${item.price.toLocaleString('es-CO')}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {qty > 0 ? (
                        <>
                          <button
                            onClick={() => updateQty(item.id, -1)}
                            className="w-10 h-10 rounded-xl bg-gray-200 text-gray-700 font-bold text-xl flex items-center justify-center active:scale-95"
                          >
                            −
                          </button>
                          <span className="text-gray-900 font-black text-lg w-6 text-center">{qty}</span>
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
                <div className="text-center text-gray-400 py-16">
                  <p className="text-3xl mb-2">🍽️</p>
                  <p className="text-sm">Sin productos</p>
                </div>
              )}
            </div>

            <div className="hidden lg:block p-3">
              <div className="grid grid-cols-2 xl:grid-cols-3 gap-2">
                {filteredItems.map(item => {
                  const qty = getQty(item.id);
                  return (
                    <button
                      key={item.id}
                      onClick={() => addToCart(item)}
                      className="relative bg-white border border-gray-200 rounded-xl p-3 text-left hover:border-emerald-400 hover:shadow-sm transition-all active:scale-95"
                    >
                      {qty > 0 && (
                        <span className="absolute top-2 right-2 w-6 h-6 bg-emerald-600 text-white text-xs font-bold rounded-full flex items-center justify-center">
                          {qty}
                        </span>
                      )}
                      {item.image_url && (
                        <img src={item.image_url} alt={item.name} className="w-full h-14 object-contain rounded-lg mb-1" />
                      )}
                      <p className="text-gray-900 text-sm font-semibold leading-tight line-clamp-2">{item.name}</p>
                      <p className="text-emerald-600 text-sm font-bold mt-1">${item.price.toLocaleString('es-CO')}</p>
                    </button>
                  );
                })}
                {filteredItems.length === 0 && (
                  <div className="col-span-3 text-center text-gray-400 py-12">Sin productos</div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="hidden lg:flex lg:w-80 xl:w-96 flex-col flex-shrink-0">
          <CartPanel />
        </div>
      </div>

      {cartCount > 0 && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-20 px-4 pb-4 pt-2 bg-gradient-to-t from-gray-50 via-gray-50/95 to-transparent">
          <button
            onClick={() => setCartOpen(true)}
            className="w-full h-14 rounded-2xl bg-emerald-600 text-white font-black text-base flex items-center justify-between px-5 shadow-lg active:scale-95 transition-all"
          >
            <span className="bg-white/20 rounded-lg px-2.5 py-1 text-sm font-black">{cartCount}</span>
            <span className="flex items-center gap-2"><ShoppingCart className="w-5 h-5" /> Ver pedido</span>
            <span>${total.toLocaleString('es-CO')}</span>
          </button>
        </div>
      )}

      {cartOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setCartOpen(false)} />
          <div className="relative bg-white rounded-t-3xl flex flex-col max-h-[90vh]">
            <CartPanel isMobile />
          </div>
        </div>
      )}
    </div>
  );
}

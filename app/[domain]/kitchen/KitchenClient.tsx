'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { createClient } from '@supabase/supabase-js';
import { formatPriceWithCurrency, getCurrencyByCountry } from '@/lib/currency';
import {
  CheckCircle,
  ChefHat,
  ClipboardList,
  Minus,
  Plus,
  Search,
  Send,
  ShoppingCart,
  Trash2,
  UserRound,
  X,
} from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Category { id: string; name: string; sort_order: number; }
interface MenuItem { id: string; name: string; price: number; category_id: string; description: string | null; image_url: string | null; }
interface CartItem { menu_item_id: string; name: string; price: number; quantity: number; notes: string; }
interface Table { id: string; table_number: number; seats: number; status: string; }

interface Props { tenantId: string; tenantSlug: string; tenantName: string; country: string; }

const CART_KEY = (tenantId: string) => `kitchen_cart_${tenantId}`;

export function KitchenClient({ tenantId, tenantSlug, tenantName, country }: Props) {
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
  const currencyInfo = useMemo(() => getCurrencyByCountry(country), [country]);
  const money = useCallback(
    (value: number) => formatPriceWithCurrency(value, currencyInfo.code, currencyInfo.locale),
    [currencyInfo]
  );

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
    try {
      const name = sessionStorage.getItem('staff_name');
      if (name) setWaiterName(name);
    } catch {}

    fetch('/api/csrf-token')
      .then(r => {
        const token = r.headers.get('x-csrf-token');
        if (token) setCsrfToken(token);
      })
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
      if (cats?.length) setSelectedCategory(cats[0].id);
      setLoading(false);
    }

    load();
  }, [tenantId]);

  const filteredItems = useMemo(() => {
    const term = search.trim().toLowerCase();
    return menuItems.filter(item => {
      const matchesCat = !selectedCategory || item.category_id === selectedCategory;
      const matchesSearch = !term || item.name.toLowerCase().includes(term) || item.description?.toLowerCase().includes(term);
      return matchesCat && matchesSearch;
    });
  }, [menuItems, search, selectedCategory]);

  const addToCart = useCallback((item: MenuItem) => {
    setCart(prev => {
      const existing = prev.find(c => c.menu_item_id === item.id);
      if (existing) return prev.map(c => c.menu_item_id === item.id ? { ...c, quantity: c.quantity + 1 } : c);
      return [...prev, { menu_item_id: item.id, name: item.name, price: item.price, quantity: 1, notes: '' }];
    });
  }, []);

  const updateQty = (id: string, delta: number) => {
    setCart(prev => prev
      .map(c => c.menu_item_id === id ? { ...c, quantity: Math.max(0, c.quantity + delta) } : c)
      .filter(c => c.quantity > 0)
    );
  };

  const removeFromCart = (id: string) => setCart(prev => prev.filter(c => c.menu_item_id !== id));
  const getQty = (id: string) => cart.find(c => c.menu_item_id === id)?.quantity || 0;
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const saveNote = (id: string) => {
    setCart(prev => prev.map(c => c.menu_item_id === id ? { ...c, notes: noteText } : c));
    setEditingNote(null);
  };

  const sendOrder = async () => {
    if (!tableNumber || cart.length === 0) return;
    setSending(true);

    try {
      const payload = {
        tenantId,
        items: cart.map(c => ({
          menu_item_id: c.menu_item_id,
          name: c.name,
          qty: c.quantity,
          price: c.price,
          notes: c.notes || null,
        })),
        customerInfo: { name: `Mesa ${tableNumber}`, email: '', phone: '' },
        deliveryType: 'dine-in',
        tableNumber: parseInt(tableNumber),
        waiterName: waiterName || 'Mesero',
        paymentMethod: 'cash',
        source: 'comandero',
      };

      let orderRes = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
        body: JSON.stringify(payload),
      });

      let order = await orderRes.json();
      if (!orderRes.ok && order?.error === 'Invalid restaurant' && tenantSlug && tenantSlug !== tenantId) {
        orderRes = await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
          body: JSON.stringify({ ...payload, tenantId: tenantSlug }),
        });
        order = await orderRes.json();
      }

      if (!orderRes.ok || !order.orderId) throw new Error(order.error || 'Error creando orden');

      setSuccess(true);
      setCart([]);
      setTableNumber('');
      setCartOpen(false);
      try { localStorage.removeItem(CART_KEY(tenantId)); } catch {}
      setTimeout(() => setSuccess(false), 3200);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      console.error('[sendOrder]', msg);
      alert(`Error: ${msg}`);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#f6f3ed]">
        <div className="rounded-[2rem] border border-black/10 bg-white p-8 text-center shadow-2xl shadow-black/10">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-[#15130f]/15 border-t-[#15130f]" />
          <p className="text-sm font-black text-[#15130f]">Cargando comandero</p>
        </div>
      </div>
    );
  }

  const CartPanel = ({ isMobile = false }: { isMobile?: boolean }) => (
    <div className={`flex h-full flex-col bg-white ${isMobile ? '' : 'border-l border-black/10'}`}>
      <div className="border-b border-black/10 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-black uppercase text-black/40">Pedido actual</p>
            <h2 className="text-xl font-black text-[#15130f]">{tableNumber ? `Mesa ${tableNumber}` : 'Selecciona mesa'}</h2>
          </div>
          {isMobile && (
            <button onClick={() => setCartOpen(false)} className="grid h-10 w-10 place-items-center rounded-2xl bg-black/[0.06]">
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-black uppercase text-black/42">Mesas</span>
            {tableNumber && <button onClick={() => setTableNumber('')} className="text-xs font-black text-red-500">Quitar</button>}
          </div>
          {tables.length === 0 ? (
            <p className="rounded-2xl bg-black/[0.04] px-3 py-3 text-center text-xs font-bold text-black/45">Sin mesas configuradas</p>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              {tables.map(table => {
                const active = tableNumber === String(table.table_number);
                return (
                  <button
                    key={table.id}
                    onClick={() => setTableNumber(String(table.table_number))}
                    className={`h-11 rounded-2xl border text-sm font-black transition active:scale-95 ${
                      active ? 'border-[#15130f] bg-[#15130f] text-white shadow-lg' : 'border-black/10 bg-[#f6f3ed] text-[#15130f]'
                    }`}
                  >
                    {table.table_number}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-3">
        {cart.length === 0 ? (
          <div className="grid h-full min-h-56 place-items-center rounded-[1.5rem] border border-dashed border-black/15 bg-[#f8f6f1] p-6 text-center">
            <div>
              <ShoppingCart className="mx-auto mb-3 h-8 w-8 text-black/25" />
              <p className="text-sm font-black text-[#15130f]">Pedido vacio</p>
              <p className="mt-1 text-xs font-semibold text-black/45">Toca productos para agregarlos.</p>
            </div>
          </div>
        ) : (
          <>
            <button
              onClick={() => { setCart([]); try { localStorage.removeItem(CART_KEY(tenantId)); } catch {} }}
              className="ml-auto flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-black text-red-500 transition hover:bg-red-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Limpiar
            </button>
            {cart.map(item => (
              <div key={item.menu_item_id} className="rounded-[1.35rem] border border-black/10 bg-[#fbfaf7] p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="line-clamp-2 text-sm font-black leading-5 text-[#15130f]">{item.name}</p>
                    <p className="mt-1 text-xs font-black text-black/45">{money(item.price)} unidad</p>
                  </div>
                  <button onClick={() => removeFromCart(item.menu_item_id)} className="grid h-8 w-8 place-items-center rounded-xl text-black/35 transition hover:bg-red-50 hover:text-red-500">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button onClick={() => updateQty(item.menu_item_id, -1)} className="grid h-10 w-10 place-items-center rounded-2xl bg-black/[0.07] active:scale-95">
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="w-7 text-center text-lg font-black text-[#15130f]">{item.quantity}</span>
                    <button onClick={() => updateQty(item.menu_item_id, 1)} className="grid h-10 w-10 place-items-center rounded-2xl bg-[#15130f] text-white active:scale-95">
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  <span className="text-base font-black text-[#15130f]">{money(item.price * item.quantity)}</span>
                </div>

                {editingNote === item.menu_item_id ? (
                  <div className="mt-3 flex gap-2">
                    <input
                      autoFocus
                      value={noteText}
                      onChange={e => setNoteText(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') saveNote(item.menu_item_id); }}
                      placeholder="Sin cebolla, bien cocido..."
                      className="min-w-0 flex-1 rounded-2xl border border-black/10 bg-white px-3 py-2 text-xs font-semibold outline-none focus:border-[#15130f]"
                    />
                    <button onClick={() => saveNote(item.menu_item_id)} className="rounded-2xl bg-[#15130f] px-4 text-xs font-black text-white">OK</button>
                  </div>
                ) : (
                  <button
                    onClick={() => { setEditingNote(item.menu_item_id); setNoteText(item.notes); }}
                    className="mt-3 rounded-full bg-black/[0.04] px-3 py-1.5 text-xs font-black text-black/45"
                  >
                    {item.notes ? item.notes : '+ Nota'}
                  </button>
                )}
              </div>
            ))}
          </>
        )}
      </div>

      <div className="border-t border-black/10 bg-white p-4">
        <div className="mb-3 flex items-end justify-between">
          <span className="text-sm font-bold text-black/45">{cartCount} productos</span>
          <span className="text-2xl font-black text-[#15130f]">{money(total)}</span>
        </div>
        <button
          onClick={sendOrder}
          disabled={cart.length === 0 || !tableNumber || sending}
          className="flex h-14 w-full items-center justify-center gap-2 rounded-[1.25rem] bg-[#15130f] text-base font-black text-white shadow-xl shadow-black/20 transition active:scale-[0.98] disabled:bg-black/10 disabled:text-black/35 disabled:shadow-none"
        >
          {sending ? <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <><Send className="h-5 w-5" /> Enviar a cocina</>}
        </button>
        {!tableNumber && cart.length > 0 && <p className="mt-2 text-center text-xs font-black text-amber-600">Selecciona una mesa para enviar.</p>}
      </div>
    </div>
  );

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#f6f3ed] text-[#15130f]">
      <header className="border-b border-black/10 bg-[#15130f] px-4 py-3 text-white shadow-2xl shadow-black/20">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-2xl bg-white text-[#15130f]">
              <ClipboardList className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-base font-black">Comandero</p>
              <p className="truncate text-xs font-bold text-white/55">{tenantName}</p>
            </div>
          </div>
          <label className="hidden min-w-0 items-center gap-2 rounded-2xl bg-white/8 px-3 py-2 sm:flex">
            <UserRound className="h-4 w-4 text-white/50" />
            <input
              value={waiterName}
              onChange={e => setWaiterName(e.target.value)}
              placeholder="Camarero"
              className="w-32 bg-transparent text-sm font-bold text-white outline-none placeholder:text-white/35"
            />
          </label>
        </div>
      </header>

      {success && (
        <div className="flex items-center justify-center gap-2 bg-emerald-600 px-4 py-3 text-sm font-black text-white">
          <CheckCircle className="h-5 w-5" />
          Pedido enviado a cocina
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <div className="border-b border-black/10 bg-white px-3 py-3">
            <div className="mb-3 xl:hidden">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-black uppercase text-black/42">Mesa para enviar</span>
                {tableNumber ? (
                  <button onClick={() => setTableNumber('')} className="text-xs font-black text-red-500">Quitar mesa {tableNumber}</button>
                ) : (
                  <span className="text-xs font-black text-amber-600">Elige una mesa</span>
                )}
              </div>
              {tables.length === 0 ? (
                <p className="rounded-2xl bg-black/[0.04] px-3 py-3 text-center text-xs font-bold text-black/45">Sin mesas configuradas</p>
              ) : (
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                  {tables.map(table => {
                    const active = tableNumber === String(table.table_number);
                    return (
                      <button
                        key={table.id}
                        onClick={() => setTableNumber(String(table.table_number))}
                        className={`h-12 min-w-12 flex-shrink-0 rounded-2xl border px-3 text-sm font-black transition active:scale-95 ${
                          active ? 'border-[#15130f] bg-[#15130f] text-white shadow-lg' : 'border-black/10 bg-[#f6f3ed] text-[#15130f]'
                        }`}
                      >
                        {table.table_number}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <div className="relative min-w-0 flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-black/35" />
                <input
                  value={search}
                  onChange={e => { setSearch(e.target.value); setSelectedCategory(null); }}
                  placeholder="Buscar producto"
                  className="h-12 w-full rounded-[1.2rem] border border-black/10 bg-[#f6f3ed] pl-10 pr-4 text-sm font-bold outline-none focus:border-[#15130f]"
                />
              </div>
              <button onClick={() => setCartOpen(true)} className="relative grid h-12 w-12 place-items-center rounded-[1.2rem] bg-[#15130f] text-white md:hidden">
                <ShoppingCart className="h-5 w-5" />
                {cartCount > 0 && <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-red-500 px-1 text-[10px] font-black">{cartCount}</span>}
              </button>
            </div>

            <div className="mt-3 flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {!search && categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`h-10 flex-shrink-0 rounded-full border px-4 text-xs font-black transition active:scale-95 ${
                    selectedCategory === cat.id ? 'border-[#15130f] bg-[#15130f] text-white' : 'border-black/10 bg-white text-black/55'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
              {search && <span className="rounded-full bg-black/[0.06] px-4 py-2 text-xs font-black text-black/45">Resultados de busqueda</span>}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 pb-28 md:pb-4">
            {filteredItems.length === 0 ? (
              <div className="grid h-full min-h-80 place-items-center rounded-[2rem] border border-dashed border-black/15 bg-white">
                <div className="text-center">
                  <ChefHat className="mx-auto mb-3 h-9 w-9 text-black/25" />
                  <p className="text-sm font-black">Sin productos</p>
                </div>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {filteredItems.map(item => {
                  const qty = getQty(item.id);
                  return (
                    <article key={item.id} className="overflow-hidden rounded-[1.5rem] border border-black/10 bg-white shadow-sm">
                      <button onClick={() => addToCart(item)} className="block w-full text-left active:scale-[0.99]">
                        <div className="relative h-24 bg-[#f6f3ed] sm:h-32">
                          {item.image_url ? (
                            <Image src={item.image_url} alt={item.name} fill sizes="(max-width: 768px) 50vw, 25vw" className="object-cover" />
                          ) : (
                            <div className="grid h-full place-items-center text-black/20"><ChefHat className="h-8 w-8" /></div>
                          )}
                          {qty > 0 && <span className="absolute right-3 top-3 grid h-8 min-w-8 place-items-center rounded-full bg-[#15130f] px-2 text-sm font-black text-white">{qty}</span>}
                        </div>
                        <div className="p-3">
                          <p className="line-clamp-2 min-h-10 text-sm font-black leading-5">{item.name}</p>
                          {item.description && <p className="mt-1 line-clamp-1 text-xs font-semibold text-black/42">{item.description}</p>}
                          <p className="mt-2 text-base font-black text-red-600">{money(item.price)}</p>
                        </div>
                      </button>
                      <div className="flex items-center justify-between border-t border-black/8 p-2">
                        {qty > 0 ? (
                          <>
                            <button onClick={() => updateQty(item.id, -1)} className="grid h-11 w-11 place-items-center rounded-2xl bg-black/[0.06] active:scale-95"><Minus className="h-4 w-4" /></button>
                            <span className="text-lg font-black">{qty}</span>
                            <button onClick={() => addToCart(item)} className="grid h-11 w-11 place-items-center rounded-2xl bg-[#15130f] text-white active:scale-95"><Plus className="h-4 w-4" /></button>
                          </>
                        ) : (
                          <button onClick={() => addToCart(item)} className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-[#15130f] text-sm font-black text-white active:scale-[0.98]">
                            <Plus className="h-4 w-4" />
                            Agregar
                          </button>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </main>

        <aside className="hidden w-[340px] flex-shrink-0 md:flex xl:w-[400px]">
          <CartPanel />
        </aside>
      </div>

      {cartCount > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-20 bg-gradient-to-t from-[#f6f3ed] via-[#f6f3ed]/95 to-transparent p-3 md:hidden">
          <button onClick={() => setCartOpen(true)} className="flex h-16 w-full items-center justify-between rounded-[1.4rem] bg-[#15130f] px-4 font-black text-white shadow-2xl shadow-black/20 active:scale-[0.98]">
            <span className="grid h-9 min-w-9 place-items-center rounded-full bg-white/15 px-2 text-sm">{cartCount}</span>
            <span className="flex items-center gap-2"><ShoppingCart className="h-5 w-5" /> Ver pedido</span>
            <span>{money(total)}</span>
          </button>
        </div>
      )}

      {cartOpen && (
        <div className="fixed inset-0 z-40 flex flex-col justify-end md:hidden">
          <div className="absolute inset-0 bg-black/45" onClick={() => setCartOpen(false)} />
          <div className="relative max-h-[92vh] overflow-hidden rounded-t-[2rem] bg-white shadow-2xl">
            <CartPanel isMobile />
          </div>
        </div>
      )}
    </div>
  );
}

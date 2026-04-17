'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { ChefHat, Plus, Minus, Trash2, Send, Search, CheckCircle } from 'lucide-react';

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

  useEffect(() => {
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

  const getQty = (id: string) => cart.find(c => c.menu_item_id === id)?.quantity || 0;
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

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-emerald-600 rounded-lg flex items-center justify-center">
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
          className="bg-gray-800 text-white text-sm px-3 py-1.5 rounded-lg border border-gray-700 w-36 focus:outline-none focus:border-emerald-500"
        />
      </header>

      {success && (
        <div className="bg-emerald-600 text-white px-4 py-3 flex items-center gap-2 justify-center">
          <CheckCircle className="w-5 h-5" />
          <span className="font-semibold">¡Pedido enviado a cocina!</span>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* LEFT: Menu */}
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
                className="w-full bg-gray-800 text-white text-sm pl-9 pr-3 py-2 rounded-lg border border-gray-700 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Categories */}
          {!search && (
            <div className="flex gap-2 px-3 py-2 overflow-x-auto flex-shrink-0 bg-gray-900 border-b border-gray-800">
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${selectedCategory === cat.id ? 'bg-emerald-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          )}

          {/* Items Grid */}
          <div className="flex-1 overflow-y-auto p-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
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

        {/* RIGHT: Cart */}
        <div className="w-72 bg-gray-900 border-l border-gray-800 flex flex-col flex-shrink-0">
          <div className="px-4 py-3 border-b border-gray-800">
            <label className="text-gray-400 text-xs uppercase tracking-wide mb-1 block">Número de mesa</label>
            <input
              type="number"
              placeholder="Ej: 5"
              value={tableNumber}
              onChange={e => setTableNumber(e.target.value)}
              className="w-full bg-gray-800 text-white text-2xl font-bold px-3 py-2 rounded-lg border border-gray-700 focus:outline-none focus:border-emerald-500 text-center"
            />
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
            {cart.length === 0 ? (
              <div className="text-center text-gray-600 py-12">
                <p className="text-3xl mb-2">🍽️</p>
                <p className="text-sm">Agrega productos</p>
              </div>
            ) : cart.map(item => (
              <div key={item.menu_item_id} className="bg-gray-800 rounded-xl p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-white text-sm font-medium flex-1 leading-tight">{item.name}</p>
                  <button onClick={() => setCart(prev => prev.filter(c => c.menu_item_id !== item.menu_item_id))} className="text-gray-500 hover:text-red-400">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-2">
                    <button onClick={() => updateQty(item.menu_item_id, -1)} className="w-7 h-7 bg-gray-700 rounded-full flex items-center justify-center hover:bg-gray-600">
                      <Minus className="w-3 h-3 text-white" />
                    </button>
                    <span className="text-white font-bold w-5 text-center">{item.quantity}</span>
                    <button onClick={() => updateQty(item.menu_item_id, 1)} className="w-7 h-7 bg-gray-700 rounded-full flex items-center justify-center hover:bg-gray-600">
                      <Plus className="w-3 h-3 text-white" />
                    </button>
                  </div>
                  <span className="text-emerald-400 font-bold text-sm">${(item.price * item.quantity).toLocaleString('es-CO')}</span>
                </div>
                {editingNote === item.menu_item_id ? (
                  <div className="mt-2 flex gap-1">
                    <input
                      autoFocus
                      type="text"
                      placeholder="Nota (sin cebolla...)"
                      value={noteText}
                      onChange={e => setNoteText(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          setCart(prev => prev.map(c => c.menu_item_id === item.menu_item_id ? { ...c, notes: noteText } : c));
                          setEditingNote(null);
                        }
                      }}
                      className="flex-1 bg-gray-700 text-white text-xs px-2 py-1 rounded focus:outline-none"
                    />
                    <button onClick={() => { setCart(prev => prev.map(c => c.menu_item_id === item.menu_item_id ? { ...c, notes: noteText } : c)); setEditingNote(null); }} className="text-emerald-400 text-xs px-2">OK</button>
                  </div>
                ) : (
                  <button onClick={() => { setEditingNote(item.menu_item_id); setNoteText(item.notes); }} className="mt-1.5 text-xs text-gray-500 hover:text-gray-300">
                    {item.notes ? <span className="text-yellow-400">📝 {item.notes}</span> : <span>+ Agregar nota</span>}
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="px-4 py-4 border-t border-gray-800 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">{cart.reduce((s, c) => s + c.quantity, 0)} items</span>
              <span className="text-white font-bold">${total.toLocaleString('es-CO')}</span>
            </div>
            <button
              onClick={sendOrder}
              disabled={cart.length === 0 || !tableNumber || sending}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-colors text-lg"
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
      </div>
    </div>
  );
}

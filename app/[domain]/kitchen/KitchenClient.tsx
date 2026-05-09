'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { createClient } from '@supabase/supabase-js';
import { formatPriceWithCurrency, getCurrencyByCountry } from '@/lib/currency';
import LanguageSwitcher, { useI18n } from '@/components/LanguageSwitcher';
import {
  CheckCircle,
  ChefHat,
  ClipboardList,
  ReceiptText,
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
interface Topping { id: string; menu_item_id: string; name: string; price: number; is_required?: boolean; sort_order?: number; }
interface CartItem { line_id: string; menu_item_id: string; name: string; price: number; quantity: number; notes: string; toppings?: Topping[]; }
interface Table { id: string; table_number: number; seats: number; status: string; }
interface OpenTableOrder {
  id: string;
  order_number: string;
  table_number: number | null;
  waiter_name: string | null;
  subtotal?: number | null;
  tax?: number | null;
  total: number;
  created_at: string;
  items: { name: string; qty?: number; quantity?: number; price: number }[];
}

interface KitchenBranding {
  appName: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  surfaceColor: string;
  buttonPrimaryColor: string;
  buttonSecondaryColor: string;
  textPrimaryColor: string;
  textSecondaryColor: string;
  logoUrl: string | null;
}

interface Props { tenantId: string; tenantSlug: string; tenantName: string; country: string; branding: KitchenBranding; }

const CART_KEY = (tenantId: string) => `kitchen_cart_${tenantId}`;

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
  return (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255 < 0.55;
}

function readableText(background: string, dark = '#15130f', light = '#ffffff') {
  return isDark(background) ? light : dark;
}

export function KitchenClient({ tenantId, tenantSlug, tenantName, country, branding }: Props) {
  const { tr } = useI18n();
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [toppings, setToppings] = useState<Topping[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [tableNumber, setTableNumber] = useState('');
  const [waiterName, setWaiterName] = useState('');
  const [search, setSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');
  const [cartOpen, setCartOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [accountTableNumber, setAccountTableNumber] = useState('');
  const [openTableOrders, setOpenTableOrders] = useState<OpenTableOrder[]>([]);
  const [loadingAccount, setLoadingAccount] = useState(false);
  const [taxRate, setTaxRate] = useState(0);
  const [csrfToken, setCsrfToken] = useState('');
  const [tables, setTables] = useState<Table[]>([]);
  const [customizingItem, setCustomizingItem] = useState<MenuItem | null>(null);
  const [selectedToppings, setSelectedToppings] = useState<Topping[]>([]);
  const [customQty, setCustomQty] = useState(1);
  const currencyInfo = useMemo(() => getCurrencyByCountry(country), [country]);
  const money = useCallback(
    (value: number) => formatPriceWithCurrency(value, currencyInfo.code, currencyInfo.locale),
    [currencyInfo]
  );
  const brand = useMemo(() => {
    const primary = branding.primaryColor || '#15130f';
    const accent = branding.accentColor || primary;
    const background = branding.backgroundColor || '#f6f3ed';
    const surface = branding.surfaceColor || (isDark(background) ? '#111827' : '#ffffff');
    const button = branding.buttonPrimaryColor || primary;
    const primaryText = branding.textPrimaryColor || readableText(background);
    const surfaceText = readableText(surface);
    return {
      appName: branding.appName || tenantName,
      primary,
      secondary: branding.secondaryColor || '#111827',
      accent,
      background,
      surface,
      surfaceText,
      soft: `${primary}14`,
      border: `${primary}22`,
      button,
      buttonText: readableText(button),
      primaryText,
      mutedText: branding.textSecondaryColor || (isDark(background) ? 'rgba(255,255,255,0.68)' : 'rgba(21,19,15,0.58)'),
      logoUrl: branding.logoUrl,
    };
  }, [branding, tenantName]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(CART_KEY(tenantId));
      if (saved) {
        const { cart: savedCart } = JSON.parse(saved);
        if (savedCart?.length) {
          setCart(savedCart.map((item: CartItem) => ({
            ...item,
            line_id: item.line_id || `${item.menu_item_id}:base`,
          })));
        }
      }
    } catch {}
  }, [tenantId]);

  useEffect(() => {
    try { localStorage.setItem(CART_KEY(tenantId), JSON.stringify({ cart })); } catch {}
  }, [cart, tenantId]);

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
      const [{ data: cats }, { data: items }, { data: itemToppings }, { data: tbls }, settingsRes] = await Promise.all([
        supabase.from('menu_categories').select('id, name, sort_order').eq('tenant_id', tenantId).eq('active', true).order('sort_order'),
        supabase.from('menu_items').select('id, name, price, category_id, description, image_url').eq('tenant_id', tenantId).eq('available', true),
        supabase.from('product_toppings').select('id, menu_item_id, name, price, sort_order').eq('tenant_id', tenantId).order('sort_order'),
        supabase.from('tables').select('id, table_number, seats, status').eq('tenant_id', tenantId).neq('status', 'maintenance').order('table_number'),
        fetch(`/api/settings/${tenantId}`, { cache: 'no-store' }).then(r => r.ok ? r.json() : null).catch(() => null),
      ]);

      setCategories(cats || []);
      setMenuItems(items || []);
      setToppings((itemToppings || []) as Topping[]);
      setTables(tbls || []);
      setTaxRate(Number(settingsRes?.tax_rate || 0));
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

  const toppingsByItem = useMemo(() => {
    const map = new Map<string, Topping[]>();
    toppings.forEach(topping => {
      const list = map.get(topping.menu_item_id) || [];
      list.push(topping);
      map.set(topping.menu_item_id, list);
    });
    return map;
  }, [toppings]);

  const buildToppingNote = (tops: Topping[]) => (
    tops.length ? `Adicionales: ${tops.map(t => `${t.name}${Number(t.price || 0) > 0 ? ` (+${money(Number(t.price || 0))})` : ''}`).join(', ')}` : ''
  );

  const addToCart = useCallback((item: MenuItem, tops: Topping[] = [], qty = 1) => {
    const sortedToppings = [...tops].sort((a, b) => a.id.localeCompare(b.id));
    const toppingIds = sortedToppings.map(t => t.id).join(',');
    const lineId = `${item.id}:${toppingIds || 'base'}`;
    const toppingsCost = sortedToppings.reduce((sum, topping) => sum + Number(topping.price || 0), 0);
    const unitPrice = item.price + toppingsCost;
    const toppingNote = buildToppingNote(sortedToppings);

    setCart(prev => {
      const existing = prev.find(c => c.line_id === lineId);
      if (existing) return prev.map(c => c.line_id === lineId ? { ...c, quantity: c.quantity + qty } : c);
      return [...prev, { line_id: lineId, menu_item_id: item.id, name: item.name, price: unitPrice, quantity: qty, notes: toppingNote, toppings: sortedToppings }];
    });
  }, [money]);

  const openProduct = useCallback((item: MenuItem) => {
    const itemToppings = toppingsByItem.get(item.id) || [];
    if (itemToppings.length === 0) {
      addToCart(item);
      return;
    }
    setCustomizingItem(item);
    setSelectedToppings([]);
    setCustomQty(1);
  }, [addToCart, toppingsByItem]);

  const toggleTopping = (topping: Topping) => {
    setSelectedToppings(prev => (
      prev.some(t => t.id === topping.id)
        ? prev.filter(t => t.id !== topping.id)
        : [...prev, topping]
    ));
  };

  const confirmCustomizedItem = () => {
    if (!customizingItem) return;
    addToCart(customizingItem, selectedToppings, customQty);
    setCustomizingItem(null);
    setSelectedToppings([]);
    setCustomQty(1);
  };

  const updateQty = (lineId: string, delta: number) => {
    setCart(prev => prev
      .map(c => c.line_id === lineId ? { ...c, quantity: Math.max(0, c.quantity + delta) } : c)
      .filter(c => c.quantity > 0)
    );
  };

  const removeFromCart = (lineId: string) => setCart(prev => prev.filter(c => c.line_id !== lineId));
  const getQty = (id: string) => cart.filter(c => c.menu_item_id === id).reduce((sum, item) => sum + item.quantity, 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const taxAmount = taxRate > 0 ? subtotal * (taxRate / 100) : 0;
  const total = subtotal + taxAmount;
  const getServedOrderSubtotal = useCallback((order: OpenTableOrder) => {
    if (typeof order.subtotal === 'number' && order.subtotal > 0) return order.subtotal;
    return (order.items || []).reduce((itemSum, item) => itemSum + Number(item.price || 0) * (item.qty ?? item.quantity ?? 1), 0);
  }, []);
  const getServedOrderTax = useCallback((order: OpenTableOrder) => {
    if (typeof order.tax === 'number' && order.tax > 0) return order.tax;
    const orderSubtotal = getServedOrderSubtotal(order);
    return taxRate > 0 ? orderSubtotal * (taxRate / 100) : 0;
  }, [getServedOrderSubtotal, taxRate]);
  const getServedOrderTotal = useCallback((order: OpenTableOrder) => {
    const savedTotal = Number(order.total || 0);
    if (savedTotal > 0) return savedTotal;
    return getServedOrderSubtotal(order) + getServedOrderTax(order);
  }, [getServedOrderSubtotal, getServedOrderTax]);
  const openTableSubtotal = openTableOrders.reduce((sum, order) => sum + getServedOrderSubtotal(order), 0);
  const openTableTax = openTableOrders.reduce((sum, order) => sum + getServedOrderTax(order), 0);
  const openTableTotal = openTableOrders.reduce((sum, order) => sum + getServedOrderTotal(order), 0);
  const draftBelongsToAccountTable = cart.length > 0 && tableNumber && tableNumber === accountTableNumber;
  const accountDraftTotal = draftBelongsToAccountTable ? total : 0;

  const saveNote = (lineId: string) => {
    setCart(prev => prev.map(c => c.line_id === lineId ? { ...c, notes: noteText } : c));
    setEditingNote(null);
  };

  const loadTableAccount = useCallback(async (selectedTable: string) => {
    setAccountTableNumber(selectedTable);
    setLoadingAccount(true);
    setAccountOpen(true);
    try {
      const res = await fetch(`/api/table-account?tenantId=${tenantId}&tableNumber=${encodeURIComponent(selectedTable)}`, {
        cache: 'no-store',
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'No se pudo cargar la cuenta');
      setOpenTableOrders((json.orders || []) as OpenTableOrder[]);
    } catch (error) {
      console.error('[fetchOpenTableAccount]', error);
      setOpenTableOrders([]);
    } finally {
      setLoadingAccount(false);
    }
  }, [tenantId]);

  const openAccountSelector = useCallback(() => {
    setAccountOpen(true);
    setAccountTableNumber('');
    setOpenTableOrders([]);
    setLoadingAccount(false);
  }, []);

  const sendOrder = async () => {
    if (!tableNumber || cart.length === 0) return;
    setSending(true);

    try {
      const payload = {
        tenantId,
        tenantSlug,
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
      const invalidRestaurant =
        !orderRes.ok &&
        typeof order?.error === 'string' &&
        order.error.toLowerCase().includes('restaurante invalido')

      if (invalidRestaurant && tenantSlug && tenantSlug !== tenantId) {
        orderRes = await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
          body: JSON.stringify({ ...payload, tenantId: tenantSlug, tenantSlug }),
        });
        order = await orderRes.json();
      }

      if (!orderRes.ok || !order.orderId) throw new Error(order.error || 'Error creando orden');

      setSuccess(true);
      setCart([]);
      setOpenTableOrders([]);
      setTableNumber('');
      setCartOpen(false);
      setAccountOpen(false);
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
      <div className="grid min-h-screen place-items-center" style={{ backgroundColor: brand.background }}>
        <div className="rounded-[2rem] border p-8 text-center shadow-2xl shadow-black/10" style={{ backgroundColor: brand.surface, borderColor: brand.border }}>
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4" style={{ borderColor: brand.border, borderTopColor: brand.primary }} />
          <p className="text-sm font-black" style={{ color: brand.surfaceText }}>{tr('common.loading')}</p>
        </div>
      </div>
    );
  }

  const CartPanel = ({ isMobile = false }: { isMobile?: boolean }) => (
    <div className={`flex h-full flex-col ${isMobile ? '' : 'border-l border-black/10'}`} style={{ backgroundColor: brand.surface }}>
      <div className="border-b border-black/10 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-black uppercase" style={{ color: brand.mutedText }}>Pedido actual</p>
            <h2 className="text-xl font-black" style={{ color: brand.surfaceText }}>{tableNumber ? `${tr('kitchen.table')} ${tableNumber}` : tr('kitchen.selectTable')}</h2>
          </div>
          {isMobile && (
            <button onClick={() => setCartOpen(false)} className="grid h-10 w-10 place-items-center rounded-2xl bg-black/[0.06]">
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-black uppercase" style={{ color: brand.mutedText }}>Mesas</span>
            {tableNumber && <button onClick={() => setTableNumber('')} className="text-xs font-black text-red-500">Quitar</button>}
          </div>
          {tables.length === 0 ? (
            <p className="rounded-2xl px-3 py-3 text-center text-xs font-bold" style={{ backgroundColor: brand.soft, color: brand.mutedText }}>Sin mesas configuradas</p>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              {tables.map(table => {
                const active = tableNumber === String(table.table_number);
                return (
                  <button
                    key={table.id}
                    onClick={() => setTableNumber(String(table.table_number))}
                    className="h-11 rounded-2xl border text-sm font-black transition active:scale-95"
                    style={active ? { borderColor: brand.primary, backgroundColor: brand.primary, color: readableText(brand.primary), boxShadow: `0 12px 30px ${brand.primary}30` } : { borderColor: brand.border, backgroundColor: brand.soft, color: brand.primaryText }}
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
          <div className="grid h-full min-h-56 place-items-center rounded-[1.5rem] border border-dashed p-6 text-center" style={{ borderColor: brand.border, backgroundColor: brand.soft }}>
            <div>
              <ShoppingCart className="mx-auto mb-3 h-8 w-8" style={{ color: brand.mutedText }} />
              <p className="text-sm font-black" style={{ color: brand.surfaceText }}>Pedido vacio</p>
              <p className="mt-1 text-xs font-semibold" style={{ color: brand.mutedText }}>Toca productos para agregarlos.</p>
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
              <div key={item.line_id} className="rounded-[1.35rem] border p-3" style={{ borderColor: brand.border, backgroundColor: brand.soft }}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="line-clamp-2 text-sm font-black leading-5" style={{ color: brand.surfaceText }}>{item.name}</p>
                    <p className="mt-1 text-xs font-black" style={{ color: brand.mutedText }}>{money(item.price)} unidad</p>
                    {item.toppings && item.toppings.length > 0 && (
                      <p className="mt-1 line-clamp-2 text-[11px] font-bold" style={{ color: brand.mutedText }}>
                        {item.toppings.map(t => t.name).join(', ')}
                      </p>
                    )}
                  </div>
                  <button onClick={() => removeFromCart(item.line_id)} className="grid h-8 w-8 place-items-center rounded-xl text-black/35 transition hover:bg-red-50 hover:text-red-500">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button onClick={() => updateQty(item.line_id, -1)} className="grid h-10 w-10 place-items-center rounded-2xl bg-black/[0.07] active:scale-95">
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="w-7 text-center text-lg font-black" style={{ color: brand.surfaceText }}>{item.quantity}</span>
                    <button onClick={() => updateQty(item.line_id, 1)} className="grid h-10 w-10 place-items-center rounded-2xl active:scale-95" style={{ backgroundColor: brand.button, color: brand.buttonText }}>
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  <span className="text-base font-black" style={{ color: brand.surfaceText }}>{money(item.price * item.quantity)}</span>
                </div>

                {editingNote === item.line_id ? (
                  <div className="mt-3 flex gap-2">
                    <input
                      autoFocus
                      value={noteText}
                      onChange={e => setNoteText(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') saveNote(item.line_id); }}
                      placeholder="Sin cebolla, bien cocido..."
                      className="min-w-0 flex-1 rounded-2xl border px-3 py-2 text-xs font-semibold outline-none"
                      style={{ backgroundColor: brand.surface, borderColor: brand.border, color: brand.surfaceText }}
                    />
                    <button onClick={() => saveNote(item.line_id)} className="rounded-2xl px-4 text-xs font-black" style={{ backgroundColor: brand.button, color: brand.buttonText }}>OK</button>
                  </div>
                ) : (
                  <button
                    onClick={() => { setEditingNote(item.line_id); setNoteText(item.notes); }}
                    className="mt-3 rounded-full px-3 py-1.5 text-xs font-black"
                    style={{ backgroundColor: brand.surface, color: brand.mutedText }}
                  >
                    {item.notes ? item.notes : '+ Nota'}
                  </button>
                )}
              </div>
            ))}
          </>
        )}
      </div>

      <div className="border-t border-black/10 p-4" style={{ backgroundColor: brand.surface }}>
        <div className="mb-3 space-y-2 rounded-2xl p-3" style={{ backgroundColor: brand.soft }}>
          <div className="flex items-center justify-between text-xs font-bold" style={{ color: brand.mutedText }}>
            <span>{cartCount} productos</span>
            <span>Pedido actual</span>
          </div>
          <div className="space-y-1.5 text-sm font-black" style={{ color: brand.surfaceText }}>
            <div className="flex items-center justify-between">
              <span>{tr('kitchen.subtotal')}:</span>
              <span>{money(subtotal)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>{tr('kitchen.tax')} {taxRate > 0 ? `${taxRate}%` : '0%'}:</span>
              <span>{money(taxAmount)}</span>
            </div>
            <div className="flex items-end justify-between border-t border-black/10 pt-2">
              <span>{tr('kitchen.total')}:</span>
              <span className="text-2xl font-black" style={{ color: brand.primary }}>{money(total)}</span>
            </div>
          </div>
        </div>
        <button
          onClick={sendOrder}
          disabled={cart.length === 0 || !tableNumber || sending}
          className="flex h-14 w-full items-center justify-center gap-2 rounded-[1.25rem] text-base font-black shadow-xl shadow-black/20 transition active:scale-[0.98] disabled:bg-black/10 disabled:text-black/35 disabled:shadow-none"
          style={!cart.length || !tableNumber || sending ? undefined : { backgroundColor: brand.button, color: brand.buttonText }}
        >
          {sending ? <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <><Send className="h-5 w-5" /> {tr('kitchen.send')}</>}
        </button>
        {!tableNumber && cart.length > 0 && <p className="mt-2 text-center text-xs font-black text-amber-600">{tr('kitchen.selectTable')}</p>}
      </div>
    </div>
  );

  return (
    <div className="flex h-screen flex-col overflow-hidden" style={{ backgroundColor: brand.background, color: brand.primaryText }}>
      <header className="border-b border-black/10 px-4 py-3 shadow-2xl shadow-black/20" style={{ backgroundColor: brand.secondary, color: readableText(brand.secondary) }}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            {brand.logoUrl ? (
              <img src={brand.logoUrl} alt={brand.appName} className="h-11 w-11 flex-shrink-0 object-contain" />
            ) : (
              <div className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-2xl bg-white" style={{ color: brand.primary }}>
                <ClipboardList className="h-6 w-6" />
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate text-base font-black">Comandero</p>
              <p className="truncate text-xs font-bold opacity-65">{brand.appName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <label className="hidden min-w-0 items-center gap-2 rounded-2xl bg-white/8 px-3 py-2 lg:flex">
              <UserRound className="h-4 w-4 text-white/50" />
              <input
                value={waiterName}
                onChange={e => setWaiterName(e.target.value)}
                placeholder="Camarero"
                className="w-32 bg-transparent text-sm font-bold text-white outline-none placeholder:text-white/35"
              />
            </label>
            <button
              onClick={() => {
                setSearchOpen(open => {
                  if (open) setSearch('');
                  return !open;
                });
              }}
              title={searchOpen ? 'Cerrar busqueda' : 'Buscar producto'}
              className="grid h-10 w-10 place-items-center rounded-xl border transition active:scale-95"
              style={{ backgroundColor: searchOpen ? brand.primary : 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.14)', color: searchOpen ? readableText(brand.primary) : readableText(brand.secondary) }}
            >
              {searchOpen ? <X className="h-4 w-4" /> : <Search className="h-4 w-4" />}
            </button>
            <button
              onClick={openAccountSelector}
              title="Ver cuenta completa"
              className="grid h-10 w-10 place-items-center rounded-xl border transition active:scale-95"
              style={{ backgroundColor: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.14)', color: readableText(brand.secondary) }}
            >
              <ReceiptText className="h-4 w-4" />
            </button>
            <LanguageSwitcher compact className="border-black/10 bg-white/80" />
            <button onClick={() => setCartOpen(true)} className="relative grid h-10 w-10 place-items-center rounded-xl md:hidden" style={{ backgroundColor: brand.button, color: brand.buttonText }}>
              <ShoppingCart className="h-5 w-5" />
              {cartCount > 0 && <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-red-500 px-1 text-[10px] font-black">{cartCount}</span>}
            </button>
          </div>
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
          <div className="border-b border-black/10 px-2 py-2" style={{ backgroundColor: brand.surface }}>
            {searchOpen && (
              <input
                autoFocus
                value={search}
                onChange={e => { setSearch(e.target.value); setSelectedCategory(null); }}
                placeholder={tr('kitchen.search')}
                className="mb-2 h-10 w-full rounded-xl border px-3 text-sm font-bold outline-none"
                style={{ backgroundColor: brand.soft, borderColor: brand.border, color: brand.surfaceText }}
              />
            )}

            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {!search && categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className="h-9 flex-shrink-0 rounded-full border px-3 text-[11px] font-black transition active:scale-95"
                  style={selectedCategory === cat.id ? { borderColor: brand.primary, backgroundColor: brand.primary, color: readableText(brand.primary) } : { borderColor: brand.border, backgroundColor: brand.surface, color: brand.mutedText }}
                >
                  {cat.name}
                </button>
              ))}
              {search && <span className="rounded-full px-4 py-2 text-xs font-black" style={{ backgroundColor: brand.soft, color: brand.mutedText }}>Resultados de busqueda</span>}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 pb-28 md:p-3 md:pb-4">
            {filteredItems.length === 0 ? (
              <div className="grid h-full min-h-80 place-items-center rounded-[2rem] border border-dashed" style={{ borderColor: brand.border, backgroundColor: brand.surface, color: brand.surfaceText }}>
                <div className="text-center">
                  <ChefHat className="mx-auto mb-3 h-9 w-9 text-black/25" />
                  <p className="text-sm font-black">Sin productos</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {filteredItems.map(item => {
                  const qty = getQty(item.id);
                  const hasToppings = (toppingsByItem.get(item.id) || []).length > 0;
                  return (
                    <article key={item.id} className="overflow-hidden rounded-[1rem] border shadow-sm" style={{ borderColor: brand.border, backgroundColor: brand.surface }}>
                      <button onClick={() => openProduct(item)} className="block w-full text-left active:scale-[0.99]">
                        <div className="relative h-20 sm:h-28" style={{ backgroundColor: brand.soft }}>
                          {item.image_url ? (
                            <Image src={item.image_url} alt={item.name} fill sizes="(max-width: 768px) 50vw, 25vw" className="object-cover" />
                          ) : (
                            <div className="grid h-full place-items-center text-black/20"><ChefHat className="h-8 w-8" /></div>
                          )}
                          {qty > 0 && <span className="absolute right-2 top-2 grid h-7 min-w-7 place-items-center rounded-full px-2 text-xs font-black" style={{ backgroundColor: brand.primary, color: readableText(brand.primary) }}>{qty}</span>}
                        </div>
                        <div className="p-2">
                          <p className="line-clamp-2 min-h-8 text-xs font-black leading-4" style={{ color: brand.surfaceText }}>{item.name}</p>
                          {item.description && <p className="mt-0.5 line-clamp-1 text-[11px] font-semibold" style={{ color: brand.mutedText }}>{item.description}</p>}
                          {hasToppings && <p className="mt-1 text-[10px] font-black uppercase tracking-wide" style={{ color: brand.primary }}>Adicionales</p>}
                          <p className="mt-1 text-sm font-black" style={{ color: brand.accent }}>{money(item.price)}</p>
                        </div>
                      </button>
                      <div className="flex items-center justify-between border-t border-black/8 p-1.5">
                        {qty > 0 ? (
                          <>
                            <button onClick={() => updateQty(cart.find(c => c.menu_item_id === item.id)?.line_id || item.id, -1)} className="grid h-9 w-9 place-items-center rounded-xl bg-black/[0.06] active:scale-95"><Minus className="h-4 w-4" /></button>
                            <span className="text-base font-black">{qty}</span>
                            <button onClick={() => openProduct(item)} className="grid h-9 w-9 place-items-center rounded-xl active:scale-95" style={{ backgroundColor: brand.button, color: brand.buttonText }}><Plus className="h-4 w-4" /></button>
                          </>
                        ) : (
                          <button onClick={() => openProduct(item)} className="flex h-9 w-full items-center justify-center gap-1.5 rounded-xl text-xs font-black active:scale-[0.98]" style={{ backgroundColor: brand.button, color: brand.buttonText }}>
                            <Plus className="h-4 w-4" />
                            {hasToppings ? 'Personalizar' : 'Agregar'}
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
          <button onClick={() => setCartOpen(true)} className="flex h-16 w-full items-center justify-between rounded-[1.4rem] px-4 font-black shadow-2xl shadow-black/20 active:scale-[0.98]" style={{ backgroundColor: brand.button, color: brand.buttonText }}>
            <span className="grid h-9 min-w-9 place-items-center rounded-full bg-white/15 px-2 text-sm">{cartCount}</span>
            <span className="flex items-center gap-2"><ShoppingCart className="h-5 w-5" /> {tr('kitchen.viewOrder')}</span>
            <span>{money(total)}</span>
          </button>
          <div className="mt-2 rounded-2xl px-4 py-3 text-sm font-black shadow-lg shadow-black/10" style={{ backgroundColor: brand.surface, color: brand.surfaceText }}>
            <div className="flex items-center justify-between">
              <span>{tr('kitchen.subtotal')}:</span>
              <span>{money(subtotal)}</span>
            </div>
            <div className="mt-1 flex items-center justify-between">
              <span>{tr('kitchen.tax')} {taxRate > 0 ? `${taxRate}%` : '0%'}:</span>
              <span>{money(taxAmount)}</span>
            </div>
            <div className="mt-1 flex items-center justify-between border-t border-black/10 pt-2" style={{ color: brand.primary }}>
              <span>{tr('kitchen.total')}:</span>
              <span>{money(total)}</span>
            </div>
          </div>
        </div>
      )}

      {accountOpen && (
        <div className="fixed inset-0 z-50 bg-black/45 p-3 backdrop-blur-sm">
          <div className="mx-auto flex h-full max-w-lg flex-col overflow-hidden rounded-[1.5rem] shadow-2xl" style={{ backgroundColor: brand.surface, color: brand.surfaceText }}>
            <div className="flex items-center justify-between border-b border-black/10 p-4">
              <div>
                <p className="text-xs font-black uppercase text-black/40">{tr('kitchen.fullAccount')}</p>
                <h3 className="text-xl font-black text-[#15130f]">{accountTableNumber ? `${tr('kitchen.table')} ${accountTableNumber}` : tr('kitchen.selectTable')}</h3>
              </div>
              <button onClick={() => setAccountOpen(false)} className="grid h-10 w-10 place-items-center rounded-2xl bg-black/[0.06]">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {!accountTableNumber ? (
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-black text-[#15130f]">Elige la mesa para ver toda la cuenta del servicio</p>
                    <p className="mt-1 text-xs font-bold text-black/45">Aqui no se envia pedido. Solo consulta el total acumulado de la mesa.</p>
                  </div>
                  {tables.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-black/15 bg-[#f8f6f1] p-6 text-center text-sm font-black text-black/45">
                      No hay mesas configuradas
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                      {tables.map(table => (
                        <button
                          key={table.id}
                          onClick={() => loadTableAccount(String(table.table_number))}
                          className="h-14 rounded-2xl border text-base font-black transition active:scale-95"
                          style={{ borderColor: brand.border, backgroundColor: brand.soft, color: brand.primary }}
                        >
                          Mesa {table.table_number}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : loadingAccount ? (
                <div className="grid h-48 place-items-center text-sm font-black text-black/45">Cargando cuenta...</div>
              ) : openTableOrders.length === 0 ? (
                <div className="grid h-48 place-items-center rounded-2xl border border-dashed border-black/15 bg-[#f8f6f1] p-5 text-center">
                  <div>
                    <ReceiptText className="mx-auto mb-3 h-8 w-8 text-black/25" />
                    <p className="text-sm font-black text-[#15130f]">No hay pedidos abiertos en esta mesa</p>
                    {draftBelongsToAccountTable && <p className="mt-1 text-xs font-bold text-black/45">El pedido actual aun no se ha enviado a cocina.</p>}
                    <button
                      onClick={() => {
                        setAccountTableNumber('');
                        setOpenTableOrders([]);
                      }}
                      className="mt-4 rounded-xl border border-black/10 px-4 py-2 text-xs font-black text-[#15130f]"
                    >
                      Ver otra mesa
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <button
                    onClick={() => {
                      setAccountTableNumber('');
                      setOpenTableOrders([]);
                    }}
                    className="rounded-xl border border-black/10 px-4 py-2 text-xs font-black text-[#15130f]"
                  >
                    Cambiar mesa
                  </button>
                  {openTableOrders.map((order) => (
                    <div key={order.id} className="rounded-2xl border border-black/10 bg-[#fbfaf7] p-3">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <p className="text-sm font-black text-[#15130f]">#{order.order_number}</p>
                        <p className="text-sm font-black text-red-600">{money(getServedOrderTotal(order))}</p>
                      </div>
                      {order.waiter_name && <p className="mb-2 text-xs font-bold text-black/42">Camarero: {order.waiter_name}</p>}
                      <div className="space-y-1">
                        {(order.items || []).map((item, index) => {
                          const qty = item.qty ?? item.quantity ?? 1;
                          return (
                            <div key={`${order.id}-${index}`} className="flex justify-between gap-2 text-sm">
                              <span className="min-w-0 truncate font-bold text-black/68">{qty}x {item.name}</span>
                              <span className="font-black text-[#15130f]">{money(item.price * qty)}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-black/10 bg-white p-4">
              {accountTableNumber ? (
                <div className="space-y-1 rounded-2xl bg-[#f6f3ed] p-3">
                  <div className="flex justify-between text-sm font-bold text-black/50">
                    <span>Subtotal servido</span>
                    <span>{money(openTableSubtotal)}</span>
                  </div>
                  {taxRate > 0 && (
                    <div className="flex justify-between text-sm font-bold text-black/50">
                      <span>IVA servido</span>
                      <span>{money(openTableTax)}</span>
                    </div>
                  )}
                  {draftBelongsToAccountTable && (
                    <div className="flex justify-between text-sm font-bold text-black/50">
                      <span>Pedido sin enviar</span>
                      <span>{money(total)}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 text-lg font-black text-[#15130f]">
                    <span>Total cuenta</span>
                    <span>{money(openTableTotal + accountDraftTotal)}</span>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl bg-[#f6f3ed] p-3 text-center text-sm font-black text-black/45">
                  Selecciona una mesa para ver la cuenta completa.
                </div>
              )}
            </div>
          </div>
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

      {customizingItem && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/45 p-0 backdrop-blur-sm sm:items-center sm:justify-center sm:p-4">
          <div className="w-full max-w-lg overflow-hidden rounded-t-[2rem] shadow-2xl sm:rounded-[2rem]" style={{ backgroundColor: brand.surface, color: brand.surfaceText }}>
            <div className="flex items-center justify-between border-b border-black/10 p-4">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase" style={{ color: brand.mutedText }}>Personalizar plato</p>
                <h3 className="truncate text-xl font-black">{customizingItem.name}</h3>
              </div>
              <button onClick={() => setCustomizingItem(null)} className="grid h-10 w-10 place-items-center rounded-2xl bg-black/[0.06]">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="max-h-[58vh] space-y-3 overflow-y-auto p-4">
              {(toppingsByItem.get(customizingItem.id) || []).map(topping => {
                const checked = selectedToppings.some(t => t.id === topping.id);
                return (
                  <button
                    key={topping.id}
                    onClick={() => toggleTopping(topping)}
                    className="flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition active:scale-[0.99]"
                    style={checked ? { borderColor: brand.primary, backgroundColor: brand.soft } : { borderColor: brand.border, backgroundColor: brand.surface }}
                  >
                    <span className="grid h-7 w-7 place-items-center rounded-xl border text-sm font-black" style={checked ? { backgroundColor: brand.primary, borderColor: brand.primary, color: readableText(brand.primary) } : { borderColor: brand.border, color: brand.mutedText }}>
                      {checked ? '✓' : '+'}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-black">{topping.name}</span>
                      {Number(topping.price || 0) > 0 && <span className="text-xs font-bold" style={{ color: brand.mutedText }}>+ {money(Number(topping.price || 0))}</span>}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="border-t border-black/10 p-4">
              <div className="mb-3 flex items-center justify-between rounded-2xl p-3" style={{ backgroundColor: brand.soft }}>
                <span className="text-sm font-black">Cantidad</span>
                <div className="flex items-center gap-2">
                  <button onClick={() => setCustomQty(q => Math.max(1, q - 1))} className="grid h-10 w-10 place-items-center rounded-2xl bg-black/[0.07] active:scale-95">
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="w-8 text-center text-lg font-black">{customQty}</span>
                  <button onClick={() => setCustomQty(q => q + 1)} className="grid h-10 w-10 place-items-center rounded-2xl active:scale-95" style={{ backgroundColor: brand.button, color: brand.buttonText }}>
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <button
                onClick={confirmCustomizedItem}
                className="flex h-14 w-full items-center justify-between rounded-[1.25rem] px-5 text-base font-black shadow-xl shadow-black/20 active:scale-[0.98]"
                style={{ backgroundColor: brand.button, color: brand.buttonText }}
              >
                <span>Agregar al pedido</span>
                <span>{money((customizingItem.price + selectedToppings.reduce((sum, topping) => sum + Number(topping.price || 0), 0)) * customQty)}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

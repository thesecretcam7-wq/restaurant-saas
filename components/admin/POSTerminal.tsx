'use client';

import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import { ShoppingCart, Plus, Minus, Trash2, Search, DollarSign, CreditCard, Maximize2, Minimize2, Lock, Clock, Truck, Store, UtensilsCrossed } from 'lucide-react';
import { POSModeSelector } from './POSModeSelector';
import { POSStaffSelector } from './POSStaffSelector';
import { POSTableSelector } from './POSTableSelector';
import { POSPayment } from './POSPayment';
import { POSCartDrawer } from './POSCartDrawer';
import { AdminMenuDrawer } from './AdminMenuDrawer';
import { CashClosingModal } from './CashClosingModal';
import { ReceiptPreview } from './ReceiptPreview';
import { Toast } from './Toast';
import { saveCartToSupabase, loadCartFromSupabase, abandonCart } from '@/lib/pos-cart-sync';
import { calculateCashClosingStats, saveCashClosing, CashClosingStats } from '@/lib/cash-closing';
import { getCurrencyByCountry, formatPriceWithCurrency } from '@/lib/currency';
import { printReceipt, savePrinterLog } from '@/lib/pos-printer';

interface MenuItem {
  id: string;
  name: string;
  price: number;
  category_id: string;
  image_url?: string;
}

interface CartItem {
  menu_item_id: string;
  name: string;
  price: number;
  quantity: number;
}

interface Category {
  id: string;
  name: string;
}

type POSMode = 'simple' | 'table';
type PaymentMethod = 'cash' | 'stripe';

interface IncomingOrder {
  id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  delivery_type: 'delivery' | 'pickup';
  delivery_address?: string;
  total: number;
  created_at: string;
}

interface DineInOrder {
  id: string;
  order_number: string;
  table_number: number | null;
  waiter_name: string | null;
  total: number;
  payment_status: string;
  status: string;
  created_at: string;
  items: { name: string; qty: number; price: number; item_id?: string }[];
}

// ─── Timer Hook ───────────────────────────────────────────────────────────────
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

// ─── Urgency Helpers ─────────────────────────────────────────────────────────
function getUrgencyBorder(minutes: number) {
  if (minutes < 5) return 'border-green-500';
  if (minutes < 10) return 'border-yellow-500';
  return 'border-red-500';
}

function getTimerColor(minutes: number) {
  if (minutes < 5) return 'text-green-400';
  if (minutes < 10) return 'text-yellow-400';
  return 'text-red-400';
}

// ─── Incoming Order Card ──────────────────────────────────────────────────────
function IncomingOrderCard({ order }: { order: IncomingOrder }) {
  const minutes = useElapsedMinutes(order.created_at);
  const isDelivery = order.delivery_type === 'delivery';

  return (
    <div className={`border-2 rounded-lg p-3 flex flex-col gap-2 transition-all ${getUrgencyBorder(minutes)} bg-card text-xs`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-black text-white text-sm">{order.order_number}</p>
          <p className="text-muted-foreground text-xs truncate">{order.customer_name}</p>
        </div>
        <div className={`flex items-center gap-1 font-bold ${getTimerColor(minutes)}`}>
          <Clock className="w-3 h-3" />
          <span>{minutes}m</span>
        </div>
      </div>

      <div className="flex items-center gap-2 text-muted-foreground">
        {isDelivery ? (
          <>
            <Truck className="w-3 h-3 text-blue-400" />
            <span className="text-xs">Delivery</span>
          </>
        ) : (
          <>
            <Store className="w-3 h-3 text-green-400" />
            <span className="text-xs">Pickup</span>
          </>
        )}
      </div>

      {isDelivery && order.delivery_address && (
        <p className="text-muted-foreground text-xs truncate">📍 {order.delivery_address}</p>
      )}

      <div className="flex items-center justify-between text-muted-foreground">
        <span className="text-xs">Total:</span>
        <span className="font-bold text-green-400">${order.total.toFixed(2)}</span>
      </div>

      <a href={`tel:${order.customer_phone}`} className="text-xs text-blue-400 hover:underline">
        {order.customer_phone}
      </a>
    </div>
  );
}

export function POSTerminal({ tenantId, country = 'CO' }: { tenantId: string; country?: string }) {
  const currencyInfo = getCurrencyByCountry(country);

  // Initialize Supabase client once inside component for proper type compatibility
  const supabase = useMemo(
    () =>
      createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ),
    []
  );

  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [discountCode, setDiscountCode] = useState('');
  const [discount, setDiscount] = useState(0);
  const [restaurantName, setRestaurantName] = useState('Restaurante');
  const [restaurantLogo, setRestaurantLogo] = useState<string | undefined>();

  // Nuevas características - Modo y selecciones
  const [posMode, setPosMode] = useState<POSMode>('simple');
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [selectedStaffName, setSelectedStaffName] = useState<string>('');
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [selectedTableNumber, setSelectedTableNumber] = useState<number | null>(null);
  const [processingPayment, setProcessingPayment] = useState(false);

  // Receipt state
  const [showReceiptPreview, setShowReceiptPreview] = useState(false);
  const [pendingPaymentData, setPendingPaymentData] = useState<{
    amountPaid?: number;
  } | null>(null);
  const [enableReceiptPrint, setEnableReceiptPrint] = useState(true);
  const [paymentResetKey, setPaymentResetKey] = useState(0);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showCartDrawer, setShowCartDrawer] = useState(false);
  const [showAdminMenu, setShowAdminMenu] = useState(false);
  const [showCashClosing, setShowCashClosing] = useState(false);
  const [cashClosingStats, setCashClosingStats] = useState<CashClosingStats | null>(null);
  const [closingLoading, setClosingLoading] = useState(false);

  // Incoming Orders for delivery/pickup
  const [incomingOrders, setIncomingOrders] = useState<IncomingOrder[]>([]);
  const [showIncomingPanel, setShowIncomingPanel] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  // Dine-in orders from comandero
  const [dineInOrders, setDineInOrders] = useState<DineInOrder[]>([]);
  const [showDineInPanel, setShowDineInPanel] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const knownOrderIds = useRef(new Set<string>());

  // Initialize audio and play sound
  const initAudio = useCallback(() => {
    if (!audioCtxRef.current) {
      try {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      } catch (_) {}
    }
  }, []);

  const playNewOrderSound = useCallback(() => {
    if (!soundEnabled) return;
    initAudio();
    const ctx = audioCtxRef.current;
    if (!ctx) return;

    const beep = (start: number, freq: number, dur: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.25, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + dur);
      osc.start(start);
      osc.stop(start + dur);
    };

    beep(ctx.currentTime, 880, 0.15);
    beep(ctx.currentTime + 0.2, 1100, 0.15);
  }, [soundEnabled, initAudio]);

  useEffect(() => {
    fetchMenuData();
    restoreCart();
  }, [tenantId]);

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isNowFullscreen = !!document.fullscreenElement;
      setIsFullscreen(isNowFullscreen);
      // Set data attribute to hide admin panel on fullscreen
      if (isNowFullscreen) {
        document.documentElement.setAttribute('data-pos-fullscreen', 'true');
      } else {
        document.documentElement.removeAttribute('data-pos-fullscreen');
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Cleanup fullscreen state when component unmounts
  useEffect(() => {
    return () => {
      // Remove fullscreen attribute when navigating away from POS
      document.documentElement.removeAttribute('data-pos-fullscreen');
      // Exit fullscreen if still active
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {
          // Ignore errors if fullscreen exit fails
        });
      }
    };
  }, []);

  async function toggleFullscreen() {
    try {
      if (!isFullscreen && document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      } else if (isFullscreen && document.fullscreenElement) {
        await document.exitFullscreen();
      }
    } catch (error) {
      console.error('Fullscreen error:', error);
    }
  }

  async function handleOpenCashClosing() {
    setClosingLoading(true);
    try {
      const stats = await calculateCashClosingStats(tenantId);
      setCashClosingStats(stats);
      setShowCashClosing(true);
    } catch (error) {
      console.error('Error calculating closing stats:', error);
      setToast({ message: 'Error al calcular estadísticas', type: 'error' });
    } finally {
      setClosingLoading(false);
    }
  }

  async function handleSaveCashClosing(actualCash: number, notes: string) {
    if (!cashClosingStats) return;

    try {
      await saveCashClosing(tenantId, selectedStaffId, selectedStaffName || 'Sin asignar', {
        ...cashClosingStats,
        actualCashCount: actualCash,
        notes,
      });

      setToast({ message: '✓ Caja cerrada exitosamente', type: 'success' });
      setShowCashClosing(false);
      setCashClosingStats(null);

      // Optionally clear cart after successful closing
      setTimeout(() => {
        setCart([]);
        setDiscount(0);
        setDiscountCode('');
      }, 1000);
    } catch (error) {
      console.error('Error saving cash closing:', error);
      setToast({ message: 'Error al guardar el cierre de caja', type: 'error' });
    }
  }

  async function restoreCart() {
    // Try to restore from Supabase first (more reliable)
    const supabaseCart = await loadCartFromSupabase(tenantId, supabase);

    if (supabaseCart) {
      // Restore from Supabase
      setCart(supabaseCart.items);
      setDiscount(supabaseCart.discount);
      setDiscountCode(supabaseCart.discountCode);
      setPaymentMethod(supabaseCart.paymentMethod);
      setPosMode(supabaseCart.posMode);
      setSelectedStaffId(supabaseCart.selectedStaffId);
      setSelectedStaffName(supabaseCart.selectedStaffName);
      setSelectedTableId(supabaseCart.selectedTableId);
      setSelectedTableNumber(supabaseCart.selectedTableNumber);
    } else if (typeof window !== 'undefined') {
      // Fallback to localStorage if Supabase fails
      const savedCart = localStorage.getItem(`pos-cart-${tenantId}`);
      const savedDiscount = localStorage.getItem(`pos-discount-${tenantId}`);
      const savedDiscountCode = localStorage.getItem(`pos-discount-code-${tenantId}`);

      if (savedCart) {
        try {
          setCart(JSON.parse(savedCart));
        } catch (error) {
          console.error('Error restoring cart from localStorage:', error);
        }
      }
      if (savedDiscount) {
        try {
          setDiscount(parseFloat(savedDiscount));
        } catch (error) {
          console.error('Error restoring discount:', error);
        }
      }
      if (savedDiscountCode) {
        setDiscountCode(savedDiscountCode);
      }
    }
  }

  // Save cart to localStorage AND Supabase whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Save to localStorage (quick)
      localStorage.setItem(`pos-cart-${tenantId}`, JSON.stringify(cart));
      localStorage.setItem(`pos-discount-${tenantId}`, discount.toString());
      localStorage.setItem(`pos-discount-code-${tenantId}`, discountCode);
    }

    // Sync to Supabase in background (doesn't block UI)
    if (cart.length > 0 && tenantId) {
      const cartData = {
        items: cart,
        discount,
        discountCode,
        paymentMethod,
        posMode,
        selectedStaffId,
        selectedStaffName,
        selectedTableId,
        selectedTableNumber,
      };

      // Fire and forget - don't await
      saveCartToSupabase(tenantId, cartData, supabase).catch((err) => {
        console.error('Background cart sync failed (will use localStorage):', err);
      });
    }
  }, [cart, discount, discountCode, tenantId]);

  // Real-time subscription for incoming orders (delivery/pickup)
  useEffect(() => {
    if (!tenantId) return;

    const subscription = supabase
      .channel(`incoming-orders:${tenantId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
          filter: `tenant_id=eq.${tenantId}`,
        },
        async (payload) => {
          const newOrder = payload.new as IncomingOrder;
          if (newOrder.delivery_type === 'delivery' || newOrder.delivery_type === 'pickup') {
            const isNewOrder = !knownOrderIds.current.has(newOrder.id);
            if (isNewOrder) {
              playNewOrderSound();
              knownOrderIds.current.add(newOrder.id);
              setShowIncomingPanel(true);
              await fetchIncomingOrders();
            }
          } else if ((newOrder as any).delivery_type === 'dine-in') {
            playNewOrderSound();
            setShowDineInPanel(true);
            await fetchDineInOrders();
          }
        }
      )
      .subscribe();

    // Initial fetch
    fetchIncomingOrders();
    fetchDineInOrders();

    return () => {
      subscription.unsubscribe();
    };
  }, [tenantId, playNewOrderSound]);

  async function fetchIncomingOrders() {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('tenant_id', tenantId)
        .or(`delivery_type.eq.delivery,delivery_type.eq.pickup`)
        .eq('payment_status', 'pending')
        .order('created_at', { ascending: false })
        .limit(10);

      if (!error && data) {
        setIncomingOrders(data);
        data.forEach((order: IncomingOrder) => knownOrderIds.current.add(order.id));
      }
    } catch (error) {
      console.error('Error fetching incoming orders:', error);
    }
  }

  async function fetchDineInOrders() {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('delivery_type', 'dine-in')
        .eq('payment_status', 'pending')
        .order('created_at', { ascending: false })
        .limit(20);

      if (!error && data) {
        setDineInOrders(data as DineInOrder[]);
      }
    } catch (error) {
      console.error('Error fetching dine-in orders:', error);
    }
  }

  function loadDineInToCart(order: DineInOrder) {
    const cartItems: CartItem[] = (order.items || []).map((item) => ({
      menu_item_id: item.item_id || item.name,
      name: item.name,
      price: item.price,
      quantity: item.qty,
    }));
    setCart(cartItems);
    setPosMode('table');
    if (order.table_number) setSelectedTableNumber(order.table_number);
    setShowDineInPanel(false);
    setShowIncomingPanel(false);
  }


  async function fetchMenuData() {
    try {
      const [categoriesRes, menuRes, tenantRes] = await Promise.all([
        supabase
          .from('menu_categories')
          .select('*')
          .eq('tenant_id', tenantId)
          .eq('active', true),
        supabase
          .from('menu_items')
          .select('*')
          .eq('tenant_id', tenantId)
          .eq('available', true),
        supabase
          .from('tenants')
          .select('app_name, logo_url')
          .eq('id', tenantId)
          .single(),
      ]);

      if (categoriesRes.data) setCategories(categoriesRes.data);
      if (menuRes.data) setMenu(menuRes.data);
      if (tenantRes.data) {
        if (tenantRes.data.app_name) setRestaurantName(tenantRes.data.app_name);
        if (tenantRes.data.logo_url) setRestaurantLogo(tenantRes.data.logo_url);
      }
    } catch (error) {
      console.error('Error fetching menu:', error);
    } finally {
      setLoading(false);
    }
  }

  function addToCart(item: MenuItem) {
    setCart((prev) => {
      const existing = prev.find((c) => c.menu_item_id === item.id);
      if (existing) {
        return prev.map((c) =>
          c.menu_item_id === item.id ? { ...c, quantity: c.quantity + 1 } : c
        );
      }
      return [
        ...prev,
        {
          menu_item_id: item.id,
          name: item.name,
          price: item.price,
          quantity: 1,
        },
      ];
    });
  }

  function removeFromCart(itemId: string) {
    setCart((prev) => prev.filter((c) => c.menu_item_id !== itemId));
  }

  function updateQuantity(itemId: string, quantity: number) {
    if (quantity <= 0) {
      removeFromCart(itemId);
    } else {
      setCart((prev) =>
        prev.map((c) => (c.menu_item_id === itemId ? { ...c, quantity } : c))
      );
    }
  }

  async function applyDiscountCode() {
    try {
      const response = await fetch(
        `/api/discount-codes?code=${discountCode}&tenantId=${tenantId}`,
        { credentials: 'include' }
      );

      if (!response.ok) {
        setToast({ message: 'Código de descuento inválido', type: 'error' });
        return;
      }

      const data = await response.json();
      const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

      let discountAmount = 0;
      if (data.promotion.type === 'percentage') {
        discountAmount = (subtotal * data.promotion.value) / 100;
        if (data.promotion.maxDiscount && discountAmount > data.promotion.maxDiscount) {
          discountAmount = data.promotion.maxDiscount;
        }
      } else if (data.promotion.type === 'fixed') {
        discountAmount = data.promotion.value;
      }

      setDiscount(discountAmount);
      setDiscountCode('');
    } catch (error) {
      console.error('Error applying discount:', error);
      setToast({ message: 'Error al aplicar código', type: 'error' });
    }
  }

  function handleShowReceipt(amountPaid?: number) {
    if (cart.length === 0) {
      setToast({ message: 'El carrito está vacío', type: 'error' });
      return;
    }

    if (posMode === 'table' && (!selectedStaffId || !selectedTableId)) {
      setToast({ message: 'Por favor selecciona camarero y mesa', type: 'error' });
      return;
    }

    // If print receipt is disabled, process directly
    if (!enableReceiptPrint) {
      setPendingPaymentData({ amountPaid });
      processPaymentAfterReceipt();
      return;
    }

    // Show receipt preview
    setPendingPaymentData({ amountPaid });
    setShowReceiptPreview(true);
  }

  async function processPaymentAfterReceipt() {
    try {
      setProcessingPayment(true);

      // Format items to match API expectations (qty instead of quantity)
      const formattedItems = cart.map(item => ({
        menu_item_id: item.menu_item_id,
        name: item.name,
        price: item.price,
        qty: item.quantity,
      }));

      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          tenantId,
          customerInfo: {
            name: 'POS Counter',
            email: null,
            phone: 'N/A',
          },
          items: formattedItems,
          paymentMethod,
          deliveryType: posMode === 'table' ? 'dine-in' : 'pickup',
          waiter_id: selectedStaffId || null,
          waiterName: selectedStaffName || null,
          table_id: selectedTableId || null,
          tableNumber: selectedTableNumber || null,
          notes: discount > 0 ? `Descuento: $${discount.toFixed(2)}` : null,
          amountPaid: paymentMethod === 'cash' ? pendingPaymentData?.amountPaid : null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to process order');
      }

      // Mark cart as abandoned in Supabase
      await abandonCart(tenantId, supabase);

      // Attempt to print receipt if printer is configured
      let settings: any = null;
      try {
        const result = await supabase
          .from('restaurant_settings')
          .select('default_receipt_printer_id, printer_auto_print')
          .eq('tenant_id', tenantId)
          .single();

        settings = result.data;

        if (settings?.printer_auto_print && settings?.default_receipt_printer_id) {
          // Get the order data for receipt
          const { data: order } = await supabase
            .from('orders')
            .select('*')
            .eq('tenant_id', tenantId)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          if (order) {
            await printReceipt(tenantId, settings.default_receipt_printer_id, {
              orderId: order.id,
              orderNumber: order.order_number,
              items: cart,
              subtotal,
              discount,
              total,
              amountPaid: paymentMethod === 'cash' ? pendingPaymentData?.amountPaid : undefined,
              change: paymentMethod === 'cash'
                ? (pendingPaymentData?.amountPaid || 0) - total
                : 0,
              currencyInfo,
              waiterName: selectedStaffName || undefined,
              tableNumber: selectedTableNumber || undefined,
            });
          }
        }
      } catch (printError) {
        // Log print error but don't fail the order
        console.error('Print error (non-blocking):', printError);
        await savePrinterLog(tenantId, settings?.default_receipt_printer_id || null, 'print', 'failed', {
          error: printError instanceof Error ? printError.message : String(printError),
        });
      }

      // Clear cart and reset all states
      setCart([]);
      setDiscount(0);
      setDiscountCode('');
      setShowReceiptPreview(false);
      setPendingPaymentData(null);
      setPaymentMethod('cash');
      setSelectedCategory(null);
      setSearchQuery('');

      // Clear localStorage
      if (typeof window !== 'undefined') {
        localStorage.removeItem(`pos-cart-${tenantId}`);
        localStorage.removeItem(`pos-discount-${tenantId}`);
        localStorage.removeItem(`pos-discount-code-${tenantId}`);
      }

      // Force remount of POSPayment component to reset its internal state
      setPaymentResetKey(paymentResetKey + 1);

      // Show success toast (auto-closes after 3 seconds)
      setToast({ message: '✅ Orden completada exitosamente', type: 'success' });
    } catch (error) {
      console.error('Error processing payment:', error);
      setToast({
        message: 'Error al procesar el pago: ' + (error instanceof Error ? error.message : 'Error desconocido'),
        type: 'error',
      });
    } finally {
      setProcessingPayment(false);
    }
  }

  const filteredMenu = menu.filter((item) => {
    const matchesCategory = !selectedCategory || item.category_id === selectedCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const total = subtotal - discount;

  if (loading) {
    return <div className="flex items-center justify-center h-screen bg-muted">Cargando TPV...</div>;
  }

  return (
    <div className={`${isFullscreen ? 'w-screen h-screen p-0 m-0 overflow-hidden flex flex-col' : 'h-full'} bg-muted text-white flex`}>
      {/* Fullscreen Header - Logo and Controls - TPV Header with Eccofood Brand */}
      {isFullscreen && (
        <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 border-b border-blue-900/50 px-6 py-4 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-2.5 border border-white/20">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-white/60 text-xs font-semibold tracking-wider">PUNTO DE VENTA</p>
              <h1 className="text-white font-black text-lg tracking-wide">{restaurantName}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAdminMenu(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 text-white text-sm font-semibold transition-all duration-200"
              title="Panel de administración"
            >
              <span>⚙️</span>
              <span className="hidden sm:inline">Admin</span>
            </button>
            <button
              onClick={toggleFullscreen}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 text-white text-sm font-semibold transition-all duration-200"
              title={isFullscreen ? 'Salir de pantalla completa (ESC)' : 'Pantalla completa'}
            >
              {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
              <span className="hidden sm:inline">{isFullscreen ? 'Salir' : 'Fullscreen'}</span>
            </button>
          </div>
        </div>
      )}

      <div className={`flex-1 flex overflow-hidden ${isFullscreen ? 'gap-0' : 'gap-0'}`}>
        {/* Menu Section */}
        <div className={`flex-1 flex flex-col bg-card overflow-hidden`}>
          {/* Search and Controls - Sticky Header */}
          <div className={`flex gap-3 items-center bg-card sticky top-0 z-10 border-b border-border backdrop-blur-sm ${isFullscreen ? 'px-4 py-3' : 'p-4'}`}>
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                placeholder="Buscar producto..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-2.5 rounded-lg bg-gray-800 border border-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none text-white text-sm font-medium transition-all"
              />
            </div>
            {!isFullscreen && (
              <>
                <button
                  onClick={handleOpenCashClosing}
                  disabled={closingLoading}
                  className="flex items-center gap-2 px-3 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-semibold text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Cerrar caja diaria"
                >
                  <Lock className="w-5 h-5" />
                  <span className="hidden sm:inline">Cerrar</span>
                </button>
                <button
                  onClick={toggleFullscreen}
                  className="flex items-center gap-2 px-3 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-sm transition-all duration-200"
                  title="Pantalla completa"
                >
                  <Maximize2 className="w-5 h-5" />
                  <span className="hidden sm:inline">Pantalla</span>
                </button>
              </>
            )}
          </div>

          {/* Categories - Sticky */}
          <div className={`flex gap-2 overflow-x-auto pb-2 sticky z-10 bg-gradient-to-r from-gray-900/80 to-gray-800/80 border-b border-gray-800 backdrop-blur-sm ${isFullscreen ? 'px-4 py-3' : 'px-4 py-2.5'}`}>
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-4 py-2.5 rounded-lg whitespace-nowrap transition text-sm font-bold tracking-wide ${
                selectedCategory === null
                  ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700'
              }`}
            >
              Todos
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-4 py-2.5 rounded-lg whitespace-nowrap transition text-sm font-bold tracking-wide ${
                  selectedCategory === cat.id
                    ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Menu Grid */}
          <div className={`flex-1 overflow-y-auto bg-gradient-to-b from-gray-900/50 to-gray-950 ${isFullscreen ? 'px-4 py-3' : 'p-4'}`}>
            <div className={`grid gap-3 h-fit ${isFullscreen ? 'grid-cols-8' : 'grid-cols-5 md:grid-cols-6 lg:grid-cols-7'}`}>
              {filteredMenu.map((item) => (
                <button
                  key={item.id}
                  onClick={() => addToCart(item)}
                  className="bg-gradient-to-br from-gray-800 to-gray-900 hover:from-blue-700/40 hover:to-blue-900/40 rounded-xl p-2.5 text-left transition-all duration-200 transform hover:scale-105 active:scale-95 h-fit flex flex-col justify-between border border-gray-700 hover:border-blue-500 group"
                >
                  {item.image_url && (
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className={`w-full object-contain rounded-lg mb-2 group-hover:scale-110 transition-transform duration-200 ${isFullscreen ? 'h-16' : 'max-h-20'}`}
                    />
                  )}
                  <p className="font-bold text-xs truncate flex-1 text-white group-hover:text-blue-300 transition-colors">{item.name}</p>
                  <p className="text-green-400 font-bold text-xs mt-1">{formatPriceWithCurrency(item.price, currencyInfo.code, currencyInfo.locale)}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Cart/Payment Section */}
        <div className={`${isFullscreen ? 'w-72' : 'w-72'} bg-gradient-to-b from-gray-900 to-gray-950 border-l border-gray-800 flex flex-col overflow-hidden shadow-xl`}>
          {/* Tabs: Cart vs Incoming Orders */}
          <div className={`border-b border-gray-800 flex gap-0 bg-gray-950/50 backdrop-blur-sm ${isFullscreen ? 'px-0 py-0' : 'px-0 py-0'}`}>
            <button
              onClick={() => { setShowIncomingPanel(false); setShowDineInPanel(false); }}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-2 border-b-2 transition text-xs font-bold tracking-wide ${
                !showIncomingPanel && !showDineInPanel
                  ? 'border-blue-600 bg-blue-600/20 text-white'
                  : 'border-transparent bg-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              <ShoppingCart className="w-4 h-4" />
              <span>Carrito</span>
              <span className="ml-auto bg-blue-600 text-white rounded-full px-2 py-0.5 text-xs font-bold">{cart.length}</span>
            </button>
            <button
              onClick={() => { setShowIncomingPanel(true); setShowDineInPanel(false); }}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-2 border-b-2 transition text-xs font-bold tracking-wide relative ${
                showIncomingPanel && !showDineInPanel
                  ? 'border-blue-600 bg-blue-600/20 text-white'
                  : 'border-transparent bg-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              <Truck className="w-4 h-4" />
              <span>Entregas</span>
              <span className="ml-auto bg-blue-600 text-white rounded-full px-2 py-0.5 text-xs font-bold">{incomingOrders.length}</span>
              {incomingOrders.length > 0 && (
                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              )}
            </button>
            <button
              onClick={() => { setShowDineInPanel(true); setShowIncomingPanel(false); }}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-2 border-b-2 transition text-xs font-bold tracking-wide relative ${
                showDineInPanel
                  ? 'border-emerald-500 bg-emerald-500/20 text-white'
                  : 'border-transparent bg-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              <UtensilsCrossed className="w-4 h-4" />
              <span>Mesas</span>
              <span className="ml-auto bg-emerald-600 text-white rounded-full px-2 py-0.5 text-xs font-bold">{dineInOrders.length}</span>
              {dineInOrders.length > 0 && (
                <span className="absolute top-2 right-2 w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              )}
            </button>
          </div>

          {/* Mesas / Dine-in Panel */}
          {showDineInPanel && (
            <div className="flex-1 flex flex-col overflow-hidden">
              {dineInOrders.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-gray-500">
                  <div className="text-center">
                    <p className="text-3xl mb-2">🍽️</p>
                    <p className="text-sm">Sin mesas pendientes</p>
                  </div>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                  {dineInOrders.map((order) => (
                    <div key={order.id} className="bg-gray-800 border border-gray-700 rounded-xl p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-white font-bold text-sm">Mesa {order.table_number ?? '—'}</span>
                        <span className="text-gray-400 text-xs">{order.order_number}</span>
                      </div>
                      {order.waiter_name && (
                        <p className="text-gray-400 text-xs mb-2">Mesero: {order.waiter_name}</p>
                      )}
                      <div className="space-y-0.5 mb-3">
                        {(order.items || []).map((item, i) => (
                          <p key={i} className="text-gray-300 text-xs">{item.qty}x {item.name}</p>
                        ))}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-emerald-400 font-bold text-sm">${Number(order.total).toLocaleString('es-CO')}</span>
                        <button
                          onClick={() => loadDineInToCart(order)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-colors"
                        >
                          Cobrar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Cart Content - Only show when not in Incoming Panel or Dine-in Panel */}
          {!showIncomingPanel && !showDineInPanel && (
            <>
              {/* Discount Code */}
              <div className={`border-b border-border ${isFullscreen ? 'px-2 py-1' : 'px-2 py-1'} space-y-1 text-xs`}>
            <div className="flex gap-1">
              <input
                type="text"
                placeholder="Código descuento"
                value={discountCode}
                onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                className="flex-1 px-2 py-1 rounded bg-card border border-border focus:border-blue-500 outline-none text-white text-xs"
              />
              <button
                onClick={applyDiscountCode}
                className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded font-bold text-xs transition"
              >
                Aplicar
              </button>
            </div>
            {discount > 0 && (
              <p className="text-green-400 text-xs">Descuento: -{formatPriceWithCurrency(discount, currencyInfo.code, currencyInfo.locale)}</p>
            )}
          </div>

          {/* Totals */}
          <div className={`border-b border-gray-800 ${isFullscreen ? 'px-3 py-2' : 'px-3 py-2'} space-y-2 bg-gray-950/50 text-sm backdrop-blur-sm`}>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-400">Subtotal:</span>
                <span className="font-semibold text-gray-200">{formatPriceWithCurrency(subtotal, currencyInfo.code, currencyInfo.locale)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between bg-green-500/20 px-2 py-1.5 rounded-lg border border-green-500/30">
                  <span className="text-green-400 font-medium">Descuento:</span>
                  <span className="font-bold text-green-300">-{formatPriceWithCurrency(discount, currencyInfo.code, currencyInfo.locale)}</span>
                </div>
              )}
            </div>
            <div className="border-t border-gray-700 pt-2 flex justify-between text-base font-black bg-gradient-to-r from-green-600/20 to-emerald-600/20 px-2 py-2 rounded-lg border border-green-600/30">
              <span className="text-white">Total:</span>
              <span className="text-green-400 text-lg">{formatPriceWithCurrency(total, currencyInfo.code, currencyInfo.locale)}</span>
            </div>

            {/* Print Receipt Toggle */}
            <div className="pt-2 border-t border-border flex items-center gap-2">
              <input
                type="checkbox"
                id="printReceipt"
                checked={enableReceiptPrint}
                onChange={(e) => setEnableReceiptPrint(e.target.checked)}
                className="w-3 h-3 rounded bg-gray-700 border-border cursor-pointer"
              />
              <label htmlFor="printReceipt" className="text-xs text-muted-foreground cursor-pointer flex-1">
                Imprimir recibo
              </label>
            </div>
          </div>

          {/* Mode, Staff, Table Selectors */}
          <div className={`border-b border-border ${isFullscreen ? 'px-2 py-1' : 'px-2 py-1'} space-y-1 text-xs`}>
            <POSModeSelector
              mode={posMode}
              onModeChange={(newMode) => {
                setPosMode(newMode);
                setSelectedStaffId(null);
                setSelectedStaffName('');
                setSelectedTableId(null);
                setSelectedTableNumber(null);
              }}
            />

            {posMode === 'table' && (
              <>
                <POSStaffSelector
                  tenantId={tenantId}
                  selectedStaffId={selectedStaffId}
                  onStaffSelect={(id, name) => {
                    setSelectedStaffId(id);
                    setSelectedStaffName(name);
                  }}
                  required
                />
                <POSTableSelector
                  tenantId={tenantId}
                  selectedTableId={selectedTableId}
                  onTableSelect={(id, tableNumber) => {
                    setSelectedTableId(id);
                    setSelectedTableNumber(tableNumber);
                  }}
                  required
                />
              </>
            )}
          </div>

          {/* Payment Component */}
              <div className={`${isFullscreen ? 'px-2 py-1' : 'px-2 py-1'}`}>
                <POSPayment
                  key={paymentResetKey}
                  total={total}
                  paymentMethod={paymentMethod}
                  onPaymentMethodChange={setPaymentMethod}
                  onProceedPayment={handleShowReceipt}
                  disabled={cart.length === 0 || (posMode === 'table' && (!selectedStaffId || !selectedTableId))}
                  loading={processingPayment}
                  country={country}
                />
              </div>
            </>
          )}

          {/* Incoming Orders Panel */}
          {showIncomingPanel && (
            <div className="flex-1 flex flex-col overflow-hidden">
              {incomingOrders.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <p className="text-3xl mb-2">📦</p>
                    <p className="text-sm">No hay pedidos pendientes</p>
                    <p className="text-xs text-muted-foreground mt-1">Los pedidos de delivery/pickup aparecerán aquí</p>
                  </div>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                  {incomingOrders.map((order) => (
                    <IncomingOrderCard key={order.id} order={order} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Toast Notifications */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          duration={3000}
          onClose={() => setToast(null)}
        />
      )}

      {/* Receipt Preview Modal */}
      {showReceiptPreview && (
        <ReceiptPreview
          restaurantName={restaurantName}
          restaurantLogo={restaurantLogo}
          orderNumber={`ORD-${Date.now()}`}
          date={new Date()}
          waiterName={selectedStaffName || undefined}
          tableNumber={selectedTableNumber || undefined}
          items={cart.map(item => ({
            name: item.name,
            price: item.price,
            qty: item.quantity,
          }))}
          subtotal={subtotal}
          discount={discount > 0 ? discount : undefined}
          total={total}
          paymentMethod={paymentMethod}
          amountPaid={paymentMethod === 'cash' ? pendingPaymentData?.amountPaid : undefined}
          change={
            paymentMethod === 'cash' && pendingPaymentData?.amountPaid
              ? Math.round((pendingPaymentData.amountPaid - total) * 100) / 100
              : undefined
          }
          onClose={() => {
            setShowReceiptPreview(false);
            setPendingPaymentData(null);
          }}
          onPrint={processPaymentAfterReceipt}
          onProcessWithoutPrint={() => {
            setShowReceiptPreview(false);
            processPaymentAfterReceipt();
          }}
          loading={processingPayment}
        />
      )}

      {/* Cart Drawer Modal */}
      <POSCartDrawer
        isOpen={showCartDrawer}
        cartItems={cart}
        subtotal={subtotal}
        discount={discount}
        onUpdateQuantity={updateQuantity}
        onRemoveItem={removeFromCart}
        onClose={() => setShowCartDrawer(false)}
        country={country}
      />

      {/* Admin Menu Drawer Modal */}
      <AdminMenuDrawer
        isOpen={showAdminMenu}
        tenantId={tenantId}
        navLinks={[
          { href: `/${tenantId}/admin/dashboard`, label: 'Dashboard', icon: '📊' },
          { href: `/${tenantId}/admin/pedidos`, label: 'Pedidos', icon: '🛍️' },
          { href: `/${tenantId}/admin/productos`, label: 'Productos', icon: '🍽️' },
          { href: `/${tenantId}/admin/reservas`, label: 'Reservas', icon: '📅' },
          { href: `/${tenantId}/admin/clientes`, label: 'Clientes', icon: '👥' },
          { href: `/${tenantId}/admin/ventas`, label: 'Ventas', icon: '📈' },
          { href: `/${tenantId}/admin/configuracion/restaurante`, label: 'Configuración', icon: '⚙️' },
        ]}
        onClose={() => setShowAdminMenu(false)}
      />

      {/* Cash Closing Modal */}
      {cashClosingStats && (
        <CashClosingModal
          isOpen={showCashClosing}
          onClose={() => {
            setShowCashClosing(false);
            setCashClosingStats(null);
          }}
          onConfirm={handleSaveCashClosing}
          data={{
            ...cashClosingStats,
            staffName: selectedStaffName || 'Sin asignar',
          }}
          country={country}
          isLoading={closingLoading}
        />
      )}
    </div>
  );
}

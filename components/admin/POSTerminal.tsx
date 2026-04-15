'use client';

import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import { ShoppingCart, Plus, Minus, Trash2, Search, DollarSign, CreditCard, Maximize2, Minimize2, Lock, Clock, Truck, Store } from 'lucide-react';
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
    <div className={`border-2 rounded-lg p-3 flex flex-col gap-2 transition-all ${getUrgencyBorder(minutes)} bg-gray-800 text-xs`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-black text-white text-sm">{order.order_number}</p>
          <p className="text-gray-300 text-xs truncate">{order.customer_name}</p>
        </div>
        <div className={`flex items-center gap-1 font-bold ${getTimerColor(minutes)}`}>
          <Clock className="w-3 h-3" />
          <span>{minutes}m</span>
        </div>
      </div>

      <div className="flex items-center gap-2 text-gray-300">
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
        <p className="text-gray-400 text-xs truncate">📍 {order.delivery_address}</p>
      )}

      <div className="flex items-center justify-between text-gray-300">
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
  const [printReceipt, setPrintReceipt] = useState(true);
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
          // Only show delivery/pickup orders
          if (newOrder.delivery_type === 'delivery' || newOrder.delivery_type === 'pickup') {
            const isNewOrder = !knownOrderIds.current.has(newOrder.id);
            if (isNewOrder) {
              playNewOrderSound();
              knownOrderIds.current.add(newOrder.id);
              setShowIncomingPanel(true);
              // Re-fetch incoming orders to ensure data consistency
              await fetchIncomingOrders();
            }
          }
        }
      )
      .subscribe();

    // Initial fetch
    fetchIncomingOrders();

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
        // Track all order IDs
        data.forEach((order: IncomingOrder) => knownOrderIds.current.add(order.id));
      }
    } catch (error) {
      console.error('Error fetching incoming orders:', error);
    }
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
    if (!printReceipt) {
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
      try {
        const { data: settings } = await supabase
          .from('restaurant_settings')
          .select('default_receipt_printer_id, printer_auto_print')
          .eq('tenant_id', tenantId)
          .single();

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
    return <div className="flex items-center justify-center h-screen bg-gray-900">Cargando TPV...</div>;
  }

  return (
    <div className={`${isFullscreen ? 'w-screen h-screen p-0 m-0 overflow-hidden flex flex-col' : 'h-full'} bg-gray-900 text-white flex`}>
      {/* Fullscreen Header - Logo and Controls */}
      {isFullscreen && (
        <div className="bg-gray-900 border-b border-gray-700 px-4 py-2 flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            {restaurantLogo && (
              <img src={restaurantLogo} alt={restaurantName} className="h-8 w-8 object-contain rounded" />
            )}
            <h1 className="text-base font-bold text-white">{restaurantName}</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAdminMenu(true)}
              className="bg-gray-700 hover:bg-gray-600 text-white rounded p-1.5 transition"
              title="Panel de administración"
            >
              <span className="text-base">⚙️</span>
            </button>
            <button
              onClick={toggleFullscreen}
              className="bg-gray-700 hover:bg-gray-600 text-white rounded p-1.5 transition"
              title="Salir de pantalla completa (ESC)"
            >
              <Minimize2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <div className={`flex-1 flex overflow-hidden ${isFullscreen ? 'gap-0' : 'gap-0'}`}>
        {/* Menu Section */}
        <div className={`flex-1 flex flex-col bg-gray-800 overflow-hidden`}>
          {/* Search and Controls - Sticky Header */}
          <div className={`flex gap-2 items-center bg-gray-800 sticky top-0 z-10 border-b border-gray-700 ${isFullscreen ? 'px-4 py-3' : 'p-4 mb-2'}`}>
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar producto..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg bg-gray-700 border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-white"
              />
            </div>
            {!isFullscreen && (
              <>
                <button
                  onClick={handleOpenCashClosing}
                  disabled={closingLoading}
                  className="bg-orange-600 hover:bg-orange-700 text-white rounded-lg p-2 transition disabled:opacity-50"
                  title="Cerrar caja diaria"
                >
                  <Lock className="w-5 h-5" />
                </button>
                <button
                  onClick={toggleFullscreen}
                  className="bg-gray-700 hover:bg-gray-600 text-white rounded-lg p-2 transition"
                  title="Pantalla completa"
                >
                  <Maximize2 className="w-5 h-5" />
                </button>
              </>
            )}
          </div>

          {/* Categories - Sticky */}
          <div className={`flex gap-2 overflow-x-auto pb-2 sticky z-10 bg-gray-800 border-b border-gray-700 ${isFullscreen ? 'px-4 py-3' : 'px-4 py-2'}`}>
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-4 py-2 rounded-lg whitespace-nowrap transition text-sm font-medium ${
                selectedCategory === null
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Todos
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-4 py-2 rounded-lg whitespace-nowrap transition text-sm font-medium ${
                  selectedCategory === cat.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Menu Grid */}
          <div className={`flex-1 overflow-y-auto ${isFullscreen ? 'px-4 py-3' : 'p-4'}`}>
            <div className={`grid gap-2 h-fit ${isFullscreen ? 'grid-cols-8' : 'grid-cols-5 md:grid-cols-6 lg:grid-cols-7'}`}>
              {filteredMenu.map((item) => (
                <button
                  key={item.id}
                  onClick={() => addToCart(item)}
                  className="bg-gray-700 hover:bg-blue-600 rounded-lg p-2 text-left transition transform hover:scale-105 active:scale-95 h-fit flex flex-col justify-between"
                >
                  {item.image_url && (
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className={`w-full object-contain rounded mb-1 ${isFullscreen ? 'h-16' : 'max-h-20'}`}
                    />
                  )}
                  <p className="font-bold text-xs truncate flex-1">{item.name}</p>
                  <p className="text-green-400 font-bold text-xs">{formatPriceWithCurrency(item.price, currencyInfo.code, currencyInfo.locale)}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Cart/Payment Section */}
        <div className={`${isFullscreen ? 'w-72' : 'w-72'} bg-gray-900 border-l border-gray-700 flex flex-col overflow-hidden`}>
          {/* Tabs: Cart vs Incoming Orders */}
          <div className={`border-b border-gray-700 flex gap-0 ${isFullscreen ? 'px-0 py-0' : 'px-0 py-0'}`}>
            <button
              onClick={() => setShowIncomingPanel(false)}
              className={`flex-1 flex items-center justify-center gap-1 py-2 px-2 border-b-2 transition text-xs font-bold ${
                !showIncomingPanel
                  ? 'border-blue-600 bg-gray-800 text-white'
                  : 'border-gray-700 bg-gray-900 text-gray-400 hover:text-gray-300'
              }`}
            >
              <ShoppingCart className="w-4 h-4" />
              <span>Carrito ({cart.length})</span>
            </button>
            <button
              onClick={() => setShowIncomingPanel(true)}
              className={`flex-1 flex items-center justify-center gap-1 py-2 px-2 border-b-2 transition text-xs font-bold ${
                showIncomingPanel
                  ? 'border-blue-600 bg-gray-800 text-white'
                  : 'border-gray-700 bg-gray-900 text-gray-400 hover:text-gray-300'
              } ${incomingOrders.length > 0 ? 'relative' : ''}`}
            >
              <Truck className="w-4 h-4" />
              <span>Entregas ({incomingOrders.length})</span>
              {incomingOrders.length > 0 && (
                <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              )}
            </button>
          </div>

          {/* Cart Content - Only show when not in Incoming Panel */}
          {!showIncomingPanel && (
            <>
              {/* Discount Code */}
              <div className={`border-b border-gray-700 ${isFullscreen ? 'px-2 py-1' : 'px-2 py-1'} space-y-1 text-xs`}>
            <div className="flex gap-1">
              <input
                type="text"
                placeholder="Código descuento"
                value={discountCode}
                onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                className="flex-1 px-2 py-1 rounded bg-gray-800 border border-gray-700 focus:border-blue-500 outline-none text-white text-xs"
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
          <div className={`border-b border-gray-700 ${isFullscreen ? 'px-2 py-1' : 'px-2 py-1'} space-y-1 bg-gray-800 text-sm`}>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-400">Subtotal:</span>
                <span className="font-bold">{formatPriceWithCurrency(subtotal, currencyInfo.code, currencyInfo.locale)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-green-400">
                  <span>Descuento:</span>
                  <span className="font-bold">-{formatPriceWithCurrency(discount, currencyInfo.code, currencyInfo.locale)}</span>
                </div>
              )}
            </div>
            <div className="border-t border-gray-700 pt-2 flex justify-between text-base font-bold">
              <span>Total:</span>
              <span className="text-green-400">{formatPriceWithCurrency(total, currencyInfo.code, currencyInfo.locale)}</span>
            </div>

            {/* Print Receipt Toggle */}
            <div className="pt-2 border-t border-gray-700 flex items-center gap-2">
              <input
                type="checkbox"
                id="printReceipt"
                checked={printReceipt}
                onChange={(e) => setPrintReceipt(e.target.checked)}
                className="w-3 h-3 rounded bg-gray-700 border-gray-600 cursor-pointer"
              />
              <label htmlFor="printReceipt" className="text-xs text-gray-300 cursor-pointer flex-1">
                Imprimir recibo
              </label>
            </div>
          </div>

          {/* Mode, Staff, Table Selectors */}
          <div className={`border-b border-gray-700 ${isFullscreen ? 'px-2 py-1' : 'px-2 py-1'} space-y-1 text-xs`}>
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
                <div className="flex-1 flex items-center justify-center text-gray-400">
                  <div className="text-center">
                    <p className="text-3xl mb-2">📦</p>
                    <p className="text-sm">No hay pedidos pendientes</p>
                    <p className="text-xs text-gray-500 mt-1">Los pedidos de delivery/pickup aparecerán aquí</p>
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

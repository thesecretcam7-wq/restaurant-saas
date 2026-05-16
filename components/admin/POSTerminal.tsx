'use client';

import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ShoppingCart, Plus, Minus, Trash2, Search, DollarSign, CreditCard, Maximize2, Minimize2, Lock, Clock, Truck, Store, UtensilsCrossed, Archive, Monitor, Printer, CalendarDays } from 'lucide-react';
import { POSStaffSelector } from './POSStaffSelector';
import { TableMap } from './TableMap';
import { POSPayment } from './POSPayment';
import { CashClosingModal } from './CashClosingModal';
import { Toast } from './Toast';
import { POSOrderLookup } from './POSOrderLookup';
import { saveCartToSupabase, loadCartFromSupabase, abandonCart, abandonCurrentCartSession, loadOrderToCart } from '@/lib/pos-cart-sync';
import { calculateCashClosingStats, saveCashClosing, CashClosingStats } from '@/lib/cash-closing';
import { getCurrencyByCountry, formatPriceWithCurrency } from '@/lib/currency';
import { printCashClosingReceipt, printKitchenTicket, printReceipt, savePrinterLog, openCashDrawer } from '@/lib/pos-printer';
import { countPendingPOSOrders, isNetworkPaymentError, saveOfflinePOSOrder, syncOfflinePOSOrders } from '@/lib/offline/pos-sync';
import { useWakeLock } from '@/lib/hooks/useWakeLock';

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
  notes?: string;
}

interface Category {
  id: string;
  name: string;
}

interface DeliveryZone {
  id: string;
  name: string;
  fee: number;
  min_order?: number;
}

type POSMode = 'simple' | 'table';
type PaymentMethod = 'cash' | 'stripe';

function getLoggedStaffFromBrowser(tenantId: string) {
  if (typeof window === 'undefined') return { staffId: null as string | null, staffName: '' };
  const storedTenant = sessionStorage.getItem('staff_tenant');
  if (storedTenant !== tenantId) return { staffId: null, staffName: '' };
  return {
    staffId: sessionStorage.getItem('staff_id'),
    staffName: sessionStorage.getItem('staff_name') || '',
  };
}

interface IncomingOrder {
  id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  delivery_type: 'delivery' | 'pickup';
  delivery_address?: string;
  delivery_fee?: number | null;
  total: number;
  status: string;
  payment_status?: string | null;
  payment_method?: string | null;
  notes?: string | null;
  items: { menu_item_id?: string | null; item_id?: string | null; id?: string | null; name: string; qty?: number; quantity?: number; price: number }[];
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
  items: { name: string; qty?: number; quantity?: number; price: number; item_id?: string }[];
}

interface TableGroup {
  tableNumber: number;
  orders: DineInOrder[];
  totalAmount: number;
  itemCount: number;
  waiters: string[];
  oldestOrder: DineInOrder;
  allItems: { name: string; qty?: number; quantity?: number; price: number; item_id?: string }[];
}

interface RestaurantTable {
  id: string;
  table_number: number;
  seats: number;
  location?: string;
}

interface ReservationSummary {
  id: string;
  customer_name: string;
  party_size: number;
  reservation_time: string;
  status: string;
}

function getOrderItemQty(item: { qty?: number; quantity?: number }) {
  return Number(item.qty ?? item.quantity ?? 1);
}

function getOrderItemsTotal(items: Array<{ price: number; qty?: number; quantity?: number }> = []) {
  return items.reduce((sum, item) => sum + Number(item.price || 0) * getOrderItemQty(item), 0);
}

function isOnlinePaymentMethod(paymentMethod?: string | null) {
  const method = String(paymentMethod || '').toLowerCase();
  return ['wompi', 'stripe', 'online', 'card'].includes(method);
}

function shouldShowIncomingOrder(
  order: Pick<IncomingOrder, 'delivery_type' | 'status' | 'payment_status' | 'payment_method'>,
  options?: { kdsEnabled?: boolean }
) {
  const isStoreOrder = order.delivery_type === 'delivery' || order.delivery_type === 'pickup';
  if (!isStoreOrder) return false;
  if (order.status === 'delivered' || order.status === 'cancelled') return false;
  if (options?.kdsEnabled === false && ['preparing', 'ready', 'on_the_way'].includes(order.status)) return false;
  if (isOnlinePaymentMethod(order.payment_method)) return order.payment_status === 'paid';
  return true;
}

async function fetchPendingCashClosingStats(tenantId: string): Promise<CashClosingStats | null> {
  const response = await fetch(`/api/pos/cash-closing/pending?tenantId=${encodeURIComponent(tenantId)}`, {
    cache: 'no-store',
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || 'No se pudo consultar el cierre pendiente');
  }

  const payload = await response.json();
  return payload.stats || null;
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

// ─── Table Group Card ─────────────────────────────────────────────────────────
function TableGroupCard({
  group,
  onBillTable,
  onPrintKitchen,
  onVoidItem,
  expanded,
  onToggleExpand,
  currencyInfo,
}: {
  group: TableGroup;
  onBillTable: (orders: DineInOrder[]) => void;
  onPrintKitchen: (orders: DineInOrder[]) => void;
  onVoidItem: (orderId: string, itemIndex: number) => void;
  expanded: boolean;
  onToggleExpand: () => void;
  currencyInfo: { code: string; locale: string };
}) {
  const minutes = useElapsedMinutes(group.oldestOrder.created_at);

  return (
    <div className={`pos-card border-2 ${getUrgencyBorder(minutes)} rounded-xl overflow-hidden transition-all duration-200`}>
      <div className="p-3 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="bg-cyan-300/12 border border-cyan-300/35 rounded-xl w-11 h-11 flex items-center justify-center shrink-0">
            <span className="text-cyan-200 font-black text-base">{group.tableNumber}</span>
          </div>
          <div>
            <p className="text-white font-bold text-sm">Mesa {group.tableNumber}</p>
            <p className="text-gray-400 text-xs">
              {group.orders.length} ronda{group.orders.length > 1 ? 's' : ''} · {group.itemCount} items
            </p>
            {group.waiters.length > 0 && (
              <p className="text-gray-500 text-xs truncate max-w-[110px]">{group.waiters.join(', ')}</p>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className={`text-xs font-bold ${getTimerColor(minutes)} flex items-center gap-0.5`}>
            <Clock className="w-3 h-3" />
            {minutes}m
          </span>
          <span className="text-emerald-400 font-black text-sm">
            {formatPriceWithCurrency(group.totalAmount, currencyInfo.code, currencyInfo.locale)}
          </span>
        </div>
      </div>

      <button
        onClick={onToggleExpand}
        className="w-full px-3 pb-2 flex items-center gap-1 text-gray-500 hover:text-gray-300 text-xs transition-colors"
      >
        <span>{expanded ? '▲' : '▼'}</span>
        <span>{expanded ? 'Ocultar' : 'Ver'} items</span>
      </button>

      {expanded && (
        <div className="mx-3 mb-2 bg-black/24 rounded-lg p-1.5 max-h-36 overflow-y-auto space-y-0.5">
          {group.orders.map(order =>
            (order.items || []).map((item, itemIdx) => (
              <div key={`${order.id}-${itemIdx}`} className="flex items-center justify-between text-xs gap-1 group/row hover:bg-gray-800/60 rounded px-1 py-0.5">
                <span className="text-gray-300 flex-1 truncate">{getOrderItemQty(item)}× {item.name}</span>
                <span className="text-gray-500 shrink-0">
                  {formatPriceWithCurrency(item.price * getOrderItemQty(item), currencyInfo.code, currencyInfo.locale)}
                </span>
                <button
                  onClick={() => onVoidItem(order.id, itemIdx)}
                  className="opacity-0 group-hover/row:opacity-100 text-red-400 hover:text-red-300 transition-opacity ml-1 shrink-0"
                  title="Anular ítem"
                >
                  ✕
                </button>
              </div>
            ))
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 p-2 pt-0">
        <button
          onClick={() => onPrintKitchen(group.orders)}
          className="py-2.5 bg-amber-500/18 hover:bg-amber-500/28 active:scale-95 text-amber-100 border border-amber-400/30 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5"
        >
          <Printer className="w-3.5 h-3.5" />
          Cocina
        </button>
        <button
          onClick={() => onBillTable(group.orders)}
          className="py-2.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-900/30"
        >
          <DollarSign className="w-3.5 h-3.5" />
          Cobrar Mesa {group.tableNumber}
        </button>
      </div>
    </div>
  );
}

// ─── Incoming Order Status Badge ────────────────────────────────────────────
const ORDER_STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  pending:    { label: 'Pendiente',  cls: 'bg-gray-700 text-gray-300' },
  confirmed:  { label: 'Confirmado', cls: 'bg-blue-600/60 text-blue-200' },
  preparing:  { label: 'Preparando', cls: 'bg-orange-600/60 text-orange-200' },
  ready:      { label: 'Listo ✓',   cls: 'bg-green-600/60 text-green-200' },
  on_the_way: { label: 'En camino', cls: 'bg-purple-600/60 text-purple-200' },
  delivered:  { label: 'Entregado', cls: 'bg-gray-600/60 text-gray-400' },
};

// ─── Incoming Order Card ──────────────────────────────────────────────────────
function IncomingOrderCard({
  order,
  onUpdateStatus,
  onLoadForPayment,
  onPrintReceipt,
  onClearFromIncoming,
  onCancelOrder,
  cancelling,
  clearing,
  printing,
  kdsEnabled,
  currencyInfo,
}: {
  order: IncomingOrder;
  onUpdateStatus: (orderId: string, status: string) => Promise<void>;
  onLoadForPayment?: (order: IncomingOrder) => Promise<void>;
  onPrintReceipt?: (order: IncomingOrder) => Promise<void>;
  onClearFromIncoming?: (order: IncomingOrder) => Promise<void>;
  onCancelOrder?: (order: IncomingOrder) => Promise<void>;
  cancelling?: boolean;
  clearing?: boolean;
  printing?: boolean;
  kdsEnabled: boolean;
  currencyInfo: ReturnType<typeof getCurrencyByCountry>;
}) {
  const minutes = useElapsedMinutes(order.created_at);
  const isDelivery = order.delivery_type === 'delivery';
  const statusBadge = ORDER_STATUS_BADGE[order.status] ?? ORDER_STATUS_BADGE.pending;
  const isDone = order.status === 'delivered';
  const isOnlinePayment = isOnlinePaymentMethod(order.payment_method);
  const isPaid = order.payment_status === 'paid';
  const [updating, setUpdating] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleAction(newStatus: string) {
    setUpdating(true);
    await onUpdateStatus(order.id, newStatus);
    setUpdating(false);
  }

  async function handleLoadForPayment() {
    if (!onLoadForPayment) return;
    setLoading(true);
    try {
      await onLoadForPayment(order);
    } finally {
      setLoading(false);
    }
  }

  async function handlePrintReceipt() {
    if (!onPrintReceipt) return;
    await onPrintReceipt(order);
  }

  async function handleClearFromIncoming() {
    if (!onClearFromIncoming) return;
    await onClearFromIncoming(order);
  }

  async function handleCancelOrder() {
    if (!onCancelOrder) return;
    await onCancelOrder(order);
  }

  // Determine action button based on status + type
  let actionBtn: { label: string; status: string; cls: string } | null = null;
  if (isDelivery && order.status === 'ready') {
    actionBtn = { label: '🚗 Despachar', status: 'on_the_way', cls: 'bg-purple-600 hover:bg-purple-700' };
  } else if (isDelivery && order.status === 'on_the_way') {
    actionBtn = { label: '✅ Entregado', status: 'delivered', cls: 'bg-green-600 hover:bg-green-700' };
  } else if (!isDelivery && order.status === 'ready') {
    actionBtn = { label: '✅ Recogido', status: 'delivered', cls: 'bg-green-600 hover:bg-green-700' };
  }

  const showPaymentButton = order.status === 'pending' && !isOnlinePayment && !isPaid;
  const showKitchenTimer = kdsEnabled;

  return (
    <div className={`pos-card border-2 rounded-xl p-3 flex flex-col gap-2 transition-all ${isDone ? 'border-white/10 opacity-60' : showKitchenTimer ? getUrgencyBorder(minutes) : 'border-amber-400/25'} text-xs`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-black text-white text-sm">{order.order_number}</p>
          <p className="text-muted-foreground text-xs truncate">{order.customer_name}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusBadge.cls}`}>
            {statusBadge.label}
          </span>
          {showKitchenTimer ? (
            <div className={`flex items-center gap-1 font-bold ${getTimerColor(minutes)}`}>
              <Clock className="w-3 h-3" />
              <span>{minutes}m</span>
            </div>
          ) : (
            <div className="rounded-full border border-amber-400/25 bg-amber-400/10 px-2 py-0.5 text-[10px] font-bold text-amber-100">
              Manual
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 text-muted-foreground">
        {isDelivery ? (
          <>
            <Truck className="w-3 h-3 text-blue-400" />
            <span className="text-xs">A domicilio</span>
          </>
        ) : (
          <>
            <Store className="w-3 h-3 text-green-400" />
            <span className="text-xs">Para recoger</span>
          </>
        )}
      </div>

      {isDelivery && order.delivery_address && (
        <p className="text-muted-foreground text-xs truncate">📍 {order.delivery_address}</p>
      )}

      {order.notes && (
        <div className="rounded-lg border border-amber-400/25 bg-amber-400/10 px-3 py-2 text-xs font-bold leading-5 text-amber-100 whitespace-pre-line">
          {order.notes}
        </div>
      )}

      {order.items && order.items.length > 0 && (
        <div className="border-t border-gray-700 pt-2 space-y-0.5">
          {order.items.slice(0, 4).map((item, i) => (
            <p key={i} className="text-gray-300 text-xs">
              {(item.qty ?? item.quantity ?? 1)}× {item.name}
            </p>
          ))}
          {order.items.length > 4 && (
            <p className="text-muted-foreground text-xs">+{order.items.length - 4} más</p>
          )}
        </div>
      )}

      <div className="flex items-center justify-between text-muted-foreground">
        <a href={`tel:${order.customer_phone}`} className="text-xs text-blue-400 hover:underline">
          {order.customer_phone}
        </a>
        <span className="font-bold text-green-400">{formatPriceWithCurrency(order.total, currencyInfo.code, currencyInfo.locale)}</span>
      </div>

      {isOnlinePayment && (
        <div className={`w-full rounded-lg border px-3 py-2 text-center text-xs font-bold ${
          isPaid
            ? 'border-emerald-400/35 bg-emerald-500/15 text-emerald-100'
            : 'border-amber-400/35 bg-amber-500/15 text-amber-100'
        }`}>
          {isPaid ? 'Pago Wompi confirmado' : 'Pago Wompi en verificacion'}
        </div>
      )}

      {showPaymentButton && (
        <button
          onClick={handleLoadForPayment}
          disabled={loading}
          className="w-full py-2 rounded-lg bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-bold text-xs transition-all active:scale-95"
        >
          {loading ? '...' : '💳 Cargar para cobrar'}
        </button>
      )}

      {isPaid && (
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handlePrintReceipt}
            disabled={printing || clearing}
            className="py-2 rounded-lg bg-amber-500/18 hover:bg-amber-500/28 border border-amber-400/30 disabled:opacity-50 text-amber-100 font-bold text-xs transition-all active:scale-95 flex items-center justify-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5" />
            {printing ? '...' : 'Imprimir'}
          </button>
          <button
            onClick={handleClearFromIncoming}
            disabled={printing || clearing}
            className="py-2 rounded-lg bg-blue-500/18 hover:bg-blue-500/28 border border-blue-400/30 disabled:opacity-50 text-blue-100 font-bold text-xs transition-all active:scale-95"
          >
            {clearing ? '...' : 'Preparar'}
          </button>
        </div>
      )}

      {onCancelOrder && !isDone && (
        <button
          onClick={handleCancelOrder}
          disabled={cancelling}
          className="w-full py-2 rounded-lg bg-red-500/15 hover:bg-red-500/25 border border-red-400/30 disabled:opacity-50 text-red-100 font-bold text-xs transition-all active:scale-95"
        >
          {cancelling ? 'Anulando...' : 'Anular ticket'}
        </button>
      )}

      {actionBtn && (
        <button
          onClick={() => handleAction(actionBtn!.status)}
          disabled={updating}
          className={`w-full py-2 rounded-lg text-white font-bold text-xs transition-all active:scale-95 disabled:opacity-50 ${actionBtn.cls}`}
        >
          {updating ? '...' : actionBtn.label}
        </button>
      )}
    </div>
  );
}

export function POSTerminal({
  tenantId,
  tenantSlug,
  country = 'CO',
}: {
  tenantId: string;
  tenantSlug?: string;
  country?: string;
}) {
  const currencyInfo = getCurrencyByCountry(country);

  // Initialize Supabase client once inside component for proper type compatibility
  const supabase = useMemo(() => createClient(), []);

  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [discountCode, setDiscountCode] = useState('');
  const [discount, setDiscount] = useState(0);
  const [taxRate, setTaxRate] = useState(0);
  const [deliveryEnabled, setDeliveryEnabled] = useState(false);
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [deliveryZones, setDeliveryZones] = useState<DeliveryZone[]>([]);
  const [selectedDeliveryZoneId, setSelectedDeliveryZoneId] = useState('');
  const [kdsEnabled, setKdsEnabled] = useState(true);
  const [restaurantName, setRestaurantName] = useState('Restaurante');
  const [restaurantPhone, setRestaurantPhone] = useState<string | null>(null);
  const [restaurantLogo, setRestaurantLogo] = useState<string | undefined>();

  // Nuevas características - Modo y selecciones
  const [posMode, setPosMode] = useState<POSMode>('simple');
  const [posOrderType, setPosOrderType] = useState<'takeaway' | 'pickup' | 'delivery'>('takeaway');
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [selectedStaffName, setSelectedStaffName] = useState<string>('');
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [selectedTableNumber, setSelectedTableNumber] = useState<number | null>(null);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [offlinePendingCount, setOfflinePendingCount] = useState(0);
  const [syncingOffline, setSyncingOffline] = useState(false);

  // Receipt state
  const [pendingPaymentData, setPendingPaymentData] = useState<{
    amountPaid?: number;
  } | null>(null);
  const [paymentResetKey, setPaymentResetKey] = useState(0);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const posRootRef = useRef<HTMLDivElement>(null);
  const { wakeLockActive, wakeLockSupported, activateWakeLock } = useWakeLock();
  const [showCashClosing, setShowCashClosing] = useState(false);
  const [cashClosingStats, setCashClosingStats] = useState<CashClosingStats | null>(null);
  const [pendingCashClosingStats, setPendingCashClosingStats] = useState<CashClosingStats | null>(null);
  const [closingLoading, setClosingLoading] = useState(false);
  const [todayReservations, setTodayReservations] = useState<ReservationSummary[]>([]);

  // Incoming Orders for delivery/pickup
  const [incomingOrders, setIncomingOrders] = useState<IncomingOrder[]>([]);
  const [showIncomingPanel, setShowIncomingPanel] = useState(false);
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);
  const [printingIncomingOrderId, setPrintingIncomingOrderId] = useState<string | null>(null);
  const [clearingIncomingOrderId, setClearingIncomingOrderId] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  // Dine-in orders from comandero
  const [dineInOrders, setDineInOrders] = useState<DineInOrder[]>([]);
  const [showDineInPanel, setShowDineInPanel] = useState(false);
  // Find & Pay mode
  const [showFindPayPanel, setShowFindPayPanel] = useState(false);
  const [loadedOrderId, setLoadedOrderId] = useState<string | null>(null);
  const [loadedOrderIds, setLoadedOrderIds] = useState<string[]>([]);
  const [billingOrderIds, setBillingOrderIds] = useState<string[]>([]);
  const [expandedTable, setExpandedTable] = useState<number | null>(null);
  const [tip, setTip] = useState(0);
  const [mesasView, setMesasView] = useState<'list' | 'map'>('map');
  const [allTables, setAllTables] = useState<RestaurantTable[]>([]);
  const [orderNotification, setOrderNotification] = useState<{
    tableNumber: number | null;
    waiter: string | null;
    items: string[];
  } | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const knownOrderIds = useRef(new Set<string>());
  const knownDineInOrderIds = useRef(new Set<string>());
  const firstDineInFetchDone = useRef(false);
  const notificationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const csrfTokenRef = useRef<string>('');
  const cartRestoredRef = useRef(false);
  const previousCartLengthRef = useRef(0);

  useEffect(() => {
    const loggedStaff = getLoggedStaffFromBrowser(tenantId);
    if (loggedStaff.staffId && !selectedStaffId) setSelectedStaffId(loggedStaff.staffId);
    if (loggedStaff.staffName && !selectedStaffName) setSelectedStaffName(loggedStaff.staffName);
  }, [tenantId, selectedStaffId, selectedStaffName]);

  const refreshPendingCashClosing = useCallback(async () => {
    try {
      setPendingCashClosingStats(await fetchPendingCashClosingStats(tenantId));
    } catch (error) {
      console.error('Error checking pending cash closing:', error);
    }
  }, [tenantId]);

  const refreshOfflinePendingCount = useCallback(async () => {
    try {
      setOfflinePendingCount(await countPendingPOSOrders(tenantId));
    } catch (error) {
      console.error('Error counting offline POS orders:', error);
    }
  }, [tenantId]);

  const refreshTodayReservations = useCallback(async () => {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const { data, error } = await supabase
        .from('reservations')
        .select('id, customer_name, party_size, reservation_time, status')
        .eq('tenant_id', tenantId)
        .eq('reservation_date', today)
        .in('status', ['pending', 'confirmed'])
        .order('reservation_time', { ascending: true });

      if (error) throw error;
      setTodayReservations((data || []) as ReservationSummary[]);
    } catch (error) {
      console.error('Error checking POS reservations:', error);
      setTodayReservations([]);
    }
  }, [supabase, tenantId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      refreshPendingCashClosing();
    }, 5000);
    return () => window.clearTimeout(timer);
  }, [refreshPendingCashClosing]);

  useEffect(() => {
    if (!deliveryEnabled && posOrderType === 'delivery') {
      setPosOrderType('takeaway');
    }
  }, [deliveryEnabled, posOrderType]);

  useEffect(() => {
    if (posOrderType === 'delivery' && deliveryZones.length > 0 && !selectedDeliveryZoneId) {
      setSelectedDeliveryZoneId(deliveryZones[0].id);
    }
  }, [deliveryZones, posOrderType, selectedDeliveryZoneId]);

  const syncOfflineSales = useCallback(async (showToast = false) => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;

    setSyncingOffline(true);
    try {
      if (!csrfTokenRef.current) {
        const csrfResponse = await fetch('/api/csrf-token', { credentials: 'include' }).catch(() => null);
        const csrfData = csrfResponse ? await csrfResponse.json().catch(() => null) : null;
        if (csrfData?.token) csrfTokenRef.current = csrfData.token;
      }

      const result = await syncOfflinePOSOrders(tenantId, csrfTokenRef.current);
      setOfflinePendingCount(result.remaining);

      if (showToast && result.synced > 0) {
        setToast({
          message: `${result.synced} venta${result.synced > 1 ? 's' : ''} offline sincronizada${result.synced > 1 ? 's' : ''}`,
          type: result.errors.length > 0 ? 'error' : 'success',
        });
      }
    } catch (error) {
      console.error('Error syncing offline sales:', error);
      if (showToast) {
        setToast({
          message: 'No se pudieron sincronizar las ventas offline todavia',
          type: 'error',
        });
      }
    } finally {
      setSyncingOffline(false);
    }
  }, [tenantId]);

  // Initialize audio — called on first user interaction to satisfy autoplay policy
  const initAudio = useCallback(() => {
    if (!audioCtxRef.current) {
      try {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      } catch (_) {}
    }
  }, []);

  const playNewOrderSound = useCallback(async () => {
    if (!soundEnabled) return;
    initAudio();
    const ctx = audioCtxRef.current;
    if (!ctx) return;

    // Resume suspended context (browser autoplay policy blocks audio until first interaction)
    if (ctx.state === 'suspended') {
      try { await ctx.resume(); } catch (_) { return; }
    }

    const tone = (start: number, freq: number, dur: number, vol = 0.5) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = 'sine';
      gain.gain.setValueAtTime(vol, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + dur);
      osc.start(start);
      osc.stop(start + dur);
    };

    // 3-tone chime: low → mid → high, clearly audible
    const t = ctx.currentTime;
    tone(t,        660, 0.3);
    tone(t + 0.32, 880, 0.3);
    tone(t + 0.64, 1100, 0.4);
  }, [soundEnabled, initAudio]);

  useEffect(() => {
    fetch('/api/csrf-token').then(r => r.json()).then(d => { if (d.token) csrfTokenRef.current = d.token; }).catch(() => {});
    fetchMenuData();
    restoreCart();
    refreshOfflinePendingCount();
    refreshTodayReservations();
  }, [tenantId, refreshOfflinePendingCount, refreshTodayReservations]);

  useEffect(() => {
    const interval = window.setInterval(refreshTodayReservations, 60000);
    return () => window.clearInterval(interval);
  }, [refreshTodayReservations]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateOnlineState = () => setIsOnline(navigator.onLine);
    const handleOnline = () => {
      updateOnlineState();
      syncOfflineSales(true);
    };

    updateOnlineState();
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', updateOnlineState);
    syncOfflineSales(false);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', updateOnlineState);
    };
  }, [syncOfflineSales]);

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isNowFullscreen = !!document.fullscreenElement;
      setIsFullscreen(isNowFullscreen);
      if (isNowFullscreen && document.fullscreenElement === posRootRef.current) {
        document.documentElement.setAttribute('data-pos-fullscreen', 'true');
      } else {
        document.documentElement.removeAttribute('data-pos-fullscreen');
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.documentElement.removeAttribute('data-pos-fullscreen');
    };
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
      if (!isFullscreen && posRootRef.current?.requestFullscreen) {
        await posRootRef.current.requestFullscreen();
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
      const loggedStaff = getLoggedStaffFromBrowser(tenantId);
      if (loggedStaff.staffId && !selectedStaffId) setSelectedStaffId(loggedStaff.staffId);
      if (loggedStaff.staffName && !selectedStaffName) setSelectedStaffName(loggedStaff.staffName);
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

  async function handleOpenPendingCashClosing() {
    setClosingLoading(true);
    try {
      const loggedStaff = getLoggedStaffFromBrowser(tenantId);
      if (loggedStaff.staffId && !selectedStaffId) setSelectedStaffId(loggedStaff.staffId);
      if (loggedStaff.staffName && !selectedStaffName) setSelectedStaffName(loggedStaff.staffName);
      const stats = pendingCashClosingStats || await fetchPendingCashClosingStats(tenantId);

      if (!stats) {
        setToast({ message: 'No hay cierres pendientes anteriores', type: 'success' });
        setPendingCashClosingStats(null);
        return;
      }

      setCashClosingStats(stats);
      setShowCashClosing(true);
    } catch (error) {
      console.error('Error opening pending closing stats:', error);
      setToast({ message: 'Error al cargar el cierre pendiente', type: 'error' });
    } finally {
      setClosingLoading(false);
    }
  }

  async function handleSaveCashClosing(actualCash: number, notes: string) {
    if (!cashClosingStats) return;

    try {
      const loggedStaff = getLoggedStaffFromBrowser(tenantId);
      const closingStaffId = selectedStaffId || loggedStaff.staffId;
      const closingStaffName = selectedStaffName || loggedStaff.staffName || 'Sin asignar';

      const closing = await saveCashClosing(tenantId, closingStaffId, closingStaffName, {
        ...cashClosingStats,
        actualCashCount: actualCash,
        notes,
      });

      setToast({ message: '✓ Caja cerrada exitosamente', type: 'success' });
      setShowCashClosing(false);
      setCashClosingStats(null);
      await refreshPendingCashClosing();

      void (async () => {
        try {
          const { data: settings, error } = await supabase
            .from('restaurant_settings')
            .select('default_receipt_printer_id, display_name, phone')
            .eq('tenant_id', tenantId)
            .maybeSingle();

          if (error) throw new Error(error.message);
          if (!settings?.default_receipt_printer_id) {
            setToast({ message: 'Cierre guardado. No hay impresora de recibos configurada.', type: 'error' });
            return;
          }

          await printCashClosingReceipt(tenantId, settings.default_receipt_printer_id, {
            closingId: closing?.id,
            restaurantName: settings.display_name || restaurantName,
            restaurantPhone: settings.phone || restaurantPhone,
            staffName: closingStaffName,
            closedAt: closing?.closed_at || new Date().toISOString(),
            periodStart: cashClosingStats.periodStart,
            periodEnd: cashClosingStats.periodEnd,
            cashSales: cashClosingStats.cashSales,
            cardSales: cashClosingStats.cardSales,
            otherSales: cashClosingStats.otherSales,
            totalSales: cashClosingStats.totalSales,
            totalTax: cashClosingStats.totalTax,
            totalDiscount: cashClosingStats.totalDiscount,
            expectedCash: cashClosingStats.cashSales,
            actualCash,
            difference: cashClosingStats.cashSales - actualCash,
            transactionCount: cashClosingStats.transactionCount,
            ordersCompleted: cashClosingStats.ordersCompleted,
            ordersCancelled: cashClosingStats.ordersCancelled,
            notes,
            currencyInfo,
          });
          setToast({ message: 'Cierre guardado e impreso', type: 'success' });
        } catch (printError) {
          setToast({
            message: `Cierre guardado. No se pudo imprimir: ${printError instanceof Error ? printError.message : String(printError)}`,
            type: 'error',
          });
        }
      })();

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

  async function handleOrderSelected(order: any) {
    try {
      // Convert order items to cart items
      const cartItems = (order.items || []).map((item: any, index: number) => ({
        menu_item_id: item.menu_item_id || item.item_id || item.id || `order-item-${order.id}-${index}`,
        name: item.name,
        price: item.price,
        quantity: item.qty || item.quantity || 1,
      }));

      setCart(cartItems);
      setLoadedOrderId(order.id);
      setPaymentMethod('cash');
      setPosMode('simple');
      setDiscount(0);
      setDiscountCode('');
      setTip(0);

      // Hide Find & Pay and Incoming panels; the built-in right cart panel stays visible.
      setShowFindPayPanel(false);
      setShowIncomingPanel(false);

      setToast({
        message: `Pedido ${order.order_number} cargado - Procede al pago`,
        type: 'success'
      });
    } catch (error) {
      console.error('Error loading order:', error);
      setToast({ message: 'Error al cargar el pedido', type: 'error' });
    }
  }

  async function cancelIncomingOrder(orderId: string, orderNumber?: string) {
    const label = orderNumber || 'este ticket';
    const confirmed = window.confirm(
      `Anular ${label}?\n\nEl ticket quedara registrado como anulado para auditoria, pero saldra de pendientes y no contara como venta cobrada.`
    );
    if (!confirmed) return;

    try {
      setCancellingOrderId(orderId);
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          tenantId,
          status: 'cancelled',
          cancel_reason: selectedStaffName ? `Anulado desde TPV por ${selectedStaffName}` : 'Anulado desde TPV',
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'No se pudo anular el ticket');
      }

      setIncomingOrders((orders) => orders.filter((order) => order.id !== orderId));
      if (loadedOrderId === orderId) {
        setLoadedOrderId(null);
        setCart([]);
        setDiscount(0);
        setDiscountCode('');
        setTip(0);
      }
      await fetchIncomingOrders();
      setToast({ message: `${label} anulado y guardado en historial`, type: 'success' });
    } catch (error) {
      console.error('Error cancelling incoming order:', error);
      setToast({
        message: error instanceof Error ? error.message : 'Error al anular el ticket',
        type: 'error',
      });
    } finally {
      setCancellingOrderId(null);
    }
  }

  async function voidCompletedSale(order: any): Promise<boolean> {
    const label = order.order_number || 'esta venta';
    const reason = window.prompt(`Motivo para anular ${label}:`);

    if (reason === null) return false;
    if (!reason.trim()) {
      setToast({ message: 'Debes escribir un motivo para anular la venta', type: 'error' });
      return false;
    }

    const confirmed = window.confirm(
      `Anular ${label}?\n\nLa venta quedara registrada como anulada y no contara en el cierre de caja.`
    );
    if (!confirmed) return false;

    const response = await fetch(`/api/orders/${order.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        tenantId,
        status: 'cancelled',
        cancel_reason: selectedStaffName
          ? `Venta anulada desde TPV por ${selectedStaffName}: ${reason.trim()}`
          : `Venta anulada desde TPV: ${reason.trim()}`,
      }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || 'No se pudo anular la venta');
    }

    if (loadedOrderId === order.id) {
      setLoadedOrderId(null);
      setCart([]);
      setDiscount(0);
      setDiscountCode('');
      setTip(0);
    }
    await fetchIncomingOrders();
    setToast({ message: `${label} anulado. No contara en el cierre de caja.`, type: 'success' });
    return true;
  }

  async function restoreCart() {
    try {
      if (typeof window !== 'undefined') {
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

      const supabaseCart = await loadCartFromSupabase(tenantId, supabase);
      if (!supabaseCart) return;

      setCart(supabaseCart.items);
      setDiscount(supabaseCart.discount);
      setDiscountCode(supabaseCart.discountCode);
      setPaymentMethod(supabaseCart.paymentMethod);
      setPosMode(supabaseCart.posMode);
      const loggedStaff = getLoggedStaffFromBrowser(tenantId);
      setSelectedStaffId(loggedStaff.staffId || supabaseCart.selectedStaffId);
      setSelectedStaffName(loggedStaff.staffName || supabaseCart.selectedStaffName);
      setSelectedTableId(supabaseCart.selectedTableId);
      setSelectedTableNumber(supabaseCart.selectedTableNumber);
      if (supabaseCart.loadedOrderId) {
        setLoadedOrderId(supabaseCart.loadedOrderId);
      }
    } finally {
      cartRestoredRef.current = true;
    }
  }

  // Save cart to localStorage AND Supabase whenever it changes
  useEffect(() => {
    if (!cartRestoredRef.current) {
      previousCartLengthRef.current = cart.length;
      return;
    }

    if (typeof window !== 'undefined') {
      // Save to localStorage (quick)
      if (cart.length > 0) {
        localStorage.setItem(`pos-cart-${tenantId}`, JSON.stringify(cart));
        localStorage.setItem(`pos-discount-${tenantId}`, discount.toString());
        localStorage.setItem(`pos-discount-code-${tenantId}`, discountCode);
      } else {
        localStorage.removeItem(`pos-cart-${tenantId}`);
        localStorage.removeItem(`pos-discount-${tenantId}`);
        localStorage.removeItem(`pos-discount-code-${tenantId}`);
      }
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
        tip,
        taxRate,
      };

      saveCartToSupabase(tenantId, cartData, supabase).catch((err) => {
        console.error('Background cart sync failed (will use localStorage):', err);
      });
    } else if (tenantId && previousCartLengthRef.current > 0) {
      abandonCurrentCartSession(tenantId, supabase).catch((err) => {
        console.error('Background cart cleanup failed:', err);
      });
    }
    previousCartLengthRef.current = cart.length;
  }, [cart, discount, discountCode, tip, tenantId, taxRate]);

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
          const newOrder = payload.new as any;
          if (newOrder.delivery_type === 'delivery' || newOrder.delivery_type === 'pickup') {
            if (!shouldShowIncomingOrder(newOrder, { kdsEnabled })) return;
            const isNewOrder = !knownOrderIds.current.has(newOrder.id);
            if (isNewOrder) {
              playNewOrderSound();
              knownOrderIds.current.add(newOrder.id);
              setShowIncomingPanel(true);
              await fetchIncomingOrders();
            }
          } else if (newOrder.delivery_type === 'dine-in') {
            await fetchDineInOrders({ notify: false });
            playNewOrderSound();
            setShowDineInPanel(true);
            const items: any[] = newOrder.items || [];
            setOrderNotification({
              tableNumber: newOrder.table_number ?? null,
              waiter: newOrder.waiter_name ?? null,
              items: items.map((i: any) => `${i.qty ?? i.quantity ?? 1}× ${i.name}`),
            });
            if (notificationTimerRef.current) clearTimeout(notificationTimerRef.current);
            notificationTimerRef.current = setTimeout(() => setOrderNotification(null), 6000);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `tenant_id=eq.${tenantId}`,
        },
        async (payload) => {
          const updated = payload.new as any;
          if (updated.delivery_type === 'delivery' || updated.delivery_type === 'pickup') {
            const shouldShow = shouldShowIncomingOrder(updated, { kdsEnabled });
            const isNewOrder = shouldShow && !knownOrderIds.current.has(updated.id);
            await fetchIncomingOrders();
            if (isNewOrder) {
              playNewOrderSound();
              knownOrderIds.current.add(updated.id);
              setShowIncomingPanel(true);
            }
          }
        }
      )
      .subscribe();

    // Initial fetch
    fetchIncomingOrders();
    fetchDineInOrders({ notify: false });

    const polling = window.setInterval(() => {
      fetchIncomingOrders();
      fetchDineInOrders({ notify: true });
    }, 5000);

    const refreshWhenVisible = () => {
      if (document.visibilityState !== 'visible') return;
      fetchIncomingOrders();
      fetchDineInOrders({ notify: true });
    };
    document.addEventListener('visibilitychange', refreshWhenVisible);
    window.addEventListener('focus', refreshWhenVisible);

    return () => {
      window.clearInterval(polling);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
      window.removeEventListener('focus', refreshWhenVisible);
      subscription.unsubscribe();
    };
  }, [tenantId, playNewOrderSound, kdsEnabled]);

  async function fetchIncomingOrders() {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('id, order_number, customer_name, customer_phone, delivery_type, delivery_address, delivery_fee, total, status, payment_status, payment_method, notes, items, created_at')
        .eq('tenant_id', tenantId)
        .or(`delivery_type.eq.delivery,delivery_type.eq.pickup`)
        .not('status', 'in', '("delivered","cancelled")')
        .order('created_at', { ascending: false })
        .limit(50);

      if (!error && data) {
        const mapped = data.map((o: any) => ({
          ...o,
          items: Array.isArray(o.items) ? o.items : [],
        })).filter((order: IncomingOrder) => shouldShowIncomingOrder(order, { kdsEnabled }));
        setIncomingOrders(mapped);
        mapped.forEach((order: IncomingOrder) => knownOrderIds.current.add(order.id));
      }
    } catch (error) {
      console.error('Error fetching incoming orders:', error);
    }
  }

  async function fetchAllTables() {
    const { data } = await supabase
      .from('tables')
      .select('id, table_number, seats, location')
      .eq('tenant_id', tenantId)
      .order('table_number', { ascending: true });
    if (data) setAllTables(data as RestaurantTable[]);
  }

  async function fetchDineInOrders(options: { notify?: boolean } = {}) {
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
        const mapped = data as DineInOrder[];
        const newOrders = mapped.filter((order) => !knownDineInOrderIds.current.has(order.id));

        setDineInOrders(mapped);
        mapped.forEach((order) => knownDineInOrderIds.current.add(order.id));

        if (options.notify && firstDineInFetchDone.current && newOrders.length > 0) {
          const latest = newOrders[0];
          playNewOrderSound();
          setShowDineInPanel(true);
          setOrderNotification({
            tableNumber: latest.table_number ?? null,
            waiter: latest.waiter_name ?? null,
            items: (latest.items || []).map((item: any) => `${item.qty ?? item.quantity ?? 1}× ${item.name}`),
          });
          if (notificationTimerRef.current) clearTimeout(notificationTimerRef.current);
          notificationTimerRef.current = setTimeout(() => setOrderNotification(null), 6000);
        }

        firstDineInFetchDone.current = true;
      }
    } catch (error) {
      console.error('Error fetching dine-in orders:', error);
    }
  }

  async function printDineInKitchenTicket(tableOrders: DineInOrder[]) {
    if (!tableOrders.length) return;

    try {
      const { data: settings, error } = await supabase
        .from('restaurant_settings')
        .select('default_receipt_printer_id, kitchen_printer_id, display_name')
        .eq('tenant_id', tenantId)
        .maybeSingle();

      if (error) throw new Error(error.message);

      const printerId = settings?.kitchen_printer_id || settings?.default_receipt_printer_id;
      if (!printerId) {
        setToast({ message: 'No hay impresora de cocina o recibos configurada', type: 'error' });
        return;
      }

      const firstOrder = tableOrders[0];
      const items = tableOrders.flatMap((order) =>
        (order.items || []).map((item, index) => ({
          menu_item_id: item.item_id || `${order.id}-${index}`,
          name: item.name,
          quantity: getOrderItemQty(item),
          notes: (item as any).notes || null,
        }))
      );

      await printKitchenTicket(tenantId, printerId, {
        orderId: firstOrder.id,
        orderNumber: firstOrder.table_number ? `Mesa ${firstOrder.table_number}` : firstOrder.order_number || 'Comanda salon',
        restaurantName: settings?.display_name || restaurantName,
        ticketType: 'kitchen',
        items,
        deliveryType: 'dine-in',
        tableNumber: firstOrder.table_number || undefined,
        waiterName: firstOrder.waiter_name || undefined,
        timestamp: new Date().toISOString(),
      });

      setToast({ message: 'Comanda enviada a cocina', type: 'success' });
    } catch (error) {
      setToast({
        message: `No se pudo imprimir cocina: ${error instanceof Error ? error.message : String(error)}`,
        type: 'error',
      });
    }
  }

  async function voidOrderItem(orderId: string, itemIndex: number) {
    const order = dineInOrders.find(o => o.id === orderId);
    if (!order) return;

    const updatedItems = order.items.filter((_, i) => i !== itemIndex);
    const newTotal = getOrderItemsTotal(updatedItems);

    await supabase
      .from('orders')
      .update({ items: updatedItems, total: newTotal })
      .eq('id', orderId);

    await fetchDineInOrders();
    setToast({ message: 'Ítem anulado', type: 'success' });
  }

  function loadTableToCart(tableOrders: DineInOrder[]) {
    const mergedMap = new Map<string, CartItem>();
    tableOrders.forEach(order => {
      (order.items || []).forEach(item => {
          const key = item.item_id || item.name;
          const quantity = getOrderItemQty(item);
          if (mergedMap.has(key)) {
            const existing = mergedMap.get(key)!;
            mergedMap.set(key, { ...existing, quantity: existing.quantity + quantity });
          } else {
            mergedMap.set(key, {
              menu_item_id: item.item_id || item.name,
              name: item.name,
              price: item.price,
              quantity,
            });
          }
      });
    });

    setCart(Array.from(mergedMap.values()));
    setPosMode('table');
    const first = tableOrders[0];
    if (first.table_number) setSelectedTableNumber(first.table_number);
    if (first.waiter_name) setSelectedStaffName(first.waiter_name);
    setBillingOrderIds(tableOrders.map(o => o.id));
    setExpandedTable(null);
    setShowDineInPanel(false);
    setShowIncomingPanel(false);
  }


  async function fetchMenuData() {
    try {
      const response = await fetch(`/api/pos/bootstrap?tenantId=${encodeURIComponent(tenantId)}`, {
        credentials: 'include',
        cache: 'no-store',
      });

      if (!response.ok) throw new Error(`POS bootstrap failed: ${response.status}`);

      const data = await response.json();
      setCategories(data.categories || []);
      setMenu(data.menu || []);
      setAllTables(data.tables || []);

      if (data.tenant) {
        if (data.tenant.organization_name) setRestaurantName(data.tenant.organization_name);
        if (data.tenant.logo_url) setRestaurantLogo(data.tenant.logo_url);
      }
      if (data.settings) {
        setTaxRate(Number(data.settings.tax_rate || 0));
        setDeliveryEnabled(data.settings.delivery_enabled === true);
        setDeliveryFee(Number(data.settings.delivery_fee || 0));
        setKdsEnabled(data.settings.kds_enabled === true);
        const zones = Array.isArray(data.settings.delivery_zones)
          ? data.settings.delivery_zones
            .map((zone: any) => ({
              id: String(zone.id || '').trim(),
              name: String(zone.name || '').trim(),
              fee: Number(zone.fee || 0),
              min_order: Number(zone.min_order || 0),
            }))
            .filter((zone: DeliveryZone) => zone.id && zone.name && Number.isFinite(zone.fee))
          : [];
        setDeliveryZones(zones);
        setSelectedDeliveryZoneId(current => current || zones[0]?.id || '');
        if (data.settings.display_name) setRestaurantName(data.settings.display_name);
        if (data.settings.phone) setRestaurantPhone(data.settings.phone);
      }
    } catch (error) {
      console.error('Error fetching menu:', error);
    } finally {
      setLoading(false);
    }
  }

  async function printIncomingOrderReceipt(order: IncomingOrder) {
    setPrintingIncomingOrderId(order.id);
    try {
      const { data: settings, error } = await supabase
        .from('restaurant_settings')
        .select('default_receipt_printer_id, display_name, phone')
        .eq('tenant_id', tenantId)
        .maybeSingle();

      if (error) throw new Error(error.message);
      if (!settings?.default_receipt_printer_id) {
        throw new Error('No hay impresora de recibos configurada');
      }

      const receiptItems = (order.items || []).map((item, index) => ({
        menu_item_id: item.menu_item_id || item.item_id || item.id || `${order.id}-${index}`,
        name: item.name,
        price: Number(item.price || 0),
        quantity: getOrderItemQty(item),
      }));
      const itemsSubtotal = getOrderItemsTotal(order.items || []);
      const orderTotal = Number(order.total || 0);
      const orderDeliveryFee = Math.max(0, Number(order.delivery_fee || orderTotal - itemsSubtotal || 0));

      await printReceipt(tenantId, settings.default_receipt_printer_id, {
        orderId: order.id,
        orderNumber: order.order_number,
        restaurantName: settings.display_name || restaurantName,
        restaurantPhone: settings.phone || restaurantPhone,
        items: receiptItems,
        subtotal: Math.max(0, itemsSubtotal),
        discount: 0,
        tax: 0,
        taxRate: 0,
        deliveryFee: orderDeliveryFee,
        total: orderTotal,
        amountPaid: orderTotal,
        change: 0,
        paymentMethod: order.payment_method || (order.payment_status === 'paid' ? 'online' : 'cash'),
        notes: order.notes || undefined,
        currencyInfo,
        openCashDrawer: false,
      });

      await clearIncomingOrder(order);
      setToast({ message: `Recibo ${order.order_number} impreso y enviado a preparacion`, type: 'success' });
    } catch (error) {
      setToast({ message: error instanceof Error ? error.message : 'No se pudo imprimir el recibo', type: 'error' });
    } finally {
      setPrintingIncomingOrderId(null);
    }
  }

  async function clearIncomingOrder(order: IncomingOrder) {
    setClearingIncomingOrderId(order.id);
    try {
      const response = await fetch(`/api/orders/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'preparing' }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || 'Recibo impreso, pero no se pudo limpiar de Entregas');
      }

      setIncomingOrders((orders) => orders.filter((item) => item.id !== order.id));
      await fetchIncomingOrders();
      setToast({ message: `Pedido ${order.order_number} enviado a preparacion`, type: 'success' });
    } catch (error) {
      setToast({ message: error instanceof Error ? error.message : 'No se pudo limpiar Entregas', type: 'error' });
    } finally {
      setClearingIncomingOrderId(null);
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

  function updateNotes(itemId: string, notes: string) {
    setCart((prev) =>
      prev.map((c) => (c.menu_item_id === itemId ? { ...c, notes } : c))
    );
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

    if (selectedTableId && !selectedStaffId) {
      setToast({ message: 'Por favor selecciona el camarero', type: 'error' });
      return;
    }

    // Auto-print receipt without modal
    setPendingPaymentData({ amountPaid });
    processPaymentAfterReceipt(amountPaid);
  }

  async function processPaymentAfterReceipt(amountPaid?: number) {
    try {
      setProcessingPayment(true);
      let receiptOrderId: string | null = null;
      let receiptOrderNumber: string | null = null;
      let savedOfflineSale = false;
      const printerWarnings: string[] = [];

      if (loadedOrderId) {
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
          throw new Error('Para cobrar un pedido ya creado necesitas internet. Las ventas nuevas del TPV si pueden cobrarse offline.');
        }

        // Paying for a loaded existing order
        const response = await fetch(`/api/orders/${loadedOrderId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            tenantId,
            payment_status: 'paid',
            status: 'confirmed',
            payment_method: paymentMethod,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to update payment');
        }

        const updatedOrder = await response.json();
        receiptOrderId = updatedOrder?.order?.id || loadedOrderId;
        receiptOrderNumber = updatedOrder?.order?.order_number || null;
        const paidOrderId = loadedOrderId;
        setIncomingOrders((orders) => orders.filter((order) => order.id !== paidOrderId));
        setLoadedOrderId(null);
        await fetchIncomingOrders();
      } else if (billingOrderIds.length > 0) {
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
          throw new Error('Para cobrar mesas abiertas necesitas internet. Las ventas nuevas del TPV si pueden cobrarse offline.');
        }

        // Billing existing table orders — mark as paid, no new order created.
        // Kitchen progress is independent: paying must not remove pending items from KDS.
        const paidTableOrderIds = [...billingOrderIds];
        for (const orderId of billingOrderIds) {
          const paidResponse = await fetch(`/api/orders/${orderId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              tenantId,
              payment_status: 'paid',
              payment_method: paymentMethod,
            }),
          });

          if (!paidResponse.ok) {
            const errorData = await paidResponse.json().catch(() => ({}));
            throw new Error(errorData.error || 'No se pudo marcar la mesa como pagada');
          }
        }
        receiptOrderId = paidTableOrderIds[0] || null;
        receiptOrderNumber = selectedTableNumber ? `Mesa ${selectedTableNumber}` : 'Cuenta salon';
        setBillingOrderIds([]);
        await fetchDineInOrders();
      } else {
        // New POS order — create via API
        const formattedItems = cart.map(item => ({
          menu_item_id: item.menu_item_id,
          name: item.name,
          price: item.price,
          qty: item.quantity,
          notes: item.notes || null,
        }));

        const orderPayload = {
          tenantId,
          tenantSlug: tenantSlug || null,
          customerInfo: {
            name: 'POS Counter',
            email: null,
            phone: 'N/A',
          },
          items: formattedItems,
          paymentMethod,
          deliveryType: selectedTableId ? 'dine-in' : posOrderType,
          deliveryZone: posOrderType === 'delivery' && selectedDeliveryZone ? selectedDeliveryZone : null,
          deliveryAddress: posOrderType === 'delivery'
            ? selectedDeliveryZone
              ? `Zona: ${selectedDeliveryZone.name}`
              : 'Pedido telefonico desde TPV'
            : null,
          waiterName: selectedStaffName || null,
          tableNumber: selectedTableNumber || null,
          tip: tip > 0 ? tip : null,
          notes: discount > 0 ? `Descuento: $${discount.toFixed(2)}` : null,
          amountPaid: paymentMethod === 'cash' ? amountPaid : null,
          source: 'pos',
        };

        const saveSaleOffline = async () => {
          if (paymentMethod === 'stripe') {
            throw new Error('Stripe necesita internet. Para cobrar sin internet usa efectivo o datafono externo y marca la venta en caja.');
          }

          const offlineOrder = await saveOfflinePOSOrder({
            ...orderPayload,
            paymentMethod,
            deliveryType: selectedTableId ? 'dine-in' : posOrderType,
            items: formattedItems.map((item) => ({
              menu_item_id: item.menu_item_id,
              name: item.name,
              price: item.price,
              quantity: item.qty,
              notes: item.notes,
            })),
            subtotal,
            discount,
            total,
            amountPaid: paymentMethod === 'cash' ? amountPaid : null,
          });

          receiptOrderId = offlineOrder.id;
          receiptOrderNumber = offlineOrder.orderNumber;
          savedOfflineSale = true;
          printerWarnings.push('Venta offline guardada y pendiente de sincronizar');
          await refreshOfflinePendingCount();
        };

        if (typeof navigator !== 'undefined' && !navigator.onLine) {
          await saveSaleOffline();
        } else {
          try {
            const response = await fetch('/api/orders', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfTokenRef.current },
              credentials: 'include',
              body: JSON.stringify(orderPayload),
            });

            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.error || 'Failed to process order');
            }

            const createdOrder = await response.json();
            if (createdOrder?.orderId) {
              receiptOrderId = createdOrder.orderId;
              receiptOrderNumber = createdOrder.orderNumber || null;
              const paidResponse = await fetch(`/api/orders/${createdOrder.orderId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                  tenantId,
                  payment_status: 'paid',
                  status: 'confirmed',
                  payment_method: paymentMethod,
                }),
              });

              if (!paidResponse.ok) {
                const errorData = await paidResponse.json();
                throw new Error(errorData.error || 'Failed to mark order as paid');
              }
            }
          } catch (orderError) {
            if (!isNetworkPaymentError(orderError)) throw orderError;
            await saveSaleOffline();
          }
        }
      }

      // Mark cart as abandoned in Supabase
      if (!savedOfflineSale) {
        await abandonCart(tenantId, supabase);
      }

      const receiptSnapshot = {
        orderId: receiptOrderId,
        orderNumber: receiptOrderNumber || 'POS',
        items: cart.map(item => ({ ...item })),
        subtotal,
        discount,
        tax: taxAmount,
        taxRate,
        deliveryFee: activeDeliveryFee,
        total,
        amountPaid: paymentMethod === 'cash' ? amountPaid : undefined,
        change: paymentMethod === 'cash' ? (amountPaid || 0) - total : 0,
        currencyInfo,
        waiterName: selectedStaffName || undefined,
        tableNumber: selectedTableNumber || undefined,
        paymentMethod,
        deliveryType: selectedTableId ? 'dine-in' : posOrderType,
        notes: discount > 0 ? `Descuento: $${discount.toFixed(2)}` : null,
      };

      const printInBackground = async () => {
        const backgroundWarnings: string[] = [];
        let settings: any = null;
        try {
          const result = await supabase
            .from('restaurant_settings')
            .select('default_receipt_printer_id, kitchen_printer_id, printer_auto_print, display_name, phone')
            .eq('tenant_id', tenantId)
            .maybeSingle();

          if (result.error) throw new Error(result.error.message);
          settings = result.data;
          if (settings?.default_receipt_printer_id && typeof window !== 'undefined') {
            localStorage.setItem(`eccofood-pos-printer-settings-${tenantId}`, JSON.stringify(settings));
          }
        } catch (settingsError) {
          if (typeof window !== 'undefined') {
            const cachedSettings = localStorage.getItem(`eccofood-pos-printer-settings-${tenantId}`);
            settings = cachedSettings ? JSON.parse(cachedSettings) : null;
          }
          if (!settings) {
            backgroundWarnings.push(`No se pudo leer configuracion de impresora: ${settingsError instanceof Error ? settingsError.message : String(settingsError)}`);
          }
        }

        let receiptPrintedWithDrawer = false;
        try {
          if (!settings?.default_receipt_printer_id) {
            backgroundWarnings.push('No hay impresora predeterminada');
          } else if (!settings?.printer_auto_print) {
            backgroundWarnings.push('Auto impresion desactivada');
          } else if (receiptSnapshot.orderId) {
            try {
              await printReceipt(tenantId, settings.default_receipt_printer_id, {
                orderId: receiptSnapshot.orderId,
                orderNumber: receiptSnapshot.orderNumber,
                restaurantName: settings?.display_name || restaurantName,
                restaurantPhone: settings?.phone || restaurantPhone,
                items: receiptSnapshot.items,
                subtotal: receiptSnapshot.subtotal,
                discount: receiptSnapshot.discount,
                tax: receiptSnapshot.tax,
                taxRate: receiptSnapshot.taxRate,
                deliveryFee: receiptSnapshot.deliveryFee,
                total: receiptSnapshot.total,
                amountPaid: receiptSnapshot.amountPaid,
                change: receiptSnapshot.change,
                paymentMethod: receiptSnapshot.paymentMethod,
                currencyInfo: receiptSnapshot.currencyInfo,
                waiterName: receiptSnapshot.waiterName,
                tableNumber: receiptSnapshot.tableNumber,
                openCashDrawer: receiptSnapshot.paymentMethod === 'cash',
              });
              receiptPrintedWithDrawer = receiptSnapshot.paymentMethod === 'cash';
            } catch (printError) {
              backgroundWarnings.push(`Recibo no impreso: ${printError instanceof Error ? printError.message : String(printError)}`);
            }
          } else {
            backgroundWarnings.push('No se pudo identificar el pedido para imprimir');
          }
        } catch (printFlowError) {
          backgroundWarnings.push(`No se pudo preparar el recibo: ${printFlowError instanceof Error ? printFlowError.message : String(printFlowError)}`);
        }

        if (receiptSnapshot.paymentMethod === 'cash') {
          try {
            if (!receiptPrintedWithDrawer) {
              await openCashDrawer(tenantId);
            }
          } catch (drawerError) {
            backgroundWarnings.push(`Cajon no abierto: ${drawerError instanceof Error ? drawerError.message : String(drawerError)}`);
          }
        }

        if (backgroundWarnings.length > 0) {
          setToast({
            message: `Venta guardada. ${backgroundWarnings.slice(0, 2).join(' | ')}`,
            type: 'error',
          });
        } else if (!savedOfflineSale) {
          setToast({
            message: receiptSnapshot.paymentMethod === 'cash'
              ? 'Recibo impreso y cajon abierto'
              : 'Recibo impreso',
            type: 'success',
          });
        }
      };

      void printInBackground();

      // Clear cart and reset all states
      setCart([]);
      setDiscount(0);
      setDiscountCode('');
      setTip(0);
      setPendingPaymentData(null);
      setPaymentMethod('cash');
      setSelectedCategory(null);
      setSearchQuery('');
      setSelectedTableId(null);
      setSelectedTableNumber(null);
      setSelectedStaffId(null);
      setSelectedStaffName('');
      setPosMode('simple');
      setPosOrderType('takeaway');
      setSelectedDeliveryZoneId(deliveryZones[0]?.id || '');

      // Clear localStorage
      if (typeof window !== 'undefined') {
        localStorage.removeItem(`pos-cart-${tenantId}`);
        localStorage.removeItem(`pos-discount-${tenantId}`);
        localStorage.removeItem(`pos-discount-code-${tenantId}`);
      }

      // Force remount of POSPayment component to reset its internal state
      setPaymentResetKey(paymentResetKey + 1);

      // Show success toast (auto-closes after 3 seconds)
      setToast({
        message: savedOfflineSale
          ? 'Venta cobrada en modo offline. Se subira sola cuando vuelva internet.'
          : 'Venta guardada. Imprimiendo recibo...',
        type: 'success',
      });
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
  const taxableSubtotal = Math.max(0, subtotal - discount);
  const taxAmount = taxRate > 0 ? taxableSubtotal * (taxRate / 100) : 0;
  const selectedDeliveryZone = deliveryZones.find(zone => zone.id === selectedDeliveryZoneId) || null;
  const currentDeliveryFee = selectedDeliveryZone ? selectedDeliveryZone.fee : deliveryFee;
  const activeDeliveryFee = !selectedTableId && posOrderType === 'delivery' && deliveryEnabled ? currentDeliveryFee : 0;
  const paymentBaseTotal = taxableSubtotal + taxAmount + activeDeliveryFee;
  const total = paymentBaseTotal + tip;
  const currentOrderLabel = selectedTableNumber
    ? `Mesa ${selectedTableNumber}`
    : posOrderType === 'delivery'
    ? selectedDeliveryZone?.name || 'Delivery'
    : posOrderType === 'pickup'
    ? 'Recojo'
    : 'Para llevar';

  const tableGroups = useMemo((): TableGroup[] => {
    const groups = new Map<number, DineInOrder[]>();
    dineInOrders.forEach(order => {
      const tableNum = order.table_number ?? 0;
      if (!groups.has(tableNum)) groups.set(tableNum, []);
      groups.get(tableNum)!.push(order);
    });
    return Array.from(groups.entries()).map(([tableNumber, orders]) => ({
      tableNumber,
      orders,
      totalAmount: orders.reduce((sum, order) => {
        const orderSubtotal = getOrderItemsTotal(order.items || []);
        return sum + orderSubtotal + (taxRate > 0 ? orderSubtotal * (taxRate / 100) : 0);
      }, 0),
      itemCount: orders.reduce((sum, order) => sum + (order.items || []).reduce((s, item) => s + getOrderItemQty(item), 0), 0),
      waiters: [...new Set(orders.map(o => o.waiter_name).filter((w): w is string => Boolean(w)))],
      oldestOrder: orders.reduce((oldest, o) =>
        new Date(o.created_at) < new Date(oldest.created_at) ? o : oldest
      ),
      allItems: orders.flatMap(o => o.items || []),
    }));
  }, [dineInOrders, taxRate]);

  const cartQuantityMap = useMemo(() => {
    const map = new Map<string, number>();
    cart.forEach(item => map.set(item.menu_item_id, item.quantity));
    return map;
  }, [cart]);

  useEffect(() => {
    const isEditableTarget = (target: EventTarget | null) => {
      const element = target as HTMLElement | null;
      if (!element) return false;
      return (
        element.tagName === 'INPUT' ||
        element.tagName === 'TEXTAREA' ||
        element.isContentEditable
      );
    };

    const selectCategoryByOffset = (offset: number) => {
      const categoryIds = [null, ...categories.map((category) => category.id)];
      const currentIndex = categoryIds.findIndex((id) => id === selectedCategory);
      const nextIndex = (Math.max(0, currentIndex) + offset + categoryIds.length) % categoryIds.length;
      setSelectedCategory(categoryIds[nextIndex]);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      const editable = isEditableTarget(event.target);

      if (event.key === 'F2' || (!editable && event.key === '/')) {
        event.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
        return;
      }

      if (event.key === 'Escape') {
        if (editable) {
          (event.target as HTMLElement).blur();
        }
        setSearchQuery('');
        setShowIncomingPanel(false);
        setShowDineInPanel(false);
        setShowFindPayPanel(false);
        return;
      }

      if (editable) return;

      if (event.altKey && event.key === 'ArrowRight') {
        event.preventDefault();
        selectCategoryByOffset(1);
        return;
      }

      if (event.altKey && event.key === 'ArrowLeft') {
        event.preventDefault();
        selectCategoryByOffset(-1);
        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        event.preventDefault();
        if (paymentMethod === 'stripe') {
          handleShowReceipt();
        } else {
          setToast({ message: 'Escribe el dinero recibido y presiona Enter para cobrar.', type: 'error' });
        }
        return;
      }

      if (event.key === 'F9') {
        event.preventDefault();
        if (paymentMethod === 'stripe') {
          handleShowReceipt();
        } else {
          setToast({ message: 'Escribe el dinero recibido y presiona Enter para cobrar.', type: 'error' });
        }
        return;
      }

      if (event.key === 'F6') {
        event.preventDefault();
        setShowIncomingPanel(false);
        setShowDineInPanel(false);
        setShowFindPayPanel(false);
        return;
      }

      if (event.key === 'F7') {
        event.preventDefault();
        setShowIncomingPanel(true);
        setShowDineInPanel(false);
        setShowFindPayPanel(false);
        return;
      }

      if (event.key === 'F8') {
        event.preventDefault();
        setShowIncomingPanel(false);
        setShowDineInPanel(true);
        setShowFindPayPanel(false);
        return;
      }

      if (/^[1-9]$/.test(event.key)) {
        const item = filteredMenu[Number(event.key) - 1];
        if (item) {
          event.preventDefault();
          addToCart(item);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [categories, selectedCategory, filteredMenu, cart, paymentMethod, handleShowReceipt]);

  if (loading) {
    return (
      <div className="pos-premium flex h-screen items-center justify-center">
        <div className="pos-panel rounded-2xl px-6 py-4 text-sm font-black text-cyan-100">
          Cargando TPV...
        </div>
      </div>
    );
  }

  return (
    <div ref={posRootRef} className={`pos-premium ${isFullscreen ? 'fixed inset-0 z-[9999] h-[100dvh] w-screen p-0 m-0 overflow-hidden flex flex-col bg-[#020617]' : 'min-h-[100dvh]'} text-white flex flex-col`}>
      {/* Fullscreen Header - Logo and Controls - TPV Header with Eccofood Brand */}
      {isFullscreen && (
        <div className="pos-panel border-x-0 border-t-0 px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <div className="rounded-xl border border-cyan-300/25 bg-cyan-300/10 p-2.5 shadow-lg shadow-cyan-900/20">
              <DollarSign className="w-6 h-6 text-cyan-100" />
            </div>
            <div className="min-w-0">
              <p className="text-cyan-100/55 text-xs font-black uppercase">Punto de venta</p>
              <h1 className="truncate text-white font-black text-lg">{restaurantName}</h1>
            </div>
          </div>
          <div className="relative hidden min-w-[280px] max-w-xl flex-1 xl:block">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-cyan-100/45 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Buscar producto... (/ o F2)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl py-3 pl-12 pr-4 text-sm font-bold text-white outline-none transition-all"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => activateWakeLock()}
              className={`pos-action-ghost ${wakeLockActive ? 'border-emerald-300/45 bg-emerald-300/12 text-emerald-100' : 'border-amber-300/35 bg-amber-300/10 text-amber-100'}`}
              title={wakeLockSupported ? 'Mantener la pantalla activa' : 'Tu navegador puede no soportar bloqueo de pantalla'}
            >
              <Lock className="w-5 h-5" />
              <span className="hidden sm:inline">{wakeLockActive ? 'Activa' : 'Bloquear'}</span>
            </button>
            <button
              onClick={() => syncOfflineSales(true)}
              disabled={!isOnline || syncingOffline}
              className={`pos-action-ghost ${!isOnline ? 'border-amber-300/45 bg-amber-300/12 text-amber-100' : offlinePendingCount > 0 ? 'border-emerald-300/45 bg-emerald-300/12 text-emerald-100' : ''} disabled:opacity-75`}
              title={isOnline ? 'Sincronizar ventas offline' : 'Modo offline activo'}
            >
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  isOnline
                    ? 'bg-[#39ff88] shadow-[0_0_8px_#39ff88,0_0_18px_rgba(57,255,136,0.72)]'
                    : 'animate-pulse bg-[#ff174d] shadow-[0_0_8px_#ff174d,0_0_18px_rgba(255,23,77,0.72)]'
                }`}
              />
              <span className="hidden sm:inline">{isOnline ? (syncingOffline ? 'Sync...' : 'Online') : 'Offline'}</span>
              {offlinePendingCount > 0 && (
                <span className="rounded-full bg-amber-400 px-1.5 py-0.5 text-[10px] font-black text-slate-950">
                  {offlinePendingCount}
                </span>
              )}
            </button>
            {todayReservations.length > 0 && (
              <div
                className="pos-action-ghost border-amber-300/55 bg-amber-300/14 text-amber-100 shadow-[0_0_18px_rgba(251,191,36,0.22)]"
                title="Reservas de hoy"
              >
                <CalendarDays className="w-5 h-5" />
                <span className="hidden sm:inline">
                  {todayReservations.length} reserva{todayReservations.length > 1 ? 's' : ''}
                </span>
                <span className="rounded-full bg-amber-300 px-1.5 py-0.5 text-[10px] font-black text-slate-950 sm:hidden">
                  {todayReservations.length}
                </span>
              </div>
            )}
            <button
              onClick={toggleFullscreen}
              className="pos-action-ghost"
              title={isFullscreen ? 'Salir de pantalla completa (ESC)' : 'Pantalla completa'}
            >
              {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
              <span className="hidden sm:inline">{isFullscreen ? 'Salir' : 'Fullscreen'}</span>
            </button>
          </div>
        </div>
      )}

      {!isFullscreen && (
        <div className="pos-topbar shrink-0 px-4 py-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-cyan-300/25 bg-cyan-300/10 shadow-lg shadow-cyan-950/20">
                <DollarSign className="size-6 text-cyan-100" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-black uppercase text-cyan-100/55">Punto de venta</p>
                <h1 className="truncate text-xl font-black tracking-tight text-white">{restaurantName}</h1>
              </div>
            </div>

            {!wakeLockActive && (
              <button
                onClick={() => activateWakeLock()}
                className="pos-action-ghost border-amber-300/35 bg-amber-300/10 text-amber-100"
                title={wakeLockSupported ? 'Mantener pantalla activa' : 'Tu navegador puede no soportar esta funcion'}
              >
                <Lock className="size-4" />
                <span>Bloquear pantalla</span>
              </button>
            )}

            <div className="grid grid-cols-2 gap-2 lg:min-w-[280px]">
              <div className="pos-kpi">
                <span>Pedido</span>
                <strong className="truncate text-sm leading-tight">{currentOrderLabel}</strong>
              </div>
              <div className="pos-kpi">
                <span>Delivery</span>
                <strong>{incomingOrders.length}</strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {pendingCashClosingStats && (
        <div className="shrink-0 border-y border-amber-300/25 bg-amber-400/12 px-4 py-3 text-amber-50">
          <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-black">Caja pendiente por cerrar</p>
              <p className="mt-0.5 text-xs font-semibold text-amber-100/75">
                Hay {pendingCashClosingStats.transactionCount} venta{pendingCashClosingStats.transactionCount === 1 ? '' : 's'} pagada{pendingCashClosingStats.transactionCount === 1 ? '' : 's'} sin cierre desde un periodo anterior. Total: {formatPriceWithCurrency(pendingCashClosingStats.totalSales, currencyInfo.code, currencyInfo.locale)}.
              </p>
            </div>
            <button
              onClick={handleOpenPendingCashClosing}
              disabled={closingLoading}
              className="rounded-xl border border-amber-200/35 bg-amber-200 px-4 py-2 text-sm font-black text-slate-950 shadow-lg shadow-black/15 transition hover:bg-amber-100 disabled:opacity-60"
            >
              Cerrar pendiente
            </button>
          </div>
        </div>
      )}

      <div className={`flex-1 flex min-h-0 flex-col overflow-y-auto lg:overflow-hidden lg:flex-row ${isFullscreen ? 'gap-0' : 'gap-0'}`}>
        {/* Menu Section */}
        <div className={`${isFullscreen ? 'min-h-0 flex-1' : 'min-h-[44dvh] max-h-[58dvh] lg:min-h-0 lg:max-h-none lg:flex-1'} flex flex-col overflow-hidden`}>
          {/* Search and Controls - Sticky Header */}
          <div className={`pos-panel pos-command-bar border-x-0 border-t-0 flex flex-wrap gap-2.5 items-center sticky top-0 z-10 lg:flex-nowrap ${isFullscreen ? 'px-4 py-3' : 'p-3 sm:p-4'}`}>
            {!isFullscreen && (
              <div className="relative min-w-[220px] flex-[1_1_260px]">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-cyan-100/45 pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Buscar producto... (/ o F2)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 rounded-xl outline-none text-white text-sm font-bold transition-all"
                />
              </div>
            )}
            {!isFullscreen && (
              <>
                <button
                  onClick={() => syncOfflineSales(true)}
                  disabled={!isOnline || syncingOffline}
                  className={`pos-action-ghost ${!isOnline ? 'border-amber-300/45 bg-amber-300/12 text-amber-100' : offlinePendingCount > 0 ? 'border-emerald-300/45 bg-emerald-300/12 text-emerald-100' : ''} disabled:opacity-75`}
                  title={isOnline ? 'Sincronizar ventas offline' : 'Modo offline activo'}
                >
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${
                      isOnline
                        ? 'bg-[#39ff88] shadow-[0_0_8px_#39ff88,0_0_18px_rgba(57,255,136,0.72)]'
                        : 'animate-pulse bg-[#ff174d] shadow-[0_0_8px_#ff174d,0_0_18px_rgba(255,23,77,0.72)]'
                    }`}
                  />
                  <span className="hidden sm:inline">
                    {isOnline ? (syncingOffline ? 'Sync...' : 'Online') : 'Offline'}
                  </span>
                  {offlinePendingCount > 0 && (
                    <span className="rounded-full bg-amber-400 px-1.5 py-0.5 text-[10px] font-black text-slate-950">
                      {offlinePendingCount}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => {
                    window.location.href = `/${tenantSlug || tenantId}/pos-display?tid=${tenantId}&country=${country}`;
                  }}
                  className="pos-action-ghost"
                  title="Abrir pantalla de cliente"
                >
                  <Monitor className="w-5 h-5" />
                  <span className="hidden sm:inline">Cliente</span>
                </button>
                <button
                  onClick={async () => {
                    try {
                      await openCashDrawer(tenantId);
                      setToast({ message: 'Cajon abierto', type: 'success' });
                    } catch (error) {
                      setToast({
                        message: `No se pudo abrir el cajon: ${error instanceof Error ? error.message : 'Error desconocido'}`,
                        type: 'error',
                      });
                    }
                  }}
                  className="pos-action-ghost"
                  title="Abrir cajón de dinero"
                >
                  <Archive className="w-5 h-5" />
                  <span className="hidden sm:inline">Cajón</span>
                </button>
                <button
                  onClick={handleOpenCashClosing}
                  disabled={closingLoading}
                  className="pos-action-danger disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Cerrar caja diaria"
                >
                  <Lock className="w-5 h-5" />
                  <span className="hidden sm:inline">Cerrar</span>
                </button>
                <button
                  onClick={toggleFullscreen}
                  className="pos-action"
                  title="Pantalla completa"
                >
                  <Maximize2 className="w-5 h-5" />
                  <span className="hidden sm:inline">Completa</span>
                </button>
              </>
            )}
          </div>

          {/* Categories - Sticky */}
          <div className={`flex gap-2 overflow-x-auto pb-2 sticky z-10 border-b border-white/10 bg-black/24 backdrop-blur-xl scrollbar-none ${isFullscreen ? 'px-4 py-3' : 'px-4 py-2.5'}`}>
            <button
              onClick={() => setSelectedCategory(null)}
              title="Alt + flechas cambia categorias"
              className={`pos-chip relative px-4 py-2 transition-all duration-200 shrink-0 ${
                selectedCategory === null
                  ? 'border-amber-300/80 bg-amber-300/22 text-amber-50 shadow-lg shadow-amber-900/30 after:absolute after:left-3 after:right-3 after:-bottom-1 after:h-1 after:rounded-full after:bg-amber-300'
                  : 'hover:border-cyan-300/35 hover:text-white'
              }`}
            >
              Todos
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                title="Alt + flechas cambia categorias"
                className={`pos-chip relative px-4 py-2 transition-all duration-200 shrink-0 ${
                  selectedCategory === cat.id
                    ? 'border-amber-300/80 bg-amber-300/22 text-amber-50 shadow-lg shadow-amber-900/30 after:absolute after:left-3 after:right-3 after:-bottom-1 after:h-1 after:rounded-full after:bg-amber-300'
                    : 'hover:border-cyan-300/35 hover:text-white'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Menu Grid */}
          <div className={`flex-1 overflow-y-auto ${isFullscreen ? 'px-4 py-3' : 'p-3 sm:p-4'}`}>
            <div className={`grid gap-3 h-fit ${isFullscreen ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6' : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6'}`}>
              {filteredMenu.map((item, index) => {
                const qty = cartQuantityMap.get(item.id);
                return (
                  <button
                    key={item.id}
                    onClick={() => addToCart(item)}
                    title={index < 9 ? `Tecla ${index + 1}: agregar ${item.name}` : `Agregar ${item.name}`}
                    className={`pos-card relative min-h-[164px] rounded-xl p-3 text-left transition-all duration-200 transform hover:scale-[1.025] active:scale-95 flex flex-col justify-between group ${
                      qty
                        ? 'border-2 border-cyan-300/70 bg-cyan-300/14 shadow-lg shadow-cyan-900/30'
                        : ''
                    }`}
                  >
                    {qty && (
                      <span className="absolute top-1.5 right-1.5 bg-cyan-400 text-slate-950 text-xs font-black w-5 h-5 rounded-full flex items-center justify-center z-10 shadow-md ring-2 ring-slate-950">
                        {qty}
                      </span>
                    )}
                    {index < 9 && (
                      <span className="absolute left-1.5 top-1.5 z-10 rounded-md border border-white/10 bg-black/55 px-1.5 py-0.5 text-[10px] font-black text-cyan-100">
                        {index + 1}
                      </span>
                    )}
                    {item.image_url && (
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className={`w-full object-contain rounded-lg mb-1 group-hover:scale-110 transition-transform duration-200 ${isFullscreen ? 'h-20' : 'h-24'}`}
                      />
                    )}
                    <p className="font-black text-base leading-tight line-clamp-2 flex-1 text-white group-hover:text-cyan-200 transition-colors">{item.name}</p>
                    <p className={`font-black text-base mt-1 ${qty ? 'text-cyan-200' : 'text-emerald-300'}`}>
                      {formatPriceWithCurrency(item.price, currencyInfo.code, currencyInfo.locale)}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tables Bottom Strip */}
          {allTables.length > 0 && (
            <div className="pos-panel border-x-0 border-b-0 px-3 py-2 shrink-0">
              <p className="text-cyan-100/42 text-xs font-black mb-2 uppercase">Mesas</p>
              <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
                {allTables.map(table => {
                  const group = tableGroups.find(g => g.tableNumber === table.table_number);
                  const minutes = group
                    ? Math.floor((Date.now() - new Date(group.oldestOrder.created_at).getTime()) / 60000)
                    : 0;
                  const isSelected = selectedTableNumber === table.table_number && !group;
                  return (
                    <button
                      key={table.id}
                      onClick={() => {
                        if (group) {
                          loadTableToCart(group.orders);
                        } else if (selectedTableId === table.id) {
                          setSelectedTableId(null);
                          setSelectedTableNumber(null);
                          setSelectedStaffId(null);
                          setSelectedStaffName('');
                          setPosMode('simple');
                        } else {
                          setSelectedTableId(table.id);
                          setSelectedTableNumber(table.table_number);
                          setPosMode('table');
                        }
                      }}
                      className={`shrink-0 flex flex-col items-center justify-center rounded-xl px-3 py-2 min-w-[58px] border-2 transition-all duration-200 active:scale-95 ${
                        group
                          ? `${getUrgencyBorder(minutes)} bg-white/10 hover:bg-white/15`
                          : isSelected
                          ? 'border-cyan-300 bg-cyan-300/16'
                          : 'border-white/10 bg-white/5 hover:bg-white/10'
                      }`}
                    >
                      <span className={`font-black text-sm leading-tight ${group ? 'text-white' : isSelected ? 'text-cyan-200' : 'text-slate-400'}`}>
                        {table.table_number}
                      </span>
                      {group ? (
                        <>
                          <span className={`text-xs font-bold ${getTimerColor(minutes)}`}>{minutes}m</span>
                          <span className="text-xs text-emerald-400 font-bold tabular-nums leading-tight">
                            {formatPriceWithCurrency(group.totalAmount, currencyInfo.code, currencyInfo.locale)}
                          </span>
                        </>
                      ) : (
                        <span className={`text-xs mt-0.5 ${isSelected ? 'text-cyan-300' : 'text-slate-500'}`}>
                          {isSelected ? '✓ Sel.' : 'Libre'}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Cart/Payment Section */}
        <div className={`${isFullscreen ? 'h-[44dvh] min-h-0 overflow-hidden lg:h-auto lg:min-h-0 lg:w-72 xl:w-80' : 'min-h-[520px] flex-none overflow-y-auto pb-6 lg:min-h-0 lg:h-auto lg:w-80 lg:overflow-y-auto lg:pb-0'} pos-panel border-x-0 border-b-0 lg:border-y-0 lg:border-r-0 flex flex-col`}>
          {/* Tabs: Cart / Entregas / Mesa abierta */}
          <div className="border-b border-white/10 flex bg-black/20 backdrop-blur-xl">
            <button
              onClick={() => { setShowIncomingPanel(false); setShowDineInPanel(false); setShowFindPayPanel(false); }}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 border-b-2 transition relative ${
                !showIncomingPanel && !showDineInPanel && !showFindPayPanel
                  ? 'border-cyan-300 bg-cyan-300/14 text-white'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <div className="relative">
                <ShoppingCart className="w-4 h-4" />
                {cart.length > 0 && (
                  <span className="absolute -top-1.5 -right-2 bg-cyan-400 text-slate-950 rounded-full w-4 h-4 text-[9px] font-black flex items-center justify-center">{cart.length}</span>
                )}
              </div>
              <span className="text-[10px] font-bold">Carrito</span>
            </button>
            <button
              onClick={() => { setShowIncomingPanel(true); setShowDineInPanel(false); setShowFindPayPanel(false); }}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 border-b-2 transition relative ${
                showIncomingPanel && !showDineInPanel && !showFindPayPanel
                  ? 'border-cyan-300 bg-cyan-300/14 text-white'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <div className="relative">
                <Truck className="w-4 h-4" />
                {incomingOrders.length > 0 && (
                  <span className="absolute -top-1.5 -right-2 bg-red-500 text-white rounded-full w-4 h-4 text-[9px] font-black flex items-center justify-center animate-pulse">{incomingOrders.length}</span>
                )}
              </div>
              <span className="text-[10px] font-bold">Entregas</span>
            </button>
            <button
              onClick={() => { setShowDineInPanel(true); setShowIncomingPanel(false); setShowFindPayPanel(false); }}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 border-b-2 transition relative ${
                showDineInPanel
                  ? 'border-emerald-400 bg-emerald-400/14 text-white'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <div className="relative">
                <UtensilsCrossed className="w-4 h-4" />
                {dineInOrders.length > 0 && (
                  <span className="absolute -top-1.5 -right-2 bg-emerald-500 text-white rounded-full w-4 h-4 text-[9px] font-black flex items-center justify-center">{dineInOrders.length}</span>
                )}
              </div>
              <span className="text-[10px] font-bold">Mesa abierta</span>
            </button>
          </div>

          {/* Mesas / Dine-in Panel */}
          {showDineInPanel && (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Toggle Mapa / Lista */}
              <div className="flex border-b border-white/10 shrink-0 bg-black/18">
                <button
                  onClick={() => setMesasView('map')}
                  className={`flex-1 py-2 text-xs font-black transition ${mesasView === 'map' ? 'text-white bg-cyan-300/14' : 'text-slate-500 hover:text-slate-200'}`}
                >
                  🗺 Mapa
                </button>
                <button
                  onClick={() => setMesasView('list')}
                  className={`flex-1 py-2 text-xs font-black transition ${mesasView === 'list' ? 'text-white bg-cyan-300/14' : 'text-slate-500 hover:text-slate-200'}`}
                >
                  📋 Comandas {tableGroups.length > 0 && `(${tableGroups.length})`}
                </button>
              </div>

              {/* Vista Mapa */}
              {mesasView === 'map' && (
                <div className="flex-1 overflow-y-auto">
                  <TableMap
                    tenantId={tenantId}
                    occupiedTableNumbers={tableGroups.map(g => g.tableNumber)}
                    selectedTableNumber={selectedTableNumber}
                    onSelectTable={(tableId, tableNumber) => {
                      const group = tableGroups.find(g => g.tableNumber === tableNumber);
                      if (group) {
                        loadTableToCart(group.orders);
                      } else {
                        setSelectedTableId(tableId);
                        setSelectedTableNumber(tableNumber);
                        setPosMode('table');
                        setShowDineInPanel(false);
                      }
                    }}
                  />
                </div>
              )}

              {/* Vista Lista comandas */}
              {mesasView === 'list' && (
                <>
                  {tableGroups.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center text-slate-500">
                      <div className="text-center">
                        <p className="text-3xl mb-2">🍽️</p>
                        <p className="text-sm font-medium">Sin comandas pendientes</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 overflow-y-auto p-2 space-y-2">
                      {tableGroups.map(group => (
                        <TableGroupCard
                          key={group.tableNumber}
                          group={group}
                          onBillTable={loadTableToCart}
                          onPrintKitchen={printDineInKitchenTicket}
                          onVoidItem={voidOrderItem}
                          expanded={expandedTable === group.tableNumber}
                          onToggleExpand={() =>
                            setExpandedTable(expandedTable === group.tableNumber ? null : group.tableNumber)
                          }
                          currencyInfo={currencyInfo}
                        />
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Find & Pay Panel */}
          {showFindPayPanel && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <POSOrderLookup
                domain={tenantId}
                country={country}
                onOrderSelected={handleOrderSelected}
                onVoidOrder={voidCompletedSale}
              />
            </div>
          )}

          {/* Cart Content - Only show when not in any special panel */}
          {!showIncomingPanel && !showDineInPanel && !showFindPayPanel && (
            <>
              {loadedOrderId && (
                <div className="mx-2 mt-2 rounded-xl border border-red-400/25 bg-red-500/10 px-3 py-2 flex items-center gap-2">
                  <Archive className="w-3.5 h-3.5 text-red-200 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-red-100 font-bold text-xs">Ticket de domicilio cargado</p>
                    <p className="text-red-200/70 text-xs">Puedes cobrarlo o anularlo si el cliente cancelo.</p>
                  </div>
                  <button
                    onClick={() => {
                      const order = incomingOrders.find((item) => item.id === loadedOrderId);
                      cancelIncomingOrder(loadedOrderId, order?.order_number || 'ticket cargado');
                    }}
                    disabled={cancellingOrderId === loadedOrderId}
                    className="shrink-0 text-xs text-red-100 hover:text-white font-bold border border-red-400/40 hover:border-red-300 rounded-lg px-2 py-1 transition disabled:opacity-50"
                  >
                    {cancellingOrderId === loadedOrderId ? 'Anulando...' : 'Anular'}
                  </button>
                </div>
              )}

              {/* Mesa billing indicator */}
          {billingOrderIds.length > 0 && selectedTableNumber && (
              <div className="mx-2 mt-2 pos-total-band rounded-xl px-3 py-2 flex items-center gap-2">
              <UtensilsCrossed className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-emerald-300 font-bold text-xs">Cobrando Mesa {selectedTableNumber}</p>
                <p className="text-emerald-400/70 text-xs">{billingOrderIds.length} ronda{billingOrderIds.length > 1 ? 's' : ''} acumulada{billingOrderIds.length > 1 ? 's' : ''}</p>
              </div>
              <button
                onClick={() => {
                  setCart([]);
                  setBillingOrderIds([]);
                  setSelectedTableId(null);
                  setSelectedTableNumber(null);
                  setSelectedStaffId(null);
                  setSelectedStaffName('');
                  setPosMode('simple');
                }}
                className="shrink-0 text-xs text-red-300 hover:text-red-100 font-bold border border-red-500/35 hover:border-red-400 rounded-lg px-2 py-1 transition"
              >
                Cancelar
              </button>
            </div>
          )}

          {/* Cart Items List */}
          <div className={`${isFullscreen ? 'flex-1 min-h-0 overflow-y-auto overscroll-contain pr-1 [scrollbar-gutter:stable]' : 'min-h-28 max-h-48 overflow-y-auto'}`}>
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-500 py-8">
                <ShoppingCart className="w-8 h-8 mb-2 opacity-30" />
                <p className="text-xs">Carrito vacío</p>
              </div>
            ) : (
              <div className={`${isFullscreen ? 'space-y-1 p-1.5 pb-3' : 'p-2 space-y-1'}`}>
                {cart.map((item) => (
                  <div key={item.menu_item_id} className={`pos-card flex items-center gap-2 rounded-xl px-2 ${isFullscreen ? 'py-1' : 'py-1.5'}`}>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-xs font-semibold truncate">{item.name}</p>
                      <p className="text-emerald-300 text-xs font-black">{formatPriceWithCurrency(item.price * item.quantity, currencyInfo.code, currencyInfo.locale)}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => updateQuantity(item.menu_item_id, item.quantity - 1)}
                        className="w-6 h-6 rounded-lg bg-white/10 hover:bg-white/16 text-white font-black text-sm flex items-center justify-center transition active:scale-90"
                      >
                        −
                      </button>
                      <span className="text-white font-bold text-xs w-5 text-center">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.menu_item_id, item.quantity + 1)}
                        className="w-6 h-6 rounded-lg bg-white/10 hover:bg-white/16 text-white font-black text-sm flex items-center justify-center transition active:scale-90"
                      >
                        +
                      </button>
                      <button
                        onClick={() => removeFromCart(item.menu_item_id)}
                        className="w-6 h-6 rounded-lg bg-red-500/16 hover:bg-red-500/26 text-red-300 hover:text-white font-black text-xs flex items-center justify-center transition active:scale-90 ml-0.5"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Discount Code */}
              <div className={`border-b border-white/10 ${isFullscreen ? 'px-2 py-1' : 'px-2 py-1'} space-y-1 text-xs`}>
            <div className="flex gap-1">
              <input
                type="text"
                placeholder="Código descuento"
                value={discountCode}
                onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                className="flex-1 px-2 py-1 rounded-lg outline-none text-white text-xs"
              />
              <button
                onClick={applyDiscountCode}
                className="px-3 py-1 rounded-lg bg-emerald-500/18 hover:bg-emerald-500/26 border border-emerald-400/30 text-emerald-100 font-black text-xs transition"
              >
                Aplicar
              </button>
            </div>
            {discount > 0 && (
              <p className="text-green-400 text-xs">Descuento: -{formatPriceWithCurrency(discount, currencyInfo.code, currencyInfo.locale)}</p>
            )}
          </div>

          {/* Totals */}
          <div className={`border-b border-white/10 ${isFullscreen ? 'px-2 py-1.5' : 'px-3 py-2'} ${isFullscreen ? 'space-y-1' : 'space-y-2'} bg-black/18 text-sm backdrop-blur-xl`}>
            <div className={`${isFullscreen ? 'space-y-1' : 'space-y-1.5'} text-xs`}>
              <div className="flex justify-between">
                <span className="text-slate-400">Subtotal:</span>
                <span className="font-semibold text-slate-200">{formatPriceWithCurrency(subtotal, currencyInfo.code, currencyInfo.locale)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between bg-green-500/20 px-2 py-1.5 rounded-lg border border-green-500/30">
                  <span className="text-green-400 font-medium">Descuento:</span>
                  <span className="font-bold text-green-300">-{formatPriceWithCurrency(discount, currencyInfo.code, currencyInfo.locale)}</span>
                </div>
              )}
              {taxRate > 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-400">IVA ({taxRate}%):</span>
                  <span className="font-semibold text-slate-200">{formatPriceWithCurrency(taxAmount, currencyInfo.code, currencyInfo.locale)}</span>
                </div>
              )}
              {activeDeliveryFee > 0 && (
                <div className="flex justify-between rounded-lg border border-amber-300/25 bg-amber-300/10 px-2 py-1">
                  <span className="text-amber-200 font-bold">Domicilio:</span>
                  <span className="font-black text-amber-100">{formatPriceWithCurrency(activeDeliveryFee, currencyInfo.code, currencyInfo.locale)}</span>
                </div>
              )}
            </div>
            <div className={`pos-total-band flex justify-between font-black px-2 rounded-xl ${isFullscreen ? 'py-1.5 text-sm' : 'pt-2 py-2 text-base'}`}>
              <span className="text-white">Total:</span>
              <span className={`text-emerald-300 ${isFullscreen ? 'text-base' : 'text-lg'}`}>{formatPriceWithCurrency(total, currencyInfo.code, currencyInfo.locale)}</span>
            </div>

          </div>

          {/* Mesa indicator + staff selector */}
          {selectedTableNumber ? (
            <div className="border-b border-white/10 px-2 py-2 space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <UtensilsCrossed className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-300 font-bold text-xs">Mesa {selectedTableNumber}</span>
                </div>
                <button
                  onClick={() => {
                    setSelectedTableId(null);
                    setSelectedTableNumber(null);
                    setSelectedStaffId(null);
                    setSelectedStaffName('');
                    setPosMode('simple');
                  }}
                  className="text-slate-500 hover:text-red-300 text-xs transition-colors"
                >
                  ✕ Quitar
                </button>
              </div>
              <POSStaffSelector
                tenantId={tenantId}
                selectedStaffId={selectedStaffId}
                onStaffSelect={(id, name) => {
                  setSelectedStaffId(id);
                  setSelectedStaffName(name);
                }}
                required
              />
            </div>
          ) : (
            <div className="border-b border-white/10 px-2 py-2 space-y-1.5">
              <p className="text-cyan-100/42 text-xs font-black uppercase">Tipo de pedido</p>
              <div className="grid grid-cols-2 gap-1">
                <button
                  onClick={() => setPosOrderType('takeaway')}
                  className={`py-1.5 rounded-lg text-xs font-bold transition ${
                    posOrderType === 'takeaway'
                      ? 'bg-cyan-300/18 text-cyan-50 border border-cyan-300/35'
                      : 'bg-white/10 text-slate-400 hover:text-slate-100 border border-white/10'
                  }`}
                >
                  🥡 Para llevar
                </button>
                <button
                  onClick={() => setPosOrderType('pickup')}
                  className={`py-1.5 rounded-lg text-xs font-bold transition ${
                    posOrderType === 'pickup'
                      ? 'bg-cyan-300/18 text-cyan-50 border border-cyan-300/35'
                      : 'bg-white/10 text-slate-400 hover:text-slate-100 border border-white/10'
                  }`}
                >
                  🏠 Para recoger
                </button>
                {deliveryEnabled && (
                  <button
                    onClick={() => setPosOrderType('delivery')}
                    className={`col-span-2 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold transition ${
                      posOrderType === 'delivery'
                        ? 'bg-amber-300/20 text-amber-50 border border-amber-300/45 shadow-lg shadow-amber-900/20'
                        : 'bg-white/10 text-slate-400 hover:text-slate-100 border border-white/10'
                    }`}
                    title="Pedido por llamada con cobro de domicilio"
                  >
                    <Truck className="h-3.5 w-3.5" />
                    Delivery + {formatPriceWithCurrency(currentDeliveryFee, currencyInfo.code, currencyInfo.locale)}
                  </button>
                )}
              </div>
              {posOrderType === 'delivery' && deliveryEnabled && deliveryZones.length > 0 && (
                <label className="block">
                  <span className="text-amber-100/70 text-xs font-black uppercase">Zona</span>
                  <select
                    value={selectedDeliveryZoneId}
                    onChange={(event) => setSelectedDeliveryZoneId(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-amber-300/30 bg-[#18130b] px-2 py-2 text-xs font-black text-amber-50 outline-none"
                  >
                    {deliveryZones.map(zone => (
                      <option key={zone.id} value={zone.id}>
                        {zone.name} - {formatPriceWithCurrency(zone.fee, currencyInfo.code, currencyInfo.locale)}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>
          )}

          {/* Payment Component */}
              <div className={`${isFullscreen ? 'px-2 py-1' : 'px-2 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] pt-1 lg:pb-1'}`}>
                <POSPayment
                  key={paymentResetKey}
                  total={paymentBaseTotal}
                  tip={tip}
                  onTipChange={setTip}
                  paymentMethod={paymentMethod}
                  onPaymentMethodChange={setPaymentMethod}
                  onProceedPayment={handleShowReceipt}
                  disabled={cart.length === 0 || (!!selectedTableNumber && !selectedStaffId && billingOrderIds.length === 0)}
                  loading={processingPayment}
                  country={country}
                  compact={isFullscreen}
                />
              </div>
            </>
          )}

          {/* Incoming Orders Panel */}
          {showIncomingPanel && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="p-2 border-b border-white/10 shrink-0">
                <button
                  onClick={() => {
                    setShowFindPayPanel(true);
                    setShowIncomingPanel(false);
                    setShowDineInPanel(false);
                  }}
                  className="w-full pos-action text-xs"
                  title="Buscar ticket del cliente para cobrar"
                >
                  <Search className="w-4 h-4" />
                  Buscar ticket para cobrar
                </button>
              </div>
              {incomingOrders.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-slate-500">
                  <div className="text-center">
                    <p className="text-3xl mb-2">📦</p>
                    <p className="text-sm">No hay pedidos pendientes</p>
                    <p className="text-xs text-muted-foreground mt-1">Los pedidos a domicilio y para recoger aparecerán aquí</p>
                  </div>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                  {incomingOrders.map((order) => (
                    <IncomingOrderCard
                      key={order.id}
                      order={order}
                      onUpdateStatus={async (orderId, status) => {
                        await fetch(`/api/orders/${orderId}`, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ status }),
                        });
                        await fetchIncomingOrders();
                      }}
                      onLoadForPayment={handleOrderSelected}
                      onPrintReceipt={printIncomingOrderReceipt}
                      onClearFromIncoming={clearIncomingOrder}
                      onCancelOrder={(order) => cancelIncomingOrder(order.id, order.order_number)}
                      cancelling={cancellingOrderId === order.id}
                      clearing={clearingIncomingOrderId === order.id}
                      printing={printingIncomingOrderId === order.id}
                      kdsEnabled={kdsEnabled}
                      currencyInfo={currencyInfo}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* New Order Notification */}
      {orderNotification && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-gray-900 border-2 border-emerald-500 rounded-2xl shadow-2xl shadow-emerald-900/40 px-5 py-4 flex items-start gap-3 max-w-sm w-full">
          <div className="bg-emerald-500/20 rounded-xl p-2 shrink-0">
            <UtensilsCrossed className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-black text-sm">
              🔔 Nueva comanda{orderNotification.tableNumber ? ` — Mesa ${orderNotification.tableNumber}` : ''}
            </p>
            {orderNotification.waiter && (
              <p className="text-emerald-400 text-xs mt-0.5">Mesero: {orderNotification.waiter}</p>
            )}
            <div className="mt-1.5 space-y-0.5">
              {orderNotification.items.slice(0, 5).map((item, i) => (
                <p key={i} className="text-gray-300 text-xs">{item}</p>
              ))}
              {orderNotification.items.length > 5 && (
                <p className="text-gray-500 text-xs">+{orderNotification.items.length - 5} más...</p>
              )}
            </div>
          </div>
          <button
            onClick={() => setOrderNotification(null)}
            className="text-gray-500 hover:text-white text-lg leading-none shrink-0 mt-0.5 transition-colors"
          >✕</button>
        </div>
      )}

      {/* Toast Notifications */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          duration={3000}
          onClose={() => setToast(null)}
        />
      )}

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
            staffName: selectedStaffName || getLoggedStaffFromBrowser(tenantId).staffName || 'Sin asignar',
          }}
          country={country}
          isLoading={closingLoading}
        />
      )}
    </div>
  );
}

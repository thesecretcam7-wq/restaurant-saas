/**
 * Types for thermal printer integration with WebUSB
 */

export type PrinterDeviceType = 'receipt' | 'kitchen' | 'scale';
export type PrinterStatus = 'connected' | 'disconnected' | 'error';
export type PrinterAction = 'connect' | 'disconnect' | 'print' | 'error' | 'config';
export type PrinterLogStatus = 'success' | 'failed';

export interface PrinterConfig {
  paper_width: 58 | 80;
  auto_print: boolean;
  copies: number;
  print_on_status: 'pending' | 'confirmed' | 'preparing';
  connection_mode?: 'webusb' | 'browser_driver';
  browser_printer_name?: string;
  local_bridge_enabled?: boolean;
  local_bridge_url?: string;
  cash_drawer_enabled?: boolean;
  allow_browser_print_fallback?: boolean;
}

export interface PrinterDevice {
  id: string;
  tenant_id: string;
  name: string;
  device_type: PrinterDeviceType;
  vendor_id: number | null;
  product_id: number | null;
  serial_number: string | null;
  is_default: boolean;
  status: PrinterStatus;
  last_used_at: string | null;
  config: PrinterConfig;
  created_at: string;
  updated_at: string;
}

export interface PrinterLog {
  id: string;
  tenant_id: string;
  device_id: string | null;
  action: PrinterAction;
  status: PrinterLogStatus | null;
  error_message: string | null;
  details: Record<string, any> | null;
  created_at: string;
}

export interface ReceiptData {
  orderId: string;
  orderNumber: string;
  restaurantName?: string;
  restaurantPhone?: string | null;
  items: Array<{
    menu_item_id: string;
    name: string;
    price: number;
    quantity: number;
  }>;
  subtotal: number;
  discount: number;
  tax?: number;
  taxRate?: number;
  deliveryFee?: number;
  total: number;
  amountPaid?: number;
  change: number;
  paymentMethod?: 'cash' | 'stripe' | 'card' | string | null;
  currencyInfo: {
    code: string;
    symbol: string;
    locale: string;
  };
  timestamp?: string;
  waiterName?: string;
  tableNumber?: number;
  notes?: string | null;
  openCashDrawer?: boolean;
}

export interface CashClosingReceiptData {
  closingId?: string;
  restaurantName?: string;
  restaurantPhone?: string | null;
  staffName: string;
  closedAt?: string;
  periodStart: string;
  periodEnd: string;
  cashSales: number;
  cardSales: number;
    otherSales: number;
    totalSales: number;
    totalDeliveryFees?: number;
    deliveryOrderCount?: number;
    totalTax: number;
  totalDiscount: number;
  expectedCash: number;
  actualCash: number;
  difference: number;
  transactionCount: number;
  ordersCompleted: number;
  ordersCancelled: number;
  notes?: string | null;
  currencyInfo: {
    code: string;
    symbol: string;
    locale: string;
  };
}

export interface KitchenTicketData {
  orderId?: string | null;
  orderNumber: string;
  restaurantName?: string;
  ticketType?: string;
  items: Array<{
    menu_item_id: string;
    name: string;
    quantity: number;
    notes?: string | null;
  }>;
  customerName?: string | null;
  deliveryType?: string | null;
  tableNumber?: number | null;
  waiterName?: string | null;
  notes?: string | null;
  timestamp?: string;
}

export interface WebUSBDevice {
  vendorId: number;
  productId: number;
  serialNumber?: string;
}

export interface PrinterRequestOptions {
  filters?: Array<{
    vendorId?: number;
    productId?: number;
  }>;
}

export interface ESCPOSCommand {
  buffer: Uint8Array;
  length: number;
}

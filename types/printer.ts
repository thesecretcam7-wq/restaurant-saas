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
  total: number;
  amountPaid?: number;
  change: number;
  currencyInfo: {
    code: string;
    symbol: string;
    locale: string;
  };
  timestamp?: string;
  waiterName?: string;
  tableNumber?: number;
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

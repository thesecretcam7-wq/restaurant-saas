/**
 * Thermal receipt generator for ESC/POS printers.
 * Supports 58mm and 80mm paper widths.
 */

import type { CashClosingReceiptData, ReceiptData } from '@/types/printer';
import { formatPriceWithCurrency } from '@/lib/currency';

interface ReceiptOptions {
  paperWidth: 58 | 80;
  copies: number;
  locale: string;
  openCashDrawer?: boolean;
}

const ESC = '\x1b';
const GS = '\x1d';

const SIZE_NORMAL = `${GS}!\x00`;
const SIZE_WIDE = `${GS}!\x10`;
const SIZE_2X = `${GS}!\x11`;
const BOLD_ON = `${ESC}E\x01`;
const BOLD_OFF = `${ESC}E\x00`;
const ALIGN_CENTER = `${ESC}a\x01`;
const ALIGN_LEFT = `${ESC}a\x00`;
const INIT = `${ESC}@`;

function cashDrawerPulseCommands(): string {
  return `${ESC}p\x00\x32\xfa${ESC}p\x01\x32\xfa`;
}

function cutCommands(): string {
  return `${GS}V\x00${ESC}i${GS}V\x42\x00`;
}

export function generateReceiptESCPOS(data: ReceiptData, options: ReceiptOptions): Uint8Array {
  const cols = options.paperWidth === 80 ? 48 : 32;
  const bytes: string[] = [];
  const push = (...s: string[]) => bytes.push(...s);
  const line = (s = '') => bytes.push(s + '\n');

  const sep = () => {
    push(SIZE_NORMAL);
    line('-'.repeat(cols));
  };

  push(INIT);

  push(ALIGN_CENTER, SIZE_2X, BOLD_ON);
  line(data.restaurantName ?? 'Restaurante');
  push(BOLD_OFF, SIZE_NORMAL);
  if (data.restaurantPhone) line(`Tel: ${data.restaurantPhone}`);

  push(BOLD_ON);
  line(data.orderNumber);
  push(BOLD_OFF);

  const ts = data.timestamp ? new Date(data.timestamp) : new Date();
  const receiptLocale = data.currencyInfo?.locale || options.locale || 'es-ES';
  line(`Fecha: ${ts.toLocaleDateString(receiptLocale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })}`);
  line(`Hora: ${ts.toLocaleTimeString(receiptLocale, {
    hour: '2-digit',
    minute: '2-digit',
  })}`);

  if (data.tableNumber) line(`Mesa: ${data.tableNumber}`);
  if (data.waiterName) line(`Empleado: ${data.waiterName}`);

  push(ALIGN_LEFT);
  sep();
  push(BOLD_ON);
  line(padR('Producto', cols - 12) + padL('Total', 12));
  push(BOLD_OFF);
  sep();

  for (const item of data.items) {
    const itemTotal = item.price * item.quantity;
    const priceStr = formatPrice(itemTotal, data);
    const nameStr = item.name.substring(0, Math.max(1, cols - priceStr.length - 1));
    line(padR(nameStr, cols - priceStr.length) + priceStr);
    if (item.quantity > 1) {
      const unitStr = formatPrice(item.price, data);
      line(`  x${item.quantity} - ${unitStr}`);
    }
  }

  sep();

  if (data.discount > 0 || (data.tax || 0) > 0) {
    const subStr = formatPrice(data.subtotal, data);
    line(padR('Subtotal:', cols - subStr.length) + subStr);
    if (data.discount > 0) {
      const disStr = '-' + formatPrice(data.discount, data);
      line(padR('Descuento:', cols - disStr.length) + disStr);
    }
    if ((data.tax || 0) > 0) {
      const taxStr = formatPrice(data.tax || 0, data);
      const taxLabel = data.taxRate ? `IVA ${data.taxRate}%:` : 'IVA:';
      line(padR(taxLabel, cols - taxStr.length) + taxStr);
    }
    if ((data.deliveryFee || 0) > 0) {
      const deliveryStr = formatPrice(data.deliveryFee || 0, data);
      line(padR('Domicilio:', cols - deliveryStr.length) + deliveryStr);
    }
  } else if ((data.deliveryFee || 0) > 0) {
    const deliveryStr = formatPrice(data.deliveryFee || 0, data);
    line(padR('Domicilio:', cols - deliveryStr.length) + deliveryStr);
  }

  sep();
  push(ALIGN_CENTER, SIZE_WIDE, BOLD_ON);
  line('TOTAL');
  line(formatPrice(data.total, data));
  push(BOLD_OFF, SIZE_NORMAL);

  sep();
  push(ALIGN_LEFT);
  if (data.amountPaid !== undefined) {
    const paidStr = formatPrice(data.amountPaid, data);
    const changeStr = formatPrice(data.change, data);
    line(padR('Recibido:', cols - paidStr.length) + paidStr);
    line(padR('Cambio:', cols - changeStr.length) + changeStr);
    sep();
  }

  push(ALIGN_CENTER);
  line('');
  push(BOLD_ON);
  line('Gracias por su compra');
  push(BOLD_OFF);
  line('');
  line('');

  if (options.openCashDrawer) {
    push(cashDrawerPulseCommands());
  }
  push(cutCommands());
  push(ALIGN_LEFT, SIZE_NORMAL);

  const receipt = bytes.join('');
  const copies = Array(Math.max(1, options.copies)).fill(receipt).join('');
  return new TextEncoder().encode(copies);
}

function formatPrice(amount: number, data: ReceiptData): string {
  return formatPriceWithCurrency(amount, data.currencyInfo.code, data.currencyInfo.locale);
}

function padR(text: string, width: number): string {
  return text.substring(0, width).padEnd(width, ' ');
}

function padL(text: string, width: number): string {
  return text.substring(0, width).padStart(width, ' ');
}

export function generateTestReceiptESCPOS(paperWidth: 58 | 80): Uint8Array {
  const testData: ReceiptData = {
    orderId: 'TEST-001',
    orderNumber: 'TEST-001',
    restaurantName: 'Mi Restaurante',
    items: [
      { menu_item_id: '1', name: 'Hamburguesa Doble', price: 15.5, quantity: 2 },
      { menu_item_id: '2', name: 'Coca-Cola 500ml', price: 3.5, quantity: 3 },
      { menu_item_id: '3', name: 'Papas Fritas', price: 5.0, quantity: 1 },
    ],
    subtotal: 52.0,
    discount: 0,
    total: 52.0,
    amountPaid: 60.0,
    change: 8.0,
    currencyInfo: { code: 'EUR', symbol: 'EUR', locale: 'es-ES' },
    timestamp: new Date().toISOString(),
  };

  return generateReceiptESCPOS(testData, { paperWidth, copies: 1, locale: 'es-ES' });
}

export function generateCashClosingReceiptESCPOS(
  data: CashClosingReceiptData,
  options: ReceiptOptions
): Uint8Array {
  const cols = options.paperWidth === 80 ? 48 : 32;
  const bytes: string[] = [];
  const push = (...s: string[]) => bytes.push(...s);
  const line = (s = '') => bytes.push(s + '\n');
  const sep = () => {
    push(SIZE_NORMAL);
    line('-'.repeat(cols));
  };
  const money = (amount: number) =>
    formatPriceWithCurrency(amount, data.currencyInfo.code, data.currencyInfo.locale);
  const row = (label: string, value: string) => {
    const cleanLabel = label.substring(0, Math.max(1, cols - value.length - 1));
    line(padR(cleanLabel, cols - value.length) + value);
  };
  const ts = data.closedAt ? new Date(data.closedAt) : new Date();
  const periodStart = new Date(data.periodStart);
  const periodEnd = new Date(data.periodEnd);

  push(INIT);
  push(ALIGN_CENTER, SIZE_2X, BOLD_ON);
  line(data.restaurantName ?? 'Restaurante');
  push(BOLD_OFF, SIZE_NORMAL);
  if (data.restaurantPhone) line(`Tel: ${data.restaurantPhone}`);
  line('');
  push(BOLD_ON, SIZE_WIDE);
  line('CIERRE DE CAJA');
  push(BOLD_OFF, SIZE_NORMAL);
  if (data.closingId) line(`ID: ${data.closingId.slice(0, 8)}`);
  line(`Fecha: ${ts.toLocaleDateString(data.currencyInfo.locale)}`);
  line(`Hora: ${ts.toLocaleTimeString(data.currencyInfo.locale, { hour: '2-digit', minute: '2-digit' })}`);
  line(`Empleado: ${data.staffName}`);
  line('');
  line('Periodo');
  line(periodStart.toLocaleString(data.currencyInfo.locale));
  line(periodEnd.toLocaleString(data.currencyInfo.locale));
  push(ALIGN_LEFT);

  sep();
  push(BOLD_ON);
  line('RESUMEN DE VENTAS');
  push(BOLD_OFF);
  row('Efectivo:', money(data.cashSales));
  row('Tarjeta:', money(data.cardSales));
  row('Otros:', money(data.otherSales));
  row('Impuestos:', money(data.totalTax));
  if (data.totalDiscount > 0) row('Descuentos:', money(data.totalDiscount));
  sep();
  push(BOLD_ON);
  row('TOTAL VENTAS:', money(data.totalSales));
  push(BOLD_OFF);

  sep();
  push(BOLD_ON);
  line('CUADRE DE EFECTIVO');
  push(BOLD_OFF);
  row('Esperado:', money(data.expectedCash));
  row('Contado:', money(data.actualCash));
  row('Diferencia:', money(data.difference));
  row('Transacciones:', String(data.transactionCount));
  row('Completadas:', String(data.ordersCompleted));
  row('Canceladas:', String(data.ordersCancelled));

  if (data.notes) {
    sep();
    line('Notas:');
    line(data.notes.substring(0, cols * 4));
  }

  sep();
  push(ALIGN_CENTER);
  line('');
  line('Cierre guardado en Eccofood');
  line('');
  line('');
  push(cutCommands());
  push(ALIGN_LEFT, SIZE_NORMAL);

  const receipt = bytes.join('');
  const copies = Array(Math.max(1, options.copies)).fill(receipt).join('');
  return new TextEncoder().encode(copies);
}

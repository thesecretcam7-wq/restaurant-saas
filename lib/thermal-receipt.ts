/**
 * Thermal receipt generator for ESC/POS printers
 * Supports 58mm and 80mm paper widths
 */

import type { ReceiptData } from '@/types/printer';
import { formatPriceWithCurrency } from '@/lib/currency';

interface ReceiptOptions {
  paperWidth: 58 | 80;
  copies: number;
  locale: string;
}

// ESC/POS command constants
const ESC = '\x1b';
const GS  = '\x1d';

const SIZE_NORMAL  = `${GS}!\x00`;  // 1x1
const SIZE_2X      = `${GS}!\x11`;  // 2x wide + 2x tall (confirmed working)
const BOLD_ON      = `${ESC}E\x01`;
const BOLD_OFF     = `${ESC}E\x00`;
const ALIGN_CENTER = `${ESC}a\x01`;
const ALIGN_LEFT   = `${ESC}a\x00`;
const INIT         = `${ESC}@`;

export function generateReceiptESCPOS(data: ReceiptData, options: ReceiptOptions): Uint8Array {
  // Normal column widths
  const cols = options.paperWidth === 80 ? 48 : 32;
  // Body uses SIZE_2X → half the characters per line
  const bCols = Math.floor(cols / 2);

  const bytes: string[] = [];
  const push = (...s: string[]) => bytes.push(...s);
  const line = (s = '') => bytes.push(s + '\n');

  // Separator: always printed in SIZE_NORMAL so dashes span full paper width
  const sep = () => {
    push(SIZE_NORMAL);
    line('-'.repeat(cols));
    push(SIZE_2X);
  };

  // ── Init ─────────────────────────────────────────────────────────────────
  push(INIT);

  // ── Restaurant name (big centered) ───────────────────────────────────────
  push(ALIGN_CENTER, SIZE_2X, BOLD_ON);
  line(data.restaurantName ?? 'Restaurante');
  push(BOLD_OFF);

  // ── Order number (centered) ───────────────────────────────────────────────
  push(BOLD_ON);
  line(data.orderNumber);
  push(BOLD_OFF);

  // ── Date/time ─────────────────────────────────────────────────────────────
  const ts = data.timestamp ? new Date(data.timestamp) : new Date();
  line(ts.toLocaleString('es-CO', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }));

  // ── Table / waiter ────────────────────────────────────────────────────────
  if (data.tableNumber) line(`Mesa: ${data.tableNumber}`);
  if (data.waiterName)  line(`Mesero: ${data.waiterName}`);

  // ── Items ─────────────────────────────────────────────────────────────────
  push(ALIGN_LEFT);
  sep();

  push(BOLD_ON);
  // Header: product name left, price right (in bCols space)
  line(padR('Producto', bCols - 8) + padL('Total', 8));
  push(BOLD_OFF);
  sep();

  for (const item of data.items) {
    const itemTotal = item.price * item.quantity;
    const priceStr  = formatPrice(itemTotal, data);
    // Line 1: name + price
    const nameStr = item.name.substring(0, bCols - priceStr.length - 1);
    line(padR(nameStr, bCols - priceStr.length) + priceStr);
    // Line 2: quantity (only if > 1 or price info useful)
    if (item.quantity > 1) {
      const unitStr = formatPrice(item.price, data);
      line(padL(`x${item.quantity} × ${unitStr}`, bCols));
    }
  }

  sep();

  // ── Subtotal / discount ───────────────────────────────────────────────────
  if (data.discount > 0 || (data.tax || 0) > 0) {
    const subStr = formatPrice(data.subtotal, data);
    line(padR('Subtotal:', bCols - subStr.length) + subStr);
    if (data.discount > 0) {
      const disStr = '-' + formatPrice(data.discount, data);
      line(padR('Descuento:', bCols - disStr.length) + disStr);
    }
    if ((data.tax || 0) > 0) {
      const taxStr = formatPrice(data.tax || 0, data);
      const taxLabel = data.taxRate ? `IVA ${data.taxRate}%:` : 'IVA:';
      line(padR(taxLabel, bCols - taxStr.length) + taxStr);
    }
  }

  // ── TOTAL (big centered) ──────────────────────────────────────────────────
  sep();
  push(ALIGN_CENTER, BOLD_ON);
  line('TOTAL');
  line(formatPrice(data.total, data));
  push(BOLD_OFF);

  // ── Payment info ──────────────────────────────────────────────────────────
  sep();
  push(ALIGN_LEFT);
  if (data.amountPaid !== undefined) {
    const paidStr   = formatPrice(data.amountPaid, data);
    const changeStr = formatPrice(data.change, data);
    line(padR('Recibido:', bCols - paidStr.length) + paidStr);
    line(padR('Cambio:', bCols - changeStr.length) + changeStr);
    sep();
  }

  // ── Footer ────────────────────────────────────────────────────────────────
  push(ALIGN_CENTER);
  line('');
  push(BOLD_ON);
  line('Gracias por su compra');
  push(BOLD_OFF);
  line('');
  line('');
  line('');

  // ── Cut ───────────────────────────────────────────────────────────────────
  push(`${GS}V\x42\x00`); // Full cut
  push(ALIGN_LEFT, SIZE_NORMAL);

  // ── Assemble & encode ─────────────────────────────────────────────────────
  const receipt = bytes.join('');
  const copies  = Array(Math.max(1, options.copies)).fill(receipt).join('');
  return new TextEncoder().encode(copies);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatPrice(amount: number, data: ReceiptData): string {
  return formatPriceWithCurrency(amount, data.currencyInfo.code, data.currencyInfo.locale);
}

function padR(text: string, width: number): string {
  return text.substring(0, width).padEnd(width, ' ');
}

function padL(text: string, width: number): string {
  return text.substring(0, width).padStart(width, ' ');
}

// ── Test receipt ──────────────────────────────────────────────────────────────

export function generateTestReceiptESCPOS(paperWidth: 58 | 80): Uint8Array {
  const testData: ReceiptData = {
    orderId:        'TEST-001',
    orderNumber:    'TEST-001',
    restaurantName: 'Mi Restaurante',
    items: [
      { menu_item_id: '1', name: 'Hamburguesa Doble', price: 15.5,  quantity: 2 },
      { menu_item_id: '2', name: 'Coca-Cola 500ml',   price: 3.5,   quantity: 3 },
      { menu_item_id: '3', name: 'Papas Fritas',      price: 5.0,   quantity: 1 },
    ],
    subtotal:     52.0,
    discount:     0,
    total:        52.0,
    amountPaid:   60.0,
    change:       8.0,
    currencyInfo: { code: 'COP', symbol: '$', locale: 'es-CO' },
    timestamp:    new Date().toISOString(),
  };

  return generateReceiptESCPOS(testData, { paperWidth, copies: 1, locale: 'es-CO' });
}

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

// Text size
const SIZE_NORMAL     = `${GS}!\x00`;       // 1x1
const SIZE_2X         = `${GS}!\x11`;       // 2x wide + 2x tall
const SIZE_TALL       = `${GS}!\x10`;       // 2x tall only (legible body text)
const BOLD_ON         = `${ESC}E\x01`;
const BOLD_OFF        = `${ESC}E\x00`;
const ALIGN_CENTER    = `${ESC}a\x01`;
const ALIGN_LEFT      = `${ESC}a\x00`;
const ALIGN_RIGHT     = `${ESC}a\x02`;
const INIT            = `${ESC}@`;

// Alias: body text uses SIZE_TALL for readability on 58mm paper
const BODY = SIZE_TALL;

export function generateReceiptESCPOS(data: ReceiptData, options: ReceiptOptions): Uint8Array {
  // 58mm → 32 chars/line normal | 16 chars/line in double-width
  // 80mm → 48 chars/line normal | 24 chars/line in double-width
  const cols = options.paperWidth === 80 ? 48 : 32;

  const bytes: string[] = [];

  const push = (...s: string[]) => bytes.push(...s);
  const line = (s = '') => bytes.push(s + '\n');
  const sep  = () => line('-'.repeat(cols));

  // ── Init ──────────────────────────────────────────────────────────────────
  push(INIT);

  // ── Restaurant name (big centered) ────────────────────────────────────────
  push(ALIGN_CENTER, SIZE_2X, BOLD_ON);
  line(data.restaurantName ?? 'Restaurante');
  push(BOLD_OFF, SIZE_NORMAL);

  // ── Order number (centered, bold) ─────────────────────────────────────────
  push(BOLD_ON);
  line(data.orderNumber);
  push(BOLD_OFF);

  // ── Date/time ─────────────────────────────────────────────────────────────
  push(BODY);
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

  // Column widths: name | qty | price
  const priceW = 10;
  const qtyW   = 4;
  const nameW  = cols - qtyW - priceW;

  push(BOLD_ON);
  line(padR('Producto', nameW) + padL('Qty', qtyW) + padL('Total', priceW));
  push(BOLD_OFF);
  sep();

  for (const item of data.items) {
    const itemTotal = item.price * item.quantity;
    const priceStr  = formatPrice(itemTotal, data);
    const qtyStr    = `x${item.quantity}`;

    // If name fits in one row
    const nameStr = item.name.substring(0, nameW);
    line(padR(nameStr, nameW) + padL(qtyStr, qtyW) + padL(priceStr, priceW));

    // Name overflow on second line
    if (item.name.length > nameW) {
      line('  ' + item.name.substring(nameW, nameW + nameW - 2));
    }
  }

  sep();

  // ── Subtotal / discount ───────────────────────────────────────────────────
  if (data.discount > 0) {
    line(padR('Subtotal:', cols - 10) + padL(formatPrice(data.subtotal, data), 10));
    line(padR('Descuento:', cols - 10) + padL('-' + formatPrice(data.discount, data), 10));
  }

  // ── TOTAL (big) ───────────────────────────────────────────────────────────
  sep();
  push(ALIGN_CENTER, SIZE_2X, BOLD_ON);
  line('TOTAL');
  line(formatPrice(data.total, data));
  push(BOLD_OFF, BODY, ALIGN_LEFT);
  sep();

  // ── Payment info ──────────────────────────────────────────────────────────
  if (data.amountPaid !== undefined) {
    line(padR('Recibido:', cols - 10) + padL(formatPrice(data.amountPaid, data), 10));
    line(padR('Cambio:', cols - 10) + padL(formatPrice(data.change, data), 10));
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

  push(ALIGN_LEFT, SIZE_NORMAL); // reset before cut

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

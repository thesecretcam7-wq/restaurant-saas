/**
 * Thermal receipt generator for ESC/POS printers
 * Supports 58mm and 80mm paper widths
 * Multi-currency support with locale-aware formatting
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
const GS = '\x1d';

export function generateReceiptESCPOS(data: ReceiptData, options: ReceiptOptions): Uint8Array {
  const lines: string[] = [];

  // Set up paper width (characters per line)
  const charsPerLine = options.paperWidth === 80 ? 40 : 32;

  // Initialize printer
  lines.push(`${ESC}@`); // Initialize

  // Print banner (restaurant name, date/time)
  lines.push(`${ESC}E\x01`); // Bold on
  lines.push(centerText('Restaurant SaaS', charsPerLine));
  lines.push(`${ESC}E\x00`); // Bold off
  lines.push(centerText(`Orden: ${data.orderNumber}`, charsPerLine));

  const timestamp = data.timestamp ? new Date(data.timestamp) : new Date();
  const dateStr = timestamp.toLocaleDateString(data.currencyInfo.locale);
  const timeStr = timestamp.toLocaleTimeString(data.currencyInfo.locale, {
    hour: '2-digit',
    minute: '2-digit',
  });
  lines.push(centerText(`${dateStr} ${timeStr}`, charsPerLine));

  // Separator
  lines.push('-'.repeat(charsPerLine));

  // Items header
  lines.push(`${ESC}E\x01`); // Bold
  lines.push(
    padRight('Artículo', 20) + padLeft('Qty', 5) + padLeft('Total', 15)
  );
  lines.push(`${ESC}E\x00`); // Bold off
  lines.push('-'.repeat(charsPerLine));

  // Items
  for (const item of data.items) {
    const name = item.name.substring(0, 20);
    const itemTotal = item.price * item.quantity;
    const totalFormatted = formatPriceWithCurrency(
      itemTotal,
      data.currencyInfo.code,
      data.currencyInfo.locale
    );

    lines.push(
      padRight(name, 20) +
        padLeft(item.quantity.toString(), 5) +
        padLeft(totalFormatted, 15)
    );

    // Print price per unit if different from total
    if (item.quantity > 1) {
      const unitPrice = formatPriceWithCurrency(
        item.price,
        data.currencyInfo.code,
        data.currencyInfo.locale
      );
      lines.push(
        padRight(`  @ ${unitPrice}`, 20) + ' '.repeat(20)
      );
    }
  }

  // Separator
  lines.push('-'.repeat(charsPerLine));

  // Subtotal
  const subtotalFormatted = formatPriceWithCurrency(
    data.subtotal,
    data.currencyInfo.code,
    data.currencyInfo.locale
  );
  lines.push(
    padRight('Subtotal:', charsPerLine - subtotalFormatted.length) + subtotalFormatted
  );

  // Discount (if any)
  if (data.discount > 0) {
    const discountFormatted = formatPriceWithCurrency(
      data.discount,
      data.currencyInfo.code,
      data.currencyInfo.locale
    );
    lines.push(
      padRight('Descuento:', charsPerLine - discountFormatted.length) + discountFormatted
    );
  }

  // Total
  lines.push('-'.repeat(charsPerLine));
  lines.push(`${ESC}E\x01`); // Bold
  const totalFormatted = formatPriceWithCurrency(
    data.total,
    data.currencyInfo.code,
    data.currencyInfo.locale
  );
  lines.push(
    padRight('TOTAL:', charsPerLine - totalFormatted.length) + totalFormatted
  );
  lines.push(`${ESC}E\x00`); // Bold off

  // Payment information (if cash payment)
  if (data.amountPaid !== undefined) {
    lines.push('-'.repeat(charsPerLine));
    const amountPaidFormatted = formatPriceWithCurrency(
      data.amountPaid,
      data.currencyInfo.code,
      data.currencyInfo.locale
    );
    lines.push(
      padRight('Monto Recibido:', charsPerLine - amountPaidFormatted.length) +
        amountPaidFormatted
    );

    const changeFormatted = formatPriceWithCurrency(
      data.change,
      data.currencyInfo.code,
      data.currencyInfo.locale
    );
    lines.push(
      padRight('Cambio:', charsPerLine - changeFormatted.length) + changeFormatted
    );
  }

  // Footer
  lines.push('');
  lines.push(centerText('Gracias por su compra', charsPerLine));
  lines.push('');

  // Add optional waiter/table info
  if (data.waiterName || data.tableNumber) {
    lines.push('-'.repeat(charsPerLine));
    if (data.waiterName) {
      lines.push(`Mesero: ${data.waiterName}`);
    }
    if (data.tableNumber) {
      lines.push(`Mesa: ${data.tableNumber}`);
    }
  }

  // Cut paper
  lines.push(`${GS}V\x42`); // Full cut

  // Print multiple copies
  const fullReceipt = lines.join('\n');
  const commands = fullReceipt.repeat(options.copies);

  // Convert to Uint8Array
  return new TextEncoder().encode(commands);
}

/**
 * Helper: Center text in a line
 */
function centerText(text: string, lineWidth: number): string {
  const padding = Math.max(0, Math.floor((lineWidth - text.length) / 2));
  return ' '.repeat(padding) + text;
}

/**
 * Helper: Pad string to the right
 */
function padRight(text: string, width: number): string {
  return text.substring(0, width).padEnd(width, ' ');
}

/**
 * Helper: Pad string to the left
 */
function padLeft(text: string, width: number): string {
  return text.substring(0, width).padStart(width, ' ');
}

/**
 * Generate test receipt for printer configuration
 */
export function generateTestReceiptESCPOS(paperWidth: 58 | 80): Uint8Array {
  const testData: ReceiptData = {
    orderId: 'TEST-001',
    orderNumber: 'TEST-001',
    items: [
      { menu_item_id: '1', name: 'Test Item 1', price: 10.5, quantity: 2 },
      { menu_item_id: '2', name: 'Test Item 2', price: 25.75, quantity: 1 },
    ],
    subtotal: 46.75,
    discount: 0,
    total: 46.75,
    change: 0,
    currencyInfo: {
      code: 'EUR',
      symbol: '€',
      locale: 'es-ES',
    },
    timestamp: new Date().toISOString(),
  };

  return generateReceiptESCPOS(testData, {
    paperWidth,
    copies: 1,
    locale: 'es-ES',
  });
}

/**
 * Main printer utility for POS system
 * Handles device discovery, connection, and printing
 */

import { createClient } from '@/lib/supabase/client';
import { generateReceiptESCPOS, generateTestReceiptESCPOS } from './thermal-receipt';
import type { ReceiptData, PrinterDevice } from '@/types/printer';
import { formatPriceWithCurrency } from '@/lib/currency';

// WebUSB API type declarations
declare global {
  interface USBDevice {
    opened: boolean;
    vendorId: number;
    productId: number;
    serialNumber?: string;
    manufacturer?: string;
    product?: string;
    productName?: string;
    configuration?: any;
    open(): Promise<void>;
    close(): Promise<void>;
    selectConfiguration(configurationValue: number): Promise<void>;
    claimInterface(interfaceNumber: number): Promise<void>;
    releaseInterface(interfaceNumber: number): Promise<void>;
    transferOut(endpointNumber: number, data: BufferSource | Uint8Array): Promise<any>;
    transferIn(endpointNumber: number, length: number): Promise<any>;
    reset(): Promise<void>;
  }

  interface USB {
    requestDevice(options?: any): Promise<USBDevice | null>;
    getDevices(): Promise<USBDevice[]>;
    addEventListener(type: string, listener: EventListener): void;
    removeEventListener(type: string, listener: EventListener): void;
  }

  interface Navigator {
    usb?: USB;
  }
}

let _supabase: ReturnType<typeof createClient> | null = null;
const getSupabase = () => {
  if (!_supabase) _supabase = createClient();
  return _supabase;
};

function getCachedPrinterKey(tenantId: string, printerId: string) {
  return `eccofood-printer-${tenantId}-${printerId}`;
}

function cachePrinterConfig(tenantId: string, printerId: string, printer: any) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(getCachedPrinterKey(tenantId, printerId), JSON.stringify(printer));
  } catch {
    // Local printer cache is best-effort only.
  }
}

function getCachedPrinterConfig(tenantId: string, printerId: string) {
  if (typeof window === 'undefined') return null;
  try {
    const cached = localStorage.getItem(getCachedPrinterKey(tenantId, printerId));
    return cached ? JSON.parse(cached) : null;
  } catch {
    return null;
  }
}

function cacheDefaultReceiptPrinter(tenantId: string, printerId: string) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`eccofood-default-receipt-printer-${tenantId}`, printerId);
  } catch {}
}

function getCachedDefaultReceiptPrinter(tenantId: string) {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(`eccofood-default-receipt-printer-${tenantId}`);
  } catch {
    return null;
  }
}

function isBrowserDriverPrinter(printer: PrinterDevice) {
  return printer.config?.connection_mode === 'browser_driver' || (!printer.vendor_id && !printer.product_id);
}

/**
 * Print receipt to a configured printer
 * @param tenantId - Restaurant/tenant ID
 * @param printerId - Printer device ID from database
 * @param data - Receipt data with order details
 * @throws Error if printer not found or connection fails
 */
export async function printReceipt(
  tenantId: string,
  printerId: string,
  data: ReceiptData
): Promise<void> {
  try {
    // 1. Get printer configuration from database
    let { data: printer, error: printerError } = await getSupabase()
      .from('printer_devices')
      .select('*')
      .eq('id', printerId)
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (printer) {
      cachePrinterConfig(tenantId, printerId, printer);
      cacheDefaultReceiptPrinter(tenantId, printerId);
    } else {
      printer = getCachedPrinterConfig(tenantId, printerId);
    }

    if (printerError && !printer) {
      throw new Error('Printer not found or not configured');
    }

    if (!printer) {
      throw new Error('Printer not found or not configured');
    }

    // 2. Generate ESC/POS commands
    const escPosData = generateReceiptESCPOS(data, {
      paperWidth: printer.config.paper_width || 80,
      copies: printer.config.copies || 1,
      locale: data.currencyInfo.locale,
    });

    // 3. Browser-side printing. Windows driver mode uses the system print flow.
    if (isBrowserDriverPrinter(printer)) {
      printViaBrowserAPI(data);
    } else if (typeof navigator !== 'undefined' && 'usb' in navigator) {
      await printViaWebUSB(printer, escPosData);
    } else {
      // Fallback to browser print dialog
      console.warn('WebUSB not available, using browser print dialog');
      printViaBrowserAPI(data);
    }

    // 4. Log successful print
    await savePrinterLog(tenantId, printerId, 'print', 'success', {
      orderNumber: data.orderNumber,
      amount: data.total,
    });

    // Update device last_used_at. This is best-effort so offline printing can still succeed.
    try {
      await getSupabase()
        .from('printer_devices')
        .update({ last_used_at: new Date().toISOString() })
        .eq('id', printerId)
        .eq('tenant_id', tenantId);
    } catch {}
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('Print error:', errorMsg);

    await savePrinterLog(tenantId, printerId, 'print', 'failed', {
      error: errorMsg,
    });
    throw new Error(errorMsg);
  }
}

/**
 * Print via WebUSB (native printer connection)
 */
async function printViaWebUSB(printer: PrinterDevice, data: Uint8Array): Promise<void> {
  try {
    // Get authorized devices
    if (!navigator.usb) {
      throw new Error('WebUSB no está disponible en este navegador');
    }
    const devices = await navigator.usb.getDevices();

    // Find matching device by vendor/product IDs
    const device = devices.find(
      (d: USBDevice) => d.vendorId === printer.vendor_id && d.productId === printer.product_id
    );

    if (!device) {
      throw new Error(
        `Printer device not found. Please authorize it in printer settings.`
      );
    }

    // Open device if not already open
    if (!device.opened) {
      await device.open();
    }

    // Select configuration if not already selected
    if (!device.configuration) {
      await device.selectConfiguration(1);
    }

    const configuration = device.configuration;
    if (!configuration) {
      throw new Error('Device configuration not available');
    }

    const interfaceData = configuration.interfaces[0];
    if (!interfaceData) {
      throw new Error('No interface found on device');
    }

    // Claim interface before transferOut (required by WebUSB spec)
    try {
      await device.claimInterface(interfaceData.interfaceNumber);
    } catch {
      // May already be claimed from previous print — continue
    }

    const alternate = interfaceData.alternates[0];
    const outEndpoint = alternate?.endpoints.find((e: any) => e.direction === 'out');

    if (!outEndpoint) {
      throw new Error('No OUT endpoint found on printer device');
    }

    // Send data to printer
    await device.transferOut(outEndpoint.endpointNumber, data as BufferSource);
  } catch (error) {
    throw new Error(`WebUSB print failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Fallback: Print via browser print dialog
 * Generates HTML and opens print dialog
 */
function printViaBrowserAPI(data: ReceiptData): void {
  try {
    const html = generateReceiptHTML(data);
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const frameWindow = iframe.contentWindow;
    const frameDocument = iframe.contentDocument || frameWindow?.document;
    if (!frameWindow || !frameDocument) {
      throw new Error('No se pudo preparar la impresion del navegador');
    }

    frameDocument.open();
    frameDocument.write(html);
    frameDocument.close();

    setTimeout(() => {
      frameWindow.focus();
      frameWindow.print();
      setTimeout(() => iframe.remove(), 1000);
    }, 250);
  } catch (error) {
    console.error('Browser print failed:', error);
  }
}

/**
 * Generate HTML for browser printing (fallback)
 */
function generateReceiptHTML(data: ReceiptData): string {
  const printedAt = data.timestamp ? new Date(data.timestamp) : new Date();
  const locale = data.currencyInfo?.locale || 'es-ES';
  const money = (amount: number) => formatPriceWithCurrency(amount, data.currencyInfo.code, locale);
  const safe = (value: string | number | null | undefined) =>
    String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  const itemsHTML = data.items
    .map(
      (item) =>
        `<tr>
        <td>${safe(item.name)}</td>
        <td class="number">${item.quantity}</td>
        <td class="number">${money(item.price * item.quantity)}</td>
      </tr>`
    )
    .join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Recibo ${safe(data.orderNumber)}</title>
      <style>
        @page {
          size: 80mm auto;
          margin: 0;
        }
        * {
          box-sizing: border-box;
        }
        html, body {
          width: 80mm;
          height: auto;
          min-height: 0;
          margin: 0;
          padding: 0;
          background: #fff;
          color: #000;
          overflow: visible;
        }
        body {
          font-family: 'Courier New', Courier, monospace;
          font-size: 18px;
          font-weight: 700;
          line-height: 1.18;
          padding: 3mm 3mm 1mm;
        }
        .receipt {
          width: 74mm;
          break-after: avoid;
          page-break-after: avoid;
        }
        .header {
          text-align: center;
          font-weight: bold;
          margin-bottom: 4px;
          font-size: 21px;
        }
        .meta {
          text-align: center;
          font-size: 15px;
          font-weight: 800;
          margin: 2px 0;
        }
        .number {
          text-align: right;
          white-space: nowrap;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 8px 0;
        }
        th {
          font-size: 16px;
          text-align: left;
          border-bottom: 2px solid #000;
          padding: 4px 1px;
        }
        td {
          padding: 5px 1px;
          border-bottom: 1px dashed #000;
          vertical-align: top;
        }
        .total-row {
          font-weight: bold;
          font-size: 23px;
        }
        .footer {
          text-align: center;
          margin-top: 6px;
          font-size: 16px;
          font-weight: 800;
        }
        hr {
          border: 0;
          border-top: 2px solid #000;
          margin: 7px 0;
        }
        @media print {
          html, body {
            height: auto;
            min-height: 0;
            margin: 0;
            overflow: visible;
          }
          .receipt {
            break-after: avoid;
            page-break-after: avoid;
          }
          button { display: none !important; }
        }
      </style>
    </head>
    <body>
      <div class="receipt">
      <div class="header">${safe(data.restaurantName || 'Restaurante')}</div>
      ${data.restaurantPhone ? `<div class="meta">Tel: ${safe(data.restaurantPhone)}</div>` : ''}
      <div class="meta">Fecha: ${printedAt.toLocaleDateString(locale)}</div>
      <div class="meta">Hora: ${printedAt.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}</div>
      <div class="header">Orden: ${safe(data.orderNumber)}</div>
      <hr>
      <table>
        <tr>
          <th>Artículo</th>
          <th class="number">Qty</th>
          <th class="number">Total</th>
        </tr>
        ${itemsHTML}
      </table>
      <hr>
      <table>
        <tr>
          <td>Subtotal:</td>
          <td class="number">${money(data.subtotal)}</td>
        </tr>
        ${
          data.discount > 0
            ? `<tr>
          <td>Descuento:</td>
          <td class="number">-${money(data.discount)}</td>
        </tr>`
            : ''
        }
        ${
          (data.tax || 0) > 0
            ? `<tr>
          <td>IVA${data.taxRate ? ` ${data.taxRate}%` : ''}:</td>
          <td class="number">${money(data.tax || 0)}</td>
        </tr>`
            : ''
        }
        <tr class="total-row">
          <td>TOTAL:</td>
          <td class="number">${money(data.total)}</td>
        </tr>
      </table>
      <div class="footer">
        <p>Gracias por su compra</p>
      </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Save printer log entry to database
 */
export async function savePrinterLog(
  tenantId: string,
  deviceId: string | null,
  action: string,
  status: 'success' | 'failed',
  details?: Record<string, any>
): Promise<void> {
  try {
    await getSupabase().from('printer_logs').insert({
      tenant_id: tenantId,
      device_id: deviceId,
      action,
      status,
      details,
    });
  } catch (error) {
    console.error('Failed to save printer log:', error);
    // Don't throw - logging failures shouldn't affect operations
  }
}

/**
 * Test printer by printing a test receipt
 */
export async function testPrinterConnection(
  tenantId: string,
  printerId: string
): Promise<{ success: boolean; message: string }> {
  try {
    const { data: printer } = await getSupabase()
      .from('printer_devices')
      .select('*')
      .eq('id', printerId)
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (!printer) {
      return { success: false, message: 'Impresora no encontrada' };
    }

    const testData = generateTestReceiptESCPOS(printer.config.paper_width || 80);

    if (isBrowserDriverPrinter(printer)) {
      printViaBrowserAPI({
        orderId: 'test',
        orderNumber: 'TEST',
        restaurantName: 'Eccofood',
        items: [{ menu_item_id: 'test', name: 'Prueba impresora', price: 0, quantity: 1 }],
        subtotal: 0,
        discount: 0,
        total: 0,
        change: 0,
        currencyInfo: { code: 'EUR', symbol: '€', locale: 'es-ES' },
        timestamp: new Date().toISOString(),
      });
    } else if (typeof navigator !== 'undefined' && 'usb' in navigator) {
      await printViaWebUSB(printer, testData);
    } else {
      throw new Error('WebUSB not available');
    }


    await savePrinterLog(tenantId, printerId, 'print', 'success', {
      test: true,
    });

    return { success: true, message: 'Página de prueba impresa exitosamente' };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);

    await savePrinterLog(tenantId, printerId, 'print', 'failed', {
      test: true,
      error: errorMsg,
    });

    return { success: false, message: `Error al imprimir: ${errorMsg}` };
  }
}

/**
 * Open cash drawer via ESC/POS command through the configured printer.
 * Uses ESC p 0 t1 t2 (pin 2, 50ms pulse) — standard for most USB thermal printers.
 * Falls back gracefully if no printer is configured.
 */
export async function openCashDrawer(tenantId: string): Promise<void> {
  try {
    if (typeof navigator === 'undefined' || !('usb' in navigator) || !navigator.usb) {
      throw new Error('WebUSB no esta disponible para abrir el cajon');
    }

    // ESC p m t1 t2 — open drawer on pin 2
    const drawerCmd = new Uint8Array([0x1b, 0x70, 0x00, 0x19, 0xfa]);

    const { data: settings } = await getSupabase()
      .from('restaurant_settings')
      .select('default_receipt_printer_id')
      .eq('tenant_id', tenantId)
      .maybeSingle();

    const printerId = settings?.default_receipt_printer_id || getCachedDefaultReceiptPrinter(tenantId);

    if (!printerId) {
      throw new Error('No hay impresora de recibos predeterminada');
    }

    let { data: printer } = await getSupabase()
      .from('printer_devices')
      .select('*')
      .eq('id', printerId)
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (printer) {
      cachePrinterConfig(tenantId, printerId, printer);
      cacheDefaultReceiptPrinter(tenantId, printerId);
    } else {
      printer = getCachedPrinterConfig(tenantId, printerId);
    }

    if (!printer) {
      throw new Error('No se encontro la impresora configurada');
    }

    if (isBrowserDriverPrinter(printer)) {
      throw new Error('El cajon debe abrirse desde la configuracion del driver de Windows al imprimir el recibo');
    }

    await printViaWebUSB(printer, drawerCmd);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    await savePrinterLog(tenantId, null, 'error', 'failed', {
      action: 'open_cash_drawer',
      error: errorMsg,
    });
    throw new Error(errorMsg);
    // Drawer open is best-effort — never block the payment flow
  }
}

/**
 * Get recent printer logs for troubleshooting
 */
export async function getPrinterLogs(
  tenantId: string,
  limit: number = 20
): Promise<any[]> {
  try {
    const { data } = await getSupabase()
      .from('printer_logs')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(limit);

    return data || [];
  } catch (error) {
    console.error('Failed to fetch printer logs:', error);
    return [];
  }
}

/**
 * Main printer utility for POS system
 * Handles device discovery, connection, and printing
 */

import { createClient } from '@/lib/supabase/client';
import { generateCashClosingReceiptESCPOS, generateKitchenTicketESCPOS, generateMonthlyClosingReceiptESCPOS, generateReceiptESCPOS, generateTestReceiptESCPOS } from './thermal-receipt';
import type { CashClosingReceiptData, KitchenTicketData, MonthlyClosingReceiptData, ReceiptData, PrinterDevice } from '@/types/printer';
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

const LOCAL_BRIDGE_PRINT_TIMEOUT_MS = 5000;
const LOCAL_BRIDGE_DEFAULT_URLS = ['http://127.0.0.1:17777', 'http://localhost:17777'];
const LOCAL_BRIDGE_URL_CACHE_KEY = 'eccofood-local-print-bridge-url';
let lastWorkingBridgeUrl: string | null = null;

class LocalBridgeRequestError extends Error {
  constructor(
    message: string,
    public retryable: boolean,
    public mayHavePrinted = false
  ) {
    super(message);
    this.name = 'LocalBridgeRequestError';
  }
}

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

async function fetchPrinterConfig(tenantId: string, printerId: string): Promise<PrinterDevice | null> {
  const { data: printer, error } = await getSupabase()
    .from('printer_devices')
    .select('*')
    .eq('id', printerId)
    .eq('tenant_id', tenantId)
    .maybeSingle();

  if (error && !printer) {
    throw new Error('Printer not found or not configured');
  }

  return (printer as PrinterDevice | null) || null;
}

async function refreshCachedPrinterConfig(tenantId: string, printerId: string, cacheAsDefault = false) {
  try {
    const printer = await fetchPrinterConfig(tenantId, printerId);
    if (printer) {
      cachePrinterConfig(tenantId, printerId, printer);
      if (cacheAsDefault) cacheDefaultReceiptPrinter(tenantId, printerId);
    }
  } catch {
    // Printing should not wait on a background cache refresh.
  }
}

async function getPrinterForPrint(tenantId: string, printerId: string, cacheAsDefault = false): Promise<PrinterDevice> {
  const cached = getCachedPrinterConfig(tenantId, printerId);
  if (cached) {
    void refreshCachedPrinterConfig(tenantId, printerId, cacheAsDefault);
    if (cacheAsDefault) cacheDefaultReceiptPrinter(tenantId, printerId);
    return cached as PrinterDevice;
  }

  const printer = await fetchPrinterConfig(tenantId, printerId);
  if (!printer) {
    throw new Error('Printer not found or not configured');
  }

  cachePrinterConfig(tenantId, printerId, printer);
  if (cacheAsDefault) cacheDefaultReceiptPrinter(tenantId, printerId);
  return printer;
}

function isBrowserDriverPrinter(printer: PrinterDevice) {
  return printer.config?.connection_mode === 'browser_driver' || (!printer.vendor_id && !printer.product_id);
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function normalizeBridgeUrl(url: string | null | undefined) {
  return (url || LOCAL_BRIDGE_DEFAULT_URLS[0]).replace(/\/$/, '');
}

function getStoredBridgeUrl() {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem(LOCAL_BRIDGE_URL_CACHE_KEY);
    return stored ? normalizeBridgeUrl(stored) : null;
  } catch {
    return null;
  }
}

function rememberWorkingBridgeUrl(bridgeUrl: string) {
  lastWorkingBridgeUrl = bridgeUrl;
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_BRIDGE_URL_CACHE_KEY, bridgeUrl);
  } catch {}
}

function forgetWorkingBridgeUrl(bridgeUrl: string) {
  if (lastWorkingBridgeUrl === bridgeUrl) lastWorkingBridgeUrl = null;
  if (typeof window === 'undefined') return;
  try {
    if (normalizeBridgeUrl(localStorage.getItem(LOCAL_BRIDGE_URL_CACHE_KEY)) === bridgeUrl) {
      localStorage.removeItem(LOCAL_BRIDGE_URL_CACHE_KEY);
    }
  } catch {}
}

function getBridgeUrl(printer: PrinterDevice) {
  return normalizeBridgeUrl(printer.config?.local_bridge_url);
}

function getBridgeUrls(printer: PrinterDevice) {
  const configured = getBridgeUrl(printer);
  const configuredIsDefault = LOCAL_BRIDGE_DEFAULT_URLS.map(normalizeBridgeUrl).includes(configured);
  return Array.from(
    new Set(
      [
        lastWorkingBridgeUrl,
        getStoredBridgeUrl(),
        configuredIsDefault ? LOCAL_BRIDGE_DEFAULT_URLS[0] : configured,
        ...LOCAL_BRIDGE_DEFAULT_URLS,
        configured,
      ]
        .filter((url): url is string => Boolean(url))
        .map(normalizeBridgeUrl)
    )
  );
}

function shouldUseLocalBridge(printer: PrinterDevice) {
  return isBrowserDriverPrinter(printer) && printer.config?.local_bridge_enabled !== false;
}

function canUseBrowserPrintFallback(printer: PrinterDevice) {
  return printer.config?.allow_browser_print_fallback === true;
}

function getLocalBridgeError(printer: PrinterDevice) {
  return `No se encontro el puente local de Eccofood en este computador (${getBridgeUrls(printer).join(' o ')}). Revisa Estado-EccofoodPrint o reinstala el agente como administrador.`;
}

async function postToLocalBridge(bridgeUrl: string, printer: PrinterDevice, data: Uint8Array): Promise<void> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), LOCAL_BRIDGE_PRINT_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${bridgeUrl}/print`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
      cache: 'no-store',
      signal: controller.signal,
      body: JSON.stringify({
        printerName: printer.config?.browser_printer_name || 'default',
        dataBase64: bytesToBase64(data),
      }),
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new LocalBridgeRequestError(
        'El puente local no confirmo la impresion a tiempo. No se reintenta para evitar recibos duplicados; revisa si el ticket salio antes de repetir.',
        false,
        true
      );
    }
    throw new LocalBridgeRequestError(error instanceof Error ? error.message : String(error), true);
  } finally {
    window.clearTimeout(timeout);
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.ok === false) {
    const message = payload?.error || 'No se pudo imprimir con el puente local';
    throw new LocalBridgeRequestError(message, response.status === 404);
  }
}

function mayHavePrinted(error: unknown) {
  return error instanceof LocalBridgeRequestError && error.mayHavePrinted;
}

async function printViaLocalBridge(printer: PrinterDevice, data: Uint8Array): Promise<void> {
  const errors: string[] = [];

  for (const bridgeUrl of getBridgeUrls(printer)) {
    try {
      await postToLocalBridge(bridgeUrl, printer, data);
      rememberWorkingBridgeUrl(bridgeUrl);
      return;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`${bridgeUrl}: ${message}`);
      if (error instanceof LocalBridgeRequestError && !error.retryable) {
        throw error;
      }
      forgetWorkingBridgeUrl(bridgeUrl);
    }
  }

  throw new Error(errors[0] || getLocalBridgeError(printer));
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
    // 1. Use local cache first so a receipt does not wait on the network.
    const printer = await getPrinterForPrint(tenantId, printerId, true);

    // 2. Generate ESC/POS commands
    const escPosData = generateReceiptESCPOS(data, {
      paperWidth: printer.config?.paper_width || 80,
      copies: 1,
      locale: data.currencyInfo.locale,
      openCashDrawer: data.openCashDrawer === true && printer.config?.cash_drawer_enabled !== false,
    });

    // 3. Browser-side printing. Windows driver mode tries the local bridge first.
    if (shouldUseLocalBridge(printer)) {
      try {
        await printViaLocalBridge(printer, escPosData);
      } catch (bridgeError) {
        console.warn('Local print bridge unavailable:', bridgeError);
        if (mayHavePrinted(bridgeError)) {
          throw bridgeError;
        }
        if (canUseBrowserPrintFallback(printer)) {
          printViaBrowserAPI(data);
        } else {
          throw new Error(getLocalBridgeError(printer));
        }
      }
    } else if (isBrowserDriverPrinter(printer)) {
      if (canUseBrowserPrintFallback(printer)) {
        printViaBrowserAPI(data);
      } else {
        throw new Error('Esta impresora de Windows necesita el puente local de Eccofood para imprimir directo sin vista previa.');
      }
    } else if (typeof navigator !== 'undefined' && 'usb' in navigator) {
      await printViaWebUSB(printer, escPosData);
    } else {
      // Fallback to browser print dialog
      console.warn('WebUSB not available, using browser print dialog');
      printViaBrowserAPI(data);
    }

    // 4. Log successful print without delaying the POS payment flow.
    void savePrinterLog(tenantId, printerId, 'print', 'success', {
      orderNumber: data.orderNumber,
      amount: data.total,
    }).catch(() => {});

    // Update device last_used_at. This is best-effort so offline printing can still succeed.
    void getSupabase()
        .from('printer_devices')
        .update({ last_used_at: new Date().toISOString() })
        .eq('id', printerId)
        .eq('tenant_id', tenantId)
        .then(() => undefined, () => undefined);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('Print error:', errorMsg);

    void savePrinterLog(tenantId, printerId, 'print', 'failed', {
      error: errorMsg,
    }).catch(() => {});
    throw new Error(errorMsg);
  }
}

/**
 * Print a cash closing summary to the configured receipt printer.
 */
export async function printCashClosingReceipt(
  tenantId: string,
  printerId: string,
  data: CashClosingReceiptData
): Promise<void> {
  try {
    const printer = await getPrinterForPrint(tenantId, printerId, true);

    const escPosData = generateCashClosingReceiptESCPOS(data, {
      paperWidth: printer.config?.paper_width || 80,
      copies: 1,
      locale: data.currencyInfo.locale,
    });

    if (shouldUseLocalBridge(printer)) {
      try {
        await printViaLocalBridge(printer, escPosData);
      } catch (bridgeError) {
        console.warn('Local print bridge unavailable:', bridgeError);
        if (mayHavePrinted(bridgeError)) {
          throw bridgeError;
        }
        if (canUseBrowserPrintFallback(printer)) {
          printCashClosingViaBrowserAPI(data);
        } else {
          throw new Error(getLocalBridgeError(printer));
        }
      }
    } else if (isBrowserDriverPrinter(printer)) {
      if (canUseBrowserPrintFallback(printer)) {
        printCashClosingViaBrowserAPI(data);
      } else {
        throw new Error('Esta impresora de Windows necesita el puente local de Eccofood para imprimir directo sin vista previa.');
      }
    } else if (typeof navigator !== 'undefined' && 'usb' in navigator) {
      await printViaWebUSB(printer, escPosData);
    } else {
      printCashClosingViaBrowserAPI(data);
    }

    void savePrinterLog(tenantId, printerId, 'print', 'success', {
      closingId: data.closingId,
      type: 'cash_closing',
      amount: data.totalSales,
    }).catch(() => {});

    void getSupabase()
      .from('printer_devices')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', printerId)
      .eq('tenant_id', tenantId)
      .then(() => undefined, () => undefined);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('Cash closing print error:', errorMsg);

    void savePrinterLog(tenantId, printerId, 'print', 'failed', {
      closingId: data.closingId,
      type: 'cash_closing',
      error: errorMsg,
    }).catch(() => {});
    throw new Error(errorMsg);
  }
}

export async function printMonthlyClosingReceipt(
  tenantId: string,
  printerId: string,
  data: MonthlyClosingReceiptData
): Promise<void> {
  try {
    const printer = await getPrinterForPrint(tenantId, printerId, true);

    const escPosData = generateMonthlyClosingReceiptESCPOS(data, {
      paperWidth: printer.config?.paper_width || 80,
      copies: 1,
      locale: data.currencyInfo.locale,
    });

    if (shouldUseLocalBridge(printer)) {
      try {
        await printViaLocalBridge(printer, escPosData);
      } catch (bridgeError) {
        console.warn('Local print bridge unavailable:', bridgeError);
        if (mayHavePrinted(bridgeError)) {
          throw bridgeError;
        }
        if (canUseBrowserPrintFallback(printer)) {
          printMonthlyClosingViaBrowserAPI(data);
        } else {
          throw new Error(getLocalBridgeError(printer));
        }
      }
    } else if (isBrowserDriverPrinter(printer)) {
      if (canUseBrowserPrintFallback(printer)) {
        printMonthlyClosingViaBrowserAPI(data);
      } else {
        throw new Error('Esta impresora de Windows necesita el puente local de Eccofood para imprimir directo sin vista previa.');
      }
    } else if (typeof navigator !== 'undefined' && 'usb' in navigator) {
      await printViaWebUSB(printer, escPosData);
    } else {
      printMonthlyClosingViaBrowserAPI(data);
    }

    void savePrinterLog(tenantId, printerId, 'print', 'success', {
      closingId: data.closingId,
      type: 'monthly_closing',
      month: data.monthLabel,
      amount: data.totalSales,
    }).catch(() => {});

    void getSupabase()
      .from('printer_devices')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', printerId)
      .eq('tenant_id', tenantId)
      .then(() => undefined, () => undefined);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('Monthly closing print error:', errorMsg);

    void savePrinterLog(tenantId, printerId, 'print', 'failed', {
      closingId: data.closingId,
      type: 'monthly_closing',
      error: errorMsg,
    }).catch(() => {});
    throw new Error(errorMsg);
  }
}

export async function printKitchenTicket(
  tenantId: string,
  printerId: string,
  data: KitchenTicketData
): Promise<void> {
  try {
    const printer = await getPrinterForPrint(tenantId, printerId);

    const escPosData = generateKitchenTicketESCPOS(data, {
      paperWidth: printer.config?.paper_width || 80,
      copies: printer.config?.copies || 1,
      locale: 'es-ES',
    });

    if (shouldUseLocalBridge(printer)) {
      try {
        await printViaLocalBridge(printer, escPosData);
      } catch (bridgeError) {
        console.warn('Local print bridge unavailable:', bridgeError);
        if (mayHavePrinted(bridgeError)) {
          throw bridgeError;
        }
        if (canUseBrowserPrintFallback(printer)) {
          printKitchenTicketViaBrowserAPI(data);
        } else {
          throw new Error(getLocalBridgeError(printer));
        }
      }
    } else if (isBrowserDriverPrinter(printer)) {
      if (canUseBrowserPrintFallback(printer)) {
        printKitchenTicketViaBrowserAPI(data);
      } else {
        throw new Error('Esta impresora de Windows necesita el puente local de Eccofood para imprimir directo sin vista previa.');
      }
    } else if (typeof navigator !== 'undefined' && 'usb' in navigator) {
      await printViaWebUSB(printer, escPosData);
    } else {
      printKitchenTicketViaBrowserAPI(data);
    }

    void savePrinterLog(tenantId, printerId, 'print', 'success', {
      orderNumber: data.orderNumber,
      type: 'kitchen_ticket',
    }).catch(() => {});
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('Kitchen ticket print error:', errorMsg);
    void savePrinterLog(tenantId, printerId, 'print', 'failed', {
      orderNumber: data.orderNumber,
      type: 'kitchen_ticket',
      error: errorMsg,
    }).catch(() => {});
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
    frameDocument.title = `Recibo ${data.orderNumber}`;

    setTimeout(() => {
      frameWindow.focus();
      frameWindow.print();
      setTimeout(() => iframe.remove(), 1000);
    }, 250);
  } catch (error) {
    console.error('Browser print failed:', error);
  }
}

function printCashClosingViaBrowserAPI(data: CashClosingReceiptData): void {
  try {
    const money = (amount: number) =>
      formatPriceWithCurrency(amount, data.currencyInfo.code, data.currencyInfo.locale);
    const safe = (value: string | number | null | undefined) =>
      String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
    const html = `
      <html>
        <head>
          <title>Cierre de caja</title>
          <style>
            body{font-family:Arial,sans-serif;margin:0;padding:16px;background:#fff;color:#111}
            .receipt{max-width:300px;margin:0 auto}
            h1{font-size:18px;text-align:center;margin:0 0 4px}
            h2{font-size:16px;text-align:center;margin:8px 0 12px}
            .meta{text-align:center;font-size:12px;color:#555;margin-bottom:12px}
            .line{display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px dashed #ddd;font-size:13px}
            .total{font-size:16px;font-weight:800;border-top:2px solid #111;margin-top:8px;padding-top:8px}
            @media print{body{padding:0}.receipt{max-width:none;width:72mm}}
          </style>
        </head>
        <body>
          <div class="receipt">
            <h1>${safe(data.restaurantName || 'Restaurante')}</h1>
            <div class="meta">
              ${data.restaurantPhone ? `Tel: ${safe(data.restaurantPhone)}<br/>` : ''}
              ${new Date(data.closedAt || Date.now()).toLocaleString(data.currencyInfo.locale)}<br/>
              Empleado: ${safe(data.staffName)}
            </div>
            <h2>CIERRE DE CAJA</h2>
              <div class="line"><span>Efectivo</span><strong>${money(data.cashSales)}</strong></div>
              <div class="line"><span>Tarjeta</span><strong>${money(data.cardSales)}</strong></div>
              <div class="line"><span>Otros</span><strong>${money(data.otherSales)}</strong></div>
              <div class="line"><span>Valor domicilios</span><strong>${money(data.totalDeliveryFees || 0)}</strong></div>
              <div class="line"><span>Numero domicilios</span><strong>${data.deliveryOrderCount || 0}</strong></div>
              <div class="line"><span>Esperado caja</span><strong>${money(data.expectedCash)}</strong></div>
            <div class="line"><span>Contado</span><strong>${money(data.actualCash)}</strong></div>
            <div class="line"><span>Diferencia</span><strong>${money(data.difference)}</strong></div>
            <div class="line"><span>Transacciones</span><strong>${data.transactionCount}</strong></div>
            <div class="line total"><span>Total ventas</span><strong>${money(data.totalSales)}</strong></div>
          </div>
          <script>window.onload=()=>{window.print();setTimeout(()=>window.close(),500)}</script>
        </body>
      </html>
    `;

    const popup = window.open('', '_blank', 'width=420,height=720');
    if (!popup) throw new Error('El navegador bloqueo la ventana de impresion');
    popup.document.open();
    popup.document.write(html);
    popup.document.close();
  } catch (error) {
    console.error('Browser cash closing print failed:', error);
  }
}

function printMonthlyClosingViaBrowserAPI(data: MonthlyClosingReceiptData): void {
  try {
    const money = (amount: number) =>
      formatPriceWithCurrency(amount, data.currencyInfo.code, data.currencyInfo.locale);
    const qty = (amount: number | undefined) => {
      const value = Number(amount) || 0;
      return Number.isInteger(value) ? String(value) : value.toFixed(2);
    };
    const safe = (value: string | number | null | undefined) =>
      String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
    const breakdownRows = (items: Array<{ label: string; count: number; total: number }> = []) =>
      items.map((item) => `
        <div class="line"><span>${safe(item.label)} (${safe(item.count)})</span><strong>${money(item.total)}</strong></div>
      `).join('');
    const productRows = (data.productSales || []).map((product) => `
      <tr>
        <td>${safe(product.name)}</td>
        <td style="text-align:right">${safe(qty(product.quantity))}</td>
        <td style="text-align:right">${money(product.revenue)}</td>
      </tr>
    `).join('');
    const html = `
      <html>
        <head>
          <title>Cierre mensual</title>
          <style>
            body{font-family:Arial,sans-serif;margin:0;padding:16px;background:#fff;color:#111}
            .receipt{max-width:300px;margin:0 auto}
            h1{font-size:18px;text-align:center;margin:0 0 4px}
            h2{font-size:16px;text-align:center;margin:8px 0 12px}
            h3{font-size:13px;margin:14px 0 6px;border-top:1px solid #111;padding-top:8px}
            .meta{text-align:center;font-size:12px;color:#555;margin-bottom:12px}
            .line{display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px dashed #ddd;font-size:13px}
            .total{font-size:16px;font-weight:800;border-top:2px solid #111;margin-top:8px;padding-top:8px}
            table{width:100%;border-collapse:collapse;font-size:11px}
            th,td{border-bottom:1px dashed #ddd;padding:4px 0;vertical-align:top}
            th{text-align:left;color:#555}
            @media print{body{padding:0}.receipt{max-width:none;width:72mm}}
          </style>
        </head>
        <body>
          <div class="receipt">
            <h1>${safe(data.restaurantName || 'Restaurante')}</h1>
            <div class="meta">
              ${data.restaurantPhone ? `Tel: ${safe(data.restaurantPhone)}<br/>` : ''}
              ${safe(data.monthLabel)}<br/>
              ${new Date(data.closedAt || Date.now()).toLocaleString(data.currencyInfo.locale)}<br/>
              Responsable: ${safe(data.staffName)}
            </div>
            <h2>CIERRE MENSUAL</h2>
            <div class="line"><span>Efectivo</span><strong>${money(data.cashSales)}</strong></div>
            <div class="line"><span>Tarjeta</span><strong>${money(data.cardSales)}</strong></div>
            <div class="line"><span>Otros</span><strong>${money(data.otherSales)}</strong></div>
            <div class="line"><span>Valor domicilios</span><strong>${money(data.totalDeliveryFees || 0)}</strong></div>
            <div class="line"><span>Numero domicilios</span><strong>${data.deliveryOrderCount || 0}</strong></div>
            <div class="line"><span>Impuestos</span><strong>${money(data.totalTax)}</strong></div>
            <div class="line"><span>Transacciones</span><strong>${data.transactionCount}</strong></div>
            <div class="line total"><span>Total mes</span><strong>${money(data.totalSales)}</strong></div>
            <h3>Indicadores</h3>
            <div class="line"><span>Ticket promedio</span><strong>${money(data.averageTicket || 0)}</strong></div>
            <div class="line"><span>Unidades vendidas</span><strong>${safe(qty(data.totalItemsSold))}</strong></div>
            <div class="line"><span>Unid. por pedido</span><strong>${safe(qty(data.averageItemsPerOrder))}</strong></div>
            ${data.bestSalesDay ? `<div class="line"><span>Mejor dia</span><strong>${safe(data.bestSalesDay.date)} ${money(data.bestSalesDay.total)}</strong></div>` : ''}
            ${data.peakHour ? `<div class="line"><span>Hora pico</span><strong>${safe(data.peakHour.label)} ${money(data.peakHour.total)}</strong></div>` : ''}
            ${data.paymentBreakdown?.length ? `<h3>Formas de pago</h3>${breakdownRows(data.paymentBreakdown)}` : ''}
            ${data.orderTypeBreakdown?.length ? `<h3>Tipos de pedido</h3>${breakdownRows(data.orderTypeBreakdown)}` : ''}
            ${productRows ? `
              <h3>Productos vendidos</h3>
              <table>
                <thead><tr><th>Producto</th><th style="text-align:right">Und</th><th style="text-align:right">Valor</th></tr></thead>
                <tbody>${productRows}</tbody>
              </table>
            ` : ''}
          </div>
          <script>window.onload=()=>{window.print();setTimeout(()=>window.close(),500)}</script>
        </body>
      </html>
    `;

    const popup = window.open('', '_blank', 'width=420,height=720');
    if (!popup) throw new Error('El navegador bloqueo la ventana de impresion');
    popup.document.open();
    popup.document.write(html);
    popup.document.close();
  } catch (error) {
    console.error('Browser monthly closing print failed:', error);
  }
}

function printKitchenTicketViaBrowserAPI(data: KitchenTicketData): void {
  try {
    const safe = (value: string | number | null | undefined) =>
      String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
    const rows = data.items.map((item) => `
      <div class="item">
        <strong>${safe(item.quantity)}x ${safe(item.name)}</strong>
        ${item.notes ? `<small>Nota: ${safe(item.notes)}</small>` : ''}
      </div>
    `).join('');
    const html = `
      <html>
        <head>
          <title>Comanda ${safe(data.orderNumber)}</title>
          <style>
            body{font-family:Arial,sans-serif;margin:0;padding:16px;background:#fff;color:#111}
            .ticket{max-width:300px;margin:0 auto}
            h1{font-size:26px;text-align:center;margin:0;font-weight:900}
            .meta{text-align:center;font-size:13px;margin:8px 0 12px;color:#333}
            .item{border-top:1px dashed #999;padding:10px 0;font-size:20px}
            .item small{display:block;font-size:13px;margin-top:4px}
            @media print{body{padding:0}.ticket{max-width:none;width:72mm}}
          </style>
        </head>
        <body>
          <div class="ticket">
            <h1>COMANDA COCINA</h1>
            <div class="meta">
              ${safe(data.restaurantName || '')}<br/>
              ${safe(data.orderNumber)}<br/>
              ${new Date(data.timestamp || Date.now()).toLocaleString('es-ES')}
            </div>
            ${rows}
            ${data.notes ? `<p><strong>Notas:</strong> ${safe(data.notes)}</p>` : ''}
          </div>
          <script>window.onload=()=>{window.print();setTimeout(()=>window.close(),500)}</script>
        </body>
      </html>
    `;

    const popup = window.open('', '_blank', 'width=420,height=720');
    if (!popup) throw new Error('El navegador bloqueo la ventana de impresion');
    popup.document.open();
    popup.document.write(html);
    popup.document.close();
  } catch (error) {
    console.error('Browser kitchen ticket print failed:', error);
  }
}

/**
 * Generate HTML for browser printing (fallback)
 */
function generateReceiptHTML(data: ReceiptData): string {
  const printedAt = data.timestamp ? new Date(data.timestamp) : new Date();
  const locale = data.currencyInfo?.locale || 'es-ES';
  const money = (amount: number) => formatPriceWithCurrency(amount, data.currencyInfo.code, locale);
  const paymentLabel = getPaymentMethodLabel(data.paymentMethod);
  const displayOrderNumber = data.orderNumber || getBrowserReceiptNumber(data.orderNumber);
  const receiptDate = printedAt.toLocaleDateString(locale);
  const receiptTime = printedAt.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  const safe = (value: string | number | null | undefined) =>
    String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  const paymentBreakdownRows = data.paymentBreakdown?.length
    ? data.paymentBreakdown.map((payment) =>
        `<div class="cash-row"><span>${safe(getPaymentMethodLabel(payment.method))}</span><strong>${money(payment.amount)}</strong></div>`
      ).join('')
    : '';
  const ticketLine = (name: string, value: string, className = '') =>
    `<div class="ticket-line ${className}">
      <span class="line-name">${safe(name).toUpperCase()}</span>
      <strong>${safe(value)}</strong>
    </div>`;
  const itemsHTML = data.items
    .map((item) => {
      const quantity = Number(item.quantity || 0);
      return ticketLine(item.name, `${money(item.price * quantity)} x${formatReceiptQuantity(quantity)}`);
    })
    .join('');
  const deliveryHTML = (data.deliveryFee || 0) > 0
    ? ticketLine('Domicilio', `${money(data.deliveryFee || 0)} x1`, 'delivery-line')
    : '';
  const productCount = data.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0) + ((data.deliveryFee || 0) > 0 ? 1 : 0);
  const hasBreakdown = data.discount > 0 || (data.tax || 0) > 0;
  const extraRows = (data.discount > 0 ? 1 : 0) + ((data.tax || 0) > 0 ? 1 : 0);
  const minHeightMm = Math.max(92, 70 + (data.items.length + ((data.deliveryFee || 0) > 0 ? 1 : 0)) * 8 + extraRows * 6);

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
          min-height: ${minHeightMm}mm;
          margin: 0;
          padding: 0;
          background: #fff;
          color: #000;
          overflow: visible;
        }
        body {
          font-family: 'Courier New', Courier, monospace;
          font-size: 16px;
          font-weight: 700;
          line-height: 1.18;
          padding: 5mm 3mm 0;
        }
        .receipt {
          width: 74mm;
          display: block;
          break-after: avoid;
          break-inside: avoid;
          page-break-after: avoid;
          page-break-inside: avoid;
        }
        .header {
          text-align: center;
          font-weight: 900;
          margin-bottom: 4px;
          font-size: 19px;
          letter-spacing: 0;
        }
        .meta-center {
          text-align: center;
          font-size: 13px;
          font-weight: 800;
          margin: 1px 0;
        }
        .title {
          text-align: center;
          font-size: 14px;
          font-weight: 900;
          margin: 4px 0 5px;
        }
        .meta-row,
        .table-head,
        .ticket-line,
        .summary-row,
        .amount-row,
        .cash-row {
          display: flex;
          justify-content: space-between;
          gap: 6px;
          white-space: nowrap;
        }
        .meta-row {
          font-size: 14px;
          margin: 1px 0;
        }
        .meta-row strong {
          text-align: right;
        }
        .table-head {
          margin-top: 12px;
          font-size: 15px;
          font-weight: 900;
        }
        .divider {
          border-top: 1px dashed #000;
          margin: 5px 0;
        }
        .header-divider {
          border-top: 2px solid #000;
          margin: 8px 0 6px;
        }
        .ticket-line {
          align-items: flex-start;
          font-size: 15px;
          font-weight: 900;
          margin: 3px 0;
        }
        .line-name {
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .delivery-line {
          margin-top: 4px;
        }
        .count {
          margin: 9px 0 10px;
          font-size: 15px;
          font-weight: 900;
        }
        .summary {
          margin: 6px 0 8px;
          font-size: 14px;
        }
        .grand-total {
          margin: 8px 0 12px;
        }
        .total-word {
          display: block;
          font-size: 25px;
          font-weight: 900;
          line-height: 1;
        }
        .total-money {
          display: block;
          margin-top: 2px;
          text-align: right;
          font-size: 24px;
          font-weight: 900;
          line-height: 1.05;
        }
        .sale-type {
          margin-top: 3px;
          text-align: right;
          font-size: 18px;
          font-weight: 900;
        }
        .amount-row,
        .cash-row {
          margin-top: 8px;
          align-items: baseline;
          font-size: 18px;
          font-weight: 900;
        }
        .cash-row {
          margin-top: 2px;
          font-size: 14px;
        }
        .footer {
          text-align: center;
          margin-top: 18px;
          font-size: 16px;
          font-weight: 800;
        }
        .footer p {
          margin: 2px 0;
        }
        .powered-by {
          margin-top: 8px;
          font-size: 10px;
          font-weight: 700;
          color: #333;
        }
        @media print {
          html, body {
            width: 80mm !important;
            min-height: ${minHeightMm}mm;
            margin: 0 !important;
            padding: 0 !important;
            overflow: hidden;
          }
          body { padding: 5mm 3mm 0 !important; }
          .receipt {
            break-after: avoid;
            break-inside: avoid;
            page-break-after: avoid;
            page-break-inside: avoid;
          }
          button { display: none !important; }
        }
      </style>
    </head>
    <body>
      <div class="receipt">
      <div class="header">${safe(data.restaurantName || 'Restaurante')}</div>
      ${data.restaurantPhone ? `<div class="meta-center">Tel: ${safe(data.restaurantPhone)}</div>` : ''}
      <div class="title">RECIBO DE VENTA</div>
      <div class="meta-row"><span>Pedido:</span><strong>${safe(displayOrderNumber)}</strong></div>
      <div class="meta-row"><span>Fecha:</span><strong>${safe(receiptDate)}</strong></div>
      <div class="meta-row"><span>Hora:</span><strong>${safe(receiptTime)}</strong></div>
      ${data.tableNumber ? `<div class="meta-row"><span>Mesa:</span><strong>${safe(data.tableNumber)}</strong></div>` : ''}
      ${data.waiterName ? `<div class="meta-row"><span>Atendido Por:</span><strong>${safe(data.waiterName)}</strong></div>` : ''}

      <div class="header-divider"></div>
      <div class="table-head"><span>Item</span><span>Precio</span></div>
      <div class="divider"></div>
      <div class="items">${itemsHTML}${deliveryHTML}</div>
      <div class="divider"></div>
      <div class="count"># Productos: ${safe(formatReceiptQuantity(productCount))}</div>
      ${
        hasBreakdown
          ? `<div class="summary">
        <div class="summary-row"><span>Subtotal:</span><strong>${money(data.subtotal)}</strong></div>
        ${
          data.discount > 0
            ? `<div class="summary-row"><span>Descuento:</span><strong>-${money(data.discount)}</strong></div>`
            : ''
        }
        ${
          (data.tax || 0) > 0
            ? `<div class="summary-row"><span>${data.taxIncluded ? 'IVA incluido' : 'IVA'}${data.taxRate ? ` ${data.taxRate}%` : ''}:</span><strong>${money(data.tax || 0)}</strong></div>`
            : ''
        }
      </div>`
          : ''
      }
      <div class="grand-total">
        <span class="total-word">Total</span>
        <span class="total-money">${money(data.total)}</span>
        ${paymentLabel ? `<div class="sale-type">VENTA ${safe(paymentLabel).toUpperCase()}</div>` : ''}
      </div>
      ${
        paymentBreakdownRows || data.amountPaid !== undefined
          ? `<div class="payment">
        ${paymentBreakdownRows || `<div class="cash-row"><span>Recibido:</span><strong>${money(Number(data.amountPaid) || 0)}</strong></div>
        <div class="cash-row"><span>Cambio:</span><strong>${money(data.change)}</strong></div>`}
      </div>`
          : ''
      }
      <div class="footer">
        <p>Gracias por su compra</p>
        <p>Estamos a su servicio</p>
        <p class="powered-by">POS y menu digital: eccofoodapp.com</p>
      </div>
      </div>
    </body>
    </html>
  `;
}

function getPaymentMethodLabel(method?: string | null): string {
  if (method === 'cash') return 'Efectivo';
  if (method === 'stripe' || method === 'card') return 'Tarjeta';
  if (method === 'mixed') return 'Mixta';
  if (method === 'wompi') return 'Wompi';
  return method ? method : '';
}

function getBrowserReceiptNumber(orderNumber?: string | null): string {
  const clean = String(orderNumber || '').trim();
  const digits = clean.replace(/\D/g, '');
  if (digits.length >= 5) return digits.slice(-6);
  return clean || 'POS';
}

function formatReceiptQuantity(quantity: number): string {
  if (Number.isInteger(quantity)) return String(quantity);
  return new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2 }).format(quantity);
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
    const printer = await getPrinterForPrint(tenantId, printerId, true);

    const testData = generateTestReceiptESCPOS(printer.config?.paper_width || 80);

    if (shouldUseLocalBridge(printer)) {
      try {
        await printViaLocalBridge(printer, testData);
      } catch (bridgeError) {
        console.warn('Local print bridge unavailable:', bridgeError);
        if (mayHavePrinted(bridgeError)) {
          throw bridgeError;
        }
        if (canUseBrowserPrintFallback(printer)) {
          printViaBrowserAPI({
            orderId: 'test',
            orderNumber: 'TEST',
            restaurantName: 'Eccofood',
            items: [{ menu_item_id: 'test', name: 'Prueba impresora', price: 0, quantity: 1 }],
            subtotal: 0,
            discount: 0,
            total: 0,
            change: 0,
            currencyInfo: { code: 'EUR', symbol: 'EUR', locale: 'es-ES' },
            timestamp: new Date().toISOString(),
          });
        } else {
          throw new Error(getLocalBridgeError(printer));
        }
      }
    } else if (isBrowserDriverPrinter(printer)) {
      if (canUseBrowserPrintFallback(printer)) {
        printViaBrowserAPI({
          orderId: 'test',
          orderNumber: 'TEST',
          restaurantName: 'Eccofood',
          items: [{ menu_item_id: 'test', name: 'Prueba impresora', price: 0, quantity: 1 }],
          subtotal: 0,
          discount: 0,
          total: 0,
          change: 0,
          currencyInfo: { code: 'EUR', symbol: 'EUR', locale: 'es-ES' },
          timestamp: new Date().toISOString(),
        });
      } else {
        throw new Error('Esta impresora de Windows necesita el puente local de Eccofood para imprimir directo sin vista previa.');
      }
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
    // ESC p m t1 t2. Send both common DK pins because many Windows POS
    // drivers hide whether the drawer is wired to pin 2 (m=0) or pin 5 (m=1).
    const drawerCmd = new Uint8Array([
      0x1b, 0x70, 0x00, 0x32, 0xfa,
      0x1b, 0x70, 0x01, 0x32, 0xfa,
    ]);

    let printerId = getCachedDefaultReceiptPrinter(tenantId);
    if (printerId) {
      void getSupabase()
        .from('restaurant_settings')
        .select('default_receipt_printer_id')
        .eq('tenant_id', tenantId)
        .maybeSingle()
        .then(({ data: settings }) => {
          if (settings?.default_receipt_printer_id) {
            cacheDefaultReceiptPrinter(tenantId, settings.default_receipt_printer_id);
          }
        }, () => undefined);
    } else {
      const { data: settings } = await getSupabase()
        .from('restaurant_settings')
        .select('default_receipt_printer_id')
        .eq('tenant_id', tenantId)
        .maybeSingle();
      printerId = settings?.default_receipt_printer_id || null;
      if (printerId) cacheDefaultReceiptPrinter(tenantId, printerId);
    }

    if (!printerId) {
      throw new Error('No hay impresora de recibos predeterminada');
    }

    const printer = await getPrinterForPrint(tenantId, printerId, true);

    if (printer.config?.cash_drawer_enabled === false) {
      return;
    }

    if (shouldUseLocalBridge(printer)) {
      await printViaLocalBridge(printer, drawerCmd);
      return;
    }

    if (isBrowserDriverPrinter(printer)) {
      throw new Error('Para abrir el cajon con impresora Windows, enciende el puente local de Eccofood');
    }

    if (typeof navigator === 'undefined' || !('usb' in navigator) || !navigator.usb) {
      throw new Error('WebUSB no esta disponible para abrir el cajon');
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

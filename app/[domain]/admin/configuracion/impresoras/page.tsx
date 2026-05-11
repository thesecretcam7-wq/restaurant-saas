'use client';

import { use, useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useTenantResolver } from '@/lib/hooks/useTenantResolver';
import { Plus, AlertCircle, CheckCircle, Download, Activity } from 'lucide-react';
import { PrinterDeviceCard } from '@/components/admin/PrinterDeviceCard';
import { useWebUSB } from '@/lib/hooks/useWebUSB';
import { testPrinterConnection } from '@/lib/pos-printer';
import type { PrinterDevice } from '@/types/printer';

interface Props {
  params: Promise<{ domain: string }>
}

function isBrowserDriverDevice(device: PrinterDevice) {
  return device.config?.connection_mode === 'browser_driver' || (!device.vendor_id && !device.product_id);
}

function dedupeBrowserDriverDevices(devices: PrinterDevice[]) {
  const browserDriverDevices = devices.filter(isBrowserDriverDevice);
  const selectedBrowserDriver = browserDriverDevices.find((device) => device.is_default) || browserDriverDevices[0];
  const directDevices = devices.filter((device) => !isBrowserDriverDevice(device));
  return selectedBrowserDriver ? [selectedBrowserDriver, ...directDevices] : directDevices;
}

export default function PrintersConfigPage({ params }: Props) {
  const { domain: slug } = use(params);
  const { tenantId, loading: tenantLoading } = useTenantResolver(slug);

  const [devices, setDevices] = useState<PrinterDevice[]>([]);
  const [loading, setLoading] = useState(false);
  const [windowsLoading, setWindowsLoading] = useState(false);
  const [autoPrint, setAutoPrint] = useState(true);
  const [copies, setCopies] = useState(1);
  const [bridgeStatus, setBridgeStatus] = useState<'unknown' | 'checking' | 'online' | 'offline'>('unknown');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const webusb = useWebUSB();
  const supabase = createClient();

  useEffect(() => {
    if (!tenantId) return;
    async function init() {
      const res = await fetch(`/api/devices?tenantId=${tenantId}`);
      const data = await res.json();
      setDevices(dedupeBrowserDriverDevices(data.devices || []));

      const { data: settings } = await supabase
        .from('restaurant_settings')
        .select('printer_auto_print')
        .eq('tenant_id', tenantId)
        .maybeSingle();

      if (settings) {
        setAutoPrint(settings.printer_auto_print ?? true);
      }
    }
    init();
  }, [tenantId]);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const saveAutoPrint = useCallback(async (value: boolean) => {
    if (!tenantId) return;
    const { error } = await supabase
      .from('restaurant_settings')
      .update({ printer_auto_print: value, printer_updated_at: new Date().toISOString() })
      .eq('tenant_id', tenantId);
    if (error) showToast('Error al guardar auto-impresion', 'error');
  }, [tenantId]);

  const handleAutoPrintChange = async (checked: boolean) => {
    setAutoPrint(checked);
    await saveAutoPrint(checked);
  };

  const checkBridgeStatus = async () => {
    setBridgeStatus('checking');
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 2500);

    try {
      const response = await fetch('http://127.0.0.1:17777/health', {
        signal: controller.signal,
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload?.ok === false) {
        throw new Error(payload?.error || 'Puente local sin respuesta');
      }
      setBridgeStatus('online');
      showToast(`Puente activo${payload.defaultPrinter ? `: ${payload.defaultPrinter}` : ''}`, 'success');
    } catch {
      setBridgeStatus('offline');
      showToast('Puente local no detectado. Abre Eccofood Print Agent y deja la ventana abierta.', 'error');
    } finally {
      window.clearTimeout(timeout);
    }
  };

  // Copies are stored in the default device's config
  const handleCopiesChange = async (val: number) => {
    const clamped = Math.min(5, Math.max(1, val));
    setCopies(clamped);
    const defaultDevice = devices.find((d) => d.is_default);
    if (defaultDevice && tenantId) {
      await fetch(`/api/devices?id=${defaultDevice.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          config: { ...defaultDevice.config, copies: clamped },
        }),
      });
    }
  };

  const handleAddPrinter = async () => {
    if (!webusb.isSupported) {
      showToast('WebUSB no soportado en este navegador', 'error');
      return;
    }
    if (!tenantId) return;

    try {
      const device = await webusb.requestDevice();
      if (!device) return;

      setLoading(true);

      const response = await fetch('/api/devices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          name: `Impresora ${device.productName || 'USB'}`,
          device_type: 'receipt',
          vendor_id: device.vendorId,
          product_id: device.productId,
          serial_number: device.serialNumber,
          status: 'connected',
          config: {
            paper_width: 80,
            auto_print: true,
            copies,
            print_on_status: 'confirmed',
            connection_mode: 'webusb',
          },
        }),
      });

      if (!response.ok) throw new Error('Error al crear dispositivo');

      const newDevice = await response.json();
      setDevices([newDevice.device, ...devices]);
      await webusb.connectDevice(device);
      showToast('Impresora agregada correctamente', 'success');
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Error desconocido';
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddWindowsPrinter = async () => {
    if (!tenantId) {
      showToast('Todavia estamos cargando el restaurante. Espera unos segundos.', 'error');
      return;
    }

    const fetchWithTimeout = async (url: string, options: RequestInit, timeoutMs = 10000) => {
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
      try {
        return await fetch(url, { ...options, signal: controller.signal });
      } finally {
        window.clearTimeout(timeout);
      }
    };

    const setReceiptPrinterDefault = async (deviceId: string) => {
      const deviceResponse = await fetchWithTimeout(`/api/devices?id=${deviceId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId, is_default: true }),
      });

      const deviceData = await deviceResponse.json().catch(() => ({}));
      if (!deviceResponse.ok) throw new Error(deviceData.error || 'No se pudo marcar como predeterminada');

      const { error: settingsError } = await supabase
        .from('restaurant_settings')
        .update({
          default_receipt_printer_id: deviceId,
          printer_auto_print: true,
          printer_updated_at: new Date().toISOString(),
        })
        .eq('tenant_id', tenantId);

      if (settingsError) throw settingsError;
      setDevices((currentDevices) => currentDevices.map((d) => ({ ...d, is_default: d.id === deviceId })));
    };

    try {
      setWindowsLoading(true);

      const existingWindowsPrinter = devices.find(isBrowserDriverDevice);
      if (existingWindowsPrinter) {
        await setReceiptPrinterDefault(existingWindowsPrinter.id);
        showToast('Ya existe una impresora de Windows. La deje como predeterminada.', 'success');
        return;
      }

      const response = await fetchWithTimeout('/api/devices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          name: 'Impresora instalada en Windows',
          device_type: 'receipt',
          vendor_id: null,
          product_id: null,
          serial_number: null,
          status: 'connected',
          config: {
            paper_width: 80,
            auto_print: true,
            copies,
            print_on_status: 'confirmed',
            connection_mode: 'browser_driver',
            browser_printer_name: 'default',
            local_bridge_enabled: true,
            local_bridge_url: 'http://127.0.0.1:17777',
            cash_drawer_enabled: true,
          },
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Error al crear impresora de Windows');

      const newDevice = data;
      setDevices(dedupeBrowserDriverDevices([newDevice.device, ...devices]));
      await setReceiptPrinterDefault(newDevice.device.id);
      showToast('Impresora de Windows agregada como predeterminada', 'success');
    } catch (error) {
      const msg = error instanceof DOMException && error.name === 'AbortError'
        ? 'La conexion tardo demasiado. Revisa internet e intenta otra vez.'
        : error instanceof Error ? error.message : 'Error desconocido';
      showToast(msg, 'error');
    } finally {
      setWindowsLoading(false);
    }
  };

  const handleSetDefault = async (deviceId: string) => {
    if (!tenantId) return;
    try {
      setLoading(true);

      await fetch(`/api/devices?id=${deviceId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId, is_default: true }),
      });

      const { error: settingsError } = await supabase
        .from('restaurant_settings')
        .update({
          default_receipt_printer_id: deviceId,
          printer_auto_print: true,
          printer_updated_at: new Date().toISOString(),
        })
        .eq('tenant_id', tenantId);

      if (settingsError) throw settingsError;

      setDevices(devices.map((d) => ({ ...d, is_default: d.id === deviceId })));
      showToast('Impresora predeterminada actualizada', 'success');
    } catch {
      showToast('Error al actualizar configuración', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (deviceId: string) => {
    if (!tenantId) return;
    try {
      setLoading(true);
      const response = await fetch(`/api/devices?id=${deviceId}&tenantId=${tenantId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Error al eliminar');
      setDevices(devices.filter((d) => d.id !== deviceId).map((d) => ({ ...d, is_default: false })));
      showToast('Dispositivo eliminado', 'success');
    } catch {
      showToast('Error al eliminar dispositivo', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleTest = async (deviceId: string) => {
    if (!tenantId) return;
    try {
      setLoading(true);
      const result = await testPrinterConnection(tenantId, deviceId);
      showToast(result.message, result.success ? 'success' : 'error');
    } catch {
      showToast('Error al probar impresora', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleConfigureDevice = async (deviceId: string, configPatch: Partial<PrinterDevice['config']>) => {
    if (!tenantId) return;
    const device = devices.find((item) => item.id === deviceId);
    if (!device) return;

    const nextConfig = {
      ...device.config,
      ...configPatch,
    };

    setDevices((currentDevices) =>
      currentDevices.map((item) =>
        item.id === deviceId ? { ...item, config: nextConfig } : item
      )
    );

    try {
      const response = await fetch(`/api/devices?id=${deviceId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          config: nextConfig,
        }),
      });

      if (!response.ok) throw new Error('Error al guardar configuracion');
      showToast('Configuracion de impresora guardada', 'success');
    } catch {
      showToast('Error al guardar configuracion de impresora', 'error');
      setDevices((currentDevices) =>
        currentDevices.map((item) =>
          item.id === deviceId ? device : item
        )
      );
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Configuración de Impresoras</h1>
        <p className="text-sm text-gray-400 mt-1">
          Configura impresoras USB térmicas para imprimir recibos automáticamente
        </p>
      </div>

      {toast && (
        <div
          className={`p-4 rounded-lg flex items-center gap-3 ${
            toast.type === 'success'
              ? 'bg-green-900/30 border border-green-700 text-green-300'
              : 'bg-red-900/30 border border-red-700 text-red-300'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
          )}
          <span className="text-sm">{toast.message}</span>
        </div>
      )}

      {webusb.error && (
        <div className="rounded-lg border border-red-700 bg-red-900/30 p-4 text-sm text-red-200">
          {webusb.error}
        </div>
      )}

      <div className="grid gap-3 lg:grid-cols-3">
        <div className="rounded-xl border border-orange-500/30 bg-orange-500/10 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-sm font-bold text-orange-100">1. Instalar en el PC de caja</p>
            <span className="rounded-full bg-orange-500 px-2 py-1 text-xs font-black text-black">Paso 1</span>
          </div>
          <p className="mb-4 text-xs leading-relaxed text-orange-100/75">
            Descarga, descomprime y ejecuta "1 - Instalar como administrador.bat" con clic derecho.
          </p>
          <a
            href="/downloads/eccofood-print-agent.zip"
            download
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-orange-500 px-4 py-2 font-bold text-black shadow-lg shadow-orange-500/20 transition hover:bg-orange-400"
          >
            <Download className="w-5 h-5" />
            Descargar instalador
          </a>
        </div>

        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-sm font-bold text-emerald-100">2. Registrar impresora Windows</p>
            <span className="rounded-full bg-emerald-500 px-2 py-1 text-xs font-black text-black">Paso 2</span>
          </div>
          <p className="mb-4 text-xs leading-relaxed text-emerald-100/75">
            Esto crea una sola impresora en Eccofood y usa la impresora predeterminada de Windows.
          </p>
          <button
            onClick={handleAddWindowsPrinter}
            disabled={windowsLoading || tenantLoading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/20 px-4 py-2 font-bold text-emerald-50 transition hover:bg-emerald-500/30 disabled:cursor-not-allowed disabled:border-gray-700 disabled:bg-gray-800 disabled:text-gray-400"
          >
            <Plus className="w-5 h-5" />
            {windowsLoading ? 'Conectando...' : tenantLoading ? 'Cargando restaurante...' : 'Usar impresora de Windows'}
          </button>
        </div>

        <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-sm font-bold text-cyan-100">3. Comprobar que esta abierto</p>
            <span className={`rounded-full px-2 py-1 text-xs font-black ${
              bridgeStatus === 'online'
                ? 'bg-emerald-500 text-black'
                : bridgeStatus === 'offline'
                  ? 'bg-red-500 text-white'
                  : 'bg-cyan-500 text-black'
            }`}>
              {bridgeStatus === 'checking' ? 'Revisando' : bridgeStatus === 'online' ? 'Activo' : bridgeStatus === 'offline' ? 'No activo' : 'Estado'}
            </span>
          </div>
          <p className="mb-4 text-xs leading-relaxed text-cyan-100/75">
            Si aqui aparece activo, el TPV puede imprimir directo y abrir el cajon sin Chrome.
          </p>
          <button
            onClick={checkBridgeStatus}
            disabled={bridgeStatus === 'checking'}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-cyan-500/40 bg-cyan-500/20 px-4 py-2 font-bold text-cyan-50 transition hover:bg-cyan-500/30 disabled:cursor-wait disabled:opacity-60"
          >
            <Activity className="w-5 h-5" />
            Comprobar puente activo
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={handleAddPrinter}
          disabled={loading || !webusb.isSupported || !tenantId}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg font-medium transition"
        >
          <Plus className="w-5 h-5" />
          Agregar Impresora USB
        </button>
      </div>

      <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
        <p className="font-bold">Instrucciones para el administrador</p>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-amber-100/85">
          <li>Instala este agente solo en el computador donde estan conectados la impresora y el cajon.</li>
          <li>Ejecuta "1 - Instalar como administrador.bat" como administrador para que pueda arrancar solo con Windows.</li>
          <li>Despues de instalar, pulsa "Comprobar puente activo". Si aparece activo, el TPV puede imprimir sin vista previa.</li>
          <li>Si algun Windows lo bloquea, abre Abrir-EccofoodPrint.bat y deja esa ventana abierta mientras cobras.</li>
        </ol>
      </div>

      {!tenantId && (
        <div className="rounded-lg border border-yellow-700 bg-yellow-900/20 p-4 text-sm text-yellow-200">
          Cargando datos del restaurante. Espera unos segundos y vuelve a intentar.
        </div>
      )}

      {!webusb.isSupported && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 p-4 rounded-lg text-sm">
          ⚠️ WebUSB no es soportado en este navegador. Usa Chrome, Edge o Brave.
        </div>
      )}

      <div className="space-y-3">
        {devices.length === 0 ? (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
            <p className="text-gray-500">No hay impresoras configuradas</p>
            <p className="text-sm text-gray-400 mt-2">
              Haz clic en "Agregar Impresora" para conectar una
            </p>
          </div>
        ) : (
          devices.map((device) => (
            <PrinterDeviceCard
              key={device.id}
              device={device}
              isDefault={device.is_default}
              onSetDefault={() => handleSetDefault(device.id)}
              onDelete={() => handleDelete(device.id)}
              onTest={() => handleTest(device.id)}
              onConfigure={(config) => handleConfigureDevice(device.id, config)}
              loading={loading}
            />
          ))
        )}
      </div>

      {devices.length > 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-4">
          <h3 className="font-bold text-gray-900">Configuración General</h3>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={autoPrint}
              onChange={(e) => handleAutoPrintChange(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 cursor-pointer"
            />
            <span className="text-sm text-gray-700">Auto-imprimir recibos al confirmar pago</span>
          </label>

          <div>
            <label className="text-sm text-gray-700 mb-2 block">Copias por recibo</label>
            <input
              type="number"
              value={copies}
              min={1}
              max={5}
              onChange={(e) => handleCopiesChange(Number(e.target.value))}
              className="w-20 px-3 py-1 bg-white border border-gray-200 rounded text-gray-900 text-sm"
            />
          </div>
        </div>
      )}
    </div>
  );
}

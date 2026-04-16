'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { Plus, AlertCircle, CheckCircle } from 'lucide-react';
import { PrinterDeviceCard } from '@/components/admin/PrinterDeviceCard';
import { useWebUSB } from '@/lib/hooks/useWebUSB';
import { testPrinterConnection, getPrinterLogs } from '@/lib/pos-printer';
import type { PrinterDevice } from '@/types/printer';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function PrintersConfigPage() {
  const searchParams = useSearchParams();
  const domain = searchParams.get('domain');

  const [tenantId, setTenantId] = useState<string | null>(null);
  const [devices, setDevices] = useState<PrinterDevice[]>([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const webusb = useWebUSB();

  // Load tenant from domain
  useEffect(() => {
    const loadTenant = async () => {
      if (!domain) return;

      try {
        const { data } = await supabase
          .from('tenants')
          .select('id')
          .eq('slug', domain)
          .single();

        if (data) {
          setTenantId(data.id);
        }
      } catch (error) {
        console.error('Error loading tenant:', error);
      }
    };

    loadTenant();
  }, [domain]);

  // Load devices
  useEffect(() => {
    const loadDevices = async () => {
      if (!tenantId) return;

      try {
        const response = await fetch(`/api/devices?tenantId=${tenantId}`);
        const data = await response.json();
        setDevices(data.devices || []);
      } catch (error) {
        console.error('Error loading devices:', error);
        showToast('Error al cargar dispositivos', 'error');
      }
    };

    loadDevices();
  }, [tenantId]);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleAddPrinter = async () => {
    if (!webusb.isSupported) {
      showToast('WebUSB no soportado en este navegador', 'error');
      return;
    }

    try {
      const device = await webusb.requestDevice();
      if (!device) return;

      setLoading(true);

      // Crear dispositivo en BD
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
        }),
      });

      if (!response.ok) throw new Error('Error al crear dispositivo');

      const newDevice = await response.json();
      setDevices([newDevice.device, ...devices]);

      // Conectar
      await webusb.connectDevice(device);

      showToast('Impresora agregada correctamente', 'success');
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Error desconocido';
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSetDefault = async (deviceId: string) => {
    if (!tenantId) return;

    try {
      setLoading(true);

      // Update restaurant_settings
      const response = await fetch(`/api/devices?id=${deviceId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          is_default: true,
        }),
      });

      if (!response.ok) throw new Error('Error al actualizar');

      // Update local settings
      const { error } = await supabase
        .from('restaurant_settings')
        .upsert({
          tenant_id: tenantId,
          default_receipt_printer_id: deviceId,
        }, { onConflict: 'tenant_id' });

      if (error) throw error;

      // Update devices list
      setDevices(
        devices.map((d) => ({
          ...d,
          is_default: d.id === deviceId,
        }))
      );

      showToast('Impresora predeterminada actualizada', 'success');
    } catch (error) {
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

      setDevices(devices.filter((d) => d.id !== deviceId));
      showToast('Dispositivo eliminado', 'success');
    } catch (error) {
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

      if (result.success) {
        showToast(result.message, 'success');
      } else {
        showToast(result.message, 'error');
      }
    } catch (error) {
      showToast('Error al probar impresora', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!tenantId) {
    return <div className="text-center text-gray-400">Cargando...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Configuración de Impresoras</h1>
        <p className="text-sm text-gray-400 mt-1">
          Configura impresoras USB térmicas para imprimir recibos automáticamente
        </p>
      </div>

      {/* Toast */}
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

      {/* Add Button */}
      <button
        onClick={handleAddPrinter}
        disabled={loading || !webusb.isSupported}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg font-medium transition"
      >
        <Plus className="w-5 h-5" />
        Agregar Impresora
      </button>

      {!webusb.isSupported && (
        <div className="bg-yellow-900/30 border border-yellow-700 text-yellow-300 p-4 rounded-lg text-sm">
          ⚠️ WebUSB no es soportado en este navegador. Usa Chrome, Edge o Brave.
        </div>
      )}

      {/* Devices List */}
      <div className="space-y-3">
        {devices.length === 0 ? (
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-8 text-center">
            <p className="text-gray-400">No hay impresoras configuradas</p>
            <p className="text-sm text-gray-500 mt-2">
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
              onConfigure={() => {}}
              loading={loading}
            />
          ))
        )}
      </div>

      {/* General Settings */}
      {devices.length > 0 && (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 space-y-4">
          <h3 className="font-bold text-white">Configuración General</h3>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              defaultChecked
              className="w-4 h-4 rounded bg-gray-700 border-gray-600 cursor-pointer"
            />
            <span className="text-sm text-gray-300">Auto-imprimir recibos al confirmar pago</span>
          </label>

          <div>
            <label className="text-sm text-gray-300 mb-2 block">Copias por recibo</label>
            <input
              type="number"
              defaultValue={1}
              min={1}
              max={5}
              className="w-20 px-3 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm"
            />
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import { useState } from 'react';
import { Printer, Trash2, Settings, Play } from 'lucide-react';
import type { PrinterDevice } from '@/types/printer';

interface PrinterDeviceCardProps {
  device: PrinterDevice;
  isDefault: boolean;
  onSetDefault: () => void;
  onDelete: () => void;
  onTest: () => void;
  onConfigure: () => void;
  loading?: boolean;
}

export function PrinterDeviceCard({
  device,
  isDefault,
  onSetDefault,
  onDelete,
  onTest,
  onConfigure,
  loading = false,
}: PrinterDeviceCardProps) {
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const isBrowserDriver = device.config?.connection_mode === 'browser_driver' || (!device.vendor_id && !device.product_id);
  const isWebUsbPrinter = device.config?.connection_mode === 'webusb' || Boolean(device.vendor_id && device.product_id);
  const isConnected = device.status === 'connected';
  const canPrintTest = isConnected || isBrowserDriver || isWebUsbPrinter;
  const lastUsed = device.last_used_at
    ? new Date(device.last_used_at).toLocaleDateString()
    : 'Nunca';

  const statusLabel = isConnected
    ? 'Conectada'
    : isBrowserDriver
      ? 'Lista por Windows'
      : isWebUsbPrinter
        ? 'Autorizada'
        : 'Desconectada';

  return (
    <div className="bg-card border border-border rounded-lg p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Printer className={`w-5 h-5 ${canPrintTest ? 'text-green-500' : 'text-gray-500'}`} />
            <h3 className="font-bold text-white">{device.name}</h3>
            {isDefault && (
              <span className="px-2 py-1 bg-blue-600 text-white text-xs rounded font-medium">
                Default
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {isBrowserDriver && 'Driver de Windows'}
            {!isBrowserDriver && device.device_type === 'receipt' && 'Impresora de recibos'}
            {device.device_type === 'kitchen' && 'Impresora de cocina'}
            {device.device_type === 'scale' && 'Bascula'}
          </p>
        </div>

        <div className="text-right">
          <div className={`text-xs font-bold ${canPrintTest ? 'text-green-400' : 'text-red-400'}`}>
            {statusLabel}
          </div>
          <p className="text-xs text-gray-500 mt-1">Uso: {lastUsed}</p>
        </div>
      </div>

      <div className="text-xs text-muted-foreground space-y-1 bg-muted p-2 rounded">
        {device.vendor_id && <p>Vendor ID: {device.vendor_id}</p>}
        {device.product_id && <p>Product ID: {device.product_id}</p>}
        {device.serial_number && <p>S/N: {device.serial_number}</p>}
      </div>

      <div className="text-xs text-muted-foreground bg-muted p-2 rounded space-y-1">
        <p>Ancho de papel: {device.config?.paper_width || 80}mm</p>
        <p>Copias: {device.config?.copies || 1}</p>
        <p>Auto-imprimir: {device.config?.auto_print ? 'Habilitado' : 'Deshabilitado'}</p>
        {isBrowserDriver && <p>Modo: impresora predeterminada de Windows/Chrome</p>}
        {isWebUsbPrinter && !isBrowserDriver && <p>Modo: USB directo autorizado por Chrome</p>}
      </div>

      <div className="flex gap-2 flex-wrap">
        <button
          onClick={onTest}
          disabled={loading || !canPrintTest}
          className="flex-1 min-w-fit px-2 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white text-xs rounded font-medium flex items-center justify-center gap-1 transition"
          title="Imprimir pagina de prueba"
        >
          <Play className="w-3 h-3" />
          Test
        </button>

        <button
          onClick={onConfigure}
          disabled={loading}
          className="flex-1 min-w-fit px-2 py-1.5 bg-gray-700 hover:bg-gray-600 disabled:cursor-not-allowed text-white text-xs rounded font-medium flex items-center justify-center gap-1 transition"
          title="Configurar dispositivo"
        >
          <Settings className="w-3 h-3" />
          Config
        </button>

        {!isDefault && (
          <button
            onClick={onSetDefault}
            disabled={loading}
            className="flex-1 min-w-fit px-2 py-1.5 bg-green-600 hover:bg-green-700 disabled:cursor-not-allowed text-white text-xs rounded font-medium transition"
            title="Establecer como predeterminada"
          >
            Default
          </button>
        )}

        <button
          onClick={() => setShowConfirmDelete(true)}
          disabled={loading || isDefault}
          className="flex-1 min-w-fit px-2 py-1.5 bg-red-600 hover:bg-red-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white text-xs rounded font-medium flex items-center justify-center gap-1 transition"
          title="Eliminar dispositivo"
        >
          <Trash2 className="w-3 h-3" />
          Eliminar
        </button>
      </div>

      {showConfirmDelete && (
        <div className="bg-red-900/30 border border-red-700 rounded p-3 space-y-2">
          <p className="text-sm text-red-300 font-medium">Eliminar este dispositivo?</p>
          <p className="text-xs text-red-200">Esta accion no se puede deshacer.</p>
          <div className="flex gap-2">
            <button
              onClick={() => {
                onDelete();
                setShowConfirmDelete(false);
              }}
              disabled={loading}
              className="flex-1 px-2 py-1 bg-red-600 hover:bg-red-700 disabled:cursor-not-allowed text-white text-xs rounded font-medium transition"
            >
              Confirmar
            </button>
            <button
              onClick={() => setShowConfirmDelete(false)}
              disabled={loading}
              className="flex-1 px-2 py-1 bg-gray-700 hover:bg-gray-600 disabled:cursor-not-allowed text-white text-xs rounded font-medium transition"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

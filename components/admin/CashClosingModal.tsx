'use client';

import { useState } from 'react';
import { X, Check, AlertCircle } from 'lucide-react';
import { getCurrencyByCountry, formatPriceWithCurrency } from '@/lib/currency';

interface CashClosingData {
  cashSales: number;
  cardSales: number;
  otherSales: number;
  totalSales: number;
  totalTax: number;
  totalDiscount: number;
  transactionCount: number;
  ordersCompleted: number;
  ordersCancelled: number;
  staffName: string;
  periodStart: string;
  periodEnd: string;
  businessDateLabel: string;
  operationalCloseTime: string;
}

interface CashClosingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (actualCash: number, notes: string) => Promise<void>;
  data: CashClosingData;
  country?: string;
  isLoading?: boolean;
}

export function CashClosingModal({
  isOpen,
  onClose,
  onConfirm,
  data,
  country = 'CO',
  isLoading = false,
}: CashClosingModalProps) {
  const [actualCash, setActualCash] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get currency info based on country
  const currencyInfo = getCurrencyByCountry(country);

  const expectedTotal = data.cashSales;
  const difference = expectedTotal - Number(actualCash);
  const isBalanced = Math.abs(difference) < 0.01;
  const isDifferenceSignificant = Math.abs(difference) > 5;

  const handleConfirm = async () => {
    if (!actualCash) {
      alert('Por favor ingresa el monto de efectivo contado');
      return;
    }

    setIsSubmitting(true);
    try {
      await onConfirm(Number(actualCash), notes);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white">
          <h2 className="text-2xl font-bold text-gray-900">Cierre de Caja</h2>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="text-muted-foreground hover:text-gray-600 disabled:opacity-50"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Resumen de Ventas */}
          <div className="rounded-xl border-2 border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-black uppercase tracking-wide text-amber-700">Dia operativo</p>
            <p className="mt-1 text-lg font-black capitalize text-amber-950">{data.businessDateLabel}</p>
            <p className="mt-1 text-sm font-semibold text-amber-800">
              Cuenta ventas desde {new Date(data.periodStart).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })} hasta {new Date(data.periodEnd).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })}
            </p>
            <p className="mt-1 text-xs font-bold text-amber-700">Corte operativo: {data.operationalCloseTime === 'manual' ? 'manual' : data.operationalCloseTime}</p>
          </div>

          {/* Resumen de Ventas */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Resumen de Ventas</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-blue-600 font-medium">Ventas en Efectivo</p>
                <p className="text-2xl font-bold text-blue-900">{formatPriceWithCurrency(data.cashSales, currencyInfo.code, currencyInfo.locale)}</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-sm text-green-600 font-medium">Ventas con Tarjeta</p>
                <p className="text-2xl font-bold text-green-900">{formatPriceWithCurrency(data.cardSales, currencyInfo.code, currencyInfo.locale)}</p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <p className="text-sm text-purple-600 font-medium">Impuestos</p>
                <p className="text-2xl font-bold text-purple-900">{formatPriceWithCurrency(data.totalTax, currencyInfo.code, currencyInfo.locale)}</p>
              </div>
              <div className="bg-red-50 p-4 rounded-lg">
                <p className="text-sm text-red-600 font-medium">Descuentos</p>
                <p className="text-2xl font-bold text-red-900">{formatPriceWithCurrency(-data.totalDiscount, currencyInfo.code, currencyInfo.locale)}</p>
              </div>
            </div>
          </div>

          {/* Detalles de Transacciones */}
          <div className="bg-gray-50 p-4 rounded-lg space-y-3">
            <h4 className="font-semibold text-gray-900">Detalles de Transacciones</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Total de Transacciones</p>
                <p className="text-lg font-bold text-gray-900">{data.transactionCount}</p>
              </div>
              <div>
                <p className="text-gray-600">Órdenes Completadas</p>
                <p className="text-lg font-bold text-gray-900">{data.ordersCompleted}</p>
              </div>
              <div>
                <p className="text-gray-600">Órdenes Canceladas</p>
                <p className="text-lg font-bold text-gray-900">{data.ordersCancelled}</p>
              </div>
              <div>
                <p className="text-gray-600">Personal</p>
                <p className="text-lg font-bold text-gray-900">{data.staffName}</p>
              </div>
            </div>
          </div>

          {/* Monto Esperado */}
          <div className="border-2 border-blue-200 bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-blue-600 font-medium mb-1">Monto Esperado (Efectivo)</p>
            <p className="text-3xl font-bold text-blue-900">{formatPriceWithCurrency(expectedTotal, currencyInfo.code, currencyInfo.locale)}</p>
          </div>

          {/* Monto Real Contado */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Monto Real Contado en Caja
            </label>
            <div className="relative">
              <span className="absolute left-3 top-3 text-gray-500 text-lg font-semibold">{currencyInfo.symbol}</span>
              <input
                type="number"
                step="0.01"
                value={actualCash}
                onChange={(e) => setActualCash(e.target.value)}
                placeholder="0.00"
                disabled={isSubmitting}
                className="cash-closing-field w-full pl-8 pr-4 py-3 text-lg rounded-lg focus:outline-none disabled:bg-gray-100"
              />
            </div>
          </div>

          {/* Diferencia */}
          {actualCash && (
            <div className={`p-4 rounded-lg ${isBalanced ? 'bg-green-50 border-2 border-green-200' : isDifferenceSignificant ? 'bg-red-50 border-2 border-red-200' : 'bg-yellow-50 border-2 border-yellow-200'}`}>
              <div className="flex items-start gap-3">
                {isBalanced ? (
                  <Check className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                )}
                <div className="flex-1">
                  <p className={`text-sm font-medium ${isBalanced ? 'text-green-600' : isDifferenceSignificant ? 'text-red-600' : 'text-yellow-600'}`}>
                    {isBalanced ? 'Caja Balanceada ✓' : `Diferencia: ${formatPriceWithCurrency(Math.abs(difference), currencyInfo.code, currencyInfo.locale)}`}
                  </p>
                  {!isBalanced && (
                    <p className={`text-xs mt-1 ${isDifferenceSignificant ? 'text-red-600' : 'text-yellow-600'}`}>
                      {difference > 0 ? 'Faltante' : 'Sobrante'} de {formatPriceWithCurrency(Math.abs(difference), currencyInfo.code, currencyInfo.locale)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Notas */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Notas (Opcional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Explica cualquier diferencia o observación importante..."
              disabled={isSubmitting}
              rows={3}
              className="cash-closing-field w-full px-4 py-3 rounded-lg focus:outline-none resize-none disabled:bg-gray-100"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t bg-gray-50 sticky bottom-0">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 px-4 py-2 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-100 disabled:opacity-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={isSubmitting || !actualCash}
            className="flex-1 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {isSubmitting ? 'Guardando...' : 'Confirmar Cierre'}
          </button>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { X, Check, AlertCircle } from 'lucide-react';
import { getCurrencyByCountry, formatPriceWithCurrency } from '@/lib/currency';
import { useTouchDevice } from '@/lib/hooks/useTouchDevice';
import { NumericKeyboard } from './NumericKeyboard';

interface CashClosingData {
  cashSales: number;
  cardSales: number;
  otherSales: number;
  totalSales: number;
  totalDeliveryFees?: number;
  deliveryOrderCount?: number;
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
  const [showCashKeyboard, setShowCashKeyboard] = useState(false);
  const isTouchDevice = useTouchDevice();

  const currencyInfo = getCurrencyByCountry(country);
  const expectedTotal = data.cashSales;
  const paymentSalesTotal = data.cashSales + data.cardSales;
  const difference = expectedTotal - Number(actualCash);
  const isBalanced = Math.abs(difference) < 0.01;
  const isDifferenceSignificant = Math.abs(difference) > 5;
  const isBusy = isSubmitting || isLoading;

  const statCard =
    'rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.06)]';
  const fieldClass =
    'w-full rounded-2xl border border-slate-200 bg-white py-3 text-lg font-black text-slate-950 outline-none placeholder:text-slate-400 focus:border-orange-500 focus:ring-4 focus:ring-orange-100 disabled:opacity-50';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-md">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[1.75rem] border border-slate-200 bg-white text-slate-950 shadow-[0_28px_90px_rgba(15,23,42,0.22)]">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white p-6 backdrop-blur-xl">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-orange-600">Caja</p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">Cierre de Caja</h2>
          </div>
          <button
            onClick={onClose}
            disabled={isBusy}
            className="grid h-11 w-11 place-items-center rounded-2xl border border-slate-200 bg-white text-slate-600 transition hover:border-orange-300 hover:text-orange-700 disabled:opacity-50"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6 p-6">
          <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-700">Dia operativo</p>
            <p className="mt-2 text-lg font-black capitalize text-slate-950">{data.businessDateLabel}</p>
            <p className="mt-2 text-sm font-semibold text-slate-600">
              Cuenta ventas desde{' '}
              {new Date(data.periodStart).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })}{' '}
              hasta {new Date(data.periodEnd).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })}
            </p>
            <p className="mt-1 text-xs font-bold uppercase tracking-[0.16em] text-orange-700">
              Corte operativo: {data.operationalCloseTime === 'manual' ? 'manual' : data.operationalCloseTime}
            </p>
          </div>

          <section>
            <h3 className="mb-4 text-lg font-black text-slate-950">Resumen de Ventas</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className={statCard}>
                <p className="text-sm font-black text-[#ff6b35]">Ventas en Efectivo</p>
                <p className="mt-2 text-2xl font-black text-orange-700">
                  {formatPriceWithCurrency(data.cashSales, currencyInfo.code, currencyInfo.locale)}
                </p>
              </div>
              <div className={statCard}>
                <p className="text-sm font-black text-[#70f7c2]">Ventas con Tarjeta</p>
                <p className="mt-2 text-2xl font-black text-[#70f7c2]">
                  {formatPriceWithCurrency(data.cardSales, currencyInfo.code, currencyInfo.locale)}
                </p>
              </div>
              <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4 sm:col-span-2">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-sm font-black uppercase tracking-[0.16em] text-orange-700">
                      Total efectivo + tarjeta
                    </p>
                    <p className="mt-1 text-xs font-bold text-slate-600">
                      Suma de las ventas cobradas en caja y por tarjeta
                    </p>
                  </div>
                  <p className="text-3xl font-black text-slate-950">
                    {formatPriceWithCurrency(paymentSalesTotal, currencyInfo.code, currencyInfo.locale)}
                  </p>
                </div>
              </div>
              <div className="rounded-2xl border border-[#38bdf8]/32 bg-[#38bdf8]/10 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] sm:col-span-2">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-sm font-black uppercase tracking-[0.16em] text-[#7dd3fc]">
                      Domicilios cobrados
                    </p>
                    <p className="mt-1 text-xs font-bold text-slate-600">
                      {data.deliveryOrderCount || 0} pedido{(data.deliveryOrderCount || 0) === 1 ? '' : 's'} con cobro de domicilio
                    </p>
                  </div>
                  <p className="text-3xl font-black text-[#e0f2fe]">
                    {formatPriceWithCurrency(data.totalDeliveryFees || 0, currencyInfo.code, currencyInfo.locale)}
                  </p>
                </div>
              </div>
              <div className={statCard}>
                <p className="text-sm font-black text-[#bda7ff]">Impuestos</p>
                <p className="mt-2 text-2xl font-black text-[#c7b8ff]">
                  {formatPriceWithCurrency(data.totalTax, currencyInfo.code, currencyInfo.locale)}
                </p>
              </div>
              <div className={statCard}>
                <p className="text-sm font-black text-[#ff8f8f]">Descuentos</p>
                <p className="mt-2 text-2xl font-black text-[#ff9d9d]">
                  {formatPriceWithCurrency(-data.totalDiscount, currencyInfo.code, currencyInfo.locale)}
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <h4 className="font-black text-slate-950">Detalles de Transacciones</h4>
            <div className="mt-4 grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
              <div>
                <p className="font-semibold text-slate-600">Ventas cobradas</p>
                <p className="mt-1 text-lg font-black text-slate-950">{data.transactionCount}</p>
              </div>
              <div>
                <p className="font-semibold text-slate-600">Ordenes canceladas</p>
                <p className="mt-1 text-lg font-black text-slate-950">{data.ordersCancelled}</p>
              </div>
              <div>
                <p className="font-semibold text-slate-600">Personal</p>
                <p className="mt-1 text-lg font-black text-slate-950">{data.staffName}</p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-orange-200 bg-orange-50 p-4">
            <p className="text-sm font-black uppercase tracking-[0.16em] text-orange-700">Monto esperado en efectivo</p>
            <p className="mt-2 text-3xl font-black text-slate-950">
              {formatPriceWithCurrency(expectedTotal, currencyInfo.code, currencyInfo.locale)}
            </p>
          </section>

          <section>
            <label className="mb-2 block text-sm font-black uppercase tracking-[0.14em] text-orange-700">
              Monto real contado en caja
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-black text-orange-700">
                {currencyInfo.symbol}
              </span>
              <input
                type="number"
                inputMode={isTouchDevice ? 'none' : 'decimal'}
                step="0.01"
                value={actualCash}
                readOnly={isTouchDevice}
                onPointerDown={(e) => {
                  if (!isTouchDevice) return;
                  e.preventDefault();
                  setShowCashKeyboard(true);
                }}
                onFocus={() => {
                  if (isTouchDevice) setShowCashKeyboard(true);
                }}
                onChange={(e) => setActualCash(e.target.value)}
                placeholder="0.00"
                disabled={isBusy}
                className={`${fieldClass} pl-10 pr-4`}
              />
            </div>
          </section>

          {actualCash && (
            <section
              className={`rounded-2xl border p-4 ${
                isBalanced
                  ? 'border-[#70f7c2]/35 bg-[#70f7c2]/10'
                  : isDifferenceSignificant
                    ? 'border-[#ff6b6b]/35 bg-[#ff6b6b]/10'
                    : 'border-orange-200 bg-orange-50'
              }`}
            >
              <div className="flex items-start gap-3">
                {isBalanced ? (
                  <Check className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#70f7c2]" />
                ) : (
                  <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#ff8f8f]" />
                )}
                <div className="flex-1">
                  <p
                    className={`text-sm font-black ${
                      isBalanced ? 'text-[#70f7c2]' : isDifferenceSignificant ? 'text-[#ff8f8f]' : 'text-[#ffd66b]'
                    }`}
                  >
                    {isBalanced
                      ? 'Caja balanceada'
                      : `Diferencia: ${formatPriceWithCurrency(Math.abs(difference), currencyInfo.code, currencyInfo.locale)}`}
                  </p>
                  {!isBalanced && (
                    <p className="mt-1 text-xs font-semibold text-slate-600">
                      {difference > 0 ? 'Faltante' : 'Sobrante'} de{' '}
                      {formatPriceWithCurrency(Math.abs(difference), currencyInfo.code, currencyInfo.locale)}
                    </p>
                  )}
                </div>
              </div>
            </section>
          )}

          <section>
            <label className="mb-2 block text-sm font-black uppercase tracking-[0.14em] text-orange-700">
              Notas opcionales
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Explica cualquier diferencia u observacion importante..."
              disabled={isBusy}
              rows={3}
              className={`${fieldClass} resize-none px-4`}
            />
          </section>
        </div>

        <div className="sticky bottom-0 flex gap-3 border-t border-slate-200 bg-white p-6 backdrop-blur-xl">
          <button
            onClick={onClose}
            disabled={isBusy}
            className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 font-black text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={isBusy || !actualCash}
            className="flex-1 rounded-2xl bg-orange-500 px-4 py-3 font-black text-white shadow-[0_16px_35px_rgba(249,115,22,0.24)] transition hover:bg-orange-600 disabled:opacity-50"
          >
            {isSubmitting ? 'Guardando...' : 'Confirmar cierre'}
          </button>
        </div>
      </div>

      <NumericKeyboard
        isOpen={showCashKeyboard}
        title="Efectivo contado"
        initialValue={actualCash ? Number(actualCash) : 0}
        onConfirm={(value) => {
          setActualCash(value.toString());
          setShowCashKeyboard(false);
        }}
        onCancel={() => setShowCashKeyboard(false)}
        allowDecimal
      />
    </div>
  );
}

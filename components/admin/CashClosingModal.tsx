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
    'rounded-2xl border border-[#f6b92f]/16 bg-white/[0.055] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]';
  const fieldClass =
    'w-full rounded-2xl border border-[#f6b92f]/18 bg-white/[0.075] py-3 text-lg font-black text-[#fff7df] outline-none placeholder:text-[#f8f5ec]/32 focus:border-[#f6b92f] focus:ring-4 focus:ring-[#f6b92f]/14 disabled:opacity-50';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/72 p-4 backdrop-blur-md">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[1.75rem] border border-[#f6b92f]/25 bg-[linear-gradient(180deg,rgba(255,255,255,0.09),rgba(255,255,255,0.035)),#10100f] text-[#fff7df] shadow-[0_28px_90px_rgba(0,0,0,0.72),0_0_44px_rgba(246,185,47,0.12)]">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#f6b92f]/15 bg-[#10100f]/95 p-6 backdrop-blur-xl">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-[#f6b92f]">Caja</p>
            <h2 className="mt-1 text-2xl font-black text-[#fff7df]">Cierre de Caja</h2>
          </div>
          <button
            onClick={onClose}
            disabled={isBusy}
            className="grid h-11 w-11 place-items-center rounded-2xl border border-white/10 bg-white/[0.06] text-[#f8f5ec]/70 transition hover:border-[#f6b92f]/50 hover:text-[#fff7df] disabled:opacity-50"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6 p-6">
          <div className="rounded-2xl border border-[#f6b92f]/35 bg-[#f6b92f]/10 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#f6b92f]">Dia operativo</p>
            <p className="mt-2 text-lg font-black capitalize text-[#fff7df]">{data.businessDateLabel}</p>
            <p className="mt-2 text-sm font-semibold text-[#f8f5ec]/78">
              Cuenta ventas desde{' '}
              {new Date(data.periodStart).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })}{' '}
              hasta {new Date(data.periodEnd).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })}
            </p>
            <p className="mt-1 text-xs font-bold uppercase tracking-[0.16em] text-[#f6b92f]/82">
              Corte operativo: {data.operationalCloseTime === 'manual' ? 'manual' : data.operationalCloseTime}
            </p>
          </div>

          <section>
            <h3 className="mb-4 text-lg font-black text-[#fff7df]">Resumen de Ventas</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className={statCard}>
                <p className="text-sm font-black text-[#ff6b35]">Ventas en Efectivo</p>
                <p className="mt-2 text-2xl font-black text-[#ffd66b]">
                  {formatPriceWithCurrency(data.cashSales, currencyInfo.code, currencyInfo.locale)}
                </p>
              </div>
              <div className={statCard}>
                <p className="text-sm font-black text-[#70f7c2]">Ventas con Tarjeta</p>
                <p className="mt-2 text-2xl font-black text-[#70f7c2]">
                  {formatPriceWithCurrency(data.cardSales, currencyInfo.code, currencyInfo.locale)}
                </p>
              </div>
              <div className="rounded-2xl border border-[#f6b92f]/42 bg-[#f6b92f]/14 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_18px_38px_rgba(246,185,47,0.08)] sm:col-span-2">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-sm font-black uppercase tracking-[0.16em] text-[#f6b92f]">
                      Total efectivo + tarjeta
                    </p>
                    <p className="mt-1 text-xs font-bold text-[#f8f5ec]/62">
                      Suma de las ventas cobradas en caja y por tarjeta
                    </p>
                  </div>
                  <p className="text-3xl font-black text-[#fff7df]">
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
                    <p className="mt-1 text-xs font-bold text-[#f8f5ec]/62">
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

          <section className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
            <h4 className="font-black text-[#fff7df]">Detalles de Transacciones</h4>
            <div className="mt-4 grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
              <div>
                <p className="font-semibold text-[#f8f5ec]/56">Total de transacciones</p>
                <p className="mt-1 text-lg font-black text-[#fff7df]">{data.transactionCount}</p>
              </div>
              <div>
                <p className="font-semibold text-[#f8f5ec]/56">Ordenes completadas</p>
                <p className="mt-1 text-lg font-black text-[#fff7df]">{data.ordersCompleted}</p>
              </div>
              <div>
                <p className="font-semibold text-[#f8f5ec]/56">Ordenes canceladas</p>
                <p className="mt-1 text-lg font-black text-[#fff7df]">{data.ordersCancelled}</p>
              </div>
              <div>
                <p className="font-semibold text-[#f8f5ec]/56">Personal</p>
                <p className="mt-1 text-lg font-black text-[#fff7df]">{data.staffName}</p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-[#f6b92f]/35 bg-[#f6b92f]/12 p-4">
            <p className="text-sm font-black uppercase tracking-[0.16em] text-[#f6b92f]">Monto esperado en efectivo</p>
            <p className="mt-2 text-3xl font-black text-[#fff7df]">
              {formatPriceWithCurrency(expectedTotal, currencyInfo.code, currencyInfo.locale)}
            </p>
          </section>

          <section>
            <label className="mb-2 block text-sm font-black uppercase tracking-[0.14em] text-[#f6b92f]">
              Monto real contado en caja
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-black text-[#f6b92f]">
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
                    : 'border-[#f6b92f]/35 bg-[#f6b92f]/10'
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
                    <p className="mt-1 text-xs font-semibold text-[#f8f5ec]/70">
                      {difference > 0 ? 'Faltante' : 'Sobrante'} de{' '}
                      {formatPriceWithCurrency(Math.abs(difference), currencyInfo.code, currencyInfo.locale)}
                    </p>
                  )}
                </div>
              </div>
            </section>
          )}

          <section>
            <label className="mb-2 block text-sm font-black uppercase tracking-[0.14em] text-[#f6b92f]">
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

        <div className="sticky bottom-0 flex gap-3 border-t border-[#f6b92f]/15 bg-[#10100f]/95 p-6 backdrop-blur-xl">
          <button
            onClick={onClose}
            disabled={isBusy}
            className="flex-1 rounded-2xl border border-white/12 bg-white/[0.06] px-4 py-3 font-black text-[#fff7df] transition hover:border-white/25 hover:bg-white/[0.09] disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={isBusy || !actualCash}
            className="flex-1 rounded-2xl bg-gradient-to-r from-[#c97905] via-[#f6b92f] to-[#ffe08a] px-4 py-3 font-black text-[#11100d] shadow-[0_16px_35px_rgba(246,185,47,0.24)] transition hover:brightness-110 disabled:opacity-50"
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

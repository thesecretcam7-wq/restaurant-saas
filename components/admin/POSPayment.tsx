'use client';

import { useState } from 'react';
import { DollarSign, CreditCard } from 'lucide-react';
import { calculateChange, getSuggestedBillAmounts, formatCurrency } from '@/lib/pos-utils';
import { getCurrencyByCountry, formatPriceWithCurrency } from '@/lib/currency';
import { useTouchDevice } from '@/lib/hooks/useTouchDevice';
import { NumericKeyboard } from './NumericKeyboard';

type PaymentMethod = 'cash' | 'stripe';

interface POSPaymentProps {
  total: number;
  tip: number;
  onTipChange: (tip: number) => void;
  paymentMethod: PaymentMethod;
  onPaymentMethodChange: (method: PaymentMethod) => void;
  onProceedPayment: (amountPaid?: number) => void;
  disabled?: boolean;
  loading?: boolean;
  country?: string;
  compact?: boolean;
}

export function POSPayment({
  total,
  tip,
  onTipChange,
  paymentMethod,
  onPaymentMethodChange,
  onProceedPayment,
  disabled = false,
  loading = false,
  country = 'CO',
  compact = false,
}: POSPaymentProps) {
  const currencyInfo = getCurrencyByCountry(country);
  const isTouchDevice = useTouchDevice();
  const [amountPaid, setAmountPaid] = useState<string>('');
  const [change, setChange] = useState<number>(0);
  const [showNumericKeyboard, setShowNumericKeyboard] = useState(false);
  const [showTipKeyboard, setShowTipKeyboard] = useState(false);
  const totalWithTip = total + tip;

  const suggestedAmounts = getSuggestedBillAmounts(totalWithTip);
  const paidAmount = amountPaid ? Number(amountPaid) : 0;

  const handleAmountChange = (value: string) => {
    setAmountPaid(value);
    if (value && !isNaN(Number(value))) {
      setChange(calculateChange(totalWithTip, Number(value)));
    }
  };

  const handleSuggestedAmount = (amount: number) => {
    setAmountPaid(amount.toString());
    setChange(calculateChange(totalWithTip, amount));
  };

  const handleConfirmPaymentAmount = (value: number) => {
    setAmountPaid(value.toString());
    setChange(calculateChange(totalWithTip, value));
    setShowNumericKeyboard(false);
  };

  const isValidPayment = paymentMethod === 'stripe' || (paymentMethod === 'cash' && paidAmount >= totalWithTip);

  return (
    <div className={compact ? 'space-y-1.5 text-xs' : 'space-y-2'}>
      {/* Propina */}
      <div className={`pos-card flex items-center gap-2 rounded-xl ${compact ? 'px-2 py-1.5' : 'px-3 py-2'}`}>
        <span className="text-slate-400 text-xs flex-1">Propina</span>
        <button
          onClick={() => setShowTipKeyboard(true)}
          className="text-amber-300 font-black text-sm hover:text-amber-200 transition"
        >
          {tip > 0 ? formatPriceWithCurrency(tip, currencyInfo.code, currencyInfo.locale) : '+ Agregar'}
        </button>
        {tip > 0 && (
          <button onClick={() => onTipChange(0)} className="text-gray-500 hover:text-red-400 text-xs transition">✕</button>
        )}
      </div>

      {/* Total */}
      <div className={`pos-total-band rounded-xl text-white ${compact ? 'p-2' : 'p-3'}`}>
        <p className="text-xs text-emerald-100/68 mb-0.5 font-black uppercase">Total a pagar</p>
        <p className={`${compact ? 'text-xl' : 'text-2xl'} font-black text-emerald-200`}>{formatPriceWithCurrency(totalWithTip, currencyInfo.code, currencyInfo.locale)}</p>
        {tip > 0 && <p className="text-xs opacity-70">Incl. propina {formatPriceWithCurrency(tip, currencyInfo.code, currencyInfo.locale)}</p>}
      </div>

      {/* Métodos de Pago */}
      <div className={`grid grid-cols-2 ${compact ? 'gap-2' : 'gap-3'}`}>
        <button
          onClick={() => {
            onPaymentMethodChange('cash');
            setAmountPaid('');
            setChange(0);
          }}
          disabled={disabled}
          className={`${compact ? 'py-1.5 text-xs' : 'py-2 text-sm'} rounded-xl font-black flex items-center justify-center gap-1 transition border ${
            paymentMethod === 'cash'
              ? 'bg-emerald-400/18 border-emerald-300/35 text-emerald-50'
              : 'bg-white/10 border-white/10 text-slate-400 hover:text-white'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <DollarSign className="w-5 h-5" />
          Efectivo
        </button>
        <button
          onClick={() => onPaymentMethodChange('stripe')}
          disabled={disabled}
          className={`${compact ? 'py-1.5 text-xs' : 'py-2 text-sm'} rounded-xl font-black flex items-center justify-center gap-1 transition border ${
            paymentMethod === 'stripe'
              ? 'bg-cyan-300/18 border-cyan-300/35 text-cyan-50'
              : 'bg-white/10 border-white/10 text-slate-400 hover:text-white'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <CreditCard className="w-5 h-5" />
          Tarjeta
        </button>
      </div>

      {/* Ingreso de Efectivo */}
      {paymentMethod === 'cash' && (
        <div className={`pos-card rounded-xl ${compact ? 'space-y-1.5 p-2' : 'space-y-3 p-4'}`}>
          <label className="text-xs font-bold text-slate-400">Cantidad recibida</label>
          <div className="flex gap-2">
            <input
              type="number"
              inputMode={isTouchDevice ? 'none' : 'decimal'}
              min="0"
              step="0.01"
              value={amountPaid}
              readOnly={isTouchDevice}
              onPointerDown={(event) => {
                if (!isTouchDevice) return;
                event.preventDefault();
                setShowNumericKeyboard(true);
              }}
              onFocus={() => {
                if (isTouchDevice) setShowNumericKeyboard(true);
              }}
              onChange={(event) => handleAmountChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && isValidPayment && !disabled && !loading) {
                  onProceedPayment(paidAmount);
                }
              }}
              placeholder="0.00"
              className={`min-w-0 flex-1 rounded-xl border-2 border-emerald-300/35 bg-emerald-400/10 px-3 text-center font-black text-emerald-200 outline-none transition placeholder:text-emerald-200/38 focus:border-emerald-200 focus:bg-emerald-400/16 ${compact ? 'py-1.5 text-base' : 'py-2 text-lg'}`}
              title={isTouchDevice ? 'Usa el teclado interno de Eccofood' : 'Puedes escribir el dinero recibido con teclado'}
            />
            <button
              type="button"
              onClick={() => setShowNumericKeyboard(true)}
              className={`rounded-xl border border-white/10 bg-white/10 px-3 font-black text-slate-200 transition hover:bg-white/15 ${compact ? 'text-xs' : 'text-sm'}`}
              title="Abrir teclado tactil"
            >
              Teclado
            </button>
          </div>

          {/* Billetes Sugeridos */}
          <div className={compact ? 'space-y-1' : 'space-y-2'}>
            <p className="text-xs text-slate-500">Billetes sugeridos:</p>
            <div className={`grid grid-cols-4 ${compact ? 'gap-1.5' : 'gap-2'}`}>
              {suggestedAmounts.map((amount) => (
                <button
                  key={amount}
                  onClick={() => handleSuggestedAmount(amount)}
                  className={`${compact ? 'py-1' : 'py-1'} px-1 bg-white/10 hover:bg-white/15 rounded-lg text-xs font-black text-emerald-300 border border-white/10 hover:border-emerald-300/40`}
                >
                  {currencyInfo.symbol}{amount}
                </button>
              ))}
            </div>
          </div>

          {/* Cambio */}
          {paidAmount > 0 && (
            <div className={`${compact ? 'p-2' : 'p-3'} rounded-xl border ${change >= 0 ? 'bg-emerald-400/12 border-emerald-300/28' : 'bg-red-500/12 border-red-400/30'}`}>
              <p className="text-xs text-slate-400 mb-0.5">Cambio</p>
              <p className={`${compact ? 'text-lg' : 'text-2xl'} font-black ${change >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>
                {formatPriceWithCurrency(Math.abs(change), currencyInfo.code, currencyInfo.locale)}
              </p>
              {change < 0 && <p className="text-xs text-red-400 mt-1">Falta {formatPriceWithCurrency(Math.abs(change), currencyInfo.code, currencyInfo.locale)}</p>}
            </div>
          )}
        </div>
      )}

      {/* Botón Pagar */}
      <button
        onClick={() => onProceedPayment(paymentMethod === 'cash' ? paidAmount : undefined)}
        disabled={disabled || loading || !isValidPayment}
        className={`w-full ${compact ? 'min-h-[54px] py-3 text-base' : 'py-4 text-lg'} rounded-xl font-black transition border ${
          isValidPayment && !disabled && !loading
            ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 border-white/20 shadow-lg shadow-cyan-900/20'
            : 'bg-white/10 text-slate-500 border-white/10 cursor-not-allowed'
        }`}
      >
        {loading ? 'Procesando...' : `PAGAR ${formatPriceWithCurrency(totalWithTip, currencyInfo.code, currencyInfo.locale)}`}
      </button>

      {paymentMethod === 'cash' && paidAmount && change < 0 && (
        <p className="text-xs text-red-400 text-center">El monto no es suficiente</p>
      )}

      {/* Teclado efectivo */}
      <NumericKeyboard
        isOpen={showNumericKeyboard}
        title="Cantidad Recibida"
        initialValue={amountPaid ? Number(amountPaid) : 0}
        onConfirm={handleConfirmPaymentAmount}
        onCancel={() => setShowNumericKeyboard(false)}
        allowDecimal={true}
      />

      {/* Teclado propina */}
      <NumericKeyboard
        isOpen={showTipKeyboard}
        title="Propina"
        initialValue={tip}
        onConfirm={(value) => { onTipChange(value); setShowTipKeyboard(false); }}
        onCancel={() => setShowTipKeyboard(false)}
        allowDecimal={true}
      />
    </div>
  );
}

'use client';

import { useState } from 'react';
import { DollarSign, CreditCard } from 'lucide-react';
import { calculateChange, getSuggestedBillAmounts, formatCurrency } from '@/lib/pos-utils';
import { getCurrencyByCountry, formatPriceWithCurrency } from '@/lib/currency';
import { NumericKeyboard } from './NumericKeyboard';

type PaymentMethod = 'cash' | 'stripe';

interface POSPaymentProps {
  total: number;
  paymentMethod: PaymentMethod;
  onPaymentMethodChange: (method: PaymentMethod) => void;
  onProceedPayment: (amountPaid?: number) => void;
  disabled?: boolean;
  loading?: boolean;
  country?: string;
}

export function POSPayment({
  total,
  paymentMethod,
  onPaymentMethodChange,
  onProceedPayment,
  disabled = false,
  loading = false,
  country = 'CO',
}: POSPaymentProps) {
  const currencyInfo = getCurrencyByCountry(country);
  const [amountPaid, setAmountPaid] = useState<string>('');
  const [change, setChange] = useState<number>(0);
  const [showNumericKeyboard, setShowNumericKeyboard] = useState(false);

  const suggestedAmounts = getSuggestedBillAmounts(total);
  const paidAmount = amountPaid ? Number(amountPaid) : 0;

  const handleAmountChange = (value: string) => {
    setAmountPaid(value);
    if (value && !isNaN(Number(value))) {
      const calculated = calculateChange(total, Number(value));
      setChange(calculated);
    }
  };

  const handleSuggestedAmount = (amount: number) => {
    setAmountPaid(amount.toString());
    setChange(calculateChange(total, amount));
  };

  const handleConfirmPaymentAmount = (value: number) => {
    setAmountPaid(value.toString());
    setChange(calculateChange(total, value));
    setShowNumericKeyboard(false);
  };

  const isValidPayment = paymentMethod === 'stripe' || (paymentMethod === 'cash' && paidAmount >= total);

  return (
    <div className="space-y-1">
      {/* Total */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg p-2 text-white">
        <p className="text-sm opacity-90 mb-1">Total a Pagar</p>
        <p className="text-xl font-bold">{formatPriceWithCurrency(total, currencyInfo.code, currencyInfo.locale)}</p>
      </div>

      {/* Métodos de Pago */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => {
            onPaymentMethodChange('cash');
            setAmountPaid('');
            setChange(0);
          }}
          disabled={disabled}
          className={`py-2 rounded-lg font-bold flex items-center justify-center gap-1 text-sm transition ${
            paymentMethod === 'cash'
              ? 'bg-green-600 text-white'
              : 'bg-gray-700 text-muted-foreground hover:bg-gray-600'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <DollarSign className="w-5 h-5" />
          Efectivo
        </button>
        <button
          onClick={() => onPaymentMethodChange('stripe')}
          disabled={disabled}
          className={`py-2 rounded-lg font-bold flex items-center justify-center gap-1 text-sm transition ${
            paymentMethod === 'stripe'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-700 text-muted-foreground hover:bg-gray-600'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <CreditCard className="w-5 h-5" />
          Tarjeta
        </button>
      </div>

      {/* Ingreso de Efectivo */}
      {paymentMethod === 'cash' && (
        <div className="space-y-3 bg-card p-4 rounded-lg border border-border">
          <label className="text-xs font-medium text-muted-foreground">Cantidad Recibida</label>
          <button
            onClick={() => setShowNumericKeyboard(true)}
            className="w-full px-2 py-2 bg-gray-700 border-2 border-green-600 hover:bg-gray-600 rounded-lg text-center text-lg font-bold text-green-400 transition hover:border-green-500"
            title="Toca para ingresar cantidad"
          >
            {amountPaid ? formatPriceWithCurrency(Number(amountPaid), currencyInfo.code, currencyInfo.locale) : 'Ingresa cantidad'}
          </button>

          {/* Billetes Sugeridos */}
          <div className="space-y-2">
            <p className="text-xs text-gray-500">Billetes sugeridos:</p>
            <div className="grid grid-cols-4 gap-2">
              {suggestedAmounts.map((amount) => (
                <button
                  key={amount}
                  onClick={() => handleSuggestedAmount(amount)}
                  className="py-1 px-1 bg-gray-700 hover:bg-gray-600 rounded text-xs font-bold text-green-400 border border-gray-600 hover:border-green-500"
                >
                  {currencyInfo.symbol}{amount}
                </button>
              ))}
            </div>
          </div>

          {/* Cambio */}
          {paidAmount > 0 && (
            <div className={`p-3 rounded-lg ${change >= 0 ? 'bg-green-900' : 'bg-red-900'}`}>
              <p className="text-xs text-muted-foreground mb-1">Cambio</p>
              <p className={`text-2xl font-bold ${change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
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
        className={`w-full py-4 rounded-lg font-bold text-lg transition ${
          isValidPayment && !disabled && !loading
            ? 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white'
            : 'bg-gray-600 text-muted-foreground cursor-not-allowed'
        }`}
      >
        {loading ? 'Procesando...' : `PAGAR ${formatPriceWithCurrency(total, currencyInfo.code, currencyInfo.locale)}`}
      </button>

      {paymentMethod === 'cash' && paidAmount && change < 0 && (
        <p className="text-xs text-red-400 text-center">El monto no es suficiente</p>
      )}

      {/* Numeric Keyboard Modal */}
      <NumericKeyboard
        isOpen={showNumericKeyboard}
        title="Cantidad Recibida"
        initialValue={amountPaid ? Number(amountPaid) : 0}
        onConfirm={handleConfirmPaymentAmount}
        onCancel={() => setShowNumericKeyboard(false)}
        allowDecimal={true}
      />
    </div>
  );
}

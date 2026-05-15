/**
 * POS Utilities - Cálculos y funciones del Sistema de Punto de Venta
 */

/**
 * Calcula el cambio a retornar
 */
export function calculateChange(total: number, amountPaid: number): number {
  return Math.round((amountPaid - total) * 100) / 100;
}

/**
 * Retorna billetes sugeridos para pagar
 * Ejemplo: total 23.50 → [24, 25, 30, 50]
 */
export function getSuggestedBillAmounts(total: number, currency: string = 'EUR'): number[] {
  const normalizedTotal = Math.max(0, Number(total) || 0);
  const currencyCode = currency.toUpperCase();
  const cashStepsByCurrency: Record<string, number[]> = {
    COP: [1000, 2000, 5000, 10000, 20000, 50000, 100000],
    CLP: [1000, 2000, 5000, 10000, 20000],
    MXN: [10, 20, 50, 100, 200, 500, 1000],
    ARS: [100, 200, 500, 1000, 2000, 10000],
    PEN: [1, 2, 5, 10, 20, 50, 100, 200],
    USD: [1, 5, 10, 20, 50, 100],
    EUR: [1, 2, 5, 10, 20, 50, 100, 200, 500],
  };
  const steps = cashStepsByCurrency[currencyCode] || cashStepsByCurrency.EUR;
  const suggestions = new Set<number>();
  const roundUpTo = (step: number) => Math.ceil(normalizedTotal / step) * step;

  for (const step of steps) {
    const rounded = roundUpTo(step);
    if (rounded >= normalizedTotal && rounded > 0) suggestions.add(Number(rounded.toFixed(2)));
    if (suggestions.size >= 4) break;
  }

  for (const bill of steps) {
    if (bill >= normalizedTotal) suggestions.add(bill);
    if (suggestions.size >= 4) break;
  }

  return Array.from(suggestions).sort((a, b) => a - b).slice(0, 4);
}

/**
 * Formatea un número como moneda
 */
export function formatCurrency(amount: number, currency: string = 'COP'): string {
  const zeroDecimalCurrencies = new Set(['COP', 'CLP', 'JPY', 'KRW', 'VND', 'PYG'])
  const fractionDigits = zeroDecimalCurrencies.has(currency.toUpperCase()) ? 0 : 2

  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: currency,
    maximumFractionDigits: fractionDigits,
    minimumFractionDigits: fractionDigits,
  }).format(amount);
}

/**
 * Calcula totales de una orden
 */
export interface OrderTotals {
  subtotal: number;
  tax: number;
  deliveryFee: number;
  discount: number;
  total: number;
}

export function calculateOrderTotals(
  items: Array<{ price: number; quantity: number }>,
  taxRate: number = 0,
  deliveryFee: number = 0,
  discount: number = 0
): OrderTotals {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const tax = Math.round((subtotal * taxRate) / 100 * 100) / 100;
  const total = Math.round((subtotal + tax + deliveryFee - discount) * 100) / 100;

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    tax,
    deliveryFee,
    discount,
    total,
  };
}

/**
 * Genera número de orden único
 */
export function generateOrderNumber(): string {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `ORD-${timestamp}${random}`;
}

/**
 * Valida montos de dinero
 */
export function isValidAmount(amount: any): boolean {
  const num = Number(amount);
  return !isNaN(num) && num > 0 && num <= 999999.99;
}

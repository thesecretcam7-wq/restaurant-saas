import type { CartData } from './pos-cart-sync';

export function encodePOSCartState(cart: CartData): string {
  return JSON.stringify({ version: 1, ...cart, billingOrderIds: cart.billingOrderIds || [] });
}

export function decodePOSCartState(value: string | null): CartData | null {
  if (!value) return null;
  try {
    const data = JSON.parse(value);
    if (data?.version !== 1 || !Array.isArray(data.items) || !Array.isArray(data.billingOrderIds)) return null;
    if (data.billingOrderIds.some((id: unknown) => typeof id !== 'string' || !id)) return null;
    return data as CartData;
  } catch { return null; }
}

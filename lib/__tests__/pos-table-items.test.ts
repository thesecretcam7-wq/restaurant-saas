import { describe, expect, it } from 'vitest';
import { getPOSCartLineKey, getPOSItemQuantities, getPOSTableItemKey, mergePOSTableOrdersToCart, takePOSItemQuantities } from '../pos-table-items';

const manual = (price: number, qty = 1) => ({ name: 'Cobro manual', price, qty, notes: 'Cobro manual', is_manual: true });
const total = (items: Array<{ price: number; quantity: number }>) =>
  Math.round(items.reduce((sum, item) => sum + item.price * item.quantity, 0) * 100) / 100;

describe('table bill line identity', () => {
  it('preserves the recorded 23.20 bill with manual charges of 6 and 1.20', () => {
    const cart = mergePOSTableOrdersToCart([{ items: [
      { menu_item_id: 'beer', name: 'Caña grande', price: 2, qty: 5 },
      manual(6, 2), manual(1.2),
    ] }]);
    expect(total(cart)).toBe(23.2);
    expect(cart.filter(item => item.is_manual).map(item => [item.price, item.quantity])).toEqual([[6, 2], [1.2, 1]]);
  });

  it.each([false, true])('keeps different catalog prices separate regardless of order (reverse=%s)', reverse => {
    const orders = [
      { items: [{ item_id: 'coffee', name: 'Café', price: 1.3, qty: 2 }] },
      { items: [{ menu_item_id: 'coffee', name: 'Café', price: 1.5, quantity: 1 }] },
    ];
    const cart = mergePOSTableOrdersToCart(reverse ? orders.reverse() : orders);
    expect(cart).toHaveLength(2);
    expect(total(cart)).toBe(4.1);
    expect(cart.every(item => item.menu_item_id === 'coffee')).toBe(true);
    expect(new Set(cart.map(getPOSCartLineKey)).size).toBe(2);
  });

  it('combines only matching prices and notes and ignores zero quantities', () => {
    const cart = mergePOSTableOrdersToCart([{ items: [
      { menu_item_id: 'coffee', name: 'Café', price: 1.5, qty: 2 },
      { item_id: 'coffee', name: 'Café', price: 1.5, quantity: 3 },
      { menu_item_id: 'coffee', name: 'Café', price: 1.5, qty: 1, notes: 'Sin azúcar' },
      { menu_item_id: 'coffee', name: 'Café', price: 1.5, qty: 0 },
    ] }]);
    expect(cart.map(item => item.quantity)).toEqual([5, 1]);
    expect(total(cart)).toBe(9);
  });

  it('survives repeated save/load cycles without changing any price or total', () => {
    let cart = mergePOSTableOrdersToCart([{ items: [manual(6, 2), manual(1.2), manual(6),
      { menu_item_id: 'coffee', name: 'Café', price: 1.3, qty: 2 },
      { menu_item_id: 'coffee', name: 'Café', price: 1.5, qty: 1, notes: 'Con hielo' },
    ] }]);
    const original = structuredClone(cart);
    for (let i = 0; i < 5; i++) {
      cart = mergePOSTableOrdersToCart([{ items: cart.map(item => ({ ...item, menu_item_id: item.is_manual ? null : item.menu_item_id, qty: item.quantity })) }]);
    }
    expect(cart).toEqual(original);
    expect(total(cart)).toBe(23.3);
  });

  it('keeps same-value manual draft entries individually editable, but allocates their quantity only once', () => {
    const cart = ['manual-1', 'manual-2'].map(menu_item_id => ({ ...manual(6), menu_item_id, quantity: 1 }));
    expect(getPOSCartLineKey(cart[0])).not.toBe(getPOSCartLineKey(cart[1]));
    expect(getPOSTableItemKey(cart[0])).toBe(getPOSTableItemKey(cart[1]));
    const desired = getPOSItemQuantities(cart);
    expect(desired.get(getPOSTableItemKey(cart[0]))).toBe(2);
    desired.set(getPOSTableItemKey(cart[0]), 1); // One unit was already saved on the table.
    const extra = takePOSItemQuantities(cart, desired);
    expect(total(extra)).toBe(6);
    expect(extra).toHaveLength(1);
    expect(desired.get(getPOSTableItemKey(cart[0]))).toBe(1); // Caller state is not mutated.
  });

  it('allocates additions or split payments to the exact price and notes selected', () => {
    const cart = mergePOSTableOrdersToCart([{ items: [manual(6, 2), manual(1.2),
      { menu_item_id: 'coffee', name: 'Café', price: 1.5, qty: 2, notes: 'Con hielo' },
      { menu_item_id: 'coffee', name: 'Café', price: 1.5, qty: 1 },
    ] }]);
    const selected = getPOSItemQuantities([{ ...cart[1], quantity: 1 }, { ...cart[2], quantity: 1 }]);
    expect(takePOSItemQuantities(cart, selected)).toEqual([{ ...cart[1], quantity: 1 }, { ...cart[2], quantity: 1 }]);
    expect(total(takePOSItemQuantities(cart, selected))).toBe(2.7);
  });
});

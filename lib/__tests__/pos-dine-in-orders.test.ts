import { describe, expect, it } from 'vitest';
import { reconcileSavedDineInOrder, uniqueDineInOrders } from '../pos-dine-in-orders';
import { mergePOSTableOrdersToCart } from '../pos-table-items';

describe('real table account identity', () => {
  it('keeps two separate identical commands and their combined amount', () => {
    const items = [{ menu_item_id: 'coffee', name: 'Café', price: 3, qty: 2 }];
    const orders = [{ id: 'first', items }, { id: 'second', items }];
    const unique = uniqueDineInOrders(orders);
    expect(unique.map(order => order.id)).toEqual(['first', 'second']);
    const cart = mergePOSTableOrdersToCart(unique);
    expect(cart[0].quantity).toBe(4);
    expect(cart.reduce((total, item) => total + item.quantity * item.price, 0)).toBe(12);
  });

  it('removes repeated deliveries of the same saved ID without modifying input', () => {
    const order = { id: 'same', total: 6 };
    const orders = [order, { ...order }, { id: 'other', total: 6 }];
    expect(uniqueDineInOrders(orders)).toEqual([order, orders[2]]);
    expect(orders).toHaveLength(3);
    expect(uniqueDineInOrders(orders)[0]).toBe(order);
  });
});

describe('reconcileSavedDineInOrder', () => {
  it('keeps the server order when realtime delivered it before the POST response', () => {
    const orders = [
      { id: 'optimistic-1', order_number: 'Mesa 4', items: [{ name: 'Cafe', qty: 1 }] },
      { id: 'saved-1', order_number: 'ORD-1', items: [{ name: 'Cafe', qty: 2 }] },
    ];

    expect(reconcileSavedDineInOrder(orders, ['optimistic-1'], 'saved-1', 'ORD-1')).toEqual([
      { id: 'saved-1', order_number: 'ORD-1', items: [{ name: 'Cafe', qty: 2 }] },
    ]);
  });

  it('converts the optimistic order when realtime has not arrived yet', () => {
    const orders = [
      { id: 'optimistic-1', order_number: 'Mesa 4', items: [{ name: 'Cafe', qty: 2 }] },
      { id: 'other-order', order_number: 'ORD-2', items: [] },
    ];

    expect(reconcileSavedDineInOrder(orders, ['optimistic-1'], 'saved-1', 'ORD-1')).toEqual([
      { id: 'saved-1', order_number: 'ORD-1', items: [{ name: 'Cafe', qty: 2 }] },
      { id: 'other-order', order_number: 'ORD-2', items: [] },
    ]);
  });

  it('removes every temporary alias and repeated saved row', () => {
    const orders = [
      { id: 'optimistic-1', items: [{ qty: 1 }] },
      { id: 'optimistic-live-1', items: [{ qty: 1 }] },
      { id: 'saved-1', items: [{ qty: 2 }] },
      { id: 'saved-1', items: [{ qty: 2 }] },
    ];

    expect(reconcileSavedDineInOrder(
      orders,
      ['optimistic-1', 'optimistic-live-1'],
      'saved-1',
    )).toEqual([{ id: 'saved-1', items: [{ qty: 2 }] }]);
  });
});

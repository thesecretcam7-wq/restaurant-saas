import { describe, expect, it } from 'vitest';
import { reconcileSavedDineInOrder } from '../pos-dine-in-orders';

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

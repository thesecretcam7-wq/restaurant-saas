import { describe, expect, it } from 'vitest';
import { encodePOSCartState, decodePOSCartState } from '../pos-cart-state';
import type { CartData } from '../pos-cart-sync';

const cart: CartData = {
  items: [{ menu_item_id: 'coffee', name: 'Café', price: 3, quantity: 2 }],
  discount: 0, discountCode: '', paymentMethod: 'cash', posMode: 'table',
  selectedStaffId: null, selectedStaffName: 'TPV', selectedTableId: null,
  selectedTableNumber: 1, billingOrderIds: ['first', 'second'],
};
describe('durable cart account identity', () => {
  it('restores products together with every original order ID and table', () => {
    expect(decodePOSCartState(encodePOSCartState(cart))).toMatchObject(cart);
  });
  it('explicitly records a standalone draft with no linked orders', () => {
    const draft = decodePOSCartState(encodePOSCartState({ ...cart, billingOrderIds: undefined, posMode: 'simple' }));
    expect(draft?.billingOrderIds).toEqual([]);
  });
  it.each([null, 'bad', '[]', JSON.stringify({ version: 1, items: cart.items }), JSON.stringify({ version: 1, items: cart.items, billingOrderIds: [null] })])('does not guess account identity from legacy or invalid data %s', input => {
    expect(decodePOSCartState(input)).toBeNull();
  });
});

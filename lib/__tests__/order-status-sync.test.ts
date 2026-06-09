import { describe, expect, it } from 'vitest';
import { getAggregateOrderStatus } from '../order-status-sync';

describe('getAggregateOrderStatus', () => {
  it('marks the parent order delivered when all active items are delivered', () => {
    expect(getAggregateOrderStatus(['delivered', 'delivered'])).toBe('delivered');
  });

  it('keeps the earliest active item status while work remains', () => {
    expect(getAggregateOrderStatus(['ready', 'delivered', 'preparing'])).toBe('preparing');
  });

  it('ignores cancelled items when calculating the parent status', () => {
    expect(getAggregateOrderStatus(['cancelled', 'delivered'])).toBe('delivered');
  });

  it('returns null when there are no active items', () => {
    expect(getAggregateOrderStatus(['cancelled'])).toBeNull();
  });
});

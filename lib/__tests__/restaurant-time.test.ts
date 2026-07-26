import { describe, expect, it } from 'vitest';
import { getRestaurantBusinessPeriodRange } from '../restaurant-time';

describe('getRestaurantBusinessPeriodRange', () => {
  it('keeps the current business period unchanged by default', () => {
    const period = {
      periodStart: '2026-07-25T03:00:00.000Z',
      periodEnd: '2026-07-26T03:00:00.000Z',
      businessDateLabel: 'sabado, 25 de julio',
      operationalCloseTime: '05:00',
    };

    expect(getRestaurantBusinessPeriodRange(period)).toEqual(period);
  });

  it('extends the start by one business period to include yesterday', () => {
    expect(getRestaurantBusinessPeriodRange({
      periodStart: '2026-07-25T03:00:00.000Z',
      periodEnd: '2026-07-26T03:00:00.000Z',
      businessDateLabel: 'sabado, 25 de julio',
      operationalCloseTime: '05:00',
    }, 1).periodStart).toBe('2026-07-24T03:00:00.000Z');
  });
});

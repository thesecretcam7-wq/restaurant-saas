import { describe, expect, it } from 'vitest';
import { getSuggestedBillAmounts } from '../pos-utils';

describe('getSuggestedBillAmounts', () => {
  it('keeps larger common EUR bills available for small totals', () => {
    expect(getSuggestedBillAmounts(3, 'EUR')).toEqual([1, 2, 5, 10, 20, 50]);
  });
});

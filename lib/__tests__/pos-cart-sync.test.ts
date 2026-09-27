import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadCartFromSupabase, saveCartToSupabase } from '../pos-cart-sync';

const cartData = {
  items: [{ menu_item_id: 'item-1', name: 'Cafe', price: 2, quantity: 2 }],
  discount: 0,
  discountCode: '',
  paymentMethod: 'cash' as const,
  posMode: 'simple' as const,
  selectedStaffId: null,
  selectedStaffName: '',
  selectedTableId: null,
  selectedTableNumber: null,
};

describe('POS cart synchronization', () => {
  beforeEach(() => {
    const storage = new Map<string, string>([['pos-session-id', 'session-1']]);
    vi.stubGlobal('window', {});
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('updates only the latest active cart without reactivating it', async () => {
    const selectQuery = {
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'active-cart' }, error: null }),
    };
    const updateQuery = {
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockResolvedValue({ error: null }),
    };
    const table = {
      select: vi.fn().mockReturnValue(selectQuery),
      update: vi.fn().mockReturnValue(updateQuery),
      insert: vi.fn(),
    };
    const supabase = { from: vi.fn().mockReturnValue(table) };

    await expect(saveCartToSupabase('tenant-1', cartData, supabase)).resolves.toBe(true);

    expect(selectQuery.is).toHaveBeenCalledWith('abandoned_at', null);
    expect(selectQuery.order).toHaveBeenCalledWith('updated_at', { ascending: false });
    expect(selectQuery.limit).toHaveBeenCalledWith(1);
    expect(table.update).toHaveBeenCalledWith(expect.not.objectContaining({ abandoned_at: null }));
    expect(updateQuery.is).toHaveBeenCalledWith('abandoned_at', null);
    expect(table.insert).not.toHaveBeenCalled();
  });

  it('loads only the latest active cart for the browser session', async () => {
    const selectQuery = {
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: {
          items: cartData.items,
          discount: 0,
          payment_method: 'cash',
          pos_mode: 'simple',
        },
        error: null,
      }),
    };
    const supabase = {
      from: vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue(selectQuery) }),
    };

    await expect(loadCartFromSupabase('tenant-1', supabase)).resolves.toMatchObject({
      items: cartData.items,
      paymentMethod: 'cash',
    });

    expect(selectQuery.is).toHaveBeenCalledWith('abandoned_at', null);
    expect(selectQuery.order).toHaveBeenCalledWith('updated_at', { ascending: false });
    expect(selectQuery.limit).toHaveBeenCalledWith(1);
  });
});

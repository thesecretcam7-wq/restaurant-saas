import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { abandonCart, loadCartFromSupabase, saveCartToSupabase, loadOrderToCart } from '../pos-cart-sync';

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
    vi.useRealTimers();
  });

  it('skips only acknowledged unchanged payloads, scoped by tenant, and invalidates after payment', async () => {
    vi.useFakeTimers();vi.setSystemTime(new Date('2026-11-12T20:00Z'));
    const q:any={eq:vi.fn().mockReturnThis(),is:vi.fn().mockReturnThis(),order:vi.fn().mockReturnThis(),limit:vi.fn().mockReturnThis(),maybeSingle:vi.fn().mockResolvedValue({data:null,error:null}),then:(resolve:any)=>Promise.resolve(resolve({error:null}))};
    const table={select:vi.fn(()=>q),insert:vi.fn().mockResolvedValue({error:null}),update:vi.fn(()=>q)};
    const client={from:()=>table};
    expect(await saveCartToSupabase('a',cartData,client)).toBe(true);
    expect(await saveCartToSupabase('a',{...cartData},client)).toBe(true);
    expect(table.insert).toHaveBeenCalledTimes(1);
    await saveCartToSupabase('b',cartData,client);
    expect(table.insert).toHaveBeenCalledTimes(2);
    await saveCartToSupabase('a',{...cartData,items:[{...cartData.items[0],quantity:3}]},client);
    expect(table.insert).toHaveBeenCalledTimes(3);
    await abandonCart('a',client);
    await saveCartToSupabase('a',{...cartData,items:[{...cartData.items[0],quantity:3}]},client);
    expect(table.insert).toHaveBeenCalledTimes(4);
    vi.advanceTimersByTime(15001);
    await saveCartToSupabase('a',{...cartData,items:[{...cartData.items[0],quantity:3}]},client);
    expect(table.insert).toHaveBeenCalledTimes(5);
  });

  it('retries a failed write rather than caching success', async () => {
    const q:any={eq:()=>q,is:()=>q,order:()=>q,limit:()=>q,maybeSingle:async()=>({data:null,error:null})};
    const insert=vi.fn().mockResolvedValueOnce({error:{message:'Unavailable'}}).mockResolvedValueOnce({error:null});
    const client={from:()=>({select:()=>q,insert})};
    expect(await saveCartToSupabase('a',cartData,client)).toBe(false);
    expect(await saveCartToSupabase('a',cartData,client)).toBe(true);
    expect(insert).toHaveBeenCalledTimes(2);
  });

  it('does not acknowledge an in-flight save after payment abandoned the session', async () => {
    let release!:(value:unknown)=>void;
    const q:any={eq:()=>q,is:()=>q,order:()=>q,limit:()=>q,maybeSingle:async()=>({data:null,error:null}),then:(resolve:any)=>Promise.resolve(resolve({error:null}))};
    const insert=vi.fn().mockImplementationOnce(()=>new Promise(resolve=>{release=resolve})).mockResolvedValue({error:null});
    const client={from:()=>({select:()=>q,insert,update:()=>q})};
    const saving=saveCartToSupabase('a',cartData,client);
    await vi.waitFor(()=>expect(insert).toHaveBeenCalledTimes(1));
    await abandonCart('a',client);release({error:null});await saving;
    await saveCartToSupabase('a',cartData,client);
    expect(insert).toHaveBeenCalledTimes(2);
  });

  it('clears only this terminal cart after payment', async () => {
    const query = { eq: vi.fn().mockReturnThis(), is: vi.fn().mockResolvedValue({ error: null }) };
    const client = { from: () => ({ update: () => query }) };
    expect(await abandonCart('tenant-1', client)).toBe(true);
    expect(query.eq).toHaveBeenCalledWith('tenant_id', 'tenant-1');
    expect(query.eq).toHaveBeenCalledWith('cart_session_id', 'session-1');
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
      is: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({data:{id:'active-cart'},error:null}),
    };
    const table = {
      select: vi.fn().mockReturnValue(selectQuery),
      update: vi.fn().mockReturnValue(updateQuery),
      insert: vi.fn(),
    };
    const supabase = { from: vi.fn().mockReturnValue(table) };

    await expect(saveCartToSupabase('tenant-1', { ...cartData, billingOrderIds: ['first', 'second'] }, supabase)).resolves.toBe(true);
    expect(table.update).toHaveBeenCalledWith(expect.objectContaining({ cart_context: { version: 1, billingOrderIds: ['first', 'second'], loadedOrderId: null } }));

    expect(selectQuery.is).toHaveBeenCalledWith('abandoned_at', null);
    expect(selectQuery.order).toHaveBeenCalledWith('updated_at', { ascending: false });
    expect(selectQuery.limit).toHaveBeenCalledWith(1);
    expect(table.update).toHaveBeenCalledWith(expect.not.objectContaining({ abandoned_at: null }));
    expect(updateQuery.is).toHaveBeenCalledWith('abandoned_at', null);
    expect(updateQuery.eq).toHaveBeenCalledWith('tenant_id','tenant-1');
    expect(updateQuery.eq).toHaveBeenCalledWith('cart_session_id','session-1');
    expect(table.insert).not.toHaveBeenCalled();
  });

  it('does not confirm or cache a cart that was closed between the read and update',async()=>{
    const read:any={eq:()=>read,is:()=>read,order:()=>read,limit:()=>read,maybeSingle:async()=>({data:{id:'old-cart'},error:null})};
    const update:any={eq:vi.fn().mockReturnThis(),is:()=>update,select:()=>update,maybeSingle:vi.fn().mockResolvedValue({data:null,error:null})};
    const write=vi.fn(()=>update);const client={from:()=>({select:()=>read,update:write})};
    expect(await saveCartToSupabase('tenant',cartData,client)).toBe(false);
    expect(await saveCartToSupabase('tenant',cartData,client)).toBe(false);
    expect(write).toHaveBeenCalledTimes(2);
    expect(update.eq).toHaveBeenCalledWith('tenant_id','tenant');
    expect(update.eq).toHaveBeenCalledWith('cart_session_id','session-1');
  });

  it('invalidates an acknowledged snapshot when an existing order replaces the remote cart',async()=>{
    const read:any={eq:()=>read,is:()=>read,order:()=>read,limit:()=>read,maybeSingle:async()=>({data:{id:'cart'},error:null})};
    const update:any={eq:()=>update,is:()=>update,select:()=>update,maybeSingle:async()=>({data:{id:'cart'},error:null})};
    const write=vi.fn(()=>update);const client={from:()=>({select:()=>read,update:write})};
    expect(await saveCartToSupabase('tenant',cartData,client)).toBe(true);
    expect(await loadOrderToCart('tenant','order',{items:[{name:'Tea',price:3,quantity:1}]},client)).toBe(true);
    expect(await saveCartToSupabase('tenant',cartData,client)).toBe(true);
    expect(write).toHaveBeenCalledTimes(3);
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
          cart_context: { version: 1, billingOrderIds: ['first', 'second'] },
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
      billingOrderIds: ['first', 'second'],
    });

    expect(selectQuery.is).toHaveBeenCalledWith('abandoned_at', null);
    expect(selectQuery.order).toHaveBeenCalledWith('updated_at', { ascending: false });
    expect(selectQuery.limit).toHaveBeenCalledWith(1);
  });
});

import { createClient } from '@supabase/supabase-js';

interface CartData {
  items: Array<{
    menu_item_id: string;
    name: string;
    price: number;
    quantity: number;
  }>;
  discount: number;
  discountCode: string;
  paymentMethod: 'cash' | 'stripe';
  posMode: 'simple' | 'table';
  selectedStaffId: string | null;
  selectedStaffName: string;
  selectedTableId: string | null;
  selectedTableNumber: number | null;
  tip?: number;
  readonly?: boolean;
  loadedOrderId?: string;
}

// Get or create a unique session ID for this device/browser
export function getCartSessionId(): string {
  if (typeof window === 'undefined') return '';
  
  const key = 'pos-session-id';
  let sessionId = localStorage.getItem(key);
  
  if (!sessionId) {
    sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem(key, sessionId);
  }
  
  return sessionId;
}

// Save cart to Supabase
export async function saveCartToSupabase(
  tenantId: string,
  cartData: CartData,
  supabase: any
): Promise<boolean> {
  try {
    if (!tenantId) return false;

    const sessionId = getCartSessionId();
    const subtotal = cartData.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const total = subtotal - cartData.discount + (cartData.tip ?? 0);

    // Check if cart session already exists
    const { data: existingCart } = await supabase
      .from('pos_carts')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('cart_session_id', sessionId)
      .maybeSingle();

    if (existingCart) {
      // Update existing cart
      const { error } = await supabase
        .from('pos_carts')
        .update({
          items: cartData.items,
          discount: cartData.discount,
          discount_code: cartData.discountCode || null,
          subtotal,
          total,
          payment_method: cartData.paymentMethod,
          pos_mode: cartData.posMode,
          selected_staff_id: cartData.selectedStaffId || null,
          selected_staff_name: cartData.selectedStaffName || null,
          selected_table_id: cartData.selectedTableId || null,
          selected_table_number: cartData.selectedTableNumber || null,
          abandoned_at: null, // Mark as active
        })
        .eq('id', existingCart.id);

      return !error;
    } else {
      // Create new cart
      const { error } = await supabase
        .from('pos_carts')
        .insert({
          tenant_id: tenantId,
          cart_session_id: sessionId,
          items: cartData.items,
          discount: cartData.discount,
          discount_code: cartData.discountCode || null,
          subtotal,
          total,
          payment_method: cartData.paymentMethod,
          pos_mode: cartData.posMode,
          selected_staff_id: cartData.selectedStaffId || null,
          selected_staff_name: cartData.selectedStaffName || null,
          selected_table_id: cartData.selectedTableId || null,
          selected_table_number: cartData.selectedTableNumber || null,
        });

      return !error;
    }
  } catch (error) {
    console.error('Error saving cart to Supabase:', error);
    return false;
  }
}

// Load cart from Supabase
export async function loadCartFromSupabase(
  tenantId: string,
  supabase: any
): Promise<CartData | null> {
  try {
    if (!tenantId) return null;

    const sessionId = getCartSessionId();
    const { data: cart, error } = await supabase
      .from('pos_carts')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('cart_session_id', sessionId)
      .is('abandoned_at', null)
      .maybeSingle();

    if (error || !cart) return null;

    return {
      items: cart.items || [],
      discount: cart.discount || 0,
      discountCode: cart.discount_code || '',
      paymentMethod: cart.payment_method || 'cash',
      posMode: cart.pos_mode || 'simple',
      selectedStaffId: cart.selected_staff_id || null,
      selectedStaffName: cart.selected_staff_name || '',
      selectedTableId: cart.selected_table_id || null,
      selectedTableNumber: cart.selected_table_number || null,
      readonly: cart.readonly || false,
      loadedOrderId: cart.loaded_order_id || undefined,
    };
  } catch (error) {
    console.error('Error loading cart from Supabase:', error);
    return null;
  }
}

// Mark cart as abandoned (when payment is completed)
// Abandons ALL active carts for the tenant so the customer display resets correctly
export async function abandonCart(
  tenantId: string,
  supabase: any
): Promise<boolean> {
  try {
    if (!tenantId) return false;

    const { error } = await supabase
      .from('pos_carts')
      .update({ abandoned_at: new Date().toISOString() })
      .eq('tenant_id', tenantId)
      .is('abandoned_at', null);

    return !error;
  } catch (error) {
    console.error('Error abandoning cart:', error);
    return false;
  }
}

// Get abandoned carts (for reporting/analytics)
export async function getAbandonedCarts(
  tenantId: string,
  hoursAgo: number = 24,
  supabase: ReturnType<typeof createClient>
) {
  try {
    const cutoffTime = new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString();

    const { data: carts, error } = await supabase
      .from('pos_carts')
      .select('*')
      .eq('tenant_id', tenantId)
      .not('abandoned_at', 'is', null)
      .gt('abandoned_at', cutoffTime)
      .order('abandoned_at', { ascending: false });

    if (error) return [];
    return carts || [];
  } catch (error) {
    console.error('Error getting abandoned carts:', error);
    return [];
  }
}

// Load existing order into cart for payment
export async function loadOrderToCart(
  tenantId: string,
  orderId: string,
  order: any,
  supabase: any
): Promise<boolean> {
  try {
    if (!tenantId || !orderId) return false;

    const sessionId = getCartSessionId();

    // Convert order items to cart format
    const items = (order.items || []).map((item: any) => ({
      menu_item_id: item.id || `item-${Date.now()}`,
      name: item.name,
      price: item.price,
      quantity: item.qty || item.quantity || 1,
    }));

    const subtotal = items.reduce((sum: number, item: any) => sum + item.price * item.quantity, 0);
    const total = subtotal; // No discount/tip for existing orders

    // Check if a cart session exists
    const { data: existingCart } = await supabase
      .from('pos_carts')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('cart_session_id', sessionId)
      .maybeSingle();

    const cartData = {
      items,
      discount: 0,
      discount_code: null,
      subtotal,
      total,
      payment_method: 'cash',
      pos_mode: 'simple' as const,
      selected_staff_id: null,
      selected_staff_name: null,
      selected_table_id: null,
      selected_table_number: null,
      readonly: true, // Mark as readonly
      loaded_order_id: orderId,
      abandoned_at: null,
    };

    if (existingCart) {
      // Update existing cart
      const { error } = await supabase
        .from('pos_carts')
        .update(cartData)
        .eq('id', existingCart.id);

      return !error;
    } else {
      // Create new cart
      const { error } = await supabase
        .from('pos_carts')
        .insert({
          ...cartData,
          tenant_id: tenantId,
          cart_session_id: sessionId,
        });

      return !error;
    }
  } catch (error) {
    console.error('Error loading order to cart:', error);
    return false;
  }
}

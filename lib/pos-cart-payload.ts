import { z } from 'zod'

export const cartScope = z.object({
  tenantId: z.string().uuid(),
  sessionId: z.string().regex(/^[a-zA-Z0-9:_-]{8,160}$/),
})
const amount = z.number().finite().min(0).max(1e9)
export const persistedCartSchema = z.object({
  items: z.array(z.object({ name: z.string().min(1).max(500), price: amount, quantity: z.number().finite().positive().max(100000),
    menu_item_id: z.string().max(160).nullable().optional(), notes: z.string().max(4000).nullable().optional(), is_manual: z.boolean().optional() }).passthrough()).max(1000),
  discount: amount.default(0), discount_code: z.string().max(100).nullable().default(null),
  subtotal: amount, total: amount,
  payment_method: z.enum(['cash','stripe','mixed']).default('cash'), pos_mode: z.enum(['simple','table']).default('simple'),
  selected_staff_id: z.string().uuid().nullable().default(null), selected_staff_name: z.string().max(200).nullable().default(null),
  selected_table_id: z.string().uuid().nullable().default(null), selected_table_number: z.number().int().min(0).max(100000).nullable().default(null),
  cart_context: z.object({version:z.literal(1),billingOrderIds:z.array(z.string().min(1).max(160)).max(1000),loadedOrderId:z.string().min(1).max(160).nullable(),readonly:z.boolean().optional()}).nullable().default(null),
})
export function normalizeCartPayload(input: any, tenantId: string, sessionId: string) {
  if (!input || (input.tenant_id && input.tenant_id !== tenantId) || (input.cart_session_id && input.cart_session_id !== sessionId)) throw new Error('Invalid cart scope')
  const cart = { ...input }
  // Legacy clients used fields absent from the actual table. Keep their meaning
  // in the already-existing JSON context, without adding or losing columns.
  if (cart.loaded_order_id || cart.readonly !== undefined) cart.cart_context = {
    version:1,billingOrderIds:cart.cart_context?.billingOrderIds || (cart.loaded_order_id ? [cart.loaded_order_id] : []),
    loadedOrderId:cart.cart_context?.loadedOrderId || cart.loaded_order_id || null, readonly:cart.readonly === true,
  }
  return persistedCartSchema.parse(cart)
}

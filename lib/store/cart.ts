import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { CartItem } from '../types'

interface CartStore {
  items: CartItem[]
  tenantId: string | null
  addItem: (item: CartItem, tenantId: string) => void
  removeItem: (itemId: string) => void
  updateQty: (itemId: string, qty: number) => void
  clearCart: () => void
  total: () => number
  itemCount: () => number
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      tenantId: null,

      addItem: (item, tenantId) => {
        set(state => {
          // Clear cart if switching to different restaurant
          const items = state.tenantId && state.tenantId !== tenantId ? [] : state.items
          const existing = items.find(i => i.item_id === item.item_id)
          if (existing) {
            return {
              tenantId,
              items: items.map(i => i.item_id === item.item_id ? { ...i, qty: i.qty + 1 } : i),
            }
          }
          return { tenantId, items: [...items, { ...item, qty: 1 }] }
        })
      },

      removeItem: (itemId) => {
        set(state => ({ items: state.items.filter(i => i.item_id !== itemId) }))
      },

      updateQty: (itemId, qty) => {
        if (qty <= 0) {
          get().removeItem(itemId)
          return
        }
        set(state => ({ items: state.items.map(i => i.item_id === itemId ? { ...i, qty } : i) }))
      },

      clearCart: () => set({ items: [], tenantId: null }),

      total: () => get().items.reduce((sum, i) => sum + i.price * i.qty, 0),

      itemCount: () => get().items.reduce((sum, i) => sum + i.qty, 0),
    }),
    { name: 'restaurant-cart' }
  )
)

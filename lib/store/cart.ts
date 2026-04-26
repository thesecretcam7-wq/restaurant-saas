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

          // Find existing item with same ID and toppings
          const existing = items.find(i => {
            if (i.item_id !== item.item_id) return false
            // Check if toppings match
            const existingTops = i.toppings || []
            const newTops = item.toppings || []
            if (existingTops.length !== newTops.length) return false
            return existingTops.every(t => newTops.some(nt => nt.id === t.id))
          })

          if (existing) {
            return {
              tenantId,
              items: items.map(i =>
                i === existing ? { ...i, qty: i.qty + item.qty } : i
              ),
            }
          }
          return { tenantId, items: [...items, { ...item, qty: item.qty || 1 }] }
        })
      },

      removeItem: (itemId) => {
        set(state => {
          // Remove the last occurrence of this item ID
          for (let i = state.items.length - 1; i >= 0; i--) {
            if (state.items[i].item_id === itemId) {
              return { items: state.items.filter((_, idx) => idx !== i) }
            }
          }
          return state
        })
      },

      updateQty: (itemId, qty) => {
        if (qty <= 0) {
          get().removeItem(itemId)
          return
        }
        set(state => ({ items: state.items.map(i => i.item_id === itemId ? { ...i, qty } : i) }))
      },

      clearCart: () => set({ items: [], tenantId: null }),

      total: () => get().items.reduce((sum, i) => {
        const toppingsCost = (i.toppings || []).reduce((t, top) => t + top.price, 0)
        return sum + (i.price + toppingsCost) * i.qty
      }, 0),

      itemCount: () => get().items.reduce((sum, i) => sum + i.qty, 0),
    }),
    { name: 'restaurant-cart' }
  )
)

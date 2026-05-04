/**
 * IndexedDB Storage for Offline-First functionality
 * Handles local data persistence and sync management
 */

const DB_NAME = 'eccofood-offline'
const DB_VERSION = 1
const STORES = {
  ORDERS: 'orders',
  MENU_ITEMS: 'menu_items',
  CATEGORIES: 'categories',
  TENANT_CONFIG: 'tenant_config',
  PENDING_OPERATIONS: 'pending_operations',
}

export interface OfflineOrder {
  id: string
  orderId: string
  orderNumber: string
  tenantId?: string
  customerInfo?: {
    name: string
    email?: string | null
    phone: string
  }
  items: Array<{
    menu_item_id?: string
    name: string
    quantity: number
    qty?: number
    price: number
    notes?: string | null
  }>
  subtotal: number
  discount: number
  total: number
  paymentMethod: 'cash' | 'stripe' | 'card'
  deliveryType?: 'delivery' | 'pickup' | 'takeaway' | 'dine-in'
  deliveryAddress?: string | null
  waiter_id?: string | null
  waiterName?: string | null
  table_id?: string | null
  tableNumber?: number | null
  tip?: number | null
  notes?: string | null
  amountPaid?: number | null
  source?: 'pos-offline'
  status: 'pending' | 'completed'
  createdAt: string
  syncedAt?: string
}

export interface PendingOperation {
  id: string
  type: 'create' | 'update' | 'delete'
  table: string
  data: any
  timestamp: number
  synced: boolean
}

export class OfflineStorage {
  private db: IDBDatabase | null = null
  private dbPromise: Promise<IDBDatabase>

  constructor() {
    this.dbPromise = this.initDB()
  }

  /**
   * Initialize IndexedDB database
   */
  private initDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onerror = () => {
        console.error('Failed to open IndexedDB:', request.error)
        reject(request.error)
      }

      request.onsuccess = () => {
        this.db = request.result
        resolve(this.db)
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        // Create object stores
        if (!db.objectStoreNames.contains(STORES.ORDERS)) {
          db.createObjectStore(STORES.ORDERS, { keyPath: 'id' })
        }
        if (!db.objectStoreNames.contains(STORES.MENU_ITEMS)) {
          db.createObjectStore(STORES.MENU_ITEMS, { keyPath: 'id' })
        }
        if (!db.objectStoreNames.contains(STORES.CATEGORIES)) {
          db.createObjectStore(STORES.CATEGORIES, { keyPath: 'id' })
        }
        if (!db.objectStoreNames.contains(STORES.TENANT_CONFIG)) {
          db.createObjectStore(STORES.TENANT_CONFIG, { keyPath: 'key' })
        }
        if (!db.objectStoreNames.contains(STORES.PENDING_OPERATIONS)) {
          db.createObjectStore(STORES.PENDING_OPERATIONS, { keyPath: 'id' })
        }
      }
    })
  }

  /**
   * Ensure DB is ready
   */
  private async getDB(): Promise<IDBDatabase> {
    if (this.db) return this.db
    return this.dbPromise
  }

  /**
   * Save order to local storage
   */
  async saveOrder(order: OfflineOrder): Promise<void> {
    try {
      const db = await this.getDB()
      const transaction = db.transaction([STORES.ORDERS], 'readwrite')
      const store = transaction.objectStore(STORES.ORDERS)

      return new Promise((resolve, reject) => {
        const request = store.put({
          ...order,
          createdAt: order.createdAt || new Date().toISOString(),
        })
        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
      })
    } catch (error) {
      console.error('Error saving order:', error)
      throw error
    }
  }

  /**
   * Get all orders
   */
  async getOrders(): Promise<OfflineOrder[]> {
    try {
      const db = await this.getDB()
      const transaction = db.transaction([STORES.ORDERS], 'readonly')
      const store = transaction.objectStore(STORES.ORDERS)

      return new Promise((resolve, reject) => {
        const request = store.getAll()
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
      })
    } catch (error) {
      console.error('Error getting orders:', error)
      return []
    }
  }

  /**
   * Get unsync
ed orders
   */
  async getUnsyncedOrders(): Promise<OfflineOrder[]> {
    const orders = await this.getOrders()
    return orders.filter(o => !o.syncedAt)
  }

  /**
   * Mark order as synced
   */
  async markOrderSynced(orderId: string): Promise<void> {
    try {
      const db = await this.getDB()
      const transaction = db.transaction([STORES.ORDERS], 'readwrite')
      const store = transaction.objectStore(STORES.ORDERS)

      const getRequest = store.get(orderId)

      return new Promise((resolve, reject) => {
        getRequest.onsuccess = () => {
          const order = getRequest.result
          if (order) {
            order.syncedAt = new Date().toISOString()
            const putRequest = store.put(order)
            putRequest.onsuccess = () => resolve()
            putRequest.onerror = () => reject(putRequest.error)
          } else {
            resolve()
          }
        }
        getRequest.onerror = () => reject(getRequest.error)
      })
    } catch (error) {
      console.error('Error marking order synced:', error)
      throw error
    }
  }

  /**
   * Save menu items to cache
   */
  async cacheMenuItems(items: any[]): Promise<void> {
    try {
      const db = await this.getDB()
      const transaction = db.transaction([STORES.MENU_ITEMS], 'readwrite')
      const store = transaction.objectStore(STORES.MENU_ITEMS)

      return new Promise((resolve, reject) => {
        // Clear existing
        store.clear()

        // Add new items
        items.forEach(item => {
          store.add(item)
        })

        transaction.oncomplete = () => resolve()
        transaction.onerror = () => reject(transaction.error)
      })
    } catch (error) {
      console.error('Error caching menu items:', error)
      throw error
    }
  }

  /**
   * Get cached menu items
   */
  async getMenuItems(): Promise<any[]> {
    try {
      const db = await this.getDB()
      const transaction = db.transaction([STORES.MENU_ITEMS], 'readonly')
      const store = transaction.objectStore(STORES.MENU_ITEMS)

      return new Promise((resolve, reject) => {
        const request = store.getAll()
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
      })
    } catch (error) {
      console.error('Error getting menu items:', error)
      return []
    }
  }

  /**
   * Cache categories
   */
  async cacheCategories(categories: any[]): Promise<void> {
    try {
      const db = await this.getDB()
      const transaction = db.transaction([STORES.CATEGORIES], 'readwrite')
      const store = transaction.objectStore(STORES.CATEGORIES)

      return new Promise((resolve, reject) => {
        store.clear()
        categories.forEach(cat => {
          store.add(cat)
        })
        transaction.oncomplete = () => resolve()
        transaction.onerror = () => reject(transaction.error)
      })
    } catch (error) {
      console.error('Error caching categories:', error)
      throw error
    }
  }

  /**
   * Get cached categories
   */
  async getCategories(): Promise<any[]> {
    try {
      const db = await this.getDB()
      const transaction = db.transaction([STORES.CATEGORIES], 'readonly')
      const store = transaction.objectStore(STORES.CATEGORIES)

      return new Promise((resolve, reject) => {
        const request = store.getAll()
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
      })
    } catch (error) {
      console.error('Error getting categories:', error)
      return []
    }
  }

  /**
   * Add pending operation
   */
  async addPendingOperation(operation: PendingOperation): Promise<void> {
    try {
      const db = await this.getDB()
      const transaction = db.transaction([STORES.PENDING_OPERATIONS], 'readwrite')
      const store = transaction.objectStore(STORES.PENDING_OPERATIONS)

      return new Promise((resolve, reject) => {
        const request = store.add(operation)
        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
      })
    } catch (error) {
      console.error('Error adding pending operation:', error)
      throw error
    }
  }

  /**
   * Get all pending operations
   */
  async getPendingOperations(): Promise<PendingOperation[]> {
    try {
      const db = await this.getDB()
      const transaction = db.transaction([STORES.PENDING_OPERATIONS], 'readonly')
      const store = transaction.objectStore(STORES.PENDING_OPERATIONS)

      return new Promise((resolve, reject) => {
        const request = store.getAll()
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
      })
    } catch (error) {
      console.error('Error getting pending operations:', error)
      return []
    }
  }

  /**
   * Remove pending operation
   */
  async removePendingOperation(id: string): Promise<void> {
    try {
      const db = await this.getDB()
      const transaction = db.transaction([STORES.PENDING_OPERATIONS], 'readwrite')
      const store = transaction.objectStore(STORES.PENDING_OPERATIONS)

      return new Promise((resolve, reject) => {
        const request = store.delete(id)
        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
      })
    } catch (error) {
      console.error('Error removing pending operation:', error)
      throw error
    }
  }

  /**
   * Clear all data
   */
  async clearAll(): Promise<void> {
    try {
      const db = await this.getDB()
      const transaction = db.transaction(
        [
          STORES.ORDERS,
          STORES.MENU_ITEMS,
          STORES.CATEGORIES,
          STORES.PENDING_OPERATIONS,
        ],
        'readwrite'
      )

      Object.values(STORES).forEach(storeName => {
        if (transaction.objectStoreNames.contains(storeName)) {
          transaction.objectStore(storeName).clear()
        }
      })

      return new Promise((resolve, reject) => {
        transaction.oncomplete = () => resolve()
        transaction.onerror = () => reject(transaction.error)
      })
    } catch (error) {
      console.error('Error clearing data:', error)
      throw error
    }
  }
}

// Singleton instance
let storageInstance: OfflineStorage | null = null

export function getOfflineStorage(): OfflineStorage {
  if (!storageInstance) {
    storageInstance = new OfflineStorage()
  }
  return storageInstance
}

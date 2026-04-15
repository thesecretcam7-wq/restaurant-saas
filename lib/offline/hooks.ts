/**
 * Offline-First React Hooks
 * Provide offline functionality to React components
 */

'use client'

import { useEffect, useState, useCallback } from 'react'
import { getOfflineStorage } from './storage'
import { getSyncEngine, type SyncResult, type SyncOptions } from './sync-engine'
import type { OfflineOrder, PendingOperation } from './storage'

/**
 * Hook to check online/offline status
 * Returns true if online, false if offline
 */
export function useOffline() {
  const [isOffline, setIsOffline] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    const syncEngine = getSyncEngine()

    // Set initial state
    setIsOffline(!syncEngine.isConnected())
    setIsInitialized(true)

    // Subscribe to status changes
    const unsubscribe = syncEngine.onSyncStatusChange((isOnline) => {
      setIsOffline(!isOnline)
    })

    return unsubscribe
  }, [])

  return {
    isOffline,
    isOnline: !isOffline,
    isInitialized,
  }
}

/**
 * Hook to manage offline sync
 */
export function useOfflineSync() {
  const [isSyncing, setIsSyncing] = useState(false)
  const [lastSyncTime, setLastSyncTime] = useState<number>(0)
  const [lastSyncFormatted, setLastSyncFormatted] = useState<string>('Never')
  const [syncError, setSyncError] = useState<string | null>(null)

  const syncEngine = getSyncEngine()

  // Update formatted time periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setLastSyncFormatted(syncEngine.getLastSyncTimeFormatted())
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  const sync = useCallback(async (options?: SyncOptions): Promise<SyncResult> => {
    setIsSyncing(true)
    setSyncError(null)

    try {
      const result = await syncEngine.syncPendingOperations(options)
      setLastSyncTime(syncEngine.getLastSyncTime())
      setLastSyncFormatted(syncEngine.getLastSyncTimeFormatted())

      if (!result.success && result.errors.length > 0) {
        setSyncError(`Sync failed: ${result.failedCount} operations`)
      }

      return result
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      setSyncError(errorMsg)
      throw error
    } finally {
      setIsSyncing(false)
    }
  }, [])

  return {
    sync,
    isSyncing: isSyncing || syncEngine.isSyncingNow(),
    lastSyncTime,
    lastSyncFormatted,
    syncError,
  }
}

/**
 * Hook to manage offline orders
 */
export function useOfflineOrders() {
  const [orders, setOrders] = useState<OfflineOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const storage = getOfflineStorage()

  const loadOrders = useCallback(async () => {
    try {
      setLoading(true)
      const data = await storage.getOrders()
      setOrders(data)
      setError(null)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err)
      setError(errorMsg)
    } finally {
      setLoading(false)
    }
  }, [])

  const saveOrder = useCallback(async (order: OfflineOrder) => {
    try {
      await storage.saveOrder(order)
      await loadOrders()
      setError(null)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err)
      setError(errorMsg)
      throw err
    }
  }, [loadOrders])

  const getUnsyncedOrders = useCallback(async (): Promise<OfflineOrder[]> => {
    try {
      return await storage.getUnsyncedOrders()
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err)
      setError(errorMsg)
      return []
    }
  }, [])

  // Initial load
  useEffect(() => {
    loadOrders()
  }, [loadOrders])

  return {
    orders,
    loading,
    error,
    saveOrder,
    loadOrders,
    getUnsyncedOrders,
  }
}

/**
 * Hook to manage pending operations
 */
export function useOfflinePendingOps() {
  const [operations, setOperations] = useState<PendingOperation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const storage = getOfflineStorage()

  const loadOperations = useCallback(async () => {
    try {
      setLoading(true)
      const data = await storage.getPendingOperations()
      setOperations(data)
      setError(null)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err)
      setError(errorMsg)
    } finally {
      setLoading(false)
    }
  }, [])

  const addOperation = useCallback(
    async (type: 'create' | 'update' | 'delete', table: string, data: any) => {
      try {
        const operation: PendingOperation = {
          id: `${table}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          type,
          table,
          data,
          timestamp: Date.now(),
          synced: false,
        }

        await storage.addPendingOperation(operation)
        await loadOperations()
        setError(null)
        return operation
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err)
        setError(errorMsg)
        throw err
      }
    },
    [loadOperations]
  )

  const removeOperation = useCallback(async (operationId: string) => {
    try {
      await storage.removePendingOperation(operationId)
      await loadOperations()
      setError(null)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err)
      setError(errorMsg)
      throw err
    }
  }, [loadOperations])

  // Initial load
  useEffect(() => {
    loadOperations()
  }, [loadOperations])

  return {
    operations,
    loading,
    error,
    addOperation,
    removeOperation,
    loadOperations,
  }
}

/**
 * Combined hook for full offline management
 */
export function useOfflineManager() {
  const offlineStatus = useOffline()
  const syncStatus = useOfflineSync()
  const orders = useOfflineOrders()
  const pendingOps = useOfflinePendingOps()

  return {
    // Status
    isOffline: offlineStatus.isOffline,
    isOnline: offlineStatus.isOnline,
    isInitialized: offlineStatus.isInitialized,

    // Sync
    sync: syncStatus.sync,
    isSyncing: syncStatus.isSyncing,
    lastSyncTime: syncStatus.lastSyncTime,
    lastSyncFormatted: syncStatus.lastSyncFormatted,
    syncError: syncStatus.syncError,

    // Orders
    orders: orders.orders,
    ordersLoading: orders.loading,
    ordersError: orders.error,
    saveOrder: orders.saveOrder,
    getUnsyncedOrders: orders.getUnsyncedOrders,

    // Pending Operations
    pendingOperations: pendingOps.operations,
    pendingOpsLoading: pendingOps.loading,
    pendingOpsError: pendingOps.error,
    addPendingOp: pendingOps.addOperation,
    removePendingOp: pendingOps.removeOperation,
  }
}

/**
 * Hook to initialize offline system
 * Call this once at app startup
 */
export function useOfflineInit() {
  useEffect(() => {
    const syncEngine = getSyncEngine()

    // Start automatic sync every 30 seconds
    syncEngine.startAutoSync(30000)

    return () => {
      // Cleanup on unmount
      syncEngine.stopAutoSync()
    }
  }, [])
}

/**
 * Offline-First Sync Engine
 * Handles synchronization of pending operations with Supabase
 */

import { getOfflineStorage } from './storage'
import { createClient } from '@/lib/supabase/client'

interface SyncResult {
  success: boolean
  syncedCount: number
  failedCount: number
  errors: Array<{ operationId: string; error: string }>
}

interface SyncOptions {
  maxRetries?: number
  retryDelay?: number
  batchSize?: number
}

class OfflineSyncEngine {
  private isOnline: boolean = true
  private isSyncing: boolean = false
  private syncListeners: Set<(status: boolean) => void> = new Set()
  private lastSyncTime: number = 0
  private syncInterval: NodeJS.Timeout | null = null

  constructor() {
    this.setupConnectivityListener()
  }

  /**
   * Setup online/offline event listeners
   */
  private setupConnectivityListener(): void {
    if (typeof window === 'undefined') return

    window.addEventListener('online', () => {
      this.isOnline = true
      this.notifySyncListeners(true)
      // Attempt sync when coming back online
      this.syncPendingOperations().catch(err => {
        console.error('Auto-sync on reconnect failed:', err)
      })
    })

    window.addEventListener('offline', () => {
      this.isOnline = false
      this.notifySyncListeners(false)
    })

    // Initial state
    if (typeof navigator !== 'undefined') {
      this.isOnline = navigator.onLine
    }
  }

  /**
   * Check if currently online
   */
  isConnected(): boolean {
    return this.isOnline
  }

  /**
   * Check if sync is in progress
   */
  isSyncingNow(): boolean {
    return this.isSyncing
  }

  /**
   * Subscribe to sync status changes
   */
  onSyncStatusChange(listener: (isOnline: boolean) => void): () => void {
    this.syncListeners.add(listener)
    return () => {
      this.syncListeners.delete(listener)
    }
  }

  /**
   * Notify all listeners of sync status
   */
  private notifySyncListeners(isOnline: boolean): void {
    this.syncListeners.forEach(listener => {
      try {
        listener(isOnline)
      } catch (err) {
        console.error('Sync listener error:', err)
      }
    })
  }

  /**
   * Start automatic sync interval
   */
  startAutoSync(intervalMs: number = 30000): void {
    if (this.syncInterval) return

    this.syncInterval = setInterval(() => {
      if (this.isOnline && !this.isSyncing) {
        this.syncPendingOperations().catch(err => {
          console.error('Scheduled sync error:', err)
        })
      }
    }, intervalMs)
  }

  /**
   * Stop automatic sync interval
   */
  stopAutoSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
      this.syncInterval = null
    }
  }

  /**
   * Main sync method - syncs all pending operations
   */
  async syncPendingOperations(options: SyncOptions = {}): Promise<SyncResult> {
    const {
      maxRetries = 3,
      retryDelay = 1000,
      batchSize = 10,
    } = options

    // Prevent concurrent syncs
    if (this.isSyncing) {
      return {
        success: false,
        syncedCount: 0,
        failedCount: 0,
        errors: [{ operationId: 'all', error: 'Sync already in progress' }],
      }
    }

    // Can't sync if offline
    if (!this.isOnline) {
      return {
        success: false,
        syncedCount: 0,
        failedCount: 0,
        errors: [{ operationId: 'all', error: 'No internet connection' }],
      }
    }

    this.isSyncing = true
    this.notifySyncListeners(this.isOnline)

    try {
      const storage = getOfflineStorage()
      const pendingOps = await storage.getPendingOperations()

      if (pendingOps.length === 0) {
        return { success: true, syncedCount: 0, failedCount: 0, errors: [] }
      }

      const result: SyncResult = {
        success: true,
        syncedCount: 0,
        failedCount: 0,
        errors: [],
      }

      // Process in batches
      for (let i = 0; i < pendingOps.length; i += batchSize) {
        const batch = pendingOps.slice(i, i + batchSize)

        for (const operation of batch) {
          let lastError: string | null = null

          // Retry logic
          for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
              const success = await this.executePendingOperation(operation)

              if (success) {
                // Mark as synced in local storage
                await storage.removePendingOperation(operation.id)
                result.syncedCount++
                lastError = null
                break
              }
            } catch (err) {
              lastError = err instanceof Error ? err.message : String(err)

              // Wait before retry
              if (attempt < maxRetries - 1) {
                await this.delay(retryDelay * Math.pow(2, attempt))
              }
            }
          }

          // If all retries failed
          if (lastError) {
            result.success = false
            result.failedCount++
            result.errors.push({
              operationId: operation.id,
              error: lastError,
            })
          }
        }
      }

      this.lastSyncTime = Date.now()
      return result
    } finally {
      this.isSyncing = false
      this.notifySyncListeners(this.isOnline)
    }
  }

  /**
   * Execute a single pending operation
   */
  private async executePendingOperation(
    operation: any // PendingOperation type
  ): Promise<boolean> {
    const supabase = createClient()

    switch (operation.type) {
      case 'create':
        return this.syncCreateOperation(supabase, operation)
      case 'update':
        return this.syncUpdateOperation(supabase, operation)
      case 'delete':
        return this.syncDeleteOperation(supabase, operation)
      default:
        throw new Error(`Unknown operation type: ${operation.type}`)
    }
  }

  /**
   * Sync CREATE operation
   */
  private async syncCreateOperation(supabase: any, operation: any): Promise<boolean> {
    const { table, data } = operation

    const { error } = await supabase
      .from(table)
      .insert([data])

    if (error) {
      console.error(`Create error on ${table}:`, error)
      throw error
    }

    return true
  }

  /**
   * Sync UPDATE operation
   */
  private async syncUpdateOperation(supabase: any, operation: any): Promise<boolean> {
    const { table, data } = operation
    const { id, ...updateData } = data

    const { error } = await supabase
      .from(table)
      .update(updateData)
      .eq('id', id)

    if (error) {
      console.error(`Update error on ${table}:`, error)
      throw error
    }

    return true
  }

  /**
   * Sync DELETE operation
   */
  private async syncDeleteOperation(supabase: any, operation: any): Promise<boolean> {
    const { table, data } = operation
    const { id } = data

    const { error } = await supabase
      .from(table)
      .delete()
      .eq('id', id)

    if (error) {
      console.error(`Delete error on ${table}:`, error)
      throw error
    }

    return true
  }

  /**
   * Sync a single order to server
   */
  async syncOrder(orderId: string): Promise<boolean> {
    if (!this.isOnline) {
      throw new Error('Cannot sync: offline')
    }

    try {
      const storage = getOfflineStorage()
      const orders = await storage.getOrders()
      const order = orders.find(o => o.id === orderId)

      if (!order) {
        throw new Error(`Order not found: ${orderId}`)
      }

      const supabase = createClient()

      // Check if order already exists on server
      const { data: existingOrder } = await supabase
        .from('orders')
        .select('id')
        .eq('id', orderId)
        .single()

      if (existingOrder) {
        // Update existing
        const { error } = await supabase
          .from('orders')
          .update(order)
          .eq('id', orderId)

        if (error) throw error
      } else {
        // Create new
        const { error } = await supabase
          .from('orders')
          .insert([order])

        if (error) throw error
      }

      // Mark as synced
      await storage.markOrderSynced(orderId)
      return true
    } catch (err) {
      console.error('Sync order error:', err)
      throw err
    }
  }

  /**
   * Get last sync time
   */
  getLastSyncTime(): number {
    return this.lastSyncTime
  }

  /**
   * Get formatted last sync time
   */
  getLastSyncTimeFormatted(): string {
    if (this.lastSyncTime === 0) return 'Never'

    const now = Date.now()
    const diffMs = now - this.lastSyncTime
    const diffSec = Math.floor(diffMs / 1000)
    const diffMin = Math.floor(diffSec / 60)
    const diffHour = Math.floor(diffMin / 60)

    if (diffSec < 60) return `${diffSec}s ago`
    if (diffMin < 60) return `${diffMin}m ago`
    if (diffHour < 24) return `${diffHour}h ago`
    return `${Math.floor(diffHour / 24)}d ago`
  }

  /**
   * Simple delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Cleanup on destroy
   */
  destroy(): void {
    this.stopAutoSync()
    this.syncListeners.clear()
  }
}

// Singleton instance
let syncEngineInstance: OfflineSyncEngine | null = null

export function getSyncEngine(): OfflineSyncEngine {
  if (!syncEngineInstance) {
    syncEngineInstance = new OfflineSyncEngine()
  }
  return syncEngineInstance
}

export function resetSyncEngine(): void {
  if (syncEngineInstance) {
    syncEngineInstance.destroy()
    syncEngineInstance = null
  }
}

export type { SyncResult, SyncOptions }

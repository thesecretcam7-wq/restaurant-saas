/**
 * Offline-First Module Index
 * Re-exports all offline functionality
 */

// Storage
export { getOfflineStorage, type OfflineStorage } from './storage'
export type { OfflineOrder, PendingOperation } from './storage'

// Sync Engine
export { getSyncEngine, resetSyncEngine } from './sync-engine'
export type { SyncResult, SyncOptions } from './sync-engine'

// Hooks (only export on client-side)
export {
  useOffline,
  useOfflineSync,
  useOfflineOrders,
  useOfflinePendingOps,
  useOfflineManager,
  useOfflineInit,
} from './hooks'

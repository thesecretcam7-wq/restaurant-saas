# 🔧 Implementation Guide - Restaurant SaaS Roadmap

Guía técnica paso a paso para implementar cada feature del roadmap.

---

## FASE 1: OFFLINE-FIRST IMPLEMENTATION

### Paso 1: Configurar IndexedDB Storage ✅ COMPLETADO

**Archivo:** `lib/offline/storage.ts` (330 líneas)

**Qué hace:**
```typescript
class OfflineStorage {
  // Inicializa IndexedDB con 5 stores:
  // - orders: órdenes guardadas localmente
  // - menu_items: menú cacheado
  // - categories: categorías cacheadas
  // - tenant_config: configuración del tenant
  // - pending_operations: cambios pendientes de sync
  
  async saveOrder(order: OfflineOrder): Promise<void>
  async getOrders(): Promise<OfflineOrder[]>
  async getUnsyncedOrders(): Promise<OfflineOrder[]>
  async markOrderSynced(orderId: string): Promise<void>
  async cacheMenuItems(items: any[]): Promise<void>
  async cacheCategories(categories: any[]): Promise<void>
  async addPendingOperation(op: PendingOperation): Promise<void>
  async getPendingOperations(): Promise<PendingOperation[]>
  async removePendingOperation(id: string): Promise<void>
  async clearAll(): Promise<void>
}

// Uso
const storage = getOfflineStorage()
await storage.saveOrder({ /* order data */ })
```

**Prioridad:** ⭐⭐⭐ CRÍTICA | **Estado:** ✅ HECHO

---

### Paso 2: Crear Sync Engine ✅ COMPLETADO

**Archivo:** `lib/offline/sync-engine.ts` (380 líneas)

**Qué hace:**
```typescript
class OfflineSyncEngine {
  // Detectar online/offline automáticamente
  isConnected(): boolean
  
  // Sincronizar operaciones pendientes
  async syncPendingOperations(options?: SyncOptions): Promise<SyncResult>
  
  // Auto-sync cada 30 segundos (configurable)
  startAutoSync(intervalMs?: number): void
  stopAutoSync(): void
  
  // Sincronizar orden individual
  async syncOrder(orderId: string): Promise<boolean>
  
  // Escuchar cambios de estado
  onSyncStatusChange(listener: (isOnline: boolean) => void): () => void
  
  // Estado y info
  isSyncingNow(): boolean
  getLastSyncTime(): number
  getLastSyncTimeFormatted(): string
}

// Uso
const syncEngine = getSyncEngine()
syncEngine.startAutoSync() // Auto-sync activado
const result = await syncEngine.syncPendingOperations()
console.log(`${result.syncedCount} sincronizados, ${result.failedCount} errores`)
```

**Características:**
- ✅ Monitorea conectividad (online/offline events)
- ✅ Retry automático con exponential backoff
- ✅ Sincronización por lotes
- ✅ Manejo de operaciones CREATE/UPDATE/DELETE
- ✅ Listeners para cambios de estado

**Prioridad:** ⭐⭐⭐ CRÍTICA | **Estado:** ✅ HECHO

---

### Paso 3: Hooks para Offline ✅ COMPLETADO

**Archivo:** `lib/offline/hooks.ts` (300 líneas)

**Hooks disponibles:**

```typescript
// 1. useOffline() - Detectar estado de conexión
const { isOffline, isOnline, isInitialized } = useOffline()

// 2. useOfflineSync() - Controlar sincronización
const { sync, isSyncing, lastSyncFormatted, syncError } = useOfflineSync()
await sync() // Forzar sincronización

// 3. useOfflineOrders() - Gestionar órdenes offline
const { orders, saveOrder, getUnsyncedOrders, loadOrders } = useOfflineOrders()

// 4. useOfflinePendingOps() - Gestionar operaciones pendientes
const { operations, addPendingOp, removeOperation } = useOfflinePendingOps()

// 5. useOfflineManager() - Todo en uno
const { isOffline, isSyncing, orders, pendingOperations, sync } = useOfflineManager()

// 6. useOfflineInit() - Inicializar al startup
// Llamar una vez en el layout principal
useOfflineInit()
```

**Dónde integrar:**
- `components/admin/POSTerminal.tsx` - Mostrar indicador + guardar pagos offline
- `components/admin/POSPayment.tsx` - Detectar offline antes de procesar pago
- `app/[domain]/layout.tsx` - useOfflineInit() para setup global

**Prioridad:** ⭐⭐⭐ CRÍTICA | **Estado:** ✅ HECHO

---

### Paso 4: UI Indicator ✅ COMPLETADO

**Archivo:** `components/admin/OfflineIndicator.tsx` (220 líneas)

**Qué muestra:**
```
Estado Offline:
🔴 "Sin conexión" - Rojo, permite operaciones locales
↓ Click → Detalles: cambios pendientes, advertencia

Estado Online con cambios:
🟡 "2 pendientes" - Amarillo, muestra qty pendiente
↓ Click → Detalles: botón "Sincronizar ahora"

Estado Sincronizando:
⏳ "Sincronizando..." - Spin icon, deshabilitado
↓ Auto-cierra después de 5 segundos si OK

Estado OK:
✅ "Todos sincronizados" - Verde, oculto por defecto
```

**Ubicación:** Bottom-right corner (posición fija)

**Características:**
- ✅ Muestra estado actual (online/offline/syncing)
- ✅ Panel expandible con detalles
- ✅ Lista de cambios pendientes
- ✅ Botón de sincronización manual
- ✅ Mensajes de error
- ✅ Auto-cierra después de sync exitoso

**Uso en componentes:**
```typescript
// En app/[domain]/(admin)/layout.tsx
import { OfflineIndicator } from '@/components/admin/OfflineIndicator'

export default function AdminLayout({ children }) {
  return (
    <>
      {children}
      <OfflineIndicator />
    </>
  )
}
```

**Prioridad:** ⭐⭐⭐ CRÍTICA | **Estado:** ✅ HECHO

---

### Paso 5: Integración en POSTerminal (PRÓXIMO)

**Archivo a actualizar:** `components/admin/POSTerminal.tsx`

**Qué agregar:**

```typescript
'use client'
import { useOfflineManager } from '@/lib/offline'

export function POSTerminal() {
  const { isOffline, saveOrder, pendingOperations, sync } = useOfflineManager()
  
  const handleSaveOrder = async (order: any) => {
    try {
      // Guardar localmente (funciona offline)
      await saveOrder(order)
      
      if (!isOffline) {
        // Si está online, intentar sincronizar inmediatamente
        await sync()
      }
      // Si está offline, se sincronizará automáticamente
    } catch (error) {
      console.error('Error saving order:', error)
    }
  }
  
  return (
    <div>
      {isOffline && (
        <div className="bg-red-100 border-2 border-red-500 p-3 rounded mb-4">
          ⚠️ Modo offline: Los cambios se sincronizarán automáticamente
        </div>
      )}
      {/* Rest of POSTerminal UI */}
    </div>
  )
}
```

**Pasos de integración:**
1. Importar `useOfflineManager` hook
2. Reemplazar llamadas directo a Supabase con `saveOrder()`
3. Mostrar banner de offline si `isOffline === true`
4. Cambiar POSPayment para guardar pago offline antes de procesar

**Prioridad:** ⭐⭐⭐ CRÍTICA | **Estado:** 🔄 PRÓXIMO (1-2 horas)

---

### Paso 6: Integración en Admin Layout (PRÓXIMO)

**Archivo a actualizar:** `app/[domain]/(admin)/layout.tsx`

```typescript
'use client'
import { useOfflineInit } from '@/lib/offline'
import { OfflineIndicator } from '@/components/admin/OfflineIndicator'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  // Inicializar offline system al montar
  useOfflineInit()
  
  return (
    <div>
      {children}
      {/* Indicador de estado offline/sync */}
      <OfflineIndicator position="fixed" />
    </div>
  )
}
```

**Qué hace:**
- ✅ `useOfflineInit()` - Activa auto-sync cada 30 segundos
- ✅ `<OfflineIndicator />` - Muestra estado + panel de control

**Prioridad:** ⭐⭐⭐ CRÍTICA | **Estado:** 🔄 PRÓXIMO (30 min)

---

### Testing Offline (CHECKLIST)

**1. Setup:**
```bash
npm run dev
# Abre http://localhost:3000/mi-dominio/admin/tpv
```

**2. Test Connectivity Detection:**
- [ ] Chrome DevTools → Network → Toggle "Offline"
- [ ] Verificar que indicator cambia a rojo "Sin conexión"
- [ ] Volver online → indicator vuelve a verde

**3. Test Save Order Offline:**
- [ ] Activar offline mode
- [ ] Crear nueva orden en TPV
- [ ] Hacer click en "Pagar"
- [ ] Verificar que se guarda localmente (no error)
- [ ] Abrir DevTools → Application → IndexedDB → restaurant-saas-offline → orders
- [ ] Verificar que la orden está allí

**4. Test Pending Operations:**
- [ ] Offline: Crear 3 órdenes diferentes
- [ ] Verificar indicator muestra "3 pendientes"
- [ ] Click en indicator → ver lista de 3 órdenes
- [ ] Volver online
- [ ] Indicator muestra botón "Sincronizar ahora"
- [ ] Click → "Sincronizando..."
- [ ] Esperar a "✓ Sincronizado"
- [ ] Verificar en Supabase que las 3 órdenes están allí

**5. Test Auto-Sync:**
- [ ] Offline: Crear 2 órdenes
- [ ] Volver online
- [ ] Esperar 30 segundos (auto-sync interval)
- [ ] Verificar que se sincronizan automáticamente

**6. Test Sync with Errors:**
- [ ] Offline: Crear orden
- [ ] Modificar IndexedDB order: cambiar tenantId a valor inválido
- [ ] Volver online
- [ ] Intentar sync → mostrar error en indicator
- [ ] Verificar que reintenta (exponential backoff)

**7. Performance:**
- [ ] Offline: Crear 20 órdenes (lo máximo esperado)
- [ ] Medir tiempo de sync: < 10 segundos para 20 órdenes
- [ ] Verificar que no bloquea UI mientras sincroniza

---

## FASE 1: GLOVO INTEGRATION

### Paso 1: Registrar App en Glovo

1. Ve a: https://business.glovoapp.com/developers
2. Create App → Fill details
3. Obtener:
   - `store_id` (tu tienda)
   - `api_key` (autenticación)
   - Webhook URL: `https://tunegoocio.vercel.app/api/glovo/webhooks`

**Guardar en Vercel Environment Variables:**
```
GLOVO_STORE_ID=xxx
GLOVO_API_KEY=xxx
GLOVO_WEBHOOK_SECRET=xxx
```

---

### Paso 2: Crear Webhook Handler

**Archivo:** `app/api/glovo/webhooks/route.ts`

```typescript
// Eventos de Glovo:
// - order.created: Nueva orden de cliente Glovo
// - order.acknowledged: Aceptaste la orden
// - order.cancelled: Cliente canceló
// - order.completed: Entregada

export async function POST(req: Request) {
  const event = await req.json()
  
  switch(event.type) {
    case 'order.created':
      // Auto-crear orden en tu sistema
      // Notificar kitchen
      break
    case 'order.cancelled':
      // Cancelar en tu sistema
      break
  }
}
```

**Prioridad:** ⭐⭐⭐ CRÍTICA

---

### Paso 3: Cliente Glovo

**Archivo:** `lib/integrations/glovo.ts`

```typescript
export class GlovoClient {
  // Obtener orden
  getOrder(orderId: string)
  
  // Confirmar orden recibida
  acknowledgeOrder(orderId: string)
  
  // Cambiar estado
  updateOrderStatus(orderId: string, status: 'accepted' | 'ready' | 'delivered')
  
  // Cancelar
  cancelOrder(orderId: string, reason: string)
  
  // Estimar delivery
  getDeliveryTime(orderId: string)
}
```

**Testing:**
- Usar sandbox de Glovo
- Simular orden → Verifica webhook
- Cambiar estado → Verifica se refleja en Glovo

---

### Paso 4: Panel de Órdenes Glovo

**Archivo:** `components/admin/GlovoOrdersPanel.tsx`

```typescript
// Mostrar:
// - Órdenes de Glovo (diferentes color)
// - Estado actual
// - Tiempo estimado
// - Botón "Ready for delivery"
// - Botón "Cancel"

// Integrar en KDSScreen o Panel separado
```

---

## FASE 1: FACTURACIÓN ELECTRÓNICA

### Opción A: Integradores (más fácil)

Usar servicios que ya integran con AEAT:
- **Fastapi.com** (API simple)
- **Ticketbai.app**
- **Zervant**

```typescript
// Ejemplo Fastapi:
const fastapi = new Fastapi(apiKey)
const invoice = await fastapi.createInvoice({
  customer: {...},
  items: [...],
  total: 50.00
})
// Retorna: invoice_number, aeat_status
```

---

### Opción B: Direct AEAT (más control)

**Archivo:** `lib/invoicing/verifactu.ts`

```typescript
// Generar XML según estándar AEAT
export function generateVerifactuXML(invoice: Invoice): string {
  // Estructura XML
  // <Factura>
  //   <InvoiceNumber>
  //   <Customer>
  //   <Items>
  //   <Total>
  // </Factura>
  return xml
}

// Enviar a AEAT
export async function sendToAEAT(xml: string): Promise<{
  status: 'accepted' | 'rejected'
  certificateNumber: string
}>
```

---

**Recomendación:** 
Usar integradores primero (menos burocracia). Si necesitas control total, luego direct AEAT.

---

## FASE 2: SELF-SERVICE KIOSK

### Estructura:

```typescript
// Archivo: app/[domain]/kiosk/page.tsx

export default function KioskPage() {
  return (
    <KioskLayout>
      <IdleScreen /> {/* Mostrar cuando no hay actividad */}
      <ProductGrid /> {/* Seleccionar items */}
      <KioskCart /> {/* Resumen */}
      <PaymentOptions /> {/* QR o Tarjeta */}
    </KioskLayout>
  )
}
```

### Componentes necesarios:

1. **IdleScreen** - Carousel de promociones (5 min inactividad)
2. **ProductGrid** - Items grandes con fotos
3. **KioskCart** - Carrito visual
4. **PaymentOptions** - QR + NFC + Tarjeta

---

## FASE 2: COMANDERA MOBILE

### Opción A: PWA (recomendado)

```typescript
// app/[domain]/comandera/page.tsx

// Features:
// - Acceso offline
// - Push notifications
// - Instalable como app
// - Funciona en cualquier tablet
```

### Opción B: React Native

```bash
npx create-expo-app comandera-app
```

Pros: App nativa, mejor UX
Cons: Más desarrollo, dos plataformas

**Recomendación:** PWA primero (2 semanas), nativa después (6 semanas más)

---

## FASE 2: ANALYTICS AVANZADO

### Dashboards necesarios:

1. **Performance Dashboard**
   - Ingresos hoy/semana/mes
   - Ticket promedio
   - Órdenes por canal (presencial/delivery)

2. **Kitchen Dashboard**
   - Tiempo promedio de preparación
   - Órdenes en queue
   - Items más preparados

3. **Sales Dashboard**
   - Top 10 productos
   - Horas pico
   - Comparativas día anterior

---

## 📊 TRACKING CHECKLIST

```markdown
## OFFLINE-FIRST
- [ ] IndexedDB storage implemented
- [ ] Sync engine working
- [ ] Hooks created
- [ ] UI indicator shows status
- [ ] Testing: Take 10 orders offline
- [ ] Testing: Auto-sync when online
- [ ] Merged to main branch

## GLOVO INTEGRATION
- [ ] Glovo credentials obtained
- [ ] Webhook handler created
- [ ] Client library working
- [ ] Orders auto-create in TPV
- [ ] KDS notified of Glovo orders
- [ ] Status updates to Glovo
- [ ] Testing with sandbox
- [ ] Merged to main branch

## FACTURACIÓN
- [ ] Integrator selected (Fastapi vs Direct AEAT)
- [ ] Credentials configured
- [ ] Invoice generation working
- [ ] Sending to AEAT working
- [ ] Receipt shows tax status
- [ ] Error handling for failures
- [ ] Merged to main branch
```

---

## 🎯 NEXT STEPS

1. **This week:** Setup Offline-First foundation
2. **Next week:** Complete Offline + Testing
3. **Week 3:** Start Glovo integration
4. **Week 4:** Start Facturación (parallel)
5. **Week 5:** All FASE 1 to production

---

## 💬 Questions?

- Stuck on offline-first? → Check Supabase offline docs
- Glovo API unclear? → Check their developer portal
- Facturación complicated? → Start with integrator service

Keep this updated as you implement!

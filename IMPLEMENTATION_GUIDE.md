# 🔧 Implementation Guide - Restaurant SaaS Roadmap

Guía técnica paso a paso para implementar cada feature del roadmap.

---

## FASE 1: OFFLINE-FIRST IMPLEMENTATION

### Paso 1: Configurar IndexedDB Storage

**Archivo:** `lib/offline/storage.ts`

```typescript
// Estructura de datos offline
interface OfflineStore {
  orders: Order[]
  menuItems: MenuItem[]
  categories: Category[]
  tenantConfig: TenantConfig
  lastSync: string
  pendingOperations: PendingOp[]
}

// Operaciones:
// - saveOrder(order): Guarda orden localmente
// - getOrders(): Obtiene órdenes offline
// - syncWithServer(): Sincroniza con Supabase
// - clearCache(): Limpia datos locales
```

**Prioridad:** ⭐⭐⭐ CRÍTICA

---

### Paso 2: Crear Sync Engine

**Archivo:** `lib/offline/sync-engine.ts`

```typescript
// Control de sincronización
export class SyncEngine {
  // Detectar cambios de conectividad
  monitorConnection()
  
  // Cola de operaciones
  queueOperation(op: PendingOp)
  
  // Sincronizar pendientes
  syncPending()
  
  // Resolver conflictos (last-write-wins)
  resolveConflicts()
  
  // Status
  isSyncing: boolean
  lastSyncTime: Date
}
```

**Prioridad:** ⭐⭐⭐ CRÍTICA

---

### Paso 3: Hooks para Offline

**Archivo:** `lib/offline/hooks.ts`

```typescript
// useOffline() - Hook para detectar estado
const { isOnline, lastSync, syncStatus } = useOffline()

// useOfflineOrder() - Hook para órdenes offline
const { order, saveOrder, syncOrder } = useOfflineOrder(orderId)

// useOfflineSync() - Hook para forzar sincronización
const { sync, isSyncing } = useOfflineSync()
```

**Dónde usarlo:**
- `components/admin/POSTerminal.tsx` - Mostrar indicador
- `components/admin/POSPayment.tsx` - Guardar pago offline

**Prioridad:** ⭐⭐⭐ CRÍTICA

---

### Paso 4: UI Indicator

**Archivo:** `components/admin/OfflineIndicator.tsx`

```typescript
// Mostrar estado:
// 🟢 Online - Working normally
// 🔴 Offline - Local mode
// 🟡 Syncing - Data syncing...

// Ubicación: Top-right de POSTerminal
// Click → Show sync status & retry button
```

**Prioridad:** ⭐⭐⭐ CRÍTICA

---

**Testing Offline:**

1. Abrir Chrome DevTools → Network → Offline
2. Tomar orden → Guardar → Check localStorage
3. Pagar → Confirmar que se guarda localmente
4. Volver online → Auto-sync
5. Verificar en Supabase que todo está

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

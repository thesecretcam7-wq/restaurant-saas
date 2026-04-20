# Frontend Integration Examples

Cómo usar el hook `useApi` en tus componentes para hacer requests seguros con autenticación y CSRF tokens.

---

## 1. Setup Básico

Importa el hook en tu componente:

```typescript
'use client'

import { useApi, useSessionMonitor } from '@/lib/hooks/useApi'

export function MyComponent() {
  const { get, post, patch, isLoading } = useApi()
  
  // Monitorear expiración de sesión (8 horas)
  useSessionMonitor()

  // Tu código aquí
}
```

---

## 2. GET Request (Obtener datos)

```typescript
'use client'

import { useApi } from '@/lib/hooks/useApi'
import { useEffect, useState } from 'react'

interface Product {
  id: string
  name: string
  price: number
}

export function ProductsList({ domain }: { domain: string }) {
  const { get, isLoading } = useApi()
  const [products, setProducts] = useState<Product[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadProducts = async () => {
      const response = await get<{ items: Product[] }>(
        `/api/products?domain=${domain}`
      )

      if (response.error) {
        setError(response.error)
      } else {
        setProducts(response.data?.items || [])
      }
    }

    loadProducts()
  }, [domain, get])

  if (isLoading) return <div>Cargando...</div>
  if (error) return <div className="text-red-500">{error}</div>

  return (
    <div>
      {products.map(product => (
        <div key={product.id}>
          <h3>{product.name}</h3>
          <p>${product.price}</p>
        </div>
      ))}
    </div>
  )
}
```

---

## 3. POST Request (Crear datos)

```typescript
'use client'

import { useApi } from '@/lib/hooks/useApi'
import { FormEvent, useState } from 'react'
import { toast } from 'sonner' // O tu librería de toast

interface CreateProductInput {
  domain: string
  name: string
  price: number
  description?: string
}

export function CreateProductForm({ domain }: { domain: string }) {
  const { post, isLoading } = useApi()
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    const formData = new FormData(e.currentTarget)
    const productData: CreateProductInput = {
      domain,
      name: formData.get('name') as string,
      price: parseFloat(formData.get('price') as string),
      description: formData.get('description') as string,
    }

    const response = await post<{ item: any }>(
      '/api/products',
      productData
    )

    if (response.error) {
      setError(response.error)
      toast.error(response.error)
    } else {
      toast.success('Producto creado exitosamente')
      e.currentTarget.reset()
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="text-red-500 mb-4">{error}</div>}

      <div>
        <label>Nombre:</label>
        <input
          type="text"
          name="name"
          required
          disabled={isLoading}
        />
      </div>

      <div>
        <label>Precio:</label>
        <input
          type="number"
          name="price"
          step="0.01"
          required
          disabled={isLoading}
        />
      </div>

      <div>
        <label>Descripción:</label>
        <textarea
          name="description"
          disabled={isLoading}
        />
      </div>

      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Creando...' : 'Crear Producto'}
      </button>
    </form>
  )
}
```

---

## 4. PATCH Request (Actualizar datos)

```typescript
'use client'

import { useApi } from '@/lib/hooks/useApi'
import { useState } from 'react'
import { toast } from 'sonner'

interface UpdateProductData {
  domain: string
  name: string
  price: number
}

export function UpdateProductForm({
  domain,
  productId,
  initialName,
  initialPrice,
}: {
  domain: string
  productId: string
  initialName: string
  initialPrice: number
}) {
  const { patch, isLoading } = useApi()
  const [name, setName] = useState(initialName)
  const [price, setPrice] = useState(initialPrice)

  const handleUpdate = async () => {
    const response = await patch<{ item: any }>(
      `/api/products/${productId}`,
      {
        domain,
        name,
        price,
      }
    )

    if (response.error) {
      toast.error(response.error)
    } else {
      toast.success('Producto actualizado')
    }
  }

  return (
    <div>
      <input
        type="text"
        value={name}
        onChange={e => setName(e.target.value)}
        disabled={isLoading}
      />
      <input
        type="number"
        value={price}
        onChange={e => setPrice(parseFloat(e.target.value))}
        disabled={isLoading}
      />
      <button onClick={handleUpdate} disabled={isLoading}>
        {isLoading ? 'Actualizando...' : 'Actualizar'}
      </button>
    </div>
  )
}
```

---

## 5. DELETE Request (Eliminar datos)

```typescript
'use client'

import { useApi } from '@/lib/hooks/useApi'
import { useState } from 'react'
import { toast } from 'sonner'

export function DeleteProductButton({
  productId,
  onDeleted,
}: {
  productId: string
  onDeleted?: () => void
}) {
  const { delete: deleteProduct, isLoading } = useApi()
  const [isConfirming, setIsConfirming] = useState(false)

  const handleDelete = async () => {
    const response = await deleteProduct(`/api/products/${productId}`)

    if (response.error) {
      toast.error(response.error)
    } else {
      toast.success('Producto eliminado')
      setIsConfirming(false)
      onDeleted?.()
    }
  }

  if (isConfirming) {
    return (
      <div className="flex gap-2">
        <button
          onClick={handleDelete}
          disabled={isLoading}
          className="bg-red-600 text-white"
        >
          {isLoading ? 'Eliminando...' : 'Confirmar eliminación'}
        </button>
        <button
          onClick={() => setIsConfirming(false)}
          disabled={isLoading}
          className="bg-gray-400"
        >
          Cancelar
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => setIsConfirming(true)}
      className="bg-red-500 text-white"
    >
      Eliminar
    </button>
  )
}
```

---

## 6. Manejar Errores Específicos

```typescript
'use client'

import { useApi } from '@/lib/hooks/useApi'
import { useState } from 'react'

export function SmartErrorHandling({ domain }: { domain: string }) {
  const { post, isLoading } = useApi()
  const [error, setError] = useState<{ message: string; code: number } | null>(
    null
  )

  const handleCreate = async () => {
    const response = await post('/api/products', {
      domain,
      name: 'Test',
      price: 10,
    })

    if (response.error) {
      // Manejar diferentes tipos de error
      if (response.status === 401) {
        // Token expirado
        setError({
          message: 'Tu sesión expiró. Por favor, inicia sesión de nuevo.',
          code: 401,
        })
      } else if (response.status === 403) {
        // Sin permisos
        setError({
          message: 'No tienes permiso para crear productos.',
          code: 403,
        })
      } else if (response.status === 429) {
        // Rate limited
        setError({
          message: 'Demasiadas solicitudes. Intenta más tarde.',
          code: 429,
        })
      } else {
        // Error genérico
        setError({
          message: response.error,
          code: response.status,
        })
      }
    }
  }

  return (
    <div>
      <button onClick={handleCreate} disabled={isLoading}>
        Crear
      </button>

      {error && (
        <div className="mt-4 p-4 bg-red-100 border border-red-400 text-red-700">
          <p className="font-bold">Error ({error.code})</p>
          <p>{error.message}</p>
        </div>
      )}
    </div>
  )
}
```

---

## 7. Con Loading States Avanzados

```typescript
'use client'

import { useApi } from '@/lib/hooks/useApi'
import { useState, useCallback } from 'react'

export function AdvancedLoadingExample({ domain }: { domain: string }) {
  const { get, post, isLoading: globalLoading } = useApi()
  const [loadingState, setLoadingState] = useState<
    'idle' | 'loading' | 'success' | 'error'
  >('idle')
  const [message, setMessage] = useState('')

  const createProduct = useCallback(async () => {
    try {
      setLoadingState('loading')

      const response = await post('/api/products', {
        domain,
        name: 'Nuevo Producto',
        price: 99.99,
      })

      if (response.error) {
        setLoadingState('error')
        setMessage(response.error)
      } else {
        setLoadingState('success')
        setMessage('¡Producto creado exitosamente!')
        // Limpiar mensaje después de 3 segundos
        setTimeout(() => setLoadingState('idle'), 3000)
      }
    } catch (err) {
      setLoadingState('error')
      setMessage('Error inesperado')
    }
  }, [domain, post])

  return (
    <div>
      <button
        onClick={createProduct}
        disabled={globalLoading || loadingState === 'loading'}
      >
        {loadingState === 'loading' && '⏳ Creando...'}
        {loadingState === 'success' && '✅ Creado'}
        {loadingState === 'error' && '❌ Error'}
        {loadingState === 'idle' && 'Crear Producto'}
      </button>

      {message && (
        <p
          className={`mt-2 ${
            loadingState === 'error' ? 'text-red-600' : 'text-green-600'
          }`}
        >
          {message}
        </p>
      )}
    </div>
  )
}
```

---

## 8. Endpoints Públicos (sin JWT)

Para endpoints que no requieren autenticación:

```typescript
'use client'

import { useApi } from '@/lib/hooks/useApi'

export function PublicMenu({ domain }: { domain: string }) {
  // skipAuth: true para endpoints públicos
  const { get } = useApi()

  const loadMenu = async () => {
    const response = await get('/api/products', {
      skipAuth: true, // No incluir Authorization header
    })

    // response.data contiene los productos
  }
}
```

---

## 9. Página Completa de Admin

```typescript
'use client'

import {
  useApi,
  useSessionMonitor,
} from '@/lib/hooks/useApi'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

interface Order {
  id: string
  order_number: string
  status: string
  total: number
  created_at: string
}

export default function AdminOrdersPage({
  params,
}: {
  params: { domain: string }
}) {
  // Monitorear sesión
  useSessionMonitor()

  const { get, patch, isLoading } = useApi()
  const [orders, setOrders] = useState<Order[]>([])
  const [error, setError] = useState<string | null>(null)

  // Cargar órdenes
  useEffect(() => {
    const loadOrders = async () => {
      const response = await get<{ orders: Order[] }>(
        `/api/orders?domain=${params.domain}`
      )

      if (response.error) {
        setError(response.error)
        toast.error(response.error)
      } else {
        setOrders(response.data?.orders || [])
      }
    }

    loadOrders()
  }, [params.domain, get])

  // Actualizar estado de orden
  const updateOrderStatus = async (
    orderId: string,
    newStatus: string
  ) => {
    const response = await patch(`/api/orders/${orderId}`, {
      domain: params.domain,
      status: newStatus,
    })

    if (response.error) {
      toast.error(response.error)
    } else {
      toast.success('Estado actualizado')
      // Recargar órdenes
      const reloadResponse = await get<{ orders: Order[] }>(
        `/api/orders?domain=${params.domain}`
      )
      if (!reloadResponse.error) {
        setOrders(reloadResponse.data?.orders || [])
      }
    }
  }

  if (error) {
    return (
      <div className="p-4 bg-red-100 border border-red-400">
        <p className="text-red-700">{error}</p>
      </div>
    )
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Órdenes</h1>

      {isLoading ? (
        <p>Cargando órdenes...</p>
      ) : (
        <div className="grid gap-4">
          {orders.map(order => (
            <div
              key={order.id}
              className="border rounded-lg p-4 hover:shadow-lg"
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-bold">{order.order_number}</p>
                  <p className="text-gray-600">
                    ${order.total.toFixed(2)}
                  </p>
                  <p className="text-sm text-gray-500">
                    {new Date(order.created_at).toLocaleDateString()}
                  </p>
                </div>
                <select
                  value={order.status}
                  onChange={e =>
                    updateOrderStatus(order.id, e.target.value)
                  }
                  disabled={isLoading}
                  className="border rounded px-2 py-1"
                >
                  <option value="pending">Pendiente</option>
                  <option value="confirmed">Confirmada</option>
                  <option value="completed">Completada</option>
                  <option value="cancelled">Cancelada</option>
                </select>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

---

## 10. En Layout o App Component

Para monitorear sesión globalmente:

```typescript
'use client'

import { useSessionMonitor } from '@/lib/hooks/useApi'

export function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Esto monitoreará la sesión en toda la app
  useSessionMonitor()

  return (
    <html>
      <body>{children}</body>
    </html>
  )
}
```

---

## Resumen

El hook `useApi` maneja automáticamente:

✅ **CSRF Tokens** - Se incluyen en POST/PATCH/DELETE  
✅ **JWT Authentication** - Se obtiene de Supabase automáticamente  
✅ **Error Handling** - 401, 403, 429, y otros errores  
✅ **Session Management** - Monitoreo de expiración (8h)  
✅ **Loading States** - `isLoading` flag disponible  
✅ **Type Safety** - TypeScript support  

**No necesitas hacer nada especial, solo usa el hook y funcionará correctamente.**

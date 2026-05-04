# Frontend Security Integration Guide

Para que el frontend funcione correctamente con los nuevos sistemas de seguridad, sigue estas instrucciones.

## 1. Incluir CSRF Token en Requests

### Obtener el CSRF Token

```typescript
// Opción 1: Del meta tag en HTML
const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')

// Opción 2: Del response header de un request anterior
let csrfToken: string | null = null

// Opción 3: Generar uno al cargar la página (usando fetch)
async function initCSRFToken() {
  const response = await fetch('/api/csrf-token', { method: 'GET' })
  csrfToken = response.headers.get('x-csrf-token')
}
```

### Agregar a todas las solicitudes POST/PATCH/DELETE

```typescript
const response = await fetch('/api/products', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-csrf-token': csrfToken || '', // ⚠️ IMPORTANTE
    'Authorization': `Bearer ${jwtToken}`, // ⚠️ IMPORTANTE
  },
  body: JSON.stringify({
    domain: 'tu-restaurante',
    name: 'Pizza Margherita',
    price: 12.99,
  }),
})
```

## 2. Incluir Authorization Header

Todos los endpoints admin requieren JWT token:

```typescript
// Obtener JWT del Supabase auth
const { data: { session } } = await supabase.auth.getSession()
const jwtToken = session?.access_token

// Agregar a requests
headers: {
  'Authorization': `Bearer ${jwtToken}`,
}
```

## 3. Manejar Respuestas de Error

```typescript
async function safeApiCall(url: string, options: RequestInit) {
  try {
    const response = await fetch(url, options)

    if (response.status === 401) {
      // Token expirado - redirigir a login
      window.location.href = '/acceso/login'
      return
    }

    if (response.status === 403) {
      // Sin permisos
      toast.error('No tienes permiso para esta acción')
      return
    }

    if (response.status === 429) {
      // Rate limited
      const retryAfter = response.headers.get('Retry-After')
      toast.error(`Demasiadas solicitudes. Intenta en ${retryAfter}s`)
      return
    }

    if (!response.ok) {
      const error = await response.json()
      toast.error(error.error || 'Error desconocido')
      return
    }

    return await response.json()
  } catch (error) {
    toast.error('Error de conexión')
    console.error(error)
  }
}
```

## 4. Crear una Función Helper

```typescript
// utils/api.ts
class ApiClient {
  private csrfToken: string | null = null
  private jwtToken: string | null = null

  async init() {
    // Obtener CSRF token al inicializar
    const response = await fetch('/api/csrf-token', { method: 'GET' })
    this.csrfToken = response.headers.get('x-csrf-token')

    // Obtener JWT del Supabase
    const { data: { session } } = await supabase.auth.getSession()
    this.jwtToken = session?.access_token || null
  }

  async request(
    url: string,
    method: string = 'GET',
    data?: any
  ) {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    // Agregar CSRF token a requests que lo requieren
    if (['POST', 'PATCH', 'DELETE'].includes(method)) {
      headers['x-csrf-token'] = this.csrfToken || ''
    }

    // Agregar Authorization si hay JWT
    if (this.jwtToken) {
      headers['Authorization'] = `Bearer ${this.jwtToken}`
    }

    const response = await fetch(url, {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
    })

    if (response.status === 401) {
      // Re-autenticar
      await supabase.auth.signOut()
      window.location.href = '/acceso/login'
      return null
    }

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'API Error')
    }

    return await response.json()
  }

  async get(url: string) {
    return this.request(url, 'GET')
  }

  async post(url: string, data: any) {
    return this.request(url, 'POST', data)
  }

  async patch(url: string, data: any) {
    return this.request(url, 'PATCH', data)
  }

  async delete(url: string) {
    return this.request(url, 'DELETE')
  }
}

export const apiClient = new ApiClient()

// En App.tsx o layout principal
useEffect(() => {
  apiClient.init()
}, [])
```

## 5. Validación de Imágenes

```typescript
import { isValidImageUrl, sanitizeImageUrl } from '@/lib/image-validator'

// Al mostrar imágenes del usuario
const safeImageUrl = sanitizeImageUrl(userProvidedUrl, '/placeholder.png')

// En componentes
<img
  src={safeImageUrl || '/placeholder.png'}
  alt="Product"
  onError={(e) => {
    (e.target as HTMLImageElement).src = '/placeholder.png'
  }}
/>
```

## 6. Manejo de Sesiones

```typescript
// Monitorear expiry de sesión (8 horas)
const SESSION_TIMEOUT = 8 * 60 * 60 * 1000 // 8 horas

useEffect(() => {
  const timer = setInterval(() => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      // Sesión expirada
      window.location.href = '/acceso/login'
    }
  }, 5 * 60 * 1000) // Chequear cada 5 minutos

  return () => clearInterval(timer)
}, [])
```

## 7. Protección CSRF en Formularios

Si usas formularios tradicionales HTML, incluye el token:

```html
<form method="POST" action="/api/products">
  <input type="hidden" name="csrf_token" value="{{ csrfToken }}" />
  <input type="text" name="name" required />
  <button type="submit">Crear Producto</button>
</form>
```

## 8. Testing en Desarrollo

```typescript
// En tests, simula el CSRF token
const csrfToken = 'test.token.signature'

const response = await fetch('/api/products', {
  method: 'POST',
  headers: {
    'x-csrf-token': csrfToken,
  },
  body: JSON.stringify({ /* ... */ }),
})
```

## 9. Checklist de Implementación

- [ ] Agregar ApiClient helper a toda la aplicación
- [ ] Incluir CSRF token en todos los POST/PATCH/DELETE
- [ ] Incluir Authorization header en endpoints admin
- [ ] Manejar 401/403/429 responses correctamente
- [ ] Validar imágenes antes de mostrarlas
- [ ] Monitorear expiración de sesión (8 horas)
- [ ] Remover cualquier hardcoded token o secret
- [ ] Testear en incógnito para limpiar cookies
- [ ] Verificar que los errores no revelan información sensible

## 10. Debugging

```typescript
// Habilitar logging en desarrollo
if (process.env.NODE_ENV === 'development') {
  window.debugApi = {
    getCSRFToken: () => document.querySelector('meta[name="csrf-token"]')?.getAttribute('content'),
    getJWT: async () => {
      const { data } = await supabase.auth.getSession()
      return data.session?.access_token
    },
  }
}

// Usar en console:
// window.debugApi.getCSRFToken()
// window.debugApi.getJWT()
```

## Recursos

- [OWASP CSRF Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [HTTP Status Codes](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status)
- [Supabase Auth](https://supabase.com/docs/guides/auth)

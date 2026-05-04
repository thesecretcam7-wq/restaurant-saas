'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface ApiRequestOptions extends RequestInit {
  skipAuth?: boolean // Para endpoints públicos
}

interface ApiResponse<T> {
  data: T | null
  error: string | null
  status: number
}

/**
 * Hook para hacer requests seguros a la API
 * Maneja automáticamente:
 * - CSRF tokens
 * - JWT authentication
 * - Error handling (401, 403, 429)
 * - Session expiry
 */
export function useApi() {
  const router = useRouter()
  const [csrfToken, setCSRFToken] = useState<string | null>(null)
  const [jwtToken, setJWTToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Obtener CSRF token al montar el componente
  useEffect(() => {
    const initCSRFToken = async () => {
      try {
        const response = await fetch('/api/csrf-token', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        })
        const token = response.headers.get('x-csrf-token')
        if (token) {
          setCSRFToken(token)
        }
      } catch (err) {
        console.error('Error getting CSRF token:', err)
      }
    }

    initCSRFToken()
  }, [])

  // Obtener JWT del Supabase
  useEffect(() => {
    const initJWT = async () => {
      try {
        const supabase = createClient()
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (session?.access_token) {
          setJWTToken(session.access_token)
        }

        // Actualizar JWT cuando cambia la sesión
        const {
          data: { subscription },
        } = supabase.auth.onAuthStateChange((event, session) => {
          if (session?.access_token) {
            setJWTToken(session.access_token)
          } else {
            setJWTToken(null)
          }
        })

        return () => {
          subscription?.unsubscribe()
        }
      } catch (err) {
        console.error('Error getting JWT:', err)
      }
    }

    initJWT()
  }, [])

  // Función principal para hacer requests
  const request = useCallback(
    async <T,>(
      url: string,
      options: ApiRequestOptions = {}
    ): Promise<ApiResponse<T>> => {
      setIsLoading(true)

      try {
        const { skipAuth = false, ...requestOptions } = options
        const method = options.method?.toUpperCase() || 'GET'

        // Preparar headers
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          ...(options.headers as Record<string, string>),
        }

        // Agregar CSRF token a requests que lo requieren
        if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
          if (csrfToken) {
            headers['x-csrf-token'] = csrfToken
          }
        }

        // Agregar JWT si no es skip y está disponible
        if (!skipAuth && jwtToken) {
          headers['Authorization'] = `Bearer ${jwtToken}`
        }

        // Hacer request
        const response = await fetch(url, {
          ...requestOptions,
          method,
          headers,
        })

        // Manejar errores de autenticación
        if (response.status === 401) {
          // Token expirado o inválido
          const supabase = createClient()
          await supabase.auth.signOut()
          router.push('/acceso/login')
          return {
            data: null,
            error: 'Session expired. Please login again.',
            status: 401,
          }
        }

        // Manejar errores de autorización
        if (response.status === 403) {
          return {
            data: null,
            error: 'You do not have permission to perform this action.',
            status: 403,
          }
        }

        // Manejar rate limiting
        if (response.status === 429) {
          const retryAfter = response.headers.get('Retry-After')
          return {
            data: null,
            error: `Too many requests. Try again in ${retryAfter}s.`,
            status: 429,
          }
        }

        // Manejar otros errores
        if (!response.ok) {
          try {
            const errorData = await response.json()
            return {
              data: null,
              error: errorData.error || 'An error occurred',
              status: response.status,
            }
          } catch {
            return {
              data: null,
              error: 'An error occurred',
              status: response.status,
            }
          }
        }

        // Success
        try {
          const data = await response.json()
          return {
            data: data as T,
            error: null,
            status: response.status,
          }
        } catch {
          return {
            data: null,
            error: 'Invalid response format',
            status: response.status,
          }
        }
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : 'Network or connection error'

        return {
          data: null,
          error: message,
          status: 500,
        }
      } finally {
        setIsLoading(false)
      }
    },
    [csrfToken, jwtToken, router]
  )

  // Métodos de conveniencia
  const get = useCallback(
    async <T,>(url: string, options?: ApiRequestOptions) =>
      request<T>(url, { ...options, method: 'GET' }),
    [request]
  )

  const post = useCallback(
    async <T,>(url: string, data?: any, options?: ApiRequestOptions) =>
      request<T>(url, {
        ...options,
        method: 'POST',
        body: data ? JSON.stringify(data) : undefined,
      }),
    [request]
  )

  const patch = useCallback(
    async <T,>(url: string, data?: any, options?: ApiRequestOptions) =>
      request<T>(url, {
        ...options,
        method: 'PATCH',
        body: data ? JSON.stringify(data) : undefined,
      }),
    [request]
  )

  const delete_ = useCallback(
    async <T,>(url: string, options?: ApiRequestOptions) =>
      request<T>(url, { ...options, method: 'DELETE' }),
    [request]
  )

  return {
    request,
    get,
    post,
    patch,
    delete: delete_,
    isLoading,
    csrfToken,
    jwtToken,
  }
}

/**
 * Hook para monitorear expiración de sesión
 * Redirige a login si la sesión expira
 */
export function useSessionMonitor() {
  const router = useRouter()
  const SESSION_CHECK_INTERVAL = 5 * 60 * 1000 // Chequear cada 5 minutos

  useEffect(() => {
    const checkSession = async () => {
      try {
        const supabase = createClient()
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (!session) {
          // Sesión expirada
          router.push('/acceso/login')
        }
      } catch (err) {
        console.error('Error checking session:', err)
      }
    }

    const timer = setInterval(checkSession, SESSION_CHECK_INTERVAL)

    // Chequear inmediatamente
    checkSession()

    return () => clearInterval(timer)
  }, [router])
}

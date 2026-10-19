import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import { supabaseFetch } from './network'

type BrowserSupabaseClient = SupabaseClient<any, 'public', any>

let browserClient: BrowserSupabaseClient | null = null

export function createClient(): BrowserSupabaseClient {
  if (browserClient) {
    return browserClient
  }

  browserClient = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { fetch: supabaseFetch },
      auth: { autoRefreshToken: typeof window !== 'undefined' && navigator.onLine !== false },
    }
  ) as BrowserSupabaseClient

  if (typeof window !== 'undefined') {
    const client = browserClient
    const syncRefresh = () => {
      if (navigator.onLine && document.visibilityState === 'visible') {
        void client.auth.startAutoRefresh()
      } else {
        void client.auth.stopAutoRefresh()
      }
    }
    window.addEventListener('offline', syncRefresh)
    window.addEventListener('online', syncRefresh)
    document.addEventListener('visibilitychange', syncRefresh)
    syncRefresh()
  }

  return browserClient
}

export async function signInWithGoogle() {
  const client = createClient()
  const { data, error } = await client.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/api/auth/callback`,
    },
  })
  if (error) throw new Error(error.message)
  return data
}

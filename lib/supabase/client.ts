import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

type BrowserSupabaseClient = SupabaseClient<any, 'public', any>

let browserClient: BrowserSupabaseClient | null = null

export function createClient(): BrowserSupabaseClient {
  if (browserClient) {
    return browserClient
  }

  browserClient = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ) as BrowserSupabaseClient

  return browserClient
}

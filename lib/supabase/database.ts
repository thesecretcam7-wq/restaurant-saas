import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createSupabaseFetch, supabaseFetch } from './network'

// Shared protection even in routes that create their own SDK client.
export const createClient: typeof createSupabaseClient = (url, key, options) => createSupabaseClient(url, key, {
  ...options,
  global: {
    ...options?.global,
    fetch: options?.global?.fetch ? createSupabaseFetch(options.global.fetch) : supabaseFetch,
  },
})

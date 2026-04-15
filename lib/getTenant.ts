import { createServiceClient } from '@/lib/supabase/server'

export async function getTenantBySlugOrId(slugOrId: string) {
  const supabase = createServiceClient()

  // Check if parameter is UUID or slug
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slugOrId)

  if (isUUID) {
    // Search by ID
    const { data } = await supabase
      .from('tenants')
      .select('id')
      .eq('id', slugOrId)
      .single()
    return data
  } else {
    // Search by slug
    const { data } = await supabase
      .from('tenants')
      .select('id')
      .eq('slug', slugOrId)
      .single()
    return data
  }
}

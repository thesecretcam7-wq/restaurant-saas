import { createServiceClient } from '@/lib/supabase/server'

export async function getTenantBySlugOrId(slugOrId: string) {
  const supabase = createServiceClient()

  // Check if parameter is UUID or slug
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slugOrId)

  if (isUUID) {
    // Search by ID
    const { data, error } = await supabase
      .from('tenants')
      .select('id, slug')
      .eq('id', slugOrId)
      .single()
    if (error) {
      console.error('Error fetching tenant by ID:', error)
      return null
    }
    return data
  } else {
    // Search by slug
    const { data, error } = await supabase
      .from('tenants')
      .select('id, slug')
      .eq('slug', slugOrId)
      .single()
    if (error) {
      console.error('Error fetching tenant by slug:', error)
      return null
    }
    return data
  }
}

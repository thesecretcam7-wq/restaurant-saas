import { createServiceClient } from '@/lib/supabase/server'
import EditarCategoriaClient from './EditarCategoriaClient'

interface Props { params: Promise<{ domain: string; id: string }> }

export default async function EditarCategoriaPage({ params }: Props) {
  const { domain, id: categoryId } = await params
  const supabase = createServiceClient()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id')
    .eq('slug', domain)
    .single()

  if (!tenant) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-500">Restaurante no encontrado</p>
      </div>
    )
  }

  const { data: category } = await supabase
    .from('menu_categories')
    .select('*')
    .eq('id', categoryId)
    .single()

  if (!category) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-500">Categoría no encontrada</p>
      </div>
    )
  }

  const { data: products } = await supabase
    .from('menu_items')
    .select('id, name, description, price, image_url, available, show_in_store, featured, sort_order')
    .eq('tenant_id', tenant.id)
    .eq('category_id', categoryId)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })

  return (
    <EditarCategoriaClient
      domain={domain}
      tenantId={tenant.id}
      categoryId={categoryId}
      initialProducts={products || []}
      initialData={{
        name: category.name || '',
        description: category.description || '',
        sort_order: String(category.sort_order ?? 0),
        active: category.active ?? true,
        image_url: category.image_url || '',
      }}
    />
  )
}

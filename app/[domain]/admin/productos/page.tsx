import { createServiceClient } from '@/lib/supabase/server'
import Link from 'next/link'
import ProductosClient from './ProductosClient'

interface Props {
  params: Promise<{ domain: string }>
}

interface Category { id: string; name: string; sort_order: number }
interface Product {
  id: string
  name: string
  description: string | null
  price: number
  category_id: string | null
  image_url: string | null
  available: boolean
  featured: boolean
}

export default async function ProductosPage({ params }: Props) {
  const { domain } = await params
  const supabase = createServiceClient()
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(domain)

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id')
    .eq(isUUID ? 'id' : 'slug', domain)
    .single()

  if (!tenant) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-500">Restaurante no encontrado</p>
      </div>
    )
  }

  const [catRes, itemRes] = await Promise.all([
    supabase.from('menu_categories').select('id, name, sort_order').eq('tenant_id', tenant.id).order('sort_order'),
    supabase.from('menu_items').select('id, name, description, price, category_id, image_url, available, featured').eq('tenant_id', tenant.id).order('name'),
  ])

  const categories: Category[] = catRes.data || []
  const products: Product[] = itemRes.data || []

  return (
    <ProductosClient
      domain={domain}
      categories={categories}
      initialProducts={products}
      tenantId={tenant.id}
    />
  )
}


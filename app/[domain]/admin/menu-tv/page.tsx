import { createClient } from '@/lib/supabase/server'
import { TVMenuManager } from '@/components/admin/TVMenuManager'
import { Monitor } from 'lucide-react'

interface Props {
  params: Promise<{ domain: string }>
}

export default async function AdminTVMenuPage({ params }: Props) {
  const { domain } = await params
  const supabase = await createClient()
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(domain)

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, slug')
    .eq(isUUID ? 'id' : 'slug', domain)
    .single()

  if (!tenant) return <div className="admin-empty">Error al cargar menu TV</div>

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <p className="admin-eyebrow">Pantalla TV</p>
          <h1 className="admin-title">Menu diario para televisor</h1>
          <p className="admin-subtitle">Carga productos manuales con fotos y muestra una pantalla estilo cadena de comida.</p>
        </div>
        <span className="hidden size-12 items-center justify-center rounded-xl bg-[#15130f] text-white sm:flex">
          <Monitor className="size-5" />
        </span>
      </div>
      <TVMenuManager tenantId={tenant.id} tenantSlug={tenant.slug || domain} />
    </div>
  )
}

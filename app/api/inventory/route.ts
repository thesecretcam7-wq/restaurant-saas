import { randomUUID } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireTenantAccess, TenantAuthError, tenantAuthErrorResponse } from '@/lib/tenant-api-auth'
import { normalizeInventoryItem, UUID_PATTERN, validateInventoryFields } from '@/lib/inventory-workflow'

const headers = { 'Cache-Control': 'private, no-store' }
export async function GET(request: NextRequest) {
  const tenantId = request.nextUrl.searchParams.get('tenantId')
  const details = request.nextUrl.searchParams.get('includeDetails') === 'true'
  const includeAlerts = request.nextUrl.searchParams.get('includeAlerts') === 'true'
  if (!tenantId || !UUID_PATTERN.test(tenantId)) return NextResponse.json({error:'Restaurante no válido'},{status:400,headers})
  try {
    await requireTenantAccess(tenantId,{staffRoles:['admin'],requireAdminPermission:true})
    const db = createServiceClient(), signal = AbortSignal.timeout(8000)
    const inventory = []
    for (let offset=0; ; offset+=500) {
      let query=db.from('inventory').select(details?'*, recipe_links:product_recipes(count)':'*').eq('tenant_id',tenantId)
      if (details) query=query.eq('recipe_links.tenant_id',tenantId)
      const result=await query.order('product_name').order('id').range(offset,offset+499).retry(false).abortSignal(signal)
      if (result.error) throw result.error
      for (const row of result.data || []) {
        const {recipe_links,...item}=row as any
        inventory.push(normalizeInventoryItem({...item,...(details?{recipe_count:recipe_links?.[0]?.count || 0}:{})}))
      }
      if ((result.data || []).length<500) break
      if (offset>=19500) throw Error('Inventory too large')
    }
    if (details) {
      const {data,error}=await db.from('tenants').select('country').eq('id',tenantId).retry(false).abortSignal(signal).maybeSingle()
      if (error) throw error
      return NextResponse.json({inventory,country:data?.country || 'ES'},{headers})
    }
    if (includeAlerts) {
      const {data:alerts,error}=await db.from('stock_alerts').select('*').eq('tenant_id',tenantId).eq('is_resolved',false)
        .limit(200).retry(false).abortSignal(signal)
      if (error) throw error
      return NextResponse.json({inventory,alerts},{headers})
    }
    return NextResponse.json(inventory,{headers})
  } catch(error) {
    if (error instanceof TenantAuthError) return tenantAuthErrorResponse(error)
    return NextResponse.json({error:'No se pudo cargar el inventario. Intenta de nuevo.'},{status:503,headers})
  }
}

export async function POST(request: NextRequest) {
  try {
    const body=await request.json()
    if (!UUID_PATTERN.test(body.tenantId || '') || (body.requestId && !UUID_PATTERN.test(body.requestId))) {
      return NextResponse.json({error:'Restaurante o solicitud no válidos'},{status:400,headers})
    }
    let values
    try {values=validateInventoryFields(body)}
    catch(error) {return NextResponse.json({error:(error as Error).message},{status:400,headers})}
    const access=await requireTenantAccess(body.tenantId,{staffRoles:['admin'],requireAdminPermission:true})
    const {data,error}=await createServiceClient().rpc('create_inventory_item',{
      p_tenant_id:body.tenantId,p_item_id:body.requestId || randomUUID(),p_values:values,
      p_created_by:access.staffId || access.userId || 'admin',
    }).retry(false).abortSignal(AbortSignal.timeout(8000))
    if (error) {
      if (error.code==='23505') return NextResponse.json({error:'Ese código ya existe. Busca el artículo antes de crear otro.'},{status:409,headers})
      if (error.code==='22023') return NextResponse.json({error:'Revisa los datos del artículo.'},{status:400,headers})
      throw error
    }
    return NextResponse.json(normalizeInventoryItem(data),{status:201,headers})
  } catch(error) {
    if (error instanceof TenantAuthError) return tenantAuthErrorResponse(error)
    return NextResponse.json({error:'No se recibió confirmación. Comprueba o reintenta la misma operación.'},{status:503,headers})
  }
}

import { randomUUID } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireTenantAccess, TenantAuthError, tenantAuthErrorResponse } from '@/lib/tenant-api-auth'
import { inventoryNumber, validQuantity, UUID_PATTERN } from '@/lib/inventory-workflow'

const headers={'Cache-Control':'private, no-store'}
export async function POST(request: NextRequest,{params}:{params:Promise<{id:string}>}) {
  try {
    const {id}=await params,body=await request.json()
    const quantity=inventoryNumber(body.quantity), type=body.movementType
    const expected=body.expectedStock==null?null:inventoryNumber(body.expectedStock)
    if (!UUID_PATTERN.test(id) || !UUID_PATTERN.test(body.tenantId || '') || (body.requestId&&!UUID_PATTERN.test(body.requestId))
      || !['purchase','sale','damage','return','adjustment'].includes(type) || !validQuantity(quantity)
      || (type!=='adjustment'&&quantity===0) || (type==='adjustment'&&(expected===null||!Number.isFinite(expected)))) {
      return NextResponse.json({error:'Revisa la cantidad y el tipo de movimiento. Para un recuento indica las existencias anteriores.'},{status:400,headers})
    }
    const access=await requireTenantAccess(body.tenantId,{staffRoles:['admin'],requireAdminPermission:true})
    const {data,error}=await createServiceClient().rpc('record_inventory_movement',{
      p_tenant_id:body.tenantId,p_inventory_id:id,p_type:type,p_quantity:quantity,
      p_request_id:body.requestId || randomUUID(),p_expected_stock:expected,
      p_notes:String(body.notes || '').slice(0,500),p_created_by:access.staffId || access.userId || 'admin',
    }).retry(false).abortSignal(AbortSignal.timeout(8000))
    if (error) {
      if (error.code==='P0002') return NextResponse.json({error:'No se encontró el artículo.'},{status:404,headers})
      if (error.message.includes('STOCK_CHANGED')) return NextResponse.json({error:'Las existencias han cambiado. Actualiza el inventario y revisa el recuento antes de guardar.'},{status:409,headers})
      if (error.code==='22023') return NextResponse.json({error:error.message.includes('INSUFFICIENT_STOCK')?'La salida supera las existencias disponibles.':'Revisa la cantidad o inicia una operación nueva.'},{status:400,headers})
      throw error
    }
    return NextResponse.json(data,{headers})
  } catch(error) {
    if (error instanceof TenantAuthError) return tenantAuthErrorResponse(error)
    return NextResponse.json({error:'No se recibió confirmación. Comprueba la misma operación antes de registrar otra.'},{status:503,headers})
  }
}
export async function GET(request:NextRequest,{params}:{params:Promise<{id:string}>}) {
  const {id}=await params,tenantId=request.nextUrl.searchParams.get('tenantId')
  const parsed=Number(request.nextUrl.searchParams.get('offset') || 0)
  if (!tenantId || !UUID_PATTERN.test(tenantId) || !UUID_PATTERN.test(id) || !Number.isSafeInteger(parsed) || parsed<0 || parsed>100000) {
    return NextResponse.json({error:'Consulta no válida'},{status:400,headers})
  }
  try {
    await requireTenantAccess(tenantId,{staffRoles:['admin'],requireAdminPermission:true})
    const db=createServiceClient(),signal=AbortSignal.timeout(8000)
    const {data,error}=await db.from('stock_movements')
      .select('id,movement_type,quantity,notes,reference_id,created_by,created_at')
      .eq('tenant_id',tenantId).eq('inventory_id',id).order('created_at',{ascending:false}).order('id',{ascending:false})
      .range(parsed,parsed+49).retry(false).abortSignal(signal)
    if (error) throw error
    const refs=[...new Set((data || []).map(row=>row.reference_id).filter((id):id is string=>Boolean(id&&UUID_PATTERN.test(id))))]
    const ordersById=new Map<string,any>()
    if (refs.length) {
      const orders=await db.from('orders').select('id,order_number,customer_name,total,created_at').eq('tenant_id',tenantId)
        .in('id',refs).retry(false).abortSignal(signal)
      if (orders.error) throw orders.error
      for (const order of orders.data || []) ordersById.set(order.id,order)
    }
    return NextResponse.json((data || []).map(row=>({...row,order:ordersById.get(row.reference_id) || null})),{headers})
  } catch(error) {
    if (error instanceof TenantAuthError) return tenantAuthErrorResponse(error)
    return NextResponse.json({error:'No se pudo cargar el historial. Intenta de nuevo.'},{status:503,headers})
  }
}

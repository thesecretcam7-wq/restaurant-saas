import { createServiceClient } from '@/lib/supabase/server'
import { requireTenantAccess, TenantAuthError, tenantAuthErrorResponse } from '@/lib/tenant-api-auth'
import { NextRequest, NextResponse } from 'next/server'
import { UUID_PATTERN, validateInventoryFields } from '@/lib/inventory-workflow'
const headers={'Cache-Control':'private, no-store'}

export async function PUT(request:NextRequest,{params}:{params:Promise<{id:string}>}) {
  try {
    const {id}=await params,body=await request.json()
    if (!UUID_PATTERN.test(id)||!UUID_PATTERN.test(body.tenantId || '')) return NextResponse.json({error:'Artículo no válido'},{status:400,headers})
    let values
    try {values=validateInventoryFields(body)} catch(error) {return NextResponse.json({error:(error as Error).message},{status:400,headers})}
    await requireTenantAccess(body.tenantId,{staffRoles:['admin'],requireAdminPermission:true})
    const db=createServiceClient(),signal=AbortSignal.timeout(8000)
    const current=await db.from('inventory').select('id,unit').eq('id',id).eq('tenant_id',body.tenantId).retry(false).abortSignal(signal).maybeSingle()
    if (current.error) throw current.error
    if (!current.data) return NextResponse.json({error:'Artículo no encontrado.'},{status:404,headers})
    if (current.data.unit && values.unit!==current.data.unit) return NextResponse.json({error:'La unidad ya está definida. Para usar otra medida, crea un artículo nuevo; las cantidades no se convierten automáticamente.'},{status:400,headers})
    if (values.sku) {
      const duplicate=await db.from('inventory').select('id').eq('tenant_id',body.tenantId).eq('sku',values.sku).neq('id',id).limit(1).retry(false).abortSignal(signal)
      if (duplicate.error) throw duplicate.error
      if (duplicate.data?.length) return NextResponse.json({error:'Ese código ya pertenece a otro artículo.'},{status:409,headers})
    }
    const {current_stock,...metadata}=values
    const {data,error}=await db.from('inventory').update(metadata).eq('id',id).eq('tenant_id',body.tenantId)
      .select().retry(false).abortSignal(signal).single()
    if (error) throw error
    return NextResponse.json(data,{headers})
  } catch(error) {
    if (error instanceof TenantAuthError) return tenantAuthErrorResponse(error)
    return NextResponse.json({error:'No se pudieron guardar los datos. Intenta de nuevo.'},{status:503,headers})
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tenantId = request.nextUrl.searchParams.get('tenantId');

    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId is required' }, { status: 400 });
    }

    await requireTenantAccess(tenantId, { staffRoles: ['admin'], requireAdminPermission: true });
    const supabase = createServiceClient();

    const [movements, recipes, item] = await Promise.all([
      supabase.from('stock_movements').select('id').eq('tenant_id',tenantId).eq('inventory_id',id).limit(1),
      supabase.from('product_recipes').select('id').eq('tenant_id',tenantId).eq('inventory_id',id).limit(1),
      supabase.from('inventory').select('current_stock').eq('tenant_id',tenantId).eq('id',id).maybeSingle(),
    ])
    if (movements.error || recipes.error || item.error) return NextResponse.json({error:'No se pudo comprobar el historial.'},{status:503})
    if (movements.data?.length || recipes.data?.length || Number(item.data?.current_stock || 0)!==0) {
      return NextResponse.json({error:'Este artículo tiene existencias, recetas o historial. Se conserva para no perder información.'},{status:409})
    }

    const { error: recipeError } = await supabase
      .from('product_recipes')
      .delete()
      .eq('inventory_id', id)
      .eq('tenant_id', tenantId);

    if (recipeError && recipeError.code !== '42P01') {
      return NextResponse.json({ error: recipeError.message }, { status: 500 });
    }

    const { error: alertError } = await supabase
      .from('stock_alerts')
      .delete()
      .eq('inventory_id', id)
      .eq('tenant_id', tenantId);

    if (alertError && alertError.code !== '42P01') {
      return NextResponse.json({ error: alertError.message }, { status: 500 });
    }

    const { error: movementError } = await supabase
      .from('stock_movements')
      .delete()
      .eq('inventory_id', id)
      .eq('tenant_id', tenantId);

    if (movementError && movementError.code !== '42P01') {
      return NextResponse.json({ error: movementError.message }, { status: 500 });
    }

    const { error } = await supabase
      .from('inventory')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && ['Unauthorized', 'Forbidden'].includes(error.message)) {
      return tenantAuthErrorResponse(error);
    }
    console.error('Error deleting inventory item:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

import { after, NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase/server'
import { requirePOSCartAccess } from '@/lib/pos-cart-access'
import { cartScope, normalizeCartPayload } from '@/lib/pos-cart-payload'
import { displayTopic } from '@/lib/server-signed-token'
import { TenantAuthError, tenantAuthErrorResponse } from '@/lib/tenant-api-auth'

export const dynamic = 'force-dynamic'
const privateHeaders = { 'Cache-Control':'private, no-store', 'Vary':'Cookie' }
const mutation = cartScope.extend({cartId:z.string().uuid().optional(),action:z.enum(['save','clear']).default('save'),cart:z.unknown().optional()})
function failure(error: unknown) {
  if (error instanceof TenantAuthError) return tenantAuthErrorResponse(error)
  if (error instanceof z.ZodError || error instanceof SyntaxError || (error instanceof Error && error.message==='Invalid cart scope')) return NextResponse.json({error:'Datos de carrito inválidos'},{status:400,headers:privateHeaders})
  console.error('[pos cart] Request failed')
  return NextResponse.json({error:'No se pudo confirmar la sincronización del carrito'},{status:503,headers:privateHeaders})
}
export async function GET(request: NextRequest) {
  try {
    const {tenantId,sessionId}=cartScope.parse(Object.fromEntries(request.nextUrl.searchParams))
    await requirePOSCartAccess(tenantId)
    const {data,error}=await createServiceClient().from('pos_carts')
      .select('id, items, discount, discount_code, subtotal, total, payment_method, pos_mode, selected_staff_id, selected_staff_name, selected_table_id, selected_table_number, cart_context, updated_at')
      .eq('tenant_id',tenantId).eq('cart_session_id',sessionId).is('abandoned_at',null)
      .order('updated_at',{ascending:false}).limit(1).retry(false).abortSignal(AbortSignal.timeout(8000)).maybeSingle()
    if(error)throw error
    return NextResponse.json({cart:data},{headers:privateHeaders})
  }catch(error){return failure(error)}
}
async function save(request:NextRequest,create:boolean) {
  try {
    const origin=request.headers.get('origin')
    if(origin && origin!==request.nextUrl.origin)throw new TenantAuthError('Forbidden',403)
    const text=await request.text()
    if(text.length>1_000_000)return NextResponse.json({error:'Carrito demasiado grande'},{status:413,headers:privateHeaders})
    const input=mutation.parse(JSON.parse(text))
    await requirePOSCartAccess(input.tenantId)
    const mode=input.action==='clear'?'clear':create?'create':'update'
    if(mode==='update'&&!input.cartId)return NextResponse.json({error:'Falta el identificador del carrito'},{status:400,headers:privateHeaders})
    const payload=mode==='clear'?{}:normalizeCartPayload(input.cart,input.tenantId,input.sessionId)
    const db=createServiceClient()
    const {data,error}=await db.rpc('mutate_pos_cart',{p_tenant_id:input.tenantId,p_session_id:input.sessionId,p_mode:mode,p_cart_id:input.cartId||null,p_payload:payload})
      .retry(false).abortSignal(AbortSignal.timeout(8000))
    if(error)throw error
    const row=data?.[0]||null
    if(mode!=='clear'&&!row)return NextResponse.json({error:'El carrito ya se cerró. Se conserva la cuenta local.'},{status:409,headers:privateHeaders})
    after(async()=>{
      const channel=db.channel(displayTopic(input.tenantId,input.sessionId))
      try { await channel.httpSend('cart-change',{}, {timeout:2000}) } catch { /* Cart is already saved; polling recovers missed hints. */ }
      finally { void db.removeChannel(channel) }
    })
    return NextResponse.json({cart:mode==='clear'?null:row},{headers:privateHeaders})
  }catch(error){return failure(error)}
}
export async function POST(request:NextRequest){return save(request,true)}
export async function PATCH(request:NextRequest){return save(request,false)}

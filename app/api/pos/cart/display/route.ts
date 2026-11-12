import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase/server'
import { requirePOSCartAccess } from '@/lib/pos-cart-access'
import { cartScope } from '@/lib/pos-cart-payload'
import { createDisplayGrant, displayTopic, verifyDisplayGrant } from '@/lib/server-signed-token'
import { TenantAuthError, tenantAuthErrorResponse } from '@/lib/tenant-api-auth'

export const dynamic='force-dynamic'
const headers={'Cache-Control':'private, no-store','Vary':'Cookie, Authorization','Referrer-Policy':'no-referrer'}
function fail(error:unknown){
  if(error instanceof TenantAuthError)return tenantAuthErrorResponse(error)
  if(error instanceof z.ZodError||error instanceof SyntaxError)return NextResponse.json({error:'Pantalla no válida'},{status:400,headers})
  return NextResponse.json({error:'No se pudo actualizar la pantalla'},{status:503,headers})
}
export async function POST(request:NextRequest){
  try{
    const origin=request.headers.get('origin')
    if(origin&&origin!==request.nextUrl.origin)throw new TenantAuthError('Forbidden',403)
    const {tenantId,sessionId}=cartScope.parse(await request.json())
    await requirePOSCartAccess(tenantId)
    return NextResponse.json({token:createDisplayGrant(tenantId,sessionId)},{headers})
  }catch(error){return fail(error)}
}
export async function GET(request:NextRequest){
  try{
    const tenantId=z.string().uuid().parse(request.nextUrl.searchParams.get('tenantId'))
    let sessionId=request.nextUrl.searchParams.get('sessionId')||''
    const authorization=request.headers.get('authorization')
    if(authorization){
      const grant=authorization.startsWith('Bearer ')?verifyDisplayGrant(authorization.slice(7)):null
      if(!grant||grant.tenantId!==tenantId||(sessionId&&sessionId!==grant.sessionId))throw new TenantAuthError('Forbidden',403)
      sessionId=grant.sessionId
      cartScope.parse({tenantId,sessionId})
    }else{
      await requirePOSCartAccess(tenantId)
      if(sessionId)cartScope.parse({tenantId,sessionId})
    }
    const db=createServiceClient()
    let q=db.from('pos_carts').select('items, subtotal, total, discount, updated_at, cart_session_id').eq('tenant_id',tenantId).is('abandoned_at',null)
    if(sessionId)q=q.eq('cart_session_id',sessionId)
    const {data,error}=await q.order('updated_at',{ascending:false}).limit(1).retry(false).abortSignal(AbortSignal.timeout(8000)).maybeSingle()
    if(error)throw error
    const resolvedSession=sessionId||data?.cart_session_id
    const cart=data?{items:(data.items||[]).map((i:any)=>({name:i.name,price:i.price,quantity:i.quantity})),subtotal:data.subtotal,total:data.total,discount:data.discount,updated_at:data.updated_at}:null
    return NextResponse.json({cart,topic:resolvedSession?displayTopic(tenantId,resolvedSession):null,sessionId:resolvedSession||null},{headers})
  }catch(error){return fail(error)}
}

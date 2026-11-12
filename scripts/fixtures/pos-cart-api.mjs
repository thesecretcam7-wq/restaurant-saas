// Isolated API stand-in for browser regressions; never accesses Supabase.
export async function posCartFixture(route,state) {
 const request=route.request(),url=new URL(request.url())
 if(url.pathname!=='/api/pos/cart'&&url.pathname!=='/api/pos/cart/display')return false
 state.cartRows ||= new Map()
 if(url.pathname.endsWith('/display')){await route.fulfill({json:request.method()==='POST'?{token:'fixture-grant'}:{cart:null,topic:null}});return true}
 if(request.method()==='GET'){await route.fulfill({json:{cart:state.cartRows.get(url.searchParams.get('tenantId')+':'+url.searchParams.get('sessionId'))||null}});return true}
 const body=request.postDataJSON(),key=body.tenantId+':'+body.sessionId
 if(body.action==='clear'){state.cartRows.delete(key);await route.fulfill({json:{cart:null}});return true}
 const row={...body.cart,id:state.cartRows.get(key)?.id||'33333333-3333-4333-8333-333333333333'}
 state.cartRows.set(key,row);await route.fulfill({json:{cart:row}});return true
}

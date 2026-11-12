import {createRequire} from 'node:module'
import {posCartFixture} from './fixtures/pos-cart-api.mjs'
import path from 'node:path'
import {readFile,mkdir} from 'node:fs/promises'
// Isolated browser regression: all network calls and payments are simulated.
// ECCOFOOD_BROWSER_PACKAGE may point to a package.json with Playwright/esbuild.
const root=process.cwd(), local=createRequire(path.join(root,'package.json'))
const require=process.env.ECCOFOOD_BROWSER_PACKAGE?createRequire(path.resolve(process.env.ECCOFOOD_BROWSER_PACKAGE)):local
const {chromium}=require('playwright'),{build}=require('esbuild')
const css=await local('postcss')([local('@tailwindcss/postcss')()]).process(await readFile('app/globals.css','utf8'),{from:path.join(root,'app/globals.css')})
const bundle=await build({stdin:{contents:`import React from 'react';import{createRoot}from'react-dom/client';import{POSTerminal}from'./components/admin/POSTerminal';createRoot(document.getElementById('fixture')).render(<POSTerminal tenantId="fixture" tenantSlug="cafebarelcruce" country="ES"/>);`,resolveDir:root,loader:'tsx'},bundle:true,write:false,format:'iife',platform:'browser',jsx:'automatic',define:{'process.env.NODE_ENV':'"production"','process.env.NEXT_PUBLIC_SUPABASE_URL':'"https://fixture.supabase.co"','process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY':'"fixture"'},plugins:[{name:'isolated',setup(b){b.onLoad({filter:/lib[\\/]supabase[\\/]client\.ts$/},()=>({loader:'js',contents:`
function from(table){let filters=[],single=false;const q=new Proxy({},{get(_,k){if(k==='in')return(a,b)=>{filters.push(['in',a,b]);return q};if(k==='eq'||k==='neq')return(a,b)=>{filters.push([k,a,b]);return q};if(k==='maybeSingle'||k==='single')return()=>{single=true;return q};if(k==='then')return async (r,reject)=>{try{const rows=table==='orders'?await(await fetch('/fixture/orders')).json():[];const data=rows.filter(row=>filters.every(([op,k,v])=>op==='in'?v.includes(row[k]):op==='eq'?row[k]===v:row[k]!==v));return r({data:single?data[0]||null:data,error:null})}catch(error){return reject(error)}};return()=>q}});return q}
const c={on(){return c},subscribe(){return c},unsubscribe(){}};export function createClient(){return{from,channel:()=>c,removeChannel(){},auth:{getSession:async()=>({data:{session:null}})}}}
`}))}}]})
const browser=await chromium.launch({headless:true,executablePath:process.env.ECCOFOOD_BROWSER_EXECUTABLE||undefined})
const sum=items=>Math.round(items.reduce((s,i)=>s+i.price*(i.qty??i.quantity??1),0)*100)/100
const manual=(price,qty=1)=>({menu_item_id:null,name:'Cobro manual',price,qty,is_manual:true,notes:'Cobro manual'})
const order=(id,items)=>({id,tenant_id:'fixture',order_number:id,table_number:1,waiter_name:'TPV',source:'pos',delivery_type:'dine-in',payment_status:'pending',status:'pending',created_at:new Date().toISOString(),items,total:sum(items)})
async function fixture(initial,menu){
 const context=await browser.newContext({viewport:{width:1366,height:768}}),page=await context.newPage(),errors=[],state={orders:structuredClone(initial),writes:[]}
 page.setDefaultTimeout(10_000)
 page.on('pageerror',e=>errors.push(e.message))
 await page.route('**/*',async route=>{
  const req=route.request(),url=new URL(req.url())
  if(req.resourceType()==='document')return route.fulfill({contentType:'text/html',body:'<html><meta name="viewport" content="width=device-width,initial-scale=1"><body><div id="fixture"></div></body></html>'})
  if(url.pathname==='/fixture/orders'){
   const snapshot=structuredClone(state.orders)
   if(state.holdNextRead){state.holdNextRead=false;await new Promise(resolve=>state.releaseRead=resolve)}
   if(state.failReads)return route.abort('failed')
   return route.fulfill({json:snapshot})
  }
  if(url.pathname==='/api/pos/bootstrap')return route.fulfill({json:{categories:[{id:'cat',name:'Bebidas'}],menu:menu.map(m=>({...m,category_id:'cat',available:true})),tables:[{id:'table1',table_number:1,seats:4}],tenant:{id:'fixture',slug:'cafebarelcruce'},settings:{country:'ES',timezone:'Europe/Madrid',tax_rate:10}}})
  if(url.pathname==='/api/pos/cloud-health')return route.fulfill({json:{ok:true}})
  if(url.pathname==='/api/csrf-token')return route.fulfill({json:{token:`fixture.${Date.now()}.fixture`}})
  if(url.pathname==='/api/orders'&&req.method()==='POST'){
   const body=req.postDataJSON(),id='saved-'+(state.writes.length+1),row=order(id,body.items)
   row.payment_status=body.paymentMethod?'paid':'pending';state.orders.push(row);state.writes.push({method:'POST',body});return route.fulfill({json:{orderId:id,orderNumber:id}})
  }
  if(url.pathname.startsWith('/api/orders/')&&req.method()==='PATCH'){
   if(state.holdNextPatch){state.holdNextPatch=false;await new Promise(resolve=>state.releasePatch=resolve)}
   const body=req.postDataJSON(),row=state.orders.find(o=>o.id===url.pathname.split('/').at(-1));if(!row)throw Error('Unknown order');Object.assign(row,body);state.writes.push({method:'PATCH',body});return route.fulfill({json:{order:row,success:true}})
  }
  if(await posCartFixture(route,state))return
  if(req.method()!=='GET')throw Error('Unexpected mutation '+url.pathname)
  return route.fulfill({json:{stats:null,orders:[]}})
 })
 await page.goto('http://fixture.local/');await page.addStyleTag({content:css.css});await page.addScriptTag({content:bundle.outputFiles[0].text})
 await page.getByRole('button',{name:/^PAGAR /}).waitFor()
 const table=page.getByRole('button',{name:/^1 (Libre|ACTIVA|\d+m)/}),pay=page.getByRole('button',{name:/^PAGAR /}),rows=page.locator('div.pos-card').filter({has:page.locator('button', {hasText:'✕'})})
 async function expectTotal(value){await page.waitForFunction(value=>[...document.querySelectorAll('button')].some(b=>/^PAGAR /.test(b.textContent)&&b.textContent.includes(value.toFixed(2).replace('.',','))),value)}
 async function load(){await table.click();await page.getByText('Cobrando Mesa 1',{exact:true}).first().waitFor()}
 async function roundtrip(value){await table.click();await page.getByText('Carrito vacío',{exact:true}).waitFor();await load();await expectTotal(value)}
 async function waitSaved(value){for(let i=0;i<100;i++){const pending=state.orders.filter(o=>o.payment_status==='pending'&&o.status!=='cancelled');if(Math.abs(pending.reduce((s,o)=>s+sum(o.items),0)-value)<0.001)return;await page.waitForTimeout(50)}throw Error('Saved total mismatch '+JSON.stringify(state.orders))}
 async function finish(){if(errors.length)throw Error(errors.join('\n'));await context.close()}
 return{context,page,state,table,pay,rows,expectTotal,load,roundtrip,waitSaved,finish}
}
try{
 await mkdir('output/pos-table-reload',{recursive:true})
 const a=await fixture([order('original',[{menu_item_id:'coffee',name:'Café',price:3,qty:2}])],[{id:'coffee',name:'Café',price:3}])
 await a.load();await a.expectTotal(6)
 await a.page.waitForFunction(()=>!!localStorage.getItem('pos-cart-fixture'))
 await a.page.reload();await a.page.addStyleTag({content:css.css});await a.page.addScriptTag({content:bundle.outputFiles[0].text})
 await a.expectTotal(6)
 const billing=await a.page.getByText('Cobrando Mesa 1',{exact:true}).count()
 if(!billing)throw Error('Reload restored items but lost their original table account IDs')
 await a.page.getByRole('group',{name:'Imprimir recibo'}).getByRole('button',{name:'No',exact:true}).click();await a.pay.click();await a.page.getByText('Carrito vacío',{exact:true}).waitFor()
 if(a.state.orders.find(o=>o.id==='original').payment_status!=='paid')throw Error('Original account remained pending after collection')
 if(a.state.writes.some(w=>w.method==='POST'))throw Error('Table payment created a new sale')
 console.log(JSON.stringify({scenario:'reloadLoadedTableThenCollect',originalMarkedPaid:true,noNewSale:true}));await a.finish()
 // A read that started before deletion must never recreate removed products.
 const b=await fixture([order('remove-all',[{menu_item_id:'coffee',name:'Café',price:3,qty:2},manual(2)])],[{id:'coffee',name:'Café',price:3}])
 await b.load();await b.expectTotal(8)
 b.state.holdNextRead=true;await b.page.evaluate(()=>window.dispatchEvent(new Event('focus')))
 for(let i=0;i<100&&!b.state.releaseRead;i++)await b.page.waitForTimeout(25)
 if(!b.state.releaseRead)throw Error('Stale read did not start')
 await b.rows.first().getByRole('button',{name:'✕',exact:true}).click();await b.waitSaved(2)
 await b.rows.first().getByRole('button',{name:'✕',exact:true}).click();await b.waitSaved(0)
 b.state.releaseRead();await b.page.waitForTimeout(500)
 if(!(await b.table.innerText()).includes('Libre'))throw Error('Deleted products returned after stale read')
 await b.page.reload();await b.page.addStyleTag({content:css.css});await b.page.addScriptTag({content:bundle.outputFiles[0].text})
 await b.page.getByText('Carrito vacío',{exact:true}).waitFor()
 if(!(await b.table.innerText()).includes('Libre'))throw Error('Deleted account returned on reload')
 console.log(JSON.stringify({scenario:'deleteAllWithStaleRead',allCancelled:true,tableFreeAfterReadAndReload:true}));await b.finish()

 // Rapid X clicks while the first save is delayed must persist the final empty cart.
 const rapid=await fixture([order('rapid-remove',[{menu_item_id:'coffee',name:'Café',price:3,qty:2},manual(2),manual(4)])],[{id:'coffee',name:'Café',price:3}])
 await rapid.load();await rapid.expectTotal(12);rapid.state.holdNextPatch=true
 await rapid.rows.first().getByRole('button',{name:'✕',exact:true}).click()
 for(let i=0;i<100&&!rapid.state.releasePatch;i++)await rapid.page.waitForTimeout(25)
 if(!rapid.state.releasePatch)throw Error('Delayed edit did not start')
 await rapid.rows.first().getByRole('button',{name:'✕',exact:true}).click()
 await rapid.rows.first().getByRole('button',{name:'✕',exact:true}).click()
 rapid.state.releasePatch();await rapid.waitSaved(0);await rapid.page.waitForTimeout(400)
 if(!(await rapid.table.innerText()).includes('Libre'))throw Error('Rapid deletions returned')
 console.log(JSON.stringify({scenario:'rapidDeleteWhileSaving',lastEmptySnapshotPersisted:true,tableFree:true}));await rapid.finish()
 // A cached table that another device already collected cannot become a new sale.
 const c=await fixture([order('already-paid',[{menu_item_id:'coffee',name:'Café',price:3,qty:2}])],[{id:'coffee',name:'Café',price:3}])
 await c.load();await c.expectTotal(6);await c.page.waitForFunction(()=>!!localStorage.getItem('pos-cart-state-fixture'))
 c.state.orders[0].payment_status='paid'
 await c.page.reload();await c.page.addStyleTag({content:css.css});await c.page.addScriptTag({content:bundle.outputFiles[0].text})
 await c.page.getByText('Carrito vacío',{exact:true}).waitFor()
 if(c.state.writes.length)throw Error('Paid recovery wrote a new sale')
 console.log(JSON.stringify({scenario:'alreadyPaidCachedTable',notRestored:true,noNewSale:true}));await c.finish()
 // Legacy carts have no account IDs. Explicitly choosing the table must not POST them again.
 const d=await fixture([order('legacy-original',[{menu_item_id:'coffee',name:'Café',price:3,qty:2}])],[{id:'coffee',name:'Café',price:3}])
 await d.page.evaluate(()=>{localStorage.removeItem('pos-cart-state-fixture');localStorage.removeItem('pos-cart-cleared-fixture');localStorage.setItem('pos-cart-fixture',JSON.stringify([{menu_item_id:'coffee',name:'Café',price:3,quantity:2}]))})
 await d.page.reload();await d.page.addStyleTag({content:css.css});await d.page.addScriptTag({content:bundle.outputFiles[0].text})
 await d.page.getByText('Verifica la cuenta recuperada antes de cobrar',{exact:true}).waitFor()
 if(!await d.pay.isDisabled())throw Error('Legacy cart can be blindly collected')
 await d.table.click();await d.expectTotal(6)
 await d.page.getByText('Cobrando Mesa 1',{exact:true}).first().waitFor()
 if(d.state.writes.length)throw Error('Selecting legacy table duplicated saved products')
 console.log(JSON.stringify({scenario:'legacyCart',blockedUntilIdentified:true,reselectDoesNotDuplicate:true}));await d.finish()
 // Offline recovery keeps the order IDs and blocks collection until verification succeeds.
 const e=await fixture([order('offline-restore',[{menu_item_id:'coffee',name:'Café',price:3,qty:2}])],[{id:'coffee',name:'Café',price:3}])
 await e.load();await e.page.waitForFunction(()=>!!localStorage.getItem('pos-cart-state-fixture'));e.state.failReads=true
 await e.page.reload();await e.page.addStyleTag({content:css.css});await e.page.addScriptTag({content:bundle.outputFiles[0].text})
 await e.page.getByRole('button',{name:'Reintentar verificación',exact:true}).waitFor()
 if(!await e.pay.isDisabled())throw Error('Unverified offline table can be collected as new')
 e.state.failReads=false;await e.page.getByRole('button',{name:'Reintentar verificación',exact:true}).click();await e.expectTotal(6)
 await e.page.waitForFunction(()=>![...document.querySelectorAll('button')].find(b=>b.textContent.startsWith('PAGAR')).disabled)
 await e.page.getByRole('group',{name:'Imprimir recibo'}).getByRole('button',{name:'No',exact:true}).click();await e.pay.click();await e.page.getByText('Carrito vacío',{exact:true}).waitFor()
 if(e.state.orders[0].payment_status!=='paid'||e.state.writes.some(w=>w.method==='POST'))throw Error('Retry lost original account')
 console.log(JSON.stringify({scenario:'offlineRecovery',blockedUntilVerified:true,retryPaysOriginal:true}));await e.finish()

}catch(error){for(const context of browser.contexts())for(const page of context.pages()){console.log((await page.locator('body').innerText()).slice(-1700));await page.screenshot({path:'output/pos-table-reload/failure.png'})}throw error}finally{await browser.close()}

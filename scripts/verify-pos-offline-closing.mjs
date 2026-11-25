// Real POS + IndexedDB, simulated network only. No production orders or closings.
import {createRequire} from 'node:module'
import {readFile,mkdir} from 'node:fs/promises'
import path from 'node:path'
import assert from 'node:assert/strict'
import {posCartFixture} from './fixtures/pos-cart-api.mjs'
const root=process.cwd(),local=createRequire(path.join(root,'package.json'))
const require=process.env.ECCOFOOD_BROWSER_PACKAGE?createRequire(path.resolve(process.env.ECCOFOOD_BROWSER_PACKAGE)):local
const {chromium}=require('playwright'),{build}=require('esbuild')
const css=(await local('postcss')([local('@tailwindcss/postcss')()]).process(await readFile('app/globals.css','utf8'),{from:path.join(root,'app/globals.css')})).css
const bundle=await build({stdin:{contents:`import React from'react';import{createRoot}from'react-dom/client';import{POSTerminal}from'./components/admin/POSTerminal';import{getOfflineStorage}from'./lib/offline/storage';import{saveOfflinePOSOrder}from'./lib/offline/pos-sync';window.localClosingFixture={storage:getOfflineStorage(),save:saveOfflinePOSOrder};createRoot(document.getElementById('fixture')).render(<div className="admin-app-shell ecco-premium-app"><main className="admin-shell"><div className="admin-page"><POSTerminal tenantId="fixture" tenantSlug="cafebarelcruce" country="ES"/></div></main></div>);`,loader:'tsx',resolveDir:root},bundle:true,write:false,format:'iife',platform:'browser',jsx:'automatic',define:{'process.env.NODE_ENV':'"production"'},plugins:[{name:'isolated-db',setup(b){b.onLoad({filter:/lib[\\/]supabase[\\/]client\.ts$/},()=>({loader:'js',contents:`const q=new Proxy({},{get(_,k){return k==='then'?r=>r({data:[],error:null}):()=>q}});const c={on(){return c},subscribe(){return c},unsubscribe(){}};export function createClient(){return {from:()=>q,channel:()=>c,removeChannel(){},auth:{getSession:async()=>({data:{session:null}})}}}`}))}}]})
const baseStats={cashSales:100,cardSales:20,otherSales:0,totalSales:120,billPaymentsTotal:10,billPaymentsCount:1,billPayments:[{id:'bill',supplier_name:'PAN',amount:10}],totalDeliveryFees:0,deliveryOrderCount:0,totalTax:0,totalDiscount:0,transactionCount:2,ordersCompleted:2,ordersCancelled:0,periodStart:'2026-11-25T04:00:00Z',periodEnd:'2026-11-26T04:00:00Z',businessDateLabel:'25 noviembre 2026',operationalCloseTime:'05:00',closingOrders:[]}
await mkdir('output/pos-offline-closing',{recursive:true})
const browser=await chromium.launch({headless:true,executablePath:process.env.ECCOFOOD_BROWSER_EXECUTABLE||undefined})
try{
 for(const width of [390,1024]){
  const context=await browser.newContext({viewport:{width,height:844},hasTouch:true}),page=await context.newPage(),errors=[]
  const state={reads:0,fail:false,offline:false,stats:baseStats,synced:[],closingPosts:0}
  page.setDefaultTimeout(12000);page.on('pageerror',error=>errors.push(error.message))
  await page.clock.setFixedTime(new Date('2026-11-25T12:00:00Z'))
  await page.route('**/*',async route=>{
   const req=route.request(),url=new URL(req.url())
   if(req.resourceType()==='document')return route.fulfill({contentType:'text/html',body:'<html><meta name="viewport" content="width=device-width,initial-scale=1"><body><div id="fixture"></div></body></html>'})
   if(state.offline)return route.abort('internetdisconnected')
   if(url.pathname==='/api/pos/bootstrap')return route.fulfill({json:{categories:[{id:'cat',name:'Cafés'}],menu:[{id:'product',name:'Café',price:1,category_id:'cat',available:true}],tables:[],tenant:{id:'fixture',slug:'cafebarelcruce'},settings:{country:'ES',timezone:'Europe/Madrid',tax_rate:0}}})
   if(url.pathname==='/api/pos/cloud-health')return route.fulfill({json:{ok:true}})
   if(url.pathname==='/api/csrf-token')return route.fulfill({json:{token:`fixture.${Date.now()}.fixture`}})
   if(url.pathname==='/api/pos/cash-closing'){
    if(req.method()!=='GET'){state.closingPosts++;throw Error('Unexpected closing mutation')}
    if(url.searchParams.get('mode')==='pending')return route.fulfill({json:{stats:null}})
    state.reads++;return route.fulfill(state.fail?{status:503,json:{error:'Unavailable'}}:{json:{stats:state.stats}})
   }
   if(url.pathname==='/api/orders'&&req.method()==='POST'){state.synced.push(req.postDataJSON());return route.fulfill({json:{orderId:'remote-'+state.synced.length}})}
   if(await posCartFixture(route,state))return
   if(req.method()!=='GET')throw Error('Unexpected mutation '+url.pathname)
   return route.fulfill({json:{stats:null,orders:[]}})
  })
  async function mount(){await page.goto('http://localhost:3000/offline-closing-fixture');await page.addStyleTag({content:css});await page.addScriptTag({content:bundle.outputFiles[0].text});await page.getByRole('button',{name:/^PAGAR /}).waitFor()}
  async function until(predicate){for(let index=0;index<200;index++){if(await page.evaluate(predicate))return;await page.waitForTimeout(50)}throw Error('Async browser condition was not met')}
  await mount()
  await until(async()=>Boolean(await window.localClosingFixture.storage.getPOSCashClosing('fixture','current')))
  assert.equal(state.reads,1,'one warmup read, no per-sale polling')
  state.offline=true;await context.setOffline(true)
  await page.getByText('Sin conexion / modo local',{exact:true}).waitFor({state:'attached'})
  await page.evaluate(async()=>{for(const [paymentMethod,total]of [['cash',3],['stripe',2]])await window.localClosingFixture.save({tenantId:'fixture',items:[{menu_item_id:null,name:'Local fixture',price:total,quantity:1}],subtotal:total,discount:0,total,paymentMethod,deliveryType:'takeaway'})})
  const modal=()=>page.getByRole('dialog',{name:'Corte de caja',exact:true})
  const open=async()=>{await page.getByTitle('Ver corte de caja hasta ahora',{exact:true}).click();await modal().waitFor()}
  const close=async()=>{await modal().getByRole('button',{name:'Solo mirar',exact:true}).click();await modal().waitFor({state:'detached'})}
  const before=state.reads,started=performance.now();await open();assert.ok(performance.now()-started<2500,'offline cut opens without a network wait')
  await modal().getByText('Último resumen guardado del servidor',{exact:true}).waitFor()
  const localPending=modal().getByLabel('Ventas locales pendientes',{exact:true})
  assert.match(await localPending.innerText(),/Total local: 5,00/)
  assert.match(await modal().innerText(),/120,00/)
  assert.ok(await modal().getByRole('button',{name:'Guardar cierre',exact:true}).isDisabled())
  assert.equal(await modal().getByLabel('Monto real contado en caja',{exact:false}).count(),0)
  assert.equal(state.reads,before);assert.equal(state.closingPosts,0)
  await page.screenshot({path:`output/pos-offline-closing/${width}-cached.png`})
  await close();await mount();await open()
  await modal().getByText('Último resumen guardado del servidor',{exact:true}).waitFor();assert.equal(state.reads,before,'offline reload preserves cache without network reads');await close()
  await page.evaluate(async(stats)=>{
   const storage=window.localClosingFixture.storage
   await storage.cachePOSCashClosing('other','current',{...stats,totalSales:9999})
   await storage.clearPOSCashClosing('fixture')
   await storage.cachePOSCashClosing('fixture','current',stats,Date.now()-1000)
   if(await storage.getPOSCashClosing('fixture','current'))throw Error('Old response restored the previous closing')
   if(!(await storage.getPOSCashClosing('other','current')))throw Error('Clearing one tenant changed another tenant')
  },baseStats)
  await open();await modal().getByRole('heading',{name:'Ventas locales pendientes de sincronizar',exact:true}).waitFor()
  assert.match(await modal().innerText(),/faltan las ventas sincronizadas y las facturas de caja/)
  assert.ok(!(await modal().innerText()).includes('9999'))
  assert.equal(state.closingPosts,0);await close()
  await page.evaluate(async(stats)=>window.localClosingFixture.storage.cachePOSCashClosing('fixture','current',{...stats,periodStart:'2026-11-24T04:00:00Z',periodEnd:'2026-11-25T04:00:00Z'}),baseStats)
  await open();await modal().getByRole('heading',{name:'Ventas locales pendientes de sincronizar',exact:true}).waitFor();await close()
  await page.evaluate(async(stats)=>window.localClosingFixture.storage.cachePOSCashClosing('fixture','current',stats),baseStats)
  state.stats={...baseStats,cashSales:103,cardSales:22,totalSales:125,transactionCount:4,ordersCompleted:4}
  await page.clock.setFixedTime(new Date('2026-11-25T12:02:00Z'))
  state.offline=false;await context.setOffline(false)
  await page.getByRole('button',{name:/^(Reintentar conexion|Sincronizar ventas)$/}).click()
  await until(async()=>(await window.localClosingFixture.storage.getUnsyncedOrders()).length===0)
  assert.equal(state.synced.length,2);assert.equal(new Set(state.synced.map(s=>s.offlineClientId)).size,2)
  await open();await modal().getByRole('heading',{name:'Resumen de Ventas',exact:true}).waitFor()
  assert.match(await modal().innerText(),/125,00/);assert.ok(await modal().getByRole('button',{name:'Guardar cierre',exact:true}).isEnabled());await close()
  state.fail=true;await open();await modal().getByLabel('Consulta local del corte',{exact:true}).waitFor()
  assert.ok(await modal().getByRole('button',{name:'Guardar cierre',exact:true}).isDisabled());assert.equal(state.closingPosts,0)
  assert.deepEqual(errors,[])
  console.log(JSON.stringify({width,immediateOfflineCut:true,persistsAfterReload:true,separatePendingSales:true,noFalseGlobalZero:true,tenantIsolation:true,oldSnapshotInvalidated:true,oldDayDiscarded:true,syncsExactlyOnce:true,onlineCutRestored:true,serverFailureFallsBack:true,noClosingWrites:true}))
  await context.close()
 }
}finally{await browser.close()}

// Real sales React interface; all API data is simulated. No real sales or mutations.
import {createRequire} from 'node:module'
import {readFile,mkdir} from 'node:fs/promises'
import path from 'node:path'
import assert from 'node:assert/strict'
const root=process.cwd(),local=createRequire(path.join(root,'package.json'))
const require=process.env.ECCOFOOD_BROWSER_PACKAGE?createRequire(path.resolve(process.env.ECCOFOOD_BROWSER_PACKAGE)):local
const {chromium}=require('playwright'),{build}=require('esbuild')
const css=(await local('postcss')([local('@tailwindcss/postcss')()]).process(await readFile('app/globals.css','utf8'),{from:path.join(root,'app/globals.css')})).css+'\n'+await readFile('components/admin/sales-ticket-review.css','utf8')
const tenant='11111111-1111-4111-8111-111111111111',other='99999999-9999-4999-8999-999999999999'
const bundle=await build({stdin:{contents:`import React from'react';import{createRoot}from'react-dom/client';import{SalesTicketReview}from'./components/admin/SalesTicketReview';const root=createRoot(document.getElementById('fixture'));window.renderTenant=(id)=>root.render(<div className="admin-app-shell ecco-premium-app"><main className="admin-shell"><div className="admin-page"><SalesTicketReview tenantId={id} updatedAt={1}/></div></main></div>);window.renderTenant('${tenant}');`,loader:'tsx',resolveDir:root},bundle:true,write:false,format:'iife',platform:'browser',jsx:'automatic',loader:{'.css':'empty'},define:{'process.env.NODE_ENV':'"production"'},plugins:[{name:'isolated-next',setup(b){
 b.onResolve({filter:/^next\/navigation$/},()=>({path:'navigation',namespace:'fixture'}))
 b.onLoad({filter:/.*/,namespace:'fixture'},()=>({loader:'js',contents:'export function useRouter(){return {refresh(){},push(){}}}'}))
 b.onLoad({filter:/lib[\\/]supabase[\\/]client\.ts$/},()=>({loader:'js',contents:'export function createClient(){return {}}'}))
}}]})
const named={name:'Ana',type:'staff',id:'employee'}
const tickets=Array.from({length:27},(_,index)=>({
 id:'ticket-'+index,number:'A-'+(index+1),createdAt:'2026-11-23T12:'+String(59-index).padStart(2,'0')+':00Z',updatedAt:null,
 table:index===0?3:null,total:index===0?6.3:index===2?8:index===3?50:2,state:index===2?'pending':index===3?'voided':'paid',
 payment:index===0?'Mixto':'Efectivo',paymentGroup:index===0?'mixed':'cash',waiter:null,registeredBy:index===1?null:named,paidBy:index===1?null:named,
 unidentified:index===1,edited:index===0,events:[],registeredViaSync:false,
 items:[{name:index===0?'Café con leche':index===1?'Bocadillo de tortilla con tomate y aceite de oliva virgen extra':'Agua mineral',quantity:2,unitPrice:index===0?1.5:1,amount:index===0?3:2}],
}))
await mkdir('output/sales-tickets',{recursive:true})
const browser=await chromium.launch({headless:true,executablePath:process.env.ECCOFOOD_BROWSER_EXECUTABLE||undefined})
try {
 async function fixture(width) {
  const context=await browser.newContext({viewport:{width,height:900},hasTouch:true}),page=await context.newPage(),state={gets:0,fail:false,wrongTenant:false}
  const errors=[];page.on('pageerror',error=>errors.push(error.message));page.setDefaultTimeout(10000)
  await page.route('**/*',async route=>{
   const request=route.request(),url=new URL(request.url())
   if(request.resourceType()==='document')return route.fulfill({contentType:'text/html',body:'<html><meta name="viewport" content="width=device-width,initial-scale=1"><body><div id="fixture"></div></body></html>'})
   if(request.method()!=='GET')throw Error('Unexpected mutation '+url.pathname)
   if(url.pathname==='/api/sales/tickets') {
    state.gets++;if(state.fail)return route.fulfill({status:503,json:{error:'Servicio temporalmente no disponible'}})
    const date=url.searchParams.get('date') || '2026-11-23',tid=url.searchParams.get('tenantId')
    const rows=tid===other?[{...tickets[0],id:'other-order',number:'B-1',registeredBy:{name:'Otro responsable',type:'staff'},paidBy:null}]:date==='2026-11-22'?[{...tickets[0],number:'AYER-1',total:9}]:tickets
    return route.fulfill({json:{tenantId:state.wrongTenant?other:tid,date,today:'2026-11-23',timeZone:'Europe/Madrid',locale:'es-ES',currency:'EUR',updatedAt:'2026-11-23T14:00:00Z',period:{periodStart:date+'T04:00:00Z',periodEnd:'2026-11-24T04:00:00Z',businessDateLabel:date,operationalCloseTime:'05:00'},tickets:rows}})
   }
   return route.abort()
  })
  await page.goto('http://localhost:3000/sales-fixture');await page.addStyleTag({content:css});await page.addScriptTag({content:bundle.outputFiles[0].text})
  await page.getByRole('article',{name:'Ticket A-1',exact:true}).waitFor()
  return{page,context,state,errors,row:number=>page.getByRole('article',{name:'Ticket '+number,exact:true})}
 }
 for(const width of [390,1024,1366]) {
  const f=await fixture(width),{page,state}=f
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'horizontal overflow')
  await f.row('A-1').getByRole('button',{name:'Ver detalle del ticket A-1',exact:true}).click()
  await f.row('A-1').getByRole('list',{name:'Productos del ticket'}).waitFor()
  assert.equal(await f.row('A-1').getByText('6,30 €',{exact:true}).count(),2)
  await page.screenshot({path:'output/sales-tickets/detail-'+width+'.png',fullPage:false})
  await page.getByLabel('Ticket, producto o mesa',{exact:true}).fill('cafe')
  assert.equal(await page.getByRole('article').count(),1)
  await page.getByRole('combobox',{name:'Camarero o responsable'}).selectOption('Ana')
  await page.getByRole('combobox',{name:'Forma de pago'}).selectOption('mixed')
  await f.row('A-1').waitFor();assert.equal(state.gets,1,'filters queried server again')
  await page.getByRole('button',{name:'Limpiar filtros',exact:true}).click()
  await page.getByRole('button',{name:'Siguiente',exact:true}).click();await f.row('A-27').waitFor()
  assert.equal(state.gets,1,'pagination queried historical sales')
  await page.getByRole('button',{name:'Ver sin identificar',exact:true}).click();await f.row('A-2').waitFor()
  await f.row('A-2').getByRole('button',{name:'Ver detalle del ticket A-2',exact:true}).click()
  await f.row('A-2').getByRole('list',{name:'Productos del ticket'}).waitFor()
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'long product overflow')
  await page.getByRole('button',{name:'Limpiar filtros',exact:true}).click()
  state.fail=true;await page.getByRole('button',{name:'Actualizar tickets',exact:true}).click();await page.getByRole('alert').waitFor();await f.row('A-1').waitFor()
  await page.getByLabel('Jornada del ticket',{exact:true}).fill('2026-11-22')
  await page.getByRole('alert').waitFor();await f.row('A-1').waitFor({state:'detached'})
  state.fail=false;await page.getByRole('button',{name:'Reintentar consulta',exact:true}).click();await f.row('AYER-1').waitFor()
  assert.equal(await page.getByRole('article').count(),1,'wrong-day stale tickets')
  console.log(JSON.stringify({width,readableTicketDetails:true,officialTotalPreserved:true,productAndStaffAndPaymentFilters:true,allPagesAccessible:true,unknownStaffVisible:true,noFilterQueries:true,failedRefreshKeepsData:true,dayChangeDoesNotMislabelOldTickets:true}))
  assert.deepEqual(f.errors,[]);await f.context.close()
 }
 const f=await fixture(1024)
 f.state.wrongTenant=true;await f.page.getByRole('button',{name:'Actualizar tickets',exact:true}).click();await f.page.getByRole('alert').waitFor();await f.row('A-1').waitFor()
 f.state.wrongTenant=false;await f.page.getByLabel('Ticket, producto o mesa',{exact:true}).fill('cafe')
 await f.page.evaluate(id=>window.renderTenant(id),other);await f.row('B-1').waitFor()
 assert.equal(await f.page.getByLabel('Ticket, producto o mesa',{exact:true}).inputValue(),'')
 assert.equal(await f.row('A-1').count(),0)
 const before=f.state.gets
 await f.page.evaluate(()=>{for(let i=0;i<10;i++)window.dispatchEvent(new Event('focus'))})
 await f.page.waitForTimeout(100);assert.equal(f.state.gets,before,'focus refetch loop')
 console.log(JSON.stringify({wrongTenantResponseRejected:true,tenantSwitchResetsDataAndFilters:true,focusRefreshThrottled:true}))
 assert.deepEqual(f.errors,[]);await f.context.close()
}finally{await browser.close()}

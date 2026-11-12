// Real POS browser regression with simulated API, cash closing, and printing.
// ECCOFOOD_BROWSER_PACKAGE resolves Playwright/esbuild; the optional
// ECCOFOOD_BROWSER_EXECUTABLE selects an installed Chromium. No real closings.
import {createRequire} from 'node:module'
import {posCartFixture} from './fixtures/pos-cart-api.mjs'
import path from 'node:path'
import {readFile,mkdir} from 'node:fs/promises'
const root=process.cwd(),local=createRequire(path.join(root,'package.json'))
const require=process.env.ECCOFOOD_BROWSER_PACKAGE?createRequire(path.resolve(process.env.ECCOFOOD_BROWSER_PACKAGE)):local
const {chromium}=require('playwright'),{build}=require('esbuild')
const css=await local('postcss')([local('@tailwindcss/postcss')()]).process(await readFile('app/globals.css','utf8'),{from:path.join(root,'app/globals.css')})
await mkdir('output/pos-cash-closing',{recursive:true})
const browser=await chromium.launch({headless:true,executablePath:process.env.ECCOFOOD_BROWSER_EXECUTABLE||undefined})
try{
 const bundle=await build({stdin:{contents:`import React from'react';import{createRoot}from'react-dom/client';import{POSTerminal}from'./components/admin/POSTerminal';createRoot(document.getElementById('fixture')).render(<div className="admin-app-shell ecco-premium-app"><main className="admin-shell"><div className="admin-page"><POSTerminal tenantId="fixture" tenantSlug="cafebarelcruce" country="ES"/></div></main></div>);`,resolveDir:root,loader:'tsx'},bundle:true,write:false,format:'iife',platform:'browser',jsx:'automatic',define:{'process.env.NODE_ENV':'"production"'},plugins:[{name:'isolated-db',setup(b){b.onLoad({filter:/lib[\\/]supabase[\\/]client\.ts$/},()=>({loader:'js',contents:`function from(table){const data=table==='restaurant_settings'?{default_receipt_printer_id:'printer',display_name:'Fixture',phone:'123'}:table==='printer_devices'?{id:'printer',tenant_id:'fixture',name:'Test',config:{connection_mode:'browser_driver',local_bridge_enabled:false,allow_browser_print_fallback:true,paper_width:80}}:[];const q=new Proxy({},{get(_,k){if(k==='then')return r=>r({data,error:null});return()=>q}});return q}const c={on(){return c},subscribe(){return c},unsubscribe(){}};export function createClient(){return{from,channel:()=>c,removeChannel(){},auth:{getSession:async()=>({data:{session:null}})}}}`}))}}]})

 async function fixture({width,height,fullscreen=false}){
  const context=await browser.newContext({viewport:{width,height},hasTouch:true}),page=await context.newPage(),errors=[],state={attempts:[],saves:[],fail:false,hold:false}
  page.setDefaultTimeout(12000);page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>{errors.push('Unexpected native '+d.type());void d.dismiss()})
  const stats={cashSales:100,cardSales:20,otherSales:0,totalSales:120,billPaymentsTotal:10,billPaymentsCount:1,billPayments:[{supplier_name:'PAN',amount:10}],totalTax:0,totalDiscount:0,transactionCount:2,ordersCompleted:2,ordersCancelled:0,periodStart:'2026-11-12T04:00:00Z',periodEnd:'2026-11-13T04:00:00Z',businessDateLabel:'12/11/2026',operationalCloseTime:'05:00',closingOrders:[]}
  await page.route('**/*',async route=>{
   const req=route.request(),url=new URL(req.url())
   if(req.resourceType()==='document')return route.fulfill({contentType:'text/html',body:'<html><meta name="viewport" content="width=device-width,initial-scale=1"><body><div id="fixture"></div></body></html>'})
   if(url.pathname==='/api/pos/bootstrap')return route.fulfill({json:{categories:[{id:'cat',name:'Cafés'}],menu:[{id:'product',name:'Café',price:1,category_id:'cat',available:true}],tables:[],tenant:{id:'fixture',slug:'cafebarelcruce'},settings:{country:'ES',timezone:'Europe/Madrid',tax_rate:0}}})
   if(url.pathname==='/api/pos/cloud-health')return route.fulfill({json:{ok:true}})
   if(url.pathname==='/api/csrf-token')return route.fulfill({json:{token:`fixture.${Date.now()}.fixture`}})
   if(url.pathname==='/api/pos/cash-closing'){
    if(req.method()==='POST'){
     const body=req.postDataJSON();state.attempts.push(body)
     if(state.hold)await new Promise(resolve=>state.release=resolve)
     if(state.fail)return route.fulfill({status:503,json:{error:'No se pudo guardar: servicio temporalmente no disponible.'}})
     state.saves.push(body);return route.fulfill({json:{closing:{id:'saved',closed_at:new Date().toISOString()},stats}})
    }
    return route.fulfill({json:{stats:url.searchParams.get('mode')==='pending'?null:stats}})
   }
   if(await posCartFixture(route,state))return
   if(req.method()!=='GET')throw Error('Unexpected mutation '+url.pathname)
   return route.fulfill({json:{stats:null,orders:[]}})
  })
  await page.goto('http://localhost:3000/pos-closing-fixture');await page.addStyleTag({content:css.css})
  await page.evaluate(()=>{
   window.popups=0;window.prints=0;window.open=()=>{window.popups++;throw Error('Unexpected popup')}
   new MutationObserver(()=>{for(const iframe of document.querySelectorAll('iframe'))if(iframe.contentWindow&&!iframe.dataset.testPrint){iframe.dataset.testPrint='true';iframe.contentWindow.print=()=>{window.prints++;iframe.contentWindow.dispatchEvent(new Event('afterprint'))}}}).observe(document.body,{subtree:true,childList:true})
  })
  await page.addScriptTag({content:bundle.outputFiles[0].text});await page.getByRole('button',{name:/^PAGAR /}).waitFor()
  if(fullscreen){await page.getByTitle('Pantalla completa',{exact:true}).click();await page.waitForFunction(()=>document.fullscreenElement===document.documentElement)}
  const modal=()=>page.getByRole('dialog',{name:'Corte de caja',exact:true})
  async function open(){await page.getByTitle('Ver corte de caja hasta ahora',{exact:true}).click();await modal().waitFor()}
  async function enterCash(value){await modal().getByRole('button',{name:'Teclado',exact:true}).click();const keyboard=page.getByRole('dialog',{name:'Teclado numérico: Efectivo contado',exact:true});await keyboard.getByRole('button',{name:'Limpiar',exact:true}).click();for(const digit of String(value))await keyboard.getByRole('button',{name:digit,exact:true}).click();await keyboard.getByRole('button',{name:'Confirmar',exact:true}).click()}
  async function finish(){if(errors.length)throw Error(errors.join('\n'));await context.close()}
  return{page,state,modal,open,enterCash,finish}
 }
 for(const options of[{width:1024,height:600,fullscreen:false},{width:1024,height:600,fullscreen:true},{width:390,height:844,fullscreen:false}]){
  const f=await fixture(options);await f.open()
  if(await f.modal().locator('[data-cash-closing-actions] button').count()!==2)throw Error('Duplicate closing actions')
  if(await f.modal().getByRole('button',{name:/Confirmar cierre|Seguir revisando|Guardar cierre definitivo/}).count())throw Error('Old closing actions remain')
  await f.modal().getByRole('button',{name:'Solo mirar',exact:true}).click();await f.modal().waitFor({state:'detached'})
  if(f.state.attempts.length)throw Error('Viewing saved a closing')
  await f.open();await f.modal().getByRole('button',{name:'Guardar cierre',exact:true}).click();await f.modal().getByRole('alert').waitFor()
  if(f.state.attempts.length)throw Error('Missing amount was submitted')
  await f.enterCash(90)
  if(await f.modal().getByRole('alert').count())throw Error('Validation error remained after entering a valid amount')
  await f.modal().getByLabel('Notas del cierre',{exact:true}).click();const keyboard=f.page.getByRole('dialog',{name:'Teclado de texto: Notas del cierre',exact:true})
  for(const letter of 'CIERRE')await keyboard.getByRole('button',{name:letter,exact:true}).click();await keyboard.getByRole('button',{name:'Listo',exact:true}).click()
  await f.modal().locator('[data-cash-closing-actions]').scrollIntoViewIfNeeded();await f.page.screenshot({path:`output/pos-cash-closing/${options.width}-${options.fullscreen?'full':'window'}.png`})
  f.state.hold=true;await f.modal().getByRole('button',{name:'Guardar cierre',exact:true}).evaluate(b=>{b.click();b.click()})
  for(let i=0;i<100&&!f.state.release;i++)await f.page.waitForTimeout(25)
  if(f.state.attempts.length!==1||!f.state.release)throw Error('Save did not submit exactly once')
  if(!await f.modal().getByRole('button',{name:'Solo mirar',exact:true}).isDisabled())throw Error('Can close while save unconfirmed')
  f.state.release();await f.modal().waitFor({state:'detached'});await f.page.waitForFunction(()=>window.prints===1)
  if(f.state.saves.length!==1||f.state.saves[0].actualCashCount!==90||f.state.saves[0].notes!=='CIERRE')throw Error('Wrong save payload')
  if(options.fullscreen&&!await f.page.evaluate(()=>document.fullscreenElement===document.documentElement))throw Error('Closing exited fullscreen')
  if(await f.page.evaluate(()=>window.popups))throw Error('Popup printing')
  console.log(JSON.stringify({...options,onlyTwoActions:true,viewDoesNotSave:true,oneClickSavesOnce:true,touchCashAndNotes:true,inlineValidation:true,iframePrint:true}));await f.finish()
 }
 const failure=await fixture({width:1024,height:600,fullscreen:true});await failure.open();await failure.enterCash(0);failure.state.fail=true
 await failure.modal().getByRole('button',{name:'Guardar cierre',exact:true}).click();await failure.modal().getByRole('alert').filter({hasText:'servicio temporalmente no disponible'}).waitFor()
 if(failure.state.saves.length||!await failure.modal().getByRole('button',{name:'Guardar cierre',exact:true}).isEnabled())throw Error('Failed save stuck or falsely succeeded')
 failure.state.fail=false;await failure.modal().getByRole('button',{name:'Guardar cierre',exact:true}).click();await failure.modal().waitFor({state:'detached'})
 if(failure.state.saves.length!==1||failure.state.saves[0].actualCashCount!==0)throw Error('Retry or zero amount failed')
 console.log(JSON.stringify({failedSaveVisible:true,retryWorks:true,zeroCountAccepted:true}));await failure.finish()
 const timeout=await fixture({width:1024,height:600,fullscreen:false});await timeout.open();await timeout.enterCash(90)
 timeout.state.hold=true;timeout.state.fail=true
 await timeout.modal().getByRole('button',{name:'Guardar cierre',exact:true}).click()
 await timeout.modal().getByRole('alert').filter({hasText:'No se recibió confirmación del cierre'}).waitFor({timeout:40000})
 if(timeout.state.attempts.length!==1||timeout.state.saves.length)throw Error('Timed-out closing was retried or falsely marked saved')
 if(!await timeout.modal().getByRole('button',{name:'Solo mirar',exact:true}).isEnabled())throw Error('Timed-out closing left buttons locked')
 timeout.state.release();await timeout.page.waitForTimeout(100)
 console.log(JSON.stringify({unconfirmedSaveBounded:true,checkClosingHistoryWarning:true,noAutomaticRetry:true,buttonsUnlocked:true}));await timeout.finish()
}finally{await browser.close()}

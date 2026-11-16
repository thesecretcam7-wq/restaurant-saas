// Real React interface in Chromium; all API calls and stock data are isolated fixtures.
import {createRequire} from 'node:module'
import path from 'node:path'
import {readFile,mkdir} from 'node:fs/promises'
const root=process.cwd(),local=createRequire(path.join(root,'package.json'))
const require=process.env.ECCOFOOD_BROWSER_PACKAGE?createRequire(path.resolve(process.env.ECCOFOOD_BROWSER_PACKAGE)):local
const {chromium}=require('playwright'),{build}=require('esbuild')
const baseCSS=await local('postcss')([local('@tailwindcss/postcss')()]).process(await readFile('app/globals.css','utf8'),{from:path.join(root,'app/globals.css')})
const css=baseCSS.css+'\n'+await readFile('components/admin/inventory.css','utf8')
const tenantId='11111111-1111-4111-8111-111111111111'
const bundle=await build({stdin:{contents:`import React from'react';import{createRoot}from'react-dom/client';import{InventoryManager}from'./components/admin/InventoryManager';createRoot(document.getElementById('fixture')).render(<div className="admin-app-shell ecco-premium-app"><main className="admin-shell"><div className="admin-page"><InventoryManager tenantId="${tenantId}" tenantSlug="cafe"/></div></main></div>);`,resolveDir:root,loader:'tsx'},bundle:true,write:false,format:'iife',platform:'browser',jsx:'automatic',loader:{'.css':'empty'},define:{'process.env.NODE_ENV':'"production"'}})
await mkdir('output/inventory',{recursive:true})
const browser=await chromium.launch({headless:true,executablePath:process.env.ECCOFOOD_BROWSER_EXECUTABLE||undefined})
try {
 async function fixture(width=1366) {
  const context=await browser.newContext({viewport:{width,height:900},hasTouch:true}),page=await context.newPage()
  const state={items:[{id:'22222222-2222-4222-8222-222222222222',product_name:'Harina',unit:'kg',current_stock:2.5,min_stock:3,max_stock:10,cost_per_unit:1.25,supplier:'Molino'},{id:'44444444-4444-4444-8444-444444444444',product_name:'Cocacola',unit:'unidad',current_stock:12,min_stock:5,max_stock:48,cost_per_unit:.5},{id:'55555555-5555-4555-8555-555555555555',product_name:'Artículo por preparar',unit:null,current_stock:0,min_stock:0,max_stock:100,cost_per_unit:0}],gets:0,commands:[],results:new Map(),history:[],failLoads:false,loseConfirmation:false,conflict:false}
  const errors=[];page.on('pageerror',error=>errors.push(error.message));page.setDefaultTimeout(10000)
  await page.route('**/*',async route=>{
   const req=route.request(),url=new URL(req.url())
   if(req.resourceType()==='document')return route.fulfill({contentType:'text/html',body:'<html><meta name="viewport" content="width=device-width,initial-scale=1"><body><div id="fixture"></div></body></html>'})
   if(url.pathname==='/api/inventory'&&req.method()==='GET') {state.gets++;return route.fulfill({status:state.failLoads?503:200,json:state.failLoads?{error:'Servicio no disponible'}:{inventory:state.items,country:'ES'}})}
   if(url.pathname.includes('stock-movement')&&req.method()==='GET')return route.fulfill({json:state.history})
   if(req.method()==='PUT') {
    const body=req.postDataJSON(),item=state.items.find(item=>url.pathname.endsWith(item.id))
    Object.assign(item,{product_name:body.productName,unit:body.unit,min_stock:Number(body.minStock),max_stock:Number(body.maxStock),cost_per_unit:Number(body.costPerUnit)})
    return route.fulfill({json:item})
   }
   if(req.method()==='POST') {
    const body=req.postDataJSON();state.commands.push(body)
    if(state.results.has(body.requestId))return route.fulfill({json:state.results.get(body.requestId)})
    if(url.pathname==='/api/inventory') {
     const item={id:body.requestId,product_name:body.productName,unit:body.unit,current_stock:Number(body.initialStock.replace(',','.')),min_stock:Number(body.minStock),max_stock:Number(body.maxStock),cost_per_unit:Number(body.costPerUnit),supplier:body.supplier}
     state.items.push(item);state.results.set(body.requestId,item);return route.fulfill({status:201,json:item})
    }
    const item=state.items.find(item=>url.pathname.includes(item.id))
    if(!item)throw Error('Wrong inventory item')
    if(state.conflict) {state.conflict=false;item.current_stock=4;return route.fulfill({status:409,json:{error:'Las existencias han cambiado. Actualiza y revisa el recuento.'}})}
    const before=item.current_stock,amount=body.quantity
    const next=body.movementType==='adjustment'?amount:before+(body.movementType==='damage'?-amount:amount)
    if(next<0)return route.fulfill({status:400,json:{error:'Stock insuficiente'}})
    item.current_stock=next
    state.history.unshift({id:body.requestId,movement_type:body.movementType,quantity:body.movementType==='adjustment'?next-before:amount,notes:body.notes,reference_id:'inventory-manual:'+body.requestId,created_at:new Date().toISOString()})
    const result={updated:structuredClone(item),movement:state.history[0]};state.results.set(body.requestId,result)
    if(state.loseConfirmation){state.loseConfirmation=false;return route.abort('failed')}
    return route.fulfill({json:result})
   }
   if(url.pathname.startsWith('/api/'))throw Error('Unexpected API '+url.pathname)
   return route.abort()
  })
  async function mount(){await page.addStyleTag({content:css});await page.addScriptTag({content:bundle.outputFiles[0].text});await page.getByRole('article',{name:'Harina',exact:true}).waitFor()}
  await page.goto('http://localhost:3000/inventory-fixture');await mount()
  const row=name=>page.getByRole('article',{name,exact:true}),dialog=()=>page.getByRole('dialog').filter({has:page.locator('.inventory-dialog-header')})
  async function finish(){if(errors.length)throw Error(errors.join('\n'));await context.close()}
  return{page,state,row,dialog,mount,finish}
 }
 for(const width of [390,1024,1366]) {
  const f=await fixture(width)
  if(await f.page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('Horizontal overflow '+width)
  await f.row('Harina').getByRole('button',{name:'Recibir',exact:true}).click()
  await f.dialog().getByRole('button',{name:'Por paquetes o cajas'}).click()
  await f.dialog().getByLabel('Número de paquetes',{exact:true}).fill('2')
  await f.dialog().getByLabel('Contenido de cada paquete (kg)',{exact:true}).fill('1,25')
  await f.page.screenshot({path:'output/inventory/receive-'+width+'.png'})
  await f.dialog().getByRole('button',{name:'Guardar entrada',exact:true}).evaluate(button=>{button.click();button.click()})
  await f.dialog().waitFor({state:'detached'})
  if(f.state.commands.length!==1||f.state.items[0].current_stock!==5)throw Error('Package entry duplicated or decimals lost')
  await f.row('Harina').getByRole('button',{name:'Contar',exact:true}).click()
  await f.dialog().getByRole('button',{name:'Teclado: Cantidad contada ahora',exact:true}).click()
  const keypad=f.page.getByRole('dialog',{name:'Teclado numérico: Cantidad contada ahora',exact:true})
  await keypad.getByRole('button',{name:'Limpiar',exact:true}).click();await keypad.getByRole('button',{name:'Confirmar',exact:true}).click()
  await f.dialog().getByRole('button',{name:'Guardar recuento',exact:true}).click();await f.dialog().waitFor({state:'detached'})
  if(f.state.items[0].current_stock!==0||f.state.commands.at(-1).expectedStock!==5)throw Error('Zero recount failed')
  await f.page.getByRole('button',{name:'Más opciones para Harina',exact:true}).click();await f.page.getByRole('button',{name:'Historial',exact:true}).click()
  await f.dialog().getByText('Recuento',{exact:true}).waitFor()
  if(!await f.dialog().getByText('-5 kg',{exact:true}).count())throw Error('Negative recount sign missing')
  await f.dialog().getByRole('button',{name:'Volver al inventario'}).click()
  await f.page.getByRole('button',{name:'Nuevo artículo',exact:true}).click()
  await f.dialog().getByLabel('Nombre del artículo',{exact:true}).fill('Tomate')
  await f.dialog().getByLabel('Unidad de medida',{exact:true}).selectOption('kg')
  await f.dialog().getByLabel('Cantidad que tienes ahora',{exact:true}).fill('1,5')
  await f.dialog().getByRole('button',{name:'Crear artículo',exact:true}).click();await f.dialog().waitFor({state:'detached'})
  await f.row('Tomate').waitFor()
  await f.page.getByRole('button',{name:'Más opciones para Cocacola',exact:true}).click();await f.page.getByRole('button',{name:'Registrar merma',exact:true}).click()
  await f.dialog().getByLabel('Cantidad que se ha perdido',{exact:true}).fill('2')
  await f.dialog().getByRole('button',{name:'Guardar merma',exact:true}).click();await f.dialog().waitFor({state:'detached'})
  if(f.state.items[1].current_stock!==10)throw Error('Waste was not deducted')
  await f.row('Artículo por preparar').getByRole('button',{name:'Contar',exact:true}).click()
  await f.dialog().getByLabel('Unidad de medida',{exact:true}).selectOption('unidad')
  await f.dialog().getByRole('button',{name:'Guardar y contar',exact:true}).click()
  await f.dialog().getByLabel('Cantidad contada ahora',{exact:true}).fill('5')
  await f.dialog().getByRole('button',{name:'Guardar recuento',exact:true}).click();await f.dialog().waitFor({state:'detached'})
  if(f.state.items[2].current_stock!==5||f.state.items[2].unit!=='unidad')throw Error('Setup did not guide into counting')
  await f.page.getByLabel('Buscar artículo',{exact:true}).fill('tomate');await f.row('Harina').waitFor({state:'detached'})
  if(f.state.gets!==1)throw Error('Search reloaded the database')
  await f.page.getByLabel('Buscar artículo',{exact:true}).fill('')
  f.state.failLoads=true;await f.page.getByRole('button',{name:'Actualizar',exact:true}).click();await f.page.getByRole('alert').waitFor();await f.row('Tomate').waitFor()
  await f.page.screenshot({path:'output/inventory/list-'+width+'.png'})
  console.log(JSON.stringify({width,packagesAndDecimals:true,oneSaveOnly:true,zeroCount:true,signedHistory:true,createAndSearch:true,staleDataPreserved:true}));await f.finish()
 }
 const f=await fixture(1024)
 await f.row('Harina').getByRole('button',{name:'Contar',exact:true}).click();await f.dialog().getByLabel('Cantidad contada ahora',{exact:true}).fill('1')
 f.state.conflict=true;await f.dialog().getByRole('button',{name:'Guardar recuento',exact:true}).click();await f.dialog().getByRole('alert').waitFor()
 if(f.state.items[0].current_stock!==4)throw Error('Conflict overwritten')
 await f.dialog().getByRole('button',{name:'Guardar recuento',exact:true}).click();await f.dialog().waitFor({state:'detached'})
 if(f.state.commands.at(-1).expectedStock!==4)throw Error('Conflict did not refresh the stock')
 await f.row('Harina').getByRole('button',{name:'Recibir',exact:true}).click();await f.dialog().getByLabel('Cantidad recibida',{exact:true}).fill('2')
 f.state.loseConfirmation=true;await f.dialog().getByRole('button',{name:'Guardar entrada',exact:true}).click()
 await f.dialog().getByRole('button',{name:'Comprobar operación',exact:true}).waitFor()
 const original=f.state.commands.at(-1).requestId
 await f.page.reload();await f.mount();await f.page.getByRole('button',{name:'Comprobar operación pendiente',exact:true}).click()
 await f.dialog().getByRole('button',{name:'Comprobar operación',exact:true}).click();await f.dialog().waitFor({state:'detached'})
 if(f.state.commands.at(-1).requestId!==original||f.state.items[0].current_stock!==3)throw Error('Ambiguous save duplicated after reload')
 await f.row('Harina').getByRole('button',{name:'Recibir',exact:true}).click();await f.dialog().getByRole('button',{name:'Por paquetes o cajas'}).click()
 await f.dialog().getByLabel('Número de paquetes',{exact:true}).fill('3');await f.dialog().getByLabel('Contenido de cada paquete (kg)',{exact:true}).fill('0,1')
 await f.dialog().getByRole('button',{name:'Guardar entrada',exact:true}).click();await f.dialog().waitFor({state:'detached'})
 if(f.state.commands.at(-1).quantity!==0.3||f.state.items[0].current_stock!==3.3)throw Error('Floating point artifacts in fractional packages')
 console.log(JSON.stringify({conflictPreserved:true,retryUsesFreshStock:true,uncertainSaveSurvivesReload:true,oneStockEntry:true,fractionalPackagesAccurate:true}));await f.finish()
} finally {await browser.close()}

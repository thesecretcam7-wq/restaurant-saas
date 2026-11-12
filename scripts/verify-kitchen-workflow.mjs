// Actual KDS component with isolated API and Realtime. No production data/writes.
import {createRequire} from 'node:module'
import path from 'node:path'
const root=process.cwd(),local=createRequire(path.join(root,'package.json'))
const require=process.env.ECCOFOOD_BROWSER_PACKAGE?createRequire(path.resolve(process.env.ECCOFOOD_BROWSER_PACKAGE)):local
const {chromium}=require('playwright'),{build}=require('esbuild')
const bundle=await build({stdin:{contents:`import React from'react';import{createRoot}from'react-dom/client';import{KDSScreen}from'./components/admin/KDSScreen';window.root=createRoot(document.getElementById('fixture'));window.root.render(<KDSScreen tenantId="fixture" initialEnabled={window.enabled}/>);`,resolveDir:root,loader:'tsx'},bundle:true,write:false,format:'iife',platform:'browser',jsx:'automatic',define:{'process.env.NODE_ENV':'"production"'},plugins:[{name:'isolated-db',setup(b){b.onLoad({filter:/lib[\\/]supabase[\\/]client\.ts$/},()=>({loader:'js',contents:`export function createClient(){return{channel(){window.subscriptions++;const c={on(){return c},subscribe(){return c}};return c},removeChannel(){window.removed++}}}` }))}}]})
const browser=await chromium.launch({headless:true,executablePath:process.env.ECCOFOOD_BROWSER_EXECUTABLE||undefined})
function check(ok,message){if(!ok)throw Error(message)}
try{
 async function fixture(enabled,fail=false){
  const context=await browser.newContext(),page=await context.newPage(),state={calls:[],enabled,fail},errors=[]
  page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(10000)
  await page.route('**/*',async route=>{
   const req=route.request(),url=new URL(req.url())
   if(req.resourceType()==='document')return route.fulfill({contentType:'text/html',body:'<html><body><div id="fixture"></div></body></html>'})
   if(url.pathname==='/api/order-items'){
    check(req.method()==='GET','Unexpected kitchen mutation');state.calls.push(Object.fromEntries(url.searchParams))
    if(state.fail)return route.fulfill({status:503,json:{error:'Unavailable'}})
    if(!state.enabled)return route.fulfill({headers:{'x-kds-enabled':'false'},json:[]})
    return route.fulfill({json:[{id:'item',order_id:'paid-order',name:'Hamburguesa pendiente',quantity:1,price:4,status:'pending',requires_kitchen:true,created_at:new Date().toISOString(),orders:{order_number:'ORD-1',created_at:new Date().toISOString(),status:'confirmed',payment_status:'paid',table_number:1}}]})
   }
   return route.fulfill({status:204,body:''})
  })
  await page.goto('http://localhost:3000/kds-fixture');await page.clock.install()
  await page.evaluate(enabled=>{window.enabled=enabled;window.subscriptions=0;window.removed=0},enabled)
  await page.addScriptTag({content:bundle.outputFiles[0].text})
  return{page,state,errors,async finish(){check(errors.length===0,errors.join('\n'));await context.close()}}
 }
 const off=await fixture(false);await off.page.getByText('La cocina está desactivada',{exact:true}).waitFor();await off.page.clock.fastForward(65000)
 check(off.state.calls.length===0,'Disabled kitchen queried items');check(await off.page.evaluate(()=>window.subscriptions)===0,'Disabled kitchen subscribed');await off.finish()
 console.log('PASS disabled KDS: no reads or subscriptions')
 const on=await fixture(true);await on.page.getByText('Hamburguesa pendiente',{exact:true}).waitFor()
 check(on.state.calls[0].today==='1','Kitchen not scoped to business day');check(on.state.calls[0].tenantId==='fixture','Missing tenant')
 await on.page.getByLabel('Día de cocina',{exact:true}).fill('2026-10-31');await on.page.getByRole('button',{name:'Jornada actual',exact:true}).waitFor()
 check(on.state.calls.at(-1).date==='2026-10-31','Historical day missing');check(await on.page.evaluate(()=>window.removed)===1,'Historical view retained subscription')
 const before=on.state.calls.length;await on.page.clock.fastForward(65000);check(on.state.calls.length===before,'Historical view polled repeatedly')
 await on.page.getByRole('button',{name:'Jornada actual',exact:true}).click();await on.page.getByText('Hamburguesa pendiente',{exact:true}).waitFor()
 check(await on.page.evaluate(()=>window.subscriptions)===2,'Current day did not reconnect')
 on.state.enabled=false;await on.page.clock.fastForward(31000);await on.page.getByText('La cocina está desactivada',{exact:true}).waitFor()
 check(await on.page.evaluate(()=>window.removed)===2,'Disabling did not remove channel');const stopped=on.state.calls.length;await on.page.clock.fastForward(65000);check(on.state.calls.length===stopped,'Disabled KDS continued polling')
 await on.finish();console.log('PASS paid pending item preserved; historical opt-in, cleanup and remote disable')
 const failure=await fixture(true,true);await failure.page.getByRole('alert').waitFor();failure.state.fail=false
 await failure.page.getByRole('button',{name:'Reintentar',exact:true}).click();await failure.page.getByText('Hamburguesa pendiente',{exact:true}).waitFor()
 check(await failure.page.getByRole('alert').count()===0,'Failure banner did not clear');await failure.page.evaluate(()=>window.root.unmount())
 check(await failure.page.evaluate(()=>window.removed)===1,'Unmount leaked subscription');await failure.finish()
 console.log('PASS unavailable API is visible and retry/unmount work')
}finally{await browser.close()}

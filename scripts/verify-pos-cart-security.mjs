// Actual customer display and actual service worker, isolated HTTP/API fixtures.
import {createRequire}from'node:module'
import {createServer}from'node:http'
import {readFile}from'node:fs/promises'
import path from'node:path'
const root=process.cwd(),local=createRequire(path.join(root,'package.json'))
const require=process.env.ECCOFOOD_BROWSER_PACKAGE?createRequire(path.resolve(process.env.ECCOFOOD_BROWSER_PACKAGE)):local
const{chromium}=require('playwright'),{build}=require('esbuild')
const bundle=await build({stdin:{contents:`import React from'react';import{createRoot}from'react-dom/client';import Screen from'./app/[domain]/pos-display/page';window.root=createRoot(document.getElementById('fixture'));window.root.render(<Screen/>);`,loader:'tsx',resolveDir:root},bundle:true,write:false,format:'iife',platform:'browser',jsx:'automatic',define:{'process.env.NODE_ENV':'"production"'},plugins:[{name:'isolated',setup(b){
 b.onResolve({filter:/^next\/navigation$/},()=>({path:'navigation',namespace:'fixture'}))
 b.onLoad({filter:/.*/,namespace:'fixture'},()=>({loader:'js',contents:'export function useSearchParams(){return new URLSearchParams(window.location.search)}'}))
 b.onLoad({filter:/lib[\\/]supabase[\\/]client\.ts$/},()=>({loader:'js',contents:`export function createClient(){return{from(){throw Error('Direct table access forbidden')},channel(topic){window.topics.push(topic);const c={on(type,filter,fn){window.eventTypes.push(type);window.hint=fn;return c},subscribe(){return c}};return c},removeChannel(){window.removed++}}}`}))
}}]})
const sw=await readFile('public/sw.js','utf8'),tid='11111111-1111-4111-8111-111111111111',session='session-fixture',id='33333333-3333-4333-8333-333333333333'
const state={cart:{id,items:[{name:'Coffee fixture',price:3,quantity:2}],subtotal:6,total:6,discount:0,updated_at:new Date().toISOString()},calls:[],fail:false,paired:true}
const json=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data))}
const server=createServer(async(req,res)=>{
 const url=new URL(req.url,'http://fixture')
 if(url.pathname==='/sw.js'){res.writeHead(200,{'Content-Type':'application/javascript','Cache-Control':'no-store'});res.end(sw);return}
 if(url.pathname==='/bundle.js'){res.writeHead(200,{'Content-Type':'application/javascript'});res.end(bundle.outputFiles[0].text);return}
 if(url.pathname==='/api/tenant/branding'){json(res,200,{branding:{app_name:'Fixture'}});return}
 if(url.pathname.startsWith('/api/settings/')){json(res,200,{tax_rate:10});return}
 if(url.pathname==='/api/pos/cart/display'){
  state.calls.push({path:url.pathname,authorization:req.headers.authorization,session:url.searchParams.get('sessionId')})
  if(!state.paired){json(res,401,{error:'Unpaired'});return}
  if(state.fail){json(res,503,{error:'Unavailable'});return}
  json(res,200,{cart:state.cart,topic:'opaque-fixture-topic',sessionId:session});return
 }
 if(url.pathname==='/api/pos/cart'){
  let text='';for await(const chunk of req)text+=chunk
  state.calls.push({path:url.pathname,cookie:req.headers.cookie,method:req.method,body:text?JSON.parse(text):null})
  if(!(req.headers.cookie||'').includes('fixture_access=allowed')){json(res,401,{error:'Unauthorized'});return}
  json(res,200,{cart:state.cart});return
 }
 if(url.pathname.startsWith('/icons/')||url.pathname==='/favicon.ico'){res.writeHead(404);res.end();return}
 if(url.pathname.endsWith('/acceso/login/cajero')){await new Promise(resolve=>setTimeout(resolve,4200));res.writeHead(200,{'Content-Type':'text/html'});res.end('<html><body>Fresh cashier login</body></html>');return}
 res.writeHead(200,{'Content-Type':'text/html'});res.end('<html><body><div id="fixture"></div></body></html>')
})
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve))
const origin='http://127.0.0.1:'+server.address().port
const browser=await chromium.launch({headless:true,executablePath:process.env.ECCOFOOD_BROWSER_EXECUTABLE||undefined})
const check=(ok,msg)=>{if(!ok)throw Error(msg)}
try{
 const context=await browser.newContext(),page=await context.newPage(),errors=[]
 page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(10000)
 await page.goto(origin+'/?tid='+tid+'&sid='+session+'#access=fixture-grant')
 await page.clock.install()
 await page.evaluate(()=>{window.topics=[];window.eventTypes=[];window.removed=0})
 await page.addScriptTag({url:origin+'/bundle.js'})
 await page.getByText('Coffee fixture',{exact:true}).waitFor()
 check(state.calls.every(c=>c.authorization==='Bearer fixture-grant'),'Grant missing from display fetch')
 check(await page.evaluate(()=>window.eventTypes.every(t=>t==='broadcast')),'Display subscribed to database changes')
 check(await page.evaluate(()=>window.topics.every(t=>t==='opaque-fixture-topic')),'Unexpected public tenant topic')
 const count=state.calls.length;await page.clock.fastForward(59000);check(state.calls.length===count,'Repeated reads without changes before fallback')
 await page.evaluate(()=>window.hint({payload:{cart:{total:9999}}}));await page.waitForTimeout(20)
 check(!await page.getByText('9999',{exact:false}).count(),'Broadcast payload trusted as cart data')
 state.fail=true;await page.evaluate(()=>window.hint({}));await page.getByRole('alert').waitFor()
 check(await page.getByText('Coffee fixture',{exact:true}).count()===1,'Transient failure discarded last display')
 state.fail=false;state.cart=null;await page.evaluate(()=>window.hint({}));await page.getByText('Coffee fixture',{exact:true}).waitFor({state:'detached'})
 await page.evaluate(()=>window.root.unmount());check(await page.evaluate(()=>window.removed)>=1,'Channel leaked after unmount')
 check(errors.length===0,errors.join('\n'));await context.close()
 console.log('PASS display: scoped bearer grant, no direct table/DB subscription, hints only, bounded fallback, error recovery and cleanup')
 const legacy=await browser.newContext(),old=await legacy.newPage()
 await legacy.route('https://csdooyggiuhzovehykna.supabase.co/**',route=>route.abort())
 await legacy.addCookies([{name:'fixture_access',value:'allowed',url:origin}]);await old.goto(origin+'/legacy')
 await old.evaluate(async()=>{await navigator.serviceWorker.register('/sw.js');await navigator.serviceWorker.ready;if(!navigator.serviceWorker.controller)await new Promise(resolve=>navigator.serviceWorker.addEventListener('controllerchange',resolve,{once:true}))})
 state.cart={id,items:[],subtotal:0,total:0,discount:0,updated_at:new Date().toISOString()}
 const result=await old.evaluate(async({tid,session,id})=>{
  const url='https://csdooyggiuhzovehykna.supabase.co/rest/v1/pos_carts'
  const read=await fetch(url+'?tenant_id=eq.'+tid+'&cart_session_id=eq.'+session+'&select=id',{headers:{apikey:'invalid-fixture-key'}})
  const data=await read.json()
  const patch=await fetch(url+'?id=eq.'+id,{method:'PATCH',headers:{'Content-Type':'application/json',apikey:'invalid-fixture-key'},body:JSON.stringify({items:[],subtotal:0,total:0})})
  return{read:read.status,data,patch:patch.status}
 },{tid,session,id})
 check(result.read===200&&result.data[0]?.id===id&&result.patch===204,'Actual service-worker bridge failed '+JSON.stringify(result))
 const patch=state.calls.findLast(c=>c.path==='/api/pos/cart'&&c.method==='PATCH')
 check(patch?.body?.tenantId===tid&&patch.body.sessionId===session,'Legacy write lost tenant/session scope')
 await legacy.clearCookies()
 const denied=await old.evaluate(async tid=>(await fetch('https://csdooyggiuhzovehykna.supabase.co/rest/v1/pos_carts?tenant_id=eq.'+tid+'&cart_session_id=eq.session-fixture')).status,tid)
 check(denied===401,'Legacy bridge allowed an anonymous browser')
 const login=await old.goto(origin+'/fixture/acceso/login/cajero');check(login.status()===200,'Slow login was replaced with false offline page');await old.getByText('Fresh cashier login',{exact:true}).waitFor();await legacy.close()
 console.log('PASS actual SW bridge: existing read/ID-only update, same-origin cookies, anonymous denied; no Supabase requests')
 console.log('PASS installed app: successful login response after 4.2 seconds is not cut off by worker timeout')
 const unpaired=await browser.newContext(),screen=await unpaired.newPage();state.paired=false
 await screen.goto(origin+'/?tid='+tid);await screen.evaluate(()=>{window.topics=[];window.eventTypes=[];window.removed=0});await screen.addScriptTag({url:origin+'/bundle.js'})
 await screen.getByRole('alert').waitFor();check((await screen.getByRole('alert').innerText()).includes('vincularla'),'Missing pairing instructions')
 check(await screen.evaluate(()=>window.topics.length)===0,'Unpaired screen subscribed');await unpaired.close()
 console.log('PASS unpaired screen: clear pairing instructions and no subscription')
}finally{await browser.close();await new Promise(resolve=>server.close(resolve))}

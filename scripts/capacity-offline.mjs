// Functional concurrency test of the REAL offline module/IndexedDB/browser locks.
// API responses are simulated: this does NOT measure Supabase write capacity.
import {createRequire} from 'node:module'
import path from 'node:path'
import {writeFile,mkdir} from 'node:fs/promises'
const root=process.cwd(),require=createRequire(path.resolve(process.env.ECCOFOOD_BROWSER_PACKAGE || path.join(root,'package.json')))
const {chromium}=require('playwright'),{build}=require('esbuild')
const bundle=await build({stdin:{contents:`import{getOfflineStorage}from'./lib/offline/storage';import{saveOfflinePOSOrder,syncOfflinePOSOrders}from'./lib/offline/pos-sync';window.fixture={storage:getOfflineStorage(),save:saveOfflinePOSOrder,sync:syncOfflinePOSOrders};`,resolveDir:root,loader:'ts'},bundle:true,write:false,format:'iife',platform:'browser',define:{'process.env.NODE_ENV':'"production"'}})
const browser=await chromium.launch({headless:true,...(process.env.ECCOFOOD_BROWSER_EXECUTABLE ? {executablePath:process.env.ECCOFOOD_BROWSER_EXECUTABLE} : {})})
const started=Date.now(),contexts=[],businesses=[],requests=[],committed=new Map(),errors=[]
let mode='down',inFlight=0,maxInFlight=0
const acknowledgedAfterAmbiguity=new Set()
try{
 for(let index=0;index<20;index++){
  const tenant=`capacity-business-${index+1}`,context=await browser.newContext();contexts.push(context)
  await context.route('**/*',async route=>{
   const req=route.request(),url=new URL(req.url())
   if(req.resourceType()==='document')return route.fulfill({contentType:'text/html',body:'<html><body>Isolated concurrency test</body></html>'})
   if(url.pathname!=='/api/orders'||req.method()!=='POST')throw Error('Unexpected request in isolated fixture')
   const body=req.postDataJSON();requests.push({tenant:body.tenantId,id:body.offlineClientId,mode})
   if(body.tenantId!==tenant)throw Error('Sale crossed business boundary')
   if(mode==='down')return route.fulfill({status:503,json:{error:'simulated outage'}})
   inFlight++;maxInFlight=Math.max(maxInFlight,inFlight)
   try{
    await new Promise(resolve=>setTimeout(resolve,100))
    const key=body.tenantId+':'+body.offlineClientId
    if(!committed.has(key))committed.set(key,{orderId:'saved-'+body.offlineClientId,body})
    if(mode==='ambiguous'&&!acknowledgedAfterAmbiguity.has(tenant)){
     acknowledgedAfterAmbiguity.add(tenant)
     return route.fulfill({json:{}})
    }
    return route.fulfill({json:{orderId:committed.get(key).orderId}})
   }finally{inFlight--}
  })
  const pages=[await context.newPage(),await context.newPage()]
  for(const page of pages){page.on('pageerror',error=>errors.push(error.message));await page.goto('http://localhost:3000/capacity-offline-fixture');await page.addScriptTag({content:bundle.outputFiles[0].text});if(!(await page.evaluate(()=>window.isSecureContext&&!!navigator.locks)))throw Error('Browser lock test needs a secure origin')}
  await pages[0].evaluate(async tenant=>{
   for(let i=0;i<10;i++)await window.fixture.save({tenantId:tenant,items:[{menu_item_id:'product',name:'Café',price:1.5,quantity:i%3+1}],subtotal:1.5*(i%3+1),discount:0,total:1.5*(i%3+1),paymentMethod:i%2?'stripe':'cash',deliveryType:'takeaway'})
  },tenant)
  businesses.push({tenant,pages})
 }
 const attempt=()=>Promise.all(businesses.map(({tenant,pages})=>pages[0].evaluate(tenant=>window.fixture.sync(tenant),tenant)))
 const outage=await attempt();if(outage.some(result=>result.synced!==0||result.remaining!==10||!result.errors.length))throw Error('Outage lost a sale')
 mode='ambiguous';const ambiguous=await attempt();if(ambiguous.some(result=>result.synced!==0||result.remaining!==10||!result.errors.length))throw Error('Missing confirmation lost a sale')
 mode='online'
 const results=await Promise.all(businesses.flatMap(({tenant,pages})=>pages.map(page=>page.evaluate(tenant=>window.fixture.sync(tenant),tenant))))
 if(results.some(result=>result.remaining!==0||result.errors.length)||results.reduce((sum,result)=>sum+result.synced,0)!==200)throw Error('Queue not fully confirmed '+JSON.stringify(results))
 const queueSizes=await Promise.all(businesses.map(({pages})=>pages[0].evaluate(async()=>({sales:(await window.fixture.storage.getUnsyncedOrders()).length,operations:(await window.fixture.storage.getPendingOperations()).filter(op=>op.table==='pos_orders'&&!op.synced).length}))))
 if(queueSizes.some(queue=>queue.sales||queue.operations))throw Error('Pending operations remain')
 const rows=[...committed.values()].map(value=>value.body)
 if(rows.length!==200||rows.filter(row=>row.paymentMethod==='stripe').length!==100||rows.some(row=>!row.offlineCreatedAt||row.items.some(item=>item.price!==1.5)))throw Error('Wrong totals, dates or payment methods')
 const onlineRequests=requests.filter(row=>row.mode==='online')
 if(onlineRequests.length!==200||new Set(onlineRequests.map(row=>row.tenant+':'+row.id)).size!==200)throw Error('Concurrent tabs uploaded a sale twice')
 if(errors.length)throw Error(errors.join('\n'))
 const report={at:new Date().toISOString(),scope:'Real browser offline module with simulated API, not Supabase capacity',businesses:20,tabs:40,sales:200,cardSales:100,cashSales:100,outagePreservedAllSales:true,missingConfirmationPreservedAllSales:true,twoTabsNoDuplicateUploads:true,tenantIsolation:true,allQueuesEmpty:true,maxSimultaneousMockRequests:maxInFlight,elapsedSeconds:Math.round((Date.now()-started)/100)/10}
 await mkdir('output/capacity',{recursive:true});await writeFile('output/capacity/offline-result.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report))
}finally{for(const context of contexts)await context.close();await browser.close()}

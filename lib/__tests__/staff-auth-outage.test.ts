import {beforeEach,describe,expect,it,vi} from 'vitest'
import {NextRequest} from 'next/server'
import {POST as login} from '@/app/api/staff/auth/route'
import {POST as session} from '@/app/api/staff/session/route'
const mocks=vi.hoisted(()=>({errors:{} as Record<string,unknown>,staffMissing:false,inserts:vi.fn(),cookies:vi.fn(),clear:vi.fn()}))
vi.mock('../error-handler',()=>({logSecurityEvent:vi.fn()}))
vi.mock('../staff-auth-proof',()=>({createStaffAuthProof:()=> 'fixture-proof',verifyStaffAuthProof:()=>({tenantId:'tenant',staffId:'cashier',role:'cajero'})}))
vi.mock('next/headers',()=>({cookies:async()=>({get:()=>({value:'fixture-proof'}),set:mocks.cookies,delete:mocks.clear})}))
vi.mock('../supabase/database',()=>({createClient:()=>({from(table:string){
 const q:any=new Proxy({},{get(_,key){
  if(key==='insert')return(value:unknown)=>{mocks.inserts(table,value);return q}
  if(key==='then')return(resolve:(v:unknown)=>unknown)=>Promise.resolve(resolve({data:table==='tenants'?{id:'tenant'}:table==='staff_members'?(mocks.staffMissing?null:{id:'cashier',name:'Fixture',role:'cajero',is_active:true}):table==='staff_role_permissions'?[{admin_permissions:{key:'admin_dashboard'}}]:[],count:0,error:mocks.errors[table]||null}))
  return()=>q
 }})
 return q
}})}))
const loginRequest=()=>new NextRequest('https://example.com/api/staff/auth',{method:'POST',body:JSON.stringify({domain:'fixture',role:'cajero',pin:'test-pin'})})
const sessionRequest=()=>new NextRequest('https://example.com/api/staff/session',{method:'POST',body:JSON.stringify({tenantId:'tenant',staffId:'cashier',staffName:'Fixture',role:'cajero'})})
beforeEach(()=>{vi.clearAllMocks();mocks.errors={};mocks.staffMissing=false})
describe('staff login and session during database failures',()=>{
 it.each(['pin_auth_rate_limits','tenants','staff_members'])('reports %s failure as 503, without recording a bad PIN',async table=>{
  mocks.errors[table]={message:'Database unavailable'}
  expect((await login(loginRequest())).status).toBe(503)
  expect(mocks.inserts).not.toHaveBeenCalled()
 })
 it('still rejects and records a genuinely wrong PIN',async()=>{
  mocks.staffMissing=true
  expect((await login(loginRequest())).status).toBe(401)
  expect(mocks.inserts).toHaveBeenCalledWith('pin_auth_rate_limits',expect.anything())
 })
 it.each(['staff_members','staff_role_permissions','active_sessions'])('preserves existing session cookies if %s cannot be verified',async table=>{
  mocks.errors[table]={message:'Database unavailable'}
  expect((await session(sessionRequest())).status).toBe(503)
  expect(mocks.cookies).not.toHaveBeenCalled();expect(mocks.clear).not.toHaveBeenCalled()
 })
 it('creates a new cookie only after all session checks succeed',async()=>{
  expect((await session(sessionRequest())).status).toBe(200)
  expect(mocks.cookies).toHaveBeenCalledWith('staff_session',expect.any(String),expect.objectContaining({httpOnly:true}))
 })
})

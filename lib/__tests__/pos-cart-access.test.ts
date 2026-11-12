import {beforeEach,afterEach,describe,it,expect,vi} from 'vitest'
import {requirePOSCartAccess} from '../pos-cart-access'
import {signServerValue,verifyServerValue} from '../server-signed-token'
const tid='11111111-1111-4111-8111-111111111111',sid='22222222-2222-4222-8222-222222222222',token='33333333-3333-4333-8333-333333333333'
const m=vi.hoisted(()=>({cookies:new Map<string,string>(),set:vi.fn(),user:vi.fn(),from:vi.fn(),error:null as any,activeToken:'',owner:false}))
vi.mock('next/headers',()=>({cookies:async()=>({get:(k:string)=>m.cookies.has(k)?{value:m.cookies.get(k)}:undefined,set:m.set})}))
vi.mock('../supabase/network',async original=>({...await original<typeof import('../supabase/network')>(),getVerifiedUser:m.user}))
vi.mock('../supabase/server',()=>({createClient:async()=>({}),createServiceClient:()=>({from:m.from})}))
const payload=(extra={})=>({tenantId:tid,staffId:sid,staffName:'Client name',role:'cajero',permissions:['admin_fake'],sessionToken:token,createdAt:new Date().toISOString(),...extra})
beforeEach(()=>{
 vi.clearAllMocks();vi.stubEnv('CSRF_SECRET','cart-test-secret');m.cookies.clear();m.activeToken=token;m.error=null;m.owner=false;m.user.mockResolvedValue(null)
 m.from.mockImplementation((table:string)=>{const q:any=new Proxy({},{get(_t,k){if(k==='then')return (resolve:any)=>Promise.resolve(resolve({data:table==='active_sessions'?{session_token:m.activeToken}:table==='staff_members'?{id:sid,name:'Server name',role:'cajero',is_active:true}:table==='staff_role_permissions'?[{admin_permissions:{key:'admin_dashboard'}}]:m.owner?{id:tid}:null,error:m.error}));return()=>q}});return q})
})
afterEach(()=>vi.unstubAllEnvs())
describe('private POS cart access',()=>{
 it('accepts a signed cashier session without additional database polling',async()=>{
  const raw=JSON.stringify(payload());m.cookies.set('staff_session',raw);m.cookies.set('staff_session_signature',signServerValue('staff-session-v1',raw))
  await requirePOSCartAccess(tid);expect(m.from).not.toHaveBeenCalled();expect(m.user).not.toHaveBeenCalled()
 })
 it('rejects a forged legacy staff cookie with the wrong random server token',async()=>{
  m.cookies.set('staff_session',JSON.stringify(payload({sessionToken:'44444444-4444-4444-8444-444444444444'})))
  await expect(requirePOSCartAccess(tid)).rejects.toMatchObject({status:401});expect(m.set).not.toHaveBeenCalled()
 })
 it('does not downgrade an invalid signature to legacy trust',async()=>{
  m.cookies.set('staff_session',JSON.stringify(payload()));m.cookies.set('staff_session_signature','forged')
  await expect(requirePOSCartAccess(tid)).rejects.toMatchObject({status:401});expect(m.from).not.toHaveBeenCalled()
 })
 it('upgrades a verified legacy session using canonical server permissions and name',async()=>{
  m.cookies.set('staff_session',JSON.stringify(payload()));await requirePOSCartAccess(tid)
  const raw=m.set.mock.calls.find(([key])=>key==='staff_session')![1],sig=m.set.mock.calls.find(([key])=>key==='staff_session_signature')![1]
  expect(JSON.parse(raw)).toMatchObject({staffName:'Server name',permissions:['admin_dashboard']})
  expect(verifyServerValue('staff-session-v1',raw,sig)).toBe(true)
 })
 it('preserves cookies and reports 503 if a legacy session cannot be checked',async()=>{
  m.cookies.set('staff_session',JSON.stringify(payload()));m.error={message:'Unavailable'}
  await expect(requirePOSCartAccess(tid)).rejects.toMatchObject({status:503});expect(m.set).not.toHaveBeenCalled()
 })
 it('rejects expired signed sessions without reading data',async()=>{
  const raw=JSON.stringify(payload({createdAt:'2000-01-01T00:00:00Z'}));m.cookies.set('staff_session',raw);m.cookies.set('staff_session_signature',signServerValue('staff-session-v1',raw))
  await expect(requirePOSCartAccess(tid)).rejects.toMatchObject({status:401});expect(m.from).not.toHaveBeenCalled()
 })
 it('does not grant a cashier session access to another restaurant',async()=>{
  const raw=JSON.stringify(payload());m.cookies.set('staff_session',raw);m.cookies.set('staff_session_signature',signServerValue('staff-session-v1',raw))
  await expect(requirePOSCartAccess('55555555-5555-4555-8555-555555555555')).rejects.toMatchObject({status:401});expect(m.from).not.toHaveBeenCalled()
 })
 it('still permits an authenticated owner only after ownership is checked',async()=>{
  m.user.mockResolvedValue({id:'owner'});m.owner=false;await expect(requirePOSCartAccess(tid)).rejects.toMatchObject({status:403})
  m.owner=true;await requirePOSCartAccess(tid);expect(m.from).toHaveBeenCalledWith('tenants')
 })
})

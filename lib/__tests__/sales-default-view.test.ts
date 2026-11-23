import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Page from '@/app/[domain]/admin/ventas/page'
const m=vi.hoisted(()=>({service:vi.fn(),history:vi.fn(),access:vi.fn()}))
vi.mock('../supabase/server',()=>({createServiceClient:m.service}))
vi.mock('../admin-access',()=>({resolveAdminAccess:m.access}))
vi.mock('../checkPlan',()=>({getTenantPlanInfo:async()=>({planId:'premium'})}))
vi.mock('../sales-history-server',()=>({fetchSalesHistoryTotals:m.history}))
vi.mock('next/headers',()=>({cookies:async()=>({})}))
vi.mock('next/navigation',()=>({redirect:(path:string)=>{throw Error('redirect:'+path)}}))
vi.mock('@/components/admin/SalesTicketReview',()=>({SalesTicketReview:()=>null}))
vi.mock('@/components/admin/SalesAutoRefresh',()=>({SalesAutoRefresh:()=>null}))
vi.mock('@/components/admin/ProductSalesReport',()=>({ProductSalesReport:()=>null}))
vi.mock('@/components/admin/ReprintReceiptButton',()=>({ReprintReceiptButton:()=>null}))
vi.mock('@/components/admin/EditSaleButton',()=>({EditSaleButton:()=>null}))
vi.mock('@/components/admin/VoidSaleButton',()=>({VoidSaleButton:()=>null}))
beforeEach(()=>{vi.clearAllMocks();vi.stubGlobal('React',React);m.access.mockResolvedValue({tenant:{id:'tenant'},isOwner:true,isStaffAdmin:false})})
afterEach(()=>vi.unstubAllGlobals())
describe('sales landing view',()=>{
 it('opens individual tickets without querying monthly or historical orders',async()=>{
  expect(await Page({params:Promise.resolve({domain:'cafe'}),searchParams:Promise.resolve({})})).toBeTruthy()
  expect(m.service).not.toHaveBeenCalled();expect(m.history).not.toHaveBeenCalled()
 })
 it('checks access before fetching sales data',async()=>{
  m.access.mockResolvedValue({tenant:null,isOwner:false,isStaffAdmin:false})
  await expect(Page({params:Promise.resolve({domain:'cafe'})})).rejects.toThrow('redirect:/cafe/admin/login')
  expect(m.service).not.toHaveBeenCalled()
 })
})

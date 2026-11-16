import { describe, expect, it } from 'vitest'
import { inventoryNumber, inventoryStatus, normalizeInventoryItem, reorderQuantity, stockAfterMovement, validQuantity, validateInventoryFields } from '../inventory-workflow'
const item=normalizeInventoryItem({id:'item',product_name:'Harina',unit:'kg',current_stock:'2.5',min_stock:'3',max_stock:'10',cost_per_unit:'1.25'})
describe('daily inventory logic',()=>{
  it('keeps decimal quantities and accepts a decimal comma',()=>{
    expect(inventoryNumber('2,5')).toBe(2.5)
    expect(validateInventoryFields({productName:'Harina',unit:'kg',initialStock:'2,5',minStock:0,maxStock:0,costPerUnit:'1,25'})).toMatchObject({current_stock:2.5,min_stock:0,cost_per_unit:1.25})
    expect(item.current_stock).toBe(2.5)
    expect(Number.isNaN(inventoryNumber('   '))).toBe(true)
    expect(Number.isNaN(inventoryNumber('0x20'))).toBe(true)
  })
  it('uses a recounted total rather than adding it, including zero',()=>{
    expect(stockAfterMovement(10,'adjustment',3)).toBe(3)
    expect(stockAfterMovement(10,'adjustment',0)).toBe(0)
    expect(stockAfterMovement(2.5,'purchase',0.125)).toBe(2.625)
    expect(stockAfterMovement(2.5,'damage',0.125)).toBe(2.375)
  })
  it('does not present automatically created empty entries as configured shortages',()=>{
    const blank={...item,unit:null,current_stock:0,min_stock:0,cost_per_unit:0,recipe_count:0}
    expect(inventoryStatus(blank)).toBe('setup')
    expect(inventoryStatus({...blank,recipe_count:1})).toBe('empty')
    expect(inventoryStatus({...blank,unit:'kg'})).toBe('empty')
    expect(inventoryStatus(item)).toBe('low')
  })
  it('suggests only the quantity missing to reach the desired stock',()=>{
    expect(reorderQuantity(item)).toBe(7.5)
    expect(reorderQuantity({...item,current_stock:12})).toBe(0)
    expect(reorderQuantity({...item,max_stock:0})).toBe(0.5)
  })
  it.each([-1,NaN,Infinity,0.0001,1000000000])('rejects invalid or silently rounded quantity %s',quantity=>{
    expect(validQuantity(quantity)).toBe(false)
    expect(()=>validateInventoryFields({productName:'Harina',initialStock:quantity})).toThrow()
  })
  it('validates thresholds, cost and units instead of silently resetting them',()=>{
    expect(()=>validateInventoryFields({productName:'Harina',minStock:10,maxStock:5})).toThrow('deseada')
    expect(()=>validateInventoryFields({productName:'Harina',costPerUnit:-1})).toThrow('coste')
    expect(()=>validateInventoryFields({productName:'Harina',unit:'arbitrary'})).toThrow('unidad')
    expect(()=>validateInventoryFields({productName:'   '})).toThrow('nombre')
  })
})

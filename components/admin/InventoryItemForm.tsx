'use client'

import { useRef, useState } from 'react'
import { InventoryDialog, InventoryField } from './InventoryDialog'
import { NumericKeyboard } from './NumericKeyboard'
import { TextKeyboard } from './TextKeyboard'
import { INVENTORY_UNITS, inventoryNumber, validateInventoryFields, type InventoryItem } from '@/lib/inventory-workflow'
import { InventorySaveError, saveInventoryCommand, type InventoryCommand } from '@/lib/inventory-client'

type Fields = {productName:string;unit:string;initialStock:string;minStock:string;maxStock:string;costPerUnit:string;sku:string;supplier:string}
export function InventoryItemForm({tenantId,item,pending,onClose,onSaved,onPending,nextActionLabel}:{
  tenantId:string;item?:InventoryItem;pending?:InventoryCommand|null;onClose:()=>void
  onSaved:(item:InventoryItem)=>void;onPending:(value:InventoryCommand|null)=>void
  nextActionLabel?:string
}) {
  const [fields,setFields]=useState<Fields>(() => ({productName:item?.product_name || '',unit:item?.unit || 'unidad',
    initialStock:'0',minStock:String(item?.min_stock || 0),maxStock:String(item?.max_stock || 0),costPerUnit:String(item?.cost_per_unit || 0),sku:item?.sku || '',supplier:item?.supplier || '',
    ...(pending?.kind==='create'?pending.body:{}),
  }))
  const [busy,setBusy]=useState(false),[uncertain,setUncertain]=useState(Boolean(pending)),[error,setError]=useState('')
  const [keyboard,setKeyboard]=useState<{key:keyof Fields;label:string;numeric:boolean}|null>(null)
  const guard=useRef(false),requestId=useRef(pending?.body.requestId || crypto.randomUUID())
  const frozen=useRef<InventoryCommand|null>(pending || null)
  const patch=(key:keyof Fields,value:string) => setFields(previous=>({...previous,[key]:value}))
  function field(key:keyof Fields,label:string,numeric=false,required=false) {
    return <InventoryField label={label} value={fields[key]} onChange={value=>patch(key,value)} numeric={numeric} required={required}
      disabled={busy||uncertain} onKeyboard={()=>setKeyboard({key,label,numeric})}/>
  }
  async function submit(event:React.FormEvent) {
    event.preventDefault();if (guard.current) return
    setError('')
    const body={...fields,tenantId,requestId:requestId.current}
    try {if (!uncertain) validateInventoryFields(body)} catch(error) {setError((error as Error).message);return}
    guard.current=true;setBusy(true)
    try {
      let data
      if (item) {
        const response=await fetch('/api/inventory/'+item.id,{method:'PUT',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(12000)})
        data=await response.json();if (!response.ok) throw Error(data.error || 'No se pudo guardar.')
      } else {
        const command=frozen.current || {kind:'create' as const,tenantId,body}
        frozen.current=command
        data=await saveInventoryCommand(command)
        onPending(null)
      }
      onSaved(data)
    } catch(error) {
      setError((error as Error).message || 'No se pudo guardar.')
      if (error instanceof InventorySaveError&&error.uncertain) {setUncertain(true);onPending(frozen.current)}
      else {setUncertain(false);frozen.current=null;onPending(null)}
    } finally {guard.current=false;setBusy(false)}
  }
  return <InventoryDialog title={item?'Datos de '+item.product_name:'Nuevo artículo'} description="Usa la misma unidad al recibir, contar y preparar recetas." onClose={onClose} busy={busy}>
    <form onSubmit={submit}>
      <div className="inventory-dialog-body">
        {error&&<p role="alert" className="inventory-error">{error}</p>}
        {uncertain&&<p className="inventory-notice">Hay un guardado pendiente de confirmar. Comprueba esta operación antes de crear otra.</p>}
        {field('productName','Nombre del artículo',false,true)}
        <div className="inventory-form-grid">
          <label className="inventory-field">Unidad de medida<select aria-label="Unidad de medida" className="admin-input" value={fields.unit} disabled={busy||uncertain||Boolean(item?.unit)} onChange={event=>patch('unit',event.target.value)}>
            {INVENTORY_UNITS.map(unit=><option key={unit.value} value={unit.value}>{unit.label}</option>)}
          </select></label>
          {!item&&field('initialStock','Cantidad que tienes ahora',true)}
          {field('minStock','Avisar al llegar a',true)}
        </div>
        <p className="inventory-help">Ejemplo: para harina en kg, escribe 2,5 si tienes dos kilos y medio. Un mínimo de 0 avisa cuando se agota.</p>
        {item&&!item.unit&&<p className="inventory-notice">Este artículo no tenía unidad definida. Selecciona la medida que ya usabas: las cantidades existentes no se convertirán.</p>}
        <details className="inventory-extra" open={uncertain||undefined}><summary>Proveedor, coste y otros datos opcionales</summary><div className="inventory-form-grid">
          {field('supplier','Proveedor')}{field('costPerUnit','Coste por unidad',true)}
          {field('maxStock','Cantidad deseada al reponer',true)}{field('sku','Código o referencia')}
        </div><p className="inventory-help">El coste sirve para valorar las existencias. Los pagos de facturas se registran en Compras.</p></details>
      </div>
      <footer className="inventory-dialog-footer"><button type="button" className="admin-button-ghost" disabled={busy} onClick={onClose}>{uncertain?'Volver al inventario':'Cancelar'}</button>
        <button className="admin-button-primary" disabled={busy} type="submit">{busy?'Guardando…':uncertain?'Comprobar operación':nextActionLabel || (item?'Guardar datos':'Crear artículo')}</button></footer>
    </form>
    <NumericKeyboard isOpen={Boolean(keyboard?.numeric)} title={keyboard?.label || ''} initialValue={keyboard?inventoryNumber(fields[keyboard.key],0):0}
      onConfirm={value=>{if(keyboard)patch(keyboard.key,String(value));setKeyboard(null)}} onCancel={()=>setKeyboard(null)}/>
    <TextKeyboard isOpen={Boolean(keyboard&&!keyboard.numeric)} title={keyboard?.label || ''} value={keyboard?fields[keyboard.key]:''}
      onChange={value=>{if(keyboard)patch(keyboard.key,value)}} onConfirm={()=>setKeyboard(null)} onCancel={()=>setKeyboard(null)} maxLength={160}/>
  </InventoryDialog>
}

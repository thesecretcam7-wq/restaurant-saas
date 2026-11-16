'use client'

import { useRef, useState } from 'react'
import { InventoryDialog, InventoryField } from './InventoryDialog'
import { NumericKeyboard } from './NumericKeyboard'
import { TextKeyboard } from './TextKeyboard'
import { inventoryNumber, stockAfterMovement, unitLabel, validQuantity, type InventoryItem, type ManualMovement } from '@/lib/inventory-workflow'
import { InventorySaveError, saveInventoryCommand, type InventoryCommand } from '@/lib/inventory-client'

const labels:Record<string,string>={purchase:'Recibir mercancía',adjustment:'Contar existencias',damage:'Registrar merma',sale:'Registrar salida',return:'Devolver al almacén'}
export function InventoryMovementForm({tenantId,item,type,pending,onClose,onSaved,onPending,onConflict}:{
  tenantId:string;item:InventoryItem;type:ManualMovement;pending?:InventoryCommand|null;onClose:()=>void
  onSaved:(item:InventoryItem)=>void;onPending:(value:InventoryCommand|null)=>void;onConflict:()=>Promise<void>
}) {
  const [quantity,setQuantity]=useState(String(pending?.body.quantity ?? (type==='adjustment'?item.current_stock:'')))
  const [packages,setPackages]=useState(false),[packageSize,setPackageSize]=useState('1'),[notes,setNotes]=useState(String(pending?.body.notes || ''))
  const [keyboard,setKeyboard]=useState<'quantity'|'packageSize'|'notes'|null>(null)
  const [busy,setBusy]=useState(false),[uncertain,setUncertain]=useState(Boolean(pending)),[error,setError]=useState('')
  const frozen=useRef<InventoryCommand|null>(pending || null),guard=useRef(false)
  const rawAmount=inventoryNumber(quantity)*(packages?inventoryNumber(packageSize):1)
  const amount=validQuantity(rawAmount)?Math.round(rawAmount*1000)/1000:rawAmount
  const after=stockAfterMovement(item.current_stock,type,amount),diff=Math.round((after-item.current_stock)*1000)/1000
  const fmt=(value:number)=>Number.isFinite(value)?value.toLocaleString('es-ES',{maximumFractionDigits:3}):'—'
  const quantityLabel=type==='adjustment'?'Cantidad contada ahora':type==='damage'?'Cantidad que se ha perdido':packages?'Número de paquetes':'Cantidad recibida'
  async function submit(event:React.FormEvent) {
    event.preventDefault();if(guard.current)return;setError('')
    if (!uncertain&&(!validQuantity(amount)||(type!=='adjustment'&&amount===0)||after<0)) {setError(after<0?'La merma supera las existencias disponibles.':'Escribe una cantidad válida, con hasta tres decimales.');return}
    guard.current=true;setBusy(true)
    const command=frozen.current || {kind:'movement' as const,tenantId,itemId:item.id,body:{tenantId,movementType:type,quantity:amount,
      expectedStock:type==='adjustment'?item.current_stock:null,notes,requestId:crypto.randomUUID()}}
    frozen.current=command
    try {
      const data=await saveInventoryCommand(command)
      onPending(null);onSaved({...item,...data.updated})
    } catch(error) {
      setError((error as Error).message)
      if(error instanceof InventorySaveError&&error.uncertain) {setUncertain(true);onPending(command)}
      else {setUncertain(false);frozen.current=null;onPending(null);if(error instanceof InventorySaveError&&error.status===409) await onConflict()}
    } finally {guard.current=false;setBusy(false)}
  }
  return <InventoryDialog title={labels[type]} description={item.product_name+' · '+unitLabel(item.unit)} onClose={onClose} busy={busy}>
    <form onSubmit={submit}><div className="inventory-dialog-body">
      {error&&<p role="alert" className="inventory-error">{error}</p>}
      {uncertain&&<p className="inventory-notice">La solicitud está pendiente de confirmar. Se comprobará la misma referencia para evitar duplicados.</p>}
      {type==='purchase'&&<div className="inventory-segment" aria-label="Cómo recibes la mercancía"><button type="button" aria-pressed={!packages} disabled={busy||uncertain} onClick={()=>setPackages(false)}>Cantidad directa</button>
        <button type="button" aria-pressed={packages} disabled={busy||uncertain} onClick={()=>setPackages(true)}>Por paquetes o cajas</button></div>}
      <InventoryField label={quantityLabel} value={quantity} numeric onChange={setQuantity} disabled={busy||uncertain} onKeyboard={()=>setKeyboard('quantity')} required/>
      {packages&&<InventoryField label={'Contenido de cada paquete ('+unitLabel(item.unit)+')'} value={packageSize} numeric onChange={setPackageSize} disabled={busy||uncertain} onKeyboard={()=>setKeyboard('packageSize')} required/>}
      <div className="inventory-preview"><div><span>Ahora</span><strong>{fmt(item.current_stock)} {unitLabel(item.unit)}</strong></div><div><span>{type==='adjustment'?'Diferencia':'Movimiento'}</span><strong>{diff>0?'+':''}{fmt(diff)}</strong></div><div><span>Quedarán</span><strong>{fmt(after)} {unitLabel(item.unit)}</strong></div></div>
      <p className="inventory-help">{type==='adjustment'?'Escribe todo lo que has contado, no la diferencia. Puedes poner 0.':type==='damage'?'Usa esta opción para productos caducados, rotos o desperdiciados.':'Ejemplo: 2 cajas de 24 unidades añaden 48 unidades. Esta entrada no registra un pago de factura.'}</p>
      <InventoryField label="Nota o motivo (opcional)" value={notes} onChange={setNotes} disabled={busy||uncertain} onKeyboard={()=>setKeyboard('notes')}/>
    </div><footer className="inventory-dialog-footer"><button type="button" className="admin-button-ghost" disabled={busy} onClick={onClose}>{uncertain?'Volver al inventario':'Cancelar'}</button>
      <button type="submit" className="admin-button-primary" disabled={busy}>{busy?'Guardando…':uncertain?'Comprobar operación':type==='adjustment'?'Guardar recuento':type==='damage'?'Guardar merma':'Guardar entrada'}</button></footer></form>
    <NumericKeyboard isOpen={keyboard==='quantity'||keyboard==='packageSize'} title={keyboard==='packageSize'?'Contenido de cada paquete':quantityLabel}
      initialValue={inventoryNumber(keyboard==='packageSize'?packageSize:quantity,0)} onConfirm={value=>{if(keyboard==='packageSize')setPackageSize(String(value));else setQuantity(String(value));setKeyboard(null)}} onCancel={()=>setKeyboard(null)}/>
    <TextKeyboard isOpen={keyboard==='notes'} title="Nota o motivo" value={notes} onChange={setNotes} onConfirm={()=>setKeyboard(null)} onCancel={()=>setKeyboard(null)} maxLength={500}/>
  </InventoryDialog>
}

'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { InventoryDialog } from './InventoryDialog'
import { unitLabel, type InventoryItem } from '@/lib/inventory-workflow'

type Movement={id:string;movement_type:string;quantity:number;notes?:string;reference_id?:string;created_at:string;order?:{order_number:string}|null}
const labels:Record<string,string>={purchase:'Entrada',sale:'Venta / salida',adjustment:'Recuento',damage:'Merma',return:'Devolución'}
export function InventoryHistory({tenantId,item,onClose}:{tenantId:string;item:InventoryItem;onClose:()=>void}) {
  const [rows,setRows]=useState<Movement[]>([]),[busy,setBusy]=useState(false),[error,setError]=useState(''),[more,setMore]=useState(false)
  const request=useRef<AbortController|null>(null),offset=useRef(0)
  const load=useCallback(async (append=false) => {
    request.current?.abort();const controller=new AbortController();request.current=controller
    setBusy(true);setError('')
    try {
      const response=await fetch('/api/inventory/'+item.id+'/stock-movement?tenantId='+tenantId+'&offset='+(append?offset.current:0),{
        credentials:'include',cache:'no-store',signal:AbortSignal.any([controller.signal,AbortSignal.timeout(10000)]),
      })
      const data=await response.json();if(!response.ok||!Array.isArray(data))throw Error(data.error || 'No se pudo cargar el historial.')
      if(controller.signal.aborted)return
      setRows(previous=>append?[...previous,...data]:data);offset.current=(append?offset.current:0)+data.length;setMore(data.length===50)
    }catch(error){if(!controller.signal.aborted)setError((error as Error).message)}
    finally{if(!controller.signal.aborted)setBusy(false)}
  },[tenantId,item.id])
  useEffect(()=>{void load();return()=>request.current?.abort()},[load])
  return <InventoryDialog title={'Historial de '+item.product_name} description={'Existencias actuales: '+item.current_stock.toLocaleString('es-ES')+' '+unitLabel(item.unit)} onClose={onClose}>
    <div className="inventory-dialog-body">
      {error&&<div role="alert" className="inventory-error">{error}<button className="admin-button-ghost" onClick={()=>void load(rows.length>0)}>Reintentar historial</button></div>}
      {!rows.length&&!busy&&!error&&<p className="inventory-help">Aún no hay movimientos registrados. Las existencias anteriores se conservan; las nuevas entradas, recuentos y mermas aparecerán aquí.</p>}
      {rows.map(row=>{
        const quantity=Number(row.quantity),delta=['sale','damage'].includes(row.movement_type)?-quantity:quantity
        return <article key={row.id} className="inventory-history-row"><div><strong>{labels[row.movement_type] || row.movement_type}</strong>
          <p>{row.notes || (row.order?.order_number?'Pedido '+row.order.order_number:'Movimiento registrado')}</p>
          <time dateTime={row.created_at}>{new Date(row.created_at).toLocaleString('es-ES',{dateStyle:'medium',timeStyle:'short'})}</time>
          {row.reference_id?.startsWith('inventory-manual:')&&<small>Ref. {row.reference_id.slice(-8)}</small>}</div>
          <b className={delta<0?'inventory-negative':'inventory-positive'}>{delta>0?'+':''}{delta.toLocaleString('es-ES',{maximumFractionDigits:3})} {unitLabel(item.unit)}</b>
        </article>
      })}
      {busy&&<p role="status">Cargando historial…</p>}
      {more&&!busy&&<button className="admin-button-ghost" onClick={()=>void load(true)}>Ver movimientos anteriores</button>}
    </div><footer className="inventory-dialog-footer"><button className="admin-button-primary" onClick={onClose}>Volver al inventario</button></footer>
  </InventoryDialog>
}

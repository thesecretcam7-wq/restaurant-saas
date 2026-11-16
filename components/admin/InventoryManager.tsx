'use client'

import './inventory.css'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Plus, RefreshCw, Search, Keyboard, PackagePlus, ClipboardCheck, MoreHorizontal, ArrowDownToLine } from 'lucide-react'
import { InventoryItemForm } from './InventoryItemForm'
import { InventoryMovementForm } from './InventoryMovementForm'
import { InventoryHistory } from './InventoryHistory'
import { TextKeyboard } from './TextKeyboard'
import { getCurrencyByCountry } from '@/lib/currency'
import { inventoryStatus, normalizeInventoryItem, reorderQuantity, unitLabel, type InventoryItem, type ManualMovement } from '@/lib/inventory-workflow'
import { pendingInventoryCommand, type InventoryCommand } from '@/lib/inventory-client'

type Filter = 'all' | 'reorder' | 'setup' | 'available'
const statuses={setup:'Por preparar',empty:'Agotado',low:'Reponer',ok:'Disponible'}
const priority={empty:0,low:1,ok:2,setup:3}
export function InventoryManager({tenantId,tenantSlug}:{tenantId:string;tenantSlug?:string}) {
  const [items,setItems]=useState<InventoryItem[]>([]),[loaded,setLoaded]=useState(false),[refreshing,setRefreshing]=useState(false)
  const [error,setError]=useState(''),[message,setMessage]=useState(''),[country,setCountry]=useState('ES')
  const [search,setSearch]=useState(''),[filter,setFilter]=useState<Filter>('all'),[page,setPage]=useState(0)
  const [searchKeyboard,setSearchKeyboard]=useState(false),[moreId,setMoreId]=useState<string|null>(null)
  const [editor,setEditor]=useState<'new'|InventoryItem|null>(null)
  const [setupNext,setSetupNext]=useState<{id:string;type:ManualMovement}|null>(null)
  const [movement,setMovement]=useState<{id:string;type:ManualMovement}|null>(null),[history,setHistory]=useState<InventoryItem|null>(null)
  const [pending,setPending]=useState<InventoryCommand|null>(null)
  const controller=useRef<AbortController|null>(null)
  const load=useCallback(async () => {
    controller.current?.abort();const request=new AbortController();controller.current=request
    setRefreshing(true);setError('');setMessage('')
    try {
      const response=await fetch('/api/inventory?tenantId='+tenantId+'&includeDetails=true',{credentials:'include',cache:'no-store',
        signal:AbortSignal.any([request.signal,AbortSignal.timeout(10000)])})
      const data=await response.json()
      if(!response.ok||!Array.isArray(data.inventory))throw Error(data.error || 'No se pudo cargar el inventario.')
      if(request.signal.aborted)return
      setItems(data.inventory.map(normalizeInventoryItem));setCountry(data.country || 'ES');setLoaded(true)
    }catch(error){if(!request.signal.aborted)setError((error as Error).message)}
    finally{if(!request.signal.aborted)setRefreshing(false)}
  },[tenantId])
  useEffect(()=>{
    setItems([]);setLoaded(false);setFilter('all');setPage(0);setSearch('');setEditor(null);setMovement(null);setHistory(null)
    setPending(pendingInventoryCommand(tenantId));void load()
    const storage=()=>setPending(pendingInventoryCommand(tenantId))
    window.addEventListener('storage',storage)
    return()=>{controller.current?.abort();window.removeEventListener('storage',storage)}
  },[tenantId,load])
  const currency=getCurrencyByCountry(country)
  const money=(value:number)=>value.toLocaleString(currency.locale,{style:'currency',currency:currency.code})
  const fmt=(value:number)=>value.toLocaleString('es-ES',{maximumFractionDigits:3})
  const grouped=useMemo(()=>({
    reorder:items.filter(item=>['empty','low'].includes(inventoryStatus(item))),
    setup:items.filter(item=>inventoryStatus(item)==='setup'),
    available:items.filter(item=>item.current_stock>0),
    value:items.reduce((sum,item)=>sum+item.current_stock*item.cost_per_unit,0),
  }),[items])
  const visible=useMemo(()=>{
    const query=search.trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
    return items.filter(item=>{
      const status=inventoryStatus(item)
      if(filter==='reorder'&&!['empty','low'].includes(status))return false
      if(filter==='setup'&&status!=='setup')return false
      if(filter==='available'&&item.current_stock<=0)return false
      return [item.product_name,item.sku,item.supplier].some(text=>String(text || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().includes(query))
    }).sort((a,b)=>priority[inventoryStatus(a)]-priority[inventoryStatus(b)] || a.product_name.localeCompare(b.product_name,'es'))
  },[items,search,filter])
  const currentPage=Math.min(page,Math.max(0,Math.ceil(visible.length/24)-1))
  const pageItems=visible.slice(currentPage*24,currentPage*24+24)
  function chooseFilter(next:Filter){setFilter(next);setPage(0)}
  function saved(item:InventoryItem) {
    controller.current?.abort();setRefreshing(false)
    setItems(previous=>{
      const existing=previous.find(row=>row.id===item.id)
      return existing?previous.map(row=>row.id===item.id?normalizeInventoryItem({...row,...item}):row):[...previous,normalizeInventoryItem(item)]
    })
    setEditor(null);setPending(pendingInventoryCommand(tenantId))
    if (setupNext?.id===item.id) {setMovement(setupNext);setSetupNext(null);setMessage('Unidad guardada. Indica ahora la cantidad.')}
    else {setMovement(null);setMessage('Guardado. Las existencias ya están actualizadas.')}
  }
  function updatePending(value:InventoryCommand|null) {setPending(value || pendingInventoryCommand(tenantId))}
  function restorePending() {
    if(!pending)return
    if(pending.kind==='create')setEditor('new')
    else setMovement({id:pending.itemId!,type:pending.body.movementType})
  }
  function act(item:InventoryItem,type:ManualMovement) {
    setMoreId(null);setMessage('')
    if(inventoryStatus(item)==='setup') {setSetupNext({id:item.id,type});setEditor(item)}
    else setMovement({id:item.id,type})
  }
  const movementItem=movement?(items.find(item=>item.id===movement.id) || normalizeInventoryItem({id:movement.id,product_name:'Operación pendiente',current_stock:pending?.body.expectedStock || 0})):null
  async function copyShoppingList() {
    try {
      await navigator.clipboard.writeText(['Lista de reposición',...grouped.reorder.map(item=>item.product_name+': quedan '+fmt(item.current_stock)+' '+unitLabel(item.unit)+(reorderQuantity(item)>0?' · reponer '+fmt(reorderQuantity(item))+' '+unitLabel(item.unit):' · elegir cantidad'))].join('\n'))
      setMessage('Lista de reposición copiada.')
    }catch {setMessage('No se pudo copiar. Puedes consultar la lista con el filtro «Reponer».')}
  }
  return <div className="inventory-workspace">
    <div className="inventory-toolbar"><div><p className="inventory-kicker">Tu almacén, al día</p><p className="inventory-help">Recibir suma · Contar corrige · Merma resta</p></div><div className="inventory-toolbar-actions">
      <button className="admin-button-ghost" disabled={refreshing} onClick={()=>void load()}><RefreshCw size={17} className={refreshing?'animate-spin':''}/>{refreshing?'Actualizando…':'Actualizar'}</button>
      <button className="admin-button-primary" disabled={Boolean(pending)} onClick={()=>{setMessage('');setEditor('new')}}><Plus size={18}/>Nuevo artículo</button>
    </div></div>
    {error&&<div className="inventory-error" role="alert">{error} <button className="admin-button-ghost" disabled={refreshing} onClick={()=>void load()}>Reintentar</button>{loaded&&<small>Se conserva la última información cargada.</small>}</div>}
    {message&&<p className="inventory-success" role="status">{message}</p>}
    {pending&&<div className="inventory-notice" role="status"><strong>Hay una operación pendiente de confirmar.</strong><p>Comprueba esta solicitud antes de registrar otro cambio de existencias.</p><button className="admin-button-primary" onClick={restorePending}>Comprobar operación pendiente</button></div>}
    {loaded&&<>
      <div className="inventory-metrics">
        <button aria-pressed={filter==='all'} onClick={()=>chooseFilter('all')}><span>Artículos</span><strong>{items.length}</strong><small>Todo el inventario</small></button>
        <button aria-pressed={filter==='reorder'} className="inventory-reorder-metric" onClick={()=>chooseFilter('reorder')}><span>Para reponer</span><strong>{grouped.reorder.length}</strong><small>Agotados o bajo el mínimo</small></button>
        <button aria-pressed={filter==='setup'} onClick={()=>chooseFilter('setup')}><span>Por preparar</span><strong>{grouped.setup.length}</strong><small>Revisa unidad y cantidad</small></button>
        <div><span>Valor de existencias</span><strong>{money(grouped.value)}</strong><small>Según el coste registrado</small></div>
      </div>
      {grouped.setup.length>0&&<div className="inventory-guidance"><ClipboardCheck size={22}/><div><strong>Empieza contando lo que tienes</strong><p>Hay {grouped.setup.length} artículos sin cantidades ni coste definidos. Usa «Contar» para indicar las existencias y «Datos» para elegir la unidad y el aviso de reposición.</p></div><button className="admin-button-ghost" onClick={()=>chooseFilter('setup')}>Preparar inventario</button></div>}
      <section className="admin-panel inventory-list-panel" aria-label="Artículos del inventario">
        <div className="inventory-list-controls"><div className="inventory-search"><Search size={18}/><input aria-label="Buscar artículo" placeholder="Buscar nombre, código o proveedor" value={search} onChange={event=>{setSearch(event.target.value);setPage(0)}}/><button className="inventory-icon-button" aria-label="Teclado de búsqueda" onClick={()=>setSearchKeyboard(true)}><Keyboard size={19}/></button></div>
          <div className="inventory-filters">{([['all','Todos'],['reorder','Reponer'],['available','Con existencias'],['setup','Por preparar']] as const).map(([value,label])=><button key={value} aria-pressed={filter===value} onClick={()=>chooseFilter(value)}>{label}</button>)}</div>
        </div>
        <div className="inventory-list-caption"><p>{visible.length} artículo{visible.length===1?'':'s'}{search?' encontrados':''}</p>{filter==='reorder'&&grouped.reorder.length>0&&<button className="admin-button-ghost" onClick={()=>void copyShoppingList()}><ArrowDownToLine size={16}/>Copiar lista de compra</button>}</div>
        {!visible.length&&<div className="inventory-empty"><PackagePlus size={32}/><h3>{!items.length?'Tu inventario empieza aquí':'No hay artículos en esta vista'}</h3><p>{!items.length?'Añade una bebida, un ingrediente o un producto y cuenta lo que tienes.':'Prueba otro nombre o cambia el filtro.'}</p></div>}
        {pageItems.map(item=>{
          const status=inventoryStatus(item),suggestion=reorderQuantity(item)
          return <article key={item.id} className="inventory-row" aria-label={item.product_name}>
            <div className="inventory-row-name"><h3>{item.product_name}</h3><p>{item.supplier || item.sku || (item.recipe_count?'Usado en '+item.recipe_count+' receta(s)':'Existencias del almacén')}</p></div>
            <div className="inventory-row-stock"><strong>{fmt(item.current_stock)} <small>{unitLabel(item.unit)}</small></strong><span className={'inventory-badge inventory-badge-'+status}>{statuses[status]}</span></div>
            <div className="inventory-row-target"><span>Mínimo {fmt(item.min_stock)} {unitLabel(item.unit)}</span>{['low','empty'].includes(status)&&suggestion>0?<b>Reponer {fmt(suggestion)} {unitLabel(item.unit)}</b>:<small>{item.cost_per_unit>0?money(item.current_stock*item.cost_per_unit)+' en existencias':status==='setup'?'Pendiente del primer recuento':'Coste sin indicar'}</small>}</div>
            <div className="inventory-row-actions"><button disabled={Boolean(pending)} onClick={()=>act(item,'purchase')}><PackagePlus size={17}/>Recibir</button><button disabled={Boolean(pending)} onClick={()=>act(item,'adjustment')}><ClipboardCheck size={17}/>Contar</button><button aria-label={'Más opciones para '+item.product_name} aria-expanded={moreId===item.id} onClick={()=>setMoreId(previous=>previous===item.id?null:item.id)}><MoreHorizontal size={20}/></button></div>
            {moreId===item.id&&<div className="inventory-row-more"><button onClick={()=>{setHistory(item);setMoreId(null)}}>Historial</button><button disabled={Boolean(pending)} onClick={()=>{setEditor(item);setMoreId(null)}}>Datos del artículo</button><button disabled={Boolean(pending)} onClick={()=>act(item,'damage')}>Registrar merma</button>{tenantSlug&&<a href={'/'+tenantSlug+'/admin/productos'}>Configurar recetas en Productos</a>}</div>}
          </article>
        })}
        {visible.length>24&&<nav className="inventory-pagination" aria-label="Páginas de inventario"><button className="admin-button-ghost" disabled={currentPage===0} onClick={()=>setPage(currentPage-1)}>Anterior</button><span>Página {currentPage+1} de {Math.ceil(visible.length/24)}</span><button className="admin-button-ghost" disabled={(currentPage+1)*24>=visible.length} onClick={()=>setPage(currentPage+1)}>Siguiente</button></nav>}
      </section>
      <p className="inventory-help inventory-bottom-note">Estos cambios controlan existencias. Las ventas se registran en el TPV y las facturas pagadas en Compras. Los descuentos por recetas conservan su configuración actual.</p>
    </>}
    {!loaded&&refreshing&&<div className="inventory-empty" role="status">Cargando inventario…</div>}
    {editor&&<InventoryItemForm key={editor==='new'?'new':editor.id} tenantId={tenantId} item={editor==='new'?undefined:editor} nextActionLabel={setupNext?(setupNext.type==='adjustment'?'Guardar y contar':'Guardar y recibir'):undefined} pending={pending?.kind==='create'?pending:null} onClose={()=>{setEditor(null);setSetupNext(null)}} onPending={updatePending} onSaved={saved}/>}
    {movement&&movementItem&&<InventoryMovementForm key={movement.id+movement.type} tenantId={tenantId} item={movementItem} type={movement.type} pending={pending?.kind==='movement'?pending:null} onClose={()=>setMovement(null)} onSaved={saved} onPending={updatePending} onConflict={load}/>}
    {history&&<InventoryHistory tenantId={tenantId} item={history} onClose={()=>setHistory(null)}/>}
    <TextKeyboard isOpen={searchKeyboard} title="Buscar artículo" value={search} onChange={value=>{setSearch(value);setPage(0)}} onConfirm={()=>setSearchKeyboard(false)} onCancel={()=>setSearchKeyboard(false)} maxLength={160}/>
  </div>
}

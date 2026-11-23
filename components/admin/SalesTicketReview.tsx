'use client'

import './sales-ticket-review.css'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, ChevronLeft, ChevronRight, Keyboard, RefreshCw, Search } from 'lucide-react'
import { addRestaurantLocalDays, formatRestaurantDateTime } from '@/lib/restaurant-time'
import { filterReviewTickets, reviewSummary, salePeople, type SaleReviewTicket } from '@/lib/sales-review'
import { TextKeyboard } from './TextKeyboard'
import { ReprintReceiptButton } from './ReprintReceiptButton'

type Snapshot = { tenantId:string;date:string;today:string;timeZone:string;locale:string;currency:string;updatedAt:string
  period:{periodStart:string;periodEnd:string;businessDateLabel:string;operationalCloseTime:string};tickets:SaleReviewTicket[] }
const labels = {paid:'Cobrada',pending:'Pendiente de cobrar',voided:'Anulada / devuelta'}
const eventLabels:Record<string,string> = {'order.registered':'Ticket registrado','sale.registered_paid':'Venta registrada como cobrada','sale.paid':'Cobro confirmado','sale.edited':'Ticket editado','sale.voided':'Venta anulada','order.cancelled':'Pedido anulado','sale.payment_method_corrected':'Forma de pago corregida'}
export function SalesTicketReview({tenantId,updatedAt}:{tenantId:string;updatedAt:number}) {
  return <SalesTicketReviewBody key={tenantId} tenantId={tenantId} updatedAt={updatedAt}/>
}
function SalesTicketReviewBody({tenantId,updatedAt}:{tenantId:string;updatedAt:number}) {
  const [date,setDate] = useState(''),[version,setVersion] = useState(0),[snapshot,setSnapshot] = useState<Snapshot|null>(null)
  const [loading,setLoading] = useState(true),[error,setError] = useState(''),[offline,setOffline] = useState(false)
  const [search,setSearch] = useState(''),[state,setState] = useState('all'),[person,setPerson] = useState(''),[payment,setPayment] = useState('all')
  const [page,setPage] = useState(0),[expanded,setExpanded] = useState<string|null>(null),[keyboard,setKeyboard] = useState(false)
  const listStart=useRef<HTMLDivElement>(null)
  const lastRequest = useRef(0),busy = useRef(true),reading = useRef(false)
  reading.current = Boolean(expanded || keyboard)
  const refresh = useCallback((force=false) => {
    setOffline(!navigator.onLine)
    const editing = document.activeElement?.matches('input,select,textarea') || document.querySelector('[role="dialog"]')
    if (!navigator.onLine || busy.current || document.visibilityState!=='visible' || (!force && (reading.current || editing || Date.now()-lastRequest.current<30000))) return
    busy.current=true;setVersion(value=>value+1)
  },[])
  useEffect(()=>{
    const update=()=>refresh()
    window.addEventListener('focus',update);window.addEventListener('online',update);window.addEventListener('offline',update)
    document.addEventListener('visibilitychange',update)
    return()=>{window.removeEventListener('focus',update);window.removeEventListener('online',update);window.removeEventListener('offline',update);document.removeEventListener('visibilitychange',update)}
  },[refresh])
  useEffect(()=>{
    const controller=new AbortController();let alive=true,timedOut=false
    const timeout=setTimeout(()=>{timedOut=true;controller.abort()},12000)
    busy.current=true;lastRequest.current=Date.now();setLoading(true);setError('');setOffline(!navigator.onLine)
    const query=new URLSearchParams({tenantId});if(date)query.set('date',date)
    void (async()=>{
      try {
        if(!navigator.onLine)throw Error('Sin conexión. Los tickets se actualizarán cuando puedas conectar.')
        const response=await fetch('/api/sales/tickets?'+query,{credentials:'include',cache:'no-store',signal:controller.signal})
        const data=await response.json()
        if(!response.ok)throw Error(data.error || 'No se pudieron cargar los tickets.')
        if(data.tenantId!==tenantId||!Array.isArray(data.tickets)||!data.date||(date&&data.date!==date))throw Error('La respuesta de ventas no es válida.')
        if(alive)setSnapshot(data)
      }catch(error){if(alive){setError(timedOut?'La consulta está tardando demasiado. Intenta actualizar de nuevo.':(error as Error).message);lastRequest.current=Date.now()+30000}}
      finally{clearTimeout(timeout);if(alive){setLoading(false);busy.current=false}}
    })()
    return()=>{alive=false;clearTimeout(timeout);controller.abort()}
  },[tenantId,date,version,updatedAt])
  const current=snapshot&&snapshot.tenantId===tenantId&&(!date||snapshot.date===date)?snapshot:null
  const tickets=current?.tickets || []
  const people=useMemo(()=>[...new Set(tickets.flatMap(salePeople))].sort((a,b)=>a.localeCompare(b,'es')),[tickets])
  const filtered=useMemo(()=>filterReviewTickets(tickets,{search,state,person,payment}),[tickets,search,state,person,payment])
  const totals=reviewSummary(filtered),daily=reviewSummary(tickets)
  const currentPage=Math.min(page,Math.max(0,Math.ceil(filtered.length/20)-1)),visible=filtered.slice(currentPage*20,currentPage*20+20)
  const money=(value:number)=>value.toLocaleString(current?.locale || 'es-ES',{style:'currency',currency:current?.currency || 'EUR'})
  const time=(value:string)=>formatRestaurantDateTime(value,{locale:current?.locale,timeZone:current?.timeZone,hour:'2-digit',minute:'2-digit'})
  function chooseDay(value:string){setDate(value);setPage(0);setExpanded(null)}
  function choosePage(value:number){setPage(value);setExpanded(null);requestAnimationFrame(()=>listStart.current?.scrollIntoView({block:'start'}))}
  function clearFilters(){setSearch('');setState('all');setPerson('');setPayment('all');setPage(0)}
  return <section className="sale-review" aria-label="Control de tickets">
    <div className="sale-review-top"><div><h2>Cada ticket, a la vista</h2><p>Consulta lo registrado y comprueba qué está cobrado, pendiente o anulado.</p></div>
      <button className="admin-button-ghost" disabled={loading||offline} onClick={()=>refresh(true)}><RefreshCw size={17} className={loading?'animate-spin':''}/>{loading?'Actualizando…':'Actualizar tickets'}</button></div>
    <div className="sale-review-filters admin-panel">
      <div className="sale-review-day"><label htmlFor="ticket-day">Jornada del ticket</label><div><button className="sale-icon" aria-label="Jornada anterior" disabled={!current} onClick={()=>chooseDay(addRestaurantLocalDays(current!.date,-1))}><ChevronLeft size={18}/></button>
        <input id="ticket-day" type="date" value={date||snapshot?.date||''} max={snapshot?.today} onChange={event=>{if(event.target.value)chooseDay(event.target.value)}}/>
        <button className="sale-icon" aria-label="Jornada siguiente" disabled={!current||current.date>=current.today} onClick={()=>chooseDay(addRestaurantLocalDays(current!.date,1))}><ChevronRight size={18}/></button>
        <button className="sale-day-today" onClick={()=>{chooseDay('');if(!date)refresh(true)}}>Hoy</button></div></div>
      <div className="sale-review-search"><label htmlFor="ticket-search">Ticket, producto o mesa</label><div><Search size={17}/><input id="ticket-search" type="search" placeholder="Ej. mesa 3, café o número de ticket" value={search} onChange={event=>{setSearch(event.target.value);setPage(0)}}/><button className="sale-icon" aria-label="Teclado de búsqueda de tickets" onClick={()=>setKeyboard(true)}><Keyboard size={18}/></button></div></div>
      <label className="sale-review-select">Camarero o responsable<select value={person} onChange={event=>{setPerson(event.target.value);setPage(0)}}><option value="">Todos</option><option value="__unknown__">Sin identificar</option>{people.map(name=><option key={name} value={name}>{name}</option>)}{person&&person!=='__unknown__'&&!people.includes(person)&&<option value={person}>{person} (sin tickets aquí)</option>}</select></label>
      <label className="sale-review-select">Forma de pago<select value={payment} onChange={event=>{setPayment(event.target.value);setPage(0)}}><option value="all">Todas</option><option value="cash">Efectivo</option><option value="card">Tarjeta</option><option value="mixed">Mixto</option><option value="other">Otras / sin indicar</option></select></label>
      <div className="sale-review-states">{([['all','Todos'],['paid','Cobrados'],['pending','Pendientes'],['voided','Anulados']] as const).map(([value,label])=><button key={value} aria-pressed={state===value} onClick={()=>{setState(value);setPage(0)}}>{label}</button>)}<button className="sale-clear" onClick={clearFilters}>Limpiar filtros</button></div>
    </div>
    {current&&<p className="sale-review-caption">{current.period.businessDateLabel} · Desde las {current.period.operationalCloseTime} hasta las {current.period.operationalCloseTime} del día siguiente. Hora local del restaurante. <span>Actualizado a las {time(current.updatedAt)}.</span></p>}
    {error&&<div role="alert" className="sale-review-error"><strong>{error}</strong>{current&&<p>Se conservan los últimos tickets cargados. Pueden faltar operaciones recientes.</p>}<button disabled={loading} onClick={()=>refresh(true)}>Reintentar consulta</button></div>}
    {loading&&!current&&<p className="sale-review-empty" role="status">Cargando los tickets de la jornada…</p>}
    {current&&<>
      <div className="sale-review-metrics" aria-label="Resumen de los resultados seleccionados"><div><span>Cobrado</span><strong>{money(totals.paidTotal)}</strong><small>{totals.paid} {totals.paid===1?'ticket cobrado':'tickets cobrados'}</small></div><div><span>Pendiente de cobrar</span><strong>{money(totals.pendingTotal)}</strong><small>{totals.pending} {totals.pending===1?'cuenta pendiente':'cuentas pendientes'}</small></div><div><span>Anulados / devueltos</span><strong>{totals.voided}</strong><small>Excluidos del total cobrado</small></div></div>
      {daily.unidentified>0&&<div className="sale-review-notice"><div><strong>{daily.unidentified} {daily.unidentified===1?'ticket cobrado':'tickets cobrados'} sin responsable identificado</strong><details><summary>Cómo identificar las nuevas ventas</summary><p>Los registros antiguos, pedidos web o accesos compartidos pueden no guardar un nombre. Cada camarero debe utilizar su propio PIN para identificar las nuevas operaciones.</p></details></div><button onClick={()=>{clearFilters();setPerson('__unknown__');setState('paid')}}>Ver sin identificar</button></div>}
      <div ref={listStart} className="sale-review-list-header"><h3>{filtered.length} tickets{search||person||state!=='all'||payment!=='all'?' con estos filtros':''}</h3><span>Más recientes primero</span></div>
      {!visible.length&&<div className="admin-panel sale-review-empty"><h3>No hay tickets en esta vista</h3><p>{tickets.length?'Cambia los filtros o busca otro producto.':'Prueba otra jornada o actualiza cuando se hayan sincronizado las ventas.'}</p></div>}
      <div className="sale-review-list">{visible.map(ticket=><article key={ticket.id} className="admin-panel sale-review-ticket" aria-label={'Ticket '+ticket.number}>
        <button className="sale-ticket-overview" aria-expanded={expanded===ticket.id} aria-label={'Ver detalle del ticket '+ticket.number} onClick={()=>setExpanded(value=>value===ticket.id?null:ticket.id)}>
          <div className="sale-ticket-identity"><strong>Ticket {ticket.number}</strong><span>{time(ticket.createdAt)} · {ticket.table==null?'Sin mesa':'Mesa '+ticket.table}</span></div>
          <div className="sale-ticket-amount"><strong>{money(ticket.total)}</strong><span className={'sale-state sale-state-'+ticket.state}>{labels[ticket.state]}</span></div>
          <div className="sale-ticket-products">{ticket.items.length?ticket.items.slice(0,3).map((item,index)=><span key={index}>{item.quantity} × {item.name}</span>):<span>Sin productos detallados</span>}{ticket.items.length>3&&<span>+{ticket.items.length-3} productos más</span>}</div>
          <div className="sale-ticket-person"><span>{salePeople(ticket).join(' · ') || 'Sin responsable identificado'}</span><span>{ticket.payment}{ticket.edited?' · Editado':''}</span><ChevronDown size={18}/></div>
        </button>
        {expanded===ticket.id&&<div className="sale-ticket-detail">
          <dl className="sale-ticket-actors"><div><dt>Registró en el sistema</dt><dd>{ticket.registeredBy?.name || 'No consta en el registro'}</dd></div><div><dt>Confirmó el cobro</dt><dd>{ticket.paidBy?.name || 'No consta en el registro'}</dd></div>{ticket.waiter&&<div><dt>Camarero indicado en el ticket</dt><dd>{ticket.waiter}</dd></div>}</dl>
          {ticket.registeredViaSync&&<p className="sale-review-help">Ticket enviado por la sincronización del TPV. El responsable del registro corresponde a la sesión utilizada al enviarlo al servidor.</p>}
          <ul aria-label="Productos del ticket" className="sale-ticket-lines">{ticket.items.map((item,index)=><li key={index}><div><strong>{item.quantity} × {item.name}</strong><small>{money(item.unitPrice)} por unidad</small></div><b>{money(item.amount)}</b></li>)}</ul>
          <div className="sale-ticket-total"><span>{ticket.state==='paid'?'Total cobrado':ticket.state==='pending'?'Importe pendiente':'Importe anulado / devuelto'}</span><strong>{money(ticket.total)}</strong></div>
          <p className="sale-review-help">El total es el importe guardado del ticket, con sus impuestos y descuentos. La fecha de la jornada corresponde al registro del ticket.</p>
          {ticket.events.length>0&&<details className="sale-ticket-history"><summary>Ver registro de cambios</summary>{ticket.events.map((event,index)=><p key={index}><strong>{eventLabels[event.action] || 'Cambio registrado'}</strong> · {time(event.at)}{event.by?' · '+event.by:''}{event.reason&&<small>{event.reason}</small>}</p>)}</details>}
          <div className="sale-ticket-actions">{ticket.state!=='pending'&&<ReprintReceiptButton tenantId={tenantId} orderId={ticket.id} orderNumber={ticket.number}/>}</div>
        </div>}
      </article>)}</div>
      {filtered.length>20&&<nav className="sale-review-pagination" aria-label="Páginas de tickets"><button disabled={currentPage===0} onClick={()=>choosePage(currentPage-1)}>Anterior</button><span>{currentPage+1} de {Math.ceil(filtered.length/20)}</span><button disabled={(currentPage+1)*20>=filtered.length} onClick={()=>choosePage(currentPage+1)}>Siguiente</button></nav>}
      <p className="sale-review-help">Esta vista muestra lo guardado en el servidor. Las ventas que sigan pendientes de sincronizar en un TPV aparecerán cuando se sincronicen; esta lista por sí sola no detecta consumiciones que nunca se registraron.</p>
    </>}
    <TextKeyboard isOpen={keyboard} title="Buscar ticket o producto" value={search} onChange={value=>{setSearch(value);setPage(0)}} onConfirm={()=>setKeyboard(false)} onCancel={()=>setKeyboard(false)} maxLength={160}/>
  </section>
}

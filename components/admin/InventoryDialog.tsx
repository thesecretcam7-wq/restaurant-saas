'use client'

import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X, Keyboard } from 'lucide-react'
import { getOverlayTarget } from '@/lib/overlay-target'

export function InventoryDialog({title,description,onClose,busy=false,children}:{title:string;description?:string;onClose:()=>void;busy?:boolean;children:React.ReactNode}) {
  const id=useId(),ref=useRef<HTMLDivElement>(null),close=useRef(onClose),locked=useRef(busy)
  close.current=onClose;locked.current=busy
  useEffect(() => {
    const previous=document.activeElement as HTMLElement|null
    ref.current?.focus()
    function key(event:KeyboardEvent) {
      // Virtual keyboards have their own focus and Escape handling.
      if (document.querySelector('[role="dialog"][aria-label^="Teclado"]')) return
      if (!ref.current?.contains(document.activeElement)) return
      if (event.key==='Escape'&&!locked.current) {event.preventDefault();close.current()}
      if (event.key==='Tab') {
        const elements=[...ref.current.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),summary,[tabindex="0"]')].filter(e=>e.offsetParent!==null)
        const first=elements[0],last=elements.at(-1)
        if (event.shiftKey&&(document.activeElement===first||document.activeElement===ref.current)) {event.preventDefault();last?.focus()}
        else if (!event.shiftKey&&document.activeElement===last) {event.preventDefault();first?.focus()}
      }
    }
    document.addEventListener('keydown',key)
    return () => {document.removeEventListener('keydown',key);previous?.focus()}
  },[])
  if (typeof document==='undefined') return null
  return createPortal(<div className="inventory-overlay"><div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={id} className="admin-panel inventory-dialog">
    <header className="inventory-dialog-header"><div><p className="admin-eyebrow">Inventario</p><h2 id={id}>{title}</h2>{description&&<p>{description}</p>}</div>
      <button type="button" className="inventory-icon-button" disabled={busy} onClick={onClose} aria-label="Cerrar ventana"><X size={20}/></button></header>
    {children}
  </div></div>,getOverlayTarget() || document.body)
}

export function InventoryField({label,value,onChange,numeric=false,onKeyboard,disabled=false,placeholder,required=false}:{
  label:string;value:string;onChange:(v:string)=>void;numeric?:boolean;onKeyboard:()=>void;disabled?:boolean;placeholder?:string;required?:boolean
}) {
  const id=useId()
  return <div className="inventory-field"><label htmlFor={id}>{label}</label><div className="inventory-field-input">
    <input id={id} value={value} onChange={event=>onChange(event.target.value)} inputMode={numeric?'decimal':'text'}
      disabled={disabled} required={required} placeholder={placeholder} className="admin-input" autoComplete="off"/>
    <button type="button" className="inventory-key-button" disabled={disabled} onClick={onKeyboard} aria-label={'Teclado: '+label}><Keyboard size={19}/></button>
  </div></div>
}

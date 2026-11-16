import { UUID_PATTERN } from './inventory-workflow'

export type InventoryCommand = { kind: 'create' | 'movement'; tenantId: string; itemId?: string; body: Record<string,any> }
const key = (tenantId:string) => 'eccofood:inventory-pending:v1:' + tenantId
export function pendingInventoryCommand(tenantId:string):InventoryCommand|null {
  try {
    const value=JSON.parse(localStorage.getItem(key(tenantId)) || 'null')
    if (!value || value.tenantId!==tenantId || value.body?.tenantId!==tenantId || !UUID_PATTERN.test(value.body.requestId || '')) return null
    if (value.kind!=='create' && (value.kind!=='movement' || !UUID_PATTERN.test(value.itemId || ''))) return null
    return value
  } catch { return null }
}
export class InventorySaveError extends Error {
  constructor(message:string,public uncertain:boolean,public status?:number) { super(message) }
}
export async function saveInventoryCommand(command:InventoryCommand) {
  if (typeof navigator!=='undefined' && navigator.locks) {
    return navigator.locks.request('eccofood-inventory:'+command.tenantId,{ifAvailable:true},lock=>{
      if (!lock) throw new InventorySaveError('Hay otro guardado de inventario en curso en este dispositivo. Espera a que termine.',false)
      return sendInventoryCommand(command)
    })
  }
  return sendInventoryCommand(command)
}
async function sendInventoryCommand(command:InventoryCommand) {
  const prior=pendingInventoryCommand(command.tenantId)
  if (prior && prior.body.requestId!==command.body.requestId) {
    throw new InventorySaveError('Hay otra operación pendiente. Vuelve al inventario y compruébala antes de registrar una nueva.',false)
  }
  function clear() {
    if (pendingInventoryCommand(command.tenantId)?.body.requestId===command.body.requestId) localStorage.removeItem(key(command.tenantId))
  }
  // Store before sending so a reload can resolve the same operation, without creating another.
  try { localStorage.setItem(key(command.tenantId),JSON.stringify(command)) }
  catch { throw new InventorySaveError('No se puede guardar la referencia de esta operación en el dispositivo. Activa el almacenamiento del navegador e inténtalo de nuevo.',false) }
  try {
    const response=await fetch(command.kind==='create'?'/api/inventory':
      '/api/inventory/'+command.itemId+'/stock-movement',{
      method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},
      body:JSON.stringify(command.body),signal:AbortSignal.timeout(12000),cache:'no-store',
    })
    const data=await response.json()
    if (!response.ok) {
      const uncertain=response.status>=500 || response.status===401 || response.status===403
      if (!uncertain) clear()
      const message=response.status===401 || response.status===403
        ? 'Vuelve a entrar con tu clave y comprueba esta misma operación. Su referencia se conserva para evitar duplicados.'
        : data.error || 'No se pudo guardar.'
      throw new InventorySaveError(message,uncertain,response.status)
    }
    if (!(command.kind==='create'?data.id:data.updated?.id)) throw Error('Missing confirmation')
    clear()
    return data
  } catch(error) {
    if (error instanceof InventorySaveError) throw error
    throw new InventorySaveError('No se recibió confirmación. Pulsa «Comprobar operación» para consultar y guardar la misma solicitud sin duplicarla.',true)
  }
}

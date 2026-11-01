import { addRestaurantLocalDays, getRestaurantLocalDateKey, getRestaurantLocalDateStartUtc } from '@/lib/restaurant-time'

/** Yesterday is the restaurant's local calendar day, independent of the PC. */
export function getPreviousPOSSaleDate(timeZone: string, now = new Date()) {
  const today = getRestaurantLocalDateKey(now, timeZone)
  const dateKey = addRestaurantLocalDays(today, -1)
  const end = getRestaurantLocalDateStartUtc(today, timeZone)
  if (!dateKey || !end) throw new Error('No se pudo calcular la fecha del día anterior')
  const [year, month, day] = dateKey.split('-')
  return { dateKey, label: `${day}/${month}/${year}`, createdAt: new Date(end.getTime() - 1).toISOString() }
}

export class POSBusinessDateError extends Error {
  constructor(message: string, public status: number) { super(message) }
}

export function validatePreviousPOSSaleDate(source: unknown, requestedDate: unknown, timeZone: string, now = new Date()) {
  if (source !== 'pos') throw new POSBusinessDateError('Solo el TPV puede registrar ventas del día anterior.', 403)
  const previous = getPreviousPOSSaleDate(timeZone, now)
  if (requestedDate !== previous.dateKey) {
    throw new POSBusinessDateError('La fecha cambió o no es el día anterior del restaurante. Revisa la fecha del cobro y vuelve a intentarlo.', 409)
  }
  return previous
}

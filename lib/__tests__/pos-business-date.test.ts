import { describe, expect, it } from 'vitest'
import { getPreviousPOSSaleDate, POSBusinessDateError, validatePreviousPOSSaleDate } from '../pos-business-date'
import { getRestaurantLocalDateKey } from '../restaurant-time'

describe('previous-day POS sale date', () => {
  it.each([
    ['America/Bogota', '2026-11-01T16:00:00Z', '2026-10-31', '2026-11-01T04:59:59.999Z'],
    ['America/Bogota', '2026-11-01T06:00:00Z', '2026-10-31', '2026-11-01T04:59:59.999Z'],
    ['Europe/Madrid', '2026-11-01T02:00:00Z', '2026-10-31', '2026-10-31T22:59:59.999Z'],
    ['Europe/Madrid', '2026-03-30T12:00:00Z', '2026-03-29', '2026-03-29T21:59:59.999Z'],
    ['Europe/Madrid', '2026-10-26T12:00:00Z', '2026-10-25', '2026-10-25T22:59:59.999Z'],
    ['America/New_York', '2026-11-02T12:00:00Z', '2026-11-01', '2026-11-02T04:59:59.999Z'],
    ['America/Bogota', '2027-01-01T12:00:00Z', '2026-12-31', '2027-01-01T04:59:59.999Z'],
    ['America/Bogota', '2024-03-01T12:00:00Z', '2024-02-29', '2024-03-01T04:59:59.999Z'],
  ])('uses restaurant-local yesterday (%s, %s)', (zone, now, dateKey, createdAt) => {
    const result = getPreviousPOSSaleDate(zone, new Date(now))
    expect(result).toMatchObject({ dateKey, createdAt })
    expect(getRestaurantLocalDateKey(result.createdAt, zone)).toBe(dateKey)
    expect(Date.parse(result.createdAt)).toBeLessThan(Date.parse(now))
  })
  it('accepts only yesterday, not an arbitrary date or a date that became stale at midnight', () => {
    expect(validatePreviousPOSSaleDate('pos', '2026-10-31', 'America/Bogota', new Date('2026-11-01T16:00:00Z')).dateKey).toBe('2026-10-31')
    for (const date of ['2026-10-30', '2026-11-01', undefined, 'bad']) {
      expect(() => validatePreviousPOSSaleDate('pos', date, 'America/Bogota', new Date('2026-11-01T16:00:00Z'))).toThrow(POSBusinessDateError)
    }
    expect(() => validatePreviousPOSSaleDate('pos', '2026-10-31', 'America/Bogota', new Date('2026-11-02T05:00:00Z'))).toThrow('fecha cambió')
  })
  it.each(['pos-offline', 'table-qr', 'comandero', undefined])('rejects backdating outside a live POS sale (%s)', source => {
    try { validatePreviousPOSSaleDate(source, '2026-10-31', 'America/Bogota', new Date('2026-11-01T16:00:00Z')); throw new Error('Expected denial') }
    catch (error) { expect(error).toBeInstanceOf(POSBusinessDateError); expect((error as POSBusinessDateError).status).toBe(403) }
  })
})

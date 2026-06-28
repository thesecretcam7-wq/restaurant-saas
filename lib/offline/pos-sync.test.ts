import { describe, expect, it } from 'vitest'
import { isNetworkPaymentError } from './pos-sync'

describe('isNetworkPaymentError', () => {
  function setNavigatorOnline(value: boolean) {
    Object.defineProperty(globalThis.navigator, 'onLine', {
      configurable: true,
      value,
    })
  }

  it('detects fetch/network failures as offline-safe payment errors', () => {
    setNavigatorOnline(true)
    expect(isNetworkPaymentError(new Error('Failed to fetch'))).toBe(true)
    expect(isNetworkPaymentError(new Error('Network request failed'))).toBe(true)
    expect(isNetworkPaymentError(new Error('Load failed'))).toBe(true)
  })

  it('does not treat validation errors as network failures', () => {
    setNavigatorOnline(true)
    expect(isNetworkPaymentError(new Error('Selecciona el valor del domicilio'))).toBe(false)
    expect(isNetworkPaymentError('plain error')).toBe(false)
  })
})

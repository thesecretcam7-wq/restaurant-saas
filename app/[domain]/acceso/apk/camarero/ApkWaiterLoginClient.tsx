'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Delete, ShieldCheck, UtensilsCrossed } from 'lucide-react'

interface StaffMember {
  id: string
  name: string
  role: string
}

interface Branding {
  appName: string
  primaryColor: string
  secondaryColor: string
  accentColor: string
  backgroundColor: string
  textPrimaryColor: string
  textSecondaryColor: string
}

interface Props {
  tenantId: string
  tenantName: string
  tenantSlug: string
  logoUrl: string | null
  staffMembers: StaffMember[]
  initialStaffId: string
  initialStaffName: string
  initialPin: string
  autoSubmit: boolean
  branding: Branding
}

async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit = {}, timeoutMs = 9000) {
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(input, { ...init, signal: controller.signal })
  } finally {
    window.clearTimeout(timeout)
  }
}

export function ApkWaiterLoginClient({
  tenantId,
  tenantName,
  tenantSlug,
  logoUrl,
  staffMembers,
  initialStaffId,
  initialStaffName,
  initialPin,
  autoSubmit,
  branding,
}: Props) {
  const router = useRouter()
  const [staffId, setStaffId] = useState(initialStaffId)
  const [staffName, setStaffName] = useState(initialStaffName)
  const [pin, setPin] = useState(initialPin)
  const [phase, setPhase] = useState<'select' | 'pin'>(initialStaffId ? 'pin' : 'select')
  const [loading, setLoading] = useState(false)
  const [loadingMessage, setLoadingMessage] = useState('Verificando acceso')
  const [error, setError] = useState('')
  const pinInputRef = useRef<HTMLInputElement | null>(null)
  const autoValidationRef = useRef('')
  const appName = branding.appName || tenantName
  const apkPath = `/${tenantSlug}/acceso/apk/camarero`

  function pinHref(nextPin: string, submit = false) {
    const params = new URLSearchParams()
    if (staffId) params.set('staffId', staffId)
    if (nextPin) params.set('pin', nextPin.replace(/\D/g, '').slice(0, 6))
    if (submit) params.set('submit', '1')
    const query = params.toString()
    return query ? `${apkPath}?${query}` : apkPath
  }

  function selectStaff(staff: StaffMember) {
    if (loading) return
    setStaffId(staff.id)
    setStaffName(staff.name)
    setPin('')
    setError('')
    setPhase('pin')
  }

  useEffect(() => {
    if (!initialStaffId) return
    setStaffId(initialStaffId)
    setStaffName(initialStaffName)
    setPin(initialPin)
    setError('')
    setPhase('pin')
  }, [initialStaffId, initialStaffName, initialPin])

  useEffect(() => {
    if (!initialStaffId || phase !== 'pin' || loading) return
    const shouldValidate = initialPin.length === 6 || autoSubmit
    if (!shouldValidate) return
    const validationKey = `${initialStaffId}:${initialPin}:${autoSubmit ? 'submit' : 'auto'}`
    if (autoValidationRef.current === validationKey) return
    autoValidationRef.current = validationKey
    if (initialPin.length < 4) {
      resetPinWithError('El PIN debe tener minimo 4 digitos.')
      return
    }
    validatePin(initialPin)
  }, [initialStaffId, initialPin, autoSubmit, phase, loading])

  useEffect(() => {
    if (phase === 'pin' && !loading) {
      const focusTimer = window.setTimeout(() => pinInputRef.current?.focus(), 80)
      return () => window.clearTimeout(focusTimer)
    }
  }, [phase, loading])

  function resetPinWithError(message: string) {
    setError(message)
    setPin('')
    window.setTimeout(() => pinInputRef.current?.focus(), 80)
  }

  async function validatePin(value: string) {
    if (value.length < 4 || loading) return
    setLoading(true)
    setLoadingMessage('Verificando acceso')
    setError('')
    let keepLoader = false

    try {
      const res = await fetchWithTimeout('/api/staff/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: tenantSlug, pin: value, role: 'camarero' }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        resetPinWithError(data?.requiresUpgrade ? 'Esta funcion requiere plan Pro o Premium.' : 'PIN incorrecto. Intenta de nuevo.')
        return
      }

      const data = await res.json()
      const authenticatedStaffId = data.staff_id || staffId
      const authenticatedStaffName = data.staff_name || staffName

      setLoadingMessage('Registrando sesion')
      fetch('/api/staff/session/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId, employee_name: authenticatedStaffName, role: 'camarero' }),
      }).catch(() => {})

      sessionStorage.setItem('staff_role', 'camarero')
      sessionStorage.setItem('staff_tenant', tenantId)
      sessionStorage.setItem('staff_name', authenticatedStaffName)
      sessionStorage.setItem('staff_id', authenticatedStaffId)

      const sessionRes = await fetchWithTimeout('/api/staff/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          role: 'camarero',
          staffId: authenticatedStaffId,
          staffName: authenticatedStaffName,
        }),
      })

      if (!sessionRes.ok) {
        const sessionError = await sessionRes.json().catch(() => null)
        throw new Error(sessionError?.error || 'No se pudo registrar la sesion.')
      }

      keepLoader = true
      setLoadingMessage('Abriendo comandero')
      router.replace(`/${tenantSlug}/kitchen`)
    } catch (err) {
      const wasAborted = err instanceof Error && err.name === 'AbortError'
      resetPinWithError(wasAborted ? 'La verificacion tardo mucho. Intenta de nuevo.' : err instanceof Error ? err.message : 'Error de conexion. Intenta de nuevo.')
    } finally {
      if (!keepLoader) {
        setLoading(false)
        setLoadingMessage('Verificando acceso')
      }
    }
  }

  function pressKey(key: string) {
    if (loading) return
    setError('')
    if (key === 'del') {
      setPin((current) => current.slice(0, -1))
      return
    }
    if (pin.length >= 6) return
    const next = pin + key
    setPin(next)
    if (next.length === 6) validatePin(next)
  }

  function handlePinInput(value: string) {
    if (loading) return
    const next = value.replace(/\D/g, '').slice(0, 6)
    setError('')
    setPin(next)
    if (next.length === 6) validatePin(next)
  }

  function submitPin() {
    if (pin.length < 4 || loading) {
      resetPinWithError('El PIN debe tener minimo 4 digitos.')
      return
    }
    validatePin(pin)
  }

  function goBack() {
    if (loading) return
    if (phase === 'pin') {
      setPhase('select')
      setPin('')
      setStaffId('')
      setStaffName('')
      setError('')
      router.replace(apkPath)
      return
    }
    router.replace(`/${tenantSlug}/acceso`)
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#0B0E14] text-white">
      {loading && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#0B0E14]/90 px-5 backdrop-blur-xl">
          <div className="w-full max-w-sm rounded-[2rem] border border-[#D4AF37]/20 bg-[#1A1F2C] p-7 text-center shadow-2xl">
            {logoUrl ? (
              <img src={logoUrl} alt={appName} className="mx-auto mb-5 h-24 w-32 object-contain" />
            ) : (
              <div className="mx-auto mb-5 grid h-20 w-20 place-items-center rounded-3xl bg-[#0B0E14] text-3xl font-black text-[#D4AF37]">E</div>
            )}
            <p className="text-xs font-black uppercase tracking-[0.24em] text-[#D4AF37]">Comandero APK</p>
            <h2 className="mt-2 text-2xl font-black">{loadingMessage}</h2>
          </div>
        </div>
      )}

      <a
        href={phase === 'pin' ? apkPath : `/${tenantSlug}/acceso`}
        onClick={(event) => {
          event.preventDefault()
          goBack()
        }}
        className="fixed left-3 top-3 z-20 grid h-11 w-11 place-items-center rounded-2xl border border-[#D4AF37]/28 bg-[#1A1F2C] text-[#D4AF37]"
        aria-label="Volver"
      >
        <ArrowLeft className="h-5 w-5" />
      </a>

      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4 py-16">
        <div className="mb-6 flex items-center gap-4">
          <div className="grid h-14 w-14 place-items-center rounded-2xl border border-[#D4AF37]/35 bg-[#D35A37]/20 text-[#D4AF37]">
            <UtensilsCrossed className="h-7 w-7" />
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#D4AF37]">APK camarero</p>
            <h1 className="text-2xl font-black">{phase === 'select' ? appName : staffName}</h1>
          </div>
        </div>

        <section className="rounded-[1.5rem] border border-[#D4AF37]/20 bg-[#1A1F2C]/90 p-5 shadow-2xl">
          {phase === 'select' ? (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.14em] text-[#8b97a8]">Empleado</p>
                <h2 className="mt-1 text-xl font-black">Toca tu nombre</h2>
              </div>

              {staffMembers.length > 0 ? (
                <div className="grid gap-3">
                  {staffMembers.map((staff) => (
                    <a
                      key={staff.id}
                      href={`/${tenantSlug}/acceso/apk/camarero?staffId=${encodeURIComponent(staff.id)}`}
                      onClick={() => selectStaff(staff)}
                      className="flex min-h-16 w-full items-center rounded-2xl border border-[#D4AF37]/20 bg-[#0B0E14] px-4 text-left text-lg font-black text-white active:scale-[0.98]"
                    >
                      {staff.name}
                    </a>
                  ))}
                </div>
              ) : (
                <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-center text-sm font-bold text-red-700">
                  No hay camareros activos.
                </p>
              )}
            </div>
          ) : (
            <div>
              <div className="mb-5 flex justify-center gap-2">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div
                    key={index}
                    className={`grid h-9 w-9 place-items-center rounded-full border-2 ${index < pin.length ? 'border-[#D35A37] bg-[#D35A37]' : 'border-[#D4AF37]/20 bg-white/5'}`}
                  >
                    {index < pin.length && <div className="h-2.5 w-2.5 rounded-full bg-white" />}
                  </div>
                ))}
              </div>

              <input
                ref={pinInputRef}
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="one-time-code"
                value={pin}
                onChange={(event) => handlePinInput(event.target.value)}
                disabled={loading}
                className="mb-4 w-full rounded-2xl border border-[#D4AF37]/20 bg-[#0B0E14] px-4 py-3 text-center text-2xl font-black tracking-[0.55em] text-white outline-none focus:border-[#D4AF37]"
                placeholder="PIN"
              />

              {error && (
                <p className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-center text-sm font-bold text-red-700">
                  {error}
                </p>
              )}

              <div className="grid grid-cols-3 gap-3">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'].map((key) => {
                  if (!key) return <div key="empty" />
                  const nextPin = key === 'del' ? pin.slice(0, -1) : `${pin}${key}`.slice(0, 6)
                  return (
                    <a
                      key={key}
                      href={pinHref(nextPin)}
                      onClick={(event) => {
                        event.preventDefault()
                        pressKey(key)
                        router.replace(pinHref(nextPin))
                      }}
                      className="grid h-14 place-items-center rounded-2xl border border-[#D4AF37]/20 bg-[#0B0E14] text-xl font-black active:scale-95"
                    >
                      {key === 'del' ? <Delete className="h-5 w-5 text-[#D4AF37]" /> : key}
                    </a>
                  )
                })}
              </div>

              <a
                href={pinHref(pin, true)}
                onClick={(event) => {
                  event.preventDefault()
                  submitPin()
                  router.replace(pinHref(pin, true))
                }}
                className={`mt-4 grid h-14 w-full place-items-center rounded-2xl text-base font-black text-white ${loading || pin.length < 4 ? 'bg-slate-700 text-slate-400' : 'bg-[#D35A37]'}`}
              >
                Entrar
              </a>
            </div>
          )}
        </section>

        <div className="mt-4 flex items-center justify-center gap-2 text-xs font-bold text-[#8b97a8]">
          <ShieldCheck className="h-4 w-4 text-[#D4AF37]" />
          Ruta aislada para APK. No cambia el acceso real.
        </div>
      </div>
    </main>
  )
}

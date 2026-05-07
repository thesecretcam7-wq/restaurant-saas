'use client'

import { useEffect, useState } from 'react'
import { RefreshCw, CheckCircle2, AlertTriangle } from 'lucide-react'

type AgentState = {
  ok: boolean
  loading: boolean
  message: string
  defaultPrinter?: string | null
}

export function LocalPrintAgentStatus() {
  const [state, setState] = useState<AgentState>({
    ok: false,
    loading: true,
    message: 'Comprobando agente local...',
  })

  async function checkAgent() {
    setState((current) => ({ ...current, loading: true }))
    try {
      const controller = new AbortController()
      const timeout = window.setTimeout(() => controller.abort(), 2500)
      const response = await fetch('http://127.0.0.1:17777/health', {
        signal: controller.signal,
        cache: 'no-store',
      })
      window.clearTimeout(timeout)
      const data = await response.json().catch(() => ({}))
      if (!response.ok || data?.ok === false) throw new Error(data?.error || 'Sin respuesta valida')
      setState({
        ok: true,
        loading: false,
        message: 'Agente local activo en este computador',
        defaultPrinter: data?.defaultPrinter || null,
      })
    } catch {
      setState({
        ok: false,
        loading: false,
        message: 'No detecto el agente local en este computador',
      })
    }
  }

  useEffect(() => {
    checkAgent()
  }, [])

  return (
    <div className={`admin-card p-5 ${state.ok ? 'border-emerald-200 bg-emerald-50/70' : 'border-amber-200 bg-amber-50/70'}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase text-black/45">Impresion directa</p>
          <div className="mt-2 flex items-center gap-2">
            {state.ok ? <CheckCircle2 className="size-5 text-emerald-600" /> : <AlertTriangle className="size-5 text-amber-600" />}
            <h3 className="text-lg font-black text-[#15130f]">{state.message}</h3>
          </div>
          <p className="mt-2 text-sm font-semibold text-black/55">
            {state.ok
              ? `Impresora predeterminada: ${state.defaultPrinter || 'no configurada en Windows'}`
              : 'Instala Eccofood Print Agent en el PC de caja para imprimir sin vista previa y abrir el cajon.'}
          </p>
        </div>
        <button
          type="button"
          onClick={checkAgent}
          disabled={state.loading}
          className="rounded-lg border border-black/10 bg-white px-3 py-2 text-sm font-black text-[#15130f] shadow-sm transition hover:bg-black hover:text-white disabled:opacity-60"
        >
          <RefreshCw className={`size-4 ${state.loading ? 'animate-spin' : ''}`} />
        </button>
      </div>
    </div>
  )
}

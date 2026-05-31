'use client'

import { useEffect, useState } from 'react'
import { RefreshCw, CheckCircle2, AlertTriangle } from 'lucide-react'

type AgentState = {
  ok: boolean
  loading: boolean
  message: string
  defaultPrinter?: string | null
  version?: string | null
  url?: string | null
}

const AGENT_URLS = ['http://127.0.0.1:17777', 'http://localhost:17777']
const AGENT_PING_TIMEOUT_MS = 750
const AGENT_HEALTH_TIMEOUT_MS = 1200

async function fetchAgentJson(url: string, path: string, timeoutMs: number) {
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(`${url}${path}`, {
      signal: controller.signal,
      cache: 'no-store',
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok || data?.ok === false) throw new Error(data?.error || 'Sin respuesta valida')
    return data
  } finally {
    window.clearTimeout(timeout)
  }
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
      const agent = await Promise.any(
        AGENT_URLS.map(async (url) => {
          const data = await fetchAgentJson(url, '/ping', AGENT_PING_TIMEOUT_MS)

          let defaultPrinter = null
          try {
            const health = await fetchAgentJson(url, '/health', AGENT_HEALTH_TIMEOUT_MS)
            defaultPrinter = health?.defaultPrinter || null
          } catch {
            defaultPrinter = null
          }

          return { url, data, defaultPrinter }
        })
      )

      setState({
        ok: true,
        loading: false,
        message: 'Agente local activo en este computador',
        defaultPrinter: agent.defaultPrinter,
        version: agent.data?.version || null,
        url: agent.url,
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
              ? `Impresora predeterminada: ${state.defaultPrinter || 'no configurada en Windows'}${state.version ? ` - agente v${state.version}` : ''}${state.url ? ` - ${state.url}` : ''}`
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

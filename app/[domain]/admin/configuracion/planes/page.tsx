'use client'

import { use, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { SubscriptionPlan } from '@/lib/types'

interface Props { params: Promise<{ domain: string }> }

export default function PlanesPage({ params }: Props) {
  const { domain } = use(params)
  const router = useRouter()
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [currentPlan, setCurrentPlan] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [tenantId, setTenantId] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const statusRes = await fetch(`/api/subscription-status?domain=${domain}`)
        const statusData = await statusRes.json()
        setTenantId(statusData.tenantId)
        setCurrentPlan(statusData.plan)

        const plansRes = await fetch(`/api/subscription-plans`)
        const plansData = await plansRes.json()
        setPlans(plansData)
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }
    if (domain) fetchData()
  }, [domain])

  const handleSelectPlan = async (planName: string) => {
    if (!tenantId) return
    setProcessing(true)
    try {
      const res = await fetch('/api/stripe/subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId, planName }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error')
      if (data.url) window.location.href = data.url
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Error al procesar')
    } finally {
      setProcessing(false)
    }
  }

  if (loading) return <div className="flex items-center justify-center h-48"><div className="w-7 h-7 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" /></div>

  return (
    <div>
      {currentPlan && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 text-sm text-green-800">
          Plan actual: <strong className="capitalize">{currentPlan}</strong>
        </div>
      )}

      <div className="grid sm:grid-cols-3 gap-4">
        {plans.map(plan => (
          <div key={plan.id} className={`bg-white rounded-xl border p-5 ${currentPlan === plan.name ? 'ring-2 ring-blue-600' : ''}`}>
            <h3 className="text-lg font-bold capitalize text-gray-900 mb-1">{plan.name}</h3>
            <p className="text-2xl font-bold text-gray-900 mb-4">${plan.monthly_price}<span className="text-sm font-normal text-gray-500">/mes</span></p>
            <ul className="space-y-2 mb-6">
              {plan.features && Object.entries(plan.features).map(([key, value]) => (
                <li key={key} className="flex gap-2 text-sm text-gray-600">
                  <span className="text-green-500 font-bold">✓</span>
                  <span>{typeof value === 'number' ? `${value} ${key.replace(/_/g, ' ')}` : String(value)}</span>
                </li>
              ))}
            </ul>
            <button
              onClick={() => handleSelectPlan(plan.name)}
              disabled={processing || currentPlan === plan.name}
              className={`w-full py-2.5 rounded-lg text-sm font-medium transition-colors ${
                currentPlan === plan.name
                  ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {processing ? 'Procesando...' : currentPlan === plan.name ? 'Plan actual' : 'Seleccionar'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

import { createServiceClient } from '@/lib/supabase/server'
import Link from 'next/link'

interface Props { params: Promise<{ domain: string }> }

export default async function StripeConnectPage({ params }: Props) {
  const { domain: tenantId } = await params
  const supabase = await createServiceClient()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('stripe_account_id, stripe_account_status, stripe_customer_id')
    .eq('id', tenantId)
    .single()

  const isConnected = tenant?.stripe_account_status === 'verified'
  const isPending = tenant?.stripe_account_status === 'pending'

  return (
    <div className="max-w-2xl space-y-6">
      {/* Estado actual */}
      <div className={`rounded-xl border p-5 ${isConnected ? 'bg-green-50 border-green-200' : isPending ? 'bg-yellow-50 border-yellow-200' : 'bg-white'}`}>
        <div className="flex items-center gap-3">
          <span className="text-2xl">{isConnected ? '✅' : isPending ? '⏳' : '🔗'}</span>
          <div>
            <p className="font-semibold text-gray-900">
              {isConnected ? 'Stripe conectado' : isPending ? 'Conexión pendiente de verificación' : 'Stripe no conectado'}
            </p>
            <p className="text-sm text-gray-600 mt-0.5">
              {isConnected
                ? `Cuenta: ${tenant?.stripe_account_id} — Puedes recibir pagos.`
                : isPending
                ? 'Completa la verificación en tu dashboard de Stripe.'
                : 'Conecta tu cuenta para recibir pagos de tus clientes directamente.'}
            </p>
          </div>
        </div>
      </div>

      {/* Cómo funciona */}
      <div className="bg-white rounded-xl border p-5">
        <h2 className="font-semibold text-gray-900 mb-4">¿Cómo funciona Stripe Connect?</h2>
        <div className="space-y-3">
          {[
            { n: '1', t: 'Conectas tu cuenta Stripe', d: 'Crea o vincula tu cuenta Stripe existente en minutos.' },
            { n: '2', t: 'Clientes pagan en tu tienda', d: 'Los pagos se procesan de forma segura con Stripe.' },
            { n: '3', t: 'Recibes el dinero directo', d: 'Los fondos van directamente a tu cuenta bancaria.' },
          ].map(s => (
            <div key={s.n} className="flex gap-3">
              <div className="w-7 h-7 rounded-full bg-blue-600 text-white text-sm font-bold flex items-center justify-center flex-shrink-0">{s.n}</div>
              <div>
                <p className="text-sm font-medium text-gray-800">{s.t}</p>
                <p className="text-xs text-gray-500">{s.d}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Botón conectar */}
      {!isConnected && (
        <div className="bg-white rounded-xl border p-5">
          <h2 className="font-semibold text-gray-900 mb-2">
            {isPending ? 'Completar verificación' : 'Conectar Stripe'}
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            {isPending
              ? 'Accede a tu dashboard de Stripe para completar los datos requeridos.'
              : 'Serás redirigido a Stripe para conectar o crear tu cuenta. El proceso toma menos de 5 minutos.'}
          </p>
          <a
            href={`/api/stripe/connect?tenantId=${tenantId}`}
            className="inline-block px-6 py-3 bg-[#635BFF] hover:bg-[#4f46e5] text-white rounded-lg font-medium text-sm transition-colors"
          >
            {isPending ? 'Ir a Stripe Dashboard →' : 'Conectar con Stripe →'}
          </a>
        </div>
      )}

      {isConnected && (
        <div className="bg-white rounded-xl border p-5">
          <h2 className="font-semibold text-gray-900 mb-2">Gestionar cuenta</h2>
          <p className="text-sm text-gray-600 mb-4">Administra tus pagos, transferencias y configuración desde el dashboard de Stripe.</p>
          <a
            href="https://dashboard.stripe.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block px-6 py-3 bg-[#635BFF] hover:bg-[#4f46e5] text-white rounded-lg font-medium text-sm transition-colors"
          >
            Abrir Stripe Dashboard →
          </a>
        </div>
      )}
    </div>
  )
}

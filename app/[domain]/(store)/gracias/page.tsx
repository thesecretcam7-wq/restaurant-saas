import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

interface Props {
  params: Promise<{ domain: string }>
  searchParams: Promise<{ order?: string }>
}

export default async function GraciasPage({ params, searchParams }: Props) {
  const { domain: tenantId } = await params
  const { order: orderId } = await searchParams

  let order = null
  if (orderId) {
    const supabase = await createClient()
    const { data } = await supabase
      .from('orders')
      .select('order_number, total, payment_method, status')
      .eq('id', orderId)
      .single()
    order = data
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border p-8 max-w-md w-full text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">✅</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">¡Pedido recibido!</h1>
        <p className="text-gray-500 mb-6">Tu pedido ha sido confirmado y está en proceso.</p>

        {order && (
          <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Número de pedido</span>
              <span className="font-semibold">{order.order_number}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Total</span>
              <span className="font-semibold">${Number(order.total).toLocaleString('es-CO')}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Pago</span>
              <span className="font-semibold">{order.payment_method === 'cash' ? 'Efectivo' : 'Tarjeta'}</span>
            </div>
          </div>
        )}

        <div className="space-y-3">
          <Link href={`/${tenantId}/mis-pedidos`} className="block w-full py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700">
            Ver mis pedidos
          </Link>
          <Link href={`/${tenantId}/menu`} className="block w-full py-3 border rounded-xl font-medium hover:bg-gray-50">
            Volver al menú
          </Link>
        </div>
      </div>
    </div>
  )
}

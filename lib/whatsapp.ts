// WhatsApp notifications via Twilio WhatsApp Business API
// Requires: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM

function getTwilioClient() {
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN } = process.env
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) return null
  // Dynamic import to avoid issues when env vars are missing
  const twilio = require('twilio')
  return twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
}

function formatPhone(phone: string): string {
  // Strip spaces/dashes, ensure + prefix
  const cleaned = phone.replace(/[\s\-\(\)]/g, '')
  return cleaned.startsWith('+') ? cleaned : `+57${cleaned}` // Default to Colombia (+57)
}

const STATUS_MESSAGES: Record<string, string> = {
  preparing: '👨‍🍳 Tu pedido está siendo preparado. ¡Pronto estará listo!',
  ready: '🎉 ¡Tu pedido está listo! Puedes pasar a recogerlo.',
  delivered: '✅ ¡Tu pedido ha sido entregado! Gracias por tu compra.',
  cancelled: '❌ Tu pedido ha sido cancelado. Si tienes dudas, contáctanos.',
}

export async function sendWhatsAppOrderStatus(
  phone: string,
  data: {
    restaurantName: string
    orderNumber: string
    customerName: string
    status: string
  }
) {
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) return
  const msg = STATUS_MESSAGES[data.status]
  if (!msg) return

  const client = getTwilioClient()
  if (!client) return

  const from = `whatsapp:${process.env.TWILIO_WHATSAPP_FROM || '+14155238886'}`
  const to = `whatsapp:${formatPhone(phone)}`

  const body = `*${data.restaurantName}*\n\nHola ${data.customerName} 👋\n\n${msg}\n\nPedido: *${data.orderNumber}*`

  await client.messages.create({ from, to, body })
}

export async function sendWhatsAppOrderConfirmation(
  phone: string,
  data: {
    restaurantName: string
    orderNumber: string
    customerName: string
    total: number
    items: { name: string; qty: number }[]
  }
) {
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) return
  const client = getTwilioClient()
  if (!client) return

  const itemsList = data.items.map(i => `  • ${i.qty}× ${i.name}`).join('\n')
  const total = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(data.total)
  const from = `whatsapp:${process.env.TWILIO_WHATSAPP_FROM || '+14155238886'}`
  const to = `whatsapp:${formatPhone(phone)}`

  const body = `*${data.restaurantName}* ✅\n\n¡Hola ${data.customerName}! Tu pedido fue recibido.\n\n*Pedido #${data.orderNumber}*\n${itemsList}\n\n*Total: ${total}*\n\nTe avisaremos cuando esté listo. 🍽️`

  await client.messages.create({ from, to, body })
}

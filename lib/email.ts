import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = process.env.EMAIL_FROM || 'Eccofood <noreply@eccofood.app>'

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(amount)
}

function formatDate(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
}

function baseTemplate(content: string, restaurantName: string, primaryColor = '#3B82F6') {
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${restaurantName}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;">
  <tr><td align="center">
    <table width="100%" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
      <tr><td style="background:${primaryColor};padding:28px 32px;text-align:center;">
        <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">${restaurantName}</h1>
      </td></tr>
      <tr><td style="padding:32px;">${content}</td></tr>
      <tr><td style="background:#f8f8f9;padding:16px 32px;text-align:center;border-top:1px solid #e5e7eb;">
        <p style="margin:0;color:#9ca3af;font-size:12px;">Este correo fue enviado automáticamente. Por favor no respondas a este mensaje.</p>
        <p style="margin:4px 0 0;color:#9ca3af;font-size:12px;">Impulsado por <strong style="color:#6b7280;">Eccofood</strong></p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`
}

// ─── ORDER CONFIRMATION ──────────────────────────────────────────────────────

interface OrderEmailData {
  restaurantName: string
  primaryColor?: string
  orderNumber: string
  customerName: string
  items: { name: string; qty: number; price: number }[]
  subtotal: number
  tax: number
  deliveryFee: number
  total: number
  deliveryType: string
  deliveryAddress?: string
  paymentMethod: string
  notes?: string
}

export async function sendOrderConfirmation(to: string, data: OrderEmailData) {
  if (!process.env.RESEND_API_KEY) return

  const itemsRows = data.items.map(i =>
    `<tr>
      <td style="padding:8px 0;color:#374151;font-size:14px;">${i.qty}× ${i.name}</td>
      <td style="padding:8px 0;color:#374151;font-size:14px;text-align:right;">${formatCurrency(i.price * i.qty)}</td>
    </tr>`
  ).join('')

  const deliveryLabel = data.deliveryType === 'delivery' ? '🚗 Domicilio' : data.deliveryType === 'takeaway' ? '🛍️ Para llevar' : '🍽️ En restaurante'

  const content = `
    <div style="text-align:center;margin-bottom:24px;">
      <div style="font-size:48px;margin-bottom:8px;">✅</div>
      <h2 style="margin:0;color:#111827;font-size:20px;font-weight:700;">¡Pedido recibido!</h2>
      <p style="margin:8px 0 0;color:#6b7280;font-size:14px;">Hola ${data.customerName}, tu pedido está confirmado.</p>
    </div>

    <div style="background:#f9fafb;border-radius:12px;padding:16px;margin-bottom:20px;">
      <p style="margin:0 0 4px;color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;">Número de pedido</p>
      <p style="margin:0;color:#111827;font-size:18px;font-weight:700;">${data.orderNumber}</p>
    </div>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
      <tr style="border-bottom:1px solid #e5e7eb;">
        <th style="padding:8px 0;color:#6b7280;font-size:12px;text-align:left;font-weight:600;text-transform:uppercase;">Producto</th>
        <th style="padding:8px 0;color:#6b7280;font-size:12px;text-align:right;font-weight:600;text-transform:uppercase;">Precio</th>
      </tr>
      ${itemsRows}
      <tr style="border-top:1px solid #e5e7eb;">
        <td style="padding:8px 0;color:#6b7280;font-size:13px;">Subtotal</td>
        <td style="padding:8px 0;color:#6b7280;font-size:13px;text-align:right;">${formatCurrency(data.subtotal)}</td>
      </tr>
      ${data.tax > 0 ? `<tr><td style="padding:4px 0;color:#6b7280;font-size:13px;">Impuestos</td><td style="padding:4px 0;color:#6b7280;font-size:13px;text-align:right;">${formatCurrency(data.tax)}</td></tr>` : ''}
      ${data.deliveryFee > 0 ? `<tr><td style="padding:4px 0;color:#6b7280;font-size:13px;">Domicilio</td><td style="padding:4px 0;color:#6b7280;font-size:13px;text-align:right;">${formatCurrency(data.deliveryFee)}</td></tr>` : ''}
      <tr>
        <td style="padding:12px 0 4px;color:#111827;font-size:15px;font-weight:700;border-top:2px solid #111827;">Total</td>
        <td style="padding:12px 0 4px;color:#111827;font-size:15px;font-weight:700;text-align:right;border-top:2px solid #111827;">${formatCurrency(data.total)}</td>
      </tr>
    </table>

    <div style="display:flex;gap:12px;margin-bottom:16px;">
      <div style="flex:1;background:#f9fafb;border-radius:10px;padding:12px;">
        <p style="margin:0 0 2px;color:#6b7280;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;">Tipo</p>
        <p style="margin:0;color:#111827;font-size:13px;font-weight:600;">${deliveryLabel}</p>
      </div>
      <div style="flex:1;background:#f9fafb;border-radius:10px;padding:12px;">
        <p style="margin:0 0 2px;color:#6b7280;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;">Pago</p>
        <p style="margin:0;color:#111827;font-size:13px;font-weight:600;">${data.paymentMethod}</p>
      </div>
    </div>

    ${data.deliveryAddress ? `<div style="background:#fef9c3;border-radius:10px;padding:12px;margin-bottom:16px;"><p style="margin:0 0 2px;color:#92400e;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;">Dirección de entrega</p><p style="margin:0;color:#78350f;font-size:13px;font-weight:600;">${data.deliveryAddress}</p></div>` : ''}
    ${data.notes ? `<div style="background:#f0f9ff;border-radius:10px;padding:12px;"><p style="margin:0 0 2px;color:#0369a1;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;">Notas</p><p style="margin:0;color:#0c4a6e;font-size:13px;">${data.notes}</p></div>` : ''}
  `

  await resend.emails.send({
    from: FROM,
    to,
    subject: `✅ Pedido ${data.orderNumber} confirmado — ${data.restaurantName}`,
    html: baseTemplate(content, data.restaurantName, data.primaryColor),
  })
}

// ─── ORDER STATUS UPDATE ─────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, { emoji: string; label: string; message: string }> = {
  preparing: { emoji: '👨‍🍳', label: 'En preparación', message: 'Tu pedido está siendo preparado.' },
  ready: { emoji: '🎉', label: 'Listo para recoger', message: 'Tu pedido está listo.' },
  delivered: { emoji: '✅', label: 'Entregado', message: '¡Tu pedido ha sido entregado!' },
  cancelled: { emoji: '❌', label: 'Cancelado', message: 'Tu pedido ha sido cancelado.' },
}

export async function sendOrderStatusUpdate(to: string, data: { restaurantName: string; primaryColor?: string; orderNumber: string; customerName: string; status: string }) {
  if (!process.env.RESEND_API_KEY) return
  const s = STATUS_LABELS[data.status]
  if (!s) return

  const content = `
    <div style="text-align:center;margin-bottom:24px;">
      <div style="font-size:48px;margin-bottom:8px;">${s.emoji}</div>
      <h2 style="margin:0;color:#111827;font-size:20px;font-weight:700;">${s.label}</h2>
      <p style="margin:8px 0 0;color:#6b7280;font-size:14px;">Hola ${data.customerName}, ${s.message}</p>
    </div>
    <div style="background:#f9fafb;border-radius:12px;padding:16px;text-align:center;">
      <p style="margin:0 0 4px;color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;">Número de pedido</p>
      <p style="margin:0;color:#111827;font-size:22px;font-weight:700;">${data.orderNumber}</p>
    </div>
  `

  await resend.emails.send({
    from: FROM,
    to,
    subject: `${s.emoji} Pedido ${data.orderNumber} — ${s.label}`,
    html: baseTemplate(content, data.restaurantName, data.primaryColor),
  })
}

// ─── RESERVATION CONFIRMATION ────────────────────────────────────────────────

interface ReservationEmailData {
  restaurantName: string
  primaryColor?: string
  customerName: string
  partySize: number
  reservationDate: string
  reservationTime: string
  notes?: string
  restaurantPhone?: string
  restaurantAddress?: string
}

export async function sendReservationConfirmation(to: string, data: ReservationEmailData) {
  if (!process.env.RESEND_API_KEY) return

  const content = `
    <div style="text-align:center;margin-bottom:24px;">
      <div style="font-size:48px;margin-bottom:8px;">🍽️</div>
      <h2 style="margin:0;color:#111827;font-size:20px;font-weight:700;">¡Reserva confirmada!</h2>
      <p style="margin:8px 0 0;color:#6b7280;font-size:14px;">Hola ${data.customerName}, tu reserva está pendiente de confirmación.</p>
    </div>

    <div style="background:#f9fafb;border-radius:12px;padding:20px;margin-bottom:20px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding:8px 0;border-bottom:1px solid #e5e7eb;">
            <p style="margin:0;color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;">Fecha</p>
            <p style="margin:4px 0 0;color:#111827;font-size:15px;font-weight:600;">${formatDate(data.reservationDate)}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:8px 0;border-bottom:1px solid #e5e7eb;">
            <p style="margin:0;color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;">Hora</p>
            <p style="margin:4px 0 0;color:#111827;font-size:15px;font-weight:600;">${data.reservationTime}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:8px 0;">
            <p style="margin:0;color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;">Personas</p>
            <p style="margin:4px 0 0;color:#111827;font-size:15px;font-weight:600;">${data.partySize} persona${data.partySize !== 1 ? 's' : ''}</p>
          </td>
        </tr>
      </table>
    </div>

    ${data.notes ? `<div style="background:#fef9c3;border-radius:10px;padding:12px;margin-bottom:16px;"><p style="margin:0 0 2px;color:#92400e;font-size:11px;text-transform:uppercase;">Notas</p><p style="margin:0;color:#78350f;font-size:13px;">${data.notes}</p></div>` : ''}

    ${data.restaurantAddress || data.restaurantPhone ? `
    <div style="border-top:1px solid #e5e7eb;padding-top:16px;margin-top:16px;">
      <p style="margin:0 0 8px;color:#6b7280;font-size:12px;font-weight:600;text-transform:uppercase;">Información del restaurante</p>
      ${data.restaurantAddress ? `<p style="margin:0 0 4px;color:#374151;font-size:13px;">📍 ${data.restaurantAddress}</p>` : ''}
      ${data.restaurantPhone ? `<p style="margin:0;color:#374151;font-size:13px;">📞 ${data.restaurantPhone}</p>` : ''}
    </div>` : ''}

    <div style="margin-top:20px;padding:12px;background:#fef2f2;border-radius:10px;">
      <p style="margin:0;color:#991b1b;font-size:13px;text-align:center;">Si necesitas cancelar, contáctanos con al menos 2 horas de anticipación.</p>
    </div>
  `

  await resend.emails.send({
    from: FROM,
    to,
    subject: `🍽️ Reserva confirmada para el ${formatDate(data.reservationDate)} — ${data.restaurantName}`,
    html: baseTemplate(content, data.restaurantName, data.primaryColor),
  })
}

// ─── NEW ORDER NOTIFICATION (to restaurant admin) ────────────────────────────

export async function sendNewOrderNotification(to: string, data: { restaurantName: string; primaryColor?: string; orderNumber: string; customerName: string; total: number; deliveryType: string; items: { name: string; qty: number }[] }) {
  if (!process.env.RESEND_API_KEY) return

  const itemsList = data.items.map(i => `${i.qty}× ${i.name}`).join(', ')
  const deliveryLabel = data.deliveryType === 'delivery' ? '🚗 Domicilio' : data.deliveryType === 'takeaway' ? '🛍️ Para llevar' : '🍽️ Salón'

  const content = `
    <div style="text-align:center;margin-bottom:24px;">
      <div style="font-size:48px;margin-bottom:8px;">🛎️</div>
      <h2 style="margin:0;color:#111827;font-size:20px;font-weight:700;">Nuevo pedido</h2>
      <p style="margin:8px 0 0;color:#6b7280;font-size:14px;">Tienes un nuevo pedido en ${data.restaurantName}.</p>
    </div>

    <div style="background:#f9fafb;border-radius:12px;padding:16px;margin-bottom:16px;">
      <p style="margin:0 0 4px;color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;">Número</p>
      <p style="margin:0;color:#111827;font-size:22px;font-weight:700;">${data.orderNumber}</p>
    </div>

    <div style="display:flex;gap:12px;margin-bottom:16px;">
      <div style="flex:1;background:#f9fafb;border-radius:10px;padding:12px;">
        <p style="margin:0 0 2px;color:#6b7280;font-size:11px;text-transform:uppercase;">Cliente</p>
        <p style="margin:0;color:#111827;font-size:13px;font-weight:600;">${data.customerName}</p>
      </div>
      <div style="flex:1;background:#f9fafb;border-radius:10px;padding:12px;">
        <p style="margin:0 0 2px;color:#6b7280;font-size:11px;text-transform:uppercase;">Total</p>
        <p style="margin:0;color:#111827;font-size:13px;font-weight:600;">${formatCurrency(data.total)}</p>
      </div>
    </div>

    <div style="background:#f0fdf4;border-radius:10px;padding:12px;margin-bottom:12px;">
      <p style="margin:0 0 4px;color:#166534;font-size:12px;text-transform:uppercase;font-weight:600;">Tipo</p>
      <p style="margin:0;color:#15803d;font-size:13px;font-weight:700;">${deliveryLabel}</p>
    </div>

    <div style="background:#f9fafb;border-radius:10px;padding:12px;">
      <p style="margin:0 0 4px;color:#6b7280;font-size:12px;text-transform:uppercase;font-weight:600;">Productos</p>
      <p style="margin:0;color:#374151;font-size:13px;">${itemsList}</p>
    </div>
  `

  await resend.emails.send({
    from: FROM,
    to,
    subject: `🛎️ Nuevo pedido ${data.orderNumber} — ${formatCurrency(data.total)}`,
    html: baseTemplate(content, data.restaurantName, data.primaryColor),
  })
}

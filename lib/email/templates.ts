interface EmailTemplate {
  subject: string
  html: string
}

export function orderConfirmationEmail(
  customerName: string,
  orderNumber: string,
  items: Array<{ name: string; qty: number; price: number }>,
  subtotal: number,
  tax: number,
  deliveryFee: number,
  total: number,
  restaurantName: string,
  deliveryType: string,
  estimatedTime?: string
): EmailTemplate {
  const itemsHtml = items
    .map(
      item => `
    <tr>
      <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${item.name}</td>
      <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">${item.qty}</td>
      <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">$${(item.price * item.qty).toLocaleString('es-CO')}</td>
    </tr>
  `
    )
    .join('')

  return {
    subject: `Pedido Confirmado: ${orderNumber}`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #1f2937; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; text-align: center; }
    .content { background: #f9fafb; padding: 20px; margin: 20px 0; border-radius: 8px; }
    .order-info { background: white; padding: 15px; margin: 10px 0; border-radius: 6px; border-left: 4px solid #667eea; }
    .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; }
    table { width: 100%; border-collapse: collapse; margin: 15px 0; }
    .summary { background: white; padding: 15px; border-radius: 6px; margin-top: 15px; }
    .button { display: inline-block; background: #667eea; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>¡Tu Pedido ha sido Confirmado!</h1>
      <p style="margin: 10px 0; opacity: 0.9;">Número de Pedido: <strong>${orderNumber}</strong></p>
    </div>

    <div class="content">
      <p>Hola <strong>${customerName}</strong>,</p>
      <p>Tu pedido en <strong>${restaurantName}</strong> ha sido confirmado. Te enviaremos actualizaciones sobre el estado de tu pedido.</p>

      <div class="order-info">
        <strong>Detalles del Pedido:</strong>
        <table>
          <thead style="background: #f3f4f6; font-weight: bold;">
            <tr>
              <td style="padding: 8px 0;">Producto</td>
              <td style="padding: 8px 0; text-align: right;">Cantidad</td>
              <td style="padding: 8px 0; text-align: right;">Subtotal</td>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>
      </div>

      <div class="summary">
        <table style="border: none;">
          <tr>
            <td>Subtotal</td>
            <td style="text-align: right;">$${subtotal.toLocaleString('es-CO')}</td>
          </tr>
          ${tax > 0 ? `<tr><td>Impuesto</td><td style="text-align: right;">$${tax.toLocaleString('es-CO')}</td></tr>` : ''}
          ${deliveryFee > 0 ? `<tr><td>${deliveryType === 'delivery' ? 'Envío' : 'Servicio'}</td><td style="text-align: right;">$${deliveryFee.toLocaleString('es-CO')}</td></tr>` : ''}
          <tr style="border-top: 2px solid #e5e7eb; font-weight: bold; font-size: 16px;">
            <td style="padding-top: 10px;">Total</td>
            <td style="text-align: right; padding-top: 10px;">$${total.toLocaleString('es-CO')}</td>
          </tr>
        </table>
      </div>

      <div style="background: white; padding: 15px; border-radius: 6px; margin-top: 15px; border-left: 4px solid #10b981;">
        <strong>Tipo de Entrega:</strong> ${deliveryType === 'delivery' ? '🚗 Envío a Domicilio' : '🏪 Recoger en el Local'}
        ${estimatedTime ? `<br><strong>Tiempo estimado:</strong> ${estimatedTime}` : ''}
      </div>
    </div>

    <div class="footer">
      <p>Cualquier duda, responde este email o llama directamente.</p>
      <p>&copy; ${new Date().getFullYear()} ${restaurantName}. Todos los derechos reservados.</p>
    </div>
  </div>
</body>
</html>
    `,
  }
}

export function orderStatusUpdateEmail(
  customerName: string,
  orderNumber: string,
  oldStatus: string,
  newStatus: string,
  restaurantName: string,
  statusMessage?: string
): EmailTemplate {
  const statusEmoji: Record<string, string> = {
    pending: '⏳',
    confirmed: '✅',
    preparing: '👨‍🍳',
    on_the_way: '🚗',
    delivered: '🎉',
    cancelled: '❌',
  }

  const statusLabels: Record<string, string> = {
    pending: 'Pendiente',
    confirmed: 'Confirmado',
    preparing: 'Preparando',
    on_the_way: 'En Camino',
    delivered: 'Entregado',
    cancelled: 'Cancelado',
  }

  return {
    subject: `Actualización de tu Pedido ${orderNumber}`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #1f2937; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; text-align: center; }
    .status-update { background: #f0f9ff; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0; border: 2px solid #0ea5e9; }
    .status-badge { display: inline-block; background: white; padding: 10px 20px; border-radius: 20px; font-size: 24px; margin: 5px; }
    .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Actualización de Pedido</h1>
    </div>

    <div style="padding: 20px;">
      <p>Hola <strong>${customerName}</strong>,</p>
      <p>Tu pedido <strong>${orderNumber}</strong> en ${restaurantName} ha cambiado de estado:</p>

      <div class="status-update">
        <div style="margin: 10px;">
          <div class="status-badge">${statusEmoji[oldStatus] || '📦'}</div>
          <div style="color: #999; margin: 5px;">→</div>
          <div class="status-badge">${statusEmoji[newStatus] || '📦'}</div>
        </div>
        <h2 style="margin: 15px 0; color: #667eea;">
          ${statusLabels[newStatus] || newStatus}
        </h2>
        ${statusMessage ? `<p style="color: #6b7280; margin: 10px 0;">${statusMessage}</p>` : ''}
      </div>

      ${
        newStatus === 'preparing'
          ? '<p style="background: #fef3c7; padding: 10px; border-radius: 6px; color: #92400e;">🔔 <strong>Tu pedido está siendo preparado.</strong> Te notificaremos cuando esté listo.</p>'
          : ''
      }
      ${
        newStatus === 'on_the_way'
          ? '<p style="background: #dbeafe; padding: 10px; border-radius: 6px; color: #0c4a6e;">🚗 <strong>Tu pedido está en camino.</strong> Recibirlo en breve.</p>'
          : ''
      }
      ${
        newStatus === 'delivered'
          ? '<p style="background: #dcfce7; padding: 10px; border-radius: 6px; color: #166534;">✅ <strong>Tu pedido ha sido entregado.</strong> ¡Que disfrutes tu comida!</p>'
          : ''
      }
    </div>

    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} ${restaurantName}. Todos los derechos reservados.</p>
    </div>
  </div>
</body>
</html>
    `,
  }
}

export function reservationConfirmationEmail(
  customerName: string,
  reservationDate: string,
  reservationTime: string,
  partySize: number,
  tableName: string,
  restaurantName: string,
  restaurantPhone?: string,
  notes?: string
): EmailTemplate {
  const dateObj = new Date(reservationDate)
  const formattedDate = dateObj.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  return {
    subject: `Tu Reserva en ${restaurantName} el ${formattedDate}`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #1f2937; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; text-align: center; }
    .details { background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
    .detail-label { color: #6b7280; font-weight: bold; }
    .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>¡Tu Reserva ha sido Confirmada!</h1>
      <p style="margin: 10px 0; opacity: 0.9;">${restaurantName}</p>
    </div>

    <p>Hola <strong>${customerName}</strong>,</p>
    <p>Tu reserva en <strong>${restaurantName}</strong> ha sido confirmada. Aquí están los detalles:</p>

    <div class="details">
      <div class="detail-row">
        <span class="detail-label">📅 Fecha</span>
        <span>${formattedDate}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">🕐 Hora</span>
        <span>${reservationTime}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">👥 Personas</span>
        <span>${partySize}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">🪑 Mesa</span>
        <span>${tableName}</span>
      </div>
      ${notes ? `<div class="detail-row">
        <span class="detail-label">📝 Notas</span>
        <span>${notes}</span>
      </div>` : ''}
    </div>

    <div style="background: #dbeafe; padding: 15px; border-radius: 6px; border-left: 4px solid #0ea5e9; margin: 20px 0;">
      <strong style="color: #0c4a6e;">📞 Contacto</strong>
      <p style="margin: 5px 0; color: #0c4a6e;">
        ${restaurantPhone ? `Teléfono: ${restaurantPhone}<br>` : ''}
        Si necesitas cancelar o modificar, contáctanos con anticipación.
      </p>
    </div>

    <div style="background: #fef3c7; padding: 15px; border-radius: 6px; border-left: 4px solid #f59e0b; margin: 20px 0;">
      <strong style="color: #92400e;">⏰ Importante</strong>
      <p style="margin: 5px 0; color: #92400e;">
        Por favor llega 10 minutos antes de la hora reservada.<br>
        Las mesas se reservan por máximo 2 horas.
      </p>
    </div>

    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} ${restaurantName}. Todos los derechos reservados.</p>
    </div>
  </div>
</body>
</html>
    `,
  }
}

export function adminOrderNotificationEmail(
  adminName: string,
  orderNumber: string,
  customerName: string,
  customerPhone: string,
  items: Array<{ name: string; qty: number; price: number }>,
  total: number,
  deliveryType: string,
  deliveryAddress?: string
): EmailTemplate {
  const itemsHtml = items
    .map(
      item => `
    <li style="padding: 5px 0;">
      <strong>${item.qty}x</strong> ${item.name} - $${(item.price * item.qty).toLocaleString('es-CO')}
    </li>
  `
    )
    .join('')

  return {
    subject: `🔔 Nuevo Pedido: ${orderNumber}`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #1f2937; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .alert { background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); color: white; padding: 20px; border-radius: 8px; }
    .order-card { background: white; border: 2px solid #f97316; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .section { margin: 15px 0; }
    .label { font-weight: bold; color: #6b7280; font-size: 12px; text-transform: uppercase; }
  </style>
</head>
<body>
  <div class="container">
    <div class="alert">
      <h1 style="margin: 0; font-size: 24px;">¡Nuevo Pedido Recibido!</h1>
      <p style="margin: 10px 0 0 0; opacity: 0.9;">Pedido #${orderNumber}</p>
    </div>

    <div class="order-card">
      <div class="section">
        <div class="label">Cliente</div>
        <p style="margin: 5px 0; font-size: 16px;"><strong>${customerName}</strong></p>
        <p style="margin: 5px 0; color: #6b7280;">📱 ${customerPhone}</p>
      </div>

      <div class="section">
        <div class="label">Artículos Pedidos</div>
        <ul style="margin: 8px 0; padding-left: 20px;">
          ${itemsHtml}
        </ul>
      </div>

      <div class="section" style="background: #f9fafb; padding: 15px; border-radius: 6px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
          <span>Total:</span>
          <strong style="font-size: 18px; color: #f97316;">$${total.toLocaleString('es-CO')}</strong>
        </div>
        <div style="display: flex; justify-content: space-between; color: #6b7280; font-size: 12px;">
          <span>${deliveryType === 'delivery' ? '🚗 Envío a Domicilio' : '🏪 Recogida en Local'}</span>
        </div>
      </div>

      ${
        deliveryType === 'delivery' && deliveryAddress
          ? `<div class="section">
        <div class="label">Dirección de Entrega</div>
        <p style="margin: 5px 0; color: #6b7280;">${deliveryAddress}</p>
      </div>`
          : ''
      }
    </div>

    <p style="text-align: center; margin-top: 30px;">
      <a href="https://eccofood.vercel.app" style="background: #f97316; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none;">
        Ver Detalles del Pedido
      </a>
    </p>
  </div>
</body>
</html>
    `,
  }
}

export function trialExpiringEmail(
  organizationName: string,
  daysRemaining: number,
  expirationDate: string
): EmailTemplate {
  return {
    subject: `Tu período de prueba vence en ${daysRemaining} días`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #1f2937; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #3b82f6 0%, #1e40af 100%); color: white; padding: 20px; border-radius: 8px; text-align: center; }
    .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; border-radius: 6px; margin: 20px 0; }
    .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin: 10px 5px; }
    .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⏰ Tu período de prueba vence pronto</h1>
      <p style="margin: 10px 0; opacity: 0.9;">${daysRemaining} días restantes</p>
    </div>

    <p>Hola,</p>
    <p>Tu período de prueba gratuito de <strong>${organizationName}</strong> vencerá el <strong>${new Date(expirationDate).toLocaleDateString('es-CO')}</strong>.</p>

    <div class="warning">
      <strong style="color: #92400e;">⚠️ Importante</strong>
      <p style="margin: 10px 0; color: #92400e;">
        Para continuar usando Eccofood después de que venza tu período de prueba, necesitarás activar un plan de pago. Sin un plan activo, tu cuenta será suspendida.
      </p>
    </div>

    <p>Puedes elegir entre nuestros planes:</p>
    <ul style="margin: 15px 0; padding-left: 20px;">
      <li><strong>Plan Básico:</strong> $29.99/mes - Ideal para pequeños restaurantes</li>
      <li><strong>Plan Pro:</strong> $79.99/mes - Para restaurantes en crecimiento</li>
      <li><strong>Plan Premium:</strong> $149.99/mes - Para grandes restaurantes</li>
    </ul>

    <div style="text-align: center; margin: 30px 0;">
      <a href="https://app.eccofood.com/account/cambiar-plan" class="button">Elegir Plan Ahora</a>
    </div>

    <p style="background: #dbeafe; padding: 15px; border-radius: 6px; border-left: 4px solid #0ea5e9;">
      <strong style="color: #0c4a6e;">❓ ¿Necesitas ayuda?</strong><br>
      Si tienes preguntas sobre los planes o necesitas asistencia, contáctanos a support@eccofood.com
    </p>

    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} Eccofood. Todos los derechos reservados.</p>
    </div>
  </div>
</body>
</html>
    `,
  }
}

export function subscriptionExpiringEmail(
  organizationName: string,
  plan: string,
  daysRemaining: number,
  expirationDate: string
): EmailTemplate {
  return {
    subject: `Tu suscripción vence en ${daysRemaining} días`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #1f2937; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 20px; border-radius: 8px; text-align: center; }
    .info { background: #f9fafb; padding: 15px; border-radius: 6px; margin: 20px 0; }
    .button { display: inline-block; background: #10b981; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; }
    .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Tu suscripción se renueva pronto</h1>
      <p style="margin: 10px 0; opacity: 0.9;">Se renovará el ${new Date(expirationDate).toLocaleDateString('es-CO')}</p>
    </div>

    <p>Hola,</p>
    <p>Tu suscripción al <strong>${plan}</strong> para <strong>${organizationName}</strong> vence en <strong>${daysRemaining} días</strong>.</p>

    <div class="info">
      <strong>Detalles de tu suscripción:</strong>
      <p style="margin: 10px 0;">Plan: <strong>${plan}</strong></p>
      <p style="margin: 10px 0;">Vencimiento: <strong>${new Date(expirationDate).toLocaleDateString('es-CO')}</strong></p>
    </div>

    <p>Tu suscripción se renovará automáticamente con el mismo plan. Si deseas cambiar tu plan o hacer cambios, puedes hacerlo aquí:</p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="https://app.eccofood.com/account/suscripcion" class="button">Gestionar Suscripción</a>
    </div>

    <p style="background: #dbeafe; padding: 15px; border-radius: 6px; border-left: 4px solid #0ea5e9;">
      <strong style="color: #0c4a6e;">💳 Pago automático</strong><br>
      Tu pago se procesará automáticamente en ${new Date(expirationDate).toLocaleDateString('es-CO')}. Asegúrate de que tu método de pago esté actualizado.
    </p>

    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} Eccofood. Todos los derechos reservados.</p>
    </div>
  </div>
</body>
</html>
    `,
  }
}

export function subscriptionExpiredEmail(
  organizationName: string,
  plan: string,
  expirationDate: string
): EmailTemplate {
  return {
    subject: `Tu suscripción ha expirado - Renuévala ahora`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #1f2937; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 20px; border-radius: 8px; text-align: center; }
    .alert { background: #fee2e2; border-left: 4px solid #ef4444; padding: 15px; border-radius: 6px; margin: 20px 0; }
    .button { display: inline-block; background: #ef4444; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; }
    .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⚠️ Tu suscripción ha expirado</h1>
      <p style="margin: 10px 0; opacity: 0.9;">Desde: ${new Date(expirationDate).toLocaleDateString('es-CO')}</p>
    </div>

    <p>Hola,</p>
    <p>Tu suscripción al plan <strong>${plan}</strong> ha expirado. Tu cuenta está actualmente <strong>suspendida</strong> y no puedes acceder a Eccofood.</p>

    <div class="alert">
      <strong style="color: #991b1b;">❌ Acceso limitado</strong>
      <p style="margin: 10px 0; color: #991b1b;">
        Para reactivar tu acceso, debes renovar tu suscripción inmediatamente. Haz clic en el botón a continuación.
      </p>
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <a href="https://app.eccofood.com/account/cambiar-plan" class="button">Renovar Suscripción Ahora</a>
    </div>

    <p>Aún puedes cambiar tu plan a uno que se ajuste mejor a tus necesidades:</p>
    <ul style="margin: 15px 0; padding-left: 20px;">
      <li><strong>Plan Básico:</strong> $29.99/mes</li>
      <li><strong>Plan Pro:</strong> $79.99/mes</li>
      <li><strong>Plan Premium:</strong> $149.99/mes</li>
    </ul>

    <p style="background: #fef3c7; padding: 15px; border-radius: 6px; border-left: 4px solid #f59e0b;">
      <strong style="color: #92400e;">📞 Necesitas ayuda?</strong><br>
      Si tienes dificultades para renovar tu suscripción, contáctanos a support@eccofood.com
    </p>

    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} Eccofood. Todos los derechos reservados.</p>
    </div>
  </div>
</body>
</html>
    `,
  }
}

export function planUpgradeConfirmationEmail(
  organizationName: string,
  oldPlan: string,
  newPlan: string,
  chargeAmount: number
): EmailTemplate {
  return {
    subject: `Tu plan ha sido mejorado a ${newPlan}`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #1f2937; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 20px; border-radius: 8px; text-align: center; }
    .success { background: #dcfce7; border-left: 4px solid #10b981; padding: 15px; border-radius: 6px; margin: 20px 0; }
    .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✅ ¡Tu plan ha sido mejorado!</h1>
      <p style="margin: 10px 0; opacity: 0.9;">${newPlan}</p>
    </div>

    <div class="success">
      <strong style="color: #166534;">¡Gracias por mejorar tu plan!</strong>
      <p style="margin: 10px 0; color: #166534;">
        Tu cuenta de <strong>${organizationName}</strong> ha sido actualizada a <strong>${newPlan}</strong>.
      </p>
    </div>

    <p>Nuevas características disponibles en tu plan:</p>
    <ul style="margin: 15px 0; padding-left: 20px;">
      <li>Acceso a todas las características del plan ${newPlan}</li>
      <li>Mayor límite de productos y usuarios</li>
      <li>Soporte prioritario</li>
    </ul>

    ${
      chargeAmount > 0
        ? `<div style="background: #f9fafb; padding: 15px; border-radius: 6px; margin: 20px 0;">
      <strong>Cobro por mejora:</strong>
      <p style="margin: 10px 0; font-size: 18px; color: #10b981;">$${chargeAmount.toFixed(2)}</p>
      <p style="font-size: 12px; color: #6b7280;">Se cobrará en tu próximo ciclo de facturación</p>
    </div>`
        : ''
    }

    <p style="background: #dbeafe; padding: 15px; border-radius: 6px; border-left: 4px solid #0ea5e9;">
      <strong style="color: #0c4a6e;">📧 Confirmación</strong><br>
      Has recibido una copia de esta confirmación. Si no realizaste este cambio, contáctanos inmediatamente.
    </p>

    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} Eccofood. Todos los derechos reservados.</p>
    </div>
  </div>
</body>
</html>
    `,
  }
}

export function paymentFailedEmail(
  organizationName: string,
  amount: number,
  failureReason: string,
  retryDate?: string
): EmailTemplate {
  return {
    subject: `⚠️ Error en tu pago - Acción requerida`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #1f2937; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 20px; border-radius: 8px; text-align: center; }
    .alert { background: #fee2e2; border-left: 4px solid #ef4444; padding: 15px; border-radius: 6px; margin: 20px 0; }
    .button { display: inline-block; background: #ef4444; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; }
    .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>❌ Error en tu pago</h1>
      <p style="margin: 10px 0; opacity: 0.9;">Acción requerida</p>
    </div>

    <p>Hola,</p>
    <p>Intentamos procesar un pago de <strong>$${amount.toFixed(2)}</strong> para <strong>${organizationName}</strong>, pero fue rechazado.</p>

    <div class="alert">
      <strong style="color: #991b1b;">Razón del rechazo:</strong>
      <p style="margin: 10px 0; color: #991b1b;">${failureReason}</p>
    </div>

    <p>Por favor, actualiza tu método de pago para evitar que tu suscripción sea suspendida:</p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="https://app.eccofood.com/account/suscripcion" class="button">Actualizar Método de Pago</a>
    </div>

    ${
      retryDate
        ? `<p style="background: #fef3c7; padding: 15px; border-radius: 6px; border-left: 4px solid #f59e0b;">
      <strong style="color: #92400e;">🔄 Reintento automático</strong><br>
      Intentaremos procesar el pago nuevamente el ${new Date(retryDate).toLocaleDateString('es-CO')}.
    </p>`
        : ''
    }

    <p style="background: #dbeafe; padding: 15px; border-radius: 6px; border-left: 4px solid #0ea5e9;">
      <strong style="color: #0c4a6e;">❓ ¿Necesitas ayuda?</strong><br>
      Si tienes preguntas, contáctanos a support@eccofood.com o llama a nuestro equipo de soporte.
    </p>

    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} Eccofood. Todos los derechos reservados.</p>
    </div>
  </div>
</body>
</html>
    `,
  }
}

/**
 * Email Service - Sends transactional emails
 *
 * Currently supports Resend (resend.com)
 *
 * Environment variables needed:
 * - RESEND_API_KEY: Your Resend API key
 * - RESEND_FROM_EMAIL: Email address to send from (e.g., noreply@yourdomain.com)
 */

export async function sendEmail(
  to: string,
  subject: string,
  html: string,
  fromEmail?: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    // Validate email
    if (!to || !to.includes('@')) {
      return { success: false, error: 'Invalid email address' }
    }

    const apiKey = process.env.RESEND_API_KEY
    const fromAddress = fromEmail || process.env.RESEND_FROM_EMAIL || 'noreply@eccofood.com'

    if (!apiKey) {
      console.warn('[Email] RESEND_API_KEY not configured. Email will not be sent.')
      console.log(`[Email] To: ${to}, Subject: ${subject}`)
      return { success: true, messageId: 'dev-mode-' + Date.now() }
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromAddress,
        to,
        subject,
        html,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('[Email] Failed to send:', data)
      return {
        success: false,
        error: data.message || 'Failed to send email',
      }
    }

    console.log('[Email] Sent successfully:', data.id)
    return { success: true, messageId: data.id }
  } catch (error) {
    console.error('[Email] Error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Send order confirmation to customer
 */
export async function sendOrderConfirmationEmail(
  customerEmail: string,
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
) {
  const { orderConfirmationEmail } = await import('./templates')
  const template = orderConfirmationEmail(
    customerName,
    orderNumber,
    items,
    subtotal,
    tax,
    deliveryFee,
    total,
    restaurantName,
    deliveryType,
    estimatedTime
  )

  return sendEmail(customerEmail, template.subject, template.html)
}

/**
 * Send order status update to customer
 */
export async function sendOrderStatusUpdateEmail(
  customerEmail: string,
  customerName: string,
  orderNumber: string,
  oldStatus: string,
  newStatus: string,
  restaurantName: string,
  statusMessage?: string
) {
  const { orderStatusUpdateEmail } = await import('./templates')
  const template = orderStatusUpdateEmail(
    customerName,
    orderNumber,
    oldStatus,
    newStatus,
    restaurantName,
    statusMessage
  )

  return sendEmail(customerEmail, template.subject, template.html)
}

/**
 * Send reservation confirmation to customer
 */
export async function sendReservationConfirmationEmail(
  customerEmail: string,
  customerName: string,
  reservationDate: string,
  reservationTime: string,
  partySize: number,
  tableName: string,
  restaurantName: string,
  restaurantPhone?: string,
  notes?: string
) {
  const { reservationConfirmationEmail } = await import('./templates')
  const template = reservationConfirmationEmail(
    customerName,
    reservationDate,
    reservationTime,
    partySize,
    tableName,
    restaurantName,
    restaurantPhone,
    notes
  )

  return sendEmail(customerEmail, template.subject, template.html)
}

/**
 * Send notification to admin about new order
 */
export async function sendAdminOrderNotificationEmail(
  adminEmail: string,
  adminName: string,
  orderNumber: string,
  customerName: string,
  customerPhone: string,
  items: Array<{ name: string; qty: number; price: number }>,
  total: number,
  deliveryType: string,
  deliveryAddress?: string
) {
  const { adminOrderNotificationEmail } = await import('./templates')
  const template = adminOrderNotificationEmail(
    adminName,
    orderNumber,
    customerName,
    customerPhone,
    items,
    total,
    deliveryType,
    deliveryAddress
  )

  return sendEmail(adminEmail, template.subject, template.html)
}

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { isOwnerEmail } from '@/lib/owner-auth'

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function buildPriceUpdateEmail({
  restaurantName,
  ownerName,
}: {
  restaurantName: string
  ownerName?: string | null
}) {
  const safeRestaurantName = escapeHtml(restaurantName || 'tu restaurante')
  const greetingName = escapeHtml(ownerName || `equipo de ${restaurantName || 'tu restaurante'}`)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://eccofoodapp.com'
  const loginUrl = `${appUrl}/login`
  const plansUrl = `${appUrl}/planes`
  const subject = 'Nuevos precios en Eccofood y mejoras de experiencia'

  const html = `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${subject}</title>
</head>
<body style="margin:0;background:#f5f6f8;font-family:Arial,Helvetica,sans-serif;color:#111827;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f6f8;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="620" cellpadding="0" cellspacing="0" style="max-width:620px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;">
          <tr>
            <td style="background:#111827;padding:28px;text-align:left;">
              <p style="margin:0;color:#facc15;font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;">Eccofood</p>
              <h1 style="margin:10px 0 0;color:#ffffff;font-size:26px;line-height:1.2;">Bajamos los precios y mejoramos la experiencia</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:28px;">
              <p style="margin:0 0 16px;font-size:16px;line-height:1.6;">Hola, <strong>${greetingName}</strong>.</p>
              <p style="margin:0 0 16px;font-size:16px;line-height:1.6;">Queríamos avisarte que actualizamos Eccofood para que sea más fácil empezar y seguir usando la plataforma en el día a día de <strong>${safeRestaurantName}</strong>.</p>
              <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;padding:18px;margin:22px 0;">
                <p style="margin:0 0 10px;font-size:15px;font-weight:700;color:#9a3412;">Nuevos precios mensuales</p>
                <p style="margin:0;font-size:15px;line-height:1.7;color:#7c2d12;">Basic: <strong>19,99 €/mes</strong><br>Pro: <strong>49,99 €/mes</strong><br>Premium: <strong>99,99 €/mes</strong></p>
              </div>
              <p style="margin:0 0 16px;font-size:16px;line-height:1.6;">También mejoramos detalles de la experiencia visual y de uso para que tu restaurante se vea mejor y sea más cómodo para tus clientes.</p>
              <p style="margin:0 0 24px;font-size:16px;line-height:1.6;">Puedes entrar cuando quieras y revisar tu cuenta desde el panel.</p>
              <table cellpadding="0" cellspacing="0" style="margin:24px 0;">
                <tr>
                  <td style="padding-right:10px;">
                    <a href="${loginUrl}" style="display:inline-block;background:#ff5a00;color:#ffffff;text-decoration:none;font-weight:700;padding:13px 18px;border-radius:10px;">Entrar a Eccofood</a>
                  </td>
                  <td>
                    <a href="${plansUrl}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;font-weight:700;padding:13px 18px;border-radius:10px;">Ver planes</a>
                  </td>
                </tr>
              </table>
              <p style="margin:22px 0 0;font-size:14px;line-height:1.6;color:#6b7280;">Si tienes alguna duda o quieres que te ayudemos a dejarlo listo, responde a este correo y te acompañamos.</p>
            </td>
          </tr>
          <tr>
            <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:18px 28px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#6b7280;">Eccofood · Software para restaurantes</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  return { subject, html }
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const authClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet) {
            try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch {}
          },
        },
      }
    )

    const { data: { user } } = await authClient.auth.getUser()
    if (!isOwnerEmail(user?.email)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    const ownerEmail = user?.email

    const { tenantId } = await request.json()
    if (!tenantId) {
      return NextResponse.json({ error: 'Cuenta requerida' }, { status: 400 })
    }

    const supabase = createServiceClient()
    const { data: tenant, error } = await supabase
      .from('tenants')
      .select('id, organization_name, owner_name, owner_email')
      .eq('id', tenantId)
      .single()

    if (error || !tenant) {
      return NextResponse.json({ error: 'Cuenta no encontrada' }, { status: 404 })
    }

    if (!tenant.owner_email || !tenant.owner_email.includes('@')) {
      return NextResponse.json({ error: 'La cuenta no tiene un email valido' }, { status: 400 })
    }

    const resendApiKey = process.env.RESEND_API_KEY
    if (!resendApiKey) {
      return NextResponse.json({ error: 'RESEND_API_KEY no esta configurada' }, { status: 500 })
    }

    const { subject, html } = buildPriceUpdateEmail({
      restaurantName: tenant.organization_name,
      ownerName: tenant.owner_name,
    })

    const from = process.env.RESEND_FROM_EMAIL
      ? `Eccofood <${process.env.RESEND_FROM_EMAIL}>`
      : 'Eccofood <no-reply@eccofoodapp.com>'

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [tenant.owner_email],
        cc: ownerEmail ? [ownerEmail] : undefined,
        subject,
        html,
      }),
    })

    const data = await response.json()
    if (!response.ok) {
      console.error('[Admin email] Resend error:', data)
      return NextResponse.json(
        { error: data.message || 'No se pudo enviar el correo' },
        { status: 502 }
      )
    }

    return NextResponse.json({
      success: true,
      messageId: data.id,
      to: tenant.owner_email,
      cc: ownerEmail,
    })
  } catch (error) {
    console.error('Send price update email error:', error)
    return NextResponse.json({ error: 'Error al enviar el correo' }, { status: 500 })
  }
}

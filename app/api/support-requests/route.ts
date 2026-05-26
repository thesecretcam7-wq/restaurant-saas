import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { isOwnerEmail } from '@/lib/owner-auth'

function cleanText(value: unknown, maxLength: number) {
  return String(value || '').trim().slice(0, maxLength)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const contactName = cleanText(body.contactName, 120)
    const contactEmail = cleanText(body.contactEmail, 180).toLowerCase()
    const contactPhone = cleanText(body.contactPhone, 60)
    const restaurantName = cleanText(body.restaurantName, 160)
    const subject = cleanText(body.subject, 180)
    const message = cleanText(body.message, 3000)

    if (!contactName || !contactEmail || !subject || !message) {
      return NextResponse.json({ error: 'Completa nombre, email, asunto y mensaje.' }, { status: 400 })
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
      return NextResponse.json({ error: 'Escribe un email valido.' }, { status: 400 })
    }

    const supabase = createServiceClient()
    let tenantId: string | null = null

    if (contactEmail) {
      const { data: tenant } = await supabase
        .from('tenants')
        .select('id')
        .eq('owner_email', contactEmail)
        .maybeSingle()

      tenantId = tenant?.id || null
    }

    const { error } = await supabase
      .from('owner_support_requests')
      .insert({
        tenant_id: tenantId,
        restaurant_name: restaurantName || null,
        contact_name: contactName,
        contact_email: contactEmail,
        contact_phone: contactPhone || null,
        subject,
        message,
        status: 'open',
        priority: body.priority === 'urgent' ? 'urgent' : 'normal',
        source: 'support_page',
      })

    if (error) {
      console.error('Support request insert error:', error)
      return NextResponse.json({ error: 'No se pudo enviar el mensaje.' }, { status: 500 })
    }

    // Notificar al equipo de Eccofood (no-blocking)
    const resendKey = process.env.RESEND_API_KEY
    if (resendKey) {
      const priorityLabel = body.priority === 'urgent' ? '🔴 URGENTE' : '🟡 Normal'
      fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'Eccofood Soporte <no-reply@eccofoodapp.com>',
          to: ['thesecretcam7@gmail.com'],
          subject: `[${priorityLabel}] Nuevo ticket: ${subject}`,
          html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:32px 24px;">
            <h2 style="margin:0 0 4px;font-size:20px;color:#111827;">Nuevo ticket de soporte</h2>
            <p style="margin:0 0 24px;font-size:13px;color:#6b7280;">Prioridad: <strong>${priorityLabel}</strong></p>
            <table style="width:100%;border-collapse:collapse;font-size:14px;">
              <tr><td style="padding:10px 0;border-bottom:1px solid #f3f4f6;color:#6b7280;width:140px;">Nombre</td><td style="padding:10px 0;border-bottom:1px solid #f3f4f6;font-weight:600;color:#111827;">${contactName}</td></tr>
              <tr><td style="padding:10px 0;border-bottom:1px solid #f3f4f6;color:#6b7280;">Email</td><td style="padding:10px 0;border-bottom:1px solid #f3f4f6;font-weight:600;color:#111827;">${contactEmail}</td></tr>
              ${contactPhone ? `<tr><td style="padding:10px 0;border-bottom:1px solid #f3f4f6;color:#6b7280;">Teléfono</td><td style="padding:10px 0;border-bottom:1px solid #f3f4f6;font-weight:600;color:#111827;">${contactPhone}</td></tr>` : ''}
              ${restaurantName ? `<tr><td style="padding:10px 0;border-bottom:1px solid #f3f4f6;color:#6b7280;">Restaurante</td><td style="padding:10px 0;border-bottom:1px solid #f3f4f6;font-weight:600;color:#111827;">${restaurantName}</td></tr>` : ''}
              <tr><td style="padding:10px 0;border-bottom:1px solid #f3f4f6;color:#6b7280;">Asunto</td><td style="padding:10px 0;border-bottom:1px solid #f3f4f6;font-weight:600;color:#111827;">${subject}</td></tr>
            </table>
            <div style="margin-top:20px;background:#f9fafb;border-radius:10px;padding:16px 20px;">
              <p style="margin:0 0 8px;font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Mensaje</p>
              <p style="margin:0;font-size:14px;color:#111827;white-space:pre-wrap;line-height:1.6;">${message}</p>
            </div>
            <div style="margin-top:24px;">
              <a href="https://eccofoodapp.com/admin/soporte" style="display:inline-block;background:#111827;color:#fff;text-decoration:none;padding:10px 20px;border-radius:8px;font-size:13px;font-weight:700;">Ver en el panel →</a>
            </div>
          </div>`,
        }),
      }).catch(() => {})
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Support request POST error:', error)
    return NextResponse.json({ error: 'No se pudo procesar el mensaje.' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
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

    const body = await request.json()
    const id = cleanText(body.id, 80)
    const status = cleanText(body.status, 40)
    const ownerNotes = cleanText(body.ownerNotes, 2000)

    if (!id || !['open', 'in_progress', 'resolved', 'closed'].includes(status)) {
      return NextResponse.json({ error: 'Datos invalidos.' }, { status: 400 })
    }

    const supabase = createServiceClient()
    const { error } = await supabase
      .from('owner_support_requests')
      .update({
        status,
        owner_notes: ownerNotes || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) {
      console.error('Support request update error:', error)
      return NextResponse.json({ error: 'No se pudo actualizar.' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Support request PATCH error:', error)
    return NextResponse.json({ error: 'No se pudo procesar la solicitud.' }, { status: 500 })
  }
}

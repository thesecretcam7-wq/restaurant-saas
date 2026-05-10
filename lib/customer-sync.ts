type CustomerSyncInput = {
  tenantId: string
  name?: string | null
  email?: string | null
  phone?: string | null
  address?: string | null
  total?: number | null
}

function normalizeText(value?: string | null) {
  return String(value || '').trim()
}

function normalizeEmail(value?: string | null) {
  return normalizeText(value).toLowerCase()
}

function normalizePhone(value?: string | null) {
  return normalizeText(value).replace(/[^\d+]/g, '')
}

function fallbackEmailForPhone(phone: string) {
  const digits = phone.replace(/\D/g, '') || 'sin-telefono'
  return `phone-${digits}@clientes.eccofood.local`
}

export function isInternalCustomerEmail(email?: string | null) {
  return normalizeEmail(email).endsWith('@clientes.eccofood.local')
}

export async function syncCustomerFromOrder(supabase: any, input: CustomerSyncInput) {
  const tenantId = normalizeText(input.tenantId)
  const name = normalizeText(input.name)
  const phone = normalizePhone(input.phone)
  const email = normalizeEmail(input.email)
  const address = normalizeText(input.address)
  const total = Number(input.total || 0)

  if (!tenantId || !name || !phone) return

  try {
    let existing: any = null

    const { data: phoneMatch } = await supabase
      .from('customers')
      .select('id, email, total_orders, total_spent')
      .eq('tenant_id', tenantId)
      .eq('phone', phone)
      .order('updated_at', { ascending: false })
      .limit(1)

    existing = phoneMatch?.[0] || null

    if (!existing && email) {
      const { data: emailMatch } = await supabase
        .from('customers')
        .select('id, email, total_orders, total_spent')
        .eq('tenant_id', tenantId)
        .eq('email', email)
        .maybeSingle()
      existing = emailMatch
    }

    const customerData = {
      name,
      phone,
      email: email || existing?.email || fallbackEmailForPhone(phone),
      ...(address ? { address } : {}),
      updated_at: new Date().toISOString(),
    }

    if (existing?.id) {
      const { error } = await supabase
        .from('customers')
        .update({
          ...customerData,
          total_orders: Number(existing.total_orders || 0) + 1,
          total_spent: Number(existing.total_spent || 0) + total,
        })
        .eq('id', existing.id)

      if (error) console.error('[customers] update error:', error.message)
      return
    }

    const { error } = await supabase
      .from('customers')
      .insert({
        tenant_id: tenantId,
        ...customerData,
        total_orders: 1,
        total_spent: total,
      })

    if (error) console.error('[customers] insert error:', error.message)
  } catch (error) {
    console.error('[customers] sync error:', error)
  }
}

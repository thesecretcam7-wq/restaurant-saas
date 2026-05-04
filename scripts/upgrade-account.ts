import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function upgradeAccount() {
  try {
    // Get all users and find the one with the test email
    const { data, error } = await supabase.auth.admin.listUsers()

    if (error) {
      console.error('Error listing users:', error)
      return
    }

    const user = data.users.find(u => u.email === 'johang.musica@gmail.com')

    if (!user) {
      console.log('❌ User johang.musica@gmail.com not found')
      return
    }

    console.log('✅ Found user:', user.id, user.email)

    // Find tenant by owner_id
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('id, slug, subscription_plan')
      .eq('owner_id', user.id)
      .single()

    if (tenantError) {
      console.log('❌ Tenant error:', tenantError.message)
      return
    }

    if (!tenant) {
      console.log('❌ No tenant found for this user')
      return
    }

    console.log('📋 Current tenant:', tenant.slug)
    console.log('📊 Current plan:', tenant.subscription_plan)

    // Update to premium
    const { error: updateError } = await supabase
      .from('tenants')
      .update({ subscription_plan: 'premium' })
      .eq('id', tenant.id)

    if (updateError) {
      console.log('❌ Update error:', updateError.message)
      return
    }

    console.log('✅ Successfully upgraded to PREMIUM!')
    console.log('🎉 Tenant slug:', tenant.slug)
    console.log('📱 You can now test all premium features!')
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

upgradeAccount().then(() => process.exit(0))

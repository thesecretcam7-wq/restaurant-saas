import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const envPath = path.join(root, '.env.local')

if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    if (!line || line.trim().startsWith('#') || !line.includes('=')) continue
    const [key, ...rest] = line.split('=')
    if (!process.env[key]) process.env[key] = rest.join('=').trim()
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const customDomain = process.env.PARRILLABURGERS_DOMAIN || null

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const asset = (name) => `/restaurants/parrillaburgers/${name}`

const categories = [
  { key: 'burgers', name: 'Hamburguesas', description: 'Hamburguesas artesanales a la parrilla', image_url: asset('burger.png'), sort_order: 1 },
  { key: 'otros', name: 'Otros', description: 'Street food premium y parrilla urbana', image_url: asset('hotdog.png'), sort_order: 2 },
  { key: 'sides', name: 'Acompañamientos', description: 'Acompañantes dorados para completar tu pedido', image_url: asset('fries.png'), sort_order: 3 },
  { key: 'combos', name: 'Combos', description: 'Combos con papas y bebida', image_url: asset('combos.png'), sort_order: 4 },
]

const products = [
  { category: 'burgers', name: 'Clásica', description: 'Carne artesanal, lechuga, tomate, tocineta, queso y salsa de la casa.', price: 9200, image_url: asset('burger.png'), featured: true },
  { category: 'burgers', name: 'Argentina', description: 'Hamburguesa clásica con chimichurri artesanal.', price: 10200, image_url: asset('grill.png'), featured: true },
  { category: 'burgers', name: 'Mexicana', description: 'Hamburguesa clásica con jalapeños.', price: 10200, image_url: asset('flame.png'), featured: true },
  { category: 'burgers', name: 'Maicitos', description: 'Hamburguesa clásica con maicitos y salsa especial.', price: 10500, image_url: asset('cheese.png'), featured: true },
  { category: 'burgers', name: 'Mixta', description: 'Hamburguesa clásica con pollo y res.', price: 12900, image_url: asset('burger.png'), featured: true },
  { category: 'burgers', name: 'Champiñones', description: 'Hamburguesa clásica con champiñones.', price: 11900, image_url: asset('cheese.png'), featured: false },
  { category: 'burgers', name: 'Doble', description: 'Doble carne clásica de pollo o res.', price: 13500, image_url: asset('burger.png'), featured: true },
  { category: 'burgers', name: 'Pollo', description: 'Hamburguesa clásica de pollo.', price: 9200, image_url: asset('burger.png'), featured: false },
  { category: 'burgers', name: 'Pollo Champiñones', description: 'Hamburguesa clásica de pollo con champiñones.', price: 11900, image_url: asset('cheese.png'), featured: false },
  { category: 'otros', name: 'Choripan', description: 'Chorizo argentino, pan, chimichurri artesanal y queso.', price: 12000, image_url: asset('hotdog.png'), featured: true },
  { category: 'otros', name: 'Perro', description: 'Salchicha de la casa con queso.', price: 7900, image_url: asset('hotdog.png'), featured: false },
  { category: 'otros', name: 'Chuzo', description: 'Chuzo de pollo con tocineta.', price: 10900, image_url: asset('grill.png'), featured: false },
  { category: 'sides', name: 'Papas', description: 'Papas francesas o cascos.', price: 4000, image_url: asset('fries.png'), featured: true },
  { category: 'sides', name: 'Mazorca', description: 'Mazorca con crema agria de la casa, queso costeño y sal de chile.', price: 4500, image_url: asset('fries.png'), featured: false },
  { category: 'combos', name: 'Combo 1', description: 'Tu hamburguesa con gaseosa o agua y papas.', price: 5000, image_url: asset('combos.png'), featured: true },
  { category: 'combos', name: 'Combo 2', description: 'Tu hamburguesa con cerveza y papas.', price: 6500, image_url: asset('combos.png'), featured: false },
  { category: 'combos', name: 'Combo 3', description: 'Tu hamburguesa con soda italiana y papas.', price: 8500, image_url: asset('soda.png'), featured: false },
]

const tenantPayload = {
  organization_name: 'ParrillaBurgers',
  slug: 'parrillaburgers',
  primary_domain: customDomain,
  logo_url: asset('logo-real.png'),
  status: 'active',
  subscription_plan: 'premium',
  owner_email: 'admin@parrillaburgers.com',
  owner_name: 'ParrillaBurgers',
  country: 'CO',
  metadata: {
    seeded_from: 'parrillaburgers',
    brand_style: 'premium_urban_grill',
    pos_enabled: true,
    kds_enabled: true,
    custom_domain_pending: !customDomain,
  },
}

async function maybeSingle(query, label) {
  const { data, error } = await query
  if (error) throw new Error(`${label}: ${error.message}`)
  return data
}

async function main() {
  console.log('Creating/updating ParrillaBurgers tenant...')

  let tenant = await maybeSingle(
    supabase.from('tenants').select('*').eq('slug', tenantPayload.slug).maybeSingle(),
    'fetch tenant'
  )

  if (tenant) {
    tenant = await maybeSingle(
      supabase
        .from('tenants')
        .update({
          ...tenantPayload,
          metadata: { ...(tenant.metadata || {}), ...tenantPayload.metadata },
          updated_at: new Date().toISOString(),
        })
        .eq('id', tenant.id)
        .select('*')
        .single(),
      'update tenant'
    )
  } else {
    tenant = await maybeSingle(
      supabase.from('tenants').insert(tenantPayload).select('*').single(),
      'insert tenant'
    )
  }

  const tenantId = tenant.id

  await maybeSingle(
    supabase.from('tenant_branding').upsert({
      tenant_id: tenantId,
      primary_color: '#F5B041',
      secondary_color: '#0B0B0B',
      accent_color: '#FF5A1F',
      background_color: '#0B0B0B',
      button_primary_color: '#F5B041',
      button_secondary_color: '#171717',
      text_primary_color: '#FFFFFF',
      text_secondary_color: '#D7D1C8',
      border_color: '#3A2A16',
      font_family: 'Inter',
      heading_font: 'Bebas Neue',
      app_name: 'ParrillaBurgers',
      tagline: 'A la parrilla sabe mejor',
      hero_image_url: asset('burger.png'),
      description: 'Hamburguesas artesanales, street food premium y sabor real de parrilla.',
      favicon_url: asset('logo.svg'),
      whatsapp_number: '',
      contact_email: 'admin@parrillaburgers.com',
      contact_phone: '',
      delivery_description: 'Domicilios rápidos, calientes y conectados al KDS.',
      featured_text: 'El sabor de la parrilla en otro nivel',
      custom_texts: {
        hero_title: 'EL SABOR DE LA PARRILLA EN OTRO NIVEL',
        cta_primary: 'Pedir ahora',
        cta_secondary: 'Ver menú',
      },
      page_config: {
        visual_theme: 'premium_urban_grill',
        glow: true,
        dark_mode: true,
      },
      updated_at: new Date().toISOString(),
    }, { onConflict: 'tenant_id' }).select('*').single(),
    'upsert branding'
  )

  await maybeSingle(
    supabase.from('restaurant_settings').upsert({
      tenant_id: tenantId,
      display_name: 'ParrillaBurgers',
      description: 'Hamburguesas artesanales a la parrilla, combos, acompañamientos y pedidos online.',
      address: null,
      phone: '',
      email: 'admin@parrillaburgers.com',
      city: null,
      country: 'CO',
      timezone: 'America/Bogota',
      delivery_enabled: true,
      delivery_fee: 3000,
      delivery_min_order: 0,
      delivery_time_minutes: 30,
      reservations_enabled: false,
      total_tables: 10,
      seats_per_table: 4,
      cash_payment_enabled: true,
      tax_rate: 0,
      featured_image_url: asset('burger.png'),
      operating_hours: {
        monday: { open: '18:00', close: '23:59' },
        tuesday: { open: '18:00', close: '23:59' },
        wednesday: { open: '18:00', close: '23:59' },
        thursday: { open: '18:00', close: '23:59' },
        friday: { open: '18:00', close: '23:59' },
        saturday: { open: '18:00', close: '23:59' },
        sunday: { open: '18:00', close: '23:59' },
      },
      updated_at: new Date().toISOString(),
    }, { onConflict: 'tenant_id' }).select('*').single(),
    'upsert restaurant settings'
  )

  console.log('Replacing ParrillaBurgers menu catalog...')
  const existingCategories = await maybeSingle(
    supabase.from('menu_categories').select('id').eq('tenant_id', tenantId),
    'fetch categories'
  )
  const categoryIds = (existingCategories || []).map((category) => category.id)
  if (categoryIds.length) {
    await maybeSingle(supabase.from('product_toppings').delete().eq('tenant_id', tenantId), 'delete toppings')
    await maybeSingle(supabase.from('menu_items').delete().eq('tenant_id', tenantId), 'delete products')
    await maybeSingle(supabase.from('menu_categories').delete().eq('tenant_id', tenantId), 'delete categories')
  }

  const insertedCategories = await maybeSingle(
    supabase
      .from('menu_categories')
      .insert(categories.map(({ key, ...category }) => ({ ...category, tenant_id: tenantId, active: true })))
      .select('*'),
    'insert categories'
  )
  const categoryByName = new Map(insertedCategories.map((category) => [category.name, category.id]))
  const categoryByKey = new Map(categories.map((category) => [category.key, categoryByName.get(category.name)]))

  await maybeSingle(
    supabase.from('menu_items').insert(products.map((product) => ({
      tenant_id: tenantId,
      category_id: categoryByKey.get(product.category) || null,
      name: product.name,
      description: product.description,
      price: product.price,
      image_url: product.image_url,
      available: true,
      featured: product.featured,
      variants: {},
    }))).select('id'),
    'insert products'
  )

  await maybeSingle(
    supabase.from('kiosko_banners').delete().eq('tenant_id', tenantId),
    'delete banners'
  )
  await maybeSingle(
    supabase.from('kiosko_banners').insert([
      {
        tenant_id: tenantId,
        title: 'El sabor de la parrilla en otro nivel',
        image_url: asset('burger.png'),
        link_url: '/menu',
        sort_order: 1,
        active: true,
      },
      {
        tenant_id: tenantId,
        title: 'Combos urbanos premium',
        image_url: asset('combos.png'),
        link_url: '/menu',
        sort_order: 2,
        active: true,
      },
    ]).select('id'),
    'insert banners'
  )

  const existingTables = await maybeSingle(
    supabase.from('tables').select('id').eq('tenant_id', tenantId).limit(1),
    'fetch tables'
  )
  if (!existingTables?.length) {
    await maybeSingle(
      supabase.from('tables').insert(Array.from({ length: 10 }, (_, index) => ({
        tenant_id: tenantId,
        table_number: index + 1,
        seats: 4,
        location: 'Salon principal',
        status: 'available',
      }))).select('id'),
      'insert tables'
    )
  }

  console.log(JSON.stringify({
    ok: true,
    tenant_id: tenantId,
    slug: tenant.slug,
    domain: tenant.primary_domain,
    categories: categories.length,
    products: products.length,
    url: customDomain ? `https://${customDomain}` : `/${tenant.slug}`,
  }, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})

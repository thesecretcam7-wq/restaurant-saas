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
const productAsset = (name) => `/restaurants/parrillaburgers/products/${name}`

const categories = [
  { key: 'burgers', name: 'Hamburguesas', description: 'Hamburguesas artesanales a la parrilla', image_url: asset('burger.png'), sort_order: 1 },
  { key: 'asados', name: 'Asados', description: 'Carnes a la parrilla con papas, ensalada y arepa', image_url: asset('grill.png'), sort_order: 2 },
  { key: 'hotdogs', name: 'Hot Dogs', description: 'Perros, perras y choripan premium', image_url: asset('hotdog.png'), sort_order: 3 },
  { key: 'salchipapas', name: 'Salchipapas', description: 'Papas, queso, tocineta y salsas', image_url: asset('fries.png'), sort_order: 4 },
  { key: 'combos', name: 'Combos', description: 'Combos con papas y bebida', image_url: asset('combos.png'), sort_order: 5 },
]

const categoryByName = new Map([
  ['Clasica', 'burgers'], ['Argentina', 'burgers'], ['Mexicana', 'burgers'], ['Maicitos', 'burgers'],
  ['Mixta', 'burgers'], ['Champiñones', 'burgers'], ['Doble Carne', 'burgers'], ['Pollo', 'burgers'],
  ['Pollo con Champiñones', 'burgers'], ['Paisa Burger', 'burgers'], ['Americana', 'burgers'],
  ['Pierna de Cerdo', 'asados'], ['Chuleta de Cerdo', 'asados'], ['Solomo', 'asados'],
  ['Chuzo de Pollo', 'asados'], ['Costichip', 'asados'], ['Punta de Anca', 'asados'],
  ['Churrasco', 'asados'], ['Pechuga a la Plancha', 'asados'],
  ['Perro', 'hotdogs'], ['Perra', 'hotdogs'], ['Choripan', 'hotdogs'],
  ['Sencillas', 'salchipapas'], ['Especiales', 'salchipapas'],
  ['Combo gaseosa', 'combos'], ['Combo cerveza', 'combos'],
])

const featuredProducts = new Set([
  'Clasica',
  'Argentina',
  'Mexicana',
  'Maicitos',
  'Doble Carne',
  'Paisa Burger',
  'Americana',
  'Churrasco',
])

const demoStaffMembers = [
  { name: 'Admin ParrillaBurgers', role: 'admin', pin: '000000' },
  { name: 'Cocinero Demo', role: 'cocinero', pin: '567890' },
  { name: 'Camarero Demo', role: 'camarero', pin: '123456' },
  { name: 'Cajero Demo', role: 'cajero', pin: '999999' },
]

function slugify(value) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

async function fetchLiveProducts() {
  const html = await fetch('https://parrillaburgers.vercel.app/menu').then((res) => {
    if (!res.ok) throw new Error(`Could not fetch live ParrillaBurgers menu: ${res.status}`)
    return res.text()
  })

  const matches = [...html.matchAll(/\{\\"id\\":\\"[^}]+?\\"barra_libre_items\\":\[[^\]]*\]\}/g)].map((match) => match[0])
  const parsed = []

  for (const raw of matches) {
    const json = raw.replaceAll('\\"', '"').replaceAll('\\/', '/')
    try {
      const product = JSON.parse(json)
      if (product.name && product.price && product.image_url) parsed.push(product)
    } catch {
      // Ignore unrelated chunks in the streamed payload.
    }
  }

  return [...new Map(parsed.map((product) => [product.name, product])).values()]
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
}

async function ensureProductImage(product) {
  const file = `${String(product.sort_order).padStart(2, '0')}-${slugify(product.name)}.png`
  const outputDir = path.join(root, 'public', 'restaurants', 'parrillaburgers', 'products')
  const outputPath = path.join(outputDir, file)

  fs.mkdirSync(outputDir, { recursive: true })

  if (!fs.existsSync(outputPath)) {
    const response = await fetch(product.image_url)
    if (!response.ok) throw new Error(`Could not download image for ${product.name}: ${response.status}`)
    fs.writeFileSync(outputPath, Buffer.from(await response.arrayBuffer()))
  }

  return productAsset(file)
}

async function getProducts() {
  const liveProducts = await fetchLiveProducts()
  const products = []

  for (const product of liveProducts) {
    products.push({
      category: categoryByName.get(product.name) || 'burgers',
      name: product.name,
      description: product.description,
      price: product.price,
      image_url: await ensureProductImage(product),
      featured: featuredProducts.has(product.name),
      sort_order: product.sort_order ?? 0,
    })
  }

  return products
}

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
    seeded_from: 'parrillaburgers-live-menu',
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
  const products = await getProducts()

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
      hero_image_url: products[0]?.image_url || asset('burger.png'),
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
      featured_image_url: products[0]?.image_url || asset('burger.png'),
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

  console.log('Replacing ParrillaBurgers live menu catalog...')
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
  const categoryByKey = new Map(categories.map((category) => [
    category.key,
    insertedCategories.find((inserted) => inserted.name === category.name)?.id,
  ]))

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
      variants: { source_sort_order: product.sort_order },
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
        image_url: products[0]?.image_url || asset('burger.png'),
        link_url: '/menu',
        sort_order: 1,
        active: true,
      },
      {
        tenant_id: tenantId,
        title: 'Combos urbanos premium',
        image_url: products.find((product) => product.category === 'combos')?.image_url || asset('combos.png'),
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

  console.log('Ensuring ParrillaBurgers demo staff...')
  for (const staff of demoStaffMembers) {
    const existingStaff = await maybeSingle(
      supabase
        .from('staff_members')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('role', staff.role)
        .eq('name', staff.name)
        .maybeSingle(),
      `fetch ${staff.role} staff`
    )

    if (existingStaff) {
      await maybeSingle(
        supabase
          .from('staff_members')
          .update({
            ...staff,
            is_active: true,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingStaff.id)
          .select('id')
          .single(),
        `update ${staff.role} staff`
      )
    } else {
      await maybeSingle(
        supabase
          .from('staff_members')
          .insert({
            tenant_id: tenantId,
            ...staff,
            is_active: true,
          })
          .select('id')
          .single(),
        `insert ${staff.role} staff`
      )
    }
  }

  console.log(JSON.stringify({
    ok: true,
    tenant_id: tenantId,
    slug: tenant.slug,
    domain: tenant.primary_domain,
    categories: categories.length,
    products: products.length,
    demo_staff: demoStaffMembers.length,
    url: customDomain ? `https://${customDomain}` : `/${tenant.slug}`,
  }, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})

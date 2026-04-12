-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TENANTS TABLE
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  primary_domain TEXT UNIQUE,
  logo_url TEXT,
  status TEXT DEFAULT 'trial' CHECK (status IN ('trial', 'active', 'suspended', 'cancelled')),
  subscription_plan TEXT CHECK (subscription_plan IN ('free', 'basic', 'pro', 'premium')),
  subscription_stripe_id TEXT,
  stripe_customer_id TEXT,
  stripe_account_id TEXT,
  stripe_account_status TEXT CHECK (stripe_account_status IN ('verified', 'pending', 'failed')),
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  owner_email TEXT NOT NULL,
  owner_name TEXT,
  country VARCHAR(2) DEFAULT 'CO',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  metadata JSONB DEFAULT '{}'
);

-- 2. TENANT BRANDING TABLE
CREATE TABLE tenant_branding (
  tenant_id UUID PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
  primary_color VARCHAR(7) DEFAULT '#3B82F6',
  secondary_color VARCHAR(7) DEFAULT '#1F2937',
  accent_color VARCHAR(7) DEFAULT '#F59E0B',
  background_color VARCHAR(7) DEFAULT '#FFFFFF',
  font_family TEXT DEFAULT 'Inter',
  font_url TEXT,
  app_name TEXT,
  tagline TEXT,
  custom_texts JSONB DEFAULT '{}',
  favicon_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. RESTAURANT SETTINGS TABLE
CREATE TABLE restaurant_settings (
  tenant_id UUID PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  description TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  city TEXT,
  country TEXT DEFAULT 'CO',
  timezone TEXT DEFAULT 'America/Bogota',
  delivery_enabled BOOLEAN DEFAULT false,
  delivery_fee NUMERIC(10,2) DEFAULT 0,
  delivery_min_order NUMERIC(10,2) DEFAULT 0,
  delivery_time_minutes INT DEFAULT 30,
  reservations_enabled BOOLEAN DEFAULT false,
  total_tables INT DEFAULT 10,
  seats_per_table INT DEFAULT 4,
  reservation_advance_hours INT DEFAULT 24,
  cash_payment_enabled BOOLEAN DEFAULT true,
  tax_rate NUMERIC(5,2) DEFAULT 0,
  featured_image_url TEXT,
  operating_hours JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. MENU CATEGORIES TABLE
CREATE TABLE menu_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  sort_order INT DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. MENU ITEMS TABLE
CREATE TABLE menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  category_id UUID REFERENCES menu_categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10,2) NOT NULL,
  image_url TEXT,
  available BOOLEAN DEFAULT true,
  featured BOOLEAN DEFAULT false,
  variants JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 6. ORDERS TABLE
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  order_number TEXT NOT NULL,
  customer_id UUID,
  customer_email TEXT,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  items JSONB NOT NULL,
  subtotal NUMERIC(10,2) NOT NULL,
  tax NUMERIC(10,2) DEFAULT 0,
  delivery_fee NUMERIC(10,2) DEFAULT 0,
  total NUMERIC(10,2) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','confirmed','preparing','on_the_way','delivered','cancelled')),
  payment_method TEXT CHECK (payment_method IN ('stripe', 'cash')),
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed')),
  stripe_payment_intent_id TEXT,
  delivery_type TEXT DEFAULT 'pickup' CHECK (delivery_type IN ('pickup', 'delivery')),
  delivery_address TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 7. RESERVATIONS TABLE
CREATE TABLE reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  party_size INT NOT NULL,
  reservation_date DATE NOT NULL,
  reservation_time TIME NOT NULL,
  table_id UUID,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','confirmed','cancelled','no-show','completed')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 8. TABLES TABLE
CREATE TABLE tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  table_number INT NOT NULL,
  seats INT NOT NULL,
  location TEXT,
  status TEXT DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'reserved', 'maintenance')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, table_number)
);

-- 9. CUSTOMERS TABLE
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  city TEXT,
  total_orders INT DEFAULT 0,
  total_spent NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, email)
);

-- 10. SUBSCRIPTION PLANS TABLE (Configuration)
CREATE TABLE subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  monthly_price NUMERIC(10,2) NOT NULL,
  features JSONB NOT NULL,
  stripe_product_id TEXT,
  stripe_price_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_tenants_owner_id ON tenants(owner_id);
CREATE INDEX idx_tenants_domain ON tenants(primary_domain);
CREATE INDEX idx_menu_categories_tenant ON menu_categories(tenant_id);
CREATE INDEX idx_menu_items_tenant ON menu_items(tenant_id);
CREATE INDEX idx_menu_items_category ON menu_items(category_id);
CREATE INDEX idx_orders_tenant ON orders(tenant_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created ON orders(created_at);
CREATE INDEX idx_reservations_tenant ON reservations(tenant_id);
CREATE INDEX idx_reservations_date ON reservations(reservation_date);
CREATE INDEX idx_tables_tenant ON tables(tenant_id);
CREATE INDEX idx_customers_tenant ON customers(tenant_id);
CREATE INDEX idx_customers_email ON customers(email);

-- RLS Policies
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_branding ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Tenants - Owner can read/update own tenant
CREATE POLICY "Tenant owner can read own tenant" ON tenants
  FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "Tenant owner can update own tenant" ON tenants
  FOR UPDATE USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- RLS Policy: Tenant Branding - Owner can read/update
CREATE POLICY "Tenant owner can read branding" ON tenant_branding
  FOR SELECT USING (
    tenant_id IN (SELECT id FROM tenants WHERE owner_id = auth.uid())
  );

CREATE POLICY "Tenant owner can update branding" ON tenant_branding
  FOR UPDATE USING (
    tenant_id IN (SELECT id FROM tenants WHERE owner_id = auth.uid())
  )
  WITH CHECK (
    tenant_id IN (SELECT id FROM tenants WHERE owner_id = auth.uid())
  );

-- RLS Policy: Restaurant Settings - Owner can read/update
CREATE POLICY "Tenant owner can read settings" ON restaurant_settings
  FOR SELECT USING (
    tenant_id IN (SELECT id FROM tenants WHERE owner_id = auth.uid())
  );

CREATE POLICY "Tenant owner can update settings" ON restaurant_settings
  FOR UPDATE USING (
    tenant_id IN (SELECT id FROM tenants WHERE owner_id = auth.uid())
  )
  WITH CHECK (
    tenant_id IN (SELECT id FROM tenants WHERE owner_id = auth.uid())
  );

-- RLS Policy: Menu Categories - Public read, owner write
CREATE POLICY "Menu categories are public" ON menu_categories
  FOR SELECT USING (true);

CREATE POLICY "Tenant owner can manage categories" ON menu_categories
  FOR ALL USING (
    tenant_id IN (SELECT id FROM tenants WHERE owner_id = auth.uid())
  )
  WITH CHECK (
    tenant_id IN (SELECT id FROM tenants WHERE owner_id = auth.uid())
  );

-- RLS Policy: Menu Items - Public read, owner write
CREATE POLICY "Menu items are public" ON menu_items
  FOR SELECT USING (true);

CREATE POLICY "Tenant owner can manage items" ON menu_items
  FOR ALL USING (
    tenant_id IN (SELECT id FROM tenants WHERE owner_id = auth.uid())
  )
  WITH CHECK (
    tenant_id IN (SELECT id FROM tenants WHERE owner_id = auth.uid())
  );

-- RLS Policy: Orders - Owner read/write, customers read own
CREATE POLICY "Tenant owner can view orders" ON orders
  FOR SELECT USING (
    tenant_id IN (SELECT id FROM tenants WHERE owner_id = auth.uid())
  );

CREATE POLICY "Tenant owner can manage orders" ON orders
  FOR ALL USING (
    tenant_id IN (SELECT id FROM tenants WHERE owner_id = auth.uid())
  )
  WITH CHECK (
    tenant_id IN (SELECT id FROM tenants WHERE owner_id = auth.uid())
  );

-- RLS Policy: Reservations - Owner read/write
CREATE POLICY "Tenant owner can view reservations" ON reservations
  FOR SELECT USING (
    tenant_id IN (SELECT id FROM tenants WHERE owner_id = auth.uid())
  );

CREATE POLICY "Tenant owner can manage reservations" ON reservations
  FOR ALL USING (
    tenant_id IN (SELECT id FROM tenants WHERE owner_id = auth.uid())
  )
  WITH CHECK (
    tenant_id IN (SELECT id FROM tenants WHERE owner_id = auth.uid())
  );

-- RLS Policy: Tables - Owner read/write
CREATE POLICY "Tenant owner can view tables" ON tables
  FOR SELECT USING (
    tenant_id IN (SELECT id FROM tenants WHERE owner_id = auth.uid())
  );

CREATE POLICY "Tenant owner can manage tables" ON tables
  FOR ALL USING (
    tenant_id IN (SELECT id FROM tenants WHERE owner_id = auth.uid())
  )
  WITH CHECK (
    tenant_id IN (SELECT id FROM tenants WHERE owner_id = auth.uid())
  );

-- RLS Policy: Customers - Owner read/write
CREATE POLICY "Tenant owner can view customers" ON customers
  FOR SELECT USING (
    tenant_id IN (SELECT id FROM tenants WHERE owner_id = auth.uid())
  );

CREATE POLICY "Tenant owner can manage customers" ON customers
  FOR ALL USING (
    tenant_id IN (SELECT id FROM tenants WHERE owner_id = auth.uid())
  )
  WITH CHECK (
    tenant_id IN (SELECT id FROM tenants WHERE owner_id = auth.uid())
  );

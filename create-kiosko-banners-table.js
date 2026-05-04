#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

// Get Supabase credentials - first try env vars, then fall back to .env.local
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://csdooyggiuhzovehykna.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseKey) {
  console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY not found in environment variables');
  console.log('Please set the SUPABASE_SERVICE_ROLE_KEY environment variable');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const sql = `
CREATE TABLE IF NOT EXISTS kiosko_banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  image_url TEXT NOT NULL,
  link_url TEXT,
  sort_order INT DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_kiosko_banners_tenant ON kiosko_banners(tenant_id);
CREATE INDEX IF NOT EXISTS idx_kiosko_banners_active ON kiosko_banners(active);

ALTER TABLE kiosko_banners ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Kiosko banners are public" ON kiosko_banners;
DROP POLICY IF EXISTS "Tenant owner can manage banners" ON kiosko_banners;

CREATE POLICY "Kiosko banners are public" ON kiosko_banners
  FOR SELECT USING (active = true);

CREATE POLICY "Tenant owner can manage banners" ON kiosko_banners
  FOR ALL USING (
    auth.uid() IN (SELECT user_id FROM tenants WHERE id = kiosko_banners.tenant_id)
  );
`;

(async () => {
  try {
    console.log('🔄 Creating kiosko_banners table...');

    const { data, error } = await supabase.rpc('exec_sql', {
      sql: sql
    }).catch(async () => {
      // If rpc doesn't exist, try direct SQL execution through REST API
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`,
          'apikey': supabaseKey,
        },
        body: JSON.stringify({ sql })
      });

      if (!response.ok) {
        throw new Error(`SQL execution failed: ${response.statusText}`);
      }

      return response.json();
    });

    if (error) {
      throw error;
    }

    console.log('✅ Table created successfully!');
    console.log('ℹ️ The kiosko_banners table is now available in Supabase');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();

#!/usr/bin/env node
/**
 * Automated setup script for subscription management system
 * Executes database migrations and cron job configuration
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
const CRON_SECRET = 'sk_sub_cron_b4fe84978b27b0e79875c1fba63ee4d94fcbd9d00629153f064872f31b246c3f';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing environment variables: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  console.error('Make sure .env.local is properly configured');
  process.exit(1);
}

async function executeSQL(query) {
  return new Promise((resolve, reject) => {
    const projectId = SUPABASE_URL.split('//')[1].split('.')[0];
    const hostname = 'api.supabase.com';
    const path = `/v1/projects/${projectId}/database/query`;

    const options = {
      hostname,
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(JSON.parse(data));
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.write(JSON.stringify({ query }));
    req.end();
  });
}

async function main() {
  console.log('🚀 Setting up Subscription Management System\n');

  try {
    // Step 1: Read migration SQL
    console.log('📁 Reading migrations...');
    const migrationFile = path.join(__dirname, 'migrations/complete_subscription_setup.sql');
    const migrationSQL = fs.readFileSync(migrationFile, 'utf8');

    // Step 2: Execute migrations
    console.log('🔧 Executing database migrations...');
    try {
      const result = await executeSQL(migrationSQL);
      console.log('✅ Database migrations completed');
      console.log('   - audit_logs table created');
      console.log('   - Notification columns added to tenants');
    } catch (error) {
      console.warn('⚠️  Migration execution: ' + error.message);
      console.log('   → You may need to run migrations manually in Supabase SQL Editor');
      console.log('   → See MIGRATION_INSTRUCTIONS.md for details');
    }

    // Step 3: Show CRON_SECRET configuration
    console.log('\n🔐 Cron Job Configuration:');
    console.log('   CRON_SECRET=' + CRON_SECRET);
    console.log('\n   Add this to Vercel Environment Variables:');
    console.log('   1. Go to https://vercel.com/dashboard/restaurant-saas');
    console.log('   2. Settings → Environment Variables');
    console.log('   3. Add: CRON_SECRET = ' + CRON_SECRET);
    console.log('   4. Apply to Production and Preview');

    // Step 4: Show cron job setup instructions
    console.log('\n⏰ Cron Jobs:');
    console.log('   Use EasyCron.com or Vercel Crons to schedule:');
    console.log('   • Daily 2 AM: /api/cron/send-notifications');
    console.log('   • Daily 3 AM: /api/cron/retry-failed-payments');
    console.log('   See MIGRATION_INSTRUCTIONS.md for complete setup');

    console.log('\n✨ Setup complete! Next steps:');
    console.log('   1. Add CRON_SECRET to Vercel');
    console.log('   2. Configure cron jobs');
    console.log('   3. Test with: npm run test:cron');
    console.log('   4. Monitor: https://vercel.com/dashboard/restaurant-saas/deployments');

  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  }
}

main();

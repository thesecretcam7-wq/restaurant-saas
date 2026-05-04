import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const url = 'https://csdooyggiuhzovehykna.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNzZG9veWdnaXVoem92ZWh5a25hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTA3NTc0MCwiZXhwIjoyMDkwNjUxNzQwfQ.jeHFpXe9ISgBR1FD6FLjpOxSkq7Zl1A429E7ZtU1lLQ';

const supabase = createClient(url, serviceKey);

async function executeMigrations() {
  try {
    console.log('🚀 Ejecutando migraciones...\n');

    // Read migration files
    const migration1 = fs.readFileSync('./supabase/migrations/007_printer_devices.sql', 'utf-8');
    const migration2 = fs.readFileSync('./supabase/migrations/007b_extend_restaurant_settings.sql', 'utf-8');

    // Execute first migration
    console.log('📝 Ejecutando: 007_printer_devices.sql');
    const { error: error1 } = await supabase.rpc('exec_sql', { query: migration1 }).select();
    
    if (error1) {
      console.log('⚠️  Nota: Este error es esperado si las tablas ya existen');
      console.log(`   Error: ${error1.message}`);
    } else {
      console.log('✅ Migración 1 completada exitosamente\n');
    }

    // Execute second migration
    console.log('📝 Ejecutando: 007b_extend_restaurant_settings.sql');
    const { error: error2 } = await supabase.rpc('exec_sql', { query: migration2 }).select();
    
    if (error2) {
      console.log('⚠️  Nota: Este error es esperado si las columnas ya existen');
      console.log(`   Error: ${error2.message}`);
    } else {
      console.log('✅ Migración 2 completada exitosamente\n');
    }

    console.log('🎉 ¡Migraciones ejecutadas!');
  } catch (err) {
    console.error('❌ Error:', err);
  }
}

executeMigrations();

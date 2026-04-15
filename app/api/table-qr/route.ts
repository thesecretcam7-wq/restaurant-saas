import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import QRCode from 'qrcode';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function generateUniqueCode() {
  return Math.random().toString(36).substring(2, 15).toUpperCase();
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get('tenantId');

  if (!tenantId) {
    return NextResponse.json({ error: 'Missing tenantId' }, { status: 400 });
  }

  try {
    const { data, error } = await supabase
      .from('table_qr_codes')
      .select('*, tables(*)')
      .eq('tenant_id', tenantId)
      .eq('is_active', true);

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching QR codes:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tenantId, tableId, siteUrl } = body;

    if (!tenantId || !tableId) {
      return NextResponse.json(
        { error: 'Missing required fields: tenantId, tableId' },
        { status: 400 }
      );
    }

    // Check if QR code already exists for this table
    const { data: existingQR } = await supabase
      .from('table_qr_codes')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('table_id', tableId)
      .single();

    if (existingQR && existingQR.is_active) {
      return NextResponse.json(existingQR);
    }

    // Generate unique code
    const uniqueCode = generateUniqueCode();
    const qrUrl = `${siteUrl || 'https://localhost:3000'}/order/${uniqueCode}`;

    // Generate QR code image
    const qrCodeDataUrl = await QRCode.toDataURL(qrUrl, {
      width: 300,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });

    // Save to database
    const { data, error } = await supabase
      .from('table_qr_codes')
      .insert([
        {
          tenant_id: tenantId,
          table_id: tableId,
          qr_code_data: qrCodeDataUrl,
          unique_code: uniqueCode,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Error creating QR code:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

function generateInvoiceNumber(prefix: string, number: number) {
  return `${prefix}-${String(number).padStart(6, '0')}`;
}

export async function GET(request: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get('tenantId');
  const orderId = searchParams.get('orderId');

  if (!tenantId) {
    return NextResponse.json({ error: 'Missing tenantId' }, { status: 400 });
  }

  try {
    let query = supabase.from('invoices').select('*').eq('tenant_id', tenantId);

    if (orderId) {
      query = query.eq('order_id', orderId);
    }

    const { data, error } = await query.order('invoice_date', { ascending: false });

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching invoices:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  try {
    const body = await request.json();
    const { tenantId, orderId } = body;

    if (!tenantId || !orderId) {
      return NextResponse.json(
        { error: 'Missing required fields: tenantId, orderId' },
        { status: 400 }
      );
    }

    // Fetch order details
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .eq('tenant_id', tenantId)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Check if invoice already exists for this order
    const { data: existingInvoice } = await supabase
      .from('invoices')
      .select('id')
      .eq('order_id', orderId)
      .single();

    if (existingInvoice) {
      return NextResponse.json({ error: 'Invoice already exists' }, { status: 400 });
    }

    // Get invoice settings
    const { data: settings } = await supabase
      .from('invoice_settings')
      .select('*')
      .eq('tenant_id', tenantId)
      .single();

    const prefix = settings?.invoice_prefix || 'INV';
    const nextNumber = (settings?.current_invoice_number || 1000) + 1;
    const invoiceNumber = generateInvoiceNumber(prefix, nextNumber);

    // Create invoice
    const invoiceData = {
      tenant_id: tenantId,
      order_id: orderId,
      invoice_number: invoiceNumber,
      customer_name: order.customer_name,
      customer_email: order.customer_email,
      subtotal: order.subtotal,
      tax_amount: order.tax,
      total: order.total,
      items: order.items,
      payment_status: 'pending',
      notes: order.notes,
    };

    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .insert([invoiceData])
      .select()
      .single();

    if (invoiceError) throw invoiceError;

    // Update invoice settings with next number
    if (settings) {
      await supabase
        .from('invoice_settings')
        .update({ current_invoice_number: nextNumber })
        .eq('tenant_id', tenantId);
    } else {
      // Create default settings if they don't exist
      await supabase.from('invoice_settings').insert([
        {
          tenant_id: tenantId,
          current_invoice_number: nextNumber,
        },
      ]);
    }

    return NextResponse.json(invoice, { status: 201 });
  } catch (error) {
    console.error('Error creating invoice:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

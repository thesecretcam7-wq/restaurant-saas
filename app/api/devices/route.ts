/**
 * API route for managing printer devices
 * GET /api/devices - List devices for tenant
 * POST /api/devices - Create new device
 * PUT /api/devices/:id - Update device config
 * DELETE /api/devices/:id - Delete device
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireTenantAccess, tenantAuthErrorResponse } from '@/lib/tenant-api-auth';
import { writeAuditLog } from '@/lib/audit-log';

function isBrowserDriverDevice(device: any) {
  return device?.config?.connection_mode === 'browser_driver' || (!device?.vendor_id && !device?.product_id);
}

function dedupeBrowserDriverDevices(devices: any[] = []) {
  const browserDriverDevices = devices.filter(isBrowserDriverDevice);
  const selectedBrowserDriver = browserDriverDevices.find((device) => device.is_default) || browserDriverDevices[0];
  const directDevices = devices.filter((device) => !isBrowserDriverDevice(device));

  return selectedBrowserDriver ? [selectedBrowserDriver, ...directDevices] : directDevices;
}

export async function GET(request: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  try {
    // Get tenant ID from auth or query params
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');

    if (!tenantId) {
      return NextResponse.json(
        { error: 'tenantId requerido' },
        { status: 400 }
      );
    }

    const access = await requireTenantAccess(tenantId, { staffRoles: ['admin'], requireAdminPermission: true });

    // Fetch devices for this tenant
    const { data: devices, error } = await supabase
      .from('printer_devices')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return NextResponse.json({ devices: dedupeBrowserDriverDevices(devices || []) });
  } catch (error) {
    if (error instanceof Error && ['Unauthorized', 'Forbidden'].includes(error.message)) {
      return tenantAuthErrorResponse(error);
    }
    console.error('Error fetching devices:', error);
    return NextResponse.json(
      { error: 'Error al obtener dispositivos' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  try {
    const body = await request.json();
    const { tenantId, name, device_type, vendor_id, product_id, serial_number, config, status } = body;

    if (!tenantId || !name) {
      return NextResponse.json(
        { error: 'tenantId y name son requeridos' },
        { status: 400 }
      );
    }

    const access = await requireTenantAccess(tenantId, { staffRoles: ['admin'], requireAdminPermission: true });

    const isBrowserDriver = config?.connection_mode === 'browser_driver' || (!vendor_id && !product_id);

    if (isBrowserDriver) {
      const { data: existingDevices, error: existingError } = await supabase
        .from('printer_devices')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (existingError) throw existingError;

      const existingBrowserDriver = dedupeBrowserDriverDevices(existingDevices || []).find(isBrowserDriverDevice);

      if (existingBrowserDriver) {
        const { data: updatedDevice, error: updateError } = await supabase
          .from('printer_devices')
          .update({
            name,
            device_type: device_type || existingBrowserDriver.device_type || 'receipt',
            status: 'connected',
            config: {
              ...(existingBrowserDriver.config || {}),
              ...(config || {}),
              connection_mode: 'browser_driver',
              browser_printer_name: 'default',
            },
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingBrowserDriver.id)
          .eq('tenant_id', tenantId)
          .select()
          .single();

        if (updateError) throw updateError;

        await writeAuditLog(supabase, {
          tenantId,
          actor: access,
          action: 'printer.updated',
          entityType: 'printer_device',
          entityId: updatedDevice.id,
          reason: 'Configuracion de impresora de Windows actualizada',
          metadata: { name, reused: true },
        });

        return NextResponse.json({ device: updatedDevice, reused: true }, { status: 200 });
      }
    }

    // Insert new device
    const { data: device, error } = await supabase
      .from('printer_devices')
      .insert({
        tenant_id: tenantId,
        name,
        device_type: device_type || 'receipt',
        vendor_id,
        product_id,
        serial_number,
        status: status || (vendor_id && product_id ? 'connected' : 'disconnected'),
        config: config || {
          paper_width: 80,
          auto_print: true,
          copies: 1,
          print_on_status: 'confirmed',
          connection_mode: vendor_id && product_id ? 'webusb' : 'browser_driver',
        },
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Log device creation
    await supabase.from('printer_logs').insert({
      tenant_id: tenantId,
      device_id: device.id,
      action: 'connect',
      status: 'success',
      details: { name },
    });

    await writeAuditLog(supabase, {
      tenantId,
      actor: access,
      action: 'printer.created',
      entityType: 'printer_device',
      entityId: device.id,
      reason: 'Impresora agregada',
      metadata: { name, device_type: device.device_type, connection_mode: device.config?.connection_mode },
    });

    return NextResponse.json({ device }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && ['Unauthorized', 'Forbidden'].includes(error.message)) {
      return tenantAuthErrorResponse(error);
    }
    console.error('Error creating device:', error);
    const errorMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: `Error al crear dispositivo: ${errorMsg}` },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  try {
    const { searchParams } = new URL(request.url);
    const deviceId = searchParams.get('id');

    if (!deviceId) {
      return NextResponse.json(
        { error: 'id requerido' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { tenantId, ...updateData } = body;

    if (!tenantId) {
      return NextResponse.json(
        { error: 'tenantId requerido' },
        { status: 400 }
      );
    }

    const access = await requireTenantAccess(tenantId, { staffRoles: ['admin'], requireAdminPermission: true });

    // Update device
    const { data: device, error } = await supabase
      .from('printer_devices')
      .update({
        ...updateData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', deviceId)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Log update
    await supabase.from('printer_logs').insert({
      tenant_id: tenantId,
      device_id: deviceId,
      action: 'config',
      status: 'success',
      details: updateData,
    });

    await writeAuditLog(supabase, {
      tenantId,
      actor: access,
      action: 'printer.updated',
      entityType: 'printer_device',
      entityId: deviceId,
      reason: 'Configuracion de impresora actualizada',
      metadata: updateData,
    });

    return NextResponse.json({ device });
  } catch (error) {
    if (error instanceof Error && ['Unauthorized', 'Forbidden'].includes(error.message)) {
      return tenantAuthErrorResponse(error);
    }
    console.error('Error updating device:', error);
    return NextResponse.json(
      { error: 'Error al actualizar dispositivo' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  try {
    const { searchParams } = new URL(request.url);
    const deviceId = searchParams.get('id');
    const tenantId = searchParams.get('tenantId');

    if (!deviceId || !tenantId) {
      return NextResponse.json(
        { error: 'id y tenantId requeridos' },
        { status: 400 }
      );
    }

    const access = await requireTenantAccess(tenantId, { staffRoles: ['admin'], requireAdminPermission: true });

    // Clear references before deleting. Otherwise default/kitchen printer foreign keys can block deletion.
    await supabase
      .from('restaurant_settings')
      .update({
        default_receipt_printer_id: null,
        kitchen_printer_id: null,
        printer_updated_at: new Date().toISOString(),
      })
      .eq('tenant_id', tenantId)
      .or(`default_receipt_printer_id.eq.${deviceId},kitchen_printer_id.eq.${deviceId}`);

    // Delete device
    const { error } = await supabase
      .from('printer_devices')
      .delete()
      .eq('id', deviceId)
      .eq('tenant_id', tenantId);

    if (error) {
      throw error;
    }

    // Log deletion
    await supabase.from('printer_logs').insert({
      tenant_id: tenantId,
      device_id: deviceId,
      action: 'disconnect',
      status: 'success',
    });

    await writeAuditLog(supabase, {
      tenantId,
      actor: access,
      action: 'printer.deleted',
      entityType: 'printer_device',
      entityId: deviceId,
      reason: 'Impresora eliminada',
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && ['Unauthorized', 'Forbidden'].includes(error.message)) {
      return tenantAuthErrorResponse(error);
    }
    console.error('Error deleting device:', error);
    return NextResponse.json(
      { error: 'Error al eliminar dispositivo' },
      { status: 500 }
    );
  }
}

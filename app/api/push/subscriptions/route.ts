import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { requireTenantAccess, tenantAuthErrorResponse } from '@/lib/tenant-api-auth';

export const runtime = 'nodejs';

type BrowserPushSubscription = {
  endpoint?: string;
  expirationTime?: number | null;
  keys?: {
    p256dh?: string;
    auth?: string;
  };
};

function validateSubscription(subscription: BrowserPushSubscription | null | undefined) {
  if (!subscription?.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
    return null;
  }

  return {
    endpoint: subscription.endpoint,
    p256dh: subscription.keys.p256dh,
    auth: subscription.keys.auth,
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tenantId, subscription } = body as {
      tenantId?: string;
      subscription?: BrowserPushSubscription;
    };

    if (!tenantId) {
      return NextResponse.json({ error: 'Missing tenantId' }, { status: 400 });
    }

    const validated = validateSubscription(subscription);
    if (!validated) {
      return NextResponse.json({ error: 'Invalid push subscription' }, { status: 400 });
    }

    const access = await requireTenantAccess(tenantId, { staffRoles: ['camarero', 'admin'] });
    const supabase = createServiceClient();
    const now = new Date().toISOString();

    const { error } = await supabase
      .from('staff_push_subscriptions')
      .upsert(
        {
          tenant_id: tenantId,
          staff_id: access.type === 'staff' ? access.staffId || null : null,
          role: access.type === 'staff' ? access.role || 'camarero' : 'owner',
          endpoint: validated.endpoint,
          subscription,
          p256dh: validated.p256dh,
          auth: validated.auth,
          user_agent: request.headers.get('user-agent'),
          disabled_at: null,
          last_error: null,
          last_seen_at: now,
          updated_at: now,
        },
        { onConflict: 'endpoint' }
      );

    if (error) {
      console.error('[push] subscription upsert error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && ['Unauthorized', 'Forbidden'].includes(error.message)) {
      return tenantAuthErrorResponse(error);
    }
    console.error('[push] subscription POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { tenantId, endpoint } = body as { tenantId?: string; endpoint?: string };

    if (!tenantId || !endpoint) {
      return NextResponse.json({ error: 'Missing tenantId or endpoint' }, { status: 400 });
    }

    await requireTenantAccess(tenantId, { staffRoles: ['camarero', 'admin'] });
    const supabase = createServiceClient();

    const { error } = await supabase
      .from('staff_push_subscriptions')
      .update({
        disabled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('tenant_id', tenantId)
      .eq('endpoint', endpoint);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && ['Unauthorized', 'Forbidden'].includes(error.message)) {
      return tenantAuthErrorResponse(error);
    }
    console.error('[push] subscription DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

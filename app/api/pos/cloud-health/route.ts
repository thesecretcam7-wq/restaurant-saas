import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const POS_CLOUD_HEALTH_TIMEOUT_MS = 1800;
const POS_CLOUD_HEALTH_SUCCESS_CACHE_MS = 10_000;
const POS_CLOUD_HEALTH_FAILURE_CACHE_MS = 60_000;

type CachedHealth = {
  ok: boolean;
  status: number;
  body: Record<string, unknown>;
  expiresAt: number;
};

type GlobalWithPOSHealth = typeof globalThis & {
  __eccofoodPOSCloudHealth?: Map<string, CachedHealth>;
};

const globalForPOSHealth = globalThis as GlobalWithPOSHealth;
const healthCache = globalForPOSHealth.__eccofoodPOSCloudHealth ?? new Map<string, CachedHealth>();
globalForPOSHealth.__eccofoodPOSCloudHealth = healthCache;

function withAbort(query: any, signal: AbortSignal) {
  return typeof query.abortSignal === 'function' ? query.abortSignal(signal) : query;
}

function cacheAndRespond(tenantId: string, health: Omit<CachedHealth, 'expiresAt'>, ttlMs: number) {
  const cachedHealth: CachedHealth = {
    ...health,
    expiresAt: Date.now() + ttlMs,
  };
  healthCache.set(tenantId, cachedHealth);

  return NextResponse.json(cachedHealth.body, {
    status: cachedHealth.status,
    headers: { 'Cache-Control': 'no-store' },
  });
}

export async function GET(request: NextRequest) {
  const tenantId = request.nextUrl.searchParams.get('tenantId')?.trim();

  if (!tenantId) {
    return NextResponse.json({ ok: false, error: 'Missing tenantId' }, { status: 400 });
  }

  const cached = healthCache.get(tenantId);
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json({ ...cached.body, cached: true }, {
      status: cached.status,
      headers: { 'Cache-Control': 'no-store' },
    });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), POS_CLOUD_HEALTH_TIMEOUT_MS);

  try {
    const supabase = createServiceClient();
    const { data, error } = await withAbort(
      supabase
        .from('tenants')
        .select('id')
        .eq('id', tenantId)
        .maybeSingle(),
      controller.signal
    );

    if (error) {
      const errorText = `${error.name || ''}: ${error.message || ''}`;
      const isTimeout = errorText.toLowerCase().includes('abort') || errorText.toLowerCase().includes('timeout');
      return cacheAndRespond(
        tenantId,
        {
          ok: false,
          status: isTimeout ? 504 : 503,
          body: { ok: false, error: isTimeout ? 'Supabase timeout' : error.message || 'Supabase unavailable' },
        },
        POS_CLOUD_HEALTH_FAILURE_CACHE_MS
      );
    }

    if (!data?.id) {
      return cacheAndRespond(
        tenantId,
        { ok: false, status: 404, body: { ok: false, error: 'Tenant not found' } },
        POS_CLOUD_HEALTH_FAILURE_CACHE_MS
      );
    }

    return cacheAndRespond(
      tenantId,
      { ok: true, status: 200, body: { ok: true } },
      POS_CLOUD_HEALTH_SUCCESS_CACHE_MS
    );
  } catch (error) {
    const errorText = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
    const isAbort = errorText.toLowerCase().includes('abort') || errorText.toLowerCase().includes('timeout');
    return cacheAndRespond(
      tenantId,
      {
        ok: false,
        status: isAbort ? 504 : 503,
        body: {
          ok: false,
          error: isAbort ? 'Supabase timeout' : error instanceof Error ? error.message : 'Supabase unavailable',
        },
      },
      POS_CLOUD_HEALTH_FAILURE_CACHE_MS
    );
  } finally {
    clearTimeout(timeout);
  }
}

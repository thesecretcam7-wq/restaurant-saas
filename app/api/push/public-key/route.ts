import { NextResponse } from 'next/server';
import { getWebPushPublicKey, isWebPushConfigured } from '@/lib/push-server';

export const runtime = 'nodejs';

export async function GET() {
  return NextResponse.json(
    {
      publicKey: getWebPushPublicKey(),
      configured: isWebPushConfigured(),
    },
    {
      headers: {
        'Cache-Control': 'no-store',
      },
    }
  );
}

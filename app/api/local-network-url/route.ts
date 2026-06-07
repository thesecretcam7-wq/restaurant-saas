import { networkInterfaces } from 'os';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

function isUsableAddress(address: string) {
  return !address.startsWith('127.') && !address.startsWith('169.254.');
}

export async function GET(request: NextRequest) {
  const port = request.nextUrl.port || process.env.PORT || '3000';
  const interfaces = networkInterfaces();
  const addresses = Object.values(interfaces)
    .flatMap((items) => items || [])
    .filter((item) => item.family === 'IPv4' && !item.internal && isUsableAddress(item.address))
    .map((item) => item.address);

  const address = addresses[0] || request.nextUrl.hostname;

  return NextResponse.json({
    baseUrl: `http://${address}:${port}`,
  });
}

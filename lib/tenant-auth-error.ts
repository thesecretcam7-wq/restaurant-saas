import { NextResponse } from 'next/server'

export class TenantAuthError extends Error {
  constructor(message: string, public status: number) {
    super(message)
    this.name = 'TenantAuthError'
  }
}
export function tenantAuthErrorResponse(error: unknown) {
  if (error instanceof TenantAuthError) {
    return NextResponse.json({
      error: error.status >= 500 ? 'No se pudo verificar el acceso. El servicio no responde; intenta de nuevo en unos segundos.' : error.message,
    }, { status: error.status, headers: { 'Cache-Control': 'private, no-store' } })
  }
  return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: { 'Cache-Control': 'private, no-store' } })
}

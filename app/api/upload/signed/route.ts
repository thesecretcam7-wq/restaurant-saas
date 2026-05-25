import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { requireTenantAccess, tenantAuthErrorResponse } from '@/lib/tenant-api-auth'

const ALLOWED_BUCKETS = new Set(['images', 'product-images'])
const IMAGE_LIMIT = 8 * 1024 * 1024
const VIDEO_LIMIT = 80 * 1024 * 1024

function safeExtension(fileName: string, fallbackType: string) {
  const ext = fileName.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '')
  if (ext) return ext
  if (fallbackType.includes('png')) return 'png'
  if (fallbackType.includes('webp')) return 'webp'
  if (fallbackType.includes('gif')) return 'gif'
  if (fallbackType.includes('mp4')) return 'mp4'
  if (fallbackType.includes('webm')) return 'webm'
  if (fallbackType.includes('quicktime')) return 'mov'
  return 'jpg'
}

export async function POST(request: NextRequest) {
  try {
    const { tenantId, bucket = 'images', fileName, contentType, size } = await request.json()

    if (!tenantId) return NextResponse.json({ error: 'tenantId requerido' }, { status: 400 })
    if (!fileName || !contentType || !Number.isFinite(Number(size))) {
      return NextResponse.json({ error: 'Datos del archivo incompletos' }, { status: 400 })
    }
    if (!ALLOWED_BUCKETS.has(bucket)) {
      return NextResponse.json({ error: 'Bucket no permitido' }, { status: 400 })
    }

    await requireTenantAccess(tenantId, { staffRoles: ['admin'], requireAdminPermission: true })

    const isImage = String(contentType).startsWith('image/')
    const isVideo = String(contentType).startsWith('video/')
    if (!isImage && !isVideo) {
      return NextResponse.json({ error: 'Solo se permiten imagenes o videos' }, { status: 400 })
    }

    const maxSize = isVideo ? VIDEO_LIMIT : IMAGE_LIMIT
    if (Number(size) > maxSize) {
      return NextResponse.json({ error: isVideo ? 'El video supera 80MB' : 'La imagen supera 8MB' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const ext = safeExtension(String(fileName), String(contentType))
    const path = `${tenantId}/${Date.now()}-${randomUUID()}.${ext}`
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUploadUrl(path)

    if (error || !data?.token) {
      return NextResponse.json({ error: error?.message || 'No se pudo preparar la subida' }, { status: 500 })
    }

    const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(path)

    return NextResponse.json({
      bucket,
      path,
      token: data.token,
      publicUrl,
    })
  } catch (error) {
    if (error instanceof Error && ['Unauthorized', 'Forbidden'].includes(error.message)) {
      return tenantAuthErrorResponse(error)
    }
    console.error('Signed upload error:', error)
    return NextResponse.json({ error: 'Error al preparar la subida' }, { status: 500 })
  }
}

import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { requireTenantAccess, tenantAuthErrorResponse } from '@/lib/tenant-api-auth'

const ALLOWED_BUCKETS = new Set(['images', 'product-images'])
const IMAGE_LIMIT = 8 * 1024 * 1024
const VIDEO_LIMIT = 30 * 1024 * 1024

function safeExtension(fileName: string, fallbackType: string) {
  const ext = fileName.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '')
  if (ext) return ext
  if (fallbackType.includes('png')) return 'png'
  if (fallbackType.includes('webp')) return 'webp'
  if (fallbackType.includes('gif')) return 'gif'
  if (fallbackType.includes('mp4')) return 'mp4'
  if (fallbackType.includes('webm')) return 'webm'
  return 'jpg'
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const bucket = String(formData.get('bucket') || 'images')
    const tenantId = String(formData.get('tenantId') || '')

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    if (!tenantId) return NextResponse.json({ error: 'tenantId requerido' }, { status: 400 })
    if (!ALLOWED_BUCKETS.has(bucket)) return NextResponse.json({ error: 'Bucket no permitido' }, { status: 400 })

    await requireTenantAccess(tenantId, { staffRoles: ['admin'], requireAdminPermission: true })

    const isImage = file.type.startsWith('image/')
    const isVideo = file.type.startsWith('video/')
    if (!isImage && !isVideo) {
      return NextResponse.json({ error: 'Solo se permiten imagenes o videos' }, { status: 400 })
    }

    const maxSize = isVideo ? VIDEO_LIMIT : IMAGE_LIMIT
    if (file.size > maxSize) {
      return NextResponse.json({ error: isVideo ? 'El video supera 30MB' : 'La imagen supera 8MB' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const ext = safeExtension(file.name, file.type)
    const fileName = `${tenantId}/${Date.now()}-${randomUUID()}.${ext}`
    const buffer = Buffer.from(await file.arrayBuffer())

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: false,
      })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(data.path)

    return NextResponse.json({ url: publicUrl })
  } catch (error) {
    if (error instanceof Error && ['Unauthorized', 'Forbidden'].includes(error.message)) {
      return tenantAuthErrorResponse(error)
    }
    console.error('Upload error:', error)
    return NextResponse.json({ error: 'Error al subir archivo' }, { status: 500 })
  }
}

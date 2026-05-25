import { createClient } from '@/lib/supabase/client'

async function uploadTenantMediaViaServer({
  file,
  bucket,
  tenantId,
}: {
  file: File
  bucket: 'images' | 'product-images'
  tenantId: string
}) {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('bucket', bucket)
  formData.append('tenantId', tenantId)

  const res = await fetch('/api/upload', {
    method: 'POST',
    credentials: 'include',
    body: formData,
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'No se pudo subir la imagen')

  return data.url as string
}

export async function uploadTenantMedia({
  file,
  bucket,
  tenantId,
}: {
  file: File
  bucket: 'images' | 'product-images'
  tenantId: string
}) {
  let prepareRes: Response

  try {
    prepareRes = await fetch('/api/upload/signed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        tenantId,
        bucket,
        fileName: file.name,
        contentType: file.type,
        size: file.size,
      }),
    })
  } catch {
    return uploadTenantMediaViaServer({ file, bucket, tenantId })
  }

  const prepared = await prepareRes.json()
  if (!prepareRes.ok) throw new Error(prepared.error || 'No se pudo preparar la subida')

  const supabase = createClient()
  try {
    const { error } = await supabase.storage
      .from(prepared.bucket)
      .uploadToSignedUrl(prepared.path, prepared.token, file, {
        contentType: file.type,
      })

    if (error) throw new Error(error.message)
  } catch {
    return uploadTenantMediaViaServer({ file, bucket, tenantId })
  }

  return prepared.publicUrl as string
}

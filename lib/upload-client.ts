import { createClient } from '@/lib/supabase/client'

export async function uploadTenantMedia({
  file,
  bucket,
  tenantId,
}: {
  file: File
  bucket: 'images' | 'product-images'
  tenantId: string
}) {
  const prepareRes = await fetch('/api/upload/signed', {
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

  const prepared = await prepareRes.json()
  if (!prepareRes.ok) throw new Error(prepared.error || 'No se pudo preparar la subida')

  const supabase = createClient()
  const { error } = await supabase.storage
    .from(prepared.bucket)
    .uploadToSignedUrl(prepared.path, prepared.token, file, {
      contentType: file.type,
    })

  if (error) throw new Error(error.message)

  return prepared.publicUrl as string
}

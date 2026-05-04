/**
 * Image URL validation and security
 * Prevents loading images from untrusted sources
 */

// Whitelist of trusted image domains
const TRUSTED_IMAGE_DOMAINS = [
  'https://images.unsplash.com',
  'https://images.pexels.com',
  'https://cdn.shopify.com',
  'https://storage.googleapis.com', // For Supabase Storage
  process.env.NEXT_PUBLIC_SUPABASE_URL, // Supabase domain
  'localhost',
  '127.0.0.1',
]

/**
 * Validate if an image URL is safe to use
 * Checks against whitelist and validates URL format
 */
export function isValidImageUrl(url: string | null): boolean {
  if (!url) return false

  try {
    // Ensure it's a valid URL
    const parsedUrl = new URL(url)

    // Only allow HTTPS in production
    if (process.env.NODE_ENV === 'production' && parsedUrl.protocol !== 'https:') {
      console.warn(`[ImageValidator] Non-HTTPS image URL blocked: ${url}`)
      return false
    }

    // Check against whitelist
    const isTrusted = TRUSTED_IMAGE_DOMAINS.some(
      domain => domain && url.includes(domain)
    )

    if (!isTrusted) {
      console.warn(`[ImageValidator] Untrusted image domain: ${parsedUrl.hostname}`)
      return false
    }

    return true
  } catch {
    console.warn(`[ImageValidator] Invalid image URL: ${url}`)
    return false
  }
}

/**
 * Sanitize image URL
 * Returns safe URL or placeholder if invalid
 */
export function sanitizeImageUrl(
  url: string | null | undefined,
  placeholder?: string
): string | null {
  if (!url) return placeholder || null

  if (!isValidImageUrl(url)) {
    console.warn(`[ImageValidator] Using placeholder for blocked URL: ${url}`)
    return placeholder || null
  }

  return url
}

/**
 * Validate image dimensions (prevent huge uploads)
 */
export function isValidImageDimensions(
  width: number | undefined,
  height: number | undefined,
  maxWidth: number = 2048,
  maxHeight: number = 2048
): boolean {
  if (!width || !height) return true // Not specified, assume OK

  return width > 0 && height > 0 && width <= maxWidth && height <= maxHeight
}

/**
 * Get safe image dimensions with aspect ratio preservation
 */
export function getSafeImageDimensions(
  originalWidth: number,
  originalHeight: number,
  maxWidth: number = 800,
  maxHeight: number = 600
): { width: number; height: number } {
  if (originalWidth <= maxWidth && originalHeight <= maxHeight) {
    return { width: originalWidth, height: originalHeight }
  }

  const aspectRatio = originalWidth / originalHeight

  if (originalWidth > originalHeight) {
    // Landscape
    return {
      width: maxWidth,
      height: Math.round(maxWidth / aspectRatio),
    }
  } else {
    // Portrait
    return {
      width: Math.round(maxHeight * aspectRatio),
      height: maxHeight,
    }
  }
}

/**
 * Validate image file upload
 */
export function validateImageUpload(
  file: File,
  maxSizeMB: number = 5,
  allowedMimes: string[] = ['image/jpeg', 'image/png', 'image/webp', 'image/avif']
): { valid: boolean; error?: string } {
  // Check file size
  const maxSizeBytes = maxSizeMB * 1024 * 1024
  if (file.size > maxSizeBytes) {
    return {
      valid: false,
      error: `Image too large (max ${maxSizeMB}MB)`,
    }
  }

  // Check MIME type
  if (!allowedMimes.includes(file.type)) {
    return {
      valid: false,
      error: `Invalid image format. Allowed: ${allowedMimes.join(', ')}`,
    }
  }

  return { valid: true }
}

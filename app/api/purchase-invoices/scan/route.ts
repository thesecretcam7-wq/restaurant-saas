import { NextRequest, NextResponse } from 'next/server'
import { requireTenantAccess, tenantAuthErrorResponse } from '@/lib/tenant-api-auth'

export const maxDuration = 45

function normalizeText(value: unknown) {
  return String(value || '').trim()
}

function extractOutputText(response: any) {
  if (typeof response?.output_text === 'string') return response.output_text
  const content = response?.output?.flatMap((item: any) => item?.content || []) || []
  const textPart = content.find((part: any) => typeof part?.text === 'string')
  return textPart?.text || ''
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function invoiceScanPayload(imageDataUrls: string[], model: string) {
  return {
    model,
    input: [
      {
        role: 'user',
        content: [
          {
            type: 'input_text',
            text:
              'Extrae los datos de esta factura de compra de un bar/restaurante. ' +
              'La factura puede venir en varias fotos/paginas; leelas en orden y unifica todo en una sola factura. ' +
              'Devuelve solo datos visibles o inferidos con alta confianza. ' +
              'Para cada producto usa quantity como cantidad de bultos/unidades compradas, package_size como contenido por bulto, package_unit como unidad comparable, y line_total como total de esa linea. ' +
              'Si hay IVA/descuento pero no esta claro por linea, conserva el total visible de cada linea. Usa coma o punto indistintamente al leer precios.',
          },
          ...imageDataUrls.map((imageDataUrl) => ({
            type: 'input_image',
            image_url: imageDataUrl,
            detail: 'auto',
          })),
        ],
      },
    ],
    max_output_tokens: 2600,
    text: {
      format: {
        type: 'json_schema',
        name: 'supplier_invoice_scan',
        strict: true,
        schema: {
          type: 'object',
          additionalProperties: false,
          properties: {
            supplierName: { type: 'string' },
            invoiceNumber: { type: 'string' },
            invoiceDate: { type: 'string', description: 'Fecha en formato YYYY-MM-DD si se puede leer.' },
            notes: { type: 'string' },
            confidence: { type: 'number', minimum: 0, maximum: 1 },
            lines: {
              type: 'array',
              items: {
                type: 'object',
                additionalProperties: false,
                properties: {
                  productName: { type: 'string' },
                  quantity: { type: 'number' },
                  packageSize: { type: 'number' },
                  packageUnit: { type: 'string', enum: ['unidad', 'kg', 'litro', 'caja'] },
                  lineTotal: { type: 'number' },
                },
                required: ['productName', 'quantity', 'packageSize', 'packageUnit', 'lineTotal'],
              },
            },
          },
          required: ['supplierName', 'invoiceNumber', 'invoiceDate', 'notes', 'confidence', 'lines'],
        },
      },
    },
  }
}

async function callOpenAIInvoiceScan(apiKey: string, imageDataUrls: string[]) {
  const primaryModel = process.env.OPENAI_INVOICE_MODEL || 'gpt-4o-mini'
  const models = Array.from(new Set([primaryModel, 'gpt-4o']))
  let lastPayload: any = null
  let lastStatus = 500

  for (const model of models) {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(invoiceScanPayload(imageDataUrls, model)),
      })

      const payload = await response.json().catch(() => ({}))
      if (response.ok) return payload

      lastPayload = payload
      lastStatus = response.status
      const code = payload?.error?.code || payload?.error?.type
      const shouldRetry = response.status >= 500 || code === 'server_error'
      if (!shouldRetry) {
        return { __error: payload, __status: response.status }
      }
      await sleep(700)
    }
  }

  return { __error: lastPayload, __status: lastStatus }
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Para leer facturas con foto falta configurar la clave de OpenAI. Puedes registrar la compra manualmente mientras tanto.' },
        { status: 503 }
      )
    }

    const body = await request.json()
    const tenantId = normalizeText(body.tenantId)
    const imageDataUrls: string[] = Array.isArray(body.imageDataUrls)
      ? body.imageDataUrls.map(normalizeText).filter(Boolean)
      : [normalizeText(body.imageDataUrl)].filter(Boolean)

    if (!tenantId || imageDataUrls.length === 0) {
      return NextResponse.json({ error: 'Falta la imagen de la factura' }, { status: 400 })
    }

    if (imageDataUrls.length > 5) {
      return NextResponse.json({ error: 'Puedes cargar hasta 5 fotos por factura.' }, { status: 400 })
    }

    if (imageDataUrls.some((imageDataUrl) => !/^data:image\/(png|jpe?g|webp);base64,/i.test(imageDataUrl))) {
      return NextResponse.json({ error: 'Formato de imagen no soportado' }, { status: 400 })
    }

    const totalImageSize = imageDataUrls.reduce((sum: number, imageDataUrl: string) => sum + imageDataUrl.length, 0)
    if (totalImageSize > 12_000_000) {
      return NextResponse.json({ error: 'Las fotos son demasiado grandes. Intenta con fotos mas ligeras o carga menos hojas.' }, { status: 413 })
    }

    await requireTenantAccess(tenantId, { staffRoles: ['admin'], requireAdminPermission: true })

    const payload = await callOpenAIInvoiceScan(apiKey, imageDataUrls)
    if (payload?.__error) {
      console.error('OpenAI invoice scan error:', payload.__error)
      const openAIMessage = payload.__error?.error?.message || ''
      const friendlyError = /server_error|processing your request|help\.openai/i.test(openAIMessage)
        ? 'OpenAI tuvo un fallo temporal leyendo esta foto. Prueba otra vez o toma la foto mas cerca y con buena luz.'
        : openAIMessage || 'No se pudo leer la factura con IA'
      return NextResponse.json(
        { error: friendlyError },
        { status: payload.__status || 502 }
      )
    }

    const outputText = extractOutputText(payload)
    const parsed = JSON.parse(outputText)

    return NextResponse.json({
      invoice: {
        supplierName: normalizeText(parsed.supplierName),
        invoiceNumber: normalizeText(parsed.invoiceNumber),
        invoiceDate: normalizeText(parsed.invoiceDate),
        notes: normalizeText(parsed.notes),
        confidence: Number(parsed.confidence) || 0,
        lines: Array.isArray(parsed.lines) ? parsed.lines : [],
      },
    })
  } catch (error) {
    if (error instanceof Error && ['Unauthorized', 'Forbidden'].includes(error.message)) {
      return tenantAuthErrorResponse(error)
    }
    console.error('Error scanning purchase invoice:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'No se pudo leer la factura' },
      { status: 500 }
    )
  }
}

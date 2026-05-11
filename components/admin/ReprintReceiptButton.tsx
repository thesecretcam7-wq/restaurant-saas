'use client'

import { useState } from 'react'
import { Printer } from 'lucide-react'
import { printReceipt } from '@/lib/pos-printer'
import { formatPriceWithCurrency } from '@/lib/currency'
import type { ReceiptData } from '@/types/printer'

type ReprintReceiptButtonProps = {
  tenantId: string
  orderId: string
  orderNumber?: string | null
}

function printReceiptInBrowser(receipt: ReceiptData) {
  const format = (value: number) =>
    formatPriceWithCurrency(value, receipt.currencyInfo.code, receipt.currencyInfo.locale)
  const safe = (value: unknown) => String(value ?? '').replace(/[<>&"]/g, (char) => ({
    '<': '&lt;',
    '>': '&gt;',
    '&': '&amp;',
    '"': '&quot;',
  }[char] || char))

  const rows = receipt.items.map((item) => `
    <tr>
      <td>${safe(item.quantity)} x ${safe(item.name)}</td>
      <td style="text-align:right">${format(item.price * item.quantity)}</td>
    </tr>
  `).join('')

  const html = `
    <html>
      <head>
        <title>Recibo ${safe(receipt.orderNumber)}</title>
        <style>
          body{font-family:Arial,sans-serif;margin:0;padding:16px;background:#fff;color:#111}
          .receipt{max-width:300px;margin:0 auto}
          h1{font-size:18px;text-align:center;margin:0 0 4px}
          .meta{text-align:center;font-size:12px;color:#555;margin-bottom:12px}
          table{width:100%;border-collapse:collapse;font-size:12px}
          td{padding:5px 0;border-bottom:1px dashed #ddd;vertical-align:top}
          .totals{margin-top:12px;font-size:13px}
          .line{display:flex;justify-content:space-between;padding:4px 0}
          .total{font-size:17px;font-weight:800;border-top:2px solid #111;margin-top:6px;padding-top:8px}
          @media print{body{padding:0}.receipt{max-width:none;width:72mm}}
        </style>
      </head>
      <body>
        <div class="receipt">
          <h1>${safe(receipt.restaurantName || 'Restaurante')}</h1>
          <div class="meta">
            ${receipt.restaurantPhone ? `Tel: ${safe(receipt.restaurantPhone)}<br/>` : ''}
            Recibo ${safe(receipt.orderNumber)}<br/>
            ${new Date(receipt.timestamp || Date.now()).toLocaleString(receipt.currencyInfo.locale)}
          </div>
          <table>${rows}</table>
          <div class="totals">
            <div class="line"><span>Subtotal</span><strong>${format(receipt.subtotal)}</strong></div>
            ${receipt.discount > 0 ? `<div class="line"><span>Descuento</span><strong>-${format(receipt.discount)}</strong></div>` : ''}
            ${receipt.tax ? `<div class="line"><span>Impuesto</span><strong>${format(receipt.tax)}</strong></div>` : ''}
            <div class="line total"><span>Total</span><strong>${format(receipt.total)}</strong></div>
          </div>
        </div>
        <script>window.onload=()=>{window.print();setTimeout(()=>window.close(),500)}</script>
      </body>
    </html>
  `

  const popup = window.open('', '_blank', 'width=420,height=720')
  if (!popup) throw new Error('El navegador bloqueo la ventana de impresion')
  popup.document.open()
  popup.document.write(html)
  popup.document.close()
}

export function ReprintReceiptButton({ tenantId, orderId, orderNumber }: ReprintReceiptButtonProps) {
  const [printing, setPrinting] = useState(false)

  async function handleReprint() {
    setPrinting(true)
    try {
      const response = await fetch(`/api/orders/${orderId}/receipt?tenantId=${tenantId}`, {
        credentials: 'include',
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'No se pudo preparar el recibo')

      if (data.defaultPrinterId) {
        await printReceipt(tenantId, data.defaultPrinterId, data.receipt)
      } else {
        printReceiptInBrowser(data.receipt)
      }
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'No se pudo reimprimir el recibo')
    } finally {
      setPrinting(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleReprint}
      disabled={printing}
      className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-black/10 bg-white px-3 py-1.5 text-xs font-black text-[#15130f] transition hover:bg-black/5 disabled:opacity-50"
      title={`Reimprimir ${orderNumber || 'recibo'}`}
    >
      <Printer className="size-3.5" />
      {printing ? 'Imprimiendo...' : 'Reimprimir'}
    </button>
  )
}

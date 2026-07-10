'use client'

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  BadgeEuro,
  Camera,
  ClipboardList,
  Crown,
  Plus,
  ReceiptText,
  Search,
  TrendingUp,
  Trash2,
  Users,
  X,
} from 'lucide-react'

interface InvoiceItem {
  id: string
  inventory_id: string | null
  product_name: string
  quantity: number | string
  package_size: number | string
  package_unit: string
  line_total: number | string
  unit_price: number | string
  created_at: string
}

interface PurchaseInvoice {
  id: string
  supplier_name: string
  invoice_number: string | null
  invoice_date: string
  total: number | string
  notes: string | null
  created_at: string
  supplier_purchase_invoice_items: InvoiceItem[]
}

interface InventoryOption {
  id: string
  product_name: string
  unit?: string | null
  supplier?: string | null
  cost_per_unit?: number | string | null
}

interface SalesSummary {
  salesThisMonth: number
  salesToday: number
  ordersThisMonth: number
  ordersToday: number
}

interface DraftLine {
  id: string
  inventoryId: string
  productName: string
  quantity: string
  packageSize: string
  packageUnit: string
  lineTotal: string
}

interface ScannedInvoice {
  supplierName: string
  invoiceNumber: string
  invoiceDate: string
  notes: string
  confidence: number
  lines: Array<{
    productName: string
    quantity: number
    packageSize: number
    packageUnit: string
    lineTotal: number
  }>
}

function createDraftId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

const emptyLine = (): DraftLine => ({
  id: createDraftId(),
  inventoryId: '',
  productName: '',
  quantity: '1',
  packageSize: '1',
  packageUnit: 'unidad',
  lineTotal: '',
})

function parseAmount(value: unknown) {
  const parsed = Number(String(value || '').replace(',', '.'))
  return Number.isFinite(parsed) ? parsed : 0
}

function money(value: unknown) {
  return parseAmount(value).toLocaleString('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  })
}

function normalizeProduct(value: string, unit: string) {
  return `${value.trim().toLowerCase()}::${unit.trim().toLowerCase()}`
}

function unitPrice(line: Pick<DraftLine, 'quantity' | 'packageSize' | 'lineTotal'>) {
  const quantity = parseAmount(line.quantity)
  const packageSize = parseAmount(line.packageSize)
  const lineTotal = parseAmount(line.lineTotal)
  const units = quantity * packageSize
  return units > 0 ? lineTotal / units : 0
}

function percent(value: number) {
  return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`
}

function formatDate(value: string) {
  if (!value) return 'Sin fecha'
  return new Date(`${value}T12:00:00`).toLocaleDateString('es-ES')
}

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 12000) {
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    })
  } finally {
    window.clearTimeout(timeout)
  }
}

async function imageFileToDataUrl(file: File) {
  const objectUrl = URL.createObjectURL(file)
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = () => reject(new Error('No se pudo cargar la imagen'))
      img.src = objectUrl
    })

    const maxSide = 1400
    const scale = Math.min(1, maxSide / Math.max(image.width, image.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(image.width * scale))
    canvas.height = Math.max(1, Math.round(image.height * scale))
    const context = canvas.getContext('2d')
    if (!context) throw new Error('No se pudo preparar la foto')
    context.drawImage(image, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/jpeg', 0.76)
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

export function PurchaseControlManager({ tenantId }: { tenantId: string }) {
  const [invoices, setInvoices] = useState<PurchaseInvoice[]>([])
  const [inventory, setInventory] = useState<InventoryOption[]>([])
  const [salesSummary, setSalesSummary] = useState<SalesSummary>({
    salesThisMonth: 0,
    salesToday: 0,
    ordersThisMonth: 0,
    ordersToday: 0,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [search, setSearch] = useState('')
  const [supplierName, setSupplierName] = useState('')
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [invoiceDate, setInvoiceDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [notes, setNotes] = useState('')
  const [lines, setLines] = useState<DraftLine[]>([emptyLine()])
  const [error, setError] = useState('')
  const [scanMessage, setScanMessage] = useState('')
  const [scanningInvoice, setScanningInvoice] = useState(false)
  const cameraInputRef = useRef<HTMLInputElement | null>(null)
  const multiFileInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    void fetchData()
  }, [tenantId])

  async function fetchData() {
    setLoading(true)
    setError('')
    try {
      const [purchaseResponse, inventoryResponse] = await Promise.all([
        fetchWithTimeout(`/api/purchase-invoices?tenantId=${tenantId}`, { credentials: 'include' }),
        fetchWithTimeout(`/api/inventory?tenantId=${tenantId}`, { credentials: 'include' }),
      ])

      const purchaseData = await purchaseResponse.json().catch(() => ({}))
      const inventoryData = await inventoryResponse.json().catch(() => [])

      if (purchaseResponse.status === 401 || inventoryResponse.status === 401) {
        throw new Error('Tu sesion no esta activa. Vuelve a iniciar sesion en el panel.')
      }
      if (!purchaseResponse.ok) throw new Error(purchaseData.error || 'No se pudieron cargar las compras')
      if (!inventoryResponse.ok) throw new Error(inventoryData.error || 'No se pudo cargar inventario')

      setInvoices(Array.isArray(purchaseData.invoices) ? purchaseData.invoices : [])
      setSalesSummary({
        salesThisMonth: parseAmount(purchaseData.salesSummary?.salesThisMonth),
        salesToday: parseAmount(purchaseData.salesSummary?.salesToday),
        ordersThisMonth: Number(purchaseData.salesSummary?.ordersThisMonth || 0),
        ordersToday: Number(purchaseData.salesSummary?.ordersToday || 0),
      })
      setInventory(Array.isArray(inventoryData) ? inventoryData : [])
    } catch (fetchError) {
      const isAbort = fetchError instanceof Error && fetchError.name === 'AbortError'
      setError(isAbort ? 'La carga de compras tardó demasiado. Revisa la sesión o intenta de nuevo.' : fetchError instanceof Error ? fetchError.message : 'Error cargando compras')
    } finally {
      setLoading(false)
    }
  }

  function updateLine(id: string, patch: Partial<DraftLine>) {
    setLines((current) => current.map((line) => {
      if (line.id !== id) return line
      const next = { ...line, ...patch }
      if (patch.inventoryId) {
        const selected = inventory.find((item) => item.id === patch.inventoryId)
        if (selected) {
          next.productName = selected.product_name
          next.packageUnit = selected.unit || next.packageUnit
        }
      }
      return next
    }))
  }

  function resetForm() {
    setSupplierName('')
    setInvoiceNumber('')
    setInvoiceDate(new Date().toISOString().slice(0, 10))
    setNotes('')
    setLines([emptyLine()])
    setError('')
  }

  async function saveInvoice(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError('')

    try {
      const response = await fetch('/api/purchase-invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          tenantId,
          supplierName,
          invoiceNumber,
          invoiceDate,
          notes,
          lines: lines.map((line) => ({
            inventoryId: line.inventoryId || null,
            productName: line.productName,
            quantity: line.quantity,
            packageSize: line.packageSize,
            packageUnit: line.packageUnit,
            lineTotal: line.lineTotal,
          })),
        }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'No se pudo guardar la factura')

      resetForm()
      setShowForm(false)
      await fetchData()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'No se pudo guardar la factura')
    } finally {
      setSaving(false)
    }
  }

  async function deleteInvoice(invoice: PurchaseInvoice) {
    const label = invoice.invoice_number ? `${invoice.supplier_name} (${invoice.invoice_number})` : invoice.supplier_name
    if (!window.confirm(`Borrar la factura de ${label}? Esta accion no se puede deshacer.`)) return

    setError('')
    try {
      const response = await fetch(`/api/purchase-invoices?tenantId=${tenantId}&id=${invoice.id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'No se pudo borrar la factura')
      await fetchData()
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'No se pudo borrar la factura')
    }
  }

  function findInventoryMatch(productName: string) {
    const normalized = productName.trim().toLowerCase()
    if (!normalized) return ''
    const exact = inventory.find((item) => item.product_name.trim().toLowerCase() === normalized)
    if (exact) return exact.id
    const partial = inventory.find((item) => {
      const itemName = item.product_name.trim().toLowerCase()
      return itemName.includes(normalized) || normalized.includes(itemName)
    })
    return partial?.id || ''
  }

  function applyScannedInvoice(invoice: ScannedInvoice) {
    setSupplierName(invoice.supplierName || '')
    setInvoiceNumber(invoice.invoiceNumber || '')
    if (/^\d{4}-\d{2}-\d{2}$/.test(invoice.invoiceDate || '')) {
      setInvoiceDate(invoice.invoiceDate)
    }
    setNotes(invoice.notes || '')
    setLines((invoice.lines || []).filter((line) => line.productName).map((line) => ({
      id: createDraftId(),
      inventoryId: findInventoryMatch(line.productName),
      productName: line.productName || '',
      quantity: String(line.quantity || 1).replace('.', ','),
      packageSize: String(line.packageSize || 1).replace('.', ','),
      packageUnit: ['unidad', 'kg', 'litro', 'caja'].includes(line.packageUnit) ? line.packageUnit : 'unidad',
      lineTotal: String(line.lineTotal || '').replace('.', ','),
    })))
    setShowForm(true)
    setScanMessage(`Factura leida con IA. Revisa los datos antes de guardar. Confianza: ${Math.round((invoice.confidence || 0) * 100)}%`)
  }

  async function handleInvoicePhotoSelected(fileList: FileList | null | undefined) {
    const files = Array.from(fileList || []).slice(0, 5)
    if (files.length === 0) return
    setError('')
    setScanMessage('')
    setScanningInvoice(true)

    try {
      const imageDataUrls = await Promise.all(files.map((file) => imageFileToDataUrl(file)))
      const response = await fetch('/api/purchase-invoices/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ tenantId, imageDataUrls }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'No se pudo leer la factura')
      applyScannedInvoice(data.invoice)
      if (files.length > 1) {
        setScanMessage(`Factura de ${files.length} hojas leida con IA. Revisa los datos antes de guardar. Confianza: ${Math.round((data.invoice?.confidence || 0) * 100)}%`)
      }
    } catch (scanError) {
      setError(scanError instanceof Error ? scanError.message : 'No se pudo leer la factura')
    } finally {
      setScanningInvoice(false)
      if (cameraInputRef.current) cameraInputRef.current.value = ''
      if (multiFileInputRef.current) multiFileInputRef.current.value = ''
    }
  }

  const allItems = useMemo(() => {
    return invoices.flatMap((invoice) =>
      (invoice.supplier_purchase_invoice_items || []).map((item) => ({
        ...item,
        supplierName: invoice.supplier_name,
        invoiceDate: invoice.invoice_date,
        invoiceNumber: invoice.invoice_number,
      }))
    )
  }, [invoices])

  const comparisons = useMemo(() => {
    const groups = new Map<string, typeof allItems>()
    for (const item of allItems) {
      const key = normalizeProduct(item.product_name, item.package_unit)
      groups.set(key, [...(groups.get(key) || []), item])
    }

    return Array.from(groups.values()).map((items) => {
      const ordered = [...items].sort((a, b) => new Date(b.invoiceDate).getTime() - new Date(a.invoiceDate).getTime())
      const latest = ordered[0]
      const best = [...items].sort((a, b) => parseAmount(a.unit_price) - parseAmount(b.unit_price))[0]
      const worst = [...items].sort((a, b) => parseAmount(b.unit_price) - parseAmount(a.unit_price))[0]
      const latestPrice = parseAmount(latest.unit_price)
      const bestPrice = parseAmount(best.unit_price)
      const diff = bestPrice > 0 ? ((latestPrice - bestPrice) / bestPrice) * 100 : 0
      return { latest, best, worst, diff, count: items.length }
    }).sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff))
  }, [allItems])

  const priceInsights = useMemo(() => {
    const currentMonth = new Date().toISOString().slice(0, 7)
    const rows = comparisons.map((comparison) => {
      const productItems = allItems.filter((item) =>
        normalizeProduct(item.product_name, item.package_unit) === normalizeProduct(comparison.latest.product_name, comparison.latest.package_unit)
      )
      const ordered = [...productItems].sort((a, b) => new Date(b.invoiceDate).getTime() - new Date(a.invoiceDate).getTime())
      const previous = ordered[1]
      const latestPrice = parseAmount(comparison.latest.unit_price)
      const bestPrice = parseAmount(comparison.best.unit_price)
      const previousPrice = previous ? parseAmount(previous.unit_price) : latestPrice
      const averagePrice = productItems.reduce((sum, item) => sum + parseAmount(item.unit_price), 0) / Math.max(productItems.length, 1)
      const unitsThisMonth = productItems
        .filter((item) => item.invoiceDate?.slice(0, 7) === currentMonth)
        .reduce((sum, item) => sum + parseAmount(item.quantity) * parseAmount(item.package_size), 0)
      const savingPerUnit = Math.max(0, latestPrice - bestPrice)
      const savingEstimate = savingPerUnit * unitsThisMonth
      const trendPercent = previousPrice > 0 ? ((latestPrice - previousPrice) / previousPrice) * 100 : 0

      return {
        ...comparison,
        averagePrice,
        previous,
        savingPerUnit,
        savingEstimate,
        trendPercent,
        unitsThisMonth,
      }
    })

    const supplierStats = new Map<string, { supplierName: string; wins: number; totalLines: number; totalValue: number }>()
    for (const item of allItems) {
      const current = supplierStats.get(item.supplierName) || {
        supplierName: item.supplierName,
        wins: 0,
        totalLines: 0,
        totalValue: 0,
      }
      current.totalLines += 1
      current.totalValue += parseAmount(item.line_total)
      supplierStats.set(item.supplierName, current)
    }
    for (const comparison of comparisons) {
      const current = supplierStats.get(comparison.best.supplierName)
      if (current) current.wins += 1
    }

    return {
      priceAlerts: rows
        .filter((row) => row.trendPercent >= 5 || row.diff >= 5)
        .sort((a, b) => Math.max(b.trendPercent, b.diff) - Math.max(a.trendPercent, a.diff))
        .slice(0, 5),
      savingOpportunities: rows
        .filter((row) => row.savingPerUnit > 0)
        .sort((a, b) => b.savingEstimate - a.savingEstimate || b.savingPerUnit - a.savingPerUnit)
        .slice(0, 5),
      bestSupplierStats: Array.from(supplierStats.values())
        .sort((a, b) => b.wins - a.wins || b.totalValue - a.totalValue)
        .slice(0, 4),
      productsWithoutHistory: inventory
        .filter((item) => !allItems.some((purchaseItem) => purchaseItem.inventory_id === item.id || purchaseItem.product_name.trim().toLowerCase() === item.product_name.trim().toLowerCase()))
        .slice(0, 6),
    }
  }, [allItems, comparisons, inventory])

  const filteredComparisons = useMemo(() => {
    const normalized = search.trim().toLowerCase()
    if (!normalized) return comparisons
    return comparisons.filter(({ latest, best }) =>
      [latest.product_name, latest.supplierName, best.supplierName]
        .some((value) => String(value || '').toLowerCase().includes(normalized))
    )
  }, [comparisons, search])

  const draftTotal = lines.reduce((sum, line) => sum + parseAmount(line.lineTotal), 0)
  const monthInvoices = invoices.filter((invoice) => invoice.invoice_date?.slice(0, 7) === new Date().toISOString().slice(0, 7))
  const monthTotal = monthInvoices
    .reduce((sum, invoice) => sum + parseAmount(invoice.total), 0)
  const balanceRemaining = salesSummary.salesThisMonth - monthTotal
  const purchasesOverSales = salesSummary.salesThisMonth > 0 ? (monthTotal / salesSummary.salesThisMonth) * 100 : 0
  const averageDailySales = salesSummary.salesThisMonth / Math.max(1, new Date().getDate())
  const balanceStatus =
    salesSummary.salesThisMonth <= 0
      ? 'Sin ventas cobradas este mes'
      : balanceRemaining >= 0
        ? 'Queda despues de facturas'
        : 'Facturas por encima de ventas'
  const invoicesByDate = useMemo(() => {
    const groups = new Map<string, PurchaseInvoice[]>()
    for (const invoice of invoices) {
      const dateKey = invoice.invoice_date || invoice.created_at?.slice(0, 10) || 'Sin fecha'
      groups.set(dateKey, [...(groups.get(dateKey) || []), invoice])
    }

    return Array.from(groups.entries())
      .map(([date, dateInvoices]) => ({
        date,
        invoices: dateInvoices,
        total: dateInvoices.reduce((sum, invoice) => sum + parseAmount(invoice.total), 0),
        itemCount: dateInvoices.reduce((sum, invoice) => sum + (invoice.supplier_purchase_invoice_items?.length || 0), 0),
      }))
      .sort((a, b) => b.date.localeCompare(a.date))
  }, [invoices])

  if (loading) {
    return (
      <div className="admin-empty">
        <p>Cargando control de compras...</p>
        <p className="mt-2 text-xs font-semibold text-black/45">Si tarda demasiado, recarga la sesión del administrador.</p>
      </div>
    )
  }

  return (
    <div className="w-full max-w-full space-y-5 overflow-hidden">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-black text-red-700">
          {error}
        </div>
      )}
      {scanMessage && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-700">
          {scanMessage}
        </div>
      )}

      <section className="admin-panel overflow-hidden">
        <div className="border-b border-black/10 p-4">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="admin-eyebrow">Cuenta del mes</p>
              <h2 className="text-xl font-black text-[#15130f]">Ventas menos facturas</h2>
            </div>
            <p className={`text-sm font-black ${balanceRemaining >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
              {balanceStatus}
            </p>
          </div>
        </div>
        <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-lg border border-black/10 bg-black/[0.025] p-4">
            <p className="text-xs font-black uppercase text-black/45">Vendido este mes</p>
            <p className="mt-2 text-2xl font-black text-emerald-700">{money(salesSummary.salesThisMonth)}</p>
            <p className="mt-1 text-xs font-bold text-black/45">{salesSummary.ordersThisMonth} pedido{salesSummary.ordersThisMonth === 1 ? '' : 's'} cobrados</p>
          </div>
          <div className="rounded-lg border border-black/10 bg-black/[0.025] p-4">
            <p className="text-xs font-black uppercase text-black/45">Gastado en facturas</p>
            <p className="mt-2 text-2xl font-black text-red-700">{money(monthTotal)}</p>
            <p className="mt-1 text-xs font-bold text-black/45">{monthInvoices.length} factura{monthInvoices.length === 1 ? '' : 's'} este mes</p>
          </div>
          <div className="rounded-lg border border-black/10 bg-black/[0.025] p-4">
            <p className="text-xs font-black uppercase text-black/45">Te queda</p>
            <p className={`mt-2 text-2xl font-black ${balanceRemaining >= 0 ? 'text-[#15130f]' : 'text-red-700'}`}>{money(balanceRemaining)}</p>
            <p className="mt-1 text-xs font-bold text-black/45">antes de nóminas, alquiler y otros gastos</p>
          </div>
          <div className="rounded-lg border border-black/10 bg-black/[0.025] p-4">
            <p className="text-xs font-black uppercase text-black/45">Compras / ventas</p>
            <p className="mt-2 text-2xl font-black text-[#15130f]">{purchasesOverSales.toFixed(1)}%</p>
            <p className="mt-1 text-xs font-bold text-black/45">cuánto se va en proveedores</p>
          </div>
          <div className="rounded-lg border border-black/10 bg-black/[0.025] p-4">
            <p className="text-xs font-black uppercase text-black/45">Hoy vendido</p>
            <p className="mt-2 text-2xl font-black text-[#15130f]">{money(salesSummary.salesToday)}</p>
            <p className="mt-1 text-xs font-bold text-black/45">media diaria: {money(averageDailySales)}</p>
          </div>
        </div>
        {salesSummary.salesThisMonth > 0 && purchasesOverSales >= 45 && (
          <div className="border-t border-amber-200 bg-amber-50 px-4 py-3 text-sm font-black text-amber-800">
            Las facturas ya representan {purchasesOverSales.toFixed(1)}% de lo vendido este mes. Revisa subidas y proveedores antes de comprar más.
          </div>
        )}
      </section>

      <div className="grid gap-3 lg:grid-cols-3 xl:grid-cols-[1fr_1fr_1fr_minmax(230px,0.9fr)]">
        <div className="admin-card rounded-lg border p-5">
          <p className="text-xs font-black uppercase text-black/45">Facturas</p>
          <p className="mt-2 text-2xl font-black text-[#15130f]">{invoices.length}</p>
        </div>
        <div className="admin-card rounded-lg border p-5">
          <p className="text-xs font-black uppercase text-black/45">Productos comparados</p>
          <p className="mt-2 text-2xl font-black text-[#15130f]">{comparisons.length}</p>
        </div>
        <div className="admin-card rounded-lg border p-5">
          <p className="text-xs font-black uppercase text-black/45">Compras este mes</p>
          <p className="mt-2 text-2xl font-black text-[#15130f]">{money(monthTotal)}</p>
        </div>
        <div className="grid min-w-0 gap-2 sm:grid-cols-3 lg:col-span-3 lg:grid-cols-3 xl:col-span-1 xl:grid-cols-1">
          <button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            disabled={scanningInvoice}
            className="admin-button-primary min-h-12 min-w-0 whitespace-normal px-3 text-center leading-tight disabled:opacity-50"
          >
            <Camera className="size-5 shrink-0" />
            <span className="min-w-0">{scanningInvoice ? 'Leyendo...' : 'Tomar 1 foto'}</span>
          </button>
          <button
            type="button"
            onClick={() => multiFileInputRef.current?.click()}
            disabled={scanningInvoice}
            className="admin-button-ghost min-h-12 min-w-0 whitespace-normal px-3 text-center leading-tight disabled:opacity-50"
          >
            <ReceiptText className="size-5 shrink-0" />
            <span className="min-w-0">Varias hojas</span>
          </button>
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="admin-button-ghost min-h-12 min-w-0 whitespace-normal px-3 text-center leading-tight"
          >
            <Plus className="size-5 shrink-0" />
            <span className="min-w-0">Nueva manual</span>
          </button>
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(event) => {
              void handleInvoicePhotoSelected(event.target.files)
            }}
          />
          <input
            ref={multiFileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(event) => {
              void handleInvoicePhotoSelected(event.target.files)
            }}
          />
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_1fr]">
        <section className="admin-panel overflow-hidden">
          <div className="border-b border-black/10 p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-amber-600" />
              <h2 className="text-lg font-black text-[#15130f]">Avisos para comprar mejor</h2>
            </div>
          </div>
          {priceInsights.priceAlerts.length === 0 ? (
            <div className="p-4 text-sm font-bold text-black/55">Cuando un producto suba de precio, aparecerá aquí.</div>
          ) : (
            <div className="divide-y divide-black/8">
              {priceInsights.priceAlerts.map((item) => (
                <div key={`alert-${item.latest.product_name}-${item.latest.package_unit}`} className="grid gap-3 p-4 sm:grid-cols-[1fr_auto] sm:items-center">
                  <div>
                    <p className="font-black text-[#15130f]">{item.latest.product_name}</p>
                    <p className="mt-1 text-sm font-semibold text-black/55">
                      Último: {money(item.latest.unit_price)} / {item.latest.package_unit} con {item.latest.supplierName}
                    </p>
                    <p className="mt-1 text-xs font-bold text-black/45">
                      Mejor histórico: {money(item.best.unit_price)} con {item.best.supplierName}
                    </p>
                  </div>
                  <div className="text-left sm:text-right">
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-sm font-black text-amber-700">
                      <TrendingUp className="size-4" />
                      {percent(Math.max(item.trendPercent, item.diff))}
                    </span>
                    <p className="mt-2 text-xs font-bold text-black/45">{formatDate(item.latest.invoiceDate)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="admin-panel overflow-hidden">
          <div className="border-b border-black/10 p-4">
            <div className="flex items-center gap-2">
              <BadgeEuro className="size-5 text-emerald-700" />
              <h2 className="text-lg font-black text-[#15130f]">Ahorro detectado</h2>
            </div>
          </div>
          {priceInsights.savingOpportunities.length === 0 ? (
            <div className="p-4 text-sm font-bold text-black/55">Con más facturas podré calcular oportunidades de ahorro.</div>
          ) : (
            <div className="divide-y divide-black/8">
              {priceInsights.savingOpportunities.map((item) => (
                <div key={`saving-${item.latest.product_name}-${item.latest.package_unit}`} className="grid gap-3 p-4 sm:grid-cols-[1fr_auto] sm:items-center">
                  <div>
                    <p className="font-black text-[#15130f]">{item.latest.product_name}</p>
                    <p className="mt-1 text-sm font-semibold text-black/55">
                      Compra a {item.best.supplierName}: {money(item.best.unit_price)} / {item.best.package_unit}
                    </p>
                    <p className="mt-1 text-xs font-bold text-black/45">
                      Ahorro por {item.latest.package_unit}: {money(item.savingPerUnit)}
                    </p>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-lg font-black text-emerald-700">{money(item.savingEstimate)}</p>
                    <p className="mt-1 text-xs font-bold text-black/45">estimado este mes</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <section className="admin-panel overflow-hidden">
          <div className="border-b border-black/10 p-4">
            <div className="flex items-center gap-2">
              <Crown className="size-5 text-[#c9a227]" />
              <h2 className="text-lg font-black text-[#15130f]">Proveedores que más convienen</h2>
            </div>
          </div>
          {priceInsights.bestSupplierStats.length === 0 ? (
            <div className="p-4 text-sm font-bold text-black/55">Todavía no hay proveedores comparables.</div>
          ) : (
            <div className="divide-y divide-black/8">
              {priceInsights.bestSupplierStats.map((supplier) => (
                <div key={supplier.supplierName} className="grid gap-2 p-4 sm:grid-cols-[1fr_auto] sm:items-center">
                  <div>
                    <p className="font-black text-[#15130f]">{supplier.supplierName}</p>
                    <p className="mt-1 text-xs font-bold text-black/45">
                      {supplier.totalLines} línea{supplier.totalLines === 1 ? '' : 's'} comprada{supplier.totalLines === 1 ? '' : 's'}
                    </p>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-lg font-black text-[#15130f]">{supplier.wins}</p>
                    <p className="text-xs font-bold text-black/45">mejores precios</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="admin-panel overflow-hidden">
          <div className="border-b border-black/10 p-4">
            <div className="flex items-center gap-2">
              <Users className="size-5 text-sky-700" />
              <h2 className="text-lg font-black text-[#15130f]">Productos por controlar</h2>
            </div>
          </div>
          {priceInsights.productsWithoutHistory.length === 0 ? (
            <div className="p-4 text-sm font-bold text-black/55">Todos los productos del inventario ya tienen historial de compra.</div>
          ) : (
            <div className="grid gap-2 p-4 sm:grid-cols-2">
              {priceInsights.productsWithoutHistory.map((item) => (
                <div key={item.id} className="rounded-lg border border-black/10 bg-black/[0.025] p-3">
                  <p className="font-black text-[#15130f]">{item.product_name}</p>
                  <p className="mt-1 text-xs font-bold text-black/45">
                    {item.supplier ? `Proveedor habitual: ${item.supplier}` : 'Sin factura registrada'}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <div className="admin-panel overflow-hidden">
        <div className="border-b border-black/10 p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-black text-[#15130f]">Comparador de precios</h2>
              <p className="text-sm font-semibold text-black/52">Precio real calculado por unidad, kg o litro.</p>
            </div>
            <div className="relative w-full lg:max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-black/35" />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar producto o proveedor"
                className="admin-input pl-10"
              />
            </div>
          </div>
        </div>

        {filteredComparisons.length === 0 ? (
          <div className="admin-empty m-5">
            <ClipboardList className="mb-3 size-8 text-black/30" />
            <p className="font-black">Todavia no hay precios para comparar</p>
            <p className="mt-1 text-sm">Registra la primera factura de proveedor para crear historial.</p>
          </div>
        ) : (
          <div className="max-w-full overflow-x-auto">
            <table className="w-full min-w-[840px]">
              <thead className="border-b border-black/10 bg-black/[0.03]">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-black uppercase text-black/45">Producto</th>
                  <th className="px-5 py-3 text-left text-xs font-black uppercase text-black/45">Ultima compra</th>
                  <th className="px-5 py-3 text-left text-xs font-black uppercase text-black/45">Mejor precio</th>
                  <th className="px-5 py-3 text-left text-xs font-black uppercase text-black/45">Peor precio</th>
                  <th className="px-5 py-3 text-right text-xs font-black uppercase text-black/45">Diferencia</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/8">
                {filteredComparisons.map(({ latest, best, worst, diff, count }) => {
                  const isUp = diff > 0.5
                  const isDown = diff < -0.5
                  return (
                    <tr key={`${latest.product_name}-${latest.package_unit}`} className="transition hover:bg-black/[0.025]">
                      <td className="px-5 py-4">
                        <p className="font-black text-[#15130f]">{latest.product_name}</p>
                        <p className="mt-1 text-xs font-semibold text-black/45">{count} compra{count === 1 ? '' : 's'} registradas</p>
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-black text-[#15130f]">{money(latest.unit_price)} / {latest.package_unit}</p>
                        <p className="mt-1 text-xs font-semibold text-black/45">{latest.supplierName} - {new Date(latest.invoiceDate).toLocaleDateString('es-ES')}</p>
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-black text-emerald-700">{money(best.unit_price)} / {best.package_unit}</p>
                        <p className="mt-1 text-xs font-semibold text-black/45">{best.supplierName}</p>
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-black text-red-700">{money(worst.unit_price)} / {worst.package_unit}</p>
                        <p className="mt-1 text-xs font-semibold text-black/45">{worst.supplierName}</p>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-black ${
                          isUp ? 'bg-red-50 text-red-700' : isDown ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-50 text-slate-700'
                        }`}>
                          {isUp && <ArrowUp className="size-4" />}
                          {isDown && <ArrowDown className="size-4" />}
                          {diff.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="admin-panel overflow-hidden">
        <div className="border-b border-black/10 p-4">
          <h2 className="text-lg font-black text-[#15130f]">Facturas por fecha</h2>
        </div>
        {invoices.length === 0 ? (
          <div className="admin-empty m-5">No hay facturas de proveedor guardadas.</div>
        ) : (
          <div className="divide-y divide-black/10">
            {invoicesByDate.map((group) => (
              <section key={group.date}>
                <div className="grid gap-2 border-b border-black/8 bg-black/[0.025] px-4 py-3 md:grid-cols-[1fr_auto] md:items-center">
                  <div>
                    <p className="text-sm font-black text-[#15130f]">
                      {group.date === 'Sin fecha'
                        ? group.date
                        : new Date(`${group.date}T12:00:00`).toLocaleDateString('es-ES', {
                            weekday: 'long',
                            day: '2-digit',
                            month: 'long',
                            year: 'numeric',
                          })}
                    </p>
                    <p className="mt-1 text-xs font-bold text-black/45">
                      {group.invoices.length} factura{group.invoices.length === 1 ? '' : 's'} - {group.itemCount} producto{group.itemCount === 1 ? '' : 's'}
                    </p>
                  </div>
                  {group.invoices.length > 1 && (
                    <div className="text-right">
                      <p className="text-xs font-black uppercase text-black/40">Total del dia</p>
                      <p className="text-lg font-black text-[#15130f]">{money(group.total)}</p>
                    </div>
                  )}
                </div>
                <div className="divide-y divide-black/8">
                  {group.invoices.map((invoice) => (
                    <div key={invoice.id} className="grid gap-3 p-4 md:grid-cols-[1fr_auto_auto] md:items-center">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <ReceiptText className="size-4 text-black/40" />
                          <p className="font-black text-[#15130f]">{invoice.supplier_name}</p>
                          {invoice.invoice_number && (
                            <span className="rounded-full border border-black/10 px-2.5 py-1 text-xs font-black text-black/55">
                              {invoice.invoice_number}
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-sm font-semibold text-black/52">
                          {invoice.supplier_purchase_invoice_items?.length || 0} producto{invoice.supplier_purchase_invoice_items?.length === 1 ? '' : 's'}
                        </p>
                      </div>
                      <p className="text-xl font-black text-[#15130f]">{money(invoice.total)}</p>
                      <button
                        type="button"
                        onClick={() => void deleteInvoice(invoice)}
                        className="inline-flex h-10 items-center justify-center rounded-lg border border-red-200 bg-red-50 px-3 text-red-700 transition hover:bg-red-100"
                        aria-label="Borrar factura"
                        title="Borrar factura"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-y-0 right-0 z-50 flex w-full items-start justify-center overflow-y-auto bg-black/60 p-4 pt-20 backdrop-blur-sm md:left-64 md:w-[calc(100%-16rem)] md:pt-4">
          <div className="admin-panel my-4 w-full max-w-5xl overflow-hidden">
            <div className="flex items-start justify-between gap-4 border-b border-black/10 bg-white/70 px-5 py-4">
              <div>
                <p className="admin-eyebrow">Nueva compra</p>
                <h2 className="text-2xl font-black text-[#15130f]">Factura de proveedor</h2>
                {scanMessage && <p className="mt-1 text-sm font-bold text-emerald-700">{scanMessage}</p>}
              </div>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-lg p-2 text-black/45 transition hover:bg-black/5 hover:text-black"
                aria-label="Cerrar"
              >
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={saveInvoice} className="space-y-5 p-5">
              <div className="grid gap-4 md:grid-cols-4">
                <div className="md:col-span-2">
                  <label className="mb-2 block text-xs font-black uppercase text-black/45">Proveedor *</label>
                  <input value={supplierName} onChange={(event) => setSupplierName(event.target.value)} required className="admin-input" placeholder="Ej. Makro, Coca-Cola, proveedor local" />
                </div>
                <div>
                  <label className="mb-2 block text-xs font-black uppercase text-black/45">N. factura</label>
                  <input value={invoiceNumber} onChange={(event) => setInvoiceNumber(event.target.value)} className="admin-input" placeholder="Opcional" />
                </div>
                <div>
                  <label className="mb-2 block text-xs font-black uppercase text-black/45">Fecha</label>
                  <input type="date" value={invoiceDate} onChange={(event) => setInvoiceDate(event.target.value)} className="admin-input" required />
                </div>
              </div>

              <div className="space-y-3">
                {lines.map((line, index) => (
                  <div key={line.id} className="rounded-lg border border-black/10 bg-black/[0.025] p-3">
                    <div className="grid gap-3 lg:grid-cols-[1.35fr_1.35fr_0.7fr_0.7fr_0.8fr_0.8fr_auto] lg:items-end">
                      <div>
                        <label className="mb-2 block text-xs font-black uppercase text-black/45">Inventario</label>
                        <select value={line.inventoryId} onChange={(event) => updateLine(line.id, { inventoryId: event.target.value })} className="admin-input">
                          <option value="">Producto nuevo/manual</option>
                          {inventory.map((item) => (
                            <option key={item.id} value={item.id}>{item.product_name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="mb-2 block text-xs font-black uppercase text-black/45">Producto *</label>
                        <input value={line.productName} onChange={(event) => updateLine(line.id, { productName: event.target.value })} required className="admin-input" placeholder="Cerveza, cafe, leche..." />
                      </div>
                      <div>
                        <label className="mb-2 block text-xs font-black uppercase text-black/45">Bultos</label>
                        <input value={line.quantity} onChange={(event) => updateLine(line.id, { quantity: event.target.value })} className="admin-input" inputMode="decimal" />
                      </div>
                      <div>
                        <label className="mb-2 block text-xs font-black uppercase text-black/45">Contenido</label>
                        <input value={line.packageSize} onChange={(event) => updateLine(line.id, { packageSize: event.target.value })} className="admin-input" inputMode="decimal" />
                      </div>
                      <div>
                        <label className="mb-2 block text-xs font-black uppercase text-black/45">Unidad</label>
                        <select value={line.packageUnit} onChange={(event) => updateLine(line.id, { packageUnit: event.target.value })} className="admin-input">
                          <option value="unidad">unidad</option>
                          <option value="kg">kg</option>
                          <option value="litro">litro</option>
                          <option value="caja">caja</option>
                        </select>
                      </div>
                      <div>
                        <label className="mb-2 block text-xs font-black uppercase text-black/45">Total linea *</label>
                        <input value={line.lineTotal} onChange={(event) => updateLine(line.id, { lineTotal: event.target.value })} required className="admin-input" inputMode="decimal" placeholder="0,00" />
                      </div>
                      <button
                        type="button"
                        onClick={() => setLines((current) => current.length === 1 ? current : current.filter((item) => item.id !== line.id))}
                        className="inline-flex h-11 items-center justify-center rounded-lg border border-red-200 bg-red-50 px-3 text-red-700 transition hover:bg-red-100"
                        aria-label={`Eliminar linea ${index + 1}`}
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                    <p className="mt-2 text-xs font-bold text-black/50">
                      Precio calculado: {money(unitPrice(line))} / {line.packageUnit}
                    </p>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setLines((current) => [...current, emptyLine()])}
                className="admin-button-ghost sm:w-auto"
              >
                <Plus className="size-4" />
                Agregar producto
              </button>

              <div>
                <label className="mb-2 block text-xs font-black uppercase text-black/45">Notas</label>
                <textarea value={notes} onChange={(event) => setNotes(event.target.value)} className="admin-input min-h-20" placeholder="Condiciones, descuentos, incidencias..." />
              </div>

              <div className="flex flex-col gap-3 border-t border-black/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xl font-black text-[#15130f]">Total: {money(draftTotal)}</p>
                <div className="flex flex-col-reverse gap-3 sm:flex-row">
                  <button type="button" onClick={() => setShowForm(false)} disabled={saving} className="admin-button-ghost sm:w-auto disabled:opacity-50">
                    Cancelar
                  </button>
                  <button type="submit" disabled={saving} className="admin-button-primary sm:w-auto disabled:opacity-50">
                    <ReceiptText className="size-4" />
                    {saving ? 'Guardando...' : 'Guardar factura'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

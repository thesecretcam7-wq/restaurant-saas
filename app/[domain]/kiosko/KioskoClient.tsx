'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface MenuCategory { id: string; name: string; sort_order: number; image_url?: string | null }
interface MenuItem {
  id: string; name: string; description: string | null
  price: number; image_url: string | null; available: boolean
  category_id: string | null; featured: boolean; variants?: { show_in_upsell?: boolean } | null
}
interface Banner { id: string; title: string; image_url: string; link_url: string | null; sort_order: number }
interface Topping { id: string; menu_item_id: string; name: string; price: number; is_required?: boolean; sort_order?: number }
interface CartItem { lineId: string; menu_item_id: string; name: string; price: number; qty: number; toppings?: Topping[]; notes?: string }
type Step = 'menu' | 'cart' | 'checkout' | 'confirmed'

interface Props {
  tenantId: string
  domain: string
  branding: {
    appName: string
    primaryColor: string
    secondaryColor: string
    accentColor: string
    backgroundColor: string
    buttonPrimaryColor: string
    buttonSecondaryColor: string
    textPrimaryColor: string
    textSecondaryColor: string
    borderColor: string
    logoUrl: string | null
  }
  categories: MenuCategory[]
  menuItems: MenuItem[]
  toppings: Topping[]
  banners: Banner[]
  taxRate: number
  currencySymbol: string
  stripeEnabled: boolean
  initialConfirmed?: { number: number; name: string }
}

function fmt(amount: number, symbol: string) {
  return `${symbol}${Math.round(amount).toLocaleString('es-CO')}`
}

function pad(n: number) { return String(n).padStart(3, '0') }

function hexToRgb(hex: string) {
  const normalized = hex.replace('#', '').trim()
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return null
  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16),
  }
}

function isDark(hex: string) {
  const rgb = hexToRgb(hex)
  if (!rgb) return true
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255
  return luminance < 0.5
}

function readableText(background: string, preferred?: string, fallbackDark = '#15130f', fallbackLight = '#ffffff') {
  if (preferred && preferred !== background) return preferred
  return isDark(background) ? fallbackLight : fallbackDark
}

// ─── App Header Component ─────────────────────────────────────────────────
function AppHeader({
  primaryColor,
  textColor,
  appName,
  logoUrl,
  time,
  backLabel,
  onBack,
  cartCount,
}: {
  primaryColor: string
  textColor: string
  appName: string
  logoUrl: string | null
  time: Date | null
  backLabel?: string
  onBack?: () => void
  cartCount?: number
}) {
  return (
    <header
      className="flex items-center justify-between px-8 py-4 flex-shrink-0"
      style={{ backgroundColor: primaryColor }}
    >
      <div className="flex items-center gap-4">
        {onBack && (
          <button onClick={onBack} className="mr-2 rounded-full p-2 transition-colors" style={{ backgroundColor: `${textColor}22`, color: textColor }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
          </button>
        )}
        {logoUrl && <img src={logoUrl} alt="" className="w-11 h-11 rounded-xl object-cover ring-2 ring-white/30" />}
        <div>
          <p className="text-xl font-black leading-tight" style={{ color: textColor }}>{appName}</p>
          {backLabel && <p className="text-xs opacity-75" style={{ color: textColor }}>{backLabel}</p>}
        </div>
      </div>
      <div className="flex items-center gap-6">
        {cartCount !== undefined && cartCount > 0 && (
          <div className="flex items-center gap-2 rounded-full px-4 py-2" style={{ backgroundColor: `${textColor}22`, color: textColor }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
            <span className="font-bold text-sm">{cartCount}</span>
          </div>
        )}
        <div className="text-right">
          <p className="text-2xl font-mono font-bold tabular-nums" style={{ color: textColor }}>
            {time?.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }) ?? ''}
          </p>
          <p className="text-xs opacity-70" style={{ color: textColor }}>
            {time?.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'short' }) ?? ''}
          </p>
        </div>
      </div>
    </header>
  )
}

// ─── Full Screen Banner Carousel ─────────────────────────────────────────────
function BannerCarouselFullscreen({ banners }: { banners: Banner[] }) {
  const touchStartX = useRef(0)
  const [bannerIdx, setBannerIdx] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setBannerIdx(prev => (prev + 1) % banners.length)
    }, 6000)
    return () => clearInterval(interval)
  }, [banners.length])

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    const touchEndX = e.changedTouches[0].clientX
    const diff = touchStartX.current - touchEndX
    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        setBannerIdx(prev => (prev + 1) % banners.length)
      } else {
        setBannerIdx(prev => (prev - 1 + banners.length) % banners.length)
      }
    }
  }

  const currentBanner = banners[bannerIdx]

  return (
    <div
      className="flex-1 overflow-hidden p-4 flex items-center justify-center cursor-grab active:cursor-grabbing"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="w-full h-full flex items-center justify-center relative">
        <a
          href={currentBanner?.link_url || '#'}
          target={currentBanner?.link_url ? '_blank' : undefined}
          rel={currentBanner?.link_url ? 'noopener noreferrer' : undefined}
          className="w-full h-full rounded-3xl overflow-hidden shadow-2xl hover:shadow-3xl transition-shadow"
        >
          <img
            src={currentBanner?.image_url}
            alt={currentBanner?.title}
            className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
          />
        </a>

        {/* Indicadores de página */}
        {banners.length > 1 && (
          <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex gap-2">
            {banners.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setBannerIdx(idx)}
                className={`w-3 h-3 rounded-full transition-all ${
                  idx === bannerIdx ? 'bg-white w-8' : 'bg-white/50'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Horizontal Banner Carousel ──────────────────────────────────────────────
function HorizontalBannerCarousel({
  banners,
  containerRef,
  surfaceColor,
  borderColor,
}: {
  banners: Banner[]
  containerRef: React.RefObject<HTMLDivElement | null>
  surfaceColor: string
  borderColor: string
}) {
  const touchStartX = useRef(0)
  const [bannerIdx, setBannerIdx] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setBannerIdx(prev => (prev + 1) % (banners.length || 1))
    }, 6000)
    return () => clearInterval(interval)
  }, [banners.length])

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    const touchEndX = e.changedTouches[0].clientX
    const diff = touchStartX.current - touchEndX
    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        setBannerIdx(prev => (prev + 1) % banners.length)
      } else {
        setBannerIdx(prev => (prev - 1 + banners.length) % banners.length)
      }
    }
  }

  if (banners.length === 0) return null

  return (
    <div
      ref={containerRef}
      className="border-b p-4 overflow-x-auto flex gap-4"
      style={{ backgroundColor: surfaceColor, borderColor }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {banners.map(banner => (
        <a
          key={banner.id}
          href={banner.link_url || '#'}
          target={banner.link_url ? '_blank' : undefined}
          rel={banner.link_url ? 'noopener noreferrer' : undefined}
          className="flex-shrink-0 rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow cursor-pointer"
        >
          <img
            src={banner.image_url}
            alt={banner.title}
            className="h-32 object-cover"
          />
        </a>
      ))}
    </div>
  )
}

// ─── Category Product Modal ───────────────────────────────────────────────────
function CategoryProductModal({
  category,
  products,
  banners,
  currencySymbol,
  primaryColor,
  buttonColor,
  surfaceColor,
  textColor,
  mutedTextColor,
  borderColor,
  headerTextColor,
  onClose,
  onSelectItem,
}: {
  category: MenuCategory
  products: MenuItem[]
  banners: Banner[]
  currencySymbol: string
  primaryColor: string
  buttonColor: string
  surfaceColor: string
  textColor: string
  mutedTextColor: string
  borderColor: string
  headerTextColor: string
  onClose: () => void
  onSelectItem: (item: MenuItem) => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-40 p-4"
      onClick={onClose}
    >
      <div
        className="rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col"
        style={{ backgroundColor: surfaceColor }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center gap-4 px-6 py-4 flex-shrink-0"
          style={{ backgroundColor: primaryColor, color: headerTextColor }}
        >
          <button
            onClick={onClose}
            className="rounded-full p-2 transition-colors"
            style={{ backgroundColor: `${headerTextColor}22`, color: headerTextColor }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
          </button>
          <h2 className="text-xl font-black">{category.name}</h2>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Banners carousel */}
          {banners.length > 0 && (
            <HorizontalBannerCarousel banners={banners} containerRef={containerRef} surfaceColor={surfaceColor} borderColor={borderColor} />
          )}

          {/* Products grid */}
          {products.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 p-6" style={{ color: mutedTextColor }}>
              <p className="text-6xl mb-4">🍽️</p>
              <p className="text-lg font-medium">No hay productos en esta categoría</p>
            </div>
          ) : (
            <div className="p-6">
              <div className="grid grid-cols-3 gap-4">
                {products.map(item => (
                  <button
                    key={item.id}
                    onClick={() => onSelectItem(item)}
                    className="rounded-2xl shadow-sm overflow-hidden text-left transition-all active:scale-95 hover:shadow-md flex flex-col group border"
                    style={{ backgroundColor: surfaceColor, borderColor }}
                  >
                    <div className="relative overflow-hidden">
                      {item.image_url ? (
                        <img src={item.image_url} alt={item.name} className="w-full h-44 object-cover group-hover:scale-105 transition-transform duration-300" />
                      ) : (
                        <div className="w-full h-44 flex items-center justify-center text-6xl" style={{ backgroundColor: '#ffffff' }}>
                          🍽️
                        </div>
                      )}
                    </div>
                    <div className="p-4 flex flex-col flex-1">
                      <p className="font-bold text-sm leading-snug line-clamp-2 flex-1 mb-3" style={{ color: textColor }}>{item.name}</p>
                      <div className="flex items-center justify-between">
                        <p className="font-black text-lg" style={{ color: primaryColor }}>
                          {fmt(item.price, currencySymbol)}
                        </p>
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center text-white font-black text-xl shadow-md transition-transform active:scale-90"
                          style={{ backgroundColor: buttonColor, color: readableText(buttonColor) }}
                        >
                          +
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function KioskoClient({
  tenantId, domain, branding, categories, menuItems, toppings, banners,
  taxRate, currencySymbol, stripeEnabled, initialConfirmed,
}: Props) {
  const [step, setStep] = useState<Step>(initialConfirmed ? 'confirmed' : 'menu')
  const [activeCategory, setActiveCategory] = useState<string | null>(categories[0]?.id ?? null)
  const [pressedCategory, setPressedCategory] = useState<string | null>(null)
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)
  const [cart, setCart] = useState<CartItem[]>([])
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null)
  const [selectedToppings, setSelectedToppings] = useState<Topping[]>([])
  const [itemQty, setItemQty] = useState(1)
  const [customerName, setCustomerName] = useState('')
  const [orderNotes, setOrderNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmed, setConfirmed] = useState<{ number: number; name: string } | null>(
    initialConfirmed ?? null
  )
  const [countdown, setCountdown] = useState(12)
  const [time, setTime] = useState<Date | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showFsPrompt, setShowFsPrompt] = useState(true)
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const categoryScrollRef = useRef<HTMLDivElement | null>(null)

  const {
    primaryColor,
    secondaryColor,
    accentColor,
    backgroundColor,
    buttonPrimaryColor,
    buttonSecondaryColor,
    textPrimaryColor,
    textSecondaryColor,
    borderColor,
    appName,
    logoUrl
  } = branding
  const pageTextColor = readableText(backgroundColor, textPrimaryColor)
  const mutedTextColor = textSecondaryColor || readableText(backgroundColor, undefined, 'rgba(21,19,15,0.62)', 'rgba(255,255,255,0.66)')
  const primaryTextColor = readableText(primaryColor)
  const buttonTextColor = readableText(buttonPrimaryColor)
  const secondaryButtonTextColor = readableText(buttonSecondaryColor)
  const surfaceColor = isDark(backgroundColor) ? secondaryColor : '#ffffff'
  const surfaceTextColor = readableText(surfaceColor, textPrimaryColor)
  const surfaceMutedTextColor = readableText(surfaceColor, textSecondaryColor, 'rgba(21,19,15,0.62)', 'rgba(255,255,255,0.66)')
  const accentTextColor = readableText(accentColor)

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {})
    } else {
      document.exitFullscreen().catch(() => {})
    }
  }, [])

  useEffect(() => {
    const onChange = () => {
      const fs = !!document.fullscreenElement
      setIsFullscreen(fs)
      if (fs) setShowFsPrompt(false)
    }
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  useEffect(() => {
    setTime(new Date())
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (step !== 'confirmed') return
    setCountdown(12)
    countdownRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) { reset(); return 0 }
        return prev - 1
      })
    }, 1000)
    return () => { if (countdownRef.current) clearInterval(countdownRef.current) }
  }, [step])

  // Keeps the vertical category rail looping while preserving touch momentum.
  useEffect(() => {
    const container = categoryScrollRef.current
    if (!container || categories.length === 0 || step !== 'menu') return

    let lastScrollTop = 0
    let scrollVelocity = 0
    let momentumAnimationId: number | null = null
    let autoScrollAnimationId: number | null = null
    let resumeAutoScrollTimeout: ReturnType<typeof setTimeout> | null = null
    let userInteracting = false

    const getSetHeight = () => container.scrollHeight / 3

    const normalizeScrollPosition = () => {
      const oneSetHeight = getSetHeight()
      if (!oneSetHeight) return

      if (container.scrollTop >= oneSetHeight * 2) {
        container.scrollTop -= oneSetHeight
        lastScrollTop = container.scrollTop
      }

      if (container.scrollTop <= oneSetHeight * 0.25) {
        container.scrollTop += oneSetHeight
        lastScrollTop = container.scrollTop
      }
    }

    const handleScroll = () => {
      const { scrollTop } = container

      scrollVelocity = scrollTop - lastScrollTop
      lastScrollTop = scrollTop
      normalizeScrollPosition()
    }

    const pauseAutoScroll = () => {
      userInteracting = true
      if (resumeAutoScrollTimeout) clearTimeout(resumeAutoScrollTimeout)
      resumeAutoScrollTimeout = setTimeout(() => {
        userInteracting = false
      }, 1800)
    }

    const handleTouchStart = () => {
      pauseAutoScroll()
      if (momentumAnimationId !== null) {
        cancelAnimationFrame(momentumAnimationId)
        momentumAnimationId = null
      }
    }

    const handleTouchEnd = () => {
      if (Math.abs(scrollVelocity) > 1) {
        let currentVelocity = scrollVelocity * 0.8

        const applyMomentum = () => {
          if (Math.abs(currentVelocity) > 0.5) {
            container.scrollTop += currentVelocity
            normalizeScrollPosition()
            currentVelocity *= 0.95
            momentumAnimationId = requestAnimationFrame(applyMomentum)
          } else {
            momentumAnimationId = null
          }
        }

        momentumAnimationId = requestAnimationFrame(applyMomentum)
      }
    }

    const autoScroll = () => {
      if (!userInteracting && !isCategoryModalOpen) {
        container.scrollTop += 0.35
        normalizeScrollPosition()
      }
      autoScrollAnimationId = requestAnimationFrame(autoScroll)
    }

    requestAnimationFrame(() => {
      container.scrollTop = getSetHeight()
      lastScrollTop = container.scrollTop
      autoScrollAnimationId = requestAnimationFrame(autoScroll)
    })

    container.addEventListener('scroll', handleScroll)
    container.addEventListener('touchstart', handleTouchStart, { passive: true })
    container.addEventListener('touchend', handleTouchEnd, { passive: true })
    container.addEventListener('wheel', pauseAutoScroll, { passive: true })
    container.addEventListener('pointerdown', pauseAutoScroll, { passive: true })

    return () => {
      container.removeEventListener('scroll', handleScroll)
      container.removeEventListener('touchstart', handleTouchStart)
      container.removeEventListener('touchend', handleTouchEnd)
      container.removeEventListener('wheel', pauseAutoScroll)
      container.removeEventListener('pointerdown', pauseAutoScroll)
      if (resumeAutoScrollTimeout) clearTimeout(resumeAutoScrollTimeout)
      if (momentumAnimationId !== null) {
        cancelAnimationFrame(momentumAnimationId)
      }
      if (autoScrollAnimationId !== null) {
        cancelAnimationFrame(autoScrollAnimationId)
      }
    }
  }, [categories.length, isCategoryModalOpen, step])

  const reset = useCallback(() => {
    if (countdownRef.current) clearInterval(countdownRef.current)
    setCart([])
    setCustomerName('')
    setOrderNotes('')
    setError(null)
    setConfirmed(null)
    setSelectedItem(null)
    setSelectedToppings([])
    setStep('menu')
  }, [])

  useEffect(() => {
    setSelectedToppings([])
    setItemQty(1)
  }, [selectedItem?.id])

  const cartTotal = cart.reduce((s, i) => s + i.price * i.qty, 0)
  const cartCount = cart.reduce((s, i) => s + i.qty, 0)
  const tax = taxRate ? cartTotal * (taxRate / 100) : 0
  const grandTotal = cartTotal + tax
  const recommendedItems = useMemo(() => {
    const cartItemIds = new Set(cart.map(item => item.menu_item_id))
    const upsellItems = menuItems.filter(item => item.available && item.variants?.show_in_upsell && !cartItemIds.has(item.id))
    const fallbackKeywords = ['gaseosa', 'soda', 'bebida', 'agua', 'jugo', 'papas', 'papita', 'salsa', 'topping', 'extra']
    const fallbackItems = menuItems.filter(item =>
      item.available &&
      !cartItemIds.has(item.id) &&
      fallbackKeywords.some(keyword => `${item.name} ${item.description || ''}`.toLowerCase().includes(keyword))
    )
    const pool = upsellItems.length > 0 ? upsellItems : fallbackItems.length > 0 ? fallbackItems : menuItems.filter(item => item.available && !cartItemIds.has(item.id))
    return [...pool].sort(() => Math.random() - 0.5).slice(0, 4)
  }, [cart, menuItems])

  useEffect(() => {
    if (cart.length > 0 || step === 'confirmed') return

    let timeout: ReturnType<typeof setTimeout>
    const armAttraction = () => {
      clearTimeout(timeout)
      timeout = setTimeout(() => {
        setSelectedItem(null)
        setSelectedToppings([])
        setIsCategoryModalOpen(false)
        setStep('menu')
      }, 30000)
    }

    const events = ['pointerdown', 'keydown', 'touchstart']
    events.forEach(event => window.addEventListener(event, armAttraction, { passive: true }))
    armAttraction()

    return () => {
      clearTimeout(timeout)
      events.forEach(event => window.removeEventListener(event, armAttraction))
    }
  }, [cart.length, step])

  const getQtyInCart = (id: string) => cart.filter(c => c.menu_item_id === id).reduce((sum, c) => sum + c.qty, 0)
  const toppingsForSelectedItem = selectedItem ? toppings.filter(t => t.menu_item_id === selectedItem.id) : []
  const selectedToppingsCost = selectedToppings.reduce((sum, t) => sum + Number(t.price || 0), 0)
  const selectedUnitPrice = selectedItem ? selectedItem.price + selectedToppingsCost : 0
  const toppingsNote = (tops: Topping[]) => tops.length ? `Adicionales: ${tops.map(t => `${t.name}${t.price > 0 ? ` (+${fmt(t.price, currencySymbol)})` : ''}`).join(', ')}` : undefined
  const toggleTopping = (topping: Topping) => {
    setSelectedToppings(prev =>
      prev.some(t => t.id === topping.id)
        ? prev.filter(t => t.id !== topping.id)
        : [...prev, topping]
    )
  }

  const addToCart = (item: MenuItem, qty: number, selected: Topping[] = []) => {
    const sortedToppings = [...selected].sort((a, b) => a.id.localeCompare(b.id))
    const toppingIds = sortedToppings.map(t => t.id).join(',')
    const lineId = `${item.id}:${toppingIds || 'base'}`
    const unitPrice = item.price + sortedToppings.reduce((sum, t) => sum + Number(t.price || 0), 0)
    const notes = toppingsNote(sortedToppings)
    setCart(prev => {
      const existing = prev.find(c => c.lineId === lineId)
      if (existing) return prev.map(c => c.lineId === lineId ? { ...c, qty: c.qty + qty } : c)
      return [...prev, { lineId, menu_item_id: item.id, name: item.name, price: unitPrice, qty, toppings: sortedToppings, notes }]
    })
  }

  const findBannerProduct = (banner: Banner) => {
    const decoded = decodeURIComponent(`${banner.link_url || ''} ${banner.title || ''}`)
    const queryId = decoded.match(/[?&](?:product|producto|item|menu_item_id)=([^&#]+)/i)?.[1]
    const pathId = decoded.match(/(?:producto|product|item)\/([^/?#]+)/i)?.[1]
    const candidate = queryId || pathId || decoded

    return menuItems.find(item =>
      candidate === item.id ||
      decoded.includes(item.id) ||
      decoded.toLowerCase().includes(item.name.toLowerCase())
    ) || null
  }

  const findBannerCategory = (banner: Banner) => {
    const decoded = decodeURIComponent(`${banner.link_url || ''} ${banner.title || ''}`)
    const queryId = decoded.match(/[?&](?:category|categoria|category_id)=([^&#]+)/i)?.[1]
    const pathId = decoded.match(/(?:category|categoria)\/([^/?#]+)/i)?.[1]
    const candidate = queryId || pathId || decoded

    return categories.find(category =>
      candidate === category.id ||
      decoded.includes(category.id) ||
      decoded.toLowerCase().includes(category.name.toLowerCase())
    ) || null
  }

  const handleBannerClick = (banner: Banner) => {
    const product = findBannerProduct(banner)
    if (product) {
      setSelectedItem(product)
      setItemQty(1)
      return
    }

    const category = findBannerCategory(banner)
    if (category) {
      setActiveCategory(category.id)
      setIsCategoryModalOpen(true)
      return
    }

    if (banner.link_url) {
      window.open(banner.link_url, '_blank', 'noopener,noreferrer')
    }
  }

  const updateQty = (lineId: string, delta: number) => {
    setCart(prev => prev.map(c => c.lineId === lineId ? { ...c, qty: c.qty + delta } : c).filter(c => c.qty > 0))
  }

  const removeFromCart = (lineId: string) => setCart(prev => prev.filter(c => c.lineId !== lineId))

  const getCSRF = async (): Promise<string> => {
    const res = await fetch('/api/csrf-token')
    return res.headers.get('x-csrf-token') || ''
  }

  const placeOrderCash = async () => {
    if (!customerName.trim()) { setError('Ingresa tu nombre'); return }
    setLoading(true); setError(null)
    try {
      const csrf = await getCSRF()
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrf },
        body: JSON.stringify({
          tenantId,
          items: cart.map(c => ({ menu_item_id: c.menu_item_id, name: c.name, price: c.price, qty: c.qty, toppings: c.toppings || [], notes: c.notes })),
          customerInfo: { name: customerName.trim(), phone: '', email: '' },
          deliveryType: 'pickup',
          paymentMethod: 'cash',
          notes: orderNotes.trim() || undefined,
          source: 'kiosk',
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al crear el pedido')
      setConfirmed({ number: data.displayNumber ?? 0, name: customerName.trim() })
      setStep('confirmed')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al procesar')
    } finally {
      setLoading(false)
    }
  }

  const placeOrderStripe = async () => {
    if (!customerName.trim()) { setError('Ingresa tu nombre'); return }
    setLoading(true); setError(null)
    try {
      const res = await fetch(`/api/kiosko/${domain}/stripe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart.map(c => ({ menu_item_id: c.menu_item_id, name: c.name, price: c.price, qty: c.qty, toppings: c.toppings || [], notes: c.notes })),
          customerName: customerName.trim(),
          notes: orderNotes.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al procesar pago')
      window.location.href = data.url
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al procesar')
      setLoading(false)
    }
  }


  // ── Confirmed screen ────────────────────────────────────────────────────────
  if (step === 'confirmed' && confirmed) {
    return (
      <div className="h-screen flex flex-col" style={{ fontFamily: 'Inter, system-ui, sans-serif', backgroundColor, color: pageTextColor }}>
        <AppHeader primaryColor={primaryColor} textColor={primaryTextColor} appName={appName} logoUrl={logoUrl} time={time} />
        <div className="flex-1 flex flex-col items-center justify-center px-8">
          <div className="text-center w-full max-w-2xl">
            <div className="mb-6 inline-flex items-center gap-3 rounded-full px-5 py-3 font-black shadow-lg" style={{ backgroundColor: `${primaryColor}18`, color: pageTextColor }}>
              Pedido recibido
            </div>
            <div
              className="rounded-[2.5rem] p-10 mb-8 shadow-2xl border"
              style={{ backgroundColor: primaryColor, borderColor: `${primaryTextColor}33` }}
            >
              <p className="text-sm tracking-widest uppercase mb-2 font-semibold" style={{ color: primaryTextColor }}>Tu n?mero de turno</p>
              <p className="text-[9rem] font-black tabular-nums leading-none" style={{ color: primaryTextColor }}>
                {pad(confirmed.number)}
              </p>
            </div>
            <p className="text-2xl font-bold mb-2" style={{ color: pageTextColor }}>{confirmed.name}</p>
            <p className="text-xl mb-8 max-w-xl mx-auto" style={{ color: mutedTextColor }}>
              Pasa a recoger cuando tu n?mero aparezca en la pantalla.
            </p>
            <div className="grid grid-cols-2 gap-3 mb-8 text-left">
              <div className="rounded-2xl border p-4" style={{ backgroundColor: surfaceColor, borderColor }}>
                <p className="text-xs font-black uppercase tracking-widest" style={{ color: surfaceMutedTextColor }}>Estado</p>
                <p className="text-lg font-black" style={{ color: surfaceTextColor }}>Enviado a cocina</p>
              </div>
              <div className="rounded-2xl border p-4" style={{ backgroundColor: surfaceColor, borderColor }}>
                <p className="text-xs font-black uppercase tracking-widest" style={{ color: surfaceMutedTextColor }}>Pedido</p>
                <p className="text-lg font-black" style={{ color: surfaceTextColor }}>{cartCount} productos</p>
              </div>
            </div>
            <div className="w-full h-3 rounded-full mb-3 overflow-hidden" style={{ backgroundColor: borderColor }}>
              <div
                className="h-full rounded-full transition-all duration-1000"
                style={{ width: `${(countdown / 12) * 100}%`, backgroundColor: primaryColor }}
              />
            </div>
            <p className="text-sm mb-6" style={{ color: mutedTextColor }}>Nuevo pedido en {countdown}s</p>
            <button
              onClick={reset}
              className="px-10 py-4 rounded-2xl font-bold text-lg transition-opacity hover:opacity-90"
              style={{ backgroundColor: buttonPrimaryColor, color: buttonTextColor }}
            >
              Hacer otro pedido
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Checkout screen ─────────────────────────────────────────────────────────
  if (step === 'checkout') {
    return (
      <div className="h-screen flex flex-col" style={{ fontFamily: 'Inter, system-ui, sans-serif', backgroundColor, color: pageTextColor }}>
        <AppHeader primaryColor={primaryColor} textColor={primaryTextColor} appName={appName} logoUrl={logoUrl} time={time} backLabel="Volver al carrito" onBack={() => setStep('cart')} />
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-lg mx-auto p-6">
            <h2 className="text-2xl font-black mb-6" style={{ color: pageTextColor }}>Finalizar pedido</h2>

            {/* Order summary */}
            <div className="rounded-2xl shadow-sm border p-5 mb-6" style={{ backgroundColor: surfaceColor, borderColor }}>
              <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: surfaceMutedTextColor }}>Resumen</p>
              {cart.map(item => (
                <div key={item.lineId} className="flex justify-between py-2 text-sm border-b last:border-0 gap-4" style={{ borderColor }}>
                  <span style={{ color: surfaceTextColor }}>
                    {item.qty} x {item.name}
                    {item.toppings && item.toppings.length > 0 && (
                      <span className="block text-xs mt-1" style={{ color: surfaceMutedTextColor }}>
                        {item.toppings.map(t => t.name).join(', ')}
                      </span>
                    )}
                  </span>
                  <span className="font-semibold" style={{ color: surfaceTextColor }}>{fmt(item.price * item.qty, currencySymbol)}</span>
                </div>
              ))}
              {taxRate > 0 && (
                <div className="flex justify-between pt-3 text-sm" style={{ color: surfaceMutedTextColor }}>
                  <span>Impuestos ({taxRate}%)</span>
                  <span>{fmt(tax, currencySymbol)}</span>
                </div>
              )}
              <div className="flex justify-between pt-3 border-t mt-2 font-black text-xl" style={{ borderColor }}>
                <span style={{ color: surfaceTextColor }}>Total</span>
                <span style={{ color: primaryColor }}>{fmt(grandTotal, currencySymbol)}</span>
              </div>
            </div>

            {/* Name input */}
            <div className="rounded-2xl shadow-sm border p-5 mb-4" style={{ backgroundColor: surfaceColor, borderColor }}>
              <label className="block">
                <span className="text-sm font-bold mb-2 block" style={{ color: surfaceTextColor }}>
                  Tu nombre <span className="text-red-500">*</span>
                </span>
                <input
                  type="text"
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  placeholder="¿Cómo te llamamos?"
                  className="w-full border-2 rounded-xl px-4 py-4 text-xl placeholder-gray-300 focus:outline-none transition-colors"
                  style={{ borderColor: customerName ? primaryColor : borderColor, color: surfaceTextColor, backgroundColor: surfaceColor }}
                  autoComplete="off"
                />
              </label>
            </div>

            {/* Notes */}
            <div className="rounded-2xl shadow-sm border p-5 mb-6" style={{ backgroundColor: surfaceColor, borderColor }}>
              <label className="block">
                <span className="text-sm font-bold mb-2 block" style={{ color: surfaceTextColor }}>Instrucciones especiales <span className="font-normal" style={{ color: surfaceMutedTextColor }}>(opcional)</span></span>
                <textarea
                  value={orderNotes}
                  onChange={e => setOrderNotes(e.target.value)}
                  placeholder="Sin cebolla, extra salsa..."
                  rows={2}
                  className="w-full border-2 rounded-xl px-4 py-3 text-sm placeholder-gray-300 focus:outline-none resize-none"
                  style={{ borderColor, color: surfaceTextColor, backgroundColor: surfaceColor }}
                />
              </label>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm mb-4 font-medium">
                ⚠️ {error}
              </div>
            )}

            {/* Payment buttons */}
            <div className="space-y-3 pb-8">
              <button
                onClick={placeOrderCash}
                disabled={loading}
                className="w-full py-5 rounded-2xl font-black text-xl flex items-center justify-center gap-3 shadow-lg transition-all active:scale-98 disabled:opacity-50"
                style={{ backgroundColor: buttonPrimaryColor, color: buttonTextColor }}
              >
                🏧 Pagar en Caja
              </button>
              {stripeEnabled && (
                <button
                  onClick={placeOrderStripe}
                  disabled={loading}
                  className="w-full py-5 rounded-2xl font-black text-xl flex items-center justify-center gap-3 shadow-lg transition-all active:scale-98 disabled:opacity-50"
                  style={{ backgroundColor: buttonSecondaryColor, color: secondaryButtonTextColor }}
                >
                  💳 Pagar con Tarjeta
                </button>
              )}
              {loading && (
                <div className="flex items-center justify-center gap-2 pt-2 text-sm" style={{ color: mutedTextColor }}>
                  <div className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor, borderTopColor: primaryColor }} />
                  Procesando...
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Cart screen ─────────────────────────────────────────────────────────────
  if (step === 'cart') {
    return (
      <div className="h-screen flex flex-col" style={{ fontFamily: 'Inter, system-ui, sans-serif', backgroundColor, color: pageTextColor }}>
        <AppHeader primaryColor={primaryColor} textColor={primaryTextColor} appName={appName} logoUrl={logoUrl} time={time} backLabel="Seguir pidiendo" onBack={() => setStep('menu')} />
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-lg mx-auto p-6 pb-40">
            <h2 className="text-2xl font-black mb-5" style={{ color: pageTextColor }}>Tu pedido</h2>

            {cart.length === 0 ? (
              <div className="text-center py-20" style={{ color: mutedTextColor }}>
                <p className="text-6xl mb-4">🛒</p>
                <p className="text-lg font-medium">Tu carrito está vacío</p>
              </div>
            ) : (
              <div className="space-y-3">
                {cart.map(item => (
                  <div key={item.lineId} className="rounded-2xl shadow-sm border p-4 flex items-center gap-4" style={{ backgroundColor: surfaceColor, borderColor }}>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold truncate" style={{ color: surfaceTextColor }}>{item.name}</p>
                      {item.toppings && item.toppings.length > 0 && (
                        <p className="text-xs mt-1 line-clamp-2" style={{ color: surfaceMutedTextColor }}>
                          {item.toppings.map(t => t.name).join(', ')}
                        </p>
                      )}
                      <p className="text-sm mt-0.5" style={{ color: surfaceMutedTextColor }}>{fmt(item.price, currencySymbol)} c/u</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQty(item.lineId, -1)}
                        className="w-10 h-10 rounded-full font-bold text-xl flex items-center justify-center transition-colors"
                        style={{ backgroundColor: `${buttonSecondaryColor}22`, color: secondaryButtonTextColor }}
                      >−</button>
                      <span className="font-black w-6 text-center tabular-nums text-lg" style={{ color: surfaceTextColor }}>{item.qty}</span>
                      <button
                        onClick={() => updateQty(item.lineId, 1)}
                        className="w-10 h-10 rounded-full font-bold text-xl flex items-center justify-center transition-colors"
                        style={{ backgroundColor: buttonPrimaryColor, color: buttonTextColor }}
                      >+</button>
                    </div>
                    <div className="text-right min-w-[80px]">
                      <p className="font-black" style={{ color: surfaceTextColor }}>{fmt(item.price * item.qty, currencySymbol)}</p>
                      <button onClick={() => removeFromCart(item.lineId)} className="text-xs text-red-400 mt-0.5">
                        Eliminar
                      </button>
                    </div>
                  </div>
                ))}

                {recommendedItems.length > 0 && (
                  <div className="rounded-3xl border p-4 shadow-sm" style={{ backgroundColor: surfaceColor, borderColor }}>
                    <div className="flex items-end justify-between gap-3 mb-4">
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.22em]" style={{ color: surfaceMutedTextColor }}>
                          Completa tu pedido
                        </p>
                        <p className="text-xl font-black" style={{ color: surfaceTextColor }}>
                          Algo mas para acompanar?
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {recommendedItems.map(item => (
                        <button
                          key={item.id}
                          onClick={() => { setSelectedItem(item); setItemQty(1); setStep('menu') }}
                          className="rounded-2xl border overflow-hidden text-left active:scale-[0.98] transition-transform"
                          style={{ borderColor, backgroundColor }}
                        >
                          <div className="h-24 bg-white overflow-hidden">
                            {item.image_url ? (
                              <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-4xl">+</div>
                            )}
                          </div>
                          <div className="p-3">
                            <p className="font-black text-sm leading-tight line-clamp-2 min-h-[2.25rem]" style={{ color: surfaceTextColor }}>{item.name}</p>
                            <div className="flex items-center justify-between mt-2">
                              <span className="font-black" style={{ color: primaryColor }}>{fmt(item.price, currencySymbol)}</span>
                              <span className="rounded-full px-3 py-1 text-xs font-black" style={{ backgroundColor: buttonPrimaryColor, color: buttonTextColor }}>
                                Agregar
                              </span>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {taxRate > 0 && (
                  <div className="rounded-2xl shadow-sm border p-4 space-y-2" style={{ backgroundColor: surfaceColor, borderColor }}>
                    <div className="flex justify-between text-sm" style={{ color: surfaceMutedTextColor }}>
                      <span>Subtotal</span><span>{fmt(cartTotal, currencySymbol)}</span>
                    </div>
                    <div className="flex justify-between text-sm" style={{ color: surfaceMutedTextColor }}>
                      <span>Impuestos ({taxRate}%)</span><span>{fmt(tax, currencySymbol)}</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {cart.length > 0 && (
          <div className="fixed bottom-0 left-0 right-0 border-t p-4 shadow-2xl" style={{ backgroundColor: surfaceColor, borderColor }}>
            <div className="max-w-lg mx-auto">
              <div className="flex items-center justify-between mb-3 px-1">
                <span className="font-medium" style={{ color: surfaceMutedTextColor }}>Total a pagar</span>
                <span className="text-2xl font-black" style={{ color: primaryColor }}>{fmt(grandTotal, currencySymbol)}</span>
              </div>
              <button
                onClick={() => setStep('checkout')}
                className="w-full py-4 rounded-2xl font-black text-xl shadow-lg transition-all active:scale-98"
                style={{ backgroundColor: buttonPrimaryColor, color: buttonTextColor }}
              >
                Continuar con el pago →
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── Menu screen ─────────────────────────────────────────────────────────────
  const visibleItems = activeCategory
    ? menuItems.filter(i => i.category_id === activeCategory)
    : menuItems
  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ fontFamily: 'Inter, system-ui, sans-serif', backgroundColor, color: pageTextColor }}>

      {/* Fullscreen prompt overlay */}
      {showFsPrompt && !isFullscreen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center cursor-pointer"
          style={{ backgroundColor: primaryColor }}
          onClick={() => { toggleFullscreen(); setShowFsPrompt(false) }}
        >
          <div className="text-center" style={{ color: primaryTextColor }}>
            <p className="text-8xl mb-8">🖥️</p>
            <p className="text-4xl font-black mb-4">Toca para comenzar</p>
            <p className="text-xl opacity-80">{appName}</p>
          </div>
        </div>
      )}

      <AppHeader primaryColor={primaryColor} textColor={primaryTextColor} appName={appName} logoUrl={logoUrl} time={time} cartCount={cartCount} />

      {/* Body: sidebar only (products in modal) */}
      <div className="flex flex-1 flex-col overflow-hidden md:flex-row">

        {/* ── Category carousel ── */}
        <aside
          ref={categoryScrollRef}
          className="w-full flex-shrink-0 overflow-x-auto border-b p-3 hide-scrollbar md:w-72 md:overflow-y-auto md:border-b-0 md:border-r md:p-5"
          style={{ WebkitOverflowScrolling: 'touch', backgroundColor: surfaceColor, borderColor }}
        >
          <div className="hidden sticky top-0 z-10 pb-4 mb-3 md:block" style={{ backgroundColor: surfaceColor }}>
            <p className="text-xs font-black uppercase tracking-[0.25em]" style={{ color: surfaceMutedTextColor }}>Menu</p>
            <p className="text-3xl font-black leading-none mt-1" style={{ color: surfaceTextColor }}>Categorias</p>
          </div>
          <div className="flex gap-3 md:block md:space-y-5">
            {/* Show categories three times for infinite scroll effect */}
            {[...categories, ...categories, ...categories].map((cat, idx) => {
              const isPressed = pressedCategory === `${cat.id}-${idx}`
              return (
                <button
                  key={`${cat.id}-${idx}`}
                  onPointerDown={() => setPressedCategory(`${cat.id}-${idx}`)}
                  onPointerUp={() => setPressedCategory(null)}
                  onPointerCancel={() => setPressedCategory(null)}
                  onPointerLeave={() => setPressedCategory(null)}
                  onClick={() => { setActiveCategory(cat.id); setIsCategoryModalOpen(true); setPressedCategory(null) }}
                  className="min-w-[230px] rounded-[1.3rem] overflow-hidden shadow-lg hover:shadow-xl transition-all flex items-center gap-3 group active:scale-95 p-2.5 border md:w-full md:min-w-0 md:rounded-[1.75rem] md:gap-4 md:p-3"
                  style={{
                    backgroundColor: isPressed ? primaryColor : surfaceColor,
                    borderColor: isPressed ? primaryColor : borderColor,
                    color: isPressed ? primaryTextColor : surfaceTextColor,
                    boxShadow: isPressed ? `0 16px 34px ${primaryColor}44` : undefined,
                  }}
                >
                  <div className="relative overflow-hidden h-16 w-16 rounded-[1rem] flex items-center justify-center flex-shrink-0 md:h-24 md:w-24 md:rounded-[1.35rem]" style={{ backgroundColor: '#ffffff', color: isPressed ? primaryTextColor : accentTextColor }}>
                    {cat.image_url ? (
                      <img
                        src={cat.image_url}
                        alt={cat.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                    ) : (
                      <div className="text-6xl">🍽️</div>
                    )}
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <p className="font-black text-sm leading-tight line-clamp-2 md:text-lg">{cat.name}</p>
                    <p className="text-xs font-bold uppercase tracking-widest mt-2 opacity-70">Ver productos</p>
                  </div>
                </button>
              )
            })}
          </div>
        </aside>

        <div className="flex-1 overflow-hidden p-3 md:p-7">
          {banners.length > 0 ? (
            <section className="grid h-full grid-cols-1 gap-3 overflow-y-auto md:grid-cols-2 md:grid-rows-2 md:gap-5">
              {banners.slice(0, 4).map((banner, idx) => (
                <button
                  key={banner.id}
                  onClick={() => handleBannerClick(banner)}
                  className={`${idx === 0 ? 'md:col-span-2' : ''} relative min-h-[180px] overflow-hidden rounded-[1.4rem] border text-left shadow-2xl active:scale-[0.99] transition-transform md:min-h-0 md:rounded-[2rem]`}
                  style={{ backgroundColor: surfaceColor, borderColor }}
                >
                  <img src={banner.image_url} alt={banner.title} className="absolute inset-0 h-full w-full object-cover" />
                  <div className="absolute inset-0" style={{ background: idx === 0 ? 'linear-gradient(90deg, rgba(0,0,0,0.68), rgba(0,0,0,0.05))' : 'linear-gradient(0deg, rgba(0,0,0,0.66), rgba(0,0,0,0.05))' }} />
                  <div className="relative z-10 flex h-full flex-col justify-end p-4 text-white md:p-7">
                    <span className="mb-3 w-fit rounded-full px-4 py-2 text-xs font-black uppercase tracking-widest" style={{ backgroundColor: idx === 0 ? primaryColor : accentColor, color: idx === 0 ? primaryTextColor : accentTextColor }}>
                      Publicidad
                    </span>
                    <p className={`${idx === 0 ? 'text-3xl md:text-5xl' : 'text-2xl md:text-3xl'} line-clamp-2 font-black leading-none`}>
                      {banner.title}
                    </p>
                    {banner.link_url && (
                      <p className="mt-3 text-sm font-black uppercase tracking-widest opacity-85">
                        Tocar para ordenar
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </section>
          ) : (
            <section
              className="flex h-full flex-col items-center justify-center rounded-[1.4rem] border p-5 text-center md:rounded-[2rem] md:p-10"
              style={{ backgroundColor: surfaceColor, borderColor, color: surfaceTextColor }}
            >
              <p className="text-sm font-black uppercase tracking-[0.28em]" style={{ color: mutedTextColor }}>Publicidad</p>
              <h1 className="mt-4 max-w-2xl text-3xl font-black leading-none md:text-6xl">Agrega banners para mostrar promociones aqui</h1>
              <p className="mt-5 max-w-xl text-base md:text-xl" style={{ color: surfaceMutedTextColor }}>
                Los productos se muestran al tocar una categoria del carrusel izquierdo.
              </p>
            </section>
          )}
        </div>
      </div>

      {/* Cart bar */}
      {cartCount > 0 && (
        <div className="flex-shrink-0 border-t px-3 py-3 shadow-2xl md:px-6 md:py-4" style={{ backgroundColor: surfaceColor, borderColor }}>
          <div className="mx-auto flex max-w-5xl items-center gap-3 md:gap-4">
            <div
              className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl text-xl font-black shadow-lg md:h-16 md:w-16 md:text-2xl"
              style={{ backgroundColor: `${buttonPrimaryColor}18`, color: primaryColor }}
            >
              {cartCount}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-black uppercase tracking-[0.24em]" style={{ color: surfaceMutedTextColor }}>
                Pedido en curso
              </p>
              <p className="truncate text-xl font-black" style={{ color: surfaceTextColor }}>
                {cartCount} {cartCount === 1 ? 'producto seleccionado' : 'productos seleccionados'}
              </p>
            </div>
            <div className="hidden text-right sm:block">
              <p className="text-xs font-bold uppercase tracking-widest" style={{ color: surfaceMutedTextColor }}>Total</p>
              <p className="text-3xl font-black leading-none" style={{ color: primaryColor }}>{fmt(grandTotal, currencySymbol)}</p>
            </div>
            <button
              onClick={() => setStep('cart')}
              className="flex min-w-0 flex-shrink-0 items-center justify-between gap-3 rounded-2xl px-4 py-4 text-sm font-black shadow-xl transition-transform active:scale-[0.98] md:min-w-[260px] md:gap-5 md:px-6 md:py-5 md:text-xl"
              style={{ backgroundColor: buttonPrimaryColor, color: buttonTextColor }}
            >
              <span>Ver pedido</span>
              <span className="rounded-full px-4 py-2 text-base" style={{ backgroundColor: `${buttonTextColor}24` }}>
                {fmt(grandTotal, currencySymbol)}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* ── Category modal ── */}
      {isCategoryModalOpen && activeCategory && (
        <CategoryProductModal
          category={categories.find(c => c.id === activeCategory)!}
          products={visibleItems}
          banners={[]}
          currencySymbol={currencySymbol}
          primaryColor={primaryColor}
          buttonColor={buttonPrimaryColor}
          surfaceColor={surfaceColor}
          textColor={surfaceTextColor}
          mutedTextColor={surfaceMutedTextColor}
          borderColor={borderColor}
          headerTextColor={primaryTextColor}
          onClose={() => setIsCategoryModalOpen(false)}
          onSelectItem={item => { setSelectedItem(item); setItemQty(1) }}
        />
      )}

      {/* ── Item modal ── */}
      {selectedItem && (
        <div
          className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4"
          onClick={() => setSelectedItem(null)}
        >
          <div
            className="rounded-3xl w-full max-w-md overflow-hidden shadow-2xl"
            style={{ backgroundColor: surfaceColor }}
            onClick={e => e.stopPropagation()}
          >
            {selectedItem.image_url ? (
              <img src={selectedItem.image_url} alt={selectedItem.name} className="w-full h-56 object-cover" />
            ) : (
              <div className="w-full h-44 flex items-center justify-center text-7xl" style={{ backgroundColor: '#ffffff' }}>
                🍽️
              </div>
            )}
            <div className="p-6">
              <div className="flex items-start justify-between mb-1 gap-4">
                <h3 className="text-2xl font-black leading-tight" style={{ color: surfaceTextColor }}>{selectedItem.name}</h3>
                <p className="text-2xl font-black flex-shrink-0" style={{ color: primaryColor }}>
                  {fmt(selectedItem.price, currencySymbol)}
                </p>
              </div>
              {selectedItem.description && (
                <p className="text-sm mb-5 leading-relaxed" style={{ color: surfaceMutedTextColor }}>{selectedItem.description}</p>
              )}

              {toppingsForSelectedItem.length > 0 && (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-black uppercase tracking-widest" style={{ color: surfaceMutedTextColor }}>Adicionales</p>
                    <p className="text-xs font-bold" style={{ color: surfaceMutedTextColor }}>Opcional</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                    {toppingsForSelectedItem.map(topping => {
                      const checked = selectedToppings.some(t => t.id === topping.id)
                      return (
                        <button
                          key={topping.id}
                          type="button"
                          onClick={() => toggleTopping(topping)}
                          className="w-full rounded-2xl border p-4 flex items-center gap-3 text-left transition-transform active:scale-[0.99]"
                          style={{
                            backgroundColor: checked ? `${buttonPrimaryColor}18` : backgroundColor,
                            borderColor: checked ? buttonPrimaryColor : borderColor,
                          }}
                        >
                          <span
                            className="w-7 h-7 rounded-full border-2 flex items-center justify-center font-black text-sm flex-shrink-0"
                            style={{
                              borderColor: checked ? buttonPrimaryColor : borderColor,
                              backgroundColor: checked ? buttonPrimaryColor : surfaceColor,
                              color: checked ? buttonTextColor : surfaceMutedTextColor,
                            }}
                          >
                            {checked ? 'OK' : '+'}
                          </span>
                          <span className="flex-1 min-w-0">
                            <span className="block font-black leading-tight" style={{ color: surfaceTextColor }}>{topping.name}</span>
                            {topping.price > 0 && (
                              <span className="block text-xs mt-0.5" style={{ color: surfaceMutedTextColor }}>+ {fmt(topping.price, currencySymbol)}</span>
                            )}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-center gap-6 mb-6 py-4 rounded-2xl" style={{ backgroundColor, border: `1px solid ${borderColor}` }}>
                <button
                  onClick={() => setItemQty(q => Math.max(1, q - 1))}
                  className="w-14 h-14 rounded-full text-3xl font-bold flex items-center justify-center transition-colors"
                  style={{ backgroundColor: `${buttonSecondaryColor}22`, color: secondaryButtonTextColor }}
                >−</button>
                <span className="text-4xl font-black w-12 text-center tabular-nums" style={{ color: surfaceTextColor }}>{itemQty}</span>
                <button
                  onClick={() => setItemQty(q => q + 1)}
                  className="w-14 h-14 rounded-full text-3xl font-bold flex items-center justify-center transition-colors shadow-md"
                  style={{ backgroundColor: buttonPrimaryColor, color: buttonTextColor }}
                >+</button>
              </div>

              <button
                onClick={() => { addToCart(selectedItem, itemQty, selectedToppings); setSelectedItem(null) }}
                className="w-full py-5 rounded-2xl font-black text-xl transition-all active:scale-98 shadow-lg"
                style={{ backgroundColor: buttonPrimaryColor, color: buttonTextColor }}
              >
                Agregar - {fmt(selectedUnitPrice * itemQty, currencySymbol)}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Feature Gates - Control qué funcionalidades está permitido usar según el plan
 *
 * Usado en:
 * - Admin dashboard para mostrar/ocultar menú items
 * - API endpoints para validar permiso
 * - UI para mostrar "Premium only" badges
 */

export type SubscriptionPlan = 'free' | 'basic' | 'pro' | 'premium' | 'trial'
export type Feature =
  | 'categories'
  | 'items'
  | 'orders'
  | 'delivery'
  | 'reservations'
  | 'staff_management'
  | 'analytics'
  | 'custom_domain'
  | 'api_access'

export const PLAN_FEATURES: Record<SubscriptionPlan, Record<Feature, boolean>> = {
  trial: {
    categories: true,
    items: true,
    orders: true,
    delivery: false,
    reservations: false,
    staff_management: false,
    analytics: false,
    custom_domain: false,
    api_access: false,
  },
  free: {
    categories: true,
    items: true,
    orders: true,
    delivery: false,
    reservations: false,
    staff_management: false,
    analytics: false,
    custom_domain: false,
    api_access: false,
  },
  basic: {
    categories: true,
    items: true,
    orders: true,
    delivery: true,
    reservations: false,
    staff_management: false,
    analytics: false,
    custom_domain: false,
    api_access: false,
  },
  pro: {
    categories: true,
    items: true,
    orders: true,
    delivery: true,
    reservations: true,
    staff_management: true,
    analytics: false,
    custom_domain: false,
    api_access: false,
  },
  premium: {
    categories: true,
    items: true,
    orders: true,
    delivery: true,
    reservations: true,
    staff_management: true,
    analytics: true,
    custom_domain: true,
    api_access: true,
  },
}

/**
 * Verifica si un plan tiene acceso a una feature
 */
export function canUseFeature(plan: SubscriptionPlan | null | undefined, feature: Feature): boolean {
  if (!plan) return false
  return PLAN_FEATURES[plan]?.[feature] ?? false
}

/**
 * Obtiene las features disponibles para un plan
 */
export function getPlanFeatures(plan: SubscriptionPlan): Feature[] {
  return Object.entries(PLAN_FEATURES[plan] || {})
    .filter(([_, enabled]) => enabled)
    .map(([feature]) => feature as Feature)
}

/**
 * Obtiene las features NO disponibles (para mostrar "upgrade")
 */
export function getLockedFeatures(plan: SubscriptionPlan): Feature[] {
  return Object.entries(PLAN_FEATURES[plan] || {})
    .filter(([_, enabled]) => !enabled)
    .map(([feature]) => feature as Feature)
}

/**
 * Información amigable para mostrar al usuario
 */
export const FEATURE_LABELS: Record<Feature, { name: string; description: string }> = {
  categories: {
    name: 'Categorías de Menú',
    description: 'Organiza tu menú en categorías',
  },
  items: {
    name: 'Items de Menú',
    description: 'Agrega productos con precios e imágenes',
  },
  orders: {
    name: 'Gestión de Órdenes',
    description: 'Recibe y gestiona órdenes de clientes',
  },
  delivery: {
    name: 'Delivery',
    description: 'Habilita entregas a domicilio',
  },
  reservations: {
    name: 'Reservaciones',
    description: 'Acepta reservas de mesas',
  },
  staff_management: {
    name: 'Gestión de Staff',
    description: 'Sistema de Mesero/Cocina',
  },
  analytics: {
    name: 'Analytics',
    description: 'Reportes y estadísticas avanzadas',
  },
  custom_domain: {
    name: 'Dominio Personalizado',
    description: 'Usa tu propio dominio (mirestaurante.com)',
  },
  api_access: {
    name: 'API Access',
    description: 'Integración con sistemas externos',
  },
}

/**
 * Información de planes para mostrar en página de pricing
 */
export const PLAN_INFO = {
  trial: {
    name: 'Prueba Gratis',
    monthlyPrice: 0,
    duration: '14 días',
    description: 'Prueba completa para empezar',
    cta: 'Registrarse',
    color: 'bg-blue-50 border-blue-200',
  },
  free: {
    name: 'Gratuito',
    monthlyPrice: 0,
    duration: 'Indefinido',
    description: 'Menú básico sin costo',
    cta: 'Usar Gratis',
    color: 'bg-gray-50 border-gray-200',
  },
  basic: {
    name: 'Básico',
    monthlyPrice: 30,
    duration: 'por mes',
    description: 'Menú + Delivery',
    cta: 'Comprar',
    color: 'bg-green-50 border-green-200',
  },
  pro: {
    name: 'Profesional',
    monthlyPrice: 60,
    duration: 'por mes',
    description: 'Todo lo anterior + Reservas + Staff',
    cta: 'Comprar',
    color: 'bg-purple-50 border-purple-200',
    badge: '⭐ Popular',
  },
  premium: {
    name: 'Premium',
    monthlyPrice: 120,
    duration: 'por mes',
    description: 'Todo incluido + Analytics + Dominio',
    cta: 'Comprar',
    color: 'bg-amber-50 border-amber-200',
    badge: '👑 El mejor',
  },
}

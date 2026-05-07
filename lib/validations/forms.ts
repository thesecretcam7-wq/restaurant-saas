import { z } from 'zod'

// Login & Auth
export const adminLoginSchema = z.object({
  email: z.string()
    .min(1, 'El email es obligatorio')
    .email('Ingresa un email válido'),
  password: z.string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres'),
})

export const staffPinSchema = z.object({
  pin: z.string()
    .length(6, 'El PIN debe tener 6 dígitos')
    .regex(/^\d+$/, 'El PIN debe contener solo números'),
})

// Checkout & Orders
export const checkoutSchema = z.object({
  name: z.string()
    .min(1, 'El nombre es obligatorio')
    .min(3, 'El nombre debe tener al menos 3 caracteres')
    .max(100, 'El nombre no puede exceder 100 caracteres'),
  phone: z.string()
    .min(1, 'El teléfono es obligatorio')
    .regex(/^[\d\s\-\+\(\)]+$/, 'El teléfono contiene caracteres inválidos')
    .min(7, 'El teléfono debe tener al menos 7 dígitos'),
  email: z.string()
    .email('Email inválido')
    .or(z.literal('')),
  delivery_type: z.enum(['pickup', 'delivery'], { message: 'Tipo de entrega inválido' }),
  delivery_address: z.string().optional(),
  payment_method: z.enum(['stripe', 'cash'], { message: 'Método de pago inválido' }),
  notes: z.string().optional(),
}).refine(
  data => data.delivery_type !== 'delivery' || (data.delivery_address && data.delivery_address.trim().length > 0),
  {
    message: 'La dirección de entrega es obligatoria',
    path: ['delivery_address'],
  }
)

// Products
export const productSchema = z.object({
  name: z.string()
    .min(1, 'El nombre del producto es obligatorio')
    .min(3, 'El nombre debe tener al menos 3 caracteres')
    .max(100, 'El nombre no puede exceder 100 caracteres'),
  description: z.string()
    .max(500, 'La descripción no puede exceder 500 caracteres')
    .optional(),
  price: z.coerce.number()
    .gt(0, 'El precio debe ser mayor a 0')
    .max(999999.99, 'El precio es muy alto'),
  category_id: z.string().optional(),
  image_url: z.string().optional(),
  available: z.boolean().default(true),
  featured: z.boolean().default(false),
  show_in_upsell: z.boolean().default(false),
  requires_kitchen: z.boolean().default(true),
})

// Categories
export const categorySchema = z.object({
  name: z.string()
    .min(1, 'El nombre de la categoría es obligatorio')
    .min(3, 'El nombre debe tener al menos 3 caracteres')
    .max(50, 'El nombre no puede exceder 50 caracteres'),
})

// Toppings/Options
export const toppingSchema = z.object({
  name: z.string()
    .min(1, 'El nombre del topping es obligatorio')
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(50, 'El nombre no puede exceder 50 caracteres'),
  price: z.coerce.number()
    .nonnegative('El precio no puede ser negativo')
    .max(10000, 'El precio es muy alto'),
  is_required: z.boolean().default(false),
})

export const toppingGroupSchema = z.object({
  name: z.string()
    .min(1, 'El nombre del grupo es obligatorio')
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(50, 'El nombre no puede exceder 50 caracteres'),
  allow_multiple: z.boolean().default(true),
  is_required: z.boolean().default(false),
  toppings: z.array(toppingSchema).optional(),
})

// Promo Codes
export const promoCodeSchema = z.object({
  code: z.string()
    .min(1, 'El código es obligatorio')
    .min(3, 'El código debe tener al menos 3 caracteres')
    .max(20, 'El código no puede exceder 20 caracteres')
    .regex(/^[A-Z0-9\-]+$/, 'El código solo puede contener letras mayúsculas, números y guiones'),
  discount_type: z.enum(['percentage', 'fixed'], { message: 'Tipo de descuento inválido' }),
  discount_value: z.coerce.number()
    .gt(0, 'El valor del descuento debe ser mayor a 0'),
  min_order_value: z.coerce.number()
    .nonnegative('El valor mínimo no puede ser negativo')
    .optional(),
  max_uses: z.coerce.number()
    .int('Debe ser un número entero')
    .positive('Debe ser mayor a 0')
    .optional(),
  active: z.boolean().default(true),
}).refine(
  data => data.discount_type === 'fixed' || (data.discount_value >= 0 && data.discount_value <= 100),
  {
    message: 'El porcentaje debe estar entre 0 y 100',
    path: ['discount_value'],
  }
)

// Restaurant Settings
export const restaurantSettingsSchema = z.object({
  delivery_enabled: z.boolean().default(false),
  delivery_fee: z.coerce.number()
    .nonnegative('El costo de envío no puede ser negativo'),
  cash_payment_enabled: z.boolean().default(true),
  tax_rate: z.coerce.number()
    .nonnegative('La tasa de impuesto no puede ser negativa')
    .max(100, 'La tasa no puede exceder 100%'),
  min_order_value: z.coerce.number()
    .nonnegative('El valor mínimo no puede ser negativo'),
})

// Types for client-side usage
export type AdminLoginInput = z.infer<typeof adminLoginSchema>
export type CheckoutInput = z.infer<typeof checkoutSchema>
export type ProductInput = z.infer<typeof productSchema>
export type CategoryInput = z.infer<typeof categorySchema>
export type ToppingInput = z.infer<typeof toppingSchema>
export type PromoCodeInput = z.infer<typeof promoCodeSchema>
export type RestaurantSettingsInput = z.infer<typeof restaurantSettingsSchema>

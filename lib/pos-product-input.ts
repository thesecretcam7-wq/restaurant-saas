import { z } from 'zod'
import { productSchema } from './validations/forms'

export const posProductInput = z.object({
  tenantId: z.uuid(),
  requestId: z.uuid(),
  name: z.string().trim().pipe(productSchema.shape.name),
  price: z.union([z.number(), z.string().trim().regex(/^\d+(?:[.,]\d{1,2})?$/, 'Precio invalido')])
    .transform(value => Number(String(value).replace(',', '.')))
    .pipe(z.number().gt(0, 'El precio debe ser mayor que cero').max(999999.99, 'El precio es muy alto')
      .multipleOf(0.01, 'Usa como maximo dos decimales')),
  categoryId: z.uuid('Selecciona una categoria'),
  showInStore: z.boolean().default(false),
}).strict()


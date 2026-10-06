import { z } from 'zod'

/** FR-064 */
export const gastoSchema = z.object({
  categoriaId: z.string().min(1, 'Elige la categoría.'),
  monto: z
    .string()
    .trim()
    .regex(/^\d+(\.\d{1,2})?$/, 'Escribe el monto en pesos, por ejemplo 1200.')
    .transform(Number)
    .refine((n) => n > 0, 'El monto debe ser mayor que cero.'),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Elige la fecha.'),
  descripcion: z.string().trim().max(120, 'Máximo 120 caracteres.'),
})

export type GastoInput = z.input<typeof gastoSchema>
export type GastoOutput = z.output<typeof gastoSchema>

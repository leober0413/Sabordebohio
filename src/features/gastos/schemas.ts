import { z } from 'zod'

/** FR-064 */
export const gastoSchema = z.object({
  categoriaId: z.string().min(1, 'Elige la categoría.'),
  /** Unidades compradas; con más de 1, `monto` es el precio por unidad. */
  cantidad: z.number().int().min(1).max(999),
  monto: z
    .string()
    .trim()
    .regex(/^\d+(\.\d{1,2})?$/, 'Escribe el monto en pesos, por ejemplo 1200.')
    .transform(Number)
    .refine((n) => n > 0, 'El monto debe ser mayor que cero.'),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Elige la fecha.'),
  descripcion: z.string().trim().max(120, 'Máximo 120 caracteres.'),
})

/** Total del gasto: cantidad × precio por unidad, en centavos exactos. */
export function totalGasto(cantidad: number, monto: number): number {
  return Math.round(cantidad * monto * 100) / 100
}

export type GastoInput = z.input<typeof gastoSchema>
export type GastoOutput = z.output<typeof gastoSchema>

import { z } from 'zod'

const CANTIDAD = /^\d+(\.\d{1,3})?$/
const MONTO = /^\d+(\.\d{1,2})?$/

/** FR-061 */
export const compraSchema = z.object({
  ingredienteId: z.string().min(1, 'Elige el ingrediente.'),
  cantidad: z
    .string()
    .trim()
    .regex(CANTIDAD, 'Escribe la cantidad, por ejemplo 5 o 2.5.')
    .transform(Number)
    .refine((n) => n > 0, 'La cantidad debe ser mayor que cero.'),
  costoTotal: z
    .string()
    .trim()
    .regex(MONTO, 'Escribe cuánto costó, por ejemplo 750.')
    .transform(Number),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Elige la fecha.'),
})

export type CompraInput = z.input<typeof compraSchema>
export type CompraOutput = z.output<typeof compraSchema>

/** FR-062: cuánto hay contado (0 o más). */
export const conteoSchema = z
  .string()
  .trim()
  .regex(CANTIDAD, 'Escribe cuánto hay, por ejemplo 1.5.')
  .transform(Number)

/** FR-060, FR-065 */
export const ingredienteSchema = z.object({
  nombre: z.string().trim().min(1, 'Escribe el nombre.').max(40, 'Máximo 40 caracteres.'),
  unidad: z.string().trim().min(1, 'Elige la unidad.').max(15, 'Máximo 15 caracteres.'),
  stockMinimo: z
    .string()
    .trim()
    .refine((v) => v === '' || CANTIDAD.test(v), 'Escribe un número o déjalo vacío.')
    .transform((v) => (v === '' ? null : Number(v))),
})

export type IngredienteInput = z.input<typeof ingredienteSchema>
export type IngredienteOutput = z.output<typeof ingredienteSchema>

export const UNIDADES = ['lb', 'kg', 'oz', 'unidad', 'litro', 'galón', 'paquete'] as const

/** FR-052 */
export const MOTIVOS_AJUSTE = ['merma', 'consumo propio', 'conteo', 'otro'] as const
export type MotivoAjuste = (typeof MOTIVOS_AJUSTE)[number]

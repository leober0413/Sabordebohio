import { z } from 'zod'

const MONTO = /^\d+(\.\d{1,2})?$/
const ENTERO = /^\d+$/

const mensajeMonto = (campo: string) => `Escribe el ${campo} en pesos, por ejemplo 550 o 45.50.`

const monto = (campo: string) =>
  z.string().trim().regex(MONTO, mensajeMonto(campo)).transform(Number)

/** Texto opcional: vacío → null; si no, debe cumplir el patrón. */
const opcional = (patron: RegExp, mensaje: string) =>
  z
    .string()
    .trim()
    .refine((v) => v === '' || patron.test(v), mensaje)
    .transform((v) => (v === '' ? null : Number(v)))

/** Lista de precios (FR-002). Los campos del formulario son texto. */
export const preciosSchema = z.object({
  precioSuelta: opcional(MONTO, mensajeMonto('precio suelta')),
  precioDocena: monto('precio de docena'),
  minimoDocena: z
    .string()
    .trim()
    .regex(ENTERO, 'Escribe un número entero.')
    .transform(Number)
    .refine((n) => n >= 1 && n <= 12, 'Debe estar entre 1 y 12.'),
  redondeo: z.enum(['1', '5', '10'], 'Elige 1, 5 o 10 pesos.').transform(Number),
})

export type PreciosInput = z.input<typeof preciosSchema>
export type PreciosOutput = z.output<typeof preciosSchema>

export const nombreSaborSchema = z
  .string()
  .trim()
  .min(1, 'Escribe el nombre del sabor.')
  .max(40, 'Máximo 40 caracteres.')

export const stockMinimoSchema = opcional(ENTERO, 'Escribe un número entero o déjalo vacío.')

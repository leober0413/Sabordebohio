import { z } from 'zod'

const MONTO = /^\d+(\.\d{1,2})?$/

export const pedidoSchema = z
  .object({
    clienteId: z.string().min(1, 'Elige un cliente.'),
    cantidades: z.record(z.string(), z.number().int().min(0).optional()),
    fechaEntrega: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Elige la fecha de entrega.'),
    horaEntrega: z.string().regex(/^(\d{2}:\d{2}(:\d{2})?)?$/, 'Hora no válida.'),
    tipoEntrega: z.enum(['recoge', 'delivery']),
    costoEnvio: z
      .string()
      .trim()
      .refine((v) => v === '' || MONTO.test(v), 'Escribe el costo en pesos, por ejemplo 100.'),
    notas: z.string().max(300, 'Máximo 300 caracteres.'),
  })
  .refine((v) => totalUnidades(v.cantidades) > 0, {
    path: ['cantidades'],
    message: 'Agrega al menos una catibía.',
  })

export type PedidoFormValues = z.infer<typeof pedidoSchema>

export function totalUnidades(cantidades: Record<string, number | undefined>): number {
  return Object.values(cantidades).reduce<number>((a, n) => a + (n && n > 0 ? n : 0), 0)
}

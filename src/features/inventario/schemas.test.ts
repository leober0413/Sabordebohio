import { describe, expect, it } from 'vitest'

import { compraSchema, conteoSchema, ingredienteSchema } from '@/features/inventario/schemas'

describe('esquemas de inventario', () => {
  it('compra: convierte cantidad y costo (FR-061)', () => {
    expect(
      compraSchema.parse({
        ingredienteId: 'q',
        cantidad: '5',
        costoTotal: '750',
        fecha: '2026-10-06',
      }),
    ).toEqual({ ingredienteId: 'q', cantidad: 5, costoTotal: 750, fecha: '2026-10-06' })
  })

  it('compra: rechaza cantidad 0 y textos con mensajes en español', () => {
    const r = compraSchema.safeParse({
      ingredienteId: '',
      cantidad: '0',
      costoTotal: 'x',
      fecha: '',
    })
    const mensajes = r.error?.issues.map((i) => i.message)
    expect(mensajes).toEqual(
      expect.arrayContaining([
        'Elige el ingrediente.',
        'La cantidad debe ser mayor que cero.',
        'Escribe cuánto costó, por ejemplo 750.',
      ]),
    )
  })

  it('conteo: admite decimales y 0 (FR-062)', () => {
    expect(conteoSchema.parse('1.5')).toBe(1.5)
    expect(conteoSchema.parse('0')).toBe(0)
    expect(conteoSchema.safeParse('-1').success).toBe(false)
  })

  it('ingrediente: mínimo vacío = sin mínimo (FR-065)', () => {
    expect(ingredienteSchema.parse({ nombre: ' Queso ', unidad: 'lb', stockMinimo: '' })).toEqual({
      nombre: 'Queso',
      unidad: 'lb',
      stockMinimo: null,
    })
  })
})

import { describe, expect, it } from 'vitest'

import { preciosSchema } from '@/features/ajustes/schemas'

describe('preciosSchema', () => {
  it('convierte el formulario en números y deja el precio suelta vacío como null', () => {
    expect(
      preciosSchema.parse({
        precioSuelta: '',
        precioDocena: '550',
        minimoDocena: '6',
        redondeo: '5',
      }),
    ).toEqual({ precioSuelta: null, precioDocena: 550, minimoDocena: 6, redondeo: 5 })
  })

  it('rechaza montos y mínimos inválidos con mensajes en español', () => {
    const r = preciosSchema.safeParse({
      precioSuelta: 'abc',
      precioDocena: '-1',
      minimoDocena: '13',
      redondeo: '1',
    })
    expect(r.success).toBe(false)
    const mensajes = r.error?.issues.map((i) => i.message)
    expect(mensajes).toContain('Escribe el precio suelta en pesos, por ejemplo 550 o 45.50.')
    expect(mensajes).toContain('Debe estar entre 1 y 12.')
    expect(mensajes).not.toContain('Invalid input')
  })
})

import { describe, expect, it } from 'vitest'

import { calcularPrecio, type ConfigPrecios } from '@/lib/precio'

// Misma tabla que supabase/tests/01_calcular_precio.test.sql (docs/testing.md).
// Si cambias un caso aquí, cámbialo también allí.
const base: ConfigPrecios = { precioSuelta: 50, precioDocena: 550, minimoDocena: 6, redondeo: 1 }

const casos: Array<{ unidades: number; cfg?: Partial<ConfigPrecios>; esperado: number }> = [
  { unidades: 1, esperado: 50 },
  { unidades: 5, esperado: 250 },
  { unidades: 6, esperado: 275 },
  { unidades: 7, esperado: 321 },
  { unidades: 8, esperado: 367 },
  { unidades: 9, esperado: 413 },
  { unidades: 12, esperado: 550 },
  { unidades: 18, esperado: 825 },
  { unidades: 24, esperado: 1100 },
  { unidades: 8, cfg: { redondeo: 5 }, esperado: 365 },
  { unidades: 8, cfg: { redondeo: 10 }, esperado: 370 },
  { unidades: 6, cfg: { precioSuelta: null }, esperado: 275 },
  { unidades: 4, cfg: { minimoDocena: 4 }, esperado: 183 },
]

describe('calcularPrecio (BR-012)', () => {
  it.each(casos)('$unidades catibías $cfg → RD$$esperado', ({ unidades, cfg, esperado }) => {
    const r = calcularPrecio(unidades, { ...base, ...cfg })
    expect(r).toMatchObject({ ok: true, subtotal: esperado })
  })

  it('usa tarifa suelta bajo el mínimo y docena desde el mínimo', () => {
    expect(calcularPrecio(5, base)).toMatchObject({ tarifa: 'suelta' })
    expect(calcularPrecio(6, base)).toMatchObject({ tarifa: 'docena' })
  })

  it('0 catibías es un error', () => {
    expect(calcularPrecio(0, base)).toEqual({
      ok: false,
      error: 'El pedido debe tener al menos una catibía.',
    })
  })

  it('pide configurar el precio suelta si falta y hay menos del mínimo', () => {
    expect(calcularPrecio(3, { ...base, precioSuelta: null })).toEqual({
      ok: false,
      error: 'Configura el precio suelta en Ajustes para vender menos de 6 catibías.',
    })
  })

  it('muestra el precio unitario y el ahorro (FR-004)', () => {
    expect(calcularPrecio(8, base)).toMatchObject({ precioUnitario: 45.83, ahorro: 33 })
  })
})

import { describe, expect, it } from 'vitest'

import { etiquetaPeriodo, moverPeriodo, rangoDe } from '@/lib/periodos'

const plano = (s: string) => s.replace(/\s/g, ' ')

describe('períodos de finanzas (FR-070)', () => {
  it('día', () => {
    expect(rangoDe('dia', '2026-10-06')).toEqual({ desde: '2026-10-06', hasta: '2026-10-06' })
  })

  it('semana de lunes a domingo', () => {
    // 2026-10-06 es martes.
    expect(rangoDe('semana', '2026-10-06')).toEqual({ desde: '2026-10-05', hasta: '2026-10-11' })
    expect(rangoDe('semana', '2026-10-11')).toEqual({ desde: '2026-10-05', hasta: '2026-10-11' })
    expect(rangoDe('semana', '2026-10-12')).toEqual({ desde: '2026-10-12', hasta: '2026-10-18' })
  })

  it('mes completo, incluso febrero', () => {
    expect(rangoDe('mes', '2026-10-06')).toEqual({ desde: '2026-10-01', hasta: '2026-10-31' })
    expect(rangoDe('mes', '2028-02-10')).toEqual({ desde: '2028-02-01', hasta: '2028-02-29' })
  })

  it('mueve al período anterior y siguiente', () => {
    expect(moverPeriodo('dia', '2026-10-01', -1)).toBe('2026-09-30')
    expect(moverPeriodo('semana', '2026-10-06', 1)).toBe('2026-10-13')
    expect(moverPeriodo('mes', '2026-12-15', 1)).toBe('2027-01-01')
    expect(moverPeriodo('mes', '2026-01-15', -1)).toBe('2025-12-01')
  })

  it('etiquetas en español', () => {
    expect(plano(etiquetaPeriodo('semana', rangoDe('semana', '2026-10-06')))).toBe('5 oct – 11 oct')
    expect(etiquetaPeriodo('mes', rangoDe('mes', '2026-10-06'))).toBe('octubre de 2026')
  })
})

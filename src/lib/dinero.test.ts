import { describe, expect, it } from 'vitest'

import { formatCantidad, formatDinero } from '@/lib/dinero'

describe('formatDinero', () => {
  it('formatea en RD$ con dos decimales', () => {
    expect(formatDinero(367)).toBe('RD$367.00')
    expect(formatDinero(45.833)).toBe('RD$45.83')
    expect(formatDinero(1100)).toBe('RD$1,100.00')
  })

  it('formatea cantidades con hasta 3 decimales', () => {
    expect(formatCantidad(1.5)).toBe('1.5')
    expect(formatCantidad(12)).toBe('12')
    expect(formatCantidad(0.375)).toBe('0.375')
  })
})

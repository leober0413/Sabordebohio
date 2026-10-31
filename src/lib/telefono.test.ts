import { describe, expect, it } from 'vitest'

import { digitosTelefono } from '@/lib/telefono'

describe('digitosTelefono', () => {
  it('quita espacios, guiones, paréntesis y puntos', () => {
    for (const t of [
      '809-555-0101',
      '(809) 555-0101',
      '809 555 0101',
      '809.555.0101',
      '8095550101',
    ]) {
      expect(digitosTelefono(t)).toBe('8095550101')
    }
  })

  it('quita el 1 del país solo con 11 dígitos', () => {
    expect(digitosTelefono('+1 809-555-0101')).toBe('8095550101')
    expect(digitosTelefono('1-809-555-0101')).toBe('8095550101')
    expect(digitosTelefono('1809')).toBe('1809')
  })

  it('sin teléfono: vacío', () => {
    expect(digitosTelefono(null)).toBe('')
    expect(digitosTelefono('  ')).toBe('')
  })
})

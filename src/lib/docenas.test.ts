import { describe, expect, it } from 'vitest'

import { enDocenas } from '@/lib/docenas'

describe('enDocenas', () => {
  it('menos de una docena: nada', () => {
    expect(enDocenas(0)).toBeNull()
    expect(enDocenas(11)).toBeNull()
  })

  it('docenas exactas y con sueltas', () => {
    expect(enDocenas(12)).toBe('1 docena')
    expect(enDocenas(16)).toBe('1 docena y 4')
    expect(enDocenas(24)).toBe('2 docenas')
    expect(enDocenas(30)).toBe('2 docenas y 6')
  })
})

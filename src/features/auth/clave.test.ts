import { afterEach, describe, expect, it } from 'vitest'

import { guiaPospuesta, posponerGuia, tieneClaveTemporal } from '@/features/auth/clave'

describe('tieneClaveTemporal', () => {
  it('solo con la marca en true', () => {
    expect(tieneClaveTemporal({ user_metadata: { clave_temporal: true } })).toBe(true)
    expect(tieneClaveTemporal({ user_metadata: { clave_temporal: false } })).toBe(false)
    expect(tieneClaveTemporal({ user_metadata: { clave_temporal: 'true' } })).toBe(false)
    expect(tieneClaveTemporal({ user_metadata: {} })).toBe(false)
    expect(tieneClaveTemporal(null)).toBe(false)
  })
})

describe('posponer la guía', () => {
  afterEach(() => sessionStorage.clear())

  it('vale para el usuario que la pospuso', () => {
    expect(guiaPospuesta('u1')).toBe(false)
    posponerGuia('u1')
    expect(guiaPospuesta('u1')).toBe(true)
    expect(guiaPospuesta('u2')).toBe(false)
  })
})

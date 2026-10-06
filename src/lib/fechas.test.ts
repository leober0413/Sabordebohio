import { describe, expect, it } from 'vitest'

import { diasEntre, formatFechaRelativa, formatHora, hoySD, sumarDias } from '@/lib/fechas'

describe('fechas en America/Santo_Domingo', () => {
  it('hoy depende de Santo Domingo, no de UTC', () => {
    // 2026-10-07 02:00 UTC = 2026-10-06 22:00 en Santo Domingo (UTC−4).
    expect(hoySD(new Date('2026-10-07T02:00:00Z'))).toBe('2026-10-06')
    expect(hoySD(new Date('2026-10-07T04:00:00Z'))).toBe('2026-10-07')
  })

  it('suma días cruzando meses y años', () => {
    expect(sumarDias('2026-10-31', 1)).toBe('2026-11-01')
    expect(sumarDias('2027-01-01', -1)).toBe('2026-12-31')
  })

  it('formatea relativo a hoy', () => {
    const hoy = '2026-10-06'
    expect(formatFechaRelativa('2026-10-06', hoy)).toBe('Hoy')
    expect(formatFechaRelativa('2026-10-07', hoy)).toBe('Mañana')
    expect(formatFechaRelativa('2026-10-05', hoy)).toBe('Ayer')
    expect(formatFechaRelativa('2026-10-09', hoy)).toBe('viernes, 9 de octubre')
  })

  it('formatea horas en 12 horas', () => {
    // Intl usa espacios no separables; se normalizan para comparar.
    const plano = (s: string) => s.replace(/\s/g, ' ')
    expect(plano(formatHora('16:00:00'))).toBe('4:00 p. m.')
    expect(plano(formatHora('09:30'))).toBe('9:30 a. m.')
  })

  it('cuenta días entre fechas', () => {
    expect(diasEntre('2026-10-01', '2026-10-06')).toBe(5)
  })
})

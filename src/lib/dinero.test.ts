import { describe, expect, it } from 'vitest'

import { formatDinero } from '@/lib/dinero'

describe('formatDinero', () => {
  it('formatea en RD$ con dos decimales', () => {
    expect(formatDinero(367)).toBe('RD$367.00')
    expect(formatDinero(45.833)).toBe('RD$45.83')
    expect(formatDinero(1100)).toBe('RD$1,100.00')
  })
})

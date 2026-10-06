import { describe, expect, it } from 'vitest'

import { cn } from '@/lib/utils'

describe('cn', () => {
  it('combina clases y resuelve conflictos de Tailwind', () => {
    const oculto = false
    expect(cn('px-2 text-sm', oculto && 'hidden', 'px-4')).toBe('text-sm px-4')
  })
})

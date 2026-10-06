import { describe, expect, it } from 'vitest'

import { aCsv } from '@/lib/csv'

describe('aCsv (FR-073)', () => {
  it('genera encabezado y filas con CRLF', () => {
    const csv = aCsv(
      [{ nombre: 'María Pérez', total: 375 }],
      [
        { titulo: 'Cliente', valor: (f) => f.nombre },
        { titulo: 'Total', valor: (f) => f.total },
      ],
    )
    expect(csv).toBe('Cliente,Total\r\nMaría Pérez,375\r\n')
  })

  it('pone comillas a comas, comillas y saltos de línea', () => {
    const csv = aCsv(
      [{ t: 'Pollo, queso' }, { t: 'Dijo "sin picante"' }, { t: 'línea 1\nlínea 2' }, { t: null }],
      [{ titulo: 'Notas', valor: (f) => f.t }],
    )
    expect(csv).toBe(
      'Notas\r\n"Pollo, queso"\r\n"Dijo ""sin picante"""\r\n"línea 1\nlínea 2"\r\n\r\n',
    )
  })
})

import { describe, expect, it } from 'vitest'

import { aPreparar, ordenarPorHora, resumenLineas, type Pedido } from '@/features/pedidos/tipos'

function pedido(parcial: Partial<Pedido>): Pedido {
  return {
    id: crypto.randomUUID(),
    fecha_entrega: '2026-10-06',
    hora_entrega: null,
    estado: 'pendiente',
    creado_en: '2026-10-06T10:00:00Z',
    lineas: [],
    ...parcial,
  } as Pedido
}

describe('pedidos', () => {
  it('resume las líneas', () => {
    expect(
      resumenLineas([
        { producto_id: 'a', nombre: 'Pollo', cantidad: 4 },
        { producto_id: 'b', nombre: 'Queso', cantidad: 2 },
      ]),
    ).toBe('4 Pollo · 2 Queso')
  })

  it('ordena por fecha y hora, sin hora al final (FR-030)', () => {
    const sinHora = pedido({ id: 'sin' })
    const tarde = pedido({ id: 'tarde', hora_entrega: '16:00:00' })
    const temprano = pedido({ id: 'temprano', hora_entrega: '09:00:00' })
    const ayer = pedido({ id: 'ayer', fecha_entrega: '2026-10-05', hora_entrega: '18:00:00' })
    expect(ordenarPorHora([sinHora, tarde, ayer, temprano]).map((p) => p.id)).toEqual([
      'ayer',
      'temprano',
      'tarde',
      'sin',
    ])
  })

  it('suma lo que hay que preparar de los pendientes (FR-032)', () => {
    const pollo = (cantidad: number) => ({ producto_id: 'p', nombre: 'Pollo', cantidad })
    expect(
      aPreparar([
        pedido({ lineas: [pollo(3)] }),
        pedido({ lineas: [pollo(4), { producto_id: 'q', nombre: 'Queso', cantidad: 2 }] }),
        pedido({ estado: 'listo', lineas: [pollo(10)] }),
      ]),
    ).toEqual([
      { nombre: 'Pollo', cantidad: 7 },
      { nombre: 'Queso', cantidad: 2 },
    ])
  })
})

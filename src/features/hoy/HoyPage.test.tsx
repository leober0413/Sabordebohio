import { screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { HoyPage } from '@/features/hoy/HoyPage'
import type { Pedido } from '@/features/pedidos/tipos'
import { renderConProveedores } from '@/test/utils'

const estado = vi.hoisted(() => ({ pedidos: [] as unknown[], stock: [] as unknown[] }))

vi.mock('@/features/pedidos/queries', () => ({
  usePedidosHoy: () => ({ data: estado.pedidos, isPending: false, isError: false }),
  useCambiarEstado: () => ({ mutate: vi.fn(), isPending: false }),
}))
vi.mock('@/features/inventario/queries', async (original) => ({
  ...(await original<typeof import('@/features/inventario/queries')>()),
  useStockProductos: () => ({ data: estado.stock, isPending: false, isError: false }),
}))

function pedido(parcial: Partial<Pedido>): Pedido {
  return {
    id: crypto.randomUUID(),
    cliente_nombre: 'María',
    estado: 'pendiente',
    atrasado: false,
    fecha_entrega: '2026-10-06',
    hora_entrega: null,
    tipo_entrega: 'recoge',
    total: 275,
    pagado: 0,
    saldo: 275,
    estado_pago: 'pendiente',
    creado_en: '2026-10-06T10:00:00Z',
    lineas: [{ producto_id: 'p', nombre: 'Pollo', cantidad: 3 }],
    ...parcial,
  } as Pedido
}

describe('HoyPage', () => {
  it('sin pedidos explica qué hacer', () => {
    estado.pedidos = []
    renderConProveedores(<HoyPage />)
    expect(screen.getByRole('heading', { name: 'Hoy' })).toBeInTheDocument()
    expect(screen.getByText('Aún no hay pedidos hoy')).toBeInTheDocument()
  })

  it('muestra atrasados arriba, lo que hay que preparar y alertas de stock', () => {
    estado.pedidos = [
      pedido({ cliente_nombre: 'Ana', atrasado: true, fecha_entrega: '2026-10-05' }),
      pedido({
        cliente_nombre: 'Juan',
        lineas: [{ producto_id: 'p', nombre: 'Pollo', cantidad: 4 }],
      }),
    ]
    estado.stock = [
      {
        id: 'q',
        nombre: 'Queso',
        activo: true,
        stock: 2,
        stock_minimo: 6,
        bajo_minimo: true,
        negativo: false,
      },
    ]
    renderConProveedores(<HoyPage />)
    expect(screen.getByText('1 pedido atrasado')).toBeInTheDocument()
    expect(screen.getByText('Stock bajo: Queso (2)')).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'A preparar hoy' })).toHaveTextContent('Pollo 4')
    expect(screen.getByRole('region', { name: 'Atrasados' })).toHaveTextContent('Ana')
  })
})

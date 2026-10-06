import { describe, expect, it } from 'vitest'

import { describir, resumenCantidades, type EntradaActividad } from '@/features/actividad/describir'

const pedido = {
  cliente: 'Ana Martínez',
  estado: 'pendiente',
  fecha_entrega: '2026-10-07',
  hora_entrega: '16:00:00',
  tipo_entrega: 'recoge',
  costo_envio: 0,
  total: 275,
  notas: null,
  cantidades: { Pollo: 6 },
}

const entrada = (e: Partial<EntradaActividad>): EntradaActividad => ({
  entidad: 'pedido',
  entidad_id: 'p1',
  accion: 'crear',
  antes: null,
  despues: null,
  ...e,
})

describe('describir', () => {
  it('crear un pedido: cliente, sabores, total y entrega', () => {
    const d = describir(entrada({ despues: pedido }))
    expect(d?.titulo).toBe('Creó un pedido de Ana Martínez')
    expect(d?.detalle).toBe('Pollo 6 · RD$275.00 · entrega mié, 7 oct')
    expect(d?.enlace).toBe('/pedidos/p1')
    expect(d?.area).toBe('pedidos')
  })

  it('editar un pedido: cantidades y total antes → después', () => {
    const despues = { ...pedido, total: 550, cantidades: { Pollo: 8, Res: 4 } }
    const d = describir(entrada({ accion: 'editar', antes: pedido, despues }))
    expect(d?.titulo).toBe('Editó el pedido de Ana Martínez')
    expect(d?.cambios).toEqual([
      { campo: 'Pollo', antes: '6', despues: '8' },
      { campo: 'Res', antes: '0', despues: '4' },
      { campo: 'Total', antes: 'RD$275.00', despues: 'RD$550.00' },
    ])
  })

  it('solo cambia el estado: el título lo dice', () => {
    const d = describir(
      entrada({ accion: 'editar', antes: pedido, despues: { ...pedido, estado: 'entregado' } }),
    )
    expect(d?.titulo).toBe('Entregó el pedido de Ana Martínez')
    expect(d?.cambios).toEqual([])

    const revertido = describir(
      entrada({
        accion: 'editar',
        antes: { ...pedido, estado: 'entregado' },
        despues: pedido,
      }),
    )
    expect(revertido?.titulo).toBe('Revirtió la entrega del pedido de Ana Martínez')
    expect(revertido?.detalle).toBe('Quedó pendiente')

    const aPendiente = describir(
      entrada({ accion: 'editar', antes: { ...pedido, estado: 'listo' }, despues: pedido }),
    )
    expect(aPendiente?.titulo).toBe('Volvió a pendiente el pedido de Ana Martínez')
    expect(aPendiente?.detalle).toBe('Estaba listo')

    const reabierto = describir(
      entrada({
        accion: 'editar',
        antes: { ...pedido, estado: 'cancelado' },
        despues: { ...pedido, estado: 'listo' },
      }),
    )
    expect(reabierto?.titulo).toBe('Reabrió el pedido cancelado de Ana Martínez')
    expect(reabierto?.detalle).toBe('Quedó listo')
  })

  it('guardar sin cambios no se muestra', () => {
    expect(describir(entrada({ accion: 'editar', antes: pedido, despues: pedido }))).toBeNull()
  })

  it('pagos y abonos, con su anulación', () => {
    const pago = { pedido_id: 'p1', cliente: 'Ana', monto: 100, metodo: 'efectivo' }
    expect(describir(entrada({ entidad: 'pago', despues: pago }))).toMatchObject({
      titulo: 'Registró un pago de RD$100.00 (efectivo)',
      detalle: 'Pedido de Ana',
      enlace: '/pedidos/p1',
      area: 'dinero',
    })
    expect(describir(entrada({ entidad: 'pago', accion: 'anular', despues: pago }))?.titulo).toBe(
      'Anuló un pago de RD$100.00',
    )
    const abono = { cliente_id: 'c1', cliente: 'Ana', monto: 200, metodo: 'transferencia' }
    expect(describir(entrada({ entidad: 'abono', despues: abono }))).toMatchObject({
      titulo: 'Registró un abono de RD$200.00 (transferencia)',
      enlace: '/clientes/c1',
    })
  })

  it('gastos: editar muestra el antes → después; restaurar se nombra', () => {
    const gasto = { categoria: 'Gas', monto: 500, fecha: '2026-10-06', descripcion: 'Tanque' }
    const editado = describir(
      entrada({
        entidad: 'gasto',
        accion: 'editar',
        antes: gasto,
        despues: { ...gasto, monto: 650 },
      }),
    )
    expect(editado?.cambios).toEqual([{ campo: 'Monto', antes: 'RD$500.00', despues: 'RD$650.00' }])
    expect(
      describir(entrada({ entidad: 'gasto', accion: 'restaurar', despues: gasto }))?.titulo,
    ).toBe('Restauró un gasto de RD$500.00')
    expect(describir(entrada({ entidad: 'gasto', despues: gasto }))?.detalle).toBe('Gas · Tanque')
  })

  it('inventario: compra, tanda, conteo y ajuste', () => {
    expect(
      describir(
        entrada({
          entidad: 'compra',
          despues: { ingrediente: 'Harina', unidad: 'lb', cantidad: 25, costo_total: 1100 },
        }),
      ),
    ).toMatchObject({ titulo: 'Compró 25 lb de Harina', detalle: 'RD$1,100.00' })

    expect(
      describir(entrada({ entidad: 'tanda', despues: { cantidades: { Res: 12, Pollo: 24 } } }))
        ?.detalle,
    ).toBe('Pollo 24 · Res 12')

    expect(
      describir(
        entrada({
          entidad: 'ajuste_ingrediente',
          antes: { stock: 10 },
          despues: { ingrediente: 'Harina', unidad: 'lb', tipo: 'conteo', stock: 7.5 },
        }),
      ),
    ).toMatchObject({
      titulo: 'Contó Harina',
      cambios: [{ campo: 'Stock', antes: '10 lb', despues: '7.5 lb' }],
    })

    expect(
      describir(
        entrada({
          entidad: 'ajuste_producto',
          antes: { stock: 10 },
          despues: { producto: 'Pollo', motivo: 'merma', stock: 8 },
        }),
      ),
    ).toMatchObject({
      titulo: 'Ajustó el stock de Pollo',
      detalle: 'Motivo: merma',
      cambios: [{ campo: 'Stock', antes: '10', despues: '8' }],
    })
  })

  it('catálogo: agregar, editar, desactivar y precios', () => {
    const cliente = { nombre: 'Ana', telefono: '809-555-0101', notas: null, activo: true }
    expect(describir(entrada({ entidad: 'cliente', despues: cliente }))).toMatchObject({
      titulo: 'Agregó el cliente Ana',
      enlace: '/clientes/p1',
    })
    expect(
      describir(
        entrada({
          entidad: 'cliente',
          accion: 'editar',
          antes: cliente,
          despues: { ...cliente, telefono: '809-000-0000' },
        }),
      ),
    ).toMatchObject({
      titulo: 'Editó el cliente Ana',
      cambios: [{ campo: 'Teléfono', antes: '809-555-0101', despues: '809-000-0000' }],
    })
    const sabor = { nombre: 'Queso', stock_minimo: 6, activo: true }
    expect(
      describir(
        entrada({
          entidad: 'producto',
          accion: 'editar',
          antes: sabor,
          despues: { ...sabor, activo: false },
        }),
      )?.titulo,
    ).toBe('Desactivó el sabor Queso')

    const precios = { precio_suelta: 50, precio_docena: 550, minimo_docena: 6, redondeo: 1 }
    expect(
      describir(
        entrada({
          entidad: 'precios',
          accion: 'editar',
          antes: precios,
          despues: { ...precios, precio_docena: 600 },
        }),
      ),
    ).toMatchObject({
      titulo: 'Cambió la lista de precios',
      cambios: [{ campo: 'Precio docena', antes: 'RD$550.00', despues: 'RD$600.00' }],
    })
  })
})

describe('resumenCantidades', () => {
  it('en orden alfabético', () => {
    expect(resumenCantidades({ Res: 4, Pollo: 6, Queso: 2 })).toBe('Pollo 6 · Queso 2 · Res 4')
  })
})

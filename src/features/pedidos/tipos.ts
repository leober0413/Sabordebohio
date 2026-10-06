import type { Database } from '@/types/database'

type Vista = Database['public']['Views']['v_pedidos']['Row']
type Enums = Database['public']['Enums']

export type EstadoPedido = Enums['estado_pedido']
export type TipoEntrega = Enums['tipo_entrega']

export interface LineaPedido {
  producto_id: string
  nombre: string
  cantidad: number
}

/** Columnas de v_pedidos que sí pueden venir vacías. */
type Opcionales =
  'hora_entrega' | 'notas' | 'entregado_en' | 'cliente_telefono' | 'precio_suelta_aplicado'

/**
 * Fila de v_pedidos. Los tipos generados marcan todas las columnas de una
 * vista como opcionales; aquí se dejan opcionales solo las que lo son.
 */
export type Pedido = {
  [K in Exclude<keyof Vista, Opcionales | 'lineas'>]-?: NonNullable<Vista[K]>
} & Pick<Vista, Opcionales> & { lineas: LineaPedido[] }

export function aPedido(fila: Vista): Pedido {
  return fila as unknown as Pedido
}

export const ETIQUETA_ESTADO: Record<EstadoPedido, string> = {
  pendiente: 'Pendiente',
  listo: 'Listo',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
}

/** "4 Pollo · 2 Queso" */
export function resumenLineas(lineas: LineaPedido[]): string {
  return lineas.map((l) => `${l.cantidad} ${l.nombre}`).join(' · ')
}

/** Pendientes y listos por hora; los que no tienen hora van al final (FR-030). */
export function ordenarPorHora(pedidos: Pedido[]): Pedido[] {
  return [...pedidos].sort((a, b) => {
    if (a.fecha_entrega !== b.fecha_entrega) return a.fecha_entrega < b.fecha_entrega ? -1 : 1
    if (a.hora_entrega === b.hora_entrega) return a.creado_en < b.creado_en ? -1 : 1
    if (a.hora_entrega === null) return 1
    if (b.hora_entrega === null) return -1
    return a.hora_entrega < b.hora_entrega ? -1 : 1
  })
}

/** FR-032: catibías a preparar por sabor en los pedidos pendientes. */
export function aPreparar(pedidos: Pedido[]): Array<{ nombre: string; cantidad: number }> {
  const totales = new Map<string, number>()
  for (const p of pedidos) {
    if (p.estado !== 'pendiente') continue
    for (const l of p.lineas) totales.set(l.nombre, (totales.get(l.nombre) ?? 0) + l.cantidad)
  }
  return [...totales].map(([nombre, cantidad]) => ({ nombre, cantidad }))
}

/** Cambios de estado que ofrece la app desde cada estado. */
export const SIGUIENTE_ACCION: Partial<
  Record<EstadoPedido, { estado: EstadoPedido; etiqueta: string }>
> = {
  pendiente: { estado: 'listo', etiqueta: 'Listo' },
  listo: { estado: 'entregado', etiqueta: 'Entregar' },
}

import {
  aPedido,
  ETIQUETA_ESTADO,
  ETIQUETA_METODO,
  ETIQUETA_PAGO,
  resumenLineas,
} from '@/features/pedidos/tipos'
import { aCsv, descargarCsv } from '@/lib/csv'
import { supabase } from '@/lib/supabase'
import type { Rango } from '@/lib/periodos'

const sufijo = (r: Rango) => (r.desde === r.hasta ? r.desde : `${r.desde}_a_${r.hasta}`)
const hora = (h: string | null) => (h ? h.slice(0, 5) : '')
const siNo = (v: unknown) => (v ? 'Sí' : '')

/** Pedidos con fecha de entrega en el período. */
export async function exportarPedidos(r: Rango) {
  const { data, error } = await supabase
    .from('v_pedidos')
    .select('*')
    .gte('fecha_entrega', r.desde)
    .lte('fecha_entrega', r.hasta)
    .order('fecha_entrega')
    .order('hora_entrega', { nullsFirst: false })
  if (error) throw error
  const pedidos = data.map(aPedido)
  descargarCsv(
    `pedidos_${sufijo(r)}.csv`,
    aCsv(pedidos, [
      { titulo: 'Fecha de entrega', valor: (p) => p.fecha_entrega },
      { titulo: 'Hora', valor: (p) => hora(p.hora_entrega) },
      { titulo: 'Cliente', valor: (p) => p.cliente_nombre },
      { titulo: 'Teléfono', valor: (p) => p.cliente_telefono },
      { titulo: 'Catibías', valor: (p) => resumenLineas(p.lineas) },
      { titulo: 'Unidades', valor: (p) => p.unidades },
      { titulo: 'Tarifa', valor: (p) => (p.tarifa === 'docena' ? 'Docena' : 'Suelta') },
      { titulo: 'Subtotal', valor: (p) => p.subtotal },
      { titulo: 'Envío', valor: (p) => p.costo_envio },
      { titulo: 'Total', valor: (p) => p.total },
      { titulo: 'Pagado', valor: (p) => p.pagado },
      { titulo: 'Saldo', valor: (p) => p.saldo },
      { titulo: 'Estado', valor: (p) => ETIQUETA_ESTADO[p.estado] },
      { titulo: 'Pago', valor: (p) => ETIQUETA_PAGO[p.estado_pago] },
      { titulo: 'Entrega', valor: (p) => (p.tipo_entrega === 'delivery' ? 'Delivery' : 'Recoge') },
      { titulo: 'Notas', valor: (p) => p.notas },
    ]),
  )
  return pedidos.length
}

/** Pagos con fecha en el período (incluye anulados, marcados). */
export async function exportarPagos(r: Rango) {
  const { data, error } = await supabase
    .from('pagos')
    .select('*, pedidos(fecha_entrega, clientes(nombre)), perfiles(nombre)')
    .gte('fecha', r.desde)
    .lte('fecha', r.hasta)
    .order('fecha')
    .order('creado_en')
  if (error) throw error
  descargarCsv(
    `pagos_${sufijo(r)}.csv`,
    aCsv(data, [
      { titulo: 'Fecha', valor: (p) => p.fecha },
      { titulo: 'Cliente', valor: (p) => p.pedidos?.clientes?.nombre },
      { titulo: 'Pedido (entrega)', valor: (p) => p.pedidos?.fecha_entrega },
      { titulo: 'Monto', valor: (p) => p.monto },
      { titulo: 'Método', valor: (p) => ETIQUETA_METODO[p.metodo] },
      { titulo: 'De un abono', valor: (p) => siNo(p.abono_id) },
      { titulo: 'Anulado', valor: (p) => siNo(p.anulado_en) },
      { titulo: 'Registrado por', valor: (p) => p.perfiles?.nombre },
    ]),
  )
  return data.length
}

/** Gastos con fecha en el período, incluidas las compras (incluye anulados, marcados). */
export async function exportarGastos(r: Rango) {
  const { data, error } = await supabase
    .from('gastos')
    .select('*, categorias_gasto(nombre), perfiles(nombre)')
    .gte('fecha', r.desde)
    .lte('fecha', r.hasta)
    .order('fecha')
    .order('creado_en')
  if (error) throw error
  descargarCsv(
    `gastos_${sufijo(r)}.csv`,
    aCsv(data, [
      { titulo: 'Fecha', valor: (g) => g.fecha },
      { titulo: 'Categoría', valor: (g) => g.categorias_gasto?.nombre },
      { titulo: 'Detalle', valor: (g) => g.descripcion },
      { titulo: 'Monto', valor: (g) => g.monto },
      { titulo: 'Compra de ingrediente', valor: (g) => siNo(g.compra_id) },
      { titulo: 'Anulado', valor: (g) => siNo(g.anulado_en) },
      { titulo: 'Registrado por', valor: (g) => g.perfiles?.nombre },
    ]),
  )
  return data.length
}

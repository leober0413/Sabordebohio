import { formatCantidad, formatDinero } from '@/lib/dinero'
import { formatFechaCorta, formatHora } from '@/lib/fechas'
import type { Json } from '@/types/database'

/**
 * Convierte una entrada de `actividad` (FR-083) en texto: título, detalle y
 * cambios antes → después. Las fotos ya traen los nombres resueltos
 * (supabase/migrations/*_actividad.sql).
 */

export type Area = 'pedidos' | 'dinero' | 'inventario' | 'catalogo'

export const ENTIDADES: Record<Area, string[]> = {
  pedidos: ['pedido'],
  dinero: ['pago', 'abono', 'gasto', 'compra'],
  inventario: ['tanda', 'ajuste_producto', 'ajuste_ingrediente', 'compra'],
  catalogo: ['cliente', 'producto', 'ingrediente', 'categoria_gasto', 'precios'],
}

export interface EntradaActividad {
  entidad: string
  entidad_id: string
  accion: string
  antes: Json | null
  despues: Json | null
}

export interface Cambio {
  campo: string
  antes: string
  despues: string
}

export interface Descripcion {
  area: Area
  titulo: string
  detalle: string | null
  cambios: Cambio[]
  enlace: string | null
}

type Foto = Record<string, unknown>
type Formato = (v: unknown) => string

function foto(j: Json | null): Foto {
  return j && typeof j === 'object' && !Array.isArray(j) ? (j as Foto) : {}
}

const vacio = (v: unknown) => v === null || v === undefined || v === ''
const texto: Formato = (v) => (vacio(v) ? '—' : String(v))
const dinero: Formato = (v) => (vacio(v) ? '—' : formatDinero(Number(v)))
const numero: Formato = (v) => (vacio(v) ? '—' : formatCantidad(Number(v)))
const fecha: Formato = (v) => (vacio(v) ? '—' : formatFechaCorta(String(v)))
const hora: Formato = (v) => (vacio(v) ? '—' : formatHora(String(v)))

const ESTADOS: Record<string, string> = {
  pendiente: 'Pendiente',
  listo: 'Listo',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
}
const ENTREGAS: Record<string, string> = { recoge: 'Recoge', delivery: 'Delivery' }
const de =
  (mapa: Record<string, string>): Formato =>
  (v) =>
    mapa[String(v)] ?? texto(v)

/** Campos que se comparan, en el orden en que se muestran. */
const CAMPOS: Record<string, Array<[campo: string, etiqueta: string, formato: Formato]>> = {
  pedido: [
    ['cliente', 'Cliente', texto],
    ['estado', 'Estado', de(ESTADOS)],
    ['fecha_entrega', 'Entrega', fecha],
    ['hora_entrega', 'Hora', hora],
    ['tipo_entrega', 'Tipo', de(ENTREGAS)],
    ['costo_envio', 'Envío', dinero],
    ['total', 'Total', dinero],
    ['notas', 'Notas', texto],
  ],
  gasto: [
    ['categoria', 'Categoría', texto],
    ['monto', 'Monto', dinero],
    ['fecha', 'Fecha', fecha],
    ['descripcion', 'Descripción', texto],
  ],
  cliente: [
    ['nombre', 'Nombre', texto],
    ['telefono', 'Teléfono', texto],
    ['notas', 'Notas', texto],
  ],
  producto: [
    ['nombre', 'Nombre', texto],
    ['stock_minimo', 'Mínimo', numero],
  ],
  ingrediente: [
    ['nombre', 'Nombre', texto],
    ['unidad', 'Unidad', texto],
    ['stock_minimo', 'Mínimo', numero],
  ],
  categoria_gasto: [['nombre', 'Nombre', texto]],
  precios: [
    ['precio_suelta', 'Precio suelta', dinero],
    ['precio_docena', 'Precio docena', dinero],
    ['minimo_docena', 'Mínimo para docena', numero],
    ['redondeo', 'Redondeo', numero],
  ],
}

const NOMBRES: Record<string, string> = {
  cliente: 'el cliente',
  producto: 'el sabor',
  ingrediente: 'el ingrediente',
  categoria_gasto: 'la categoría',
}

function igual(a: unknown, b: unknown) {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null)
}

function diferencias(entidad: string, antes: Foto, despues: Foto): Cambio[] {
  return (CAMPOS[entidad] ?? [])
    .filter(([campo]) => !igual(antes[campo], despues[campo]))
    .map(([campo, etiqueta, formato]) => ({
      campo: etiqueta,
      antes: formato(antes[campo]),
      despues: formato(despues[campo]),
    }))
}

function cantidades(f: Foto): Record<string, number> {
  const c = f.cantidades
  return c && typeof c === 'object' ? (c as Record<string, number>) : {}
}

/** "Pollo 6 · Res 4", en orden alfabético. */
export function resumenCantidades(c: Record<string, number>): string {
  return Object.keys(c)
    .sort((a, b) => a.localeCompare(b, 'es'))
    .map((sabor) => `${sabor} ${c[sabor]}`)
    .join(' · ')
}

function cambiosCantidades(antes: Foto, despues: Foto): Cambio[] {
  const a = cantidades(antes)
  const d = cantidades(despues)
  return [...new Set([...Object.keys(a), ...Object.keys(d)])]
    .sort((x, y) => x.localeCompare(y, 'es'))
    .filter((sabor) => (a[sabor] ?? 0) !== (d[sabor] ?? 0))
    .map((sabor) => ({
      campo: sabor,
      antes: String(a[sabor] ?? 0),
      despues: String(d[sabor] ?? 0),
    }))
}

function unir(...partes: Array<string | null | undefined | false>) {
  const r = partes.filter(Boolean).join(' · ')
  return r || null
}

function describirPedido(e: EntradaActividad, antes: Foto, despues: Foto): Descripcion | null {
  const cliente = texto(despues.cliente)
  const enlace = `/pedidos/${e.entidad_id}`
  if (e.accion === 'crear') {
    return {
      area: 'pedidos',
      titulo: `Creó un pedido de ${cliente}`,
      detalle: unir(
        resumenCantidades(cantidades(despues)),
        dinero(despues.total),
        `entrega ${fecha(despues.fecha_entrega)}`,
      ),
      cambios: [],
      enlace,
    }
  }
  const cambios = [...cambiosCantidades(antes, despues), ...diferencias('pedido', antes, despues)]
  if (cambios.length === 0) return null

  const soloEstado = cambios.length === 1 && cambios[0].campo === 'Estado'
  if (soloEstado) {
    const titulos: Record<string, string> = {
      listo: `Marcó como listo el pedido de ${cliente}`,
      entregado: `Entregó el pedido de ${cliente}`,
      cancelado: `Canceló el pedido de ${cliente}`,
      pendiente: `Volvió a pendiente el pedido de ${cliente}`,
    }
    const previo = String(antes.estado)
    const nuevo = String(despues.estado)
    const quedo = `Quedó ${texto(ESTADOS[nuevo]).toLowerCase()}`
    // Volver atrás desde entregado o cancelado no es "marcar listo": se dice qué se deshizo.
    if (previo === 'entregado' || previo === 'cancelado') {
      return {
        area: 'pedidos',
        titulo:
          previo === 'entregado'
            ? `Revirtió la entrega del pedido de ${cliente}`
            : `Reabrió el pedido cancelado de ${cliente}`,
        detalle: quedo,
        cambios: [],
        enlace,
      }
    }
    return {
      area: 'pedidos',
      titulo: titulos[nuevo] ?? `Cambió el estado del pedido de ${cliente}`,
      detalle: nuevo === 'pendiente' ? `Estaba ${texto(ESTADOS[previo]).toLowerCase()}` : null,
      cambios: [],
      enlace,
    }
  }
  return {
    area: 'pedidos',
    titulo: `Editó el pedido de ${cliente}`,
    detalle: null,
    cambios,
    enlace,
  }
}

function describirAnulable(
  e: EntradaActividad,
  despues: Foto,
  que: string,
  area: Area,
  detalle: string | null,
  enlace: string | null,
): Descripcion {
  const monto = dinero(despues.monto)
  const metodo = vacio(despues.metodo) ? '' : ` (${String(despues.metodo)})`
  const titulo =
    e.accion === 'anular'
      ? `Anuló ${que} de ${monto}`
      : e.accion === 'restaurar'
        ? `Restauró ${que} de ${monto}`
        : `Registró ${que} de ${monto}${metodo}`
  return { area, titulo, detalle, cambios: [], enlace }
}

function describirStock(e: EntradaActividad, antes: Foto, despues: Foto): Descripcion {
  const esIngrediente = e.entidad === 'ajuste_ingrediente'
  const nombre = texto(esIngrediente ? despues.ingrediente : despues.producto)
  const unidad = esIngrediente && !vacio(despues.unidad) ? ` ${String(despues.unidad)}` : ''
  const conteo = despues.tipo === 'conteo'
  return {
    area: 'inventario',
    titulo: conteo ? `Contó ${nombre}` : `Ajustó el stock de ${nombre}`,
    detalle: conteo || vacio(despues.motivo) ? null : `Motivo: ${String(despues.motivo)}`,
    cambios: [
      {
        campo: 'Stock',
        antes: numero(antes.stock) + unidad,
        despues: numero(despues.stock) + unidad,
      },
    ],
    enlace: null,
  }
}

function describirCatalogo(e: EntradaActividad, antes: Foto, despues: Foto): Descripcion | null {
  const area: Area = 'catalogo'
  if (e.entidad === 'precios') {
    const cambios = diferencias('precios', antes, despues)
    if (cambios.length === 0) return null
    return {
      area,
      titulo: 'Cambió la lista de precios',
      detalle: null,
      cambios,
      enlace: '/ajustes',
    }
  }
  const que = NOMBRES[e.entidad] ?? 'un registro'
  const nombre = texto(despues.nombre)
  const enlace = e.entidad === 'cliente' ? `/clientes/${e.entidad_id}` : null
  if (e.accion === 'crear') {
    return { area, titulo: `Agregó ${que} ${nombre}`, detalle: null, cambios: [], enlace }
  }
  const cambios = diferencias(e.entidad, antes, despues)
  if (antes.activo !== despues.activo) {
    const verbo = despues.activo ? 'Reactivó' : 'Desactivó'
    return { area, titulo: `${verbo} ${que} ${nombre}`, detalle: null, cambios, enlace }
  }
  if (cambios.length === 0) return null
  return { area, titulo: `Editó ${que} ${nombre}`, detalle: null, cambios, enlace }
}

/** `null` si la entrada no tiene nada que mostrar (por ejemplo, guardar sin cambios). */
export function describir(e: EntradaActividad): Descripcion | null {
  const antes = foto(e.antes)
  const despues = foto(e.despues)

  switch (e.entidad) {
    case 'pedido':
      return describirPedido(e, antes, despues)
    case 'pago':
      return describirAnulable(
        e,
        despues,
        'un pago',
        'dinero',
        `Pedido de ${texto(despues.cliente)}`,
        vacio(despues.pedido_id) ? null : `/pedidos/${String(despues.pedido_id)}`,
      )
    case 'abono':
      return describirAnulable(
        e,
        despues,
        'un abono',
        'dinero',
        `De ${texto(despues.cliente)}`,
        vacio(despues.cliente_id) ? null : `/clientes/${String(despues.cliente_id)}`,
      )
    case 'gasto': {
      if (e.accion === 'editar') {
        const cambios = diferencias('gasto', antes, despues)
        if (cambios.length === 0) return null
        return {
          area: 'dinero',
          titulo: 'Editó un gasto',
          detalle: texto(despues.categoria),
          cambios,
          enlace: '/gastos',
        }
      }
      const detalle = unir(texto(despues.categoria), despues.descripcion as string | null)
      return describirAnulable(e, despues, 'un gasto', 'dinero', detalle, '/gastos')
    }
    case 'compra': {
      const que = `${numero(despues.cantidad)} ${texto(despues.unidad)} de ${texto(despues.ingrediente)}`
      return {
        area: 'dinero',
        titulo: e.accion === 'anular' ? `Anuló la compra de ${que}` : `Compró ${que}`,
        detalle: dinero(despues.costo_total),
        cambios: [],
        enlace: null,
      }
    }
    case 'tanda':
      return {
        area: 'inventario',
        titulo: 'Registró una tanda',
        detalle: unir(resumenCantidades(cantidades(despues)), despues.notas as string | null),
        cambios: [],
        enlace: null,
      }
    case 'ajuste_producto':
    case 'ajuste_ingrediente':
      return describirStock(e, antes, despues)
    case 'cliente':
    case 'producto':
    case 'ingrediente':
    case 'categoria_gasto':
    case 'precios':
      return describirCatalogo(e, antes, despues)
    default:
      return {
        area: 'catalogo',
        titulo: 'Hizo un cambio',
        detalle: null,
        cambios: [],
        enlace: null,
      }
  }
}

import { formatFechaLarga, sumarDias } from '@/lib/fechas'

export type Periodo = 'dia' | 'semana' | 'mes'

export interface Rango {
  desde: string
  hasta: string
}

function diaSemana(fecha: string): number {
  // 0 = lunes … 6 = domingo
  const [a, m, d] = fecha.split('-').map(Number)
  return (new Date(Date.UTC(a, m - 1, d)).getUTCDay() + 6) % 7
}

function finDeMes(anio: number, mes: number): string {
  const ultimo = new Date(Date.UTC(anio, mes, 0)).getUTCDate()
  return `${anio}-${String(mes).padStart(2, '0')}-${String(ultimo).padStart(2, '0')}`
}

/** Rango del período que contiene la fecha. La semana va de lunes a domingo. */
export function rangoDe(periodo: Periodo, fecha: string): Rango {
  if (periodo === 'dia') return { desde: fecha, hasta: fecha }
  if (periodo === 'semana') {
    const desde = sumarDias(fecha, -diaSemana(fecha))
    return { desde, hasta: sumarDias(desde, 6) }
  }
  const [a, m] = fecha.split('-').map(Number)
  return { desde: `${a}-${String(m).padStart(2, '0')}-01`, hasta: finDeMes(a, m) }
}

/** Fecha dentro del período anterior (−1) o siguiente (+1). */
export function moverPeriodo(periodo: Periodo, fecha: string, paso: 1 | -1): string {
  if (periodo === 'dia') return sumarDias(fecha, paso)
  if (periodo === 'semana') return sumarDias(fecha, 7 * paso)
  const [a, m] = fecha.split('-').map(Number)
  const total = a * 12 + (m - 1) + paso
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, '0')}-01`
}

const mes = new Intl.DateTimeFormat('es-DO', { month: 'long', year: 'numeric', timeZone: 'UTC' })
const corto = new Intl.DateTimeFormat('es-DO', { day: 'numeric', month: 'short', timeZone: 'UTC' })
const utc = (f: string) => {
  const [a, m, d] = f.split('-').map(Number)
  return new Date(Date.UTC(a, m - 1, d))
}

/** "martes, 6 de octubre", "5 oct – 11 oct" u "octubre de 2026". */
export function etiquetaPeriodo(periodo: Periodo, rango: Rango): string {
  if (periodo === 'dia') return formatFechaLarga(rango.desde)
  if (periodo === 'semana')
    return `${corto.format(utc(rango.desde))} – ${corto.format(utc(rango.hasta))}`
  return mes.format(utc(rango.desde))
}

/**
 * Fechas del negocio en America/Santo_Domingo (CLAUDE.md, regla 8).
 * Las fechas de entrega viajan como texto 'YYYY-MM-DD' y las horas como 'HH:MM[:SS]'.
 */
const ZONA = 'America/Santo_Domingo'

const isoEnZona = new Intl.DateTimeFormat('en-CA', { timeZone: ZONA })

/** Hoy en Santo Domingo, como 'YYYY-MM-DD'. */
export function hoySD(ahora: Date = new Date()): string {
  return isoEnZona.format(ahora)
}

function aUTC(fecha: string): Date {
  const [a, m, d] = fecha.split('-').map(Number)
  return new Date(Date.UTC(a, m - 1, d))
}

export function sumarDias(fecha: string, dias: number): string {
  const d = aUTC(fecha)
  d.setUTCDate(d.getUTCDate() + dias)
  return d.toISOString().slice(0, 10)
}

const largo = new Intl.DateTimeFormat('es-DO', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  timeZone: 'UTC',
})
const corto = new Intl.DateTimeFormat('es-DO', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
})

/** "Hoy", "Mañana", "Ayer" o la fecha larga ("miércoles, 7 de octubre"). */
export function formatFechaRelativa(fecha: string, hoy: string = hoySD()): string {
  if (fecha === hoy) return 'Hoy'
  if (fecha === sumarDias(hoy, 1)) return 'Mañana'
  if (fecha === sumarDias(hoy, -1)) return 'Ayer'
  return largo.format(aUTC(fecha))
}

export function formatFechaLarga(fecha: string): string {
  return largo.format(aUTC(fecha))
}

export function formatFechaCorta(fecha: string): string {
  return corto.format(aUTC(fecha))
}

const hora = new Intl.DateTimeFormat('es-DO', {
  hour: 'numeric',
  minute: '2-digit',
  timeZone: 'UTC',
})

/** '16:00:00' → '4:00 p. m.' */
export function formatHora(valor: string): string {
  const [h, m] = valor.split(':').map(Number)
  return hora.format(new Date(Date.UTC(2000, 0, 1, h, m)))
}

/** Días completos entre dos fechas 'YYYY-MM-DD' (b − a). */
export function diasEntre(a: string, b: string): number {
  return Math.round((aUTC(b).getTime() - aUTC(a).getTime()) / 86_400_000)
}

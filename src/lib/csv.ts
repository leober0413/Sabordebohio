/** FR-073: CSV que abre bien en Excel y Google Sheets. */

export interface Columna<T> {
  titulo: string
  valor: (fila: T) => string | number | null | undefined
}

function celda(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return ''
  const texto = String(v)
  // Comillas si hay separador, comillas o saltos de línea; las comillas se duplican.
  return /[",\r\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto
}

export function aCsv<T>(filas: T[], columnas: Columna<T>[]): string {
  const lineas = [columnas.map((c) => celda(c.titulo)).join(',')]
  for (const f of filas) lineas.push(columnas.map((c) => celda(c.valor(f))).join(','))
  return lineas.join('\r\n') + '\r\n'
}

/** Descarga el CSV. El BOM hace que Excel lea bien las tildes y la ñ. */
export function descargarCsv(nombreArchivo: string, contenido: string) {
  const blob = new Blob(['﻿', contenido], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nombreArchivo
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

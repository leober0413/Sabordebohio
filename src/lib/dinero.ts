const formato = new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP' })

/** Monto en pesos dominicanos: 367 → "RD$367.00" (NFR-U-004). */
export function formatDinero(monto: number): string {
  return formato.format(monto)
}

const cantidad = new Intl.NumberFormat('es-DO', { maximumFractionDigits: 3 })

/** Cantidades de ingredientes: 1.5, 12, 0.375 (hasta 3 decimales). */
export function formatCantidad(n: number): string {
  return cantidad.format(n)
}

const formato = new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP' })

/** Monto en pesos dominicanos: 367 → "RD$367.00" (NFR-U-004). */
export function formatDinero(monto: number): string {
  return formato.format(monto)
}

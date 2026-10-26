/** "2 docenas y 4" para leer de un vistazo cuánto se lleva; null con menos de 12. */
export function enDocenas(n: number): string | null {
  const docenas = Math.floor(n / 12)
  if (docenas === 0) return null
  const resto = n % 12
  const texto = docenas === 1 ? '1 docena' : `${docenas} docenas`
  return resto ? `${texto} y ${resto}` : texto
}

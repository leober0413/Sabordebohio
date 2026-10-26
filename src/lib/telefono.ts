/**
 * FR-013: solo los dígitos del teléfono, como `privado.digitos_telefono` en
 * la base. Con 11 que empiezan por 1 (código de país) se quita el 1, así
 * "+1 (809) 555-0101" y "809-555-0101" son el mismo número.
 */
export function digitosTelefono(telefono: string | null | undefined): string {
  const d = (telefono ?? '').replace(/\D/g, '')
  return d.length === 11 && d.startsWith('1') ? d.slice(1) : d
}

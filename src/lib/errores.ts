interface ErrorConCodigo {
  code?: string
  message?: string
}

/**
 * Mensaje en español para mostrar en la UI. Los errores de negocio de las RPC
 * (códigos 22023 y P0001) ya vienen en español y se muestran tal cual
 * (CLAUDE.md, regla 9).
 */
export function mensajeError(error: unknown): string {
  const { code, message } = (
    typeof error === 'object' && error !== null ? error : {}
  ) as ErrorConCodigo

  if ((code === '22023' || code === 'P0001') && message) return message
  if (code === '23505') return 'Ya existe uno con ese nombre.'
  if (code === '42501') return 'No tienes permiso para hacer esto.'
  if (code === '23514') return 'Algún valor no es válido. Revisa los datos.'
  if (message === 'Failed to fetch' || message?.includes('NetworkError')) {
    return 'No hay conexión. Revisa el internet e inténtalo de nuevo.'
  }
  return 'Algo salió mal. Inténtalo de nuevo.'
}

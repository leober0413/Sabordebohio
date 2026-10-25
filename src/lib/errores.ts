interface ErrorConCodigo {
  code?: string
  message?: string
  name?: string
}

// Cómo dice cada navegador "no llegó al servidor": Chrome, Safari y Firefox.
// Supabase Auth lo envuelve en AuthRetryableFetchError (también con 502-504).
function esDeConexion({ message, name }: ErrorConCodigo) {
  return (
    name === 'AuthRetryableFetchError' ||
    message === 'Failed to fetch' ||
    message === 'Load failed' ||
    !!message?.includes('NetworkError')
  )
}

/**
 * Mensaje en español para mostrar en la UI. Los errores de negocio de las RPC
 * (códigos 22023 y P0001) ya vienen en español y se muestran tal cual
 * (CLAUDE.md, regla 9).
 */
export function mensajeError(error: unknown): string {
  const e = (typeof error === 'object' && error !== null ? error : {}) as ErrorConCodigo
  const { code, message } = e

  if ((code === '22023' || code === 'P0001') && message) return message
  if (code === '23505') return 'Ya existe uno con ese nombre.'
  if (code === '42501') return 'No tienes permiso para hacer esto.'
  if (code === '23514') return 'Algún valor no es válido. Revisa los datos.'
  if (esDeConexion(e)) {
    return 'No pudimos conectar con el servidor. Revisa el internet e inténtalo de nuevo.'
  }
  return 'Algo salió mal. Inténtalo de nuevo.'
}

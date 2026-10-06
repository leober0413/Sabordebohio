/**
 * Actualizaciones de la PWA instalada.
 *
 * - Busca versión nueva al abrir la app, al volver a ella y cada 30 minutos.
 * - Si hay una, muestra un aviso con "Actualizar" (no recarga sola para no
 *   perder un pedido a medio escribir).
 * - Si no se toca el aviso, se aplica en cuanto la app pasa a segundo plano:
 *   al volver ya está la versión nueva.
 */

export const CADA_MS = 30 * 60 * 1000

interface OpcionesRegistro {
  immediate?: boolean
  onNeedRefresh?: () => void
  onRegisteredSW?: (url: string, registro: ServiceWorkerRegistration | undefined) => void
}

export interface Dependencias {
  registrar: (opciones: OpcionesRegistro) => (recargar?: boolean) => Promise<void>
  avisar: (actualizar: () => void) => void
  documento: Pick<Document, 'visibilityState' | 'addEventListener'>
  programar: (fn: () => void, ms: number) => unknown
  enLinea: () => boolean
}

export function iniciarActualizaciones({
  registrar,
  avisar,
  documento,
  programar,
  enLinea,
}: Dependencias) {
  let pendiente = false

  const actualizar = registrar({
    immediate: true,
    onNeedRefresh() {
      pendiente = true
      avisar(() => void actualizar(true))
    },
    onRegisteredSW(_url, registro) {
      if (!registro) return
      const revisar = () => {
        if (enLinea()) registro.update().catch(() => {})
      }
      programar(revisar, CADA_MS)
      documento.addEventListener('visibilitychange', () => {
        if (documento.visibilityState === 'visible') revisar()
      })
    },
  })

  documento.addEventListener('visibilitychange', () => {
    if (documento.visibilityState === 'hidden' && pendiente) void actualizar(true)
  })
}

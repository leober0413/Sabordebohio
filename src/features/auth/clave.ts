import type { User } from '@supabase/supabase-js'

/**
 * Marca que `crear-dueno.yml` pone en la cuenta nueva (user_metadata) y que se
 * quita al cambiar la contraseña. Solo decide si se muestra la guía; no da ni
 * quita permisos (eso lo hacen RLS y `es_dueno()`).
 */
export const CLAVE_TEMPORAL = 'clave_temporal'

export function tieneClaveTemporal(user: Pick<User, 'user_metadata'> | null | undefined) {
  return user?.user_metadata?.[CLAVE_TEMPORAL] === true
}

const POSPUESTA = 'sabor:guia-clave-pospuesta'

/** "Ahora no" dura hasta que se vuelve a abrir la app (sessionStorage). */
export function guiaPospuesta(userId: string) {
  try {
    return sessionStorage.getItem(POSPUESTA) === userId
  } catch {
    return false
  }
}

export function posponerGuia(userId: string) {
  try {
    sessionStorage.setItem(POSPUESTA, userId)
  } catch {
    // Sin almacenamiento la guía solo se oculta en esta pantalla.
  }
}

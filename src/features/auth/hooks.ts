import { useQuery } from '@tanstack/react-query'
import { useContext } from 'react'

import { AuthContext } from '@/features/auth/context'
import { supabase } from '@/lib/supabase'

export function useSession() {
  return useContext(AuthContext).session
}

/**
 * Perfil de dueño del usuario. `null` si está autenticado pero no es dueño:
 * RLS no le deja ver su fila (FR-080).
 */
export function usePerfil() {
  const session = useSession()
  const userId = session?.user.id
  return useQuery({
    queryKey: ['perfil', userId],
    enabled: !!userId,
    staleTime: Infinity,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('perfiles')
        .select('id, nombre')
        .eq('id', userId!)
        .maybeSingle()
      if (error) throw error
      return data
    },
  })
}

export async function cerrarSesion() {
  await supabase.auth.signOut()
}

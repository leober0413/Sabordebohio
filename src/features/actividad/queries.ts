import { useInfiniteQuery } from '@tanstack/react-query'

import { ENTIDADES, type Area } from '@/features/actividad/describir'
import { supabase } from '@/lib/supabase'

export const POR_PAGINA = 40

/** FR-083: lo más reciente primero, de 40 en 40. */
export function useActividad(area: Area | 'todo') {
  return useInfiniteQuery({
    queryKey: ['actividad', area],
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      let consulta = supabase
        .from('actividad')
        .select('id, creado_en, entidad, entidad_id, accion, antes, despues, perfiles(nombre)')
        .order('creado_en', { ascending: false })
        .order('id', { ascending: false })
        .range(pageParam, pageParam + POR_PAGINA - 1)
      if (area !== 'todo') consulta = consulta.in('entidad', ENTIDADES[area])
      const { data, error } = await consulta
      if (error) throw error
      return data
    },
    getNextPageParam: (ultima, paginas) =>
      ultima.length === POR_PAGINA ? paginas.length * POR_PAGINA : undefined,
  })
}

export type FilaActividad = NonNullable<
  ReturnType<typeof useActividad>['data']
>['pages'][number][number]

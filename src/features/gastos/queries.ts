import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { formatDinero } from '@/lib/dinero'
import { mensajeError } from '@/lib/errores'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database'

export type Categoria = Database['public']['Tables']['categorias_gasto']['Row']

function invalidar(queryClient: QueryClient) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: ['gastos'] }),
    queryClient.invalidateQueries({ queryKey: ['finanzas'] }),
  ])
}

export function useCategorias() {
  return useQuery({
    queryKey: ['gastos', 'categorias'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categorias_gasto')
        .select('*')
        .order('es_sistema', { ascending: false })
        .order('nombre')
      if (error) throw error
      return data
    },
  })
}

export function useGastos(desde: string, hasta: string) {
  return useQuery({
    queryKey: ['gastos', 'lista', desde, hasta],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gastos')
        .select('*, categorias_gasto(nombre), perfiles(nombre)')
        .gte('fecha', desde)
        .lte('fecha', hasta)
        .order('fecha', { ascending: false })
        .order('creado_en', { ascending: false })
      if (error) throw error
      return data
    },
  })
}

export type Gasto = NonNullable<ReturnType<typeof useGastos>['data']>[number]

/** FR-064 */
export function useCrearGasto() {
  const queryClient = useQueryClient()
  const anular = useAnularGasto({ conAviso: false })
  return useMutation({
    mutationFn: async (d: {
      categoria_id: string
      monto: number
      fecha: string
      descripcion: string | null
    }) => {
      const { data, error } = await supabase.from('gastos').insert(d).select('*').single()
      if (error) throw error
      return data
    },
    onSuccess: (g) =>
      toast.success(`Gasto de ${formatDinero(g.monto)} registrado`, {
        action: { label: 'Deshacer', onClick: () => anular.mutate({ id: g.id, anular: true }) },
      }),
    onError: (error) => toast.error(mensajeError(error)),
    onSettled: () => invalidar(queryClient),
  })
}

/** Anular un gasto suelto (los de compras no se tocan) o deshacer la anulación. */
export function useAnularGasto({ conAviso = true } = {}) {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: async ({ id, anular }: { id: string; anular: boolean }) => {
      const { data, error } = await supabase
        .from('gastos')
        .update({ anulado_en: anular ? new Date().toISOString() : null })
        .eq('id', id)
        .select('*')
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (g, { anular }) => {
      if (!conAviso) return
      if (anular) {
        toast(`Gasto de ${formatDinero(g.monto)} anulado`, {
          action: {
            label: 'Deshacer',
            onClick: () => mutation.mutate({ id: g.id, anular: false }),
          },
        })
      }
    },
    onError: (error) => toast.error(mensajeError(error)),
    onSettled: () => invalidar(queryClient),
  })
  return mutation
}

export function useCrearCategoria() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (nombre: string) => {
      const { data, error } = await supabase
        .from('categorias_gasto')
        .insert({ nombre })
        .select('*')
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (c) => toast.success(`Categoría "${c.nombre}" creada`),
    onError: (error) => toast.error(mensajeError(error)),
    onSettled: () => invalidar(queryClient),
  })
}

export function useActualizarCategoria() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      cambios,
    }: {
      id: string
      cambios: { nombre?: string; activo?: boolean }
    }) => {
      const { error } = await supabase.from('categorias_gasto').update(cambios).eq('id', id)
      if (error) throw error
    },
    onError: (error) => toast.error(mensajeError(error)),
    onSettled: () => invalidar(queryClient),
  })
}

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { mensajeError } from '@/lib/errores'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database'

export type Cliente = Database['public']['Tables']['clientes']['Row']

/** Quita caracteres con significado en los filtros de PostgREST. */
function limpiar(texto: string) {
  return texto.replace(/[%,()*\\]/g, ' ').trim()
}

/** FR-011: sugerencias por nombre o teléfono que contengan el texto. */
export function useBuscarClientes(texto: string) {
  const q = limpiar(texto)
  return useQuery({
    queryKey: ['clientes', 'buscar', q],
    enabled: q.length > 0,
    staleTime: 10_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .eq('activo', true)
        .or(`nombre.ilike.%${q}%,telefono.ilike.%${q}%`)
        .order('nombre')
        .limit(6)
      if (error) throw error
      return data
    },
  })
}

export function useCliente(id: string | undefined) {
  return useQuery({
    queryKey: ['clientes', 'detalle', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from('clientes').select('*').eq('id', id!).single()
      if (error) throw error
      return data
    },
  })
}

/** FR-010: crear un cliente sin salir del formulario del pedido. */
export function useCrearCliente() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ nombre, telefono }: { nombre: string; telefono: string | null }) => {
      const { data, error } = await supabase
        .from('clientes')
        .insert({ nombre, telefono })
        .select('*')
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (cliente) => {
      queryClient.setQueryData(['clientes', 'detalle', cliente.id], cliente)
      toast.success(`Cliente "${cliente.nombre}" creado`)
    },
    onError: (error) => toast.error(mensajeError(error)),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['clientes', 'buscar'] }),
  })
}

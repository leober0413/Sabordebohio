import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { mensajeError } from '@/lib/errores'
import { supabase } from '@/lib/supabase'
import { digitosTelefono } from '@/lib/telefono'
import type { Database } from '@/types/database'

export type Cliente = Database['public']['Tables']['clientes']['Row']

/** Quita caracteres con significado en los filtros de PostgREST. */
function limpiar(texto: string) {
  return texto.replace(/[%,()*\\]/g, ' ').trim()
}

/**
 * FR-011: sugerencias por nombre o teléfono que contengan el texto. El
 * teléfono también se busca por sus dígitos (FR-013): "8095550101" encuentra
 * "809-555-0101".
 */
export function useBuscarClientes(texto: string) {
  const q = limpiar(texto)
  const digitos = digitosTelefono(q)
  return useQuery({
    queryKey: ['clientes', 'buscar', q],
    enabled: q.length > 0,
    staleTime: 10_000,
    queryFn: async () => {
      const filtros = [`nombre.ilike.%${q}%`, `telefono.ilike.%${q}%`]
      if (digitos.length >= 3) filtros.push(`telefono_digitos.like.%${digitos}%`)
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .eq('activo', true)
        .or(filtros.join(','))
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

/**
 * FR-013: el cliente activo que ya tiene ese número, para ofrecerlo antes de
 * crear otro. Busca con el número completo (7 dígitos o más).
 */
export function useClientePorTelefono(telefono: string) {
  const digitos = digitosTelefono(telefono)
  return useQuery({
    queryKey: ['clientes', 'telefono', digitos],
    enabled: digitos.length >= 7,
    staleTime: 10_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .eq('activo', true)
        .eq('telefono_digitos', digitos)
        .order('creado_en')
        .limit(1)
        .maybeSingle()
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
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['clientes'] }),
  })
}

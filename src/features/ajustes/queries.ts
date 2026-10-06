import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { mensajeError } from '@/lib/errores'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database'

export type ConfigPreciosRow = Database['public']['Tables']['config_precios']['Row']
export type ConfigPreciosUpdate = Pick<
  Database['public']['Tables']['config_precios']['Update'],
  'precio_suelta' | 'precio_docena' | 'minimo_docena' | 'redondeo'
>
export type Producto = Database['public']['Tables']['productos']['Row']
export type ProductoUpdate = Pick<
  Database['public']['Tables']['productos']['Update'],
  'nombre' | 'activo' | 'stock_minimo' | 'orden'
>

const claves = {
  config: ['config_precios'] as const,
  productos: ['productos'] as const,
}

export function useConfigPrecios() {
  return useQuery({
    queryKey: claves.config,
    queryFn: async () => {
      const { data, error } = await supabase.from('config_precios').select('*').eq('id', 1).single()
      if (error) throw error
      return data
    },
  })
}

export function useGuardarConfigPrecios() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (cambios: ConfigPreciosUpdate) => {
      const { data, error } = await supabase
        .from('config_precios')
        .update(cambios)
        .eq('id', 1)
        .select('*')
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.setQueryData(claves.config, data)
      toast.success('Lista de precios guardada')
    },
    onError: (error) => toast.error(mensajeError(error)),
    onSettled: () => queryClient.invalidateQueries({ queryKey: claves.config }),
  })
}

export function useProductos() {
  return useQuery({
    queryKey: claves.productos,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('productos')
        .select('*')
        .order('orden')
        .order('nombre')
      if (error) throw error
      return data
    },
  })
}

export function useCrearProducto() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (nombre: string) => {
      const actuales = queryClient.getQueryData<Producto[]>(claves.productos) ?? []
      const orden = Math.max(0, ...actuales.map((p) => p.orden)) + 1
      const { data, error } = await supabase
        .from('productos')
        .insert({ nombre, orden })
        .select('*')
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (data) => toast.success(`Sabor "${data.nombre}" agregado`),
    onError: (error) => toast.error(mensajeError(error)),
    onSettled: () => queryClient.invalidateQueries({ queryKey: claves.productos }),
  })
}

/** Actualización optimista: la lista cambia al instante y se revierte si falla. */
export function useActualizarProducto() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, cambios }: { id: string; cambios: ProductoUpdate }) => {
      const { error } = await supabase.from('productos').update(cambios).eq('id', id)
      if (error) throw error
    },
    onMutate: async ({ id, cambios }) => {
      await queryClient.cancelQueries({ queryKey: claves.productos })
      const anterior = queryClient.getQueryData<Producto[]>(claves.productos)
      queryClient.setQueryData<Producto[]>(claves.productos, (lista) =>
        lista?.map((p) => (p.id === id ? { ...p, ...cambios } : p)),
      )
      return { anterior }
    },
    onError: (error, _vars, contexto) => {
      queryClient.setQueryData(claves.productos, contexto?.anterior)
      toast.error(mensajeError(error))
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: claves.productos }),
  })
}

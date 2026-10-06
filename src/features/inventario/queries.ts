import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { mensajeError } from '@/lib/errores'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database'

type Vista = Database['public']['Views']['v_stock_productos']['Row']

export interface StockProducto {
  id: string
  nombre: string
  activo: boolean
  orden: number
  stock: number
  stock_minimo: number | null
  bajo_minimo: boolean
  negativo: boolean
}

/** FR-051, FR-053, FR-054 */
export function useStockProductos() {
  return useQuery({
    queryKey: ['stock', 'productos'],
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_stock_productos')
        .select('*')
        .order('orden')
        .order('nombre')
      if (error) throw error
      // Columnas de la vista que nunca son null (ver la migración).
      return data as Vista[] as unknown as StockProducto[]
    },
  })
}

/** Sabores activos en negativo o en/bajo su mínimo, para las alertas. */
export function alertasStock(stock: StockProducto[] | undefined) {
  return (stock ?? []).filter((s) => s.activo && (s.negativo || s.bajo_minimo))
}

export function useRegistrarTanda() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (d: {
      lineas: Array<{ producto_id: string; cantidad: number }>
      fecha: string
      notas: string | null
    }) => {
      const { data, error } = await supabase.rpc('registrar_tanda', {
        p_lineas: d.lineas,
        p_fecha: d.fecha,
        p_notas: d.notas ?? undefined,
      })
      if (error) throw error
      return data
    },
    onSuccess: () => toast.success('Tanda registrada'),
    onError: (error) => toast.error(mensajeError(error)),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['stock'] }),
  })
}

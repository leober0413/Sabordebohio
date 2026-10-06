import { useQuery } from '@tanstack/react-query'

import { supabase } from '@/lib/supabase'

export interface Resumen {
  desde: string
  hasta: string
  vendido: number
  envios: number
  pedidos_entregados: number
  cobrado: number
  cobrado_efectivo: number
  cobrado_transferencia: number
  por_cobrar: number
  gastos: number
  ganancia_aprox: number
  gastos_por_categoria: Array<{ categoria: string; monto: number }>
  unidades_por_sabor: Array<{ nombre: string; cantidad: number }>
}

/** FR-070 a FR-072, BR-010 (cálculo en el servidor: resumen_financiero). */
export function useResumen(desde: string, hasta: string) {
  return useQuery({
    queryKey: ['finanzas', desde, hasta],
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('resumen_financiero', {
        p_desde: desde,
        p_hasta: hasta,
      })
      if (error) throw error
      return data as unknown as Resumen
    },
  })
}

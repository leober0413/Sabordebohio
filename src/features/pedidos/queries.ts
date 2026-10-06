import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import {
  aPedido,
  ETIQUETA_ESTADO,
  type EstadoPedido,
  type PagoRapido,
  type Pedido,
  type TipoEntrega,
} from '@/features/pedidos/tipos'
import { mensajeError } from '@/lib/errores'
import { hoySD } from '@/lib/fechas'
import { supabase } from '@/lib/supabase'

export const clavesPedidos = {
  todos: ['pedidos'] as const,
  hoy: () => ['pedidos', 'hoy'] as const,
  dia: (fecha: string) => ['pedidos', 'dia', fecha] as const,
  detalle: (id: string) => ['pedidos', 'detalle', id] as const,
}

// Dos dueños usan la app a la vez: se refresca seguido (NFR-R-003).
const REFRESCO_MS = 30_000

/** Pendientes y listos de hoy y atrasados (FR-030, FR-031). */
export function usePedidosHoy() {
  return useQuery({
    queryKey: clavesPedidos.hoy(),
    refetchInterval: REFRESCO_MS,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_pedidos')
        .select('*')
        .in('estado', ['pendiente', 'listo'])
        .lte('fecha_entrega', hoySD())
      if (error) throw error
      return data.map(aPedido)
    },
  })
}

/** Todos los pedidos de un día (FR-033). */
export function usePedidosDelDia(fecha: string) {
  return useQuery({
    queryKey: clavesPedidos.dia(fecha),
    refetchInterval: REFRESCO_MS,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_pedidos')
        .select('*')
        .eq('fecha_entrega', fecha)
      if (error) throw error
      return data.map(aPedido)
    },
  })
}

export function usePedido(id: string) {
  return useQuery({
    queryKey: clavesPedidos.detalle(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_pedidos')
        .select('*')
        .eq('id', id)
        .maybeSingle()
      if (error) throw error
      return data ? aPedido(data) : null
    },
  })
}

export interface DatosPedido {
  clienteId: string
  lineas: Array<{ producto_id: string; cantidad: number }>
  fechaEntrega: string
  horaEntrega: string | null
  tipoEntrega: TipoEntrega
  costoEnvio: number
  notas: string | null
  /** Solo al crear: pago inicial (FR-041). */
  pago?: PagoRapido | null
}

export function invalidar(queryClient: QueryClient) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: clavesPedidos.todos }),
    queryClient.invalidateQueries({ queryKey: ['stock'] }),
    queryClient.invalidateQueries({ queryKey: ['pagos'] }),
    queryClient.invalidateQueries({ queryKey: ['saldos'] }),
  ])
}

export function useCrearPedido() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (d: DatosPedido) => {
      const { data, error } = await supabase.rpc('crear_pedido', {
        p_cliente_id: d.clienteId,
        p_lineas: d.lineas,
        p_fecha_entrega: d.fechaEntrega,
        p_hora_entrega: d.horaEntrega ?? undefined,
        p_tipo_entrega: d.tipoEntrega,
        p_costo_envio: d.costoEnvio,
        p_notas: d.notas ?? undefined,
        p_pago: d.pago ?? undefined,
      })
      if (error) throw error
      return data
    },
    onError: (error) => toast.error(mensajeError(error)),
    onSettled: () => invalidar(queryClient),
  })
}

export function useActualizarPedido() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, version, d }: { id: string; version: number; d: DatosPedido }) => {
      const { data, error } = await supabase.rpc('actualizar_pedido', {
        p_id: id,
        p_version: version,
        p_cliente_id: d.clienteId,
        p_lineas: d.lineas,
        p_fecha_entrega: d.fechaEntrega,
        p_hora_entrega: d.horaEntrega ?? undefined,
        p_tipo_entrega: d.tipoEntrega,
        p_costo_envio: d.costoEnvio,
        p_notas: d.notas ?? undefined,
      })
      if (error) throw error
      return data
    },
    onError: (error) => toast.error(mensajeError(error)),
    onSettled: () => invalidar(queryClient),
  })
}

interface CambioEstado {
  pedido: Pick<Pedido, 'id' | 'estado' | 'cliente_nombre'>
  estado: EstadoPedido
  hechoAlMomento?: boolean
  /** Cobrar al entregar (FR-041). */
  pago?: PagoRapido | null
  /** false en el propio "Deshacer", para no ofrecer deshacer lo deshecho. */
  conDeshacer?: boolean
}

const MENSAJE_ESTADO: Record<EstadoPedido, string> = {
  pendiente: 'vuelve a pendiente',
  listo: 'listo',
  entregado: 'entregado',
  cancelado: 'cancelado',
}

/**
 * Cambio de estado optimista (docs/ui-ux.md §1.5) con "Deshacer" en el aviso
 * en lugar de un diálogo de confirmación (§1.6).
 */
export function useCambiarEstado() {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: async ({ pedido, estado, hechoAlMomento = false, pago }: CambioEstado) => {
      const { data, error } = await supabase.rpc('cambiar_estado', {
        p_id: pedido.id,
        p_estado: estado,
        p_hecho_al_momento: hechoAlMomento,
        p_pago: pago ?? undefined,
      })
      if (error) throw error
      return data
    },
    onMutate: async ({ pedido, estado }) => {
      await queryClient.cancelQueries({ queryKey: clavesPedidos.todos })
      const anteriores = queryClient.getQueriesData({ queryKey: clavesPedidos.todos })
      const aplicar = (p: Pedido): Pedido => (p.id === pedido.id ? { ...p, estado } : p)
      queryClient.setQueriesData<Pedido[] | Pedido | null>(
        { queryKey: clavesPedidos.todos },
        (datos) => (Array.isArray(datos) ? datos.map(aplicar) : datos ? aplicar(datos) : datos),
      )
      return { anteriores }
    },
    onError: (error, _vars, contexto) => {
      contexto?.anteriores.forEach(([clave, datos]) => queryClient.setQueryData(clave, datos))
      toast.error(mensajeError(error))
    },
    onSuccess: (_data, { pedido, estado, hechoAlMomento, pago, conDeshacer = true }) => {
      const texto = `${pedido.cliente_nombre}: ${MENSAJE_ESTADO[estado]}${hechoAlMomento ? ' (hecho al momento)' : ''}${pago ? ' y cobrado' : ''}`
      // Deshacer una entrega cobrada anula también el cobro: se resuelve en el
      // detalle (Pagos). Aquí solo se ofrece para cambios sin cobro.
      if (pago) {
        toast.success(texto)
        return
      }
      if (!conDeshacer) {
        toast(`Se deshizo: vuelve a ${ETIQUETA_ESTADO[pedido.estado].toLowerCase()}`)
        return
      }
      toast.success(texto, {
        action: {
          label: 'Deshacer',
          onClick: () =>
            mutation.mutate({
              pedido: { ...pedido, estado },
              estado: pedido.estado,
              conDeshacer: false,
            }),
        },
      })
    },
    onSettled: () => invalidar(queryClient),
  })

  return mutation
}

/** Historial de pedidos de un cliente, el más reciente primero (FR-012). */
export function usePedidosCliente(clienteId: string) {
  return useQuery({
    queryKey: ['pedidos', 'cliente', clienteId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_pedidos')
        .select('*')
        .eq('cliente_id', clienteId)
        .order('fecha_entrega', { ascending: false })
        .order('creado_en', { ascending: false })
        .limit(100)
      if (error) throw error
      return data.map(aPedido)
    },
  })
}

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { invalidar } from '@/features/pedidos/queries'
import type { MetodoPago } from '@/features/pedidos/tipos'
import { formatDinero } from '@/lib/dinero'
import { mensajeError } from '@/lib/errores'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database'

export type Pago = Database['public']['Tables']['pagos']['Row']
export type Abono = Database['public']['Tables']['abonos']['Row']
type VistaSaldo = Database['public']['Views']['v_saldos_clientes']['Row']

export interface SaldoCliente {
  id: string
  nombre: string
  telefono: string | null
  activo: boolean
  saldo_fiado: number
  saldo_total: number
  pedidos_fiados: number
  fiado_desde: string | null
}

export function usePagosPedido(pedidoId: string) {
  return useQuery({
    queryKey: ['pagos', 'pedido', pedidoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pagos')
        .select('*')
        .eq('pedido_id', pedidoId)
        .order('creado_en')
      if (error) throw error
      return data
    },
  })
}

/** FR-040, con "Deshacer" (anula el pago) en el aviso. */
export function useRegistrarPago() {
  const queryClient = useQueryClient()
  const anular = useAnularPago({ conAviso: false })
  return useMutation({
    mutationFn: async (d: { pedidoId: string; monto: number; metodo: MetodoPago }) => {
      const { data, error } = await supabase.rpc('registrar_pago', {
        p_pedido_id: d.pedidoId,
        p_monto: d.monto,
        p_metodo: d.metodo,
      })
      if (error) throw error
      return data
    },
    onSuccess: (pago) =>
      toast.success(`Cobrado ${formatDinero(pago.monto)}`, {
        action: { label: 'Deshacer', onClick: () => anular.mutate(pago.id) },
      }),
    onError: (error) => toast.error(mensajeError(error)),
    onSettled: () => invalidar(queryClient),
  })
}

export function useAnularPago({ conAviso = true } = {}) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (pagoId: string) => {
      const { data, error } = await supabase.rpc('anular_pago', { p_pago_id: pagoId })
      if (error) throw error
      return data
    },
    onSuccess: (pago) =>
      toast(conAviso ? `Pago de ${formatDinero(pago.monto)} anulado` : 'Cobro deshecho'),
    onError: (error) => toast.error(mensajeError(error)),
    onSettled: () => invalidar(queryClient),
  })
}

/** FR-042: clientes con fiado, el más viejo primero. */
export function useFiado() {
  return useQuery({
    queryKey: ['saldos', 'fiado'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_saldos_clientes')
        .select('*')
        .gt('saldo_fiado', 0)
        .order('fiado_desde')
      if (error) throw error
      return data as VistaSaldo[] as unknown as SaldoCliente[]
    },
  })
}

export function useSaldoCliente(clienteId: string) {
  return useQuery({
    queryKey: ['saldos', 'cliente', clienteId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_saldos_clientes')
        .select('*')
        .eq('id', clienteId)
        .maybeSingle()
      if (error) throw error
      return data as VistaSaldo | null as unknown as SaldoCliente | null
    },
  })
}

export function useAbonosCliente(clienteId: string) {
  return useQuery({
    queryKey: ['pagos', 'abonos', clienteId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('abonos')
        .select('*')
        .eq('cliente_id', clienteId)
        .order('creado_en', { ascending: false })
      if (error) throw error
      return data
    },
  })
}

/** FR-043, DEC-003: sin pedido, se reparte del más viejo al más nuevo. */
export function useRegistrarAbono() {
  const queryClient = useQueryClient()
  const anular = useAnularAbono({ conAviso: false })
  return useMutation({
    mutationFn: async (d: {
      clienteId: string
      monto: number
      metodo: MetodoPago
      pedidoId: string | null
    }) => {
      const { data, error } = await supabase.rpc('registrar_abono', {
        p_cliente_id: d.clienteId,
        p_monto: d.monto,
        p_metodo: d.metodo,
        p_pedido_id: d.pedidoId ?? undefined,
      })
      if (error) throw error
      return data
    },
    onSuccess: (abono) =>
      toast.success(`Abono de ${formatDinero(abono.monto)} registrado`, {
        action: { label: 'Deshacer', onClick: () => anular.mutate(abono.id) },
      }),
    onError: (error) => toast.error(mensajeError(error)),
    onSettled: () => invalidar(queryClient),
  })
}

export function useAnularAbono({ conAviso = true } = {}) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (abonoId: string) => {
      const { data, error } = await supabase.rpc('anular_abono', { p_abono_id: abonoId })
      if (error) throw error
      return data
    },
    onSuccess: (abono) =>
      toast(conAviso ? `Abono de ${formatDinero(abono.monto)} anulado` : 'Abono deshecho'),
    onError: (error) => toast.error(mensajeError(error)),
    onSettled: () => invalidar(queryClient),
  })
}

/** Todos los clientes activos con su saldo, por nombre. */
export function useClientesConSaldo() {
  return useQuery({
    queryKey: ['saldos', 'clientes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_saldos_clientes')
        .select('*')
        .eq('activo', true)
        .order('nombre')
      if (error) throw error
      return data as VistaSaldo[] as unknown as SaldoCliente[]
    },
  })
}

import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { formatCantidad, formatDinero } from '@/lib/dinero'
import { mensajeError } from '@/lib/errores'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database'

type Vista<T extends keyof Database['public']['Views']> = Database['public']['Views'][T]['Row']
export type Ingrediente = Database['public']['Tables']['ingredientes']['Row']
type IngredienteUpdate = Pick<
  Database['public']['Tables']['ingredientes']['Update'],
  'nombre' | 'unidad' | 'stock_minimo' | 'activo'
>

// Las columnas de estas vistas nunca son null (ver la migración); los tipos
// generados marcan opcionales todas las columnas de una vista.
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

export interface StockIngrediente {
  id: string
  nombre: string
  unidad: string
  activo: boolean
  stock: number
  stock_minimo: number | null
  bajo_minimo: boolean
}

export interface AlertaStock {
  tipo: 'producto' | 'ingrediente'
  id: string
  nombre: string
  unidad: string
  stock: number
  stock_minimo: number | null
  negativo: boolean
}

const REFRESCO_MS = 30_000

function invalidarStock(queryClient: QueryClient) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: ['stock'] }),
    queryClient.invalidateQueries({ queryKey: ['movimientos'] }),
    queryClient.invalidateQueries({ queryKey: ['ingredientes'] }),
  ])
}

/** FR-051, FR-053, FR-054 */
export function useStockProductos() {
  return useQuery({
    queryKey: ['stock', 'productos'],
    refetchInterval: REFRESCO_MS,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_stock_productos')
        .select('*')
        .order('orden')
        .order('nombre')
      if (error) throw error
      return data as Vista<'v_stock_productos'>[] as unknown as StockProducto[]
    },
  })
}

/** FR-062 */
export function useStockIngredientes() {
  return useQuery({
    queryKey: ['stock', 'ingredientes'],
    refetchInterval: REFRESCO_MS,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_stock_ingredientes')
        .select('*')
        .order('nombre')
      if (error) throw error
      return data as Vista<'v_stock_ingredientes'>[] as unknown as StockIngrediente[]
    },
  })
}

/** FR-063: lo que está en o bajo el mínimo (y sabores en negativo). */
export function useAlertasStock() {
  return useQuery({
    queryKey: ['stock', 'alertas'],
    refetchInterval: REFRESCO_MS,
    queryFn: async () => {
      const { data, error } = await supabase.from('v_alertas_stock').select('*').order('nombre')
      if (error) throw error
      return data as Vista<'v_alertas_stock'>[] as unknown as AlertaStock[]
    },
  })
}

/** "Queso (1.5 lb)" o "Pollo (3)" */
export function describirAlerta(a: AlertaStock): string {
  return a.tipo === 'ingrediente'
    ? `${a.nombre} (${formatCantidad(a.stock)} ${a.unidad})`
    : `${a.nombre} (${a.stock})`
}

export function useMovimientosProducto(productoId: string) {
  return useQuery({
    queryKey: ['movimientos', 'producto', productoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('movimientos_producto')
        .select('*, perfiles(nombre), pedidos(clientes(nombre))')
        .eq('producto_id', productoId)
        .order('creado_en', { ascending: false })
        .limit(100)
      if (error) throw error
      return data
    },
  })
}

export function useMovimientosIngrediente(ingredienteId: string) {
  return useQuery({
    queryKey: ['movimientos', 'ingrediente', ingredienteId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('movimientos_ingrediente')
        .select('*, perfiles(nombre), compras(costo_total)')
        .eq('ingrediente_id', ingredienteId)
        .order('creado_en', { ascending: false })
        .limit(100)
      if (error) throw error
      return data
    },
  })
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
    onSettled: () => invalidarStock(queryClient),
  })
}

/** FR-052 */
export function useAjustarStockProducto() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (d: { productoId: string; cantidad: number; motivo: string }) => {
      const { data, error } = await supabase.rpc('ajustar_stock_producto', {
        p_producto_id: d.productoId,
        p_cantidad: d.cantidad,
        p_motivo: d.motivo,
      })
      if (error) throw error
      return data
    },
    onSuccess: (m) =>
      toast.success(`Ajuste de ${m.cantidad > 0 ? '+' : ''}${m.cantidad} registrado`),
    onError: (error) => toast.error(mensajeError(error)),
    onSettled: () => invalidarStock(queryClient),
  })
}

export function useIngredientes() {
  return useQuery({
    queryKey: ['ingredientes'],
    queryFn: async () => {
      const { data, error } = await supabase.from('ingredientes').select('*').order('nombre')
      if (error) throw error
      return data
    },
  })
}

/** FR-060 */
export function useCrearIngrediente() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (d: { nombre: string; unidad: string; stock_minimo: number | null }) => {
      const { data, error } = await supabase.from('ingredientes').insert(d).select('*').single()
      if (error) throw error
      return data
    },
    onSuccess: (i) => toast.success(`Ingrediente "${i.nombre}" creado`),
    onError: (error) => toast.error(mensajeError(error)),
    onSettled: () => invalidarStock(queryClient),
  })
}

/** FR-065: nombre, unidad, mínimo o activo. */
export function useActualizarIngrediente() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, cambios }: { id: string; cambios: IngredienteUpdate }) => {
      const { error } = await supabase.from('ingredientes').update(cambios).eq('id', id)
      if (error) throw error
    },
    onError: (error) => toast.error(mensajeError(error)),
    onSettled: () => invalidarStock(queryClient),
  })
}

/** FR-061, BR-009 */
export function useRegistrarCompra() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (d: {
      ingredienteId: string
      cantidad: number
      costoTotal: number
      fecha: string
    }) => {
      const { data, error } = await supabase.rpc('registrar_compra', {
        p_ingrediente_id: d.ingredienteId,
        p_cantidad: d.cantidad,
        p_costo_total: d.costoTotal,
        p_fecha: d.fecha,
      })
      if (error) throw error
      return data
    },
    onSuccess: (c) =>
      toast.success(
        `Compra registrada · ${formatCantidad(c.cantidad)} por ${formatDinero(c.costo_total)}`,
      ),
    onError: (error) => toast.error(mensajeError(error)),
    onSettled: () => invalidarStock(queryClient),
  })
}

/** FR-062 */
export function useRegistrarConteo() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (d: { ingredienteId: string; cantidad: number }) => {
      const { data, error } = await supabase.rpc('registrar_conteo', {
        p_ingrediente_id: d.ingredienteId,
        p_cantidad_contada: d.cantidad,
      })
      if (error) throw error
      return data
    },
    onSuccess: (diferencia) =>
      toast.success(
        diferencia === 0
          ? 'Conteo registrado: el stock ya coincidía'
          : `Conteo registrado (${diferencia > 0 ? '+' : ''}${formatCantidad(diferencia)})`,
      ),
    onError: (error) => toast.error(mensajeError(error)),
    onSettled: () => invalidarStock(queryClient),
  })
}

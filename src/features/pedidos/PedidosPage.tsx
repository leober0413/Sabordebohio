import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { Link, useSearchParams } from 'react-router'

import { CargandoLista, ErrorCarga } from '@/components/Cargando'
import { PageHeader } from '@/components/PageHeader'
import { Segmented } from '@/components/Segmented'
import { Button } from '@/components/ui/button'
import { PedidoCard } from '@/features/pedidos/PedidoCard'
import { usePedidosDelDia } from '@/features/pedidos/queries'
import { ordenarPorHora, type EstadoPedido } from '@/features/pedidos/tipos'
import { formatDinero } from '@/lib/dinero'
import { formatFechaLarga, formatFechaRelativa, hoySD, sumarDias } from '@/lib/fechas'

type Filtro = 'todos' | EstadoPedido

const FILTROS: ReadonlyArray<{ value: Filtro; label: string }> = [
  { value: 'todos', label: 'Todos' },
  { value: 'pendiente', label: 'Pend.' },
  { value: 'listo', label: 'Listos' },
  { value: 'entregado', label: 'Entreg.' },
  { value: 'cancelado', label: 'Canc.' },
]

/** Pedidos por día con filtro de estado (FR-033). */
export function PedidosPage() {
  const [params, setParams] = useSearchParams()
  const hoy = hoySD()
  const fecha = params.get('fecha') ?? hoy
  const filtro = (params.get('estado') as Filtro | null) ?? 'todos'
  const pedidos = usePedidosDelDia(fecha)

  const ir = (cambios: Record<string, string>) =>
    setParams((p) => {
      const n = new URLSearchParams(p)
      for (const [k, v] of Object.entries(cambios)) n.set(k, v)
      return n
    })

  const lista = ordenarPorHora(
    (pedidos.data ?? []).filter((p) => filtro === 'todos' || p.estado === filtro),
  )
  const vendido = (pedidos.data ?? [])
    .filter((p) => p.estado !== 'cancelado')
    .reduce((a, p) => a + p.total, 0)

  return (
    <section className="flex flex-col gap-4">
      <PageHeader titulo="Pedidos" />

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          aria-label="Día anterior"
          onClick={() => ir({ fecha: sumarDias(fecha, -1) })}
        >
          <ChevronLeft aria-hidden />
        </Button>
        <div className="flex-1 text-center">
          <p className="font-semibold">{formatFechaRelativa(fecha, hoy)}</p>
          {fecha !== hoy && (
            <p className="text-xs text-muted-foreground first-letter:uppercase">
              {formatFechaLarga(fecha)}
            </p>
          )}
        </div>
        <Button
          variant="outline"
          size="icon"
          aria-label="Día siguiente"
          onClick={() => ir({ fecha: sumarDias(fecha, 1) })}
        >
          <ChevronRight aria-hidden />
        </Button>
        <label className="sr-only" htmlFor="ir-a-fecha">
          Ir a fecha
        </label>
        <input
          id="ir-a-fecha"
          type="date"
          value={fecha}
          onChange={(e) => e.target.value && ir({ fecha: e.target.value })}
          className="h-11 w-11 cursor-pointer rounded-md border bg-card text-transparent [&::-webkit-calendar-picker-indicator]:m-auto [&::-webkit-calendar-picker-indicator]:cursor-pointer"
        />
      </div>
      {fecha !== hoy && (
        <Button variant="link" className="self-center" onClick={() => ir({ fecha: hoy })}>
          Volver a hoy
        </Button>
      )}

      <Segmented
        label="Filtrar por estado"
        value={filtro}
        onChange={(v) => ir({ estado: v })}
        options={FILTROS}
      />

      {pedidos.isPending ? (
        <CargandoLista />
      ) : pedidos.isError ? (
        <ErrorCarga que="los pedidos" />
      ) : lista.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-10 text-center">
          <p className="font-medium">
            {filtro === 'todos'
              ? 'No hay pedidos para este día.'
              : 'No hay pedidos con ese estado.'}
          </p>
          <Button asChild>
            <Link to="/pedidos/nuevo">
              <Plus aria-hidden />
              Nuevo pedido
            </Link>
          </Button>
        </div>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {lista.length} {lista.length === 1 ? 'pedido' : 'pedidos'} · vendido del día{' '}
            {formatDinero(vendido)}
          </p>
          <div className="grid gap-3 lg:grid-cols-2">
            {lista.map((p) => (
              <PedidoCard key={p.id} pedido={p} />
            ))}
          </div>
        </>
      )}
    </section>
  )
}

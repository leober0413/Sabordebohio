import { AlertTriangle, ClipboardList, PackageMinus, Plus } from 'lucide-react'
import { Link } from 'react-router'

import { CargandoLista, ErrorCarga } from '@/components/Cargando'
import { Button } from '@/components/ui/button'
import { alertasStock, useStockProductos } from '@/features/inventario/queries'
import { PedidoCard } from '@/features/pedidos/PedidoCard'
import { usePedidosHoy } from '@/features/pedidos/queries'
import { aPreparar, ordenarPorHora } from '@/features/pedidos/tipos'
import { formatFechaLarga, hoySD } from '@/lib/fechas'

export function HoyPage() {
  const hoy = hoySD()
  const pedidos = usePedidosHoy()
  const stock = useStockProductos()

  const todos = ordenarPorHora(pedidos.data ?? [])
  const atrasados = todos.filter((p) => p.atrasado)
  const deHoy = todos.filter((p) => !p.atrasado)
  const preparar = aPreparar(deHoy)
  const alertas = alertasStock(stock.data)

  return (
    <section className="flex flex-col gap-5">
      <div>
        <h1 className="text-3xl font-bold">Hoy</h1>
        <p className="text-muted-foreground first-letter:uppercase">{formatFechaLarga(hoy)}</p>
      </div>

      {/* Lo urgente arriba, con icono y texto además del color (docs/ui-ux.md §1.4). */}
      {(atrasados.length > 0 || alertas.length > 0) && (
        <div className="flex flex-col gap-2">
          {atrasados.length > 0 && (
            <a
              href="#atrasados"
              className="flex min-h-11 items-center gap-2 rounded-lg bg-destructive px-3 py-2 text-sm font-medium text-destructive-foreground"
            >
              <AlertTriangle className="size-5 shrink-0" aria-hidden />
              {atrasados.length === 1
                ? '1 pedido atrasado'
                : `${atrasados.length} pedidos atrasados`}
            </a>
          )}
          {alertas.length > 0 && (
            <Link
              to="/inventario"
              className="flex min-h-11 items-center gap-2 rounded-lg bg-warning px-3 py-2 text-sm font-medium text-warning-foreground"
            >
              <PackageMinus className="size-5 shrink-0" aria-hidden />
              Stock bajo: {alertas.map((a) => `${a.nombre} (${a.stock})`).join(', ')}
            </Link>
          )}
        </div>
      )}

      {preparar.length > 0 && (
        <section aria-labelledby="a-preparar" className="rounded-xl bg-secondary p-4">
          <h2
            id="a-preparar"
            className="mb-2 font-sans text-sm font-semibold text-secondary-foreground"
          >
            A preparar hoy
          </h2>
          <ul className="flex flex-wrap gap-x-5 gap-y-1">
            {preparar.map((p) => (
              <li key={p.nombre} className="text-lg">
                {p.nombre} <span className="font-bold tabular">{p.cantidad}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {pedidos.isPending ? (
        <CargandoLista />
      ) : pedidos.isError ? (
        <ErrorCarga que="los pedidos" />
      ) : (
        <>
          {atrasados.length > 0 && (
            <section
              id="atrasados"
              aria-labelledby="titulo-atrasados"
              className="flex scroll-mt-20 flex-col gap-3"
            >
              <h2 id="titulo-atrasados" className="text-lg font-semibold text-destructive">
                Atrasados
              </h2>
              <div className="grid gap-3 lg:grid-cols-2">
                {atrasados.map((p) => (
                  <PedidoCard key={p.id} pedido={p} />
                ))}
              </div>
            </section>
          )}

          <section aria-labelledby="titulo-hoy" className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 id="titulo-hoy" className="text-lg font-semibold">
                Para entregar hoy
              </h2>
              <Button asChild variant="link" size="sm">
                <Link to="/pedidos">Ver todos</Link>
              </Button>
            </div>
            {deHoy.length === 0 ? (
              // Estado vacío útil (docs/ui-ux.md §1.7).
              <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed bg-card px-6 py-10 text-center">
                <div className="flex size-14 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
                  <ClipboardList className="size-7" aria-hidden />
                </div>
                <h3 className="text-lg font-semibold">Aún no hay pedidos hoy</h3>
                <p className="max-w-xs text-sm text-muted-foreground">
                  Toca + para registrar el primero. Aparecerán aquí ordenados por hora.
                </p>
                <Button asChild>
                  <Link to="/pedidos/nuevo">
                    <Plus aria-hidden />
                    Nuevo pedido
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="grid gap-3 lg:grid-cols-2">
                {deHoy.map((p) => (
                  <PedidoCard key={p.id} pedido={p} />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </section>
  )
}

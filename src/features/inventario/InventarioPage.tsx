import { AlertTriangle, PackageMinus, Plus } from 'lucide-react'
import { Link } from 'react-router'

import { CargandoLista, ErrorCarga } from '@/components/Cargando'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { useStockProductos } from '@/features/inventario/queries'
import { cn } from '@/lib/utils'

/** Stock de catibías hechas (FR-051, FR-053, FR-054). Ingredientes llegan en la Fase 4. */
export function InventarioPage() {
  const stock = useStockProductos()
  const activos = (stock.data ?? []).filter((s) => s.activo)
  // Lo que está en negativo o bajo el mínimo va arriba.
  const ordenados = [...activos].sort(
    (a, b) => Number(b.negativo || b.bajo_minimo) - Number(a.negativo || a.bajo_minimo),
  )

  return (
    <section className="flex flex-col gap-4">
      <PageHeader titulo="Inventario">
        <Button asChild>
          <Link to="/tandas/nueva">
            <Plus aria-hidden />
            Tanda
          </Link>
        </Button>
      </PageHeader>
      <p className="text-sm text-muted-foreground">
        Catibías hechas. Suben con cada tanda y bajan al entregar un pedido.
      </p>
      {stock.isPending ? (
        <CargandoLista />
      ) : stock.isError ? (
        <ErrorCarga que="el inventario" />
      ) : ordenados.length === 0 ? (
        <p className="text-muted-foreground">
          No hay sabores activos. Agrégalos en{' '}
          <Link to="/ajustes" className="text-primary underline">
            Ajustes
          </Link>
          .
        </p>
      ) : (
        <ul
          aria-label="Stock por sabor"
          className="flex flex-col divide-y rounded-xl border bg-card"
        >
          {ordenados.map((s) => (
            <li key={s.id} className="flex items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="font-medium">{s.nombre}</p>
                {s.negativo ? (
                  <p className="inline-flex items-center gap-1 text-xs font-medium text-destructive">
                    <AlertTriangle className="size-3.5" aria-hidden />
                    Negativo: se entregaron más de las registradas
                  </p>
                ) : s.bajo_minimo ? (
                  <p className="inline-flex items-center gap-1 text-xs font-medium text-warning-foreground dark:text-warning">
                    <PackageMinus className="size-3.5" aria-hidden />
                    En o bajo el mínimo ({s.stock_minimo})
                  </p>
                ) : (
                  s.stock_minimo !== null && (
                    <p className="text-xs text-muted-foreground">Mínimo {s.stock_minimo}</p>
                  )
                )}
              </div>
              <span className={cn('text-2xl font-bold tabular', s.negativo && 'text-destructive')}>
                {s.stock}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

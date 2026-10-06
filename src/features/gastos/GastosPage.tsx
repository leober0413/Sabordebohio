import { Plus, Receipt, ShoppingCart } from 'lucide-react'
import { useState } from 'react'

import { CargandoLista, ErrorCarga } from '@/components/Cargando'
import { PageHeader } from '@/components/PageHeader'
import { SelectorPeriodo } from '@/components/SelectorPeriodo'
import { usePeriodo } from '@/components/usePeriodo'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { GastoForm } from '@/features/gastos/GastoForm'
import { useAnularGasto, useCategorias, useGastos } from '@/features/gastos/queries'
import { formatDinero } from '@/lib/dinero'
import { formatFechaCorta } from '@/lib/fechas'
import { cn } from '@/lib/utils'

/** FR-064: todo el dinero que sale, incluidas las compras (BR-009). */
export function GastosPage() {
  const { rango } = usePeriodo('mes')
  const gastos = useGastos(rango.desde, rango.hasta)
  const categorias = useCategorias()
  const anular = useAnularGasto()
  const [nuevo, setNuevo] = useState(false)
  const total = (gastos.data ?? []).filter((g) => !g.anulado_en).reduce((a, g) => a + g.monto, 0)

  return (
    <section className="flex flex-col gap-4">
      <PageHeader titulo="Gastos">
        {!nuevo && (
          <Button onClick={() => setNuevo(true)}>
            <Plus aria-hidden />
            Gasto
          </Button>
        )}
      </PageHeader>

      {nuevo && (
        <Card>
          <CardContent>
            <GastoForm categorias={categorias.data ?? []} onListo={() => setNuevo(false)} />
            <Button variant="ghost" className="mt-2 w-full" onClick={() => setNuevo(false)}>
              Cancelar
            </Button>
          </CardContent>
        </Card>
      )}

      <SelectorPeriodo porDefecto="mes" />

      {gastos.isPending ? (
        <CargandoLista />
      ) : gastos.isError ? (
        <ErrorCarga que="los gastos" />
      ) : (
        <>
          <div className="rounded-xl bg-secondary p-4">
            <p className="text-sm text-secondary-foreground">Gastado en el período</p>
            <p className="text-3xl font-bold tabular">{formatDinero(total)}</p>
          </div>
          {gastos.data.length === 0 ? (
            <p className="text-muted-foreground">
              No hay gastos en este período. Las compras de ingredientes aparecen aquí solas; el
              gas, los empaques y lo demás se registran con "Gasto".
            </p>
          ) : (
            <ul aria-label="Gastos" className="flex flex-col divide-y rounded-xl border bg-card">
              {gastos.data.map((g) => (
                <li
                  key={g.id}
                  className={cn(
                    'flex items-center gap-3 px-4 py-2',
                    g.anulado_en && 'text-muted-foreground',
                  )}
                >
                  {g.compra_id ? (
                    <ShoppingCart className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                  ) : (
                    <Receipt className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className={cn('font-medium', g.anulado_en && 'line-through')}>
                      {g.descripcion || g.categorias_gasto?.nombre}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatFechaCorta(g.fecha)} · {g.categorias_gasto?.nombre}
                      {g.perfiles?.nombre && ` · ${g.perfiles.nombre}`}
                      {g.anulado_en && ' · anulado'}
                    </p>
                  </div>
                  <span className={cn('font-semibold tabular', g.anulado_en && 'line-through')}>
                    {formatDinero(g.monto)}
                  </span>
                  {!g.compra_id && !g.anulado_en && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="min-h-11 text-destructive hover:text-destructive"
                      disabled={anular.isPending}
                      onClick={() => anular.mutate({ id: g.id, anular: true })}
                    >
                      Anular
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  )
}

import { AlertTriangle, ChevronRight, PackageMinus, Plus, ShoppingCart } from 'lucide-react'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'

import { CargandoLista, ErrorCarga } from '@/components/Cargando'
import { PageHeader } from '@/components/PageHeader'
import { Segmented } from '@/components/Segmented'
import { Button } from '@/components/ui/button'
import { IngredienteForm } from '@/features/inventario/IngredienteForm'
import { useStockIngredientes, useStockProductos } from '@/features/inventario/queries'
import { formatCantidad } from '@/lib/dinero'
import { cn } from '@/lib/utils'

type Pestana = 'catibias' | 'ingredientes'

/** Inventario con pestañas Catibías / Ingredientes (docs/ui-ux.md §4). */
export function InventarioPage() {
  const [params, setParams] = useSearchParams()
  const pestana: Pestana = params.get('tab') === 'ingredientes' ? 'ingredientes' : 'catibias'

  return (
    <section className="flex flex-col gap-4">
      <PageHeader titulo="Inventario">
        {pestana === 'catibias' ? (
          <Button asChild>
            <Link to="/tandas/nueva">
              <Plus aria-hidden />
              Tanda
            </Link>
          </Button>
        ) : (
          <Button asChild>
            <Link to="/compras/nueva">
              <ShoppingCart aria-hidden />
              Compra
            </Link>
          </Button>
        )}
      </PageHeader>
      <Segmented
        label="Qué inventario ver"
        value={pestana}
        onChange={(v) => setParams({ tab: v }, { replace: true })}
        options={[
          { value: 'catibias', label: 'Catibías' },
          { value: 'ingredientes', label: 'Ingredientes' },
        ]}
      />
      {pestana === 'catibias' ? <Catibias /> : <Ingredientes />}
    </section>
  )
}

// Lo que está en negativo o en/bajo el mínimo va arriba (docs/ui-ux.md §1.4).
function alertasPrimero<T extends { bajo_minimo: boolean; stock: number }>(lista: T[]) {
  const peso = (x: T) => (x.stock < 0 || x.bajo_minimo ? 1 : 0)
  return [...lista].sort((a, b) => peso(b) - peso(a))
}

function Catibias() {
  const stock = useStockProductos()
  const activos = alertasPrimero((stock.data ?? []).filter((s) => s.activo))

  if (stock.isPending) return <CargandoLista />
  if (stock.isError) return <ErrorCarga que="el inventario" />
  if (activos.length === 0) {
    return (
      <p className="text-muted-foreground">
        No hay sabores activos. Agrégalos en{' '}
        <Link to="/ajustes" className="text-primary underline">
          Ajustes
        </Link>
        .
      </p>
    )
  }
  return (
    <>
      <p className="text-sm text-muted-foreground">
        Catibías hechas. Suben con cada tanda y bajan al entregar un pedido.
      </p>
      <ul aria-label="Stock por sabor" className="flex flex-col divide-y rounded-xl border bg-card">
        {activos.map((s) => (
          <li key={s.id}>
            <Link
              to={`/inventario/sabores/${s.id}`}
              className="flex min-h-16 items-center gap-3 px-4 py-3 hover:bg-accent"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium">{s.nombre}</p>
                <EstadoStock negativo={s.negativo} bajo={s.bajo_minimo} minimo={s.stock_minimo} />
              </div>
              <span className={cn('text-2xl font-bold tabular', s.negativo && 'text-destructive')}>
                {s.stock}
              </span>
              <ChevronRight className="size-5 text-muted-foreground" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </>
  )
}

function Ingredientes() {
  const stock = useStockIngredientes()
  const [creando, setCreando] = useState(false)
  const activos = alertasPrimero((stock.data ?? []).filter((s) => s.activo))
  const inactivos = (stock.data ?? []).filter((s) => !s.activo)

  return (
    <>
      {creando ? (
        <div className="rounded-xl border bg-card p-4">
          <h2 className="mb-3 text-lg font-semibold">Nuevo ingrediente</h2>
          <IngredienteForm onListo={() => setCreando(false)} onCancelar={() => setCreando(false)} />
        </div>
      ) : (
        <Button variant="outline" onClick={() => setCreando(true)}>
          <Plus aria-hidden />
          Nuevo ingrediente
        </Button>
      )}
      {stock.isPending ? (
        <CargandoLista />
      ) : stock.isError ? (
        <ErrorCarga que="los ingredientes" />
      ) : activos.length === 0 && !creando ? (
        <p className="text-muted-foreground">
          Aún no hay ingredientes. Crea los que compras (harina, queso, aceite…) para llevar su
          stock y recibir avisos cuando se estén acabando.
        </p>
      ) : (
        <ul
          aria-label="Stock por ingrediente"
          className="flex flex-col divide-y rounded-xl border bg-card"
        >
          {[...activos, ...inactivos].map((s) => (
            <li key={s.id}>
              <Link
                to={`/inventario/ingredientes/${s.id}`}
                className={cn(
                  'flex min-h-16 items-center gap-3 px-4 py-3 hover:bg-accent',
                  !s.activo && 'opacity-60',
                )}
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{s.nombre}</p>
                  {s.activo ? (
                    <EstadoStock
                      negativo={s.stock < 0}
                      bajo={s.bajo_minimo}
                      minimo={s.stock_minimo}
                      unidad={s.unidad}
                    />
                  ) : (
                    <p className="text-xs text-muted-foreground">Desactivado</p>
                  )}
                </div>
                <span
                  className={cn('text-xl font-bold tabular', s.stock < 0 && 'text-destructive')}
                >
                  {formatCantidad(s.stock)}{' '}
                  <span className="text-sm font-normal text-muted-foreground">{s.unidad}</span>
                </span>
                <ChevronRight className="size-5 text-muted-foreground" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}

export function EstadoStock({
  negativo,
  bajo,
  minimo,
  unidad,
}: {
  negativo: boolean
  bajo: boolean
  minimo: number | null
  unidad?: string
}) {
  const min = minimo === null ? null : `${formatCantidad(minimo)}${unidad ? ` ${unidad}` : ''}`
  if (negativo) {
    return (
      <p className="inline-flex items-center gap-1 text-xs font-medium text-destructive">
        <AlertTriangle className="size-3.5" aria-hidden />
        Negativo: se usó más de lo registrado
      </p>
    )
  }
  if (bajo) {
    return (
      <p className="inline-flex items-center gap-1 text-xs font-medium text-warning-foreground dark:text-warning">
        <PackageMinus className="size-3.5" aria-hidden />
        En o bajo el mínimo ({min})
      </p>
    )
  }
  return min ? <p className="text-xs text-muted-foreground">Mínimo {min}</p> : null
}

import { Banknote, ClipboardList, Package, Tags, type LucideIcon } from 'lucide-react'
import { Link, useSearchParams } from 'react-router'

import { CargandoLista, ErrorCarga } from '@/components/Cargando'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { describir, type Area, type Descripcion } from '@/features/actividad/describir'
import { useActividad, type FilaActividad } from '@/features/actividad/queries'
import { formatFechaRelativa, formatHoraDeInstante, hoySD } from '@/lib/fechas'
import { cn } from '@/lib/utils'

const FILTROS: ReadonlyArray<{ value: Area | 'todo'; label: string }> = [
  { value: 'todo', label: 'Todo' },
  { value: 'pedidos', label: 'Pedidos' },
  { value: 'dinero', label: 'Dinero' },
  { value: 'inventario', label: 'Inventario' },
  { value: 'catalogo', label: 'Catálogo' },
]

const ICONOS: Record<Area, LucideIcon> = {
  pedidos: ClipboardList,
  dinero: Banknote,
  inventario: Package,
  catalogo: Tags,
}

interface Item {
  fila: FilaActividad
  d: Descripcion
}

/** Agrupa por día de Santo Domingo, en el orden en que llegan (más reciente primero). */
function porDia(items: Item[]) {
  const dias: Array<{ dia: string; items: Item[] }> = []
  for (const item of items) {
    const dia = hoySD(new Date(item.fila.creado_en))
    const ultimo = dias.at(-1)
    if (ultimo?.dia === dia) ultimo.items.push(item)
    else dias.push({ dia, items: [item] })
  }
  return dias
}

/** FR-083: quién hizo qué y cuándo; en las ediciones, antes → después. */
export function ActividadPage() {
  const [params, setParams] = useSearchParams()
  const ver = (FILTROS.find((f) => f.value === params.get('ver'))?.value ?? 'todo') as Area | 'todo'
  const actividad = useActividad(ver)

  const items = (actividad.data?.pages.flat() ?? [])
    .map((fila) => ({ fila, d: describir(fila) }))
    .filter((i): i is Item => i.d !== null)

  return (
    <section className="flex flex-col gap-4">
      <PageHeader titulo="Actividad" />
      <p className="text-muted-foreground">
        Quién registró, editó o anuló algo y cuándo. En las ediciones se ve lo que cambió.
      </p>

      <div role="radiogroup" aria-label="Qué ver" className="flex flex-wrap gap-2">
        {FILTROS.map((f) => {
          const activo = f.value === ver
          return (
            <button
              key={f.value}
              type="button"
              role="radio"
              aria-checked={activo}
              onClick={() =>
                setParams(f.value === 'todo' ? {} : { ver: f.value }, { replace: true })
              }
              className={cn(
                'min-h-11 rounded-full border px-4 text-sm font-medium transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
                activo
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'bg-card text-muted-foreground hover:text-foreground',
              )}
            >
              {f.label}
            </button>
          )
        })}
      </div>

      {actividad.isPending ? (
        <CargandoLista filas={5} />
      ) : actividad.isError ? (
        <ErrorCarga que="la actividad" />
      ) : items.length === 0 ? (
        <p className="text-muted-foreground">
          {ver === 'todo'
            ? 'Todavía no hay actividad. Aquí aparecerá cada pedido, pago, gasto o cambio de inventario que registren, con quién lo hizo.'
            : 'No hay actividad de este tipo todavía. Elige "Todo" para ver lo demás.'}
        </p>
      ) : (
        <>
          {porDia(items).map(({ dia, items: delDia }) => (
            <div key={dia} className="flex flex-col gap-2">
              <h2 className="text-sm font-semibold text-muted-foreground">
                {formatFechaRelativa(dia)}
              </h2>
              <ol className="flex flex-col divide-y rounded-xl border bg-card">
                {delDia.map(({ fila, d }) => (
                  <li key={fila.id}>
                    <Entrada fila={fila} d={d} />
                  </li>
                ))}
              </ol>
            </div>
          ))}
          {actividad.hasNextPage && (
            <Button
              variant="outline"
              className="min-h-11 self-center"
              disabled={actividad.isFetchingNextPage}
              onClick={() => actividad.fetchNextPage()}
            >
              {actividad.isFetchingNextPage ? 'Cargando…' : 'Ver más'}
            </Button>
          )}
        </>
      )}
    </section>
  )
}

function Entrada({ fila, d }: Item) {
  const Icono = ICONOS[d.area]
  const contenido = (
    <>
      <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
        <Icono className="size-4" aria-hidden />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="font-medium">{d.titulo}</span>
        {d.detalle && (
          <span className="text-sm break-words text-muted-foreground">{d.detalle}</span>
        )}
        {d.cambios.length > 0 && (
          <span className="mt-1 flex flex-col gap-0.5 text-sm">
            {d.cambios.map((c) => (
              <span key={c.campo} className="break-words">
                <span className="text-muted-foreground">{c.campo}:</span>{' '}
                <span className="text-muted-foreground line-through">{c.antes}</span>{' '}
                <span className="sr-only">cambió a</span>
                <span aria-hidden>→</span> <span className="font-medium">{c.despues}</span>
              </span>
            ))}
          </span>
        )}
        <span className="text-xs text-muted-foreground">
          {fila.perfiles?.nombre ?? 'Sistema'} · {formatHoraDeInstante(fila.creado_en)}
        </span>
      </span>
    </>
  )

  const clase = 'flex gap-3 px-4 py-3'
  return d.enlace ? (
    <Link to={d.enlace} className={cn(clase, 'hover:bg-accent')}>
      {contenido}
    </Link>
  ) : (
    <div className={clase}>{contenido}</div>
  )
}

import { ChevronRight, HandCoins } from 'lucide-react'
import { Link } from 'react-router'

import { CargandoLista, ErrorCarga } from '@/components/Cargando'
import { PageHeader } from '@/components/PageHeader'
import { useFiado } from '@/features/pagos/queries'
import { formatDinero } from '@/lib/dinero'
import { haceDias } from '@/lib/fechas'

/** FR-042: quién nos debe, el más viejo primero. */
export function FiadoPage() {
  const fiado = useFiado()
  const total = (fiado.data ?? []).reduce((a, c) => a + c.saldo_fiado, 0)

  return (
    <section className="flex flex-col gap-4">
      <PageHeader titulo="Fiado" />
      {fiado.isPending ? (
        <CargandoLista />
      ) : fiado.isError ? (
        <ErrorCarga que="el fiado" />
      ) : fiado.data.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed bg-card px-6 py-10 text-center">
          <HandCoins className="size-10 text-muted-foreground" aria-hidden />
          <p className="font-medium">Nadie debe nada.</p>
          <p className="max-w-xs text-sm text-muted-foreground">
            Aquí aparecen los clientes con pedidos entregados sin pagar completo.
          </p>
        </div>
      ) : (
        <>
          <div className="rounded-xl bg-secondary p-4">
            <p className="text-sm text-secondary-foreground">Nos deben en total</p>
            <p className="text-3xl font-bold tabular">{formatDinero(total)}</p>
            <p className="text-sm text-muted-foreground">
              {fiado.data.length} {fiado.data.length === 1 ? 'cliente' : 'clientes'}
            </p>
          </div>
          <ul
            aria-label="Clientes con fiado"
            className="flex flex-col divide-y rounded-xl border bg-card"
          >
            {fiado.data.map((c) => (
              <li key={c.id}>
                <Link
                  to={`/clientes/${c.id}`}
                  className="flex min-h-16 items-center gap-3 px-4 py-3 hover:bg-accent"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{c.nombre}</p>
                    <p className="text-sm text-muted-foreground">
                      {c.pedidos_fiados} {c.pedidos_fiados === 1 ? 'pedido' : 'pedidos'}
                      {c.fiado_desde && ` · desde ${haceDias(c.fiado_desde)}`}
                    </p>
                  </div>
                  <span className="text-lg font-bold text-destructive tabular">
                    {formatDinero(c.saldo_fiado)}
                  </span>
                  <ChevronRight className="size-5 text-muted-foreground" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}

import { Link } from 'react-router'

import { CargandoLista, ErrorCarga } from '@/components/Cargando'
import { PageHeader } from '@/components/PageHeader'
import { SelectorPeriodo } from '@/components/SelectorPeriodo'
import { usePeriodo } from '@/components/usePeriodo'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useResumen, type Resumen } from '@/features/finanzas/queries'
import { formatDinero } from '@/lib/dinero'
import { cn } from '@/lib/utils'

/** FR-070 a FR-072, BR-010. Los números los calcula el servidor. */
export function FinanzasPage() {
  const { rango } = usePeriodo('semana')
  const resumen = useResumen(rango.desde, rango.hasta)

  return (
    <section className="flex flex-col gap-4">
      <PageHeader titulo="Finanzas" />
      <SelectorPeriodo porDefecto="semana" />
      {resumen.isPending ? (
        <CargandoLista filas={4} />
      ) : resumen.isError ? (
        <ErrorCarga que="el resumen" />
      ) : (
        <Detalle r={resumen.data} />
      )}
    </section>
  )
}

function Detalle({ r }: { r: Resumen }) {
  return (
    <>
      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Tarjeta
          titulo="Vendido"
          valor={r.vendido}
          nota={`${r.pedidos_entregados} ${r.pedidos_entregados === 1 ? 'pedido entregado' : 'pedidos entregados'}`}
        />
        <Tarjeta titulo="Cobrado" valor={r.cobrado} nota="Pagos recibidos" />
        <Tarjeta
          titulo="Por cobrar"
          valor={r.por_cobrar}
          nota="Fiado hoy"
          destacar={r.por_cobrar > 0 ? 'mal' : undefined}
        />
        <Tarjeta titulo="Gastos" valor={r.gastos} nota="Incluye compras" />
        <Tarjeta
          titulo="Ganancia aprox."
          valor={r.ganancia_aprox}
          nota="Vendido − gastos"
          destacar={r.ganancia_aprox >= 0 ? 'bien' : 'mal'}
          className="col-span-2 lg:col-span-1"
        />
      </dl>
      <p className="text-xs text-muted-foreground">
        La ganancia es aproximada: resta todos los gastos del período, no lo que se usó de verdad en
        las catibías vendidas.
      </p>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Cobrado por método</CardTitle>
          </CardHeader>
          <CardContent>
            <Filas
              etiqueta="Cobrado por método"
              filas={[
                { nombre: 'Efectivo', valor: formatDinero(r.cobrado_efectivo) },
                { nombre: 'Transferencia', valor: formatDinero(r.cobrado_transferencia) },
              ]}
            />
            <p className="mt-2 text-xs text-muted-foreground">
              El efectivo es lo que debería haber en caja.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Catibías vendidas</CardTitle>
          </CardHeader>
          <CardContent>
            {r.unidades_por_sabor.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No se entregaron pedidos en este período.
              </p>
            ) : (
              <Filas
                etiqueta="Catibías vendidas por sabor"
                filas={[
                  ...r.unidades_por_sabor.map((u) => ({
                    nombre: u.nombre,
                    valor: String(u.cantidad),
                  })),
                  {
                    nombre: 'Total',
                    valor: String(r.unidades_por_sabor.reduce((a, u) => a + u.cantidad, 0)),
                    total: true,
                  },
                ]}
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Gastos por categoría</CardTitle>
            <Link to="/gastos" className="text-sm text-primary underline-offset-4 hover:underline">
              Ver gastos
            </Link>
          </CardHeader>
          <CardContent>
            {r.gastos_por_categoria.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin gastos en este período.</p>
            ) : (
              <Filas
                etiqueta="Gastos por categoría"
                filas={r.gastos_por_categoria.map((g) => ({
                  nombre: g.categoria,
                  valor: formatDinero(g.monto),
                }))}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </>
  )
}

function Tarjeta({
  titulo,
  valor,
  nota,
  destacar,
  className,
}: {
  titulo: string
  valor: number
  nota: string
  destacar?: 'bien' | 'mal'
  className?: string
}) {
  return (
    <div className={cn('rounded-xl border bg-card p-4', className)}>
      <dt className="text-sm text-muted-foreground">{titulo}</dt>
      <dd
        className={cn(
          'text-2xl font-bold tabular',
          destacar === 'bien' && 'text-success',
          destacar === 'mal' && 'text-destructive',
        )}
      >
        {formatDinero(valor)}
      </dd>
      <dd className="text-xs text-muted-foreground">{nota}</dd>
    </div>
  )
}

function Filas({
  etiqueta,
  filas,
}: {
  etiqueta: string
  filas: Array<{ nombre: string; valor: string; total?: boolean }>
}) {
  return (
    <ul aria-label={etiqueta} className="flex flex-col divide-y">
      {filas.map((f) => (
        <li
          key={f.nombre}
          className={cn('flex justify-between py-1.5', f.total && 'font-semibold')}
        >
          <span>{f.nombre}</span>
          <span className="tabular">{f.valor}</span>
        </li>
      ))}
    </ul>
  )
}

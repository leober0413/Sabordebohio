import { Phone } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useParams } from 'react-router'

import { CargandoLista, ErrorCarga } from '@/components/Cargando'
import { FieldError } from '@/components/FieldError'
import { PageHeader } from '@/components/PageHeader'
import { Segmented } from '@/components/Segmented'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useCliente } from '@/features/clientes/queries'
import {
  useAbonosCliente,
  useAnularAbono,
  useRegistrarAbono,
  useSaldoCliente,
} from '@/features/pagos/queries'
import { PedidoCard } from '@/features/pedidos/PedidoCard'
import { usePedidosCliente } from '@/features/pedidos/queries'
import { ETIQUETA_METODO, type MetodoPago, type Pedido } from '@/features/pedidos/tipos'
import { formatDinero } from '@/lib/dinero'
import { formatFechaCorta, formatFechaRelativa } from '@/lib/fechas'
import { cn } from '@/lib/utils'

/** Ficha del cliente: saldo, abonos e historial (FR-012, FR-043). */
export function ClientePage() {
  const { id = '' } = useParams()
  const cliente = useCliente(id)
  const saldo = useSaldoCliente(id)
  const pedidos = usePedidosCliente(id)

  return (
    <section className="mx-auto flex max-w-3xl flex-col gap-4">
      <PageHeader titulo={cliente.data?.nombre ?? 'Cliente'} atras />
      {cliente.isPending ? (
        <CargandoLista filas={2} />
      ) : cliente.isError || !cliente.data ? (
        <ErrorCarga que="el cliente" />
      ) : (
        <>
          {cliente.data.telefono && (
            <a
              href={`tel:${cliente.data.telefono}`}
              className="inline-flex min-h-11 items-center gap-2 self-start text-primary underline-offset-4 hover:underline"
            >
              <Phone className="size-4" aria-hidden />
              {cliente.data.telefono}
            </a>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-secondary p-4">
              <p className="text-sm text-secondary-foreground">Fiado (entregados)</p>
              <p
                className={cn(
                  'text-2xl font-bold tabular',
                  (saldo.data?.saldo_fiado ?? 0) > 0 && 'text-destructive',
                )}
              >
                {formatDinero(saldo.data?.saldo_fiado ?? 0)}
              </p>
            </div>
            <div className="rounded-xl bg-muted p-4">
              <p className="text-sm text-muted-foreground">Total por cobrar</p>
              <p className="text-2xl font-bold tabular">
                {formatDinero(saldo.data?.saldo_total ?? 0)}
              </p>
            </div>
          </div>

          {(saldo.data?.saldo_total ?? 0) > 0 && pedidos.data && (
            <AbonoForm
              clienteId={id}
              debe={saldo.data!.saldo_total}
              pedidos={pedidos.data.filter((p) => p.estado !== 'cancelado' && p.saldo > 0)}
            />
          )}

          <Abonos clienteId={id} />

          <section aria-labelledby="titulo-historial" className="flex flex-col gap-3">
            <h2 id="titulo-historial" className="text-lg font-semibold">
              Pedidos
            </h2>
            {pedidos.isPending ? (
              <CargandoLista />
            ) : pedidos.isError ? (
              <ErrorCarga que="los pedidos" />
            ) : pedidos.data.length === 0 ? (
              <p className="text-muted-foreground">Este cliente aún no tiene pedidos.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {pedidos.data.map((p) => (
                  <PedidoCard key={p.id} pedido={p} mostrarFecha />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </section>
  )
}

function AbonoForm({
  clienteId,
  debe,
  pedidos,
}: {
  clienteId: string
  debe: number
  pedidos: Pedido[]
}) {
  const registrar = useRegistrarAbono()
  const [monto, setMonto] = useState('')
  const [metodo, setMetodo] = useState<MetodoPago>('efectivo')
  const [pedidoId, setPedidoId] = useState('')
  const [error, setError] = useState<string>()

  // Del más viejo al más nuevo, como se aplica el abono (DEC-003).
  const ordenados = [...pedidos].sort((a, b) =>
    a.fecha_entrega === b.fecha_entrega
      ? a.creado_en < b.creado_en
        ? -1
        : 1
      : a.fecha_entrega < b.fecha_entrega
        ? -1
        : 1,
  )
  const tope = pedidoId ? (pedidos.find((p) => p.id === pedidoId)?.saldo ?? debe) : debe

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!/^\d+(\.\d{1,2})?$/.test(monto.trim()) || Number(monto) <= 0) {
      return setError('Escribe el monto en pesos, por ejemplo 250.')
    }
    if (Number(monto) > tope) return setError(`No puede ser más de ${formatDinero(tope)}.`)
    setError(undefined)
    registrar.mutate(
      { clienteId, monto: Number(monto), metodo, pedidoId: pedidoId || null },
      { onSuccess: () => setMonto('') },
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Registrar abono</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="abono-monto">Monto (RD$)</Label>
            <div className="flex gap-2">
              <Input
                id="abono-monto"
                inputMode="decimal"
                className="tabular"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                aria-invalid={!!error}
                aria-describedby={error ? 'abono-error' : undefined}
              />
              <Button type="button" variant="outline" onClick={() => setMonto(String(tope))}>
                Todo ({formatDinero(tope)})
              </Button>
            </div>
            <FieldError id="abono-error" message={error} />
          </div>
          <Segmented
            label="Método de pago del abono"
            value={metodo}
            onChange={setMetodo}
            options={[
              { value: 'efectivo', label: 'Efectivo' },
              { value: 'transferencia', label: 'Transferencia' },
            ]}
          />
          <div className="flex flex-col gap-2">
            <Label htmlFor="abono-pedido">Aplicar a</Label>
            <select
              id="abono-pedido"
              value={pedidoId}
              onChange={(e) => setPedidoId(e.target.value)}
              className="h-11 rounded-md border border-input bg-card px-3 text-base"
            >
              <option value="">Automático: el más viejo primero</option>
              {ordenados.map((p) => (
                <option key={p.id} value={p.id}>
                  {formatFechaCorta(p.fecha_entrega)} · debe {formatDinero(p.saldo)}
                </option>
              ))}
            </select>
          </div>
          <Button type="submit" size="lg" disabled={registrar.isPending}>
            Registrar abono
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

function Abonos({ clienteId }: { clienteId: string }) {
  const abonos = useAbonosCliente(clienteId)
  const anular = useAnularAbono()
  if (!abonos.data || abonos.data.length === 0) return null
  return (
    <section aria-labelledby="titulo-abonos" className="flex flex-col gap-2">
      <h2 id="titulo-abonos" className="text-lg font-semibold">
        Abonos
      </h2>
      <ul className="flex flex-col divide-y rounded-xl border bg-card">
        {abonos.data.map((a) => (
          <li
            key={a.id}
            className={cn(
              'flex items-center gap-3 px-4 py-2',
              a.anulado_en && 'text-muted-foreground',
            )}
          >
            <div className="min-w-0 flex-1">
              <p className={cn('font-medium tabular', a.anulado_en && 'line-through')}>
                {formatDinero(a.monto)}
              </p>
              <p className="text-xs text-muted-foreground">
                {ETIQUETA_METODO[a.metodo]} · {formatFechaRelativa(a.fecha)}
                {a.anulado_en && ' · anulado'}
              </p>
            </div>
            {!a.anulado_en && (
              <Button
                variant="ghost"
                size="sm"
                className="min-h-11 text-destructive hover:text-destructive"
                disabled={anular.isPending}
                onClick={() => anular.mutate(a.id)}
              >
                Anular
              </Button>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}

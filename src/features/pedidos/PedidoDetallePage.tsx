import { Bike, CalendarDays, Pencil, Phone, Store, StickyNote } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router'

import { CargandoLista, ErrorCarga } from '@/components/Cargando'
import { PageHeader } from '@/components/PageHeader'
import { Segmented } from '@/components/Segmented'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { PagosPedido } from '@/features/pagos/PagosPedido'
import { EstadoBadge } from '@/features/pedidos/EstadoBadge'
import { useCambiarEstado, usePedido } from '@/features/pedidos/queries'
import type { EstadoPedido, MetodoPago, Pedido } from '@/features/pedidos/tipos'
import { formatDinero } from '@/lib/dinero'
import { formatFechaRelativa, formatHora } from '@/lib/fechas'

export function PedidoDetallePage() {
  const { id = '' } = useParams()
  const pedido = usePedido(id)

  return (
    <section className="mx-auto flex max-w-3xl flex-col gap-4 lg:max-w-6xl">
      <PageHeader titulo="Pedido" atras>
        {pedido.data && (pedido.data.estado === 'pendiente' || pedido.data.estado === 'listo') && (
          <Button asChild variant="outline">
            <Link to={`/pedidos/${id}/editar`}>
              <Pencil aria-hidden />
              Editar
            </Link>
          </Button>
        )}
      </PageHeader>
      {pedido.isPending ? (
        <CargandoLista filas={2} />
      ) : pedido.isError ? (
        <ErrorCarga que="el pedido" />
      ) : !pedido.data ? (
        <p className="text-muted-foreground">Este pedido no existe.</p>
      ) : (
        <Detalle pedido={pedido.data} />
      )}
    </section>
  )
}

// En PC: el pedido y sus acciones a la izquierda, los pagos a la derecha
// (docs/ui-ux.md §4). En el celular, uno debajo del otro en el mismo orden.
function Detalle({ pedido }: { pedido: Pedido }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
      <div className="flex min-w-0 flex-col gap-4">
        <Card>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <Link
                  to={`/clientes/${pedido.cliente_id}`}
                  className="block text-xl font-semibold underline-offset-4 hover:underline"
                >
                  {pedido.cliente_nombre}
                </Link>
                {pedido.cliente_telefono && (
                  <a
                    href={`tel:${pedido.cliente_telefono}`}
                    className="inline-flex min-h-11 items-center gap-1 text-sm text-primary underline-offset-4 hover:underline"
                  >
                    <Phone className="size-4" aria-hidden />
                    {pedido.cliente_telefono}
                  </a>
                )}
              </div>
              <EstadoBadge estado={pedido.estado} atrasado={pedido.atrasado} />
            </div>

            <ul className="flex flex-col divide-y rounded-lg border">
              {pedido.lineas.map((l) => (
                <li key={l.producto_id} className="flex justify-between px-3 py-2">
                  <span>{l.nombre}</span>
                  <span className="font-semibold tabular">{l.cantidad}</span>
                </li>
              ))}
            </ul>

            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
              <dt className="text-muted-foreground">
                {pedido.tarifa === 'docena' ? 'Precio de docena' : 'Precio suelta'} ·{' '}
                {pedido.unidades} uds.
              </dt>
              <dd className="text-right tabular">{formatDinero(pedido.subtotal)}</dd>
              {pedido.costo_envio > 0 && (
                <>
                  <dt className="text-muted-foreground">Envío</dt>
                  <dd className="text-right tabular">{formatDinero(pedido.costo_envio)}</dd>
                </>
              )}
              <dt className="font-semibold">Total</dt>
              <dd className="text-right text-lg font-bold tabular">{formatDinero(pedido.total)}</dd>
            </dl>

            <ul className="flex flex-col gap-2 text-sm">
              <li className="flex items-center gap-2">
                <CalendarDays className="size-4 text-muted-foreground" aria-hidden />
                {formatFechaRelativa(pedido.fecha_entrega)}
                {pedido.hora_entrega ? ` · ${formatHora(pedido.hora_entrega)}` : ' · sin hora'}
              </li>
              <li className="flex items-center gap-2">
                {pedido.tipo_entrega === 'delivery' ? (
                  <Bike className="size-4 text-muted-foreground" aria-hidden />
                ) : (
                  <Store className="size-4 text-muted-foreground" aria-hidden />
                )}
                {pedido.tipo_entrega === 'delivery' ? 'Delivery' : 'Recoge'}
              </li>
              {pedido.notas && (
                <li className="flex items-start gap-2">
                  <StickyNote className="mt-0.5 size-4 text-muted-foreground" aria-hidden />
                  {pedido.notas}
                </li>
              )}
            </ul>
          </CardContent>
        </Card>
        <Acciones pedido={pedido} />
      </div>
      <div className="min-w-0 lg:sticky lg:top-8">
        <PagosPedido pedido={pedido} />
      </div>
    </div>
  )
}

/** Acciones según el estado (FR-022, FR-025, FR-026) y cobro al entregar (FR-041). */
function Acciones({ pedido }: { pedido: Pedido }) {
  const cambiar = useCambiarEstado()
  // Por defecto se cobra en efectivo al entregar (docs/ui-ux.md §1.1).
  const [cobro, setCobro] = useState<'no' | MetodoPago>('efectivo')
  const debe = pedido.saldo > 0
  const pago = debe && cobro !== 'no' ? { metodo: cobro, monto: null } : null
  const ir = (estado: EstadoPedido, hechoAlMomento = false) =>
    cambiar.mutate({ pedido, estado, hechoAlMomento, pago: estado === 'entregado' ? pago : null })
  const ocupado = cambiar.isPending

  return (
    <div className="flex flex-col gap-2">
      {(pedido.estado === 'pendiente' || pedido.estado === 'listo') && (
        <>
          {debe && (
            <div className="flex flex-col gap-1">
              <p className="text-sm text-muted-foreground">
                Al entregar, cobrar {formatDinero(pedido.saldo)}:
              </p>
              <Segmented
                label="Cobrar al entregar"
                value={cobro}
                onChange={setCobro}
                options={[
                  { value: 'efectivo', label: 'Efectivo' },
                  { value: 'transferencia', label: 'Transferencia' },
                  { value: 'no', label: 'Fiado' },
                ]}
              />
            </div>
          )}
          <Button size="lg" disabled={ocupado} onClick={() => ir('entregado')}>
            {pago ? `Entregar y cobrar ${formatDinero(pedido.saldo)}` : 'Entregar'}
          </Button>
          <Button variant="outline" disabled={ocupado} onClick={() => ir('entregado', true)}>
            Entregar · hecho al momento
          </Button>
          <p className="text-xs text-muted-foreground">
            "Hecho al momento" registra la producción y la entrega juntas: el stock no cambia.
          </p>
        </>
      )}
      {pedido.estado === 'pendiente' && (
        <Button variant="secondary" disabled={ocupado} onClick={() => ir('listo')}>
          Marcar listo
        </Button>
      )}
      {pedido.estado === 'listo' && (
        <Button variant="secondary" disabled={ocupado} onClick={() => ir('pendiente')}>
          Volver a pendiente
        </Button>
      )}
      {pedido.estado === 'entregado' && (
        <Button variant="secondary" disabled={ocupado} onClick={() => ir('listo')}>
          Revertir entrega
        </Button>
      )}
      {pedido.estado === 'cancelado' ? (
        <Button variant="secondary" disabled={ocupado} onClick={() => ir('pendiente')}>
          Reactivar pedido
        </Button>
      ) : (
        <Button
          variant="ghost"
          className="text-destructive hover:text-destructive"
          disabled={ocupado}
          onClick={() => ir('cancelado')}
        >
          Cancelar pedido
        </Button>
      )}
    </div>
  )
}

import { Bike, Clock, Store } from 'lucide-react'
import { Link } from 'react-router'

import { Button } from '@/components/ui/button'
import { PagoBadge } from '@/features/pagos/PagoBadge'
import { EstadoBadge } from '@/features/pedidos/EstadoBadge'
import { useCambiarEstado } from '@/features/pedidos/queries'
import { resumenLineas, SIGUIENTE_ACCION, type Pedido } from '@/features/pedidos/tipos'
import { formatDinero } from '@/lib/dinero'
import { formatFechaRelativa, formatHora } from '@/lib/fechas'
import { cn } from '@/lib/utils'

export function PedidoCard({
  pedido,
  mostrarFecha = false,
}: {
  pedido: Pedido
  mostrarFecha?: boolean
}) {
  const cambiar = useCambiarEstado()
  const accion = SIGUIENTE_ACCION[pedido.estado]

  return (
    <article
      className={cn(
        'relative flex items-center gap-3 rounded-xl border bg-card p-3 shadow-xs',
        pedido.atrasado && 'border-destructive/60',
        pedido.estado === 'cancelado' && 'opacity-70',
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <h3 className="font-sans text-base font-semibold">
            {/* Toda la tarjeta abre el detalle; el botón de acción queda encima. */}
            <Link
              to={`/pedidos/${pedido.id}`}
              className="after:absolute after:inset-0 after:rounded-xl"
            >
              {pedido.cliente_nombre}
            </Link>
          </h3>
          <EstadoBadge estado={pedido.estado} atrasado={pedido.atrasado} />
        </div>
        <p className="mt-0.5 truncate text-sm">{resumenLineas(pedido.lineas)}</p>
        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Clock className="size-3.5" aria-hidden />
            {mostrarFecha || pedido.atrasado
              ? `${formatFechaRelativa(pedido.fecha_entrega)} · `
              : ''}
            {pedido.hora_entrega ? formatHora(pedido.hora_entrega) : 'Sin hora'}
          </span>
          <span className="inline-flex items-center gap-1">
            {pedido.tipo_entrega === 'delivery' ? (
              <Bike className="size-3.5" aria-hidden />
            ) : (
              <Store className="size-3.5" aria-hidden />
            )}
            {pedido.tipo_entrega === 'delivery' ? 'Delivery' : 'Recoge'}
          </span>
          <span className="font-medium text-foreground tabular">{formatDinero(pedido.total)}</span>
          {pedido.estado !== 'cancelado' && (
            <span className="inline-flex items-center gap-1">
              <PagoBadge estado={pedido.estado_pago} />
              {pedido.estado_pago === 'parcial' && (
                <span className="tabular">debe {formatDinero(pedido.saldo)}</span>
              )}
            </span>
          )}
        </p>
      </div>
      {accion && (
        <Button
          className="relative z-10 min-w-24"
          variant={accion.estado === 'entregado' ? 'default' : 'secondary'}
          onClick={() => cambiar.mutate({ pedido, estado: accion.estado })}
          aria-label={`${accion.etiqueta}: pedido de ${pedido.cliente_nombre}`}
        >
          {accion.etiqueta}
        </Button>
      )}
    </article>
  )
}

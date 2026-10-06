import { Link } from 'react-router'

import { Button } from '@/components/ui/button'
import { PagoBadge } from '@/features/pagos/PagoBadge'
import { EstadoBadge } from '@/features/pedidos/EstadoBadge'
import { useCambiarEstado } from '@/features/pedidos/queries'
import { resumenLineas, SIGUIENTE_ACCION, type Pedido } from '@/features/pedidos/tipos'
import { formatDinero } from '@/lib/dinero'
import { formatHora } from '@/lib/fechas'
import { cn } from '@/lib/utils'

/** Vista de PC (NFR-U-005): los pedidos del día en tabla. */
export function PedidosTabla({ pedidos }: { pedidos: Pedido[] }) {
  const cambiar = useCambiarEstado()
  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <table className="w-full text-sm">
        <caption className="sr-only">Pedidos del día</caption>
        <thead className="bg-muted text-left text-xs text-muted-foreground">
          <tr>
            <th scope="col" className="px-4 py-2 font-medium">
              Hora
            </th>
            <th scope="col" className="px-4 py-2 font-medium">
              Cliente
            </th>
            <th scope="col" className="px-4 py-2 font-medium">
              Catibías
            </th>
            <th scope="col" className="px-4 py-2 font-medium">
              Entrega
            </th>
            <th scope="col" className="px-4 py-2 text-right font-medium">
              Total
            </th>
            <th scope="col" className="px-4 py-2 font-medium">
              Pago
            </th>
            <th scope="col" className="px-4 py-2 font-medium">
              Estado
            </th>
            <th scope="col" className="px-4 py-2">
              <span className="sr-only">Acción</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {pedidos.map((p) => {
            const accion = SIGUIENTE_ACCION[p.estado]
            return (
              <tr
                key={p.id}
                className={cn('hover:bg-accent/50', p.estado === 'cancelado' && 'opacity-70')}
              >
                <td className="px-4 py-2 whitespace-nowrap tabular">
                  {p.hora_entrega ? formatHora(p.hora_entrega) : '—'}
                </td>
                <td className="px-4 py-2 font-medium">
                  <Link to={`/pedidos/${p.id}`} className="underline-offset-4 hover:underline">
                    {p.cliente_nombre}
                  </Link>
                </td>
                <td className="px-4 py-2">{resumenLineas(p.lineas)}</td>
                <td className="px-4 py-2">
                  {p.tipo_entrega === 'delivery' ? 'Delivery' : 'Recoge'}
                </td>
                <td className="px-4 py-2 text-right font-medium tabular">
                  {formatDinero(p.total)}
                </td>
                <td className="px-4 py-2">
                  {p.estado !== 'cancelado' && (
                    <span className="inline-flex flex-col">
                      <PagoBadge estado={p.estado_pago} />
                      {p.estado_pago === 'parcial' && (
                        <span className="text-xs text-muted-foreground tabular">
                          debe {formatDinero(p.saldo)}
                        </span>
                      )}
                    </span>
                  )}
                </td>
                <td className="px-4 py-2">
                  <EstadoBadge estado={p.estado} atrasado={p.atrasado} />
                </td>
                <td className="px-4 py-2 text-right">
                  {accion && (
                    <Button
                      size="sm"
                      className="min-h-9"
                      variant={accion.estado === 'entregado' ? 'default' : 'secondary'}
                      onClick={() => cambiar.mutate({ pedido: p, estado: accion.estado })}
                      aria-label={`${accion.etiqueta}: pedido de ${p.cliente_nombre}`}
                    >
                      {accion.etiqueta}
                    </Button>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

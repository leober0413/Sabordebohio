import { Banknote, Landmark } from 'lucide-react'
import { useState, type FormEvent } from 'react'

import { FieldError } from '@/components/FieldError'
import { Segmented } from '@/components/Segmented'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PagoBadge } from '@/features/pagos/PagoBadge'
import { useAnularPago, usePagosPedido, useRegistrarPago } from '@/features/pagos/queries'
import { ETIQUETA_METODO, type MetodoPago, type Pedido } from '@/features/pedidos/tipos'
import { formatDinero } from '@/lib/dinero'
import { formatFechaRelativa } from '@/lib/fechas'
import { cn } from '@/lib/utils'

const ICONO_METODO = { efectivo: Banknote, transferencia: Landmark } as const

/** Pagos de un pedido: cobrar el saldo de un toque, otro monto y anular (FR-040, FR-041). */
export function PagosPedido({ pedido }: { pedido: Pedido }) {
  const pagos = usePagosPedido(pedido.id)
  const registrar = useRegistrarPago()
  const anular = useAnularPago()
  const [otroMonto, setOtroMonto] = useState(false)

  const puedeCobrar = pedido.estado !== 'cancelado' && pedido.saldo > 0

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle>Pagos</CardTitle>
        {pedido.estado !== 'cancelado' && (
          <PagoBadge estado={pedido.estado_pago} className="text-sm" />
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <dl className="grid grid-cols-3 gap-2 text-center">
          <Cifra etiqueta="Total" valor={pedido.total} />
          <Cifra etiqueta="Pagado" valor={pedido.pagado} />
          <Cifra etiqueta="Debe" valor={pedido.saldo} destacada={pedido.saldo > 0} />
        </dl>

        {puedeCobrar && !otroMonto && (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-muted-foreground">Cobrar {formatDinero(pedido.saldo)}:</p>
            <div className="grid grid-cols-2 gap-2">
              {(['efectivo', 'transferencia'] as const).map((metodo) => {
                const Icono = ICONO_METODO[metodo]
                return (
                  <Button
                    key={metodo}
                    variant={metodo === 'efectivo' ? 'default' : 'secondary'}
                    disabled={registrar.isPending}
                    onClick={() =>
                      registrar.mutate({ pedidoId: pedido.id, monto: pedido.saldo, metodo })
                    }
                  >
                    <Icono aria-hidden />
                    {ETIQUETA_METODO[metodo]}
                  </Button>
                )
              })}
            </div>
            <Button variant="link" className="self-start px-0" onClick={() => setOtroMonto(true)}>
              Cobrar otro monto
            </Button>
          </div>
        )}
        {puedeCobrar && otroMonto && (
          <OtroMonto pedido={pedido} onListo={() => setOtroMonto(false)} />
        )}

        {pagos.data && pagos.data.length > 0 && (
          <ul aria-label="Pagos registrados" className="flex flex-col divide-y rounded-lg border">
            {pagos.data.map((p) => {
              const Icono = ICONO_METODO[p.metodo]
              return (
                <li
                  key={p.id}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 text-sm',
                    p.anulado_en && 'text-muted-foreground',
                  )}
                >
                  <Icono className="size-4 shrink-0" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className={cn('font-medium tabular', p.anulado_en && 'line-through')}>
                      {formatDinero(p.monto)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {ETIQUETA_METODO[p.metodo]} · {formatFechaRelativa(p.fecha)}
                      {p.abono_id && ' · de un abono'}
                      {p.anulado_en && ' · anulado'}
                    </p>
                  </div>
                  {!p.anulado_en && !p.abono_id && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="min-h-11 text-destructive hover:text-destructive"
                      disabled={anular.isPending}
                      onClick={() => anular.mutate(p.id)}
                    >
                      Anular
                    </Button>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

function Cifra({
  etiqueta,
  valor,
  destacada = false,
}: {
  etiqueta: string
  valor: number
  destacada?: boolean
}) {
  return (
    <div className="rounded-lg bg-muted px-2 py-2">
      <dt className="text-xs text-muted-foreground">{etiqueta}</dt>
      <dd className={cn('font-semibold tabular', destacada && 'text-destructive')}>
        {formatDinero(valor)}
      </dd>
    </div>
  )
}

function OtroMonto({ pedido, onListo }: { pedido: Pedido; onListo: () => void }) {
  const registrar = useRegistrarPago()
  const [monto, setMonto] = useState('')
  const [metodo, setMetodo] = useState<MetodoPago>('efectivo')
  const [error, setError] = useState<string>()

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!/^\d+(\.\d{1,2})?$/.test(monto.trim()) || Number(monto) <= 0) {
      return setError('Escribe el monto en pesos, por ejemplo 200.')
    }
    if (Number(monto) > pedido.saldo) {
      return setError(`No puede ser más de lo que debe (${formatDinero(pedido.saldo)}).`)
    }
    setError(undefined)
    registrar.mutate({ pedidoId: pedido.id, monto: Number(monto), metodo }, { onSuccess: onListo })
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-3 rounded-lg border p-3">
      <div className="flex flex-col gap-2">
        <Label htmlFor="otro-monto">Monto (RD$)</Label>
        <Input
          id="otro-monto"
          inputMode="decimal"
          className="tabular"
          value={monto}
          onChange={(e) => setMonto(e.target.value)}
          autoFocus
          aria-invalid={!!error}
          aria-describedby={error ? 'otro-monto-error' : undefined}
        />
        <FieldError id="otro-monto-error" message={error} />
      </div>
      <Segmented
        label="Método de pago"
        value={metodo}
        onChange={setMetodo}
        options={[
          { value: 'efectivo', label: 'Efectivo' },
          { value: 'transferencia', label: 'Transferencia' },
        ]}
      />
      <div className="flex gap-2">
        <Button type="button" variant="ghost" className="flex-1" onClick={onListo}>
          Cancelar
        </Button>
        <Button type="submit" className="flex-1" disabled={registrar.isPending}>
          Registrar pago
        </Button>
      </div>
    </form>
  )
}

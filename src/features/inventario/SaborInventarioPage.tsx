import { useState, type FormEvent } from 'react'
import { useParams } from 'react-router'

import { CargandoLista, ErrorCarga } from '@/components/Cargando'
import { FieldError } from '@/components/FieldError'
import { PageHeader } from '@/components/PageHeader'
import { Segmented } from '@/components/Segmented'
import { Stepper } from '@/components/Stepper'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useActualizarProducto } from '@/features/ajustes/queries'
import { stockMinimoSchema } from '@/features/ajustes/schemas'
import { Historial } from '@/features/inventario/Historial'
import { EstadoStock } from '@/features/inventario/InventarioPage'
import {
  useAjustarStockProducto,
  useMovimientosProducto,
  useStockProductos,
  type StockProducto,
} from '@/features/inventario/queries'
import { MOTIVOS_AJUSTE, type MotivoAjuste } from '@/features/inventario/schemas'
import { cn } from '@/lib/utils'

const TITULO_MOV = {
  tanda: 'Tanda',
  entrega: 'Entrega',
  reverso_entrega: 'Entrega revertida',
  hecho_al_momento: 'Hecho al momento',
  ajuste: 'Ajuste',
} as const

const ETIQUETA_MOTIVO: Record<MotivoAjuste, string> = {
  merma: 'Merma',
  'consumo propio': 'Consumo',
  conteo: 'Conteo',
  otro: 'Otro',
}

/** Stock de un sabor: ajuste con motivo (FR-052), mínimo (FR-065) e historial. */
export function SaborInventarioPage() {
  const { id = '' } = useParams()
  const stock = useStockProductos()
  const movimientos = useMovimientosProducto(id)
  const s = stock.data?.find((x) => x.id === id)

  return (
    <section className="mx-auto flex max-w-3xl flex-col gap-4">
      <PageHeader titulo={s?.nombre ?? 'Sabor'} atras />
      {stock.isPending ? (
        <CargandoLista filas={2} />
      ) : !s ? (
        <ErrorCarga que="el sabor" />
      ) : (
        <>
          <Card>
            <CardContent>
              <p className="text-sm text-muted-foreground">Catibías hechas</p>
              <p className={cn('text-4xl font-bold tabular', s.negativo && 'text-destructive')}>
                {s.stock}
              </p>
              <EstadoStock negativo={s.negativo} bajo={s.bajo_minimo} minimo={s.stock_minimo} />
              <Minimo producto={s} />
            </CardContent>
          </Card>
          <Ajuste producto={s} />
          <h2 className="text-lg font-semibold">Historial</h2>
          {movimientos.isPending ? (
            <CargandoLista filas={2} />
          ) : movimientos.isError ? (
            <ErrorCarga que="el historial" />
          ) : (
            <Historial
              filas={movimientos.data.map((m) => ({
                id: m.id,
                cantidad: m.cantidad,
                titulo: TITULO_MOV[m.tipo],
                detalle: m.pedidos?.clientes?.nombre ?? m.motivo,
                creado_en: m.creado_en,
                quien: m.perfiles?.nombre,
              }))}
            />
          )}
        </>
      )}
    </section>
  )
}

function Minimo({ producto }: { producto: StockProducto }) {
  const actualizar = useActualizarProducto()
  const [valor, setValor] = useState(producto.stock_minimo?.toString() ?? '')
  const [error, setError] = useState<string>()

  const guardar = () => {
    const r = stockMinimoSchema.safeParse(valor)
    if (!r.success) return setError(r.error.issues[0]?.message)
    setError(undefined)
    if (r.data !== producto.stock_minimo) {
      actualizar.mutate({ id: producto.id, cambios: { stock_minimo: r.data } })
    }
  }

  return (
    <div className="mt-3 flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <Label htmlFor="minimo-sabor">Stock mínimo</Label>
        <Input
          id="minimo-sabor"
          inputMode="numeric"
          placeholder="—"
          className="w-20 text-center tabular"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          onBlur={guardar}
          onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
          aria-invalid={!!error}
          aria-describedby={error ? 'minimo-sabor-error' : undefined}
        />
      </div>
      <FieldError id="minimo-sabor-error" message={error} />
    </div>
  )
}

/** FR-052: ajuste con motivo. "Conteo" deja el stock en lo que se cuente. */
function Ajuste({ producto }: { producto: StockProducto }) {
  const ajustar = useAjustarStockProducto()
  const [motivo, setMotivo] = useState<MotivoAjuste>('merma')
  const [sentido, setSentido] = useState<'restar' | 'sumar'>('restar')
  const [cantidad, setCantidad] = useState(1)
  const [contado, setContado] = useState('')
  const [error, setError] = useState<string>()

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    let delta: number
    if (motivo === 'conteo') {
      if (!/^\d+$/.test(contado.trim())) return setError('Escribe cuántas hay, por ejemplo 12.')
      delta = Number(contado) - producto.stock
      if (delta === 0) return setError(`El stock ya es ${producto.stock}.`)
    } else {
      if (cantidad <= 0) return setError('La cantidad debe ser mayor que cero.')
      delta = sentido === 'restar' ? -cantidad : cantidad
    }
    setError(undefined)
    ajustar.mutate(
      { productoId: producto.id, cantidad: delta, motivo },
      {
        onSuccess: () => {
          setContado('')
          setCantidad(1)
        },
      },
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ajustar stock</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
          <Segmented
            label="Motivo del ajuste"
            value={motivo}
            onChange={(m) => {
              setMotivo(m)
              setSentido(m === 'otro' ? sentido : 'restar')
            }}
            options={MOTIVOS_AJUSTE.map((m) => ({ value: m, label: ETIQUETA_MOTIVO[m] }))}
          />
          {motivo === 'conteo' ? (
            <div className="flex flex-col gap-2">
              <Label htmlFor="contado-sabor">¿Cuántas hay?</Label>
              <Input
                id="contado-sabor"
                inputMode="numeric"
                className="tabular"
                value={contado}
                onChange={(e) => setContado(e.target.value)}
                aria-invalid={!!error}
                aria-describedby={error ? 'ajuste-error' : undefined}
              />
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3">
              {motivo === 'otro' ? (
                <Segmented
                  label="Sumar o restar"
                  value={sentido}
                  onChange={setSentido}
                  options={[
                    { value: 'restar', label: 'Restar' },
                    { value: 'sumar', label: 'Sumar' },
                  ]}
                  className="min-w-40"
                />
              ) : (
                <span className="text-sm text-muted-foreground">Restar</span>
              )}
              <Stepper value={cantidad} onChange={setCantidad} label={producto.nombre} min={1} />
            </div>
          )}
          <FieldError id="ajuste-error" message={error} />
          <Button type="submit" disabled={ajustar.isPending}>
            Registrar ajuste
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

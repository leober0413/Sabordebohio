import { useState, type FormEvent } from 'react'
import { useParams } from 'react-router'

import { CargandoLista, ErrorCarga } from '@/components/Cargando'
import { FieldError } from '@/components/FieldError'
import { PageHeader } from '@/components/PageHeader'
import { Segmented } from '@/components/Segmented'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CompraForm } from '@/features/inventario/CompraForm'
import { Historial } from '@/features/inventario/Historial'
import { IngredienteForm } from '@/features/inventario/IngredienteForm'
import { EstadoStock } from '@/features/inventario/InventarioPage'
import {
  useActualizarIngrediente,
  useIngredientes,
  useMovimientosIngrediente,
  useRegistrarConteo,
  useStockIngredientes,
  type StockIngrediente,
} from '@/features/inventario/queries'
import { conteoSchema } from '@/features/inventario/schemas'
import { formatCantidad, formatDinero } from '@/lib/dinero'
import { cn } from '@/lib/utils'

const TITULO_MOV = { compra: 'Compra', conteo: 'Conteo', ajuste: 'Ajuste' } as const

type Accion = 'comprar' | 'contar' | 'editar'

export function IngredientePage() {
  const { id = '' } = useParams()
  const stock = useStockIngredientes()
  const ingredientes = useIngredientes()
  const movimientos = useMovimientosIngrediente(id)
  const actualizar = useActualizarIngrediente()
  const [accion, setAccion] = useState<Accion>('comprar')

  const s = stock.data?.find((x) => x.id === id)
  const ingrediente = ingredientes.data?.find((x) => x.id === id)

  return (
    <section className="mx-auto flex max-w-3xl flex-col gap-4">
      <PageHeader titulo={s?.nombre ?? 'Ingrediente'} atras />
      {stock.isPending || ingredientes.isPending ? (
        <CargandoLista filas={2} />
      ) : !s || !ingrediente ? (
        <ErrorCarga que="el ingrediente" />
      ) : (
        <>
          <Card>
            <CardContent className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-muted-foreground">Hay</p>
                <p className={cn('text-4xl font-bold tabular', s.stock < 0 && 'text-destructive')}>
                  {formatCantidad(s.stock)} <span className="text-lg font-normal">{s.unidad}</span>
                </p>
                <EstadoStock
                  negativo={s.stock < 0}
                  bajo={s.bajo_minimo}
                  minimo={s.stock_minimo}
                  unidad={s.unidad}
                />
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="min-h-11"
                disabled={actualizar.isPending}
                onClick={() => actualizar.mutate({ id, cambios: { activo: !ingrediente.activo } })}
              >
                {ingrediente.activo ? 'Desactivar' : 'Activar'}
              </Button>
            </CardContent>
          </Card>

          <Segmented
            label="Qué hacer"
            value={accion}
            onChange={setAccion}
            options={[
              { value: 'comprar', label: 'Comprar' },
              { value: 'contar', label: 'Contar' },
              { value: 'editar', label: 'Editar' },
            ]}
          />
          <Card>
            <CardContent>
              {accion === 'comprar' && (
                <CompraForm ingredientes={ingredientes.data ?? []} ingredienteId={id} />
              )}
              {accion === 'contar' && <Conteo ingrediente={s} />}
              {accion === 'editar' && <IngredienteForm ingrediente={ingrediente} />}
            </CardContent>
          </Card>

          <h2 className="text-lg font-semibold">Historial</h2>
          {movimientos.isPending ? (
            <CargandoLista filas={2} />
          ) : movimientos.isError ? (
            <ErrorCarga que="el historial" />
          ) : (
            <Historial
              unidad={s.unidad}
              filas={movimientos.data.map((m) => ({
                id: m.id,
                cantidad: m.cantidad,
                titulo: TITULO_MOV[m.tipo],
                detalle: m.compras ? formatDinero(m.compras.costo_total) : m.motivo,
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

/** FR-062: "quedan 1.5 lb" deja el stock en 1.5. */
function Conteo({ ingrediente }: { ingrediente: StockIngrediente }) {
  const contar = useRegistrarConteo()
  const [valor, setValor] = useState('')
  const [error, setError] = useState<string>()

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    const r = conteoSchema.safeParse(valor)
    if (!r.success) return setError(r.error.issues[0]?.message)
    setError(undefined)
    contar.mutate(
      { ingredienteId: ingrediente.id, cantidad: r.data },
      { onSuccess: () => setValor('') },
    )
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        <Label htmlFor="conteo">¿Cuánto hay? ({ingrediente.unidad})</Label>
        <Input
          id="conteo"
          inputMode="decimal"
          className="tabular"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          aria-invalid={!!error}
          aria-describedby={error ? 'conteo-error' : 'conteo-ayuda'}
        />
        <FieldError id="conteo-error" message={error} />
        <p id="conteo-ayuda" className="text-xs text-muted-foreground">
          El stock queda igual a lo que cuentes; la diferencia se guarda en el historial.
        </p>
      </div>
      <Button type="submit" size="lg" disabled={contar.isPending}>
        Registrar conteo
      </Button>
    </form>
  )
}

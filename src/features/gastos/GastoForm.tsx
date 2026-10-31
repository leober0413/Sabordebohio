import { zodResolver } from '@hookform/resolvers/zod'
import { Save } from 'lucide-react'
import { Controller, useForm, useWatch } from 'react-hook-form'

import { FieldError } from '@/components/FieldError'
import { Stepper } from '@/components/Stepper'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useCrearGasto, type Categoria } from '@/features/gastos/queries'
import {
  gastoSchema,
  totalGasto,
  type GastoInput,
  type GastoOutput,
} from '@/features/gastos/schemas'
import { formatDinero } from '@/lib/dinero'
import { hoySD } from '@/lib/fechas'

/**
 * FR-064: gasto suelto (gas, empaques…). Con cantidad > 1 se escribe el precio
 * por unidad y se guarda el total. Las compras de ingredientes van en Inventario.
 */
export function GastoForm({
  categorias,
  onListo,
}: {
  categorias: Categoria[]
  onListo?: () => void
}) {
  const crear = useCrearGasto()
  // "Ingredientes" se usa para compras, que se registran desde Inventario.
  const opciones = categorias.filter((c) => c.activo && !c.es_sistema)
  const vacio = { categoriaId: '', cantidad: 1, monto: '', fecha: hoySD(), descripcion: '' }
  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<GastoInput, unknown, GastoOutput>({
    resolver: zodResolver(gastoSchema),
    defaultValues: vacio,
  })
  const [cantidad, monto] = useWatch({ control, name: ['cantidad', 'monto'] })
  const precio = /^\d+(\.\d{1,2})?$/.test(monto.trim()) ? Number(monto) : 0

  const onSubmit = (v: GastoOutput) =>
    crear.mutate(
      {
        categoria_id: v.categoriaId,
        monto: totalGasto(v.cantidad, v.monto),
        cantidad: v.cantidad > 1 ? v.cantidad : null,
        fecha: v.fecha,
        descripcion: v.descripcion || null,
      },
      {
        onSuccess: () => {
          reset(vacio)
          onListo?.()
        },
      },
    )

  if (opciones.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Primero crea categorías de gasto (gas, empaques…) en Ajustes.
      </p>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium">Cantidad</span>
        <Controller
          control={control}
          name="cantidad"
          render={({ field }) => (
            <Stepper value={field.value} onChange={field.onChange} label="unidades" min={1} />
          )}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="gasto-monto">
            {cantidad > 1 ? 'Precio por unidad (RD$)' : 'Monto (RD$)'}
          </Label>
          <Input
            id="gasto-monto"
            inputMode="decimal"
            className="tabular"
            aria-invalid={!!errors.monto}
            aria-describedby={errors.monto ? 'gasto-monto-error' : undefined}
            {...register('monto')}
          />
          <FieldError id="gasto-monto-error" message={errors.monto?.message} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="gasto-categoria">Categoría</Label>
          <select
            id="gasto-categoria"
            className="h-11 rounded-md border border-input bg-card px-3 text-base"
            aria-invalid={!!errors.categoriaId}
            aria-describedby={errors.categoriaId ? 'gasto-categoria-error' : undefined}
            {...register('categoriaId')}
          >
            <option value="">Elige…</option>
            {opciones.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
          <FieldError id="gasto-categoria-error" message={errors.categoriaId?.message} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="gasto-fecha">Fecha</Label>
          <Input id="gasto-fecha" type="date" {...register('fecha')} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="gasto-descripcion">Detalle (opcional)</Label>
          <Input
            id="gasto-descripcion"
            autoComplete="off"
            placeholder="Ej.: tanque de gas"
            {...register('descripcion')}
          />
          <FieldError id="gasto-descripcion-error" message={errors.descripcion?.message} />
        </div>
      </div>
      {cantidad > 1 && (
        <p className="text-sm text-muted-foreground tabular" aria-live="polite">
          Total: {cantidad} × {formatDinero(precio)} ={' '}
          <strong className="text-foreground">{formatDinero(totalGasto(cantidad, precio))}</strong>
        </p>
      )}
      <Button type="submit" size="lg" disabled={crear.isPending}>
        <Save aria-hidden />
        {crear.isPending ? 'Guardando…' : 'Registrar gasto'}
      </Button>
    </form>
  )
}

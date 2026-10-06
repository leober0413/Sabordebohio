import { zodResolver } from '@hookform/resolvers/zod'
import { ShoppingCart } from 'lucide-react'
import { useForm, useWatch } from 'react-hook-form'

import { FieldError } from '@/components/FieldError'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useRegistrarCompra, type Ingrediente } from '@/features/inventario/queries'
import { compraSchema, type CompraInput, type CompraOutput } from '@/features/inventario/schemas'
import { hoySD } from '@/lib/fechas'

/** FR-061: compra que suma al stock y cuenta como gasto (BR-009). */
export function CompraForm({
  ingredientes,
  ingredienteId,
  onListo,
}: {
  ingredientes: Ingrediente[]
  /** Fijo cuando se compra desde la ficha del ingrediente. */
  ingredienteId?: string
  onListo?: () => void
}) {
  const registrar = useRegistrarCompra()
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<CompraInput, unknown, CompraOutput>({
    resolver: zodResolver(compraSchema),
    defaultValues: {
      ingredienteId: ingredienteId ?? '',
      cantidad: '',
      costoTotal: '',
      fecha: hoySD(),
    },
  })
  const elegido = useWatch({ control, name: 'ingredienteId' })
  const unidad = ingredientes.find((i) => i.id === elegido)?.unidad

  const onSubmit = (v: CompraOutput) =>
    registrar.mutate(v, {
      onSuccess: () => {
        reset({ ingredienteId: ingredienteId ?? '', cantidad: '', costoTotal: '', fecha: hoySD() })
        onListo?.()
      },
    })

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
      {!ingredienteId && (
        <div className="flex flex-col gap-2">
          <Label htmlFor="compra-ingrediente">Ingrediente</Label>
          <select
            id="compra-ingrediente"
            className="h-11 rounded-md border border-input bg-card px-3 text-base"
            aria-invalid={!!errors.ingredienteId}
            aria-describedby={errors.ingredienteId ? 'compra-ingrediente-error' : undefined}
            {...register('ingredienteId')}
          >
            <option value="">Elige uno…</option>
            {ingredientes
              .filter((i) => i.activo)
              .map((i) => (
                <option key={i.id} value={i.id}>
                  {i.nombre} ({i.unidad})
                </option>
              ))}
          </select>
          <FieldError id="compra-ingrediente-error" message={errors.ingredienteId?.message} />
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="compra-cantidad">Cantidad{unidad ? ` (${unidad})` : ''}</Label>
          <Input
            id="compra-cantidad"
            inputMode="decimal"
            className="tabular"
            aria-invalid={!!errors.cantidad}
            aria-describedby={errors.cantidad ? 'compra-cantidad-error' : undefined}
            {...register('cantidad')}
          />
          <FieldError id="compra-cantidad-error" message={errors.cantidad?.message} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="compra-costo">Costo total (RD$)</Label>
          <Input
            id="compra-costo"
            inputMode="decimal"
            className="tabular"
            aria-invalid={!!errors.costoTotal}
            aria-describedby={errors.costoTotal ? 'compra-costo-error' : undefined}
            {...register('costoTotal')}
          />
          <FieldError id="compra-costo-error" message={errors.costoTotal?.message} />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="compra-fecha">Fecha</Label>
        <Input id="compra-fecha" type="date" {...register('fecha')} />
      </div>
      <Button type="submit" size="lg" disabled={registrar.isPending}>
        <ShoppingCart aria-hidden />
        {registrar.isPending ? 'Guardando…' : 'Registrar compra'}
      </Button>
    </form>
  )
}

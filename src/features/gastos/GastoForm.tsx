import { zodResolver } from '@hookform/resolvers/zod'
import { Save } from 'lucide-react'
import { useForm } from 'react-hook-form'

import { FieldError } from '@/components/FieldError'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useCrearGasto, type Categoria } from '@/features/gastos/queries'
import { gastoSchema, type GastoInput, type GastoOutput } from '@/features/gastos/schemas'
import { hoySD } from '@/lib/fechas'

/** FR-064: gasto suelto (gas, empaques…). Las compras de ingredientes se registran en Inventario. */
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
  const vacio = { categoriaId: '', monto: '', fecha: hoySD(), descripcion: '' }
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<GastoInput, unknown, GastoOutput>({
    resolver: zodResolver(gastoSchema),
    defaultValues: vacio,
  })

  const onSubmit = (v: GastoOutput) =>
    crear.mutate(
      {
        categoria_id: v.categoriaId,
        monto: v.monto,
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
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="gasto-monto">Monto (RD$)</Label>
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
      <Button type="submit" size="lg" disabled={crear.isPending}>
        <Save aria-hidden />
        {crear.isPending ? 'Guardando…' : 'Registrar gasto'}
      </Button>
    </form>
  )
}

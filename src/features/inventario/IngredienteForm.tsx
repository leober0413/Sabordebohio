import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'

import { FieldError } from '@/components/FieldError'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  useActualizarIngrediente,
  useCrearIngrediente,
  type Ingrediente,
} from '@/features/inventario/queries'
import {
  ingredienteSchema,
  UNIDADES,
  type IngredienteInput,
  type IngredienteOutput,
} from '@/features/inventario/schemas'

/** Crear o editar un ingrediente (FR-060, FR-065). */
export function IngredienteForm({
  ingrediente,
  onListo,
  onCancelar,
}: {
  ingrediente?: Ingrediente
  onListo?: () => void
  onCancelar?: () => void
}) {
  const crear = useCrearIngrediente()
  const actualizar = useActualizarIngrediente()
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<IngredienteInput, unknown, IngredienteOutput>({
    resolver: zodResolver(ingredienteSchema),
    defaultValues: {
      nombre: ingrediente?.nombre ?? '',
      unidad: ingrediente?.unidad ?? 'lb',
      stockMinimo: ingrediente?.stock_minimo?.toString() ?? '',
    },
  })

  const onSubmit = (v: IngredienteOutput) => {
    const datos = { nombre: v.nombre, unidad: v.unidad, stock_minimo: v.stockMinimo }
    if (ingrediente) {
      actualizar.mutate(
        { id: ingrediente.id, cambios: datos },
        {
          onSuccess: () => {
            toast.success('Ingrediente actualizado')
            onListo?.()
          },
        },
      )
    } else {
      crear.mutate(datos, { onSuccess: () => onListo?.() })
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="ing-nombre">Nombre</Label>
        <Input
          id="ing-nombre"
          autoComplete="off"
          aria-invalid={!!errors.nombre}
          aria-describedby={errors.nombre ? 'ing-nombre-error' : undefined}
          {...register('nombre')}
        />
        <FieldError id="ing-nombre-error" message={errors.nombre?.message} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="ing-unidad">Unidad</Label>
          <Input id="ing-unidad" list="unidades" autoComplete="off" {...register('unidad')} />
          <datalist id="unidades">
            {UNIDADES.map((u) => (
              <option key={u} value={u} />
            ))}
          </datalist>
          <FieldError id="ing-unidad-error" message={errors.unidad?.message} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="ing-minimo">Stock mínimo</Label>
          <Input
            id="ing-minimo"
            inputMode="decimal"
            placeholder="Sin mínimo"
            className="tabular"
            aria-invalid={!!errors.stockMinimo}
            aria-describedby={errors.stockMinimo ? 'ing-minimo-error' : 'ing-minimo-ayuda'}
            {...register('stockMinimo')}
          />
          <FieldError id="ing-minimo-error" message={errors.stockMinimo?.message} />
        </div>
      </div>
      <p id="ing-minimo-ayuda" className="-mt-2 text-xs text-muted-foreground">
        Al llegar al mínimo aparece un aviso en "Hoy". Déjalo vacío para no recibir avisos.
      </p>
      <div className="flex gap-2">
        {onCancelar && (
          <Button type="button" variant="ghost" className="flex-1" onClick={onCancelar}>
            Cancelar
          </Button>
        )}
        <Button
          type="submit"
          className="flex-1"
          disabled={crear.isPending || actualizar.isPending || (!!ingrediente && !isDirty)}
        >
          {ingrediente ? 'Guardar cambios' : 'Crear ingrediente'}
        </Button>
      </div>
    </form>
  )
}

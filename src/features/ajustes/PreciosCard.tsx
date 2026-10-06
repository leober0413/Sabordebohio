import { zodResolver } from '@hookform/resolvers/zod'
import { Save } from 'lucide-react'
import { useEffect } from 'react'
import { useForm, useWatch } from 'react-hook-form'

import { FieldError } from '@/components/FieldError'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  useConfigPrecios,
  useGuardarConfigPrecios,
  type ConfigPreciosRow,
} from '@/features/ajustes/queries'
import { preciosSchema, type PreciosInput, type PreciosOutput } from '@/features/ajustes/schemas'
import { formatDinero } from '@/lib/dinero'
import { calcularPrecio } from '@/lib/precio'
import { cn } from '@/lib/utils'

const EJEMPLOS = [1, 5, 6, 8, 12, 18]
const REDONDEOS = ['1', '5', '10'] as const

function aFormulario(cfg: ConfigPreciosRow): PreciosInput {
  return {
    precioSuelta: cfg.precio_suelta === null ? '' : String(cfg.precio_suelta),
    precioDocena: String(cfg.precio_docena),
    minimoDocena: String(cfg.minimo_docena),
    redondeo: String(cfg.redondeo) as PreciosInput['redondeo'],
  }
}

export function PreciosCard() {
  const config = useConfigPrecios()

  return (
    <Card>
      <CardHeader>
        <CardTitle>Lista de precios</CardTitle>
        <CardDescription>
          Todos los sabores cuestan igual. Los pedidos ya creados mantienen su precio.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {config.isPending ? (
          <div className="flex flex-col gap-4" aria-busy="true">
            <Skeleton className="h-11 w-full" />
            <Skeleton className="h-11 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : config.isError ? (
          <p className="text-sm text-destructive">No pudimos cargar la lista de precios.</p>
        ) : (
          <PreciosForm config={config.data} />
        )}
      </CardContent>
    </Card>
  )
}

function PreciosForm({ config }: { config: ConfigPreciosRow }) {
  const guardar = useGuardarConfigPrecios()
  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    formState: { errors, isDirty },
  } = useForm<PreciosInput, unknown, PreciosOutput>({
    resolver: zodResolver(preciosSchema),
    defaultValues: aFormulario(config),
  })

  useEffect(() => reset(aFormulario(config)), [config, reset])

  const valores = useWatch({ control })
  const vista = preciosSchema.safeParse(valores)

  const onSubmit = (v: PreciosOutput) =>
    guardar.mutate({
      precio_suelta: v.precioSuelta,
      precio_docena: v.precioDocena,
      minimo_docena: v.minimoDocena,
      redondeo: v.redondeo,
    })

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="precioDocena">Precio de la docena (RD$)</Label>
          <Input
            id="precioDocena"
            inputMode="decimal"
            className="tabular"
            aria-invalid={!!errors.precioDocena}
            aria-describedby={errors.precioDocena ? 'precioDocena-error' : undefined}
            {...register('precioDocena')}
          />
          <FieldError id="precioDocena-error" message={errors.precioDocena?.message} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="precioSuelta">Precio suelta (RD$ por catibía)</Label>
          <Input
            id="precioSuelta"
            inputMode="decimal"
            className="tabular"
            placeholder="Sin definir"
            aria-invalid={!!errors.precioSuelta}
            aria-describedby={errors.precioSuelta ? 'precioSuelta-error' : 'precioSuelta-ayuda'}
            {...register('precioSuelta')}
          />
          <FieldError id="precioSuelta-error" message={errors.precioSuelta?.message} />
          {!errors.precioSuelta && (
            <p id="precioSuelta-ayuda" className="text-xs text-muted-foreground">
              Se usa en pedidos de menos del mínimo.
            </p>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="minimoDocena">Mínimo para precio de docena</Label>
          <Input
            id="minimoDocena"
            inputMode="numeric"
            className="tabular"
            aria-invalid={!!errors.minimoDocena}
            aria-describedby={errors.minimoDocena ? 'minimoDocena-error' : undefined}
            {...register('minimoDocena')}
          />
          <FieldError id="minimoDocena-error" message={errors.minimoDocena?.message} />
        </div>
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-sm font-medium">Redondear el total a</legend>
          <div className="grid grid-cols-3 gap-2" role="radiogroup">
            {REDONDEOS.map((r) => {
              const activo = valores.redondeo === r
              return (
                <Button
                  key={r}
                  type="button"
                  role="radio"
                  aria-checked={activo}
                  variant={activo ? 'default' : 'outline'}
                  onClick={() => setValue('redondeo', r, { shouldDirty: true })}
                >
                  {r === '1' ? 'RD$1' : `RD$${r}`}
                </Button>
              )
            })}
          </div>
        </fieldset>
      </div>

      <section aria-labelledby="vista-previa" className="rounded-lg bg-muted p-4">
        <h3 id="vista-previa" className="mb-2 text-sm font-semibold">
          Así quedan los precios
        </h3>
        {vista.success ? (
          <ul className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-3">
            {EJEMPLOS.map((n) => {
              const r = calcularPrecio(n, vista.data)
              return (
                <li key={n} className="flex justify-between gap-2 whitespace-nowrap tabular">
                  <span className="text-muted-foreground">{n === 1 ? '1 ud.' : `${n} uds.`}</span>
                  <span className={cn(!r.ok && 'text-muted-foreground')}>
                    {r.ok ? formatDinero(r.subtotal) : 'Sin precio'}
                  </span>
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">Corrige los valores para ver los precios.</p>
        )}
      </section>

      <Button type="submit" size="lg" disabled={!isDirty || guardar.isPending}>
        <Save aria-hidden />
        {guardar.isPending ? 'Guardando…' : 'Guardar precios'}
      </Button>
    </form>
  )
}

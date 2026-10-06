import { zodResolver } from '@hookform/resolvers/zod'
import { Save } from 'lucide-react'
import { Controller, useForm, useWatch } from 'react-hook-form'

import { FieldError } from '@/components/FieldError'
import { Segmented } from '@/components/Segmented'
import { Stepper } from '@/components/Stepper'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { ConfigPreciosRow, Producto } from '@/features/ajustes/queries'
import { ClienteSelector } from '@/features/clientes/ClienteSelector'
import type { DatosPedido } from '@/features/pedidos/queries'
import { pedidoSchema, totalUnidades, type PedidoFormValues } from '@/features/pedidos/schemas'
import { formatDinero } from '@/lib/dinero'
import { hoySD, sumarDias } from '@/lib/fechas'
import { calcularPrecio } from '@/lib/precio'

interface Props {
  productos: Producto[]
  config: ConfigPreciosRow
  valoresIniciales?: Partial<PedidoFormValues>
  textoGuardar: string
  guardando: boolean
  onGuardar: (datos: DatosPedido) => void
}

/** Formulario de pedido (FR-020, FR-021, FR-024). Meta: < 30 s (NFR-U-001). */
export function PedidoForm({
  productos,
  config,
  valoresIniciales,
  textoGuardar,
  guardando,
  onGuardar,
}: Props) {
  const hoy = hoySD()
  const manana = sumarDias(hoy, 1)
  const {
    control,
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<PedidoFormValues>({
    resolver: zodResolver(pedidoSchema),
    defaultValues: {
      clienteId: '',
      cantidades: {},
      fechaEntrega: hoy,
      horaEntrega: '',
      tipoEntrega: 'recoge',
      costoEnvio: '',
      notas: '',
      ...valoresIniciales,
    },
  })

  const [cantidades, fechaEntrega, tipoEntrega, costoEnvio] = useWatch({
    control,
    name: ['cantidades', 'fechaEntrega', 'tipoEntrega', 'costoEnvio'],
  })
  const unidades = totalUnidades(cantidades)
  const envio =
    tipoEntrega === 'delivery' && /^\d+(\.\d{1,2})?$/.test(costoEnvio.trim())
      ? Number(costoEnvio)
      : 0
  const precio =
    unidades > 0
      ? calcularPrecio(unidades, {
          precioSuelta: config.precio_suelta,
          precioDocena: config.precio_docena,
          minimoDocena: config.minimo_docena,
          redondeo: config.redondeo,
        })
      : null

  const opcionFecha = fechaEntrega === hoy ? 'hoy' : fechaEntrega === manana ? 'manana' : 'otra'

  const onSubmit = (v: PedidoFormValues) =>
    onGuardar({
      clienteId: v.clienteId,
      lineas: Object.entries(v.cantidades)
        .filter((e): e is [string, number] => !!e[1] && e[1] > 0)
        .map(([producto_id, cantidad]) => ({ producto_id, cantidad })),
      fechaEntrega: v.fechaEntrega,
      horaEntrega: v.horaEntrega || null,
      tipoEntrega: v.tipoEntrega,
      costoEnvio: v.tipoEntrega === 'delivery' && v.costoEnvio ? Number(v.costoEnvio) : 0,
      notas: v.notas.trim() || null,
    })

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-6 pb-28">
      <section className="flex flex-col gap-2" aria-labelledby="titulo-cliente">
        <h2 id="titulo-cliente" className="text-lg font-semibold">
          Cliente
        </h2>
        <Controller
          control={control}
          name="clienteId"
          render={({ field }) => (
            <ClienteSelector
              value={field.value}
              onChange={field.onChange}
              error={errors.clienteId?.message}
            />
          )}
        />
      </section>

      <section className="flex flex-col gap-2" aria-labelledby="titulo-catibias">
        <h2 id="titulo-catibias" className="text-lg font-semibold">
          Catibías
        </h2>
        <ul className="flex flex-col divide-y rounded-xl border bg-card">
          {productos.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-3 px-3 py-2">
              <span className="font-medium">{p.nombre}</span>
              <Controller
                control={control}
                name={`cantidades.${p.id}`}
                defaultValue={0}
                render={({ field }) => (
                  <Stepper value={field.value ?? 0} onChange={field.onChange} label={p.nombre} />
                )}
              />
            </li>
          ))}
        </ul>
        <FieldError
          id="cantidades-error"
          message={(errors.cantidades as { message?: string } | undefined)?.message}
        />
      </section>

      <section className="flex flex-col gap-3" aria-labelledby="titulo-entrega">
        <h2 id="titulo-entrega" className="text-lg font-semibold">
          Entrega
        </h2>
        <Segmented
          label="Día de entrega"
          value={opcionFecha}
          onChange={(o) => {
            if (o === 'hoy') setValue('fechaEntrega', hoy)
            else if (o === 'manana') setValue('fechaEntrega', manana)
            else setValue('fechaEntrega', sumarDias(hoy, 2))
          }}
          options={[
            { value: 'hoy', label: 'Hoy' },
            { value: 'manana', label: 'Mañana' },
            { value: 'otra', label: 'Otro día' },
          ]}
        />
        <div className="grid grid-cols-2 gap-3">
          {opcionFecha === 'otra' && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="fechaEntrega">Fecha</Label>
              <Input id="fechaEntrega" type="date" {...register('fechaEntrega')} />
              <FieldError id="fecha-error" message={errors.fechaEntrega?.message} />
            </div>
          )}
          <div className="flex flex-col gap-2">
            <Label htmlFor="horaEntrega">Hora (opcional)</Label>
            <Input id="horaEntrega" type="time" step={900} {...register('horaEntrega')} />
          </div>
        </div>
        <Controller
          control={control}
          name="tipoEntrega"
          render={({ field }) => (
            <Segmented
              label="Tipo de entrega"
              value={field.value}
              onChange={field.onChange}
              options={[
                { value: 'recoge', label: 'Recoge' },
                { value: 'delivery', label: 'Delivery' },
              ]}
            />
          )}
        />
        {tipoEntrega === 'delivery' && (
          <div className="flex flex-col gap-2">
            <Label htmlFor="costoEnvio">Costo de envío (RD$)</Label>
            <Input
              id="costoEnvio"
              inputMode="decimal"
              placeholder="0"
              className="tabular"
              aria-invalid={!!errors.costoEnvio}
              aria-describedby={errors.costoEnvio ? 'envio-error' : undefined}
              {...register('costoEnvio')}
            />
            <FieldError id="envio-error" message={errors.costoEnvio?.message} />
          </div>
        )}
        <div className="flex flex-col gap-2">
          <Label htmlFor="notas">Notas (opcional)</Label>
          <Input
            id="notas"
            autoComplete="off"
            placeholder="Ej.: sin picante"
            {...register('notas')}
          />
          <FieldError id="notas-error" message={errors.notas?.message} />
        </div>
      </section>

      {/* Total y guardar, fijos abajo al alcance del pulgar (docs/ui-ux.md §1.2). */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:left-60">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <div className="min-w-0 flex-1" aria-live="polite">
            <p className="text-xl font-bold tabular">
              {precio?.ok ? formatDinero(precio.subtotal + envio) : formatDinero(0)}
            </p>
            <p className="line-clamp-2 text-xs text-muted-foreground">
              {unidades === 0
                ? 'Sin catibías'
                : precio && !precio.ok
                  ? precio.error
                  : precio?.tarifa === 'docena'
                    ? `Precio de docena · ${unidades} × ${formatDinero(precio.precioUnitario)}`
                    : `Precio suelta · ${unidades} × ${formatDinero(precio?.ok ? precio.precioUnitario : 0)}`}
              {precio?.ok && precio.ahorro > 0 ? ` · ahorra ${formatDinero(precio.ahorro)}` : ''}
              {envio > 0 ? ` · envío ${formatDinero(envio)}` : ''}
            </p>
          </div>
          <Button
            type="submit"
            size="lg"
            disabled={unidades === 0 || guardando || (precio !== null && !precio.ok)}
          >
            <Save aria-hidden />
            {guardando ? 'Guardando…' : textoGuardar}
          </Button>
        </div>
      </div>
    </form>
  )
}

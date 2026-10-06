import { Plus } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'

import { FieldError } from '@/components/FieldError'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  useActualizarProducto,
  useCrearProducto,
  useProductos,
  type Producto,
} from '@/features/ajustes/queries'
import { nombreSaborSchema, stockMinimoSchema } from '@/features/ajustes/schemas'
import { cn } from '@/lib/utils'

export function SaboresCard() {
  const productos = useProductos()
  const activos = productos.data?.filter((p) => p.activo) ?? []
  const inactivos = productos.data?.filter((p) => !p.activo) ?? []

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sabores</CardTitle>
        <CardDescription>
          El mínimo de stock avisa cuando quedan pocas catibías hechas. Un sabor desactivado no
          aparece en pedidos nuevos.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <NuevoSabor />
        {productos.isPending ? (
          <div className="flex flex-col gap-2" aria-busy="true">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : productos.isError ? (
          <p className="text-sm text-destructive">No pudimos cargar los sabores.</p>
        ) : productos.data.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aún no hay sabores. Escribe uno arriba, por ejemplo "Pollo", y toca Agregar.
          </p>
        ) : (
          <ul aria-label="Lista de sabores" className="flex flex-col divide-y rounded-lg border">
            {[...activos, ...inactivos].map((p) => (
              // La clave incluye el mínimo para reiniciar el campo si cambia desde fuera (p. ej. al revertir).
              <SaborFila key={`${p.id}:${p.stock_minimo}`} producto={p} />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

function NuevoSabor() {
  const crear = useCrearProducto()
  const [nombre, setNombre] = useState('')
  const [error, setError] = useState<string>()

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    const r = nombreSaborSchema.safeParse(nombre)
    if (!r.success) return setError(r.error.issues[0]?.message)
    setError(undefined)
    crear.mutate(r.data, { onSuccess: () => setNombre('') })
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-2">
      <Label htmlFor="nuevo-sabor">Nuevo sabor</Label>
      <div className="flex gap-2">
        <Input
          id="nuevo-sabor"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Ej.: Guayaba con queso"
          autoComplete="off"
          aria-invalid={!!error}
          aria-describedby={error ? 'nuevo-sabor-error' : undefined}
        />
        <Button type="submit" disabled={crear.isPending}>
          <Plus aria-hidden />
          Agregar
        </Button>
      </div>
      <FieldError id="nuevo-sabor-error" message={error} />
    </form>
  )
}

function SaborFila({ producto }: { producto: Producto }) {
  const actualizar = useActualizarProducto()
  const [minimo, setMinimo] = useState(producto.stock_minimo?.toString() ?? '')
  const [error, setError] = useState<string>()
  const idMinimo = `minimo-${producto.id}`

  const guardarMinimo = () => {
    const r = stockMinimoSchema.safeParse(minimo)
    if (!r.success) return setError(r.error.issues[0]?.message)
    setError(undefined)
    if (r.data === producto.stock_minimo) return
    actualizar.mutate({ id: producto.id, cambios: { stock_minimo: r.data } })
  }

  const cambiarActivo = (activo: boolean) => {
    actualizar.mutate(
      { id: producto.id, cambios: { activo } },
      {
        onSuccess: () => {
          // Reversible: se confirma con "Deshacer", sin diálogo (docs/ui-ux.md §1.6).
          if (!activo) {
            toast(`"${producto.nombre}" desactivado`, {
              action: {
                label: 'Deshacer',
                onClick: () => actualizar.mutate({ id: producto.id, cambios: { activo: true } }),
              },
            })
          }
        },
      },
    )
  }

  return (
    <li
      className={cn(
        // Celular: nombre y botón arriba, mínimo abajo. Pantallas anchas: una línea.
        'grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-2 px-3 py-3 sm:flex sm:flex-wrap',
        !producto.activo && 'bg-muted/50',
      )}
    >
      <div className="min-w-0 break-words sm:flex-1">
        <p className={cn('font-medium', !producto.activo && 'text-muted-foreground')}>
          {producto.nombre}
        </p>
        {!producto.activo && <p className="text-xs text-muted-foreground">Desactivado</p>}
      </div>
      <Button
        variant={producto.activo ? 'outline' : 'secondary'}
        size="sm"
        className="min-h-11 sm:order-last"
        onClick={() => cambiarActivo(!producto.activo)}
      >
        {producto.activo ? 'Desactivar' : 'Activar'}
      </Button>
      <div className="col-span-2 flex items-center gap-2">
        <label htmlFor={idMinimo} className="text-sm text-muted-foreground">
          Stock mínimo
        </label>
        <Input
          id={idMinimo}
          value={minimo}
          onChange={(e) => setMinimo(e.target.value)}
          onBlur={guardarMinimo}
          onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
          inputMode="numeric"
          placeholder="—"
          className="w-20 text-center tabular"
          aria-invalid={!!error}
          aria-describedby={error ? `${idMinimo}-error` : undefined}
        />
      </div>
      {error && (
        <div className="col-span-2 sm:order-last sm:basis-full">
          <FieldError id={`${idMinimo}-error`} message={error} />
        </div>
      )}
    </li>
  )
}

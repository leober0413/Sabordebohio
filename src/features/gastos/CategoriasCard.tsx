import { Lock, Plus } from 'lucide-react'
import { useState, type FormEvent } from 'react'

import { FieldError } from '@/components/FieldError'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  useActualizarCategoria,
  useCategorias,
  useCrearCategoria,
  type Categoria,
} from '@/features/gastos/queries'
import { cn } from '@/lib/utils'

/** FR-064: las categorías de gasto son editables; "Ingredientes" es del sistema. */
export function CategoriasCard() {
  const categorias = useCategorias()
  const crear = useCrearCategoria()
  const [nombre, setNombre] = useState('')
  const [error, setError] = useState<string>()

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    const limpio = nombre.trim()
    if (!limpio) return setError('Escribe el nombre de la categoría.')
    if (limpio.length > 40) return setError('Máximo 40 caracteres.')
    setError(undefined)
    crear.mutate(limpio, { onSuccess: () => setNombre('') })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Categorías de gasto</CardTitle>
        <CardDescription>Para clasificar el gas, los empaques, el transporte…</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-2">
          <Label htmlFor="nueva-categoria">Nueva categoría</Label>
          <div className="flex gap-2">
            <Input
              id="nueva-categoria"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              autoComplete="off"
              placeholder="Ej.: Empaques"
              aria-invalid={!!error}
              aria-describedby={error ? 'nueva-categoria-error' : undefined}
            />
            <Button type="submit" disabled={crear.isPending}>
              <Plus aria-hidden />
              Agregar
            </Button>
          </div>
          <FieldError id="nueva-categoria-error" message={error} />
        </form>
        <ul aria-label="Categorías de gasto" className="flex flex-col divide-y rounded-lg border">
          {(categorias.data ?? []).map((c) => (
            <FilaCategoria key={`${c.id}:${c.nombre}`} categoria={c} />
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

function FilaCategoria({ categoria }: { categoria: Categoria }) {
  const actualizar = useActualizarCategoria()
  const [nombre, setNombre] = useState(categoria.nombre)

  const guardar = () => {
    const limpio = nombre.trim()
    if (!limpio || limpio === categoria.nombre) return setNombre(categoria.nombre)
    actualizar.mutate({ id: categoria.id, cambios: { nombre: limpio } })
  }

  return (
    <li className={cn('flex items-center gap-2 px-3 py-2', !categoria.activo && 'bg-muted/50')}>
      {categoria.es_sistema ? (
        <p className="flex flex-1 items-center gap-2 px-1">
          {categoria.nombre}
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Lock className="size-3" aria-hidden />
            compras de ingredientes
          </span>
        </p>
      ) : (
        <Input
          aria-label={`Nombre de la categoría ${categoria.nombre}`}
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          onBlur={guardar}
          onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
          className={cn(
            'flex-1 border-transparent bg-transparent shadow-none',
            !categoria.activo && 'text-muted-foreground',
          )}
        />
      )}
      {!categoria.es_sistema && (
        <Button
          variant={categoria.activo ? 'outline' : 'secondary'}
          size="sm"
          className="min-h-11"
          disabled={actualizar.isPending}
          onClick={() =>
            actualizar.mutate({ id: categoria.id, cambios: { activo: !categoria.activo } })
          }
        >
          {categoria.activo ? 'Desactivar' : 'Activar'}
        </Button>
      )}
    </li>
  )
}

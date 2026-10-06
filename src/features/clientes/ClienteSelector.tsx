import { Phone, Search, UserPlus, X } from 'lucide-react'
import { useId, useState, type FormEvent } from 'react'

import { FieldError } from '@/components/FieldError'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useBuscarClientes, useCliente, useCrearCliente } from '@/features/clientes/queries'

interface Props {
  value: string
  onChange: (clienteId: string) => void
  error?: string
}

/** FR-010, FR-011: buscar por nombre o teléfono, o crear sin salir del pedido. */
export function ClienteSelector({ value, onChange, error }: Props) {
  const id = useId()
  const [texto, setTexto] = useState('')
  const [creando, setCreando] = useState(false)
  const seleccionado = useCliente(value || undefined)
  const sugerencias = useBuscarClientes(texto)

  if (value && seleccionado.data) {
    return (
      <div className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2">
        <div className="min-w-0 flex-1">
          <p className="font-medium">{seleccionado.data.nombre}</p>
          {seleccionado.data.telefono && (
            <p className="text-sm text-muted-foreground">{seleccionado.data.telefono}</p>
          )}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="min-h-11"
          onClick={() => onChange('')}
        >
          <X aria-hidden />
          Cambiar
        </Button>
      </div>
    )
  }

  if (creando) {
    return (
      <NuevoCliente
        nombreInicial={texto}
        onCancelar={() => setCreando(false)}
        onCreado={(clienteId) => {
          setCreando(false)
          setTexto('')
          onChange(clienteId)
        }}
      />
    )
  }

  const listaId = `${id}-sugerencias`
  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          id="cliente"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Buscar por nombre o teléfono"
          autoComplete="off"
          className="pl-9"
          aria-invalid={!!error}
          aria-describedby={error ? 'cliente-error' : undefined}
          aria-controls={listaId}
        />
      </div>
      {texto.trim() && (
        <ul
          id={listaId}
          aria-label="Clientes encontrados"
          className="flex flex-col overflow-hidden rounded-lg border"
        >
          {sugerencias.data?.map((c) => (
            <li key={c.id} className="border-b last:border-b-0">
              <button
                type="button"
                className="flex min-h-12 w-full items-center gap-3 px-3 py-2 text-left hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
                onClick={() => {
                  setTexto('')
                  onChange(c.id)
                }}
              >
                <span className="flex-1 font-medium">{c.nombre}</span>
                {c.telefono && (
                  <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                    <Phone className="size-3.5" aria-hidden />
                    {c.telefono}
                  </span>
                )}
              </button>
            </li>
          ))}
          {sugerencias.data?.length === 0 && (
            <li className="px-3 py-2 text-sm text-muted-foreground">
              No hay clientes con "{texto.trim()}".
            </li>
          )}
        </ul>
      )}
      <Button type="button" variant="outline" onClick={() => setCreando(true)}>
        <UserPlus aria-hidden />
        Nuevo cliente
      </Button>
      <FieldError id="cliente-error" message={error} />
    </div>
  )
}

function NuevoCliente({
  nombreInicial,
  onCancelar,
  onCreado,
}: {
  nombreInicial: string
  onCancelar: () => void
  onCreado: (id: string) => void
}) {
  const crear = useCrearCliente()
  const [nombre, setNombre] = useState(/\d/.test(nombreInicial) ? '' : nombreInicial)
  const [telefono, setTelefono] = useState(/\d/.test(nombreInicial) ? nombreInicial : '')
  const [error, setError] = useState<string>()

  const guardar = (e: FormEvent | React.MouseEvent) => {
    e.preventDefault()
    if (!nombre.trim()) return setError('Escribe el nombre del cliente.')
    setError(undefined)
    crear.mutate(
      { nombre: nombre.trim(), telefono: telefono.trim() || null },
      { onSuccess: (c) => onCreado(c.id) },
    )
  }

  // No es un <form>: vive dentro del formulario del pedido.
  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-muted/40 p-3">
      <div className="flex flex-col gap-2">
        <Label htmlFor="nuevo-cliente-nombre">Nombre</Label>
        <Input
          id="nuevo-cliente-nombre"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && guardar(e)}
          autoComplete="off"
          autoFocus
          aria-invalid={!!error}
          aria-describedby={error ? 'nuevo-cliente-error' : undefined}
        />
        <FieldError id="nuevo-cliente-error" message={error} />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="nuevo-cliente-telefono">Teléfono (opcional)</Label>
        <Input
          id="nuevo-cliente-telefono"
          type="tel"
          inputMode="tel"
          value={telefono}
          onChange={(e) => setTelefono(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && guardar(e)}
          autoComplete="off"
        />
      </div>
      <div className="flex gap-2">
        <Button type="button" variant="ghost" className="flex-1" onClick={onCancelar}>
          Cancelar
        </Button>
        <Button type="button" className="flex-1" onClick={guardar} disabled={crear.isPending}>
          Crear cliente
        </Button>
      </div>
    </div>
  )
}

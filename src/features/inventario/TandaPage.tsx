import { Save } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'

import { CargandoLista, ErrorCarga } from '@/components/Cargando'
import { FieldError } from '@/components/FieldError'
import { PageHeader } from '@/components/PageHeader'
import { Stepper } from '@/components/Stepper'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useProductos } from '@/features/ajustes/queries'
import { useRegistrarTanda } from '@/features/inventario/queries'
import { hoySD } from '@/lib/fechas'

/** FR-050: cantidades producidas por sabor. */
export function TandaPage() {
  const navigate = useNavigate()
  const productos = useProductos()
  const registrar = useRegistrarTanda()
  const [cantidades, setCantidades] = useState<Record<string, number>>({})
  const [fecha, setFecha] = useState(hoySD())
  const [notas, setNotas] = useState('')
  const [error, setError] = useState<string>()

  const total = Object.values(cantidades).reduce((a, n) => a + n, 0)

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (total === 0) return setError('Agrega al menos una catibía.')
    setError(undefined)
    registrar.mutate(
      {
        lineas: Object.entries(cantidades)
          .filter(([, n]) => n > 0)
          .map(([producto_id, cantidad]) => ({ producto_id, cantidad })),
        fecha,
        notas: notas.trim() || null,
      },
      { onSuccess: () => navigate('/inventario', { replace: true }) },
    )
  }

  return (
    <section className="mx-auto flex max-w-3xl flex-col gap-4">
      <PageHeader titulo="Registrar tanda" atras />
      {productos.isPending ? (
        <CargandoLista />
      ) : productos.isError ? (
        <ErrorCarga que="los sabores" />
      ) : (
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
          <ul
            aria-label="Catibías producidas"
            className="flex flex-col divide-y rounded-xl border bg-card"
          >
            {productos.data
              .filter((p) => p.activo)
              .map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 px-3 py-2">
                  <span className="font-medium">{p.nombre}</span>
                  <Stepper
                    value={cantidades[p.id] ?? 0}
                    onChange={(n) => setCantidades((c) => ({ ...c, [p.id]: n }))}
                    label={p.nombre}
                  />
                </li>
              ))}
          </ul>
          <FieldError id="tanda-error" message={error} />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="fecha-tanda">Fecha</Label>
              <Input
                id="fecha-tanda"
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="notas-tanda">Notas (opcional)</Label>
              <Input
                id="notas-tanda"
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                autoComplete="off"
              />
            </div>
          </div>
          <Button type="submit" size="lg" disabled={total === 0 || registrar.isPending}>
            <Save aria-hidden />
            {registrar.isPending ? 'Guardando…' : `Registrar ${total} catibías`}
          </Button>
        </form>
      )}
    </section>
  )
}

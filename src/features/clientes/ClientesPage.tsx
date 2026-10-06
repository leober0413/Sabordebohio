import { ChevronRight, Search } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'

import { CargandoLista, ErrorCarga } from '@/components/Cargando'
import { PageHeader } from '@/components/PageHeader'
import { Input } from '@/components/ui/input'
import { useClientesConSaldo } from '@/features/pagos/queries'
import { formatDinero } from '@/lib/dinero'

const normalizar = (s: string) =>
  s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()

export function ClientesPage() {
  const clientes = useClientesConSaldo()
  const [texto, setTexto] = useState('')
  const q = normalizar(texto.trim())
  const lista = (clientes.data ?? []).filter(
    (c) => !q || normalizar(c.nombre).includes(q) || (c.telefono ?? '').includes(q),
  )

  return (
    <section className="flex flex-col gap-4">
      <PageHeader titulo="Clientes" />
      <div className="relative">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          aria-label="Buscar cliente"
          placeholder="Buscar por nombre o teléfono"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          className="pl-9"
        />
      </div>
      {clientes.isPending ? (
        <CargandoLista />
      ) : clientes.isError ? (
        <ErrorCarga que="los clientes" />
      ) : lista.length === 0 ? (
        <p className="text-muted-foreground">
          {texto
            ? 'No hay clientes con ese nombre o teléfono.'
            : 'Aún no hay clientes. Se crean al registrar un pedido.'}
        </p>
      ) : (
        <ul aria-label="Clientes" className="flex flex-col divide-y rounded-xl border bg-card">
          {lista.map((c) => (
            <li key={c.id}>
              <Link
                to={`/clientes/${c.id}`}
                className="flex min-h-14 items-center gap-3 px-4 py-3 hover:bg-accent"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{c.nombre}</p>
                  {c.telefono && <p className="text-sm text-muted-foreground">{c.telefono}</p>}
                </div>
                {c.saldo_total > 0 && (
                  <span className="text-sm font-semibold tabular">
                    debe {formatDinero(c.saldo_total)}
                  </span>
                )}
                <ChevronRight className="size-5 text-muted-foreground" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

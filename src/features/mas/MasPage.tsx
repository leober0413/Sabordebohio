import { ChevronRight, Settings } from 'lucide-react'
import { Link } from 'react-router'

import { PageHeader } from '@/components/PageHeader'

// Clientes / Fiado, Gastos y Finanzas se agregan en las Fases 3 a 5 (docs/ui-ux.md §4).
const ENLACES = [
  { to: '/ajustes', label: 'Ajustes', detalle: 'Precios, sabores y cuenta', Icono: Settings },
]

export function MasPage() {
  return (
    <section className="flex flex-col gap-4">
      <PageHeader titulo="Más" />
      <ul className="flex flex-col divide-y rounded-xl border bg-card">
        {ENLACES.map(({ to, label, detalle, Icono }) => (
          <li key={to}>
            <Link to={to} className="flex min-h-14 items-center gap-3 px-4 py-3 hover:bg-accent">
              <Icono className="size-5 text-muted-foreground" aria-hidden />
              <span className="flex-1">
                <span className="block font-medium">{label}</span>
                <span className="block text-sm text-muted-foreground">{detalle}</span>
              </span>
              <ChevronRight className="size-5 text-muted-foreground" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}

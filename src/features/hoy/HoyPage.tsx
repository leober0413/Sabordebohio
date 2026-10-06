import { ClipboardList } from 'lucide-react'

export function HoyPage() {
  const fecha = new Intl.DateTimeFormat('es-DO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'America/Santo_Domingo',
  }).format(new Date())

  return (
    <section className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold">Hoy</h1>
        <p className="text-muted-foreground first-letter:uppercase">{fecha}</p>
      </div>

      {/* Estado vacío útil (docs/ui-ux.md §1.7). Los pedidos llegan en la Fase 2. */}
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed bg-card px-6 py-12 text-center">
        <div className="flex size-14 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
          <ClipboardList className="size-7" aria-hidden />
        </div>
        <h2 className="text-lg font-semibold">Aún no hay pedidos hoy</h2>
        <p className="max-w-xs text-sm text-muted-foreground">
          Cuando registres un pedido aparecerá aquí, ordenado por hora de entrega.
        </p>
      </div>
    </section>
  )
}

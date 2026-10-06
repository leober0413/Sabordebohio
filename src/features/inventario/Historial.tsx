import { cn } from '@/lib/utils'
import { formatCantidad } from '@/lib/dinero'

const fechaHora = new Intl.DateTimeFormat('es-DO', {
  day: 'numeric',
  month: 'short',
  hour: 'numeric',
  minute: '2-digit',
  timeZone: 'America/Santo_Domingo',
})

export interface FilaHistorial {
  id: string
  cantidad: number
  titulo: string
  detalle?: string | null
  creado_en: string
  quien?: string | null
}

/** BR-007: cada cambio de stock con tipo, cantidad, fecha, usuario y motivo. */
export function Historial({ filas, unidad }: { filas: FilaHistorial[]; unidad?: string }) {
  if (filas.length === 0) {
    return <p className="text-sm text-muted-foreground">Todavía no hay movimientos.</p>
  }
  return (
    <ul
      aria-label="Historial de movimientos"
      className="flex flex-col divide-y rounded-xl border bg-card"
    >
      {filas.map((f) => (
        <li key={f.id} className="flex items-center gap-3 px-4 py-2">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">{f.titulo}</p>
            <p className="text-xs text-muted-foreground">
              {fechaHora.format(new Date(f.creado_en))}
              {f.quien && ` · ${f.quien}`}
              {f.detalle && ` · ${f.detalle}`}
            </p>
          </div>
          <span
            className={cn(
              'font-semibold tabular',
              f.cantidad > 0 ? 'text-success' : 'text-destructive',
            )}
          >
            {f.cantidad > 0 ? '+' : '−'}
            {formatCantidad(Math.abs(f.cantidad))}
            {unidad && ` ${unidad}`}
          </span>
        </li>
      ))}
    </ul>
  )
}

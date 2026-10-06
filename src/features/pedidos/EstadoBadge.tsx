import { AlertTriangle, Check, CheckCheck, Clock, X } from 'lucide-react'

import { ETIQUETA_ESTADO, type EstadoPedido } from '@/features/pedidos/tipos'
import { cn } from '@/lib/utils'

const ESTILO: Record<EstadoPedido, { clase: string; Icono: typeof Clock }> = {
  pendiente: { clase: 'bg-secondary text-secondary-foreground', Icono: Clock },
  listo: { clase: 'bg-accent text-accent-foreground', Icono: Check },
  entregado: { clase: 'bg-success text-success-foreground', Icono: CheckCheck },
  cancelado: { clase: 'bg-muted text-muted-foreground line-through', Icono: X },
}

/** Estado con icono y texto, no solo color (docs/ui-ux.md §1.9). */
export function EstadoBadge({
  estado,
  atrasado = false,
}: {
  estado: EstadoPedido
  atrasado?: boolean
}) {
  if (atrasado) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-destructive px-2 py-0.5 text-xs font-semibold text-destructive-foreground">
        <AlertTriangle className="size-3.5" aria-hidden />
        Atrasado
      </span>
    )
  }
  const { clase, Icono } = ESTILO[estado]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
        clase,
      )}
    >
      <Icono className="size-3.5" aria-hidden />
      {ETIQUETA_ESTADO[estado]}
    </span>
  )
}

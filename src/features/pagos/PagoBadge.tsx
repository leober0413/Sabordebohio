import { CircleCheck, CircleDashed, CircleDot } from 'lucide-react'

import { ETIQUETA_PAGO, type EstadoPago } from '@/features/pedidos/tipos'
import { cn } from '@/lib/utils'

const ESTILO: Record<EstadoPago, { clase: string; Icono: typeof CircleCheck }> = {
  pagado: { clase: 'text-success', Icono: CircleCheck },
  parcial: { clase: 'text-warning-foreground dark:text-warning', Icono: CircleDot },
  pendiente: { clase: 'text-muted-foreground', Icono: CircleDashed },
}

/** BR-003 con icono y texto, no solo color. */
export function PagoBadge({ estado, className }: { estado: EstadoPago; className?: string }) {
  const { clase, Icono } = ESTILO[estado]
  return (
    <span className={cn('inline-flex items-center gap-1 text-xs font-medium', clase, className)}>
      <Icono className="size-3.5" aria-hidden />
      {ETIQUETA_PAGO[estado]}
    </span>
  )
}

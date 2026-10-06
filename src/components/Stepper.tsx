import { Minus, Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface StepperProps {
  value: number
  onChange: (value: number) => void
  /** Nombre de lo que se cuenta, para lectores de pantalla ("Pollo"). */
  label: string
  min?: number
  max?: number
  className?: string
}

/** Cantidad con − / + grandes en vez de teclear (docs/ui-ux.md §1.3). */
export function Stepper({ value, onChange, label, min = 0, max = 999, className }: StepperProps) {
  const fijar = (n: number) => onChange(Math.min(max, Math.max(min, n)))
  return (
    <div className={cn('flex items-center gap-1', className)}>
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label={`Quitar una de ${label}`}
        disabled={value <= min}
        onClick={() => fijar(value - 1)}
      >
        <Minus aria-hidden />
      </Button>
      <input
        aria-label={`Cantidad de ${label}`}
        inputMode="numeric"
        value={value}
        onChange={(e) => {
          const n = Number(e.target.value.replace(/\D/g, ''))
          fijar(Number.isFinite(n) ? n : 0)
        }}
        onFocus={(e) => e.currentTarget.select()}
        className="h-11 w-14 rounded-md bg-transparent text-center text-lg font-semibold tabular outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
      />
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label={`Agregar una de ${label}`}
        disabled={value >= max}
        onClick={() => fijar(value + 1)}
      >
        <Plus aria-hidden />
      </Button>
    </div>
  )
}

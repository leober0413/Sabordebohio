import { cn } from '@/lib/utils'

interface SegmentedProps<T extends string> {
  value: T
  onChange: (value: T) => void
  options: ReadonlyArray<{ value: T; label: string }>
  label: string
  className?: string
}

/** Selector de una opción con botones grandes (un toque). */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
  className,
}: SegmentedProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn('grid auto-cols-fr grid-flow-col gap-1 rounded-lg bg-muted p-1', className)}
    >
      {options.map((o) => {
        const activo = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={activo}
            onClick={() => onChange(o.value)}
            className={cn(
              'min-h-10 rounded-md px-3 text-sm font-medium transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
              activo
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

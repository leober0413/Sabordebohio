import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useSearchParams } from 'react-router'

import { usePeriodo } from '@/components/usePeriodo'

import { Segmented } from '@/components/Segmented'
import { Button } from '@/components/ui/button'
import { hoySD } from '@/lib/fechas'
import { etiquetaPeriodo, moverPeriodo, type Periodo } from '@/lib/periodos'

export function SelectorPeriodo({ porDefecto }: { porDefecto: Periodo }) {
  const [, setParams] = useSearchParams()
  const { periodo, fecha, rango } = usePeriodo(porDefecto)
  const hoy = hoySD()
  const contieneHoy = rango.desde <= hoy && hoy <= rango.hasta
  const ir = (nuevo: { periodo?: Periodo; fecha?: string }) =>
    setParams({ periodo: nuevo.periodo ?? periodo, fecha: nuevo.fecha ?? fecha }, { replace: true })

  return (
    <div className="flex flex-col gap-3">
      <Segmented
        label="Período"
        value={periodo}
        onChange={(v) => ir({ periodo: v })}
        options={[
          { value: 'dia', label: 'Día' },
          { value: 'semana', label: 'Semana' },
          { value: 'mes', label: 'Mes' },
        ]}
      />
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          aria-label="Período anterior"
          onClick={() => ir({ fecha: moverPeriodo(periodo, fecha, -1) })}
        >
          <ChevronLeft aria-hidden />
        </Button>
        <p className="flex-1 text-center font-semibold first-letter:uppercase" aria-live="polite">
          {etiquetaPeriodo(periodo, rango)}
        </p>
        <Button
          variant="outline"
          size="icon"
          aria-label="Período siguiente"
          onClick={() => ir({ fecha: moverPeriodo(periodo, fecha, 1) })}
        >
          <ChevronRight aria-hidden />
        </Button>
      </div>
      {!contieneHoy && (
        <Button variant="link" className="self-center" onClick={() => ir({ fecha: hoy })}>
          Volver a hoy
        </Button>
      )}
    </div>
  )
}

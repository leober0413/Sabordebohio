import { useSearchParams } from 'react-router'

import { hoySD } from '@/lib/fechas'
import { rangoDe, type Periodo, type Rango } from '@/lib/periodos'

/** Período en la URL (?periodo=semana&fecha=…), para poder volver y compartir. */
export function usePeriodo(porDefecto: Periodo): { periodo: Periodo; fecha: string; rango: Rango } {
  const [params] = useSearchParams()
  const p = params.get('periodo')
  const periodo: Periodo = p === 'dia' || p === 'semana' || p === 'mes' ? p : porDefecto
  const fecha = params.get('fecha') ?? hoySD()
  return { periodo, fecha, rango: rangoDe(periodo, fecha) }
}

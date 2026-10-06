import { Download } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { exportarGastos, exportarPagos, exportarPedidos } from '@/features/exportar/exportar'
import { mensajeError } from '@/lib/errores'
import type { Rango } from '@/lib/periodos'

const EXPORTS = [
  { clave: 'pedidos', etiqueta: 'Pedidos', fn: exportarPedidos },
  { clave: 'pagos', etiqueta: 'Pagos', fn: exportarPagos },
  { clave: 'gastos', etiqueta: 'Gastos', fn: exportarGastos },
] as const

/** FR-073: descargar el período en CSV para Excel o Google Sheets. */
export function ExportarCard({ rango }: { rango: Rango }) {
  const [ocupado, setOcupado] = useState<string | null>(null)

  const exportar = async (clave: string, etiqueta: string, fn: (r: Rango) => Promise<number>) => {
    setOcupado(clave)
    try {
      const n = await fn(rango)
      toast.success(`${etiqueta}: ${n} ${n === 1 ? 'fila' : 'filas'} descargadas`)
    } catch (error) {
      toast.error(mensajeError(error))
    } finally {
      setOcupado(null)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Exportar a CSV</CardTitle>
        <CardDescription>
          Del período elegido arriba. Se abre en Excel o Google Sheets.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-3 gap-2">
        {EXPORTS.map(({ clave, etiqueta, fn }) => (
          <Button
            key={clave}
            variant="outline"
            disabled={ocupado !== null}
            onClick={() => exportar(clave, etiqueta, fn)}
          >
            <Download aria-hidden />
            {etiqueta}
          </Button>
        ))}
      </CardContent>
    </Card>
  )
}

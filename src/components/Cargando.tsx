import { Skeleton } from '@/components/ui/skeleton'

export function CargandoLista({ filas = 3 }: { filas?: number }) {
  return (
    <div className="flex flex-col gap-3" aria-busy="true" aria-label="Cargando">
      {Array.from({ length: filas }, (_, i) => (
        <Skeleton key={i} className="h-20 w-full rounded-xl" />
      ))}
    </div>
  )
}

export function ErrorCarga({ que }: { que: string }) {
  return (
    <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
      No pudimos cargar {que}. Revisa la conexión e inténtalo de nuevo.
    </p>
  )
}

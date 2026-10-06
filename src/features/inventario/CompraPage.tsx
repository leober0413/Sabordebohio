import { useNavigate, useSearchParams } from 'react-router'

import { CargandoLista, ErrorCarga } from '@/components/Cargando'
import { PageHeader } from '@/components/PageHeader'
import { CompraForm } from '@/features/inventario/CompraForm'
import { useIngredientes } from '@/features/inventario/queries'

export function CompraPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const ingredientes = useIngredientes()
  const preseleccion = params.get('ingrediente') ?? undefined

  return (
    <section className="mx-auto flex max-w-3xl flex-col gap-4">
      <PageHeader titulo="Registrar compra" atras />
      <p className="text-sm text-muted-foreground">
        Suma al stock del ingrediente y cuenta como gasto del día.
      </p>
      {ingredientes.isPending ? (
        <CargandoLista />
      ) : ingredientes.isError ? (
        <ErrorCarga que="los ingredientes" />
      ) : ingredientes.data.length === 0 ? (
        <p className="text-muted-foreground">
          Primero crea los ingredientes en Inventario → Ingredientes.
        </p>
      ) : (
        <CompraForm
          ingredientes={ingredientes.data}
          ingredienteId={preseleccion}
          onListo={() => navigate('/inventario?tab=ingredientes', { replace: true })}
        />
      )}
    </section>
  )
}

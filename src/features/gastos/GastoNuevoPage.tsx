import { useNavigate } from 'react-router'

import { CargandoLista } from '@/components/Cargando'
import { PageHeader } from '@/components/PageHeader'
import { GastoForm } from '@/features/gastos/GastoForm'
import { useCategorias } from '@/features/gastos/queries'

export function GastoNuevoPage() {
  const navigate = useNavigate()
  const categorias = useCategorias()
  return (
    <section className="mx-auto flex max-w-3xl flex-col gap-4">
      <PageHeader titulo="Registrar gasto" atras />
      {categorias.isPending ? (
        <CargandoLista filas={2} />
      ) : (
        <GastoForm
          categorias={categorias.data ?? []}
          onListo={() => navigate('/gastos', { replace: true })}
        />
      )}
    </section>
  )
}

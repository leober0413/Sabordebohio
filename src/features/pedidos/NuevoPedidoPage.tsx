import { useNavigate } from 'react-router'
import { toast } from 'sonner'

import { CargandoLista, ErrorCarga } from '@/components/Cargando'
import { PageHeader } from '@/components/PageHeader'
import { useConfigPrecios, useProductos } from '@/features/ajustes/queries'
import { PedidoForm } from '@/features/pedidos/PedidoForm'
import { useCrearPedido } from '@/features/pedidos/queries'
import { formatDinero } from '@/lib/dinero'

export function NuevoPedidoPage() {
  const navigate = useNavigate()
  const productos = useProductos()
  const config = useConfigPrecios()
  const crear = useCrearPedido()

  return (
    <section className="mx-auto flex max-w-3xl flex-col gap-4">
      <PageHeader titulo="Nuevo pedido" atras />
      {productos.isPending || config.isPending ? (
        <CargandoLista />
      ) : productos.isError || config.isError ? (
        <ErrorCarga que="los sabores y precios" />
      ) : (
        <PedidoForm
          productos={productos.data.filter((p) => p.activo)}
          config={config.data}
          textoGuardar="Guardar pedido"
          guardando={crear.isPending}
          onGuardar={(datos) =>
            crear.mutate(datos, {
              onSuccess: (pedido) => {
                toast.success(`Pedido guardado · ${formatDinero(pedido.total)}`)
                navigate('/', { replace: true })
              },
            })
          }
        />
      )}
    </section>
  )
}

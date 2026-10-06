import { useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'

import { CargandoLista, ErrorCarga } from '@/components/Cargando'
import { PageHeader } from '@/components/PageHeader'
import { useConfigPrecios, useProductos } from '@/features/ajustes/queries'
import { PedidoForm } from '@/features/pedidos/PedidoForm'
import { useActualizarPedido, usePedido } from '@/features/pedidos/queries'

export function EditarPedidoPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const pedido = usePedido(id)
  const productos = useProductos()
  const config = useConfigPrecios()
  const actualizar = useActualizarPedido()

  const cargando = pedido.isPending || productos.isPending || config.isPending
  const fallo = pedido.isError || productos.isError || config.isError

  return (
    <section className="mx-auto flex max-w-3xl flex-col gap-4">
      <PageHeader titulo="Editar pedido" atras />
      {cargando ? (
        <CargandoLista />
      ) : fallo ? (
        <ErrorCarga que="el pedido" />
      ) : !pedido.data ? (
        <p className="text-muted-foreground">Este pedido no existe.</p>
      ) : pedido.data.estado === 'entregado' || pedido.data.estado === 'cancelado' ? (
        <p className="text-muted-foreground">
          Un pedido entregado o cancelado no se puede editar. Revierte la entrega o reactívalo
          primero.
        </p>
      ) : (
        <PedidoForm
          // Sabores activos más los que ya tenía el pedido aunque estén desactivados.
          productos={productos.data.filter(
            (p) => p.activo || pedido.data!.lineas.some((l) => l.producto_id === p.id),
          )}
          config={config.data}
          valoresIniciales={{
            clienteId: pedido.data.cliente_id,
            cantidades: Object.fromEntries(
              pedido.data.lineas.map((l) => [l.producto_id, l.cantidad]),
            ),
            fechaEntrega: pedido.data.fecha_entrega,
            horaEntrega: pedido.data.hora_entrega?.slice(0, 5) ?? '',
            tipoEntrega: pedido.data.tipo_entrega,
            costoEnvio: pedido.data.costo_envio ? String(pedido.data.costo_envio) : '',
            notas: pedido.data.notas ?? '',
          }}
          textoGuardar="Guardar cambios"
          guardando={actualizar.isPending}
          onGuardar={(datos) =>
            actualizar.mutate(
              { id, version: pedido.data!.version, d: datos },
              {
                onSuccess: () => {
                  toast.success('Pedido actualizado')
                  navigate(`/pedidos/${id}`, { replace: true })
                },
              },
            )
          }
        />
      )}
    </section>
  )
}

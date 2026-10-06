import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import type { ConfigPreciosRow, Producto } from '@/features/ajustes/queries'
import { PedidoForm } from '@/features/pedidos/PedidoForm'
import { renderConProveedores } from '@/test/utils'

vi.mock('@/features/clientes/queries', () => ({
  useCliente: () => ({ data: { id: 'c1', nombre: 'María Pérez', telefono: null } }),
  useBuscarClientes: () => ({ data: [] }),
  useCrearCliente: () => ({ mutate: vi.fn(), isPending: false }),
}))

const config: ConfigPreciosRow = {
  id: 1,
  precio_suelta: 50,
  precio_docena: 550,
  minimo_docena: 6,
  redondeo: 1,
  actualizado_en: '',
  actualizado_por: null,
}
const productos = [
  { id: 'pollo', nombre: 'Pollo', activo: true, orden: 1 },
  { id: 'queso', nombre: 'Queso', activo: true, orden: 2 },
] as Producto[]

function renderForm(onGuardar = vi.fn(), conPago = false) {
  renderConProveedores(
    <PedidoForm
      productos={productos}
      config={config}
      valoresIniciales={{ clienteId: 'c1' }}
      textoGuardar="Guardar pedido"
      guardando={false}
      conPago={conPago}
      onGuardar={onGuardar}
    />,
  )
  return onGuardar
}

// docs/testing.md §3: formulario "Nuevo pedido".
describe('PedidoForm', () => {
  it('Guardar está deshabilitado sin catibías', () => {
    renderForm()
    expect(screen.getByRole('button', { name: 'Guardar pedido' })).toBeDisabled()
    expect(screen.getByText('Sin catibías')).toBeInTheDocument()
  })

  it('− / + actualiza cantidades y total, y la tarifa cambia en 6', async () => {
    const user = userEvent.setup()
    renderForm()
    const masPollo = screen.getByRole('button', { name: 'Agregar una de Pollo' })

    for (let i = 0; i < 5; i++) await user.click(masPollo)
    expect(screen.getByRole('textbox', { name: 'Cantidad de Pollo' })).toHaveValue('5')
    expect(screen.getByText('RD$250.00')).toBeInTheDocument()
    expect(screen.getByText(/Precio suelta · 5 ×/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Agregar una de Queso' }))
    expect(screen.getByText('RD$275.00')).toBeInTheDocument()
    expect(screen.getByText(/Precio de docena · 6 ×/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Quitar una de Queso' }))
    expect(screen.getByText('RD$250.00')).toBeInTheDocument()
  })

  it('envía las líneas, hoy por defecto y el envío solo con delivery', async () => {
    const user = userEvent.setup()
    const onGuardar = renderForm()
    for (let i = 0; i < 8; i++)
      await user.click(screen.getByRole('button', { name: 'Agregar una de Pollo' }))
    await user.click(screen.getByRole('radio', { name: 'Delivery' }))
    await user.type(screen.getByLabelText('Costo de envío (RD$)'), '100')
    expect(screen.getByText('RD$467.00')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Guardar pedido' }))
    await waitFor(() =>
      expect(onGuardar).toHaveBeenCalledWith(
        expect.objectContaining({
          clienteId: 'c1',
          lineas: [{ producto_id: 'pollo', cantidad: 8 }],
          tipoEntrega: 'delivery',
          costoEnvio: 100,
          horaEntrega: null,
        }),
      ),
    )
  })

  it('"Pagado" envía el pago por todo el saldo; "Por cobrar" no envía pago (FR-041)', async () => {
    const user = userEvent.setup()
    const onGuardar = renderForm(vi.fn(), true)
    await user.click(screen.getByRole('button', { name: 'Agregar una de Pollo' }))
    expect(screen.getByRole('radio', { name: 'Por cobrar' })).toHaveAttribute(
      'aria-checked',
      'true',
    )

    await user.click(screen.getByRole('radio', { name: 'Pagado' }))
    await user.click(screen.getByRole('radio', { name: 'Transferencia' }))
    await user.click(screen.getByRole('button', { name: 'Guardar pedido' }))
    await waitFor(() =>
      expect(onGuardar).toHaveBeenCalledWith(
        expect.objectContaining({ pago: { metodo: 'transferencia', monto: null } }),
      ),
    )
  })

  it('"Parcial" exige el monto', async () => {
    const user = userEvent.setup()
    const onGuardar = renderForm(vi.fn(), true)
    await user.click(screen.getByRole('button', { name: 'Agregar una de Pollo' }))
    await user.click(screen.getByRole('radio', { name: 'Parcial' }))
    await user.click(screen.getByRole('button', { name: 'Guardar pedido' }))
    expect(await screen.findByText('Escribe cuánto pagó, por ejemplo 200.')).toBeInTheDocument()
    expect(onGuardar).not.toHaveBeenCalled()

    await user.type(screen.getByLabelText('Cuánto pagó (RD$)'), '20')
    await user.click(screen.getByRole('button', { name: 'Guardar pedido' }))
    await waitFor(() =>
      expect(onGuardar).toHaveBeenCalledWith(
        expect.objectContaining({ pago: { metodo: 'efectivo', monto: 20 } }),
      ),
    )
  })
})

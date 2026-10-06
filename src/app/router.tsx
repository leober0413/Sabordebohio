import { createBrowserRouter } from 'react-router'

import { AppLayout } from '@/app/AppLayout'
import { ActividadPage } from '@/features/actividad/ActividadPage'
import { NotFoundPage } from '@/app/NotFoundPage'
import { AjustesPage } from '@/features/ajustes/AjustesPage'
import { LoginPage } from '@/features/auth/LoginPage'
import { ClientePage } from '@/features/clientes/ClientePage'
import { ClientesPage } from '@/features/clientes/ClientesPage'
import { FiadoPage } from '@/features/clientes/FiadoPage'
import { RequireDueno } from '@/features/auth/RequireDueno'
import { FinanzasPage } from '@/features/finanzas/FinanzasPage'
import { GastoNuevoPage } from '@/features/gastos/GastoNuevoPage'
import { GastosPage } from '@/features/gastos/GastosPage'
import { HoyPage } from '@/features/hoy/HoyPage'
import { CompraPage } from '@/features/inventario/CompraPage'
import { IngredientePage } from '@/features/inventario/IngredientePage'
import { InventarioPage } from '@/features/inventario/InventarioPage'
import { SaborInventarioPage } from '@/features/inventario/SaborInventarioPage'
import { TandaPage } from '@/features/inventario/TandaPage'
import { MasPage } from '@/features/mas/MasPage'
import { EditarPedidoPage } from '@/features/pedidos/EditarPedidoPage'
import { NuevoPedidoPage } from '@/features/pedidos/NuevoPedidoPage'
import { PedidoDetallePage } from '@/features/pedidos/PedidoDetallePage'
import { PedidosPage } from '@/features/pedidos/PedidosPage'

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    element: (
      <RequireDueno>
        <AppLayout />
      </RequireDueno>
    ),
    children: [
      { index: true, element: <HoyPage /> },
      { path: 'pedidos', element: <PedidosPage /> },
      { path: 'pedidos/nuevo', element: <NuevoPedidoPage /> },
      { path: 'pedidos/:id', element: <PedidoDetallePage /> },
      { path: 'pedidos/:id/editar', element: <EditarPedidoPage /> },
      { path: 'inventario', element: <InventarioPage /> },
      { path: 'inventario/sabores/:id', element: <SaborInventarioPage /> },
      { path: 'inventario/ingredientes/:id', element: <IngredientePage /> },
      { path: 'compras/nueva', element: <CompraPage /> },
      { path: 'tandas/nueva', element: <TandaPage /> },
      { path: 'fiado', element: <FiadoPage /> },
      { path: 'clientes', element: <ClientesPage /> },
      { path: 'clientes/:id', element: <ClientePage /> },
      { path: 'gastos', element: <GastosPage /> },
      { path: 'gastos/nuevo', element: <GastoNuevoPage /> },
      { path: 'finanzas', element: <FinanzasPage /> },
      { path: 'actividad', element: <ActividadPage /> },
      { path: 'mas', element: <MasPage /> },
      { path: 'ajustes', element: <AjustesPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])

import { createBrowserRouter } from 'react-router'

import { AppLayout } from '@/app/AppLayout'
import { NotFoundPage } from '@/app/NotFoundPage'
import { AjustesPage } from '@/features/ajustes/AjustesPage'
import { LoginPage } from '@/features/auth/LoginPage'
import { RequireDueno } from '@/features/auth/RequireDueno'
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
      { path: 'mas', element: <MasPage /> },
      { path: 'ajustes', element: <AjustesPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])

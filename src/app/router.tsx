import { createBrowserRouter } from 'react-router'

import { AppLayout } from '@/app/AppLayout'
import { NotFoundPage } from '@/app/NotFoundPage'
import { AjustesPage } from '@/features/ajustes/AjustesPage'
import { LoginPage } from '@/features/auth/LoginPage'
import { RequireDueno } from '@/features/auth/RequireDueno'
import { HoyPage } from '@/features/hoy/HoyPage'

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
      { path: 'ajustes', element: <AjustesPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])

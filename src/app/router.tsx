import { createBrowserRouter } from 'react-router'

import { AppLayout } from '@/app/AppLayout'
import { NotFoundPage } from '@/app/NotFoundPage'
import { HoyPage } from '@/features/hoy/HoyPage'

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { index: true, element: <HoyPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])

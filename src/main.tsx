import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { toast } from 'sonner'
import { registerSW } from 'virtual:pwa-register'

import { App } from '@/app/App'
import { iniciarActualizaciones } from '@/lib/actualizaciones'
import '@/index.css'

iniciarActualizaciones({
  registrar: registerSW,
  avisar: (actualizar) =>
    toast('Hay una versión nueva de la app', {
      duration: Infinity,
      action: { label: 'Actualizar', onClick: actualizar },
    }),
  documento: document,
  programar: (fn, ms) => window.setInterval(fn, ms),
  enLinea: () => navigator.onLine,
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

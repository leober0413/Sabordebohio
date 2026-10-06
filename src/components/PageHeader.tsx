import { ArrowLeft } from 'lucide-react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router'

import { Button } from '@/components/ui/button'

/** Título de pantalla con botón "Atrás" opcional. */
export function PageHeader({
  titulo,
  atras,
  children,
}: {
  titulo: string
  atras?: boolean
  children?: ReactNode
}) {
  const navigate = useNavigate()
  return (
    <div className="flex items-center gap-2">
      {atras && (
        <Button variant="ghost" size="icon" aria-label="Atrás" onClick={() => navigate(-1)}>
          <ArrowLeft aria-hidden />
        </Button>
      )}
      <h1 className="flex-1 text-2xl font-bold sm:text-3xl">{titulo}</h1>
      {children}
    </div>
  )
}

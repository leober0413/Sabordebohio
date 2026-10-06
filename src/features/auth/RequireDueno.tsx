import type { User } from '@supabase/supabase-js'
import { LogOut, ShieldAlert } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { guiaPospuesta, posponerGuia, tieneClaveTemporal } from '@/features/auth/clave'
import { GuiaClave } from '@/features/auth/GuiaClave'
import { cerrarSesion, usePerfil, useSession } from '@/features/auth/hooks'

/** Deja pasar solo a dueños (FR-080). Sin sesión → login; sin perfil → aviso. */
export function RequireDueno({ children }: { children: ReactNode }) {
  const session = useSession()
  const location = useLocation()
  const perfil = usePerfil()

  if (session === undefined || (session && perfil.isPending)) {
    return (
      <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 pt-20" aria-busy="true">
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" replace state={{ desde: location.pathname }} />
  }

  if (perfil.isError || !perfil.data) {
    return (
      <main className="flex min-h-dvh items-center justify-center px-4">
        <div className="flex max-w-sm flex-col items-center gap-4 text-center">
          <ShieldAlert className="size-12 text-destructive" aria-hidden />
          <h1 className="text-2xl font-bold">Esta cuenta no tiene acceso</h1>
          <p className="text-muted-foreground">
            {perfil.isError
              ? 'No pudimos comprobar tu cuenta. Revisa la conexión e inténtalo de nuevo.'
              : `${session.user.email} no está registrada como dueña de Sabor de Bohío.`}
          </p>
          <Button variant="outline" onClick={cerrarSesion}>
            <LogOut aria-hidden />
            Cerrar sesión
          </Button>
        </div>
      </main>
    )
  }

  return (
    <ConGuiaClave user={session.user} nombre={perfil.data.nombre}>
      {children}
    </ConGuiaClave>
  )
}

/**
 * Si la cuenta tiene contraseña temporal, muestra la guía antes que la app.
 * Se decide al montar: al cambiar la contraseña la marca se quita, pero la guía
 * sigue hasta su último paso.
 */
function ConGuiaClave({
  user,
  nombre,
  children,
}: {
  user: User
  nombre: string
  children: ReactNode
}) {
  const [guia, setGuia] = useState(() => tieneClaveTemporal(user) && !guiaPospuesta(user.id))

  if (!guia) return children
  return (
    <GuiaClave
      nombre={nombre}
      email={user.email}
      onPosponer={() => {
        posponerGuia(user.id)
        setGuia(false)
      }}
      onTerminar={() => setGuia(false)}
    />
  )
}

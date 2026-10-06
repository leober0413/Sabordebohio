import { LogOut } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cerrarSesion, usePerfil, useSession } from '@/features/auth/hooks'
import { PreciosCard } from '@/features/ajustes/PreciosCard'
import { SaboresCard } from '@/features/ajustes/SaboresCard'

export function AjustesPage() {
  const session = useSession()
  const perfil = usePerfil()

  return (
    <section className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold">Ajustes</h1>
      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <PreciosCard />
        <SaboresCard />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Cuenta</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-medium">{perfil.data?.nombre}</p>
            <p className="text-sm text-muted-foreground">{session?.user.email}</p>
          </div>
          <Button variant="outline" onClick={cerrarSesion}>
            <LogOut aria-hidden />
            Cerrar sesión
          </Button>
        </CardContent>
      </Card>
    </section>
  )
}

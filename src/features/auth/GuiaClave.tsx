import { ArrowLeft, CircleCheck, KeyRound } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { CambiarPassword } from '@/features/auth/CambiarPassword'
import { cn } from '@/lib/utils'

const PASOS = 3

interface GuiaClaveProps {
  nombre: string
  email: string | undefined
  /** "Ahora no": deja usar la app y la guía vuelve la próxima vez que se abra. */
  onPosponer: () => void
  onTerminar: () => void
}

/**
 * Primer inicio de un dueño creado con contraseña temporal (crear-dueno.yml):
 * lo lleva paso a paso a cambiarla antes de usar la app.
 */
export function GuiaClave({ nombre, email, onPosponer, onTerminar }: GuiaClaveProps) {
  const [paso, setPaso] = useState(1)
  const titulo = useRef<HTMLHeadingElement>(null)

  // Al cambiar de paso, el lector de pantalla empieza por el título nuevo.
  useEffect(() => {
    if (paso > 1) titulo.current?.focus()
  }, [paso])

  return (
    <main className="flex min-h-dvh justify-center px-4 py-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-muted-foreground">
            Paso {paso} de {PASOS}
          </p>
          <div className="flex gap-1.5" aria-hidden>
            {Array.from({ length: PASOS }, (_, i) => (
              <span
                key={i}
                className={cn('h-1.5 flex-1 rounded-full', i < paso ? 'bg-primary' : 'bg-muted')}
              />
            ))}
          </div>
        </div>

        {paso === 1 && (
          <>
            <div className="flex flex-col items-center gap-3 text-center">
              <img src="/favicon.svg" alt="" className="size-16" />
              <h1 className="text-3xl font-bold">Hola, {nombre}</h1>
              <p className="text-lg">Te damos la bienvenida a Sabor de Bohío.</p>
            </div>
            <div className="flex gap-3 rounded-xl bg-secondary p-4 text-secondary-foreground">
              <KeyRound className="mt-0.5 size-5 shrink-0" aria-hidden />
              <p>
                Entraste con una <strong>contraseña temporal</strong>. Antes de empezar, cámbiala
                por una que solo sepas tú: así nadie más puede ver los pedidos ni el dinero del
                negocio. Es un minuto.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <Button size="lg" className="w-full" onClick={() => setPaso(2)}>
                Cambiar mi contraseña
              </Button>
              <Button variant="ghost" className="min-h-11 w-full" onClick={onPosponer}>
                Ahora no
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                Si eliges "Ahora no", te lo recordamos la próxima vez que abras la app.
              </p>
            </div>
          </>
        )}

        {paso === 2 && (
          <>
            <div className="flex flex-col gap-3">
              <h1 ref={titulo} tabIndex={-1} className="text-3xl font-bold outline-none">
                Elige tu contraseña nueva
              </h1>
              <ul className="flex list-disc flex-col gap-1 pl-5 text-muted-foreground">
                <li>Que tenga al menos 8 caracteres.</li>
                <li>Una frase fácil de recordar sirve, por ejemplo tres palabras juntas.</li>
                <li>No uses la temporal ni se la digas a nadie.</li>
              </ul>
            </div>
            <CambiarPassword enGuia onListo={() => setPaso(3)} />
            <Button variant="ghost" className="min-h-11 self-start" onClick={() => setPaso(1)}>
              <ArrowLeft aria-hidden />
              Atrás
            </Button>
          </>
        )}

        {paso === 3 && (
          <>
            <div className="flex flex-col items-center gap-3 text-center">
              <CircleCheck className="size-16 text-primary" aria-hidden />
              <h1 ref={titulo} tabIndex={-1} className="text-3xl font-bold outline-none">
                ¡Listo!
              </h1>
              <p className="text-lg">Tu contraseña quedó cambiada.</p>
            </div>
            <div className="flex flex-col gap-2 rounded-xl bg-secondary p-4 text-secondary-foreground">
              <p>
                La próxima vez entra con tu correo
                {email && (
                  <>
                    {' '}
                    <strong className="break-words">{email}</strong>
                  </>
                )}{' '}
                y la contraseña nueva. Guárdala en un lugar seguro.
              </p>
              <p>Si la quieres cambiar otra vez, está en Ajustes → Cuenta.</p>
            </div>
            <Button size="lg" className="w-full" onClick={onTerminar}>
              Empezar a usar la app
            </Button>
          </>
        )}
      </div>
    </main>
  )
}

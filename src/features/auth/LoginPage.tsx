import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, EyeOff, LogIn } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Navigate, useLocation } from 'react-router'

import { FieldError } from '@/components/FieldError'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useSession } from '@/features/auth/hooks'
import { loginSchema, type LoginValues } from '@/features/auth/schemas'
import { mensajeError } from '@/lib/errores'
import { supabase } from '@/lib/supabase'

export function LoginPage() {
  const session = useSession()
  const location = useLocation()
  const [errorLogin, setErrorLogin] = useState<string | null>(null)
  const [verClave, setVerClave] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) })

  if (session) {
    const destino = (location.state as { desde?: string } | null)?.desde ?? '/'
    return <Navigate to={destino} replace />
  }

  const onSubmit = async (values: LoginValues) => {
    setErrorLogin(null)
    const { error } = await supabase.auth.signInWithPassword(values)
    if (error) {
      setErrorLogin(
        error.code === 'invalid_credentials'
          ? 'Correo o contraseña incorrectos. Revisa mayúsculas y signos de la contraseña.'
          : mensajeError(error),
      )
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="flex w-full max-w-sm flex-col gap-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <img src="/favicon.svg" alt="" className="size-16" />
          <h1 className="text-3xl font-bold">Sabor de Bohío</h1>
          <p className="text-muted-foreground">Entra con tu cuenta para ver los pedidos.</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Correo</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              inputMode="email"
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? 'email-error' : undefined}
              {...register('email')}
            />
            <FieldError id="email-error" message={errors.email?.message} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Contraseña</Label>
            <div className="relative">
              <Input
                id="password"
                type={verClave ? 'text' : 'password'}
                autoComplete="current-password"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                className="pr-12"
                aria-invalid={!!errors.password}
                aria-describedby={errors.password ? 'password-error' : undefined}
                {...register('password')}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute top-0 right-0 size-11"
                aria-label={verClave ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                aria-pressed={verClave}
                onClick={() => setVerClave((v) => !v)}
              >
                {verClave ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
              </Button>
            </div>
            <FieldError id="password-error" message={errors.password?.message} />
          </div>

          {errorLogin && (
            <p
              role="alert"
              className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {errorLogin}
            </p>
          )}

          <Button type="submit" size="lg" disabled={isSubmitting}>
            <LogIn aria-hidden />
            {isSubmitting ? 'Entrando…' : 'Entrar'}
          </Button>
        </form>
      </div>
    </main>
  )
}

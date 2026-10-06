import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'

import { FieldError } from '@/components/FieldError'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cambioPasswordSchema, type CambioPasswordValues } from '@/features/auth/schemas'
import { mensajeError } from '@/lib/errores'
import { supabase } from '@/lib/supabase'

/** Para cambiar la contraseña temporal con la que se crea cada dueño. */
export function CambiarPassword() {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CambioPasswordValues>({ resolver: zodResolver(cambioPasswordSchema) })

  const onSubmit = async ({ password }: CambioPasswordValues) => {
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      toast.error(
        error.code === 'same_password'
          ? 'La contraseña nueva es igual a la actual.'
          : mensajeError(error),
      )
      return
    }
    reset({ password: '', confirmar: '' })
    toast.success('Contraseña cambiada')
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="password-nueva">Contraseña nueva</Label>
          <Input
            id="password-nueva"
            type="password"
            autoComplete="new-password"
            aria-invalid={!!errors.password}
            aria-describedby={errors.password ? 'password-nueva-error' : undefined}
            {...register('password')}
          />
          <FieldError id="password-nueva-error" message={errors.password?.message} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="password-confirmar">Repítela</Label>
          <Input
            id="password-confirmar"
            type="password"
            autoComplete="new-password"
            aria-invalid={!!errors.confirmar}
            aria-describedby={errors.confirmar ? 'password-confirmar-error' : undefined}
            {...register('confirmar')}
          />
          <FieldError id="password-confirmar-error" message={errors.confirmar?.message} />
        </div>
      </div>
      <Button type="submit" variant="secondary" className="self-start" disabled={isSubmitting}>
        {isSubmitting ? 'Cambiando…' : 'Cambiar contraseña'}
      </Button>
    </form>
  )
}

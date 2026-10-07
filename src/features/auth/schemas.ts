import { z } from 'zod'

export const loginSchema = z.object({
  // El teclado del celular suele agregar un espacio al final del correo.
  email: z.string().trim().toLowerCase().pipe(z.email('Escribe un correo válido.')),
  password: z.string().min(1, 'Escribe tu contraseña.'),
})

export type LoginValues = z.infer<typeof loginSchema>

export const cambioPasswordSchema = z
  .object({
    password: z.string().min(8, 'Usa al menos 8 caracteres.'),
    confirmar: z.string(),
  })
  .refine((v) => v.password === v.confirmar, {
    path: ['confirmar'],
    message: 'Las contraseñas no coinciden.',
  })

export type CambioPasswordValues = z.infer<typeof cambioPasswordSchema>

import { z } from 'zod'

export const loginSchema = z.object({
  email: z.email('Escribe un correo válido.'),
  password: z.string().min(1, 'Escribe tu contraseña.'),
})

export type LoginValues = z.infer<typeof loginSchema>

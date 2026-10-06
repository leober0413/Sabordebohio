import { describe, expect, it } from 'vitest'

import { mensajeError } from '@/lib/errores'

describe('mensajeError', () => {
  it('muestra tal cual los errores de negocio de las RPC', () => {
    const msg = 'Configura el precio suelta en Ajustes para vender menos de 6 catibías.'
    expect(mensajeError({ code: '22023', message: msg })).toBe(msg)
  })

  it('traduce errores conocidos de Postgres', () => {
    expect(mensajeError({ code: '23505', message: 'duplicate key' })).toBe(
      'Ya existe uno con ese nombre.',
    )
    expect(mensajeError({ code: '42501', message: 'permission denied' })).toBe(
      'No tienes permiso para hacer esto.',
    )
  })

  it('no muestra mensajes técnicos en inglés', () => {
    expect(mensajeError(new Error('Something exploded'))).toBe(
      'Algo salió mal. Inténtalo de nuevo.',
    )
    expect(mensajeError(new TypeError('Failed to fetch'))).toBe(
      'No hay conexión. Revisa el internet e inténtalo de nuevo.',
    )
  })
})

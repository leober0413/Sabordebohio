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
  })

  it('sin conexión al servidor, en cualquier navegador', () => {
    const conexion = 'No pudimos conectar con el servidor. Revisa el internet e inténtalo de nuevo.'
    expect(mensajeError(new TypeError('Failed to fetch'))).toBe(conexion) // Chrome
    expect(mensajeError(new TypeError('Load failed'))).toBe(conexion) // Safari
    expect(mensajeError(new TypeError('NetworkError when attempting to fetch resource.'))).toBe(
      conexion,
    ) // Firefox
    const auth = Object.assign(new Error('Load failed'), { name: 'AuthRetryableFetchError' })
    expect(mensajeError(auth)).toBe(conexion)
  })
})

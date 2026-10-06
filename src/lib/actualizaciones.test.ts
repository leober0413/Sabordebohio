import { describe, expect, it, vi } from 'vitest'

import { CADA_MS, iniciarActualizaciones, type Dependencias } from '@/lib/actualizaciones'

function preparar() {
  const oyentes: Array<() => void> = []
  const documento = {
    visibilityState: 'visible' as DocumentVisibilityState,
    addEventListener: (_tipo: string, fn: () => void) => oyentes.push(fn),
  }
  const cambiarVisibilidad = (estado: DocumentVisibilityState) => {
    documento.visibilityState = estado
    oyentes.forEach((fn) => fn())
  }
  const actualizarSW = vi.fn(async () => {})
  let opciones: Parameters<Dependencias['registrar']>[0] = {}
  const deps: Dependencias = {
    registrar: (o) => {
      opciones = o
      return actualizarSW
    },
    avisar: vi.fn(),
    documento: documento as unknown as Dependencias['documento'],
    programar: vi.fn(),
    enLinea: () => true,
  }
  iniciarActualizaciones(deps)
  return { deps, opciones: () => opciones, actualizarSW, cambiarVisibilidad }
}

describe('actualizaciones de la PWA', () => {
  it('registra de inmediato y revisa cada 30 minutos y al volver a la app', () => {
    const { deps, opciones, cambiarVisibilidad } = preparar()
    expect(opciones().immediate).toBe(true)

    const registro = { update: vi.fn(async () => {}) }
    opciones().onRegisteredSW?.('/sw.js', registro as unknown as ServiceWorkerRegistration)
    expect(deps.programar).toHaveBeenCalledWith(expect.any(Function), CADA_MS)

    cambiarVisibilidad('visible')
    expect(registro.update).toHaveBeenCalledTimes(1)
  })

  it('con versión nueva avisa, y "Actualizar" recarga', () => {
    const { deps, opciones, actualizarSW } = preparar()
    opciones().onNeedRefresh?.()
    expect(deps.avisar).toHaveBeenCalledTimes(1)

    const actualizar = vi.mocked(deps.avisar).mock.calls[0][0]
    actualizar()
    expect(actualizarSW).toHaveBeenCalledWith(true)
  })

  it('no recarga mientras se usa la app; aplica la versión nueva al salir', () => {
    const { opciones, actualizarSW, cambiarVisibilidad } = preparar()
    cambiarVisibilidad('hidden')
    expect(actualizarSW).not.toHaveBeenCalled() // sin versión nueva, nada

    opciones().onNeedRefresh?.()
    expect(actualizarSW).not.toHaveBeenCalled() // visible: solo avisa
    cambiarVisibilidad('hidden')
    expect(actualizarSW).toHaveBeenCalledWith(true)
  })
})

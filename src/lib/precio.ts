/**
 * BR-012 · Precio por cantidad. Réplica de `calcular_precio` (SQL) solo para
 * mostrar el total en vivo: el valor que se guarda siempre lo calcula el
 * servidor. Los dos pasan la misma tabla de casos (docs/testing.md).
 *
 * Se calcula en centavos con enteros para que el redondeo coincida exactamente
 * con `numeric` de Postgres (mitades hacia arriba).
 */

export type Tarifa = 'suelta' | 'docena'

export interface ConfigPrecios {
  precioSuelta: number | null
  precioDocena: number
  minimoDocena: number
  redondeo: number
}

export type ResultadoPrecio =
  | {
      ok: true
      subtotal: number
      tarifa: Tarifa
      /** Precio por catibía que se aplicó (FR-004), con 2 decimales. */
      precioUnitario: number
      /** Cuánto se ahorra frente al precio suelta; 0 si no aplica. */
      ahorro: number
    }
  | { ok: false; error: string }

const aCentavos = (pesos: number) => Math.round(pesos * 100)

export function calcularPrecio(unidades: number, cfg: ConfigPrecios): ResultadoPrecio {
  if (!Number.isInteger(unidades) || unidades < 1) {
    return { ok: false, error: 'El pedido debe tener al menos una catibía.' }
  }

  const sueltaCts = cfg.precioSuelta === null ? null : aCentavos(cfg.precioSuelta)

  if (unidades < cfg.minimoDocena) {
    if (sueltaCts === null) {
      return {
        ok: false,
        error: `Configura el precio suelta en Ajustes para vender menos de ${cfg.minimoDocena} catibías.`,
      }
    }
    return {
      ok: true,
      subtotal: (unidades * sueltaCts) / 100,
      tarifa: 'suelta',
      precioUnitario: sueltaCts / 100,
      ahorro: 0,
    }
  }

  // round((n × docena / 12) / redondeo) × redondeo, con mitades hacia arriba.
  const numerador = unidades * aCentavos(cfg.precioDocena)
  const denominador = 12 * cfg.redondeo * 100
  const pasos = Math.floor((2 * numerador + denominador) / (2 * denominador))
  const subtotal = pasos * cfg.redondeo
  const ahorro = sueltaCts === null ? 0 : Math.max(0, (unidades * sueltaCts) / 100 - subtotal)

  return {
    ok: true,
    subtotal,
    tarifa: 'docena',
    precioUnitario: Math.round(aCentavos(cfg.precioDocena) / 12) / 100,
    ahorro,
  }
}

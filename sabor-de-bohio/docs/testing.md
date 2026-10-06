# Testing Strategy — "Sabor de Bohío"

**Última actualización:** 2026-10-06
**Status:** PROVISIONALLY SELECTED

> Probar más donde un error cuesta dinero o confianza: precios, stock, pagos/fiado y seguridad. No se persigue un porcentaje de cobertura.

## Prioridad por riesgo

| Riesgo | Por qué importa | Cómo se prueba | Prioridad |
|---|---|---|---|
| Precio mal calculado (BR-012) | Se cobra de más o de menos en cada pedido | Pruebas SQL de `calcular_precio` + pruebas TS de la versión del cliente con **la misma tabla de casos** | Must |
| Stock descuadrado (BR-005 a BR-008) | Si el stock miente, dejan de usar la app | Pruebas SQL de `cambiar_estado`, `registrar_tanda`, ajustes, conteos | Must |
| Pagos, saldos y abonos (BR-003, BR-004, DEC-003) | Fiado mal llevado = dinero perdido | Pruebas SQL de `registrar_pago`, `registrar_abono` (reparto), anulaciones | Must |
| Acceso indebido (RLS) | Datos de clientes y finanzas expuestos | Pruebas SQL con usuario no dueño y anónimo; escritura directa a tablas protegidas debe fallar | Must |
| Atomicidad (NFR-R-001) | Operaciones a medias | Pruebas que fuerzan error a mitad de una RPC y verifican que no quedó nada | Should |
| Concurrencia (NFR-R-003) | Cambios pisados entre los dos dueños | Prueba de `actualizar_pedido` con `version` vieja | Should |
| Resumen financiero | Decisiones con números erróneos | Pruebas SQL de `resumen_financiero` con datos fijos | Should |
| Flujos críticos en la UI | Romper el día a día | 3 pruebas E2E (abajo) | Should |
| Velocidad de registro (NFR-U-001) | Si es lento, vuelven a la memoria | Prueba de usabilidad con cronómetro | Must (manual) |

## Niveles

### 1. Base de datos — pgTAP (`supabase test db`)

- Archivos en `supabase/tests/*.test.sql`, corren contra Supabase local con migraciones y seed aplicados.
- **Cada migración que agrega una RPC o una política RLS agrega sus pruebas en el mismo PR.**
- Casos obligatorios de precio (docena RD$550, mínimo 6, suelta RD$50, redondeo 1):

| Unidades | Esperado |
|---|---|
| 0 | error o 0 según contexto (pedido sin catibías no se puede crear) |
| 1 | 50 |
| 5 | 250 |
| 6 | 275 |
| 7 | 321 |
| 8 | 367 |
| 9 | 413 |
| 12 | 550 |
| 18 | 825 |
| 24 | 1100 |
| 8 con redondeo 5 | 365 |
| 8 con redondeo 10 | 370 |
| 3 sin precio suelta configurado | error "Configura el precio suelta" |

### 2. Lógica del frontend — Vitest

- `src/lib/precio.ts` (cálculo en vivo) con la **misma tabla** de casos que la prueba SQL.
- Formateo de dinero (RD$), fechas en `America/Santo_Domingo`, cálculo de "atrasado".

### 3. Componentes — Vitest + React Testing Library

- Formulario "Nuevo pedido": − / + actualiza cantidades y total; etiqueta de tarifa cambia en 6; botón Guardar deshabilitado sin catibías.
- Solo para formularios con lógica; no se prueban componentes de presentación.

### 4. End-to-end — Playwright (en CI)

Contra Supabase local con seed:
1. Crear pedido de 8 catibías → total correcto → marcar listo → entregar → el stock baja 8.
2. Cliente con dos pedidos fiados → abono → se aplica al más viejo primero.
3. Registrar conteo de queso bajo el mínimo → aparece la alerta en "Hoy" → registrar compra → la alerta desaparece.

Se ejecutan en GitHub Actions. En las sesiones de Claude Code en la nube se corren solo si el navegador de Playwright se puede instalar con la red del entorno; si no, CI es la referencia.

### 5. Usabilidad — manual

- Con el prototipo y luego con la app real: registrar 5 pedidos reales de WhatsApp cronometrando. Meta: < 30 s cada uno.
- Al final de las 2 semanas de uso en paralelo: revisar criterios de éxito de `mvp.md`.

## CI (GitHub Actions)

| Workflow | Cuándo | Pasos |
|---|---|---|
| `ci.yml` | Cada PR | install → lint → typecheck → Vitest → `supabase start` → `supabase test db` → build → Playwright |
| `deploy.yml` | Merge a `main` | `supabase db push` → build → publicar frontend |
| `backup.yml` | Diario | `supabase db dump` cifrado como artefacto (si el plan de Supabase no cubre copias) |

Un PR no se mergea con CI en rojo.

## Fuera de alcance

- Pruebas de carga (volumen trivial, NFR-S-001).
- Pruebas visuales automatizadas.
- Metas de cobertura.

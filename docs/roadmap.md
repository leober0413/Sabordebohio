# Roadmap — "Sabor de Bohío"

**Última actualización:** 2026-10-06
**Status:** PROVISIONALLY SELECTED

> Principio: **usar la app de verdad lo antes posible.** Al terminar la Fase 2 ya se registran pedidos reales; lo demás se suma encima.

Tamaños relativos: **S** (una sesión corta), **M** (una o dos sesiones), **L** (varias sesiones). Cada fase termina con un PR mergeado y CI en verde.

## Fase 0 — Fundaciones (M) · ✅ terminada (2026-10-06)

**Objetivo:** repo listo para que cualquier sesión de Claude Code en la nube trabaje sin preguntar nada.

- Proyecto Vite + React + TypeScript; Tailwind; shadcn/ui; Lucide; Sonner; React Router; TanStack Query; React Hook Form + Zod; `vite-plugin-pwa`.
- Tema visual de `docs/ui-ux.md` (paleta cálida, Bricolage Grotesque + Figtree, claro/oscuro).
- `npx supabase init`; `config.toml` con registro público desactivado; Supabase CLI como devDependency.
- `.claude/settings.json` con hook SessionStart que ejecuta `scripts/session-start.sh` (arranca Supabase local y aplica migraciones).
- ESLint + Prettier; Vitest; Playwright.
- `ci.yml`. `deploy.yml` preparado (se activa en Fase 2).
- Elegir hosting del frontend: Cloudflare Pages o Vercel (cerrar DEC-002). → **Vercel.**
- **Validar DEC-005:** `supabase start` funciona en la sesión en la nube. → **Validado** (ver DEC-005).

**Hecho cuando:** CI pasa en un PR vacío; `supabase start` funciona en la nube; la app muestra una pantalla vacía con el tema aplicado e instalable como PWA.

## Fase 1 — Esquema base, login y ajustes (M) · ✅ terminada (2026-10-06)

- Migraciones: tipos, `perfiles`, `es_dueno()`, `config_precios`, `productos`, `clientes`, `categorias_gasto`, RLS de todo lo anterior.
- `calcular_precio` + pruebas pgTAP de la tabla de precios; `src/lib/precio.ts` + pruebas Vitest con los mismos casos.
- Pantalla de login (correo y contraseña) y sesión persistente (FR-080, FR-081).
- Ajustes: sabores (crear, desactivar, mínimo), lista de precios (suelta, docena, mínimo, redondeo).
- Seed de desarrollo.

**Hecho cuando:** un dueño entra, configura precios y sabores; un usuario no dueño no ve nada (prueba RLS).

## Fase 2 — Pedidos y "Hoy" (L) · primer uso real · ✅ código terminado (2026-10-06); falta el despliegue (pasos del dueño en `despliegue.md`)

- Migraciones: `pedidos`, `pedido_lineas`, `tandas`, `movimientos_producto`, vistas `v_pedidos` y `v_stock_productos`.
- RPC: `crear_pedido`, `actualizar_pedido`, `cambiar_estado` (incluye "Hecho al momento"), `registrar_tanda`.
- Pantallas: **Hoy**, **Nuevo pedido**, lista de pedidos por día, detalle/edición, registrar tanda. Navegación inferior y botón +.
- "Deshacer" en cambios de estado.
- Activar `deploy.yml`; crear proyecto de producción y los dos usuarios reales. → `deploy.yml` activo (se salta sin secretos), `config-auth.yml` y `crear-dueno.yml` listos; las cuentas las crea el dueño (`despliegue.md`).
- E2E 1.

**Hecho cuando:** los dueños registran pedidos reales desde sus celulares y el stock de catibías se mueve solo. **Empieza el uso en paralelo con la memoria.**

## Fase 3 — Pagos y fiado (M) · ✅ terminada (2026-10-06)

- Migraciones: `pagos`, `abonos`, vista `v_saldos_clientes`.
- RPC: `registrar_pago`, `registrar_abono`, `anular_pago`, `anular_abono`; pago inicial en `crear_pedido`.
- UI: cobrar al crear o entregar ("pagado completo" de un toque), estado de pago en tarjetas, lista de fiado, ficha de cliente, registrar abono.
- E2E 2.

**Hecho cuando:** se puede responder "¿quién nos debe?" en menos de un minuto.

## Fase 4 — Inventario y alertas (M) · ✅ terminada (2026-10-06)

- Migraciones: `ingredientes`, `compras`, `movimientos_ingrediente`, `gastos`, vistas de stock de ingredientes y `v_alertas_stock`.
- RPC: `registrar_compra`, `registrar_conteo`, `ajustar_stock_producto`.
- UI: Inventario (pestañas Catibías / Ingredientes), historial de movimientos, editar mínimos, aviso en "Hoy" y contador en el menú.
- E2E 3.

**Hecho cuando:** bajar un ingrediente del mínimo muestra la alerta y comprar la quita.

## Fase 5 — Gastos y finanzas (M) · ✅ terminada (2026-10-06)

- UI de gastos (gas, empaques…) y categorías.
- RPC `resumen_financiero` + pruebas.
- Pantalla Finanzas: Día / Semana / Mes, por sabor, por método.

**Hecho cuando:** se puede responder "¿cuánto ganamos esta semana?" en menos de un minuto.

## Fase 6 — PC, copias y cierre del MVP (S–M) · ✅ código terminado (2026-10-06); falta la revisión tras 2 semanas de uso

- Diseño de PC: menú lateral y tablas (NFR-U-005).
- Copias de seguridad: verificar plan de Supabase; si hace falta, `backup.yml`. → El plan gratuito no las incluye: `backup.yml` diario y cifrado.
- Exportar CSV (FR-073, Could).
- Revisión de los criterios de éxito tras 2 semanas de uso.

## Dependencias

```
Fase 0 → Fase 1 → Fase 2 → Fase 3
                        ↘ Fase 4 → Fase 5 → Fase 6
```
Fases 3 y 4 son independientes entre sí después de la 2.

## Mejoras posteriores al MVP

- Guía para cambiar la contraseña temporal al primer inicio (PR #10).
- Actividad: registro de quién hizo qué y cuándo, con antes → después (FR-083, DEC-007).

## Después del MVP (no planificado)

Descuento de ingredientes por receta, notificaciones push, integración con WhatsApp, catálogo público. Ver "Fuera del alcance" en `mvp.md`.

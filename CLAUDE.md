# Sabor de Bohío — instrucciones para Claude Code

App de ventas e inventario para **Sabor de Bohío**, un negocio familiar de catibías (pollo, res, queso) que vende por WhatsApp. La usan dos dueños, sobre todo desde el celular y también desde la PC. La interfaz está en español y los montos en RD$.

La fuente de verdad del proyecto está en `docs/`. Antes de cambiar algo de producto, base de datos o arquitectura, lee el documento correspondiente:
- `docs/requirements.md`: requisitos (FR/NFR) y reglas de negocio (BR). Cita los IDs en commits y PRs.
- `docs/database.md`: esquema, vistas, RPC y seguridad.
- `docs/ui-ux.md`: principios de UX, identidad visual y mapa de pantallas.
- `docs/roadmap.md`: fases. Trabaja dentro de la fase en curso.
- `docs/testing.md`: qué se prueba y cómo.
- `docs/decision-log.md`: decisiones. No contradigas una decisión ADOPTED sin proponerlo primero.

Si una tarea contradice estos documentos, dilo antes de implementarla. Cuando una decisión cambie, actualiza el documento en el mismo PR.

## Stack

React + TypeScript + Vite (PWA), Tailwind, shadcn/ui, TanStack Query, React Router, React Hook Form + Zod, Supabase (Postgres + Auth). Las pruebas usan Vitest, React Testing Library, pgTAP y Playwright.

## Comandos

```bash
scripts/session-start.sh     # lo corre el hook SessionStart: Docker + Supabase local + db reset + .env.local
npm run dev                  # app en local
npx supabase start           # Supabase local (Docker)
npx supabase db reset        # aplica migraciones + seed desde cero
npx supabase migration new <nombre>
npx supabase gen types typescript --local > src/types/database.ts
npx supabase test db         # pruebas pgTAP
npm run lint && npm run format:check && npm run typecheck && npm test
npm run test:e2e             # Playwright (build + preview en el puerto 4173)
```

## Entorno de la sesión en la nube (DEC-005)

- El hook SessionStart (`.claude/settings.json`) ejecuta `scripts/session-start.sh`. Si Supabase no responde, vuelve a ejecutarlo; el log queda en `/tmp/sabor-session-start.log`.
- La red bloquea ghcr.io, `public.ecr.aws` y `ui.shadcn.com`. Las imágenes de Supabase salen de Docker Hub (`SUPABASE_INTERNAL_IMAGE_REGISTRY=docker.io`) y los componentes de shadcn/ui se escriben a mano en `src/components/ui/` siguiendo el código de shadcn (`npx shadcn add` no funciona).
- Playwright usa el Chromium preinstalado vía `PLAYWRIGHT_CHROMIUM_EXECUTABLE=/opt/pw-browsers/chromium`. No ejecutes `playwright install`.
- `.env.local` solo tiene llaves de Supabase local y no se sube a git (lo genera `scripts/write-env.sh`).
- Cuentas del seed (solo local/CI, contraseña `bohio-local-123`): `leo@bohio.test` y `maria@bohio.test` son dueños; `ana@bohio.test` es dueña con contraseña temporal (ve la guía del primer inicio); `intruso@bohio.test` no tiene perfil y no debe ver nada.
- Ninguna función nueva es ejecutable por defecto (ni las de pgTAP): en las pruebas, `grant execute on all functions in schema pg_temp to authenticated;` para los ayudantes. Las funciones internas van en el esquema `privado`.
- Despliegue: `docs/despliegue.md`. Nunca toques los workflows de producción para que usen credenciales desde la sesión.
- Para simular un usuario en pgTAP: `select set_config('request.jwt.claims', '{"sub":"<uuid>","role":"authenticated"}', true); set local role authenticated;`.

## Reglas de Supabase (DEC-001, DEC-005), obligatorias

1. **Todo cambio de esquema es una migración** en `supabase/migrations/`: tablas, índices, funciones, triggers, RLS y grants. Nunca se edita una migración ya mergeada; si hay que corregir, se crea otra.
2. **No se toca el dashboard de Supabase** para cambiar nada.
3. Esta sesión **no tiene ni usa credenciales de producción**. Nunca ejecutes `supabase link` ni `supabase db push`. El despliegue lo hace GitHub Actions al mergear a `main`.
4. Después de cada migración, regenera `src/types/database.ts`.
5. **RLS en todas las tablas.** Las tablas `pedidos`, `pedido_lineas`, `pagos`, `abonos`, `tandas`, `movimientos_*` y `compras` solo se escriben mediante RPC `security definer` con `set search_path = ''` que verifican `es_dueno()`. El rol `authenticated` no tiene insert/update/delete directo sobre ellas.
6. **El stock no se guarda: se suma desde los movimientos.** Movimientos, pagos, abonos y compras solo se insertan. Para revertir se usa un movimiento inverso o `anulado_en`.
7. **El precio lo calcula el servidor** (`calcular_precio`, BR-012). `src/lib/precio.ts` lo replica solo para mostrarlo en vivo, y los dos deben pasar la misma tabla de casos de `docs/testing.md`.
8. Dinero en `numeric(12,2)`. Zona horaria del negocio: `America/Santo_Domingo`.
9. Los errores de negocio en las RPC usan mensajes en español claros, que la UI muestra tal cual.

## Convenciones de código

- Los nombres del dominio van en español, igual que la base de datos (`pedido`, `cliente`, `abono`). El código genérico va en inglés (`useQuery`, `Button`, `formatDate`).
- La estructura es por funcionalidad: `src/features/<pedidos|clientes|inventario|gastos|finanzas|ajustes|auth>/`. Los componentes de shadcn van en `src/components/ui/`. Los utilitarios van en `src/lib/`.
- Los datos se acceden con hooks de TanStack Query por feature. Las mutaciones llaman RPC con actualización optimista y se invalidan al terminar.
- Los formularios usan React Hook Form + Zod, con los mensajes de validación en español.
- No uses `any`. No dejes `console.log` en el código mergeado.

## Reglas de UI/UX (docs/ui-ux.md)

- Diseña primero para el celular, con 360 px de ancho. Las áreas táctiles miden al menos 44 px. En pantallas anchas se usa menú lateral.
- La meta es registrar un pedido en menos de 30 segundos (NFR-U-001). Por defecto la fecha es hoy, las cantidades se ponen con − / + y el pago es de un toque.
- Las acciones reversibles se confirman con un toast y "Deshacer", sin diálogos de "¿Está seguro?".
- Los pedidos atrasados y las alertas de stock van arriba, con icono y texto además del color.
- Los estados vacíos explican qué hacer. Usa skeletons al cargar.
- Debe funcionar en modo claro y oscuro, y el contraste del texto debe ser de al menos 4.5:1.
- El prototipo aprobado de "Hoy", "Nuevo pedido" y la vista de PC es la referencia visual.

## Pruebas (docs/testing.md)

- Cada RPC o política RLS nueva lleva sus pruebas pgTAP en el mismo PR.
- Cualquier cambio en precios, stock, pagos o abonos requiere pruebas.
- Antes de abrir un PR: lint, typecheck, Vitest y `supabase test db` en verde.

## Flujo de trabajo

- Trabaja en una rama por tarea y abre un PR pequeño con descripción en español. El PR indica la fase del roadmap y los FR/BR que cubre.
- Si algo no está en los documentos y afecta datos o dinero, pregunta antes de decidir.

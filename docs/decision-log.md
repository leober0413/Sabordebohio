# Decision Log — "Sabor de Bohío"

> Registro cronológico de decisiones. Cada decisión tiene un estado explícito del Decision Lifecycle.

## Decision Lifecycle

HYPOTHESIS → UNDER EVALUATION → PROVISIONALLY SELECTED → VALIDATED → ADOPTED

Estados alternativos: REJECTED, DEFERRED, SUPERSEDED

---

## DEC-001 — Supabase como backend (base de datos + auth), gestionado "como código" vía Supabase CLI

- **Status:** ADOPTED (2026-10-06 — confirmado por el dueño junto con DEC-002)
- **Date:** 2026-10-05
- **Domain:** stack
- **Related decisions:** DEC-002

### Decision

Usar Supabase (Postgres + Auth) como backend. Toda la configuración se gestiona desde el repositorio mediante la Supabase CLI, operada por Claude Code. No se hacen cambios de esquema ni de seguridad desde el dashboard web.

### Context

- Datos claramente relacionales: pedidos → líneas → productos, pagos, clientes, movimientos de stock (`requirements.md`, BR-001 a BR-011).
- El resumen financiero es puro agregado por período, método y producto (FR-070 a FR-072), donde SQL es la herramienta natural.
- Necesidad de autenticación para dos usuarios sin registro público (FR-080).
- Operaciones atómicas obligatorias (NFR-R-001), costo cercano a cero (NFR-C-001) y un solo desarrollador (NFR-M-001).
- El desarrollo lo hará Claude Code, que trabaja mejor cuando todo el backend es código versionado.

### Evidence

- **Known:** el dueño eligió explícitamente Supabase manejado desde la CLI.
- **Known:** el desarrollador ya tiene experiencia previa con Supabase.

### Alternatives

| Alternativa | Estado | Razón |
|---|---|---|
| Convex | REJECTED | No es SQL (finanzas más trabajosas), mayor dependencia del proveedor, curva de aprendizaje nueva. Su ventaja de tiempo real no es crítica para 2 usuarios. |
| Postgres (Neon) + Drizzle + Better Auth | REJECTED | Más piezas que integrar (auth propia) sin beneficio claro para el MVP. |
| PocketBase | REJECTED | Requiere hosting propio y es menos orientado a "configuración como código". |
| Supabase gestionado desde el dashboard | REJECTED | Los cambios hechos a clics no quedan versionados, no son reproducibles y Claude Code no los ve. |

### Reason

Cumple todos los requisitos relevantes con la menor cantidad de piezas, aprovecha la experiencia existente y, usado vía CLI, deja todo el backend versionado y manejable por Claude Code.

### Reglas de trabajo derivadas

1. **Todo cambio de esquema es una migración SQL** en `supabase/migrations/`, creada con `supabase migration new <nombre>`. Esto incluye tablas, índices, funciones, triggers, políticas RLS y grants.
2. **Prohibido cambiar esquema, RLS o auth desde el dashboard.** Si alguna vez se hace por emergencia, se captura de inmediato con `supabase db diff` como migración.
3. **Desarrollo local primero:** `supabase start` (Docker) y `supabase db reset` para aplicar migraciones y `supabase/seed.sql` desde cero.
4. **Tipos generados:** `supabase gen types typescript --local` después de cada migración. El frontend usa esos tipos.
5. **Despliegue de esquema:** `supabase db push` hacia el proyecto remoto, ejecutado por **GitHub Actions** al hacer merge a `main` (ver DEC-005). Las sesiones de desarrollo no tienen credenciales de producción.
6. **Configuración de auth** (registro público desactivado, URLs de redirección) en `supabase/config.toml`, versionada.
7. **Operaciones atómicas** (entregar pedido, registrar pago o abono) como funciones SQL (`rpc`) dentro de migraciones, no como varias llamadas sueltas desde el cliente (NFR-R-001).
8. **Secretos fuera del repo:** la `service_role` key nunca va al frontend ni a git.

### Trade-offs

- **Mejora:** reproducibilidad, historial de cambios y que Claude Code pueda leer y modificar todo el backend.
- **Más difícil:** requiere Docker en la máquina de desarrollo y disciplina para no "arreglar rápido" en el dashboard.

### Risks

- **Deriva entre local y remoto** si alguien toca el dashboard. Mitigación: regla 2 y `supabase db diff` periódico.
- **Pausa del proyecto en el plan gratuito por inactividad.** Mitigación: el uso diario lo evita; verificar las condiciones vigentes del plan al desplegar.
- **Lógica sensible en RLS mal escrita** expone datos. Mitigación: pruebas de políticas (se define en `testing.md`).

### Assumptions

- El plan gratuito de Supabase alcanza para el volumen esperado (A-01).
- Docker está disponible en la máquina de desarrollo.

### Confidence

**Alta** para la base de datos y auth. El frontend y el hosting se deciden en DEC-002.

### Trigger for Reconsideration

- Necesidad real de modo offline completo (A-02), que podría pedir otra estrategia de datos.
- Que el plan gratuito deje de cubrir el uso y el costo supere lo razonable (NFR-C-001).

---

## DEC-002 — Frontend: SPA React + Vite como PWA, con hosting estático

- **Status:** ADOPTED (2026-10-06 — el dueño acepta la recomendación sobre Next.js)
- **Date:** 2026-10-05
- **Domain:** stack
- **Related decisions:** DEC-001

### Decision

Construir el frontend como una **single-page app** con React + TypeScript + Vite, instalable como PWA (`vite-plugin-pwa`). Habla directo con Supabase mediante `supabase-js`. Se publica como sitio estático en **Vercel**, desplegado desde GitHub Actions (`deploy.yml`) con la CLI de Vercel.

Librerías propuestas: Tailwind CSS (estilos mobile-first), TanStack Query (caché y refresco de datos), React Router (navegación), React Hook Form + Zod (formularios rápidos y validados).

### Context

- Uso desde el celular, instalable y rápido (NFR-U-001 a NFR-U-003, NFR-P-001).
- Uso también desde la PC en el navegador (NFR-U-005): una SPA responsive cubre celular y PC con una sola base de código.
- App privada detrás de login: no necesita SEO ni renderizado en servidor.
- La lógica de negocio crítica vive en Postgres (funciones RPC + RLS, DEC-001), así que no se necesita un servidor propio.
- Sin modo offline (A-02 confirmado).
- Costo cercano a cero (NFR-C-001) y un solo desarrollador (NFR-M-001).

### Evidence

- **Known:** el dueño confirmó que no necesita trabajar sin internet.
- **Known:** el desarrollador tiene experiencia con React y Next.js.

### Alternatives

| Alternativa | Estado | Razón |
|---|---|---|
| Next.js (App Router) | UNDER EVALUATION (alternativa válida) | Conocido por el desarrollador, pero agrega servidor, server components y más decisiones de caché sin beneficio: no hay SEO ni lógica de servidor que justificarlo. Sería la opción si en el futuro se agregan páginas públicas (catálogo en línea). |
| App nativa (React Native / Expo) | REJECTED | Publicación en tiendas y mantenimiento extra; además obligaría a mantener una versión web aparte para la PC (NFR-U-005). Una PWA cubre ambos. |
| Flutter | REJECTED | Tecnología nueva para el desarrollador, sin ventaja para este caso. |
| Streamlit | REJECTED | Mala experiencia móvil y en formularios rápidos; no instalable como app. |

### Reason

Es la opción con menos piezas que cumple todos los requisitos: archivos estáticos + Supabase. Sin servidor que mantener, despliegue gratuito, y el stack (React + TS) es conocido y muy bien manejado por Claude Code.

### Trade-offs

- **Mejora:** simplicidad, costo cero, despliegue trivial.
- **Más difícil:** toda la seguridad depende de que RLS y las funciones SQL estén bien escritas, porque el cliente habla directo con la base de datos.

### Risks

- RLS mal configurada expone datos. Mitigación: pruebas de políticas en `testing.md`.
- PWA en iOS tiene limitaciones (notificaciones, instalación manual desde Safari). No afecta al MVP.

### Assumptions

- Los dos celulares tienen un navegador moderno.

### Confidence

**Media-alta.** Next.js también sería razonable; la diferencia es de simplicidad, no de capacidad.

### Hosting (cerrado en la Fase 0, 2026-10-06 — elección del dueño)

| Opción | Estado | Razón |
|---|---|---|
| **Vercel** | SELECTED | Elegido por el dueño. Se publica con `vercel build` + `vercel deploy --prebuilt` desde GitHub Actions, después de `supabase db push`; `vercel.json` desactiva los despliegues automáticos desde Git y redirige las rutas de la SPA a `index.html`. El token vive solo en Actions Secrets. Pasos en `docs/despliegue.md`. |
| Cloudflare Pages | REJECTED | Era la recomendación técnica (plan gratuito con uso comercial), pero el dueño prefiere Vercel. |

**Riesgo conocido:** los términos del plan Hobby de Vercel lo limitan a uso personal y no comercial. Sabor de Bohío es un negocio, así que puede requerir el plan Pro (afecta NFR-C-001). Verificar las condiciones vigentes al crear la cuenta en la Fase 2. Cambiar de hosting solo toca el último paso de `deploy.yml` y `vercel.json`.

### Trigger for Reconsideration

- Necesidad de páginas públicas, SEO o lógica de servidor (por ejemplo, un catálogo en línea o integración con WhatsApp) → reconsiderar Next.js o agregar Edge Functions de Supabase.

---

## DEC-003 — Aplicación de abonos de fiado: más viejo primero, con opción de elegir pedido

- **Status:** PROVISIONALLY SELECTED
- **Date:** 2026-10-05
- **Domain:** requirements
- **Related decisions:** FR-043, BR-004

### Decision

Un abono sin pedido indicado se aplica a los pedidos pendientes del cliente, del más viejo al más nuevo. El dueño puede elegir un pedido específico si el cliente lo indica.

### Context

Los dueños no tienen una regla definida para esto.

### Alternatives

- Abono a cuenta general sin ligarlo a pedidos: REJECTED. Pierde la trazabilidad de qué pedido quedó pagado.
- Elegir siempre el pedido manualmente: REJECTED. Más lento (NFR-U-001).

### Reason

Es como la mayoría de la gente piensa una deuda ("primero se paga lo más viejo"), y deja una vía manual para excepciones.

### Confidence

**Media.** Regla razonable sin evidencia de uso real.

### Trigger for Reconsideration

Si en las primeras semanas los dueños eligen pedido manualmente en la mayoría de los abonos.

---

## DEC-004 — Sistema de UI: shadcn/ui + Tailwind, con principios de UX documentados

- **Status:** PROVISIONALLY SELECTED (se valida con un prototipo de "Hoy" y "Nuevo pedido")
- **Date:** 2026-10-06
- **Domain:** product / stack
- **Related decisions:** DEC-002, `ui-ux.md`

### Decision

Usar shadcn/ui (Radix + Tailwind) como base de componentes y seguir los principios, identidad y mapa de pantallas de `ui-ux.md`.

### Context

El dueño pide explícitamente "un buen UI/UX". La usabilidad es el requisito que decide si el MVP funciona (NFR-U-001).

### Alternatives

- MUI / Ant Design: REJECTED. Estética genérica de panel administrativo y más pesados en móvil.
- CSS a mano: REJECTED. Más lento y menos consistente/accesible.

### Reason

Componentes accesibles, personalizables y que viven en el repo, por lo que Claude Code puede adaptarlos a la identidad de la marca.

### Confidence

**Media-alta.**

### Trigger for Reconsideration

Si el prototipo muestra que el flujo de pedido no baja de 30 s.

---

## DEC-005 — Entorno de desarrollo: Claude Code en la nube (iniciado desde la app de escritorio), con Supabase local en Docker dentro de la sesión

- **Status:** VALIDATED (2026-10-06 — `supabase start` funcionó en la primera sesión en la nube; ver "Validación")
- **Date:** 2026-10-06
- **Domain:** infrastructure / planning
- **Related decisions:** DEC-001, DEC-002

### Decision

El desarrollo se hace con sesiones de Claude Code en la nube, iniciadas desde la app de escritorio de Claude (opción **Cloud**). El código vive en un repositorio de GitHub. Cada sesión levanta Supabase local con Docker dentro de su máquina virtual; producción se despliega solo desde GitHub Actions.

### Context

El dueño quiere trabajar con Claude Code en la nube. DEC-001 exige desarrollo local primero con `supabase start` (Docker).

### Evidence (documentación de Claude Code, consultada 2026-10-06)

- Las sesiones en la nube clonan el repo desde GitHub y abren PRs; se inician desde la web, el celular, la app de escritorio o `claude --cloud`.
- Docker y `docker compose` vienen instalados en el entorno de la nube.
- El acceso de red **Trusted** incluye npm, Docker Hub y `public.ecr.aws` (de donde la CLI de Supabase descarga sus imágenes), pero **no** los dominios de Supabase. *(Corregido en la validación: en la práctica `public.ecr.aws` y ghcr.io fallan; se usa Docker Hub.)*
- La caché del entorno guarda paquetes e imágenes descargadas, pero no contenedores en ejecución: Supabase local se arranca en cada sesión.
- Las variables de entorno del entorno las puede leer cualquiera que lo use; no son para secretos.

### Validación (Fase 0, 2026-10-06)

`npx supabase start` funcionó en la sesión en la nube: Postgres 17, GoTrue, PostgREST y Kong arriba, `supabase db reset` y `supabase test db` (pgTAP) en verde, registro público desactivado (`disable_signup: true`). Hallazgos que cambian lo que suponía la evidencia:

- **El daemon de Docker no arranca solo.** Hay que lanzar `dockerd`; lo hace `scripts/session-start.sh`.
- **ghcr.io y `public.ecr.aws` están bloqueados** por la red del entorno (descarga de capas → 403 Forbidden). Docker Hub sí funciona, así que el script fija `SUPABASE_INTERNAL_IMAGE_REGISTRY=docker.io`.
- **Docker Hub limita las descargas anónimas** (429 Too Many Requests de vez en cuando). El CLI reintenta solo y el script reintenta `supabase start` hasta 3 veces. Con las imágenes ya en caché no se descarga nada.
- **Tiempos:** primer arranque con descarga de imágenes ≈ 1 min 25 s; arranque en frío con `npm ci` y solo una imagen por bajar ≈ 1 min.
- Se desactivaron en `config.toml` los servicios que el MVP no usa (Studio, Realtime, Storage, Edge Runtime, Analytics, SMTP local) para arrancar más rápido y bajar menos imágenes. Se reactivan si una fase los necesita.
- **`ui.shadcn.com` está bloqueado**, así que `npx shadcn add` no funciona en la sesión: los componentes se escriben a mano a partir del código de shadcn/ui.
- **Playwright:** el Chromium preinstalado no coincide con la versión de `@playwright/test`; en la nube se usa con `PLAYWRIGHT_CHROMIUM_EXECUTABLE` (lo exporta el script). CI instala su propio navegador.

### Reglas de trabajo derivadas

1. **Repo en GitHub** con la app de Claude para GitHub instalada (necesaria para clonar y para auto-fix de PRs).
2. **Red del entorno:** Trusted es suficiente para desarrollar. No se agregan dominios de Supabase: la sesión no habla con producción.
3. **Setup script del entorno:** `npm ci` y `npx supabase start` una vez para dejar las imágenes en caché (luego `npx supabase stop`).
4. **Al iniciar cada sesión** el hook SessionStart de `.claude/settings.json` ejecuta `scripts/session-start.sh`: `npm ci` si hace falta, arranca Docker, `npx supabase start`, `npx supabase db reset` y genera `.env.local` con las llaves locales.
5. **Supabase CLI como dependencia de desarrollo** del proyecto (`npm i -D supabase`), invocada con `npx supabase`.
6. **Flujo:** sesión en la nube → rama → PR → revisión → merge a `main` → GitHub Actions ejecuta `supabase db push` y despliega el frontend.
7. **Secretos de producción** (`SUPABASE_ACCESS_TOKEN`, contraseña de la base, `project-ref`) solo en GitHub Actions Secrets. Nunca en el entorno de la nube ni en el repo.
8. **`CLAUDE.md`** en la raíz del repo con estas reglas y las de DEC-001, para que cada sesión nueva las siga sin depender de la conversación.

### Alternatives

| Alternativa | Estado | Razón |
|---|---|---|
| Desarrollo 100 % local (Claude Code en la PC) | REJECTED | El dueño prefiere la nube; además necesitaría Docker instalado en su PC. |
| Sesión en la nube apuntando a un proyecto Supabase remoto de desarrollo | REJECTED | Requiere abrir dominios de Supabase y meter credenciales en la sesión; Supabase local en Docker evita ambos. |
| `db push` desde la sesión en la nube | REJECTED | Pondría credenciales de producción dentro de la sesión. |

### Trade-offs

- **Mejora:** se puede trabajar desde cualquier dispositivo, las sesiones siguen corriendo con la laptop cerrada y producción queda aislada.
- **Más difícil:** cada sesión tarda un poco más en arrancar (levantar Supabase local) y hay que configurar GitHub Actions.

### Risks

- **Supabase local no arranca en la VM** (recursos o red). Mitigación: probarlo en la primera sesión; si falla, pasar a la alternativa de proyecto remoto de desarrollo con red Custom.

### Confidence

**Alta.** Comprobado en la sesión de la Fase 0. El punto débil es el límite de descargas anónimas de Docker Hub, que solo afecta cuando las imágenes no están en caché.

### Trigger for Reconsideration

Si `supabase start` no funciona de forma confiable en las sesiones en la nube.

---

## DEC-006 — Revertir una entrega deja en 0 el efecto del pedido en el stock

- **Status:** PROVISIONALLY SELECTED (se confirma con el uso)
- **Date:** 2026-10-06
- **Domain:** requirements / database
- **Related decisions:** BR-006, FR-025, FR-026

### Decision

Cuando un pedido sale de *entregado* (revertir a listo/pendiente, cancelar o "Deshacer"), `cambiar_estado` inserta movimientos `reverso_entrega` que dejan en **0 el efecto neto** de ese pedido sobre el stock de cada sabor.

### Context

BR-006 dice que "su descuento de stock se reintegra". Con una entrega normal (−N) es lo mismo: se reintegran N. La duda está en una entrega **"hecho al momento"** (FR-026), que registra +N de producción y −N de entrega (neto 0): ¿al revertir se suman N (la producción queda) o nada (se deshace todo)?

### Alternatives

| Alternativa | Estado | Razón |
|---|---|---|
| Neto del pedido a 0 | SELECTED | "Deshacer" y revertir suelen corregir un error: lo correcto es que el stock quede como si no hubiera pasado. Si luego se entrega normal, descuenta N, que es lo real si no hubo producción aparte. |
| Reintegrar solo la entrega (+N) | REJECTED | Tras deshacer un "hecho al momento" por error, el stock subiría N catibías que no existen. |

### Trigger for Reconsideration

Si los dueños revierten entregas "hechas al momento" porque el cliente **no se llevó** las catibías (y siguen existiendo): entonces deberían quedar en stock. Se resolvería con un ajuste manual (Fase 4) o cambiando esta regla.

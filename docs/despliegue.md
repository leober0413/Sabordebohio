# Despliegue a producción — "Sabor de Bohío"

**Última actualización:** 2026-10-06 · Fase 2

Producción se publica **solo desde GitHub Actions** (DEC-001, DEC-005). Las sesiones de Claude Code no tienen credenciales de producción. Estos pasos los hace un dueño **una sola vez**. Después, cada merge a `main` despliega solo.

## Qué hace cada workflow

| Workflow | Cuándo | Qué hace |
|---|---|---|
| `deploy.yml` | Cada push a `main` (y manual) | `supabase db push` (migraciones) → build → publica en Vercel. Si falta algún secreto o variable, **se salta sin fallar** y lo avisa. |
| `config-auth.yml` | Manual, una vez (y si cambia la config de auth) | Aplica `supabase/config.toml` a producción con la URL real: registro público desactivado (FR-080), URL del sitio y largo mínimo de contraseña. |
| `crear-dueno.yml` | Manual, una vez por dueño | Crea la cuenta y el perfil de un dueño con una contraseña temporal. |

## Pasos

### 1. Supabase (base de datos y login)
1. Crea una cuenta en supabase.com y un proyecto nuevo (plan gratuito, región `us-east-1` o la más cercana). Guarda la **contraseña de la base**.
2. Anota:
   - **Project ref**: el código de 20 letras de la URL del proyecto.
   - **Project URL**: `https://<ref>.supabase.co`.
   - **anon key** y **service_role key** (Project Settings → API). La anon key es pública; la service_role **no se comparte nunca**.
3. Crea un **access token** personal (Account → Access Tokens).
4. Verifica qué copias de seguridad incluye el plan (NFR-R-002, ver `database.md`).

### 2. Vercel (la página)
1. Crea una cuenta en vercel.com y un proyecto vacío llamado `sabor-de-bohio`. **No** lo conectes al repo para despliegues automáticos (`vercel.json` los desactiva; publica Actions).
2. Anota **Org ID** y **Project ID** (Project Settings → General) y crea un **token** (Account Settings → Tokens).
3. Revisa si el plan Hobby permite este uso: es un negocio y el Hobby es no comercial (DEC-002). Si hace falta, el plan Pro.

### 3. GitHub (secretos y variables)
En el repo: **Settings → Environments → New environment** `production`. Dentro:

| Tipo | Nombre | Valor |
|---|---|---|
| Secret | `SUPABASE_ACCESS_TOKEN` | Access token de Supabase |
| Secret | `SUPABASE_DB_PASSWORD` | Contraseña de la base |
| Secret | `SUPABASE_SERVICE_ROLE_KEY` | service_role key (solo la usa `crear-dueno.yml`) |
| Secret | `VERCEL_TOKEN` | Token de Vercel |
| Variable | `SUPABASE_PROJECT_REF` | Project ref |
| Variable | `VITE_SUPABASE_URL` | Project URL |
| Variable | `VITE_SUPABASE_ANON_KEY` | anon key |
| Variable | `VERCEL_ORG_ID` | Org ID |
| Variable | `VERCEL_PROJECT_ID` | Project ID |
| Variable | `SITE_URL` | URL pública de la app en Vercel, p. ej. `https://sabor-de-bohio.vercel.app` |

### 4. Primer despliegue
1. **Actions → Deploy → Run workflow** (o mergea a `main`). Aplica las migraciones y publica la página.
2. **Actions → Config de auth (producción) → Run workflow**. Cierra el registro público. Revisa en el log la sección `config diff`.
3. **Actions → Crear dueño (producción) → Run workflow**, una vez por dueño: correo, nombre y contraseña temporal.
4. Cada dueño entra a `SITE_URL`, va a **Ajustes → Cuenta → Cambiar contraseña** y, desde el celular, la instala (Chrome: menú → "Instalar app"; iPhone: Safari → Compartir → "Agregar a inicio").
5. En **Ajustes → Lista de precios**, pongan el precio suelta y revisen la docena (la base nace con docena RD$550, mínimo 6 y suelta sin definir).

## Después
- Cada merge a `main` aplica las migraciones nuevas y publica la app.
- `supabase/seed.sql` **nunca** se aplica en producción.
- Si algo falla en `deploy.yml`, la página anterior sigue publicada; el log dice en qué paso falló.

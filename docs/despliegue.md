# Despliegue a producción — "Sabor de Bohío"

**Última actualización:** 2026-10-06 · Fase 2

Producción se publica **solo desde GitHub Actions** (DEC-001, DEC-005). Las sesiones de Claude Code no tienen credenciales de producción. Estos pasos los hace un dueño **una sola vez**. Después, cada merge a `main` despliega solo.

## Qué hace cada workflow

| Workflow | Cuándo | Qué hace |
|---|---|---|
| `deploy.yml` | Cada push a `main` (y manual) | `supabase db push` (migraciones) → build → publica en Vercel. Si falta algún secreto o variable, **se salta sin fallar** y lo avisa. |
| `config-auth.yml` | Manual, una vez (y si cambia la config de auth) | Aplica `supabase/config.toml` a producción con la URL real: registro público desactivado (FR-080), URL del sitio y largo mínimo de contraseña. |
| `crear-dueno.yml` | Manual, una vez por dueño | Crea la cuenta y el perfil de un dueño con una contraseña temporal (marcada en `user_metadata.clave_temporal`). |
| `restablecer-clave.yml` | Manual, cuando un dueño no puede entrar | Le pone una contraseña temporal nueva; al entrar, la app le pide cambiarla. |
| `backup.yml` | Todos los días a las 5:17 a. m. (y manual) | Copia de seguridad cifrada de la base (esquema + datos + cuentas), guardada 30 días. Ver "Copias de seguridad". |

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
| Secret | `BACKUP_PASSPHRASE` | Clave para cifrar las copias de seguridad. Una frase larga que **guardan los dueños fuera de GitHub** (sin ella no se pueden abrir las copias). |

### 4. Primer despliegue
1. **Actions → Deploy → Run workflow** (o mergea a `main`). Aplica las migraciones y publica la página.
2. **Actions → Config de auth (producción) → Run workflow**. Cierra el registro público. Revisa en el log la sección `config diff`.
3. **Actions → Crear dueño (producción) → Run workflow**, una vez por dueño: correo, nombre y contraseña temporal.
4. Cada dueño entra a `SITE_URL` con la contraseña temporal. La app lo guía paso a paso para cambiarla (puede posponerlo con "Ahora no"; se lo vuelve a pedir al abrir la app). También se cambia en **Ajustes → Cuenta**. Desde el celular, la instala (Chrome: menú → "Instalar app"; iPhone: Safari → Compartir → "Agregar a inicio").
5. En **Ajustes → Lista de precios**, pongan el precio suelta y revisen la docena (la base nace con docena RD$550, mínimo 6 y suelta sin definir).

## Si un dueño no puede entrar

1. Que revise el correo y la contraseña con el botón del ojo ("Mostrar contraseña"): mayúsculas, signos y que no sobren espacios. Los espacios y las mayúsculas del correo ya no importan.
2. Si no la recuerda o la temporal no funciona: **Actions → Restablecer contraseña de un dueño (producción) → Run workflow** con su correo y una contraseña temporal nueva. Al entrar, la app le pide cambiarla.

**El repo es público, y los logs de Actions también.** `crear-dueno.yml` y `restablecer-clave.yml` leen el correo y la contraseña del evento y los ocultan antes de usarlos; nunca pases datos sensibles por `env:` en un workflow (se imprimen en el log).

## Después
- Cada merge a `main` aplica las migraciones nuevas y publica la app.
- La app instalada busca versión nueva al abrirla, al volver a ella y cada 30 minutos. Si hay una, muestra "Hay una versión nueva de la app" con **Actualizar**; si no se toca, se aplica sola al salir de la app (no recarga mientras alguien llena un pedido). Ver `src/lib/actualizaciones.ts`.
- `supabase/seed.sql` **nunca** se aplica en producción.
- Si algo falla en `deploy.yml`, la página anterior sigue publicada; el log dice en qué paso falló.

## Copias de seguridad (NFR-R-002)

El plan gratuito de Supabase **no incluye copias de seguridad**, así que las hace `backup.yml` cada día:

1. Vuelca el esquema y los datos de producción (incluye las cuentas de los dueños).
2. Los comprime y los **cifra con AES-256** usando `BACKUP_PASSPHRASE`: contienen nombres y teléfonos de clientes, así que nunca se guardan sin cifrar.
3. Los guarda como artefacto privado de GitHub Actions durante **30 días**.

Mientras falte `BACKUP_PASSPHRASE`, la copia se salta y lo avisa. Para probarla: **Actions → Copia de seguridad → Run workflow**.

### Restaurar

1. **Actions → Copia de seguridad →** la corrida del día que quieras **→ Artifacts →** descarga `sabor-de-bohio-AAAA-MM-DD`.
2. Descífrala (pide la clave): `gpg -d sabor-de-bohio-AAAA-MM-DD.tar.gz.gpg | tar -xz` → quedan `esquema.sql` y `datos.sql`.
3. En un proyecto de Supabase **nuevo y vacío**, con la cadena de conexión de su base (`Project Settings → Database`):
   ```bash
   psql "$CONEXION" --single-transaction -v ON_ERROR_STOP=1 \
     -c "set session_replication_role = replica" -f esquema.sql -f datos.sql
   ```
4. Apunta las variables de GitHub (`SUPABASE_PROJECT_REF`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) al proyecto nuevo y corre **Deploy** y **Config de auth**.

El procedimiento de datos se probó en local: base vacía con las migraciones + `datos.sql` deja los mismos pedidos, pagos, gastos y cuentas, y los dueños pueden entrar.


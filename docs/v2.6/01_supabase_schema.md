# Setup 01 — Proyecto Supabase + Esquema de base de datos

## Contexto

DecarboNation v2.6 incorpora autenticación Google OAuth, encuestas pre/post partida y persistencia
de sesiones e indicadores anuales. Toda la infraestructura vive en Supabase.

Este archivo cubre únicamente la creación del proyecto y la ejecución del schema SQL. Los pasos de
configuración OAuth (Client ID / Client Secret de Google Cloud) se realizan en
`docs/v2.6/03_google_oauth.md`.

---

## Paso 1 — Crear el proyecto en Supabase

1. Ir a [supabase.com/dashboard](https://supabase.com/dashboard) e iniciar sesión.
2. En la barra lateral izquierda, seleccionar la organización `tdvzgrqbvlmzzznvuwcf`.
3. Hacer click en **New project**.
4. Completar los campos:
   - **Name:** `decarbonation-v2`
   - **Database Password:** generar una contraseña segura y guardarla (se necesita para conexiones directas).
   - **Region:** `South America (São Paulo)` — minimiza latencia para usuarios de la región.
5. Hacer click en **Create new project** y esperar ~2 minutos mientras se aprovisiona.

---

## Paso 2 — Obtener credenciales del proyecto

Una vez aprovisionado el proyecto:

1. En el panel del proyecto, ir a **Settings** (engranaje, barra lateral izquierda) → **API**.
2. Copiar y guardar:
   - **Project URL** — se usará como `VITE_SUPABASE_URL` en `.env.local`
   - **anon public** key (sección "Project API keys") — se usará como `VITE_SUPABASE_ANON_KEY`

Estas dos variables se agregan al archivo `.env.local` en la raíz del proyecto:

```
# .env.local
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

> No subas `.env.local` al repositorio. Está incluido en `.gitignore`.

---

## Paso 3 — Habilitar el proveedor Google OAuth

> Los valores de Client ID y Client Secret se obtienen en Google Cloud Console siguiendo
> `docs/v2.6/03_google_oauth.md`. Si todavía no los tenés, saltá este paso y volvé después.

1. En el panel del proyecto, ir a **Authentication** (barra lateral izquierda).
2. Seleccionar la pestaña **Providers**.
3. Buscar **Google** y hacer click en el botón de configuración.
4. Activar el toggle **Enable Google provider**.
5. Pegar el **Client ID** y el **Client Secret** de Google Cloud Console.
6. Copiar la **Redirect URI** que muestra Supabase (tiene el formato
   `https://xxxxxxxxxxxx.supabase.co/auth/v1/callback`). Se necesita en el paso 4 de
   `docs/v2.6/03_google_oauth.md`.
7. Hacer click en **Save**.

---

## Paso 4 — Ejecutar el schema SQL

1. En el panel del proyecto, ir a **SQL Editor** (barra lateral izquierda).
2. Hacer click en **New query**.
3. Abrir el archivo `supabase/schema.sql` del repositorio y copiar todo su contenido.
4. Pegar el contenido en el editor SQL de Supabase.
5. Hacer click en **Run** (o `Ctrl+Enter`).
6. Verificar que la ejecución finaliza sin errores en el panel inferior.

El script es idempotente (`CREATE TABLE IF NOT EXISTS`, `DROP POLICY IF EXISTS`,
`DROP TRIGGER IF EXISTS`): se puede re-ejecutar sin problemas si necesitás reiniciar desde cero.

---

## Paso 5 — Verificar tablas en Table Editor

1. Ir a **Table Editor** (barra lateral izquierda).
2. Confirmar que aparecen las 5 tablas en el schema `public`:
   - `profiles`
   - `game_sessions`
   - `annual_snapshots`
   - `pre_survey`
   - `post_survey`

---

## Paso 6 — Verificar el trigger on_auth_user_created

1. Ir a **Database** (barra lateral izquierda) → **Functions**.
2. Confirmar que aparece la función `handle_new_user` (schema `public`, security definer).
3. El trigger vive en la tabla `auth.users` (schema `auth`), que Supabase gestiona internamente.
   El panel **Database → Triggers** solo muestra triggers del schema `public`, por lo que el
   trigger puede no aparecer allí. Para verificarlo, ejecutar en el SQL Editor:

   ```sql
   SELECT tgname, tgrelid::regclass AS tabla
   FROM pg_trigger
   WHERE tgname = 'on_auth_user_created';
   ```

   Debe retornar una fila con `tgname = on_auth_user_created` y `tabla = auth.users`.

> Este trigger crea automáticamente un registro en `public.profiles` cada vez que un usuario
> nuevo inicia sesión por primera vez con Google OAuth.

---

## Archivos de referencia

| Archivo | Descripción |
|---------|-------------|
| `supabase/schema.sql` | Script SQL completo (5 tablas + RLS + trigger) |
| `docs/v2.6/03_google_oauth.md` | Configuración Google Cloud Console (Client ID/Secret) |
| `.env.local` | Variables de entorno locales (no versionar) |

---

## Verificacion rapida post-setup

Desde el SQL Editor, ejecutar la siguiente consulta para confirmar que RLS está activo en las
5 tablas:

```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'profiles', 'game_sessions', 'annual_snapshots', 'pre_survey', 'post_survey'
  )
ORDER BY tablename;
```

Todas deben mostrar `rowsecurity = true`.

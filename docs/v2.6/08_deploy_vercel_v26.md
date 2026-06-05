# Deploy — DecarboNation v2.6 en Vercel

> Complementa `07_deploy_vercel.md` (que cubre v2.5). Este archivo documenta
> los cambios específicos de v2.6: Supabase, Google OAuth y el checklist
> pre-deploy ampliado.

---

## 1. Nuevas variables de entorno

### En Vercel (Settings > Environment Variables)

Agregar estas tres variables. Las dos primeras son nuevas en v2.6:

| Variable | Valor | Dónde obtenerla |
|----------|-------|-----------------|
| `SUPABASE_URL` | `https://xxxx.supabase.co` | Supabase > Settings > API > Project URL |
| `SUPABASE_ANON_KEY` | `eyJ...` | Supabase > Settings > API > anon/public key |
| `GEMINI_API_KEY` | `AIza...` | https://aistudio.google.com/app/apikey |

> La variable `GEMINI_API_KEY` ya existía en v2.5 — solo verificar que sigue
> configurada.

### En `.env.local` para desarrollo local

```bash
# .env.local (en la raíz del proyecto — no commitear)
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
GEMINI_API_KEY=AIza...
```

---

## 2. Actualizar `vite.config.ts`

> U9 aplica este cambio en el código. Este apartado lo documenta para referencia.

El bloque `define` en `vite.config.ts` debe incluir las dos variables nuevas de
Supabase, siguiendo el mismo patrón que ya usa `GEMINI_API_KEY`:

```ts
define: {
  'process.env.API_KEY':        JSON.stringify(env.GEMINI_API_KEY),
  'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
  'process.env.SUPABASE_URL':   JSON.stringify(env.SUPABASE_URL),
  'process.env.SUPABASE_ANON_KEY': JSON.stringify(env.SUPABASE_ANON_KEY),
},
```

**Nota importante sobre env vars en este proyecto:**
El proyecto usa `process.env.X` a través del mecanismo `define` de Vite, NO
`import.meta.env.VITE_X`. Por lo tanto:
- En el código TypeScript, leer las variables como `process.env.SUPABASE_URL`
- En `vite.config.ts`, declararlas en el bloque `define` como se muestra arriba
- No es necesario prefijarlas con `VITE_`

Esto contrasta con lo que dice `CLAUDE.md` actualmente (que menciona
`import.meta.env.VITE_GEMINI_API_KEY`) — ese dato en `CLAUDE.md` está
desactualizado. Ver `09_ajustes_jugabilidad.md` para la corrección.

---

## 3. Configurar redirect URIs en Google Cloud Console

Para que el login con Google funcione en producción:

1. Ir a **https://console.cloud.google.com** > Credentials > tu OAuth 2.0 Client ID

2. En **Authorized JavaScript origins**, agregar:
   ```
   https://decarbonation.vercel.app
   ```
   (y `http://localhost:3000` si aún no está para desarrollo local)

3. En **Authorized redirect URIs**, agregar:
   ```
   https://<ref>.supabase.co/auth/v1/callback
   ```
   donde `<ref>` es el identificador de tu proyecto Supabase (visible en la URL
   de Supabase Studio o en Settings > General).

4. Guardar cambios. Los cambios en Google Cloud Console pueden tardar hasta
   5 minutos en propagarse.

> También en Supabase: Authentication > URL Configuration > agregar
> `https://decarbonation.vercel.app` en **Site URL** y en **Redirect URLs**.

---

## 4. RLS obligatorio (verificar antes de producción)

Las 5 tablas nuevas creadas por U1 deben tener Row Level Security activo.
Verificar en Supabase Studio > Authentication > Policies:

| Tabla | RLS activo | Política mínima |
|-------|-----------|-----------------|
| `users` | Si | SELECT / UPDATE donde `id = auth.uid()` |
| `sessions` | Si | SELECT / INSERT / UPDATE donde `user_id = auth.uid()` |
| `survey_pre` | Si | INSERT / SELECT donde `user_id = auth.uid()` |
| `survey_post` | Si | INSERT / SELECT donde `user_id = auth.uid()` |
| `game_snapshots` | Si | INSERT / SELECT donde `user_id = auth.uid()` |

> El facilitador necesita acceso de lectura a todas las tablas. Esto se maneja
> con un rol especial o con una política adicional que comprueba
> `users.role = 'facilitator'`. Ver U6 para los detalles.

---

## 5. Checklist pre-deploy

Basado en la Guía de Publicación (`guia_publicacion_app_web.docx`):

- [ ] Variables de entorno cargadas en Vercel (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `GEMINI_API_KEY`)
- [ ] RLS activo en las 5 tablas nuevas (verificar en Supabase Studio)
- [ ] `npm run build` sin errores críticos de TypeScript
- [ ] Redirect URIs actualizadas en Google Cloud Console
- [ ] Site URL y Redirect URLs actualizadas en Supabase > Authentication > URL Configuration
- [ ] Trigger `on_auth_user_created` verificado en Supabase (debe crear fila en `users`)
- [ ] Probado en incógnito: login con Google completo (OAuth flow)
- [ ] Probado modo demo (sin login): juego funciona, datos no se guardan
- [ ] Probado flujo completo: login → SurveyPre → jugar → GameOver → SurveyPost → resumen
- [ ] Panel del facilitador accesible solo para usuarios con `role = 'facilitator'`

---

## 6. CI/CD automático (sin cambios respecto a v2.5)

El pipeline de Vercel ya estaba configurado en v2.5 y sigue igual:

- Cada `git push origin main` dispara un deploy automático en Vercel (~1–2 min)
- No se requiere ninguna configuración adicional en Vercel para v2.6

```bash
# Flujo estándar para mergear una unidad:
git checkout main
git pull origin main
git merge --no-ff origin/rama-unidad-X
npm run build          # verificar localmente
git push origin main   # Vercel despliega automáticamente
```

---

## 7. Troubleshooting específico de v2.6

| Problema | Causa probable | Solución |
|----------|---------------|----------|
| Login con Google falla con `redirect_uri_mismatch` | URI no registrado en Google Cloud | Agregar la URI exacta en Google Cloud Console (paso 3) |
| Login funciona local pero no en producción | Site URL de Supabase apunta a localhost | Actualizar Site URL en Supabase > Authentication > URL Configuration |
| `supabaseService` importa pero da error 401 | `SUPABASE_ANON_KEY` no cargada en Vercel | Verificar variable de entorno y que `vite.config.ts` la inyecta via `define` |
| RLS bloquea todas las lecturas | Políticas mal configuradas | Revisar que las políticas comparan `user_id = auth.uid()` correctamente |
| Trigger `on_auth_user_created` no crea fila en `users` | Trigger no ejecutado o función con error | Revisar en Supabase > Database > Functions y los logs del trigger |
| `process.env.SUPABASE_URL` es `undefined` en runtime | Variable no añadida al bloque `define` de vite | Actualizar `vite.config.ts` según el paso 2 de este documento |

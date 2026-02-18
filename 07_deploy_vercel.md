# Deploy — DecarboNation 2.5 a Vercel

## Prerequisitos antes del deploy

Esta app NO usa Supabase ni auth — solo necesita la **Gemini API Key**.
El proceso es: GitHub → Vercel → variable de entorno → deploy.

---

## PASO 0 — Verificar que el build funciona localmente

```bash
# Desde la raíz del proyecto decarbonation-2.5-
npm run build
```

Si hay errores TypeScript, corregirlos antes de continuar.

```bash
npm run preview   # Verificar que la build funciona en local
```

---

## PASO 1 — Configurar .env.local para desarrollo

El archivo `_env.local` del proyecto debe renombrarse a `.env.local` y completarse:

```bash
# Renombrar (en Windows usar el explorador o rename)
# En el directorio del proyecto:
GEMINI_API_KEY=TU_API_KEY_AQUI
```

> ⚠️ **Verificar que `.env.local` está en `.gitignore`** antes de hacer el primer commit.
> El archivo `_gitignore` del proyecto ya debería incluirlo — renombrarlo a `.gitignore`.

---

## PASO 2 — Obtener la Gemini API Key

1. Ir a: **https://aistudio.google.com/app/apikey**
2. Click en "Create API key"
3. Seleccionar o crear un proyecto de Google Cloud
4. Copiar la key (formato: `AIzaSy...`)

> 📋 **Compartir la key aquí** antes de continuar para verificar que está bien configurada.

---

## PASO 3 — Crear repositorio en GitHub

```bash
# Desde la raíz del proyecto
git init
git add .
git commit -m "feat: initial commit — DecarboNation 2.5"

# Crear repo en github.com (puede ser privado)
# Luego conectar:
git remote add origin https://github.com/TU_USUARIO/decarbonation-2-5.git
git branch -M main
git push -u origin main
```

> ⚠️ Antes de hacer `git add .`, verificar que `.gitignore` incluye:
> ```
> .env.local
> node_modules/
> dist/
> ```

---

## PASO 4 — Deploy en Vercel

1. Ir a **https://vercel.com** → "Add New Project"
2. Importar el repositorio de GitHub recién creado
3. Vercel detecta automáticamente Vite — configuración por defecto es correcta:
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
4. **Antes de hacer click en Deploy**, ir a **"Environment Variables"** y agregar:
   ```
   Name:  GEMINI_API_KEY
   Value: AIzaSy...  (la key del Paso 2)
   ```
5. Click en **"Deploy"**

---

## PASO 5 — Verificación post-deploy

1. Abrir la URL de producción en **modo incógnito**
2. Verificar que el juego carga correctamente
3. Verificar que DecarboNito responde (confirma que la API key está activa)
4. Abrir DevTools → Network → verificar que no hay la API key expuesta en requests del cliente

> ⚠️ **Nota de seguridad:** La Gemini API Key queda expuesta en el frontend (es una limitación
> de apps SPA con Gemini). Para producción pública, considerar mover la llamada a una
> Vercel Edge Function. Para demos y talleres, el nivel de exposición es aceptable.

---

## PASO 6 — CI/CD automático (ya configurado)

Una vez conectado GitHub a Vercel:
- Cada `git push origin main` dispara un deploy automático
- Para las mejoras implementadas: aplicar los cambios, hacer build local, commit y push

```bash
# Flujo de trabajo para cada mejora:
npm run build          # Verificar sin errores
git add .
git commit -m "feat: mejora XX — descripción"
git push origin main   # Vercel despliega automáticamente en ~1-2 min
```

---

## Troubleshooting frecuente

| Problema | Causa | Solución |
|----------|-------|----------|
| Build falla en Vercel | Variable `GEMINI_API_KEY` no configurada | Settings → Environment Variables → agregar |
| DecarboNito no responde | API Key inválida o sin créditos | Verificar en aistudio.google.com |
| Build local OK pero Vercel falla | Dependencias faltantes en `package.json` | `npm install` y re-commit |
| API de Gemini bloqueada (RECITATION) | Safety settings restrictivos | En `geminiService.ts`, configurar `harmBlockThreshold: 'BLOCK_NONE'` |

# U3 — LoginScreen + Google OAuth

Guía de configuración manual para habilitar Google OAuth con Supabase en DecarboNation.

---

## 1. Google Cloud Console

1. Ve a [console.cloud.google.com](https://console.cloud.google.com).
2. Abre (o crea) tu proyecto.
3. Navega a **APIs & Services → Credentials**.
4. Haz clic en **Create Credentials → OAuth 2.0 Client ID**.
5. Tipo de aplicación: **Web application**.
6. Completa los campos:
   - **Authorized JavaScript origins**:
     - `http://localhost:3000`
     - `https://decarbonation.vercel.app`
   - **Authorized redirect URIs**:
     - `https://<tu-ref>.supabase.co/auth/v1/callback` (reemplaza `<tu-ref>` con el ID de tu proyecto Supabase)
     - `http://localhost:3000`
7. Haz clic en **Create**.
8. Copia el **Client ID** y el **Client Secret** que se muestran.

---

## 2. Supabase

1. Ve a tu proyecto en [supabase.com](https://supabase.com).
2. Navega a **Authentication → Providers**.
3. Localiza **Google** y habilítalo.
4. Pega el **Client ID** y el **Client Secret** obtenidos en el paso anterior.
5. Haz clic en **Save**.

---

## 3. Cómo funciona el flujo de autenticación

```
LoginScreen.tsx
  └─ onGoogleLogin()
       └─ supabaseService.signInWithGoogle()
            └─ redirige al flujo OAuth de Google
                 └─ Google redirige al callback de Supabase
                      └─ onAuthStateChange en App.tsx detecta la sesión activa
                           └─ se oculta LoginScreen y se muestra el juego
```

`LoginScreen` no importa Supabase directamente; recibe `onGoogleLogin` como prop pura, lo que mantiene la pantalla desacoplada del servicio de autenticación.

---

## 4. Modo demo

Cuando el usuario hace clic en **"Jugar sin registrarse"**, se llama a `onDemo`.

En App.tsx (implementado por **U9**), `onDemo` ejecuta:

```typescript
setAuthStage('demo');
```

Esto marca la sesión como demo. El juego funciona en su totalidad, pero **no se persisten datos** al cerrar o recargar la página. No se crea ningún usuario en Supabase.

---

## 5. Variables de entorno y testing local

Crea el archivo `.env.local` en la raíz del proyecto con:

```env
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

> **Nota**: Vite solo expone al navegador las variables que empiezan por `VITE_`.
> En `supabaseService.ts` usa `import.meta.env.VITE_SUPABASE_URL` y
> `import.meta.env.VITE_SUPABASE_ANON_KEY`.

Luego ejecuta:

```bash
npm run dev
```

El botón **"Continuar con Google"** debería redirigir correctamente a la pantalla de selección de cuenta de Google y, tras autenticarse, volver a la app con la sesión activa.

---

## Archivos relevantes

| Archivo | Descripción |
|---|---|
| `components/auth/LoginScreen.tsx` | Pantalla de login (este componente) |
| `services/supabaseService.ts` | Lógica de autenticación (U4/U9) |
| `App.tsx` | Cableado de auth state + renderizado condicional (U9) |

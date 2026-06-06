# DecarboNation v2.6 — Guia para Claude Code

## Estructura del proyecto

- `App.tsx` (raiz) — componente principal. Entrypoint real. NO editar `src/App.tsx` (obsoleto).
- `index.tsx` — monta `<App />` en el DOM.
- `components/` — componentes React organizados por dominio.
- `services/` — servicios (Gemini AI, Supabase, sugerencias).
- `hooks/` — hooks personalizados (useAuth, useSessionPersistence).
- `constants.ts` — constantes del juego incluyendo `CONTROL_PARAMS`.
- `types.ts` — tipos TypeScript del dominio.

## Variables de entorno

Las variables se inyectan via el bloque `define` de `vite.config.ts` y se leen
en el codigo como `process.env.X` (NO como `import.meta.env.VITE_X`).

Para agregar una nueva variable:
1. Agregar entrada en el bloque `define` de `vite.config.ts`:
   `'process.env.MI_VAR': JSON.stringify(env.MI_VAR)`
2. Agregar `MI_VAR=valor` en `.env.local` (copiar de `.env.local.example`).

Variables actuales:
- `process.env.API_KEY` / `process.env.GEMINI_API_KEY` — Google Gemini API key
- `process.env.SUPABASE_URL` — URL del proyecto Supabase
- `process.env.SUPABASE_ANON_KEY` — clave anonima publica de Supabase

Si no se configuran las vars de Supabase, la app inicia en modo demo automaticamente
(el null-guard en `services/supabaseService.ts` maneja esto).

## Stack tecnico

- React 19 + TypeScript
- Vite 6 (build tool)
- Tailwind CSS (estilos via clases utilitarias)
- Recharts (graficos)
- Google Gemini API (`@google/genai`)
- Supabase (`@supabase/supabase-js`) — autenticacion y persistencia

## Convenciones de codigo

- Modales: overlay `fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[1000]`,
  panel `bg-custom-light-gray`.
- Colores custom: `bg-custom-gray`, `bg-custom-light-gray`, `text-custom-accent` (definidos en Tailwind config).
- `CONTROL_PARAMS` en `constants.ts` es el valor inicial de `controlParams` (estado React en App.tsx).
  Dentro de `runSimulationRound` se usa via `controlParamsRef.current` aliasado como `CP`.
  Fuera de esa funcion (helpers globales), se sigue usando la constante directamente.

## Comandos utiles

```bash
npm install        # instalar dependencias
npm run dev        # servidor de desarrollo (puerto 3000)
npm run build      # build de produccion
npx tsc --noEmit   # verificar tipos sin compilar
```

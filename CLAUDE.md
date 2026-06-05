# CLAUDE.md — DecarboNation v2.6

## Descripcion del proyecto

DecarboNation es un simulador de politica publica climatica construido con React 19 + TypeScript + Vite 6. El punto de entrada es `App.tsx` en la raiz (NO `src/App.tsx`, que es un duplicado obsoleto).

## Comandos principales

```bash
npm install          # instalar dependencias
npm run dev          # servidor de desarrollo (puerto 3000)
npm run build        # build de produccion
npx tsc --noEmit     # verificar tipos sin compilar
```

## Variables de entorno

Las variables se definen en `.env.local` (no commitear) y se inyectan via el bloque `define` en `vite.config.ts`. Se leen en el codigo como `process.env.X` — NO como `import.meta.env.VITE_X`.

| Variable | Uso |
|----------|-----|
| `GEMINI_API_KEY` | API key de Google Gemini (chatbot DecarboNito) |
| `SUPABASE_URL` | URL del proyecto Supabase (auth + DB) |
| `SUPABASE_ANON_KEY` | Anon key publica de Supabase |

Ejemplo de lectura en codigo:

```ts
// CORRECTO
const apiKey = process.env.API_KEY;
const supabaseUrl = process.env.SUPABASE_URL;

// INCORRECTO (no usar)
// const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
```

Ver `.env.local.example` para la plantilla completa.

## Arquitectura

```
App.tsx              # componente raiz (NO src/App.tsx)
components/
  auth/LoginScreen.tsx
  surveys/SurveyPre.tsx, SurveyPost.tsx
  facilitator/FacilitatorPanel.tsx, FacilitatorManual.tsx
  game/GameSummaryPanel.tsx
  common/            # modales, toasts, tooltips
  ...
hooks/
  useAuth.ts         # manejo de auth (Supabase o demo)
  useSessionPersistence.ts  # guardado de sesiones y encuestas
services/
  supabaseService.ts # singleton Supabase + helpers
  geminiService.ts   # chatbot DecarboNito
types.ts             # tipos principales (GameState, ControlParams, etc.)
constants.ts         # CONTROL_PARAMS, INITIAL_*, LEVEL_CONFIGS
```

## Patrones clave

- **Env vars**: `process.env.X` via vite define (nunca `import.meta.env`)
- **Supabase singleton**: `services/supabaseService.ts` exporta `supabase` (puede ser `null` en modo demo si no hay env vars)
- **Mode demo**: cuando `supabase === null` o el usuario elige "Continuar sin cuenta", `authStage === 'demo'`
- **controlParamsRef**: patron ref para que `runSimulationRound` (useCallback) acceda siempre al valor actual de `controlParams` sin re-crearse
- **CP alias**: dentro de `runSimulationRound`, se usa `const CP = controlParamsRef.current` para todas las referencias a parametros de simulacion (permite override dinamico via FacilitatorPanel)

## Errores de TypeScript pre-existentes

Hay ~47 errores de TS pre-existentes en el repo (principalmente en `constants.ts` y `components/`). Son conocidos y no bloquean el build. Los cambios nuevos deben compilar limpio.

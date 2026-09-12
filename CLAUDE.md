# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Descripcion del proyecto

DecarboNation es un simulador de politica publica climatica (sector AFOLU) construido con React 19 + TypeScript + Vite 6 + Tailwind 4, desplegado en Vercel. El juego principal tiene 3 niveles con paso anual. En la rama `v4-fusion` se desarrolla una segunda version en vista previa ("DecarboNation Territorio"): un solo nivel, paso mensual y mapa isometrico, fusionando el arte e interfaz de EcoSIM (`combinacion/EcoSIM`, solo referencia, no se compila). Especificacion: `mejora-general/files/21_fusion_ecosim.md`.

## Comandos

```bash
npm install
npm run dev              # servidor de desarrollo, puerto 3000
npm run build            # corre tsc --noEmit y despues vite build (falla si hay errores de tipos)
npx tsc --noEmit         # verificar tipos (debe quedar en 0 errores)
npm test                 # vitest run sobre tests/**/*.spec.ts
npx vitest run tests/sim/stepYear.spec.ts   # un solo archivo de test
npx vitest run -t "INV-01"                  # un solo test por nombre
npm run sim              # harness de balance (scripts/simulate.ts): estrategias vs vias de victoria
npm run i18n:audit       # busca textos sin traducir en componentes
```

## Paginas y puntos de entrada

El build es multipagina (`rollupOptions.input` en `vite.config.ts`); Vercel mapea URLs limpias con rewrites en `vercel.json`:

- `index.html` → landing estatica **sin React** (solo `src/index.css` + `src/landing.ts`). Ruta `/`.
- `play.html` → juego principal: `src/main.tsx` → `src/App.tsx`. Ruta `/play` (`/play?demo=1` = modo demo).
- `docentes*.html` → paquete docente, paginas estaticas. Rutas `/docentes/...`.
- `api/gemini.ts` → funcion serverless de Vercel (proxy de Gemini).

No existe `App.tsx` en la raiz: desde la consolidacion (commit `5f415c7`) todo el codigo vive en `src/`. Alias `@/` → `src/`.

## Variables de entorno

Se definen en `.env.local` (no commitear) y se inyectan con el bloque `define` de `vite.config.ts`. Se leen como `process.env.X`, **nunca** como `import.meta.env.VITE_X` (el proyecto no declara tipos ambient de vite/client).

| Variable | Uso |
|----------|-----|
| `GEMINI_API_KEY` | Gemini (DecarboNito). Tambien expuesta como `process.env.API_KEY` |
| `GEMINI_MODEL` | Modelo del agente de acciones; si falta se usa `GEMINI_MODEL_TEXT` de `constants.ts` |
| `SUPABASE_URL` / `SUPABASE_ANON_KEY` | Auth + DB. Sin ellas `supabase === null` y el juego corre en modo demo |

## Arquitectura

- **Motor de simulacion puro — `src/sim/`**. `stepYear(state, rng, CP, lang)` avanza un año y devuelve `{ next, trace, logs, chatMessages }` sin mutar la entrada; `createInitialState(level)` arma el estado inicial de un nivel; `evaluateLevel` (`winRoutes.ts`) decide victoria con pisos + vias (conservacion / produccion / innovacion / equilibrio). Cada submodulo (`landUse`, `economy`, `indicators`, `carbon`, `pressures`, `policies`, `events`, `score`) fue extraido textualmente del viejo `runSimulationRound`: el orden de operaciones importa y esta documentado en `src/sim/index.ts`. Nada en `src/sim/` importa React ni usa `Math.random`/`Date.now` directo: la aleatoriedad entra por un `Rng` (`rng.ts`, `makeRng(seed, year)`).
- **Datos del modelo — `src/constants.ts`**: `CONTROL_PARAMS` (parametros ajustables), `INITIAL_*`, `LEVEL_CONFIGS`, `INDICATOR_IMPACT_WEIGHTS` (pesos de politicas y usos del suelo sobre cada indicador), `ALL_RANDOM_EVENTS`, `INITIAL_PACTS`. `src/types.ts` define `GameState`, `ControlParams`, etc.
- **`src/App.tsx`** (componente raiz, ~1700 lineas) orquesta estado de React, auth, persistencia, DecarboNito, tutorial y modales, y llama a `stepYear` desde `runSimulationRound`.
  - **controlParamsRef**: `runSimulationRound` es un `useCallback` que lee `controlParamsRef.current`, asi el `FacilitatorPanel` puede sobreescribir parametros en vivo sin recrear el callback. Dentro se usa el alias `const CP = controlParamsRef.current`; pasar siempre `CP` al motor, nunca importar `CONTROL_PARAMS` directo en ese camino.
  - Los pactos tienen funciones `effects`, que se pierden al clonar con JSON: se restauran desde `INITIAL_PACTS` despues de cada clon (ver `stepYear`).
- **DecarboNito** (`src/components/decarbonito/`, `src/services/geminiService.ts`, `src/services/decarbonitoAgent.ts`): overlay flotante con avatar animado. El agente opera la interfaz via `src/game/uiActionRegistry.ts` (acciones `read` / `navigate` / `mutate` / `advance`, las `mutate` piden confirmacion) y resalta elementos por anclajes DOM (`anchors.ts`), que tambien usa el tutorial (`src/components/tutorial/`).
- **i18n tipado** (`src/i18n/`): claves en `src/i18n/ui/es.ts` y `en.ts`; el contenido de dominio (nombres de politicas, eventos, usos del suelo) se traduce por ID en `src/legacyContent/gameData.ts`. Algunos textos del motor (p. ej. `gameOverReason`) quedan en español a proposito: se comparan como string en `App.tsx` y `geminiService.ts`.
- **Auth y persistencia**: `services/supabaseService.ts` exporta el singleton `supabase` (puede ser `null`); `hooks/useAuth.ts` maneja `authStage` (`'demo'` cuando no hay Supabase o el usuario elige "Continuar sin cuenta"); `hooks/useSessionPersistence.ts` guarda sesiones y encuestas. Esquema y migraciones en `supabase/*.sql`.
- **Estilos**: `src/index.css` define tokens de Tailwind 4 con `@theme`. Conviven los tokens viejos (`custom-*`, `level-N-bg`) con el sistema v3 (`basalt-*`, `bone`, `ash`, `chlorophyll`, `ochre`, `ember`, `hydro`); lo nuevo usa los v3 y los primitivos de `src/components/ui/`.

## Tests

`tests/sim/` cubre el motor con invariantes (fast-check: conservacion de area, limites 0-100, sin NaN, eficiencia de politicas 0-1), `stepYear`, vias de victoria e insignias; `tests/agent/` el registro de acciones de DecarboNito; `tests/tutorial/` capitulos y predicciones. La cobertura se mide solo sobre `src/sim/**` (umbrales en `vitest.config.ts`). Para tests deterministas usar `makeRng(seed, year)`, o `() => 0.999` para suprimir eventos aleatorios.

## Convenciones del repo

- El trabajo se organiza en fases con especificacion en `mejora-general/files/NN_*.md`; cada fase agrega una entrada con fecha a `docs/DESIGN_DECISIONS_LOG.md` explicando desvios de la especificacion y deudas conocidas. Cada fase deja la app funcionando y desplegable.
- Los cambios de formulas o parametros del modelo se documentan en `docs/audit-equations.md` y se verifican con `npm run sim`; el juego de 3 niveles no debe cambiar de comportamiento por trabajo de la vista previa (los tests de `tests/sim/` lo protegen).
- `npx tsc --noEmit` debe quedar limpio. Patron recurrente: `Object.values()`/`Object.entries()` sobre `Record<K, V>` (`landUses`, `policies`, `pacts`, `policy.instruments`) se infiere como `unknown[]`; castear explicitamente, p. ej. `(Object.values(policy.instruments) as PolicyInstrument[])`.

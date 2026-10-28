# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Descripcion del proyecto

DecarboNation es un simulador de politica publica climatica (sector AFOLU) construido con React 19 + TypeScript + Vite 6 + Tailwind 4, desplegado en Vercel. Conviven dos versiones jugables: el juego de 3 niveles (`/play`, estable, paso anual) y **DecarboNation Territorio** (`/territorio`, vista previa en desarrollo recomendada para aula y talleres: un solo nivel, paso mensual y mapa isometrico), que ya vive en `main` y fusiona el arte e interfaz de EcoSIM (`combinacion/EcoSIM`, solo referencia, no se compila). Especificacion de Territorio: `mejora-general/files/21_fusion_ecosim.md`; de la landing, el paquete docente y el cuestionario (v5): `mejora-general/files/00_INDICE_v5.md` y siguientes.

## Comandos

```bash
npm install
npm run dev              # servidor de desarrollo, puerto 3000
npm run build            # corre tsc --noEmit y despues vite build (falla si hay errores de tipos)
npx tsc --noEmit         # verificar tipos (debe quedar en 0 errores)
npm test                 # vitest run sobre tests/**/*.spec.ts
npx vitest run tests/sim/stepYear.spec.ts   # un solo archivo de test
npx vitest run -t "INV-01"                  # un solo test por nombre
npm run sim:check        # arnes de balance del modelo (criterios C1-C9, ~6 min; sale 1 si alguno falla) -> reports/balance-<version>.*
npm run sim:check -- --quick          # 10 semillas (~1 min): solo falla si un criterio que pasaba ahora falla
npm run sim:check -- --update-latest  # completo y ademas fija reports/balance-latest.json como linea base
npx tsx scripts/sensitivity.ts        # Morris sobre 30 parametros -> reports/sensitivity-<version>.md
npx tsx scripts/prediction-bands.ts --check   # bandas de prediccion al dia con el motor (sin --check las regenera)
npx tsx scripts/params-table-html.ts --check  # tabla de parametros y ecuaciones de docentes-ecuaciones.html (--write regenera)
npx tsx scripts/routes-table-html.ts --check  # condiciones de ruta de la hoja de ecuaciones (--write regenera)
python scripts/reference/modelo_v2.py --golden > scripts/reference/golden_v2.csv   # regenerar el golden del prototipo
npm run i18n:audit       # busca textos sin traducir en componentes
```

## Paginas y puntos de entrada

El build es multipagina (`rollupOptions.input` en `vite.config.ts`); Vercel mapea URLs limpias con rewrites en `vercel.json`:

- `index.html` → landing estatica **sin React** (solo `src/index.css` + `src/landing.ts`). Ruta `/`.
- `play.html` → juego principal: `src/main.tsx` → `src/App.tsx`. Ruta `/play` (`/play?demo=1` = modo demo).
- `docentes*.html` → paquete docente, paginas estaticas con variantes Territorio / 3 niveles (`data-version`, `src/docentes.ts`). Rutas `/docentes/...`.
- `docentes-espacio.html` → espacio docente asincronico (`src/docentesEspacio.ts`, QR con `qrcode`). Ruta `/docentes/espacio`.
- `territorio.html` → `src/territorio/main.tsx`. Ruta `/territorio`. `territorio-encuesta.html` → cuestionario anonimo (`src/territorio/survey/`). Ruta `/territorio/encuesta`.
- `api/gemini.ts` → funcion serverless de Vercel (proxy de Gemini).

No existe `App.tsx` en la raiz: desde la consolidacion (commit `5f415c7`) todo el codigo vive en `src/`. Alias `@/` → `src/`.

## Variables de entorno

Se definen en `.env.local` (no commitear) y se inyectan con el bloque `define` de `vite.config.ts`. Se leen como `process.env.X`, **nunca** como `import.meta.env.VITE_X` (el proyecto no declara tipos ambient de vite/client).

| Variable | Uso |
|----------|-----|
| `GEMINI_API_KEY` | Gemini (DecarboNito). Tambien expuesta como `process.env.API_KEY` |
| `GEMINI_MODEL` / `GEMINI_MODEL_FALLBACK` / `GEMINI_MODEL_TTS` | Modelos de Gemini (texto, fallback del proxy, TTS). Defaults en `src/services/geminiConfig.ts`. Rollback: `GEMINI_MODEL=gemini-2.5-flash` en Vercel y redeploy; `samplingFor` restaura los parametros viejos |
| `SUPABASE_URL` / `SUPABASE_ANON_KEY` | Auth + DB. Sin ellas `supabase === null` y el juego corre en modo demo |

## Arquitectura

- **Motor de simulacion puro, modelo 2.0 — `src/sim/` y `src/sim/v2/`** (mapa de modulos en `src/sim/v2/README.md`). Un solo integrador para los dos juegos: `advance(state, dt, rng, CP, opts)` (`src/sim/v2/core.ts`), que no muta la entrada. `stepMonth` (Territorio) es `advance(..., 1/12)`; `stepYear(state, rng, CP, lang)` (3 niveles) es `advanceYear` = **12 sub-pasos mensuales** y devuelve `{ next, trace, logs, chatMessages }`. `createInitialState(level, CP)` arma el estado inicial y sus **anclas** (`GameState.model.anchors`: cada indicador relaja hacia un objetivo logistico `100·σ(logit(X0) + D)` anclado al inicio del nivel). `evaluateLevel` (`winRoutes.ts`) decide victoria con pisos + vias; las de Territorio estan en `src/territorio/routes.ts`. Nada en `src/sim/` importa React ni usa `Math.random`/`Date.now` directo: la aleatoriedad entra por un `Rng` (`rng.ts`, `makeRng(seed, year)`).
- **Parametros del modelo**: las tablas viven en `PARAMS_V2` (`src/sim/v2/params.ts`, no editables en vivo); los escalares que el facilitador puede mover en vivo, en `CONTROL_PARAMS` / `ControlParams` (`src/constants.ts`, `src/types.ts`). Todo numero nuevo va en uno de los dos, con unidad, fuente o "criterio experto" e ID de fase; nunca dentro de una funcion. `src/constants.ts` tiene ademas `INITIAL_*`, `LEVEL_CONFIGS`, `ALL_RANDOM_EVENTS`, `INITIAL_PACTS` (los pactos son datos, sin funciones: un clon JSON es completo).
- **Prototipo de referencia — `scripts/reference/modelo_v2.py`**: manda en las ecuaciones; el arnes (`npm run sim:check`, `scripts/harness/`) manda en la calibracion. Si se cambia una ecuacion o un parametro del prototipo, regenerar `golden_v2.csv` en el mismo commit (`tests/sim/golden.v2.spec.ts` lo compara, sin agrandar tolerancias).
- **Version del modelo** (`src/sim/version.ts`): `MODEL_VERSION` (hoy `'2.0'`, y `MODEL_VERSION_BY_GAME` igual para los dos juegos) viaja en cada fila de investigacion. Patch = solo texto/UI; minor = cambia trayectorias sin cambiar estructura; major = variables o formas de ecuacion nuevas. Nunca reutilizar una version para ecuaciones distintas; historial en `docs/audit-equations.md`.
- **`src/App.tsx`** (componente raiz, ~1700 lineas) orquesta estado de React, auth, persistencia, DecarboNito, tutorial y modales, y llama a `stepYear` desde `runSimulationRound`.
  - **controlParamsRef**: `runSimulationRound` es un `useCallback` que lee `controlParamsRef.current`, asi el `FacilitatorPanel` puede sobreescribir parametros en vivo sin recrear el callback. Dentro se usa el alias `const CP = controlParamsRef.current`; pasar siempre `CP` al motor, nunca importar `CONTROL_PARAMS` directo en ese camino.
- **DecarboNito** (`src/components/decarbonito/`, `src/services/geminiService.ts`, `src/services/decarbonitoAgent.ts`): overlay flotante con avatar animado. El agente opera la interfaz via `src/game/uiActionRegistry.ts` (acciones `read` / `navigate` / `mutate` / `advance`, las `mutate` piden confirmacion) y resalta elementos por anclajes DOM (`anchors.ts`), que tambien usa el tutorial (`src/components/tutorial/`).
- **i18n tipado** (`src/i18n/`): claves en `src/i18n/ui/es.ts` y `en.ts`; el contenido de dominio (nombres de politicas, eventos, usos del suelo) se traduce por ID en `src/legacyContent/gameData.ts`. Algunos textos del motor (p. ej. `gameOverReason`) quedan en español a proposito: se comparan como string en `App.tsx` y `geminiService.ts`.
- **Cuestionario de Territorio**: anonimo, tabla `territorio_feedback` (insert-only para `anon`, `supabase/territorio_feedback_migration.sql`), envio por `fetch` directo sin `supabase-js` y cola offline en `localStorage` (`src/territorio/survey/feedbackService.ts`). Territorio no toca Supabase ni tiene login. **El cuestionario pre/post del juego de 3 niveles (`SurveyPre/Post`, tablas existentes) no se modifica.**
- **Auth y persistencia**: `services/supabaseService.ts` exporta el singleton `supabase` (puede ser `null`); `hooks/useAuth.ts` maneja `authStage` (`'demo'` cuando no hay Supabase o el usuario elige "Continuar sin cuenta"); `hooks/useSessionPersistence.ts` guarda sesiones y encuestas. Esquema y migraciones en `supabase/*.sql`.
- **Estilos**: `src/index.css` define tokens de Tailwind 4 con `@theme`. Conviven los tokens viejos (`custom-*`, `level-N-bg`) con el sistema v3 (`basalt-*`, `bone`, `ash`, `chlorophyll`, `ochre`, `ember`, `hydro`); lo nuevo usa los v3 y los primitivos de `src/components/ui/`.

## Tests

`tests/sim/` cubre el motor con invariantes (fast-check: conservacion de area, limites 0-100, sin NaN, eficiencia de politicas 0-1), el golden del prototipo, casos por modulo de `src/sim/v2/` (`*.v2.spec.ts`), condiciones extremas (`extremes.spec.ts`), comportamiento de referencia (`reference.spec.ts`), `stepYear`, vias de victoria e insignias; `tests/agent/` el registro de acciones de DecarboNito; `tests/tutorial/` capitulos y predicciones. La cobertura se mide solo sobre `src/sim/**` (umbrales en `vitest.config.ts`). Para tests deterministas usar `makeRng(seed, year)`, o `() => 0.999` para suprimir eventos aleatorios.

## Convenciones del repo

- El trabajo se organiza en fases con especificacion en `mejora-general/files/NN_*.md`; cada fase agrega una entrada con fecha a `docs/DESIGN_DECISIONS_LOG.md` explicando desvios de la especificacion y deudas conocidas. Cada fase deja la app funcionando y desplegable.
- Los cambios de formulas o parametros del modelo se documentan en `docs/audit-equations.md`, suben `MODEL_VERSION` segun su regla y se verifican con `npm run sim:check` completo (C1-C9 en verde; `--quick` en cada commit intermedio). Los dos juegos comparten el motor: un cambio de modelo cambia ambos a proposito; un cambio de UI o de la vista previa no debe mover ninguna trayectoria (lo protegen el golden, `tests/sim/core.spec.ts` y el arnes). Tras cambiar la dinamica, regenerar las bandas de prediccion (`scripts/prediction-bands.ts`, y la climatologia copiada en `supabase/analytics_queries.sql`) y las tablas docentes (`params-table-html.ts`, `routes-table-html.ts`).
- `npx tsc --noEmit` debe quedar limpio. Patron recurrente: `Object.values()`/`Object.entries()` sobre `Record<K, V>` (`landUses`, `policies`, `pacts`, `policy.instruments`) se infiere como `unknown[]`; castear explicitamente, p. ej. `(Object.values(policy.instruments) as PolicyInstrument[])`.
- El paquete docente usa variantes `data-version="territorio|niveles"` conmutadas por `src/docentes.ts` (`?v=`); todo texto nuevo de las paginas estaticas es es/en con pares `data-lang` adyacentes, y `npm run i18n:audit` tambien lo verifica sobre `index.html` y `docentes*.html` (`scripts/html-bilingual-audit.mjs`).
- La tabla de parametros, las familias de ecuaciones y las condiciones de ruta de la hoja docente se generan desde el codigo con `npx tsx scripts/params-table-html.ts` y `scripts/routes-table-html.ts` (`--write` / `--check`; no copiar umbrales a mano).
- Discrepancias entre el paquete v6 (`mejora-general/files/32`-`51`) y el motor: `docs/v6-spec-vs-motor.md`. Si spec y codigo discrepan en un hecho del estado actual, gana el codigo.

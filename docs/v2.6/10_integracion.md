# 10 — Integracion Wave 2 (v2.6)

## Resumen de cambios

Esta ola conecta los servicios y componentes de autenticacion/persistencia con `App.tsx`, implementando el flujo completo de auth, encuestas y panel de facilitador.

## Archivos creados (Wave 1 + Wave 2)

| Archivo | Descripcion |
|---------|-------------|
| `services/supabaseService.ts` | Singleton Supabase, helpers de auth, sesiones, snapshots y encuestas |
| `components/auth/LoginScreen.tsx` | Pantalla de login con Google o modo demo |
| `components/surveys/SurveyPre.tsx` | Encuesta pre-juego (rol, experiencia, expectativas) |
| `components/surveys/SurveyPost.tsx` | Encuesta post-juego (aprendizaje, dificultad, NPS) |
| `components/facilitator/FacilitatorPanel.tsx` | Panel de control de parametros de simulacion en tiempo real |
| `components/game/GameSummaryPanel.tsx` | Pantalla de resumen con grafico de trayectoria |
| `hooks/useAuth.ts` | Hook que gestiona el ciclo de vida de autenticacion |
| `hooks/useSessionPersistence.ts` | Hook para persistir sesiones y encuestas en Supabase |

## Puntos de enganche en App.tsx

### Hooks inicializados (lineas ~392-393)
```tsx
const { authStage, user, handleGoogleLogin, handleDemo, handleSignOut } = useAuth();
const { startSession, saveSnapshot, savePreSurvey, savePostSurvey } = useSessionPersistence(user?.id ?? null);
```

### Estado nuevo (lineas ~425-430)
- `controlParams` / `controlParamsRef` — parametros de simulacion mutables en runtime
- `showPreSurvey`, `showPostSurvey`, `showFacilitatorPanel`, `showGameSummary`, `postSurveyResult`

### Gate de autenticacion (antes del return principal)
```tsx
if (authStage === 'loading') → spinner
if (authStage === 'unauthenticated') → <LoginScreen>
// authStage === 'authenticated' | 'demo' → juego normal
```

### Tutorial useEffect (lineas ~495-510)
- Al montar, si `authStage === 'authenticated'` y no se hizo la pre-encuesta en esta sesion, muestra `SurveyPre`
- Llama `startSession(gameState.currentLevel)` para crear el registro en Supabase

### gameOverReason useEffect (lineas ~580-590)
- Detecta fin de partida y activa `SurveyPost` con el resultado correcto ('victoria'/'derrota')

### updateHistoricalData (lineas ~800-820)
- Al final del cuerpo, llama `saveSnapshot()` con los indicadores del ano simulado

### handleAbandonGame
- Nuevo handler que marca la partida como 'abandono' y abre `SurveyPost`

## Patron controlParamsRef (Facilitador)

`runSimulationRound` es un `useCallback` con dependencias estables. Para que pueda leer el valor actual de `controlParams` sin recrearse ni capturar valores stale, se usa el patron ref:

```ts
// Estado
const [controlParams, setControlParams] = useState<ControlParams>(CONTROL_PARAMS);
const controlParamsRef = useRef<ControlParams>(CONTROL_PARAMS);

// Sincronizacion
useEffect(() => { controlParamsRef.current = controlParams; }, [controlParams]);

// Dentro de runSimulationRound
const CP = controlParamsRef.current; // siempre fresco
```

El `FacilitatorPanel` llama `onChange={setControlParams}` y los cambios se propagan automaticamente al siguiente tick de simulacion.

## Modo demo

Cuando `SUPABASE_URL`/`SUPABASE_ANON_KEY` no estan configuradas, `supabase === null` y el sistema entra automaticamente en modo demo (`authStage = 'demo'`). Todos los helpers de Supabase son no-ops seguros en este modo.

El usuario tambien puede elegir "Continuar sin cuenta" en `LoginScreen`, que llama `handleDemo()`.

## Tablas Supabase requeridas

Para funcionamiento completo en modo autenticado se necesitan las siguientes tablas (crear en Supabase > Table Editor o via SQL):

- `game_sessions` — `id`, `user_id`, `nivel_inicio`, `nivel_alcanzado`, `resultado`, `inicio`, `fin`
- `annual_snapshots` — `session_id`, `anio`, indicadores numericos, `politicas_activas` (text[])
- `pre_surveys` — `user_id`, `session_id`, campos de encuesta, `created_at`
- `post_surveys` — `user_id`, `session_id`, campos de encuesta, `created_at`

La ausencia de estas tablas no rompe el juego — los errores se loggean en consola y el juego continua normalmente.

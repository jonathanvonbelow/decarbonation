# Ajustes de jugabilidad y correcciones — DecarboNation v2.6

> Este documento recoge correcciones de código y mejoras de experiencia de juego
> identificadas durante la exploración del código base. Todas deben ser aplicadas
> por U9 salvo indicación contraria.

---

## 1. Corregir `CLAUDE.md` — error sobre env vars

### El problema

`CLAUDE.md` contiene esta línea (incorrecta):

> "injected into the app as `import.meta.env.VITE_GEMINI_API_KEY`"

### La realidad del código

`vite.config.ts` (líneas 13–16) usa el mecanismo `define` de Vite:

```ts
define: {
  'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
  'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
},
```

Y `App.tsx` (línea 418) lee:

```ts
const [apiKeyAvailable, setApiKeyAvailable] = useState(!!process.env.API_KEY);
```

### Corrección que U9 debe aplicar en `CLAUDE.md`

Reemplazar la mención de `import.meta.env.VITE_GEMINI_API_KEY` con:

> "Las variables de entorno se inyectan mediante el bloque `define` de
> `vite.config.ts` y se leen en el código como `process.env.API_KEY` y
> `process.env.GEMINI_API_KEY`. No se usa `import.meta.env` en este proyecto."

---

## 2. Eliminar duplicado `src/App.tsx`

### El problema

Existe el archivo `src/App.tsx` (1752 líneas) que es un duplicado obsoleto del
`App.tsx` en la raíz. El entrypoint real es `index.tsx`, que importa:

```ts
import { App } from './App';
```

Esta resolución apunta a `App.tsx` en la raíz, no a `src/App.tsx`. El archivo
en `src/` no es importado por ningún módulo.

### Corrección que U9 debe aplicar

```bash
git rm src/App.tsx
```

Verificar después con `npm run build` que no hay errores.

> No borrar antes de confirmar que el build pasa — aunque está en desuso,
> conviene verificar que no haya alguna importación indirecta.

---

## 3. Pantalla de resumen de partida (`GameSummaryPanel`)

### Contexto

El plan IKI menciona que "el jugador puede ver un resumen de su partida". Los
datos necesarios ya están disponibles en `historicalData` (estado en `App.tsx`).

### Propuesta de componente

Crear `components/GameSummaryPanel.tsx` con:

```
GameSummaryPanel
├── Encabezado: resultado (Victoria / Derrota / Abandono), nivel alcanzado, duración en años
├── Gráfico de trayectoria: LineChart de Recharts con `generalScore` de `historicalData`
│   (el array `historicalData` ya tiene todos los puntos — solo pasar como prop)
├── Políticas activas al final: listar las que tienen `gameState.policies[id].isActive === true`
└── Botón "Jugar de nuevo": llama `onRestart` callback
```

Props sugeridas:

```ts
interface GameSummaryPanelProps {
  result: 'victoria' | 'derrota' | 'abandono';
  level: number;
  durationYears: number;           // gameState.year - INITIAL_YEAR
  historicalData: HistoricalDataPoint[];
  activePolicies: string[];        // nombres de políticas activas
  onRestart: () => void;
}
```

### Cómo U9 debe cablearlo en `App.tsx`

1. Añadir estado: `const [showGameSummary, setShowGameSummary] = useState(false)`
2. En el flujo de `SurveyPost.onComplete`, antes de resetear el estado:
   ```ts
   setShowGameSummary(true);
   ```
3. El reset del estado del juego ocurre cuando el jugador hace click en
   "Jugar de nuevo" (callback `onRestart`). Nota: no existe `handleResetGame` en
   `App.tsx` — usar `setCurrentLevelManually(1)` que ya implementa el reset
   completo del estado (líneas 1600–1668 de `App.tsx`). U9 puede extraerlo en
   una función `handleRestartGame` para mayor claridad.
4. Renderizar en el bloque de modales (después de línea 1747 en `App.tsx`):
   ```tsx
   {showGameSummary && (
     <GameSummaryPanel
       result={...}
       level={gameState.currentLevel}
       durationYears={gameState.year - INITIAL_YEAR}
       historicalData={historicalData}
       activePolicies={Object.entries(gameState.policies)
         .filter(([, p]) => (p as PolicyState).isActive)
         .map(([, p]) => (p as PolicyState).name)}
       onRestart={() => {
         setShowGameSummary(false);
         setCurrentLevelManually(1); // reset al nivel 1 (función existente en App.tsx)
       }}
     />
   )}
   ```

---

## 4. Banner de modo demo

### Descripción

Cuando el usuario juega sin autenticarse (modo demo), mostrar un banner
persistente y discreto en la parte superior de la pantalla.

### Implementación sugerida

Agregar justo debajo del `<Header .../>` (línea 1688 de `App.tsx`):

```tsx
{!user && (
  <div className="bg-yellow-900 text-yellow-200 text-xs text-center py-1 px-4">
    Jugando en modo demo — tus datos no se guardan.{' '}
    <button
      onClick={() => setShowLogin(true)}
      className="underline hover:text-yellow-100 focus:outline-none"
    >
      Iniciar sesión para guardarlos.
    </button>
  </div>
)}
```

Donde `user` es el estado de sesión de Supabase Auth (`null` si no hay sesión).

### Estilo

- Fondo: `bg-yellow-900` — oscuro, no distrae del juego
- Texto: `text-yellow-200 text-xs` — visible pero discreto
- Sin ícono — solo texto plano para no sobrecargar visualmente

---

## 5. Handler de abandono de partida

### Contexto

Actualmente no existe un camino explícito para que el jugador abandone una
partida en curso sin cerrar el navegador. Esto impide que se dispare el flujo
de post-survey en caso de abandono voluntario.

### Propuesta

#### En `Header.tsx`

Agregar un botón "Abandonar partida" visible solo cuando hay un juego activo
(es decir, cuando `gameOver === false` y `year > INITIAL_YEAR`):

```tsx
{!gameOver && year > INITIAL_YEAR && onAbandon && (
  <button
    onClick={onAbandon}
    className="text-xs text-gray-400 hover:text-red-400 transition-colors px-2 py-1 rounded border border-gray-600 hover:border-red-400"
    title="Abandonar partida actual"
  >
    Abandonar
  </button>
)}
```

Nueva prop en `HeaderProps`:

```ts
onAbandon?: () => void;
```

#### En `App.tsx`

Definir el handler y pasarlo al `<Header>`:

```ts
const handleAbandonGame = useCallback(() => {
  if (window.confirm('¿Abandonar la partida? Tus datos de esta sesión se perderán en modo demo.')) {
    setGameState(s => ({ ...s, gameOverReason: 'Partida abandonada' }));
  }
}, []);
```

```tsx
<Header
  ...
  onAbandon={handleAbandonGame}
/>
```

#### Flujo resultante

`gameOverReason = 'Partida abandonada'` dispara el `useEffect` existente en
línea 575 de `App.tsx`, que llama `handleLessonsLearnedStart`. U9 debe extender
ese mismo `useEffect` para lanzar también `SurveyPost` con
`resultado: 'abandono'`.

---

## 6. Botón del panel facilitador en `Header.tsx`

### Contexto

El `FacilitatorPanel` (U6) necesita un punto de entrada en la UI. El header
es el lugar natural, al igual que los botones de manuales existentes.

### Implementación sugerida

En `Header.tsx`, agregar un botón con ícono de engranaje junto a los botones
de manuales existentes:

```tsx
{onToggleFacilitatorPanel && (
  <button
    onClick={onToggleFacilitatorPanel}
    className="p-2 rounded-md text-gray-400 hover:text-custom-accent hover:bg-gray-700 transition-colors"
    title="Panel del Facilitador"
    aria-label="Abrir panel del facilitador"
  >
    {/* Ícono de engranaje SVG */}
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none"
         viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  </button>
)}
```

Nueva prop en `HeaderProps`:

```ts
onToggleFacilitatorPanel?: () => void;
```

El botón es visible siempre (no solo en game over) para que el facilitador
pueda abrir el panel en cualquier momento durante la sesión.

#### En `App.tsx`

Pasar el callback al `<Header>`:

```tsx
<Header
  ...
  onToggleFacilitatorPanel={handleToggleFacilitatorPanel}
/>
```

Donde `handleToggleFacilitatorPanel` es la función que muestra/oculta
`FacilitatorPanel` (U6).

---

## Resumen de cambios que U9 debe aplicar

| # | Archivo | Acción |
|---|---------|--------|
| 1 | `CLAUDE.md` | Corregir párrafo sobre env vars (`process.env.X`, no `import.meta.env`) |
| 2 | `src/App.tsx` | Eliminar (duplicado obsoleto — entrypoint usa `./App` desde raíz) |
| 3 | `components/GameSummaryPanel.tsx` | Crear componente nuevo |
| 4 | `App.tsx` | Cablear `GameSummaryPanel` después de `SurveyPost.onComplete` |
| 5 | `App.tsx` | Agregar banner de modo demo bajo `<Header>` |
| 6 | `components/Header.tsx` | Agregar prop `onAbandon` y botón "Abandonar" |
| 7 | `App.tsx` | Agregar `handleAbandonGame` y pasarlo a `<Header>` |
| 8 | `components/Header.tsx` | Agregar prop `onToggleFacilitatorPanel` y botón engranaje |
| 9 | `App.tsx` | Pasar `handleToggleFacilitatorPanel` a `<Header>` |

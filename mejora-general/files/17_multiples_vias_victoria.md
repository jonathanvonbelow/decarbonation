# 17 — Múltiples vías de victoria

**Depende de:** `16_auditoria_ecuaciones.md` (el harness es lo que permite calibrar), `12_i18n_completo.md`
**Toca:** `src/sim/winRoutes.ts` (nuevo), `constants.ts`, `types.ts`, `LevelIntroModal`, `Dashboard`, informe de fin de nivel

---

## 1. El problema

Hoy un nivel se gana cumpliendo **todas** las condiciones a la vez:

```ts
// Nivel 2, actual
puntajeGeneralMin: 480 && biodiversityMin: 45 && co2EqMax: 6 && foodSecurityMin: 50 &&
economicSecurityMin: 40 && bienestarSocialMin: 50 && politicalStabilityMin: 45 &&
ppAgricolaMax: 55 && ppAmbientalistaMax: 55 && ppSocialMax: 55
```

Diez condiciones conjuntivas definen **una sola región del espacio de estrategias**. En la práctica
existe una combinación óptima de políticas y el resto son errores. Eso explica dos quejas del
feedback que parecían inconexas: *"es muy difícil"* y *"el nivel 1 no tiene sentido"*. Son la misma
cosa: no hay elección real, hay una respuesta correcta que el jugador tiene que adivinar.

Y contradice el contenido que el juego quiere enseñar. La tesis del propio proyecto es que la
descarbonización AFOLU admite **trayectorias plurales** con distintos perfiles de trade-off. Un
juego con una sola solución enseña exactamente lo contrario.

---

## 2. Diseño: pisos + rutas

Dos capas:

**Pisos de gobernabilidad** (`floors`) — condiciones mínimas comunes a todas las rutas. Evitan la
victoria degenerada ("gano ignorando por completo lo social"). Son pocas y bajas: no son objetivos,
son el borde del precipicio.

**Rutas** (`routes`) — cada una es un conjunto de condiciones exigentes que representa un **modelo
de país** distinto. Se gana el nivel cumpliendo **los pisos + al menos una ruta completa**.

```
victoria = pisos ∧ (ruta_A ∨ ruta_B ∨ ruta_C)
```

Esto convierte la pregunta del jugador de *"¿cuál es la combinación correcta?"* a *"¿qué tipo de
país quiero construir, y estoy dispuesto a pagar su costo?"*. Que es la pregunta pedagógica.

### 2.1 Los tres arquetipos

Se repiten en los tres niveles, con exigencias crecientes. La repetición es deliberada: permite que
el jugador reconozca su propia identidad estratégica y la sostenga o la abandone conscientemente.

| Ruta | Nombre (es / en) | Tesis | Pide | Perdona |
|---|---|---|---|---|
| `conservation` | Vía de la Integridad Ecológica / *Ecological Integrity* | El capital natural es la base de todo lo demás | Biodiversidad y bosque nativo altos, emisiones muy bajas | Menor desempeño económico y algo de presión agrícola |
| `production` | Vía de la Transición Productiva / *Productive Transition* | Sin economía no hay política sostenible en el tiempo | Seguridad económica y alimentaria altas, PBI, presión social baja | Biodiversidad intermedia y descarbonización más lenta |
| `innovation` | Vía de la Innovación / *Innovation Pathway* | La tecnología y la cooperación internacional cambian la frontera | Emisiones muy bajas con instrumentos tecnológicos, pactos, I+D | Uso del suelo más intensivo y mayor deuda |

En el nivel 3 se agrega una cuarta, **`equilibrium` / Vía del Equilibrio**, que es la condición
conjuntiva actual: más difícil que las otras tres, pero es la que otorga el máximo puntaje.
Así, quien hoy juega "bien" según el diseño viejo sigue ganando, y ahora sabe que eligió la ruta
más exigente.

---

## 3. Implementación

### 3.1 Tipos

```ts
// src/sim/winRoutes.ts
import type { SimState } from './types';

export type RouteId = 'conservation' | 'production' | 'innovation' | 'equilibrium';

export interface RouteCondition {
  /** i18n key for the label shown in the routes panel. */
  labelKey: string;
  /** Current value, target, and direction. Used for both evaluation and progress display. */
  read: (s: SimState) => number;
  target: number;
  dir: 'min' | 'max';
  /** Weight inside the route's progress bar. Defaults to 1. */
  weight?: number;
}

export interface WinRoute {
  id: RouteId;
  nameKey: string;
  taglineKey: string;
  /** Short i18n key explaining what this route asks for and what it forgives. */
  descriptionKey: string;
  /** Accent token used in the UI: chlorophyll | ochre | hydro | bone */
  accent: 'chlorophyll' | 'ochre' | 'hydro' | 'bone';
  conditions: RouteCondition[];
  /** Multiplier applied to the final level score. Harder routes pay more. */
  scoreMultiplier: number;
}

export interface RouteProgress {
  route: WinRoute;
  /** 0..1 — weighted mean of per-condition progress, each capped at 1. */
  progress: number;
  met: boolean;
  conditions: { condition: RouteCondition; value: number; progress: number; met: boolean }[];
  /** The condition that is furthest from being met. Drives the "what's blocking you" hint. */
  bottleneck: RouteCondition | null;
}

export interface LevelOutcome {
  won: boolean;
  floorsMet: boolean;
  failedFloors: RouteCondition[];
  routes: RouteProgress[];
  /** Route actually achieved (highest multiplier among those met), or null. */
  achieved: WinRoute | null;
  /** Closest route when losing — used by the debriefing to say "te faltó esto". */
  closest: RouteProgress;
}
```

### 3.2 Evaluador

```ts
/** Per-condition progress in [0,1]. Uses the level's starting value as the 0% reference,
 *  so progress reflects how far the player moved, not how far from zero the value sits. */
function conditionProgress(c: RouteCondition, s: SimState, baseline: SimState): number {
  const value = c.read(s);
  const start = c.read(baseline);
  if (c.dir === 'min') {
    if (value >= c.target) return 1;
    const span = c.target - start;
    return span <= 0 ? (value >= c.target ? 1 : 0) : clamp01((value - start) / span);
  }
  if (value <= c.target) return 1;
  const span = start - c.target;
  return span <= 0 ? (value <= c.target ? 1 : 0) : clamp01((start - value) / span);
}

export function evaluateLevel(s: SimState, baseline: SimState): LevelOutcome {
  const cfg = LEVEL_ROUTES[s.currentLevel];
  const failedFloors = cfg.floors.filter(f => !isMet(f, s));
  const routes = cfg.routes.map(r => evaluateRoute(r, s, baseline));
  const floorsMet = failedFloors.length === 0;
  const metRoutes = routes.filter(r => r.met);
  const achieved = floorsMet && metRoutes.length > 0
    ? metRoutes.reduce((a, b) => (b.route.scoreMultiplier > a.route.scoreMultiplier ? b : a)).route
    : null;
  return {
    won: achieved !== null,
    floorsMet, failedFloors, routes, achieved,
    closest: routes.reduce((a, b) => (b.progress > a.progress ? b : a)),
  };
}
```

`baseline` es el estado al comenzar el nivel: hay que guardarlo en `SimState.levelBaseline` al
entrar a cada nivel. Sin él, las barras de progreso mienten (mostrarían 60% de avance el día uno).

### 3.3 Configuración por nivel

Los umbrales de abajo son un **punto de partida derivado de los valores actuales**, no valores
finales. Se calibran con el harness (`16` §5) hasta cumplir los criterios de §5 de este archivo.

```ts
export const LEVEL_ROUTES: Record<number, { floors: RouteCondition[]; routes: WinRoute[] }> = {
  // ─────────────────────────── NIVEL 1 ───────────────────────────
  1: {
    floors: [
      { labelKey: 'routes.floor.biodiversity', read: s => s.indicators.biodiversity, target: 30, dir: 'min' },
      { labelKey: 'routes.floor.economicSecurity', read: s => s.indicators.economicSecurity, target: 20, dir: 'min' },
      { labelKey: 'routes.floor.treasury', read: s => s.stella.Reservas_del_Tesoro, target: 0, dir: 'min' },
    ],
    routes: [
      {
        id: 'conservation', nameKey: 'routes.conservation.name', taglineKey: 'routes.conservation.tagline',
        descriptionKey: 'routes.conservation.desc', accent: 'chlorophyll', scoreMultiplier: 1.0,
        conditions: [
          { labelKey: 'cond.biodiversity',   read: s => s.indicators.biodiversity, target: 55, dir: 'min' },
          { labelKey: 'cond.nativeForest',   read: s => nativeForestPct(s), target: 22, dir: 'min' },
          { labelKey: 'cond.emissions',      read: s => s.indicators.co2EqEmissionsPerCapita, target: 5, dir: 'max' },
          { labelKey: 'cond.score',          read: s => s.indicators.generalScore, target: 550, dir: 'min' },
        ],
      },
      {
        id: 'production', nameKey: 'routes.production.name', taglineKey: 'routes.production.tagline',
        descriptionKey: 'routes.production.desc', accent: 'ochre', scoreMultiplier: 1.0,
        conditions: [
          { labelKey: 'cond.economicSecurity', read: s => s.indicators.economicSecurity, target: 55, dir: 'min' },
          { labelKey: 'cond.foodSecurity',     read: s => s.indicators.foodSecurity, target: 60, dir: 'min' },
          { labelKey: 'cond.emissions',        read: s => s.indicators.co2EqEmissionsPerCapita, target: 6.0, dir: 'max' },
          { labelKey: 'cond.biodiversity',     read: s => s.indicators.biodiversity, target: 40, dir: 'min' },
          { labelKey: 'cond.score',            read: s => s.indicators.generalScore, target: 520, dir: 'min' },
        ],
      },
      {
        id: 'innovation', nameKey: 'routes.innovation.name', taglineKey: 'routes.innovation.tagline',
        descriptionKey: 'routes.innovation.desc', accent: 'hydro', scoreMultiplier: 1.1,
        conditions: [
          { labelKey: 'cond.emissions',      read: s => s.indicators.co2EqEmissionsPerCapita, target: 4.0, dir: 'max' },
          { labelKey: 'cond.carbonBalance',  read: s => s.stella.Balance_Carbono_Anual, target: 0, dir: 'min' },
          { labelKey: 'cond.biodiversity',   read: s => s.indicators.biodiversity, target: 42, dir: 'min' },
          { labelKey: 'cond.score',          read: s => s.indicators.generalScore, target: 560, dir: 'min' },
        ],
      },
    ],
  },
  // ─────────────────────────── NIVEL 2 ───────────────────────────
  // Pisos: biodiversidad ≥ 35, seg. alimentaria ≥ 40, estabilidad política ≥ 35,
  //        las tres presiones < 70.
  // conservation: biodiv ≥ 60, bosque ≥ 25%, CO2 ≤ 5, ppAmbientalista < 40, score ≥ 520
  // production:   segEcon ≥ 60, segAlim ≥ 65, bienestar ≥ 55, ppAgricola < 40, CO2 ≤ 6.5, score ≥ 500
  // innovation:   CO2 ≤ 3.5, balance ≥ 0, esfuerzo en instrumentos tecnológicos ≥ 60%,
  //               segEcon ≥ 45, score ≥ 540
  // ─────────────────────────── NIVEL 3 ───────────────────────────
  // Pisos: no colapso, deuda/PBI < 100%, estabilidad ≥ 30.
  // conservation: CO2 ≤ 2.5, biodiv ≥ 65, bosque ≥ 28%, PBI ≥ 12.000, deuda/PBI < 80%
  // production:   PBI ≥ 16.000, segEcon ≥ 65, bienestar ≥ 60, CO2 ≤ 4, deuda/PBI < 60%
  // innovation:   CO2 ≤ 2, ≥2 pactos activos, balance ≥ 0, PBI ≥ 13.000, deuda/PBI < 90%
  // equilibrium:  la condición conjuntiva actual completa. scoreMultiplier: 1.35
};
```

### 3.4 Compatibilidad hacia atrás

- `LevelConfig.winConditions` **se conserva** y pasa a ser la fuente de la ruta `equilibrium`.
- `progressionConditionsMet` se reimplementa como `evaluateLevel(state, baseline).won`. Ningún
  llamador externo cambia de firma.
- El `FacilitatorManual` y el `EquationsManual` leen `LEVEL_ROUTES` en vez de `winConditions`:
  la documentación se actualiza sola.

---

## 4. Interfaz

### 4.1 Panel "Rutas de Victoria"

Ubicación: columna derecha del tablero (4 de 12 columnas), visible siempre, colapsable.
Ancla: `ANCHORS.winRoutesPanel`.

Por cada ruta, una tarjeta:

```
┌─────────────────────────────────────────┐
│ ◆ Integridad Ecológica          68%     │   ← acento de la ruta, progreso ponderado
│ ████████████████░░░░░░░                 │
│ Biodiversidad      52 / 55   ●          │   ← ● cumplido, ○ pendiente
│ Bosque nativo    20,4 / 22%  ○          │
│ CO₂eq/cápita       5,4 / 5   ○          │
│ Puntaje           561 / 550  ●          │
│ Te falta: bosque nativo (+1,6 pts)      │   ← cuello de botella, una sola línea
└─────────────────────────────────────────┘
```

Detalles que importan:

- Las tarjetas se **ordenan por progreso descendente**: la ruta en la que el jugador va mejor queda
  arriba. Es el andamiaje: el juego le devuelve una lectura de su propia identidad estratégica.
- La ruta líder tiene borde de 2 px en su color de acento; las otras quedan al 70% de opacidad.
- **Nunca** se recomienda una ruta ni se marca una como "la correcta". El texto de encabezado del
  panel es *"Podés ganar este nivel de varias maneras"* / *"There is more than one way to win"*.
- Los pisos van arriba del panel, en una tira compacta. Si uno se incumple, se pinta en `ember` y
  todas las tarjetas se atenúan: comunica "esto está por encima de cualquier estrategia".
- Animación: cuando una condición pasa a cumplida, el punto hace un `scale(1.4) → 1` con un
  destello del color de acento (300 ms). Es el micro-refuerzo más barato y efectivo del juego.

### 4.2 Otros puntos de contacto

| Pantalla | Cambio |
|---|---|
| `LevelIntroModal` | Reemplaza la lista plana de condiciones por las 3 tarjetas de ruta + los pisos. Texto: "elegí tu camino" |
| Informe de fin de nivel | Encabeza con la ruta lograda y su nombre; si se perdió, muestra la ruta más cercana y el cuello de botella |
| `Header` | Junto al puntaje, un ícono con el acento de la ruta líder actual (tooltip con el nombre) |
| Debriefing (archivo `18`) | Pregunta obligatoria: "¿La ruta que lograste es la que te habías propuesto al empezar?" |
| Prompt de DecarboNito | Se inyectan las 3 rutas con su progreso. El bot puede decir "vas 68% por la vía ecológica y 41% por la productiva; ¿cuál querés perseguir?" |

### 4.3 Puntaje final y reconocimiento

```
puntajeNivel = puntajeGeneral × scoreMultiplier(rutaLograda)
```

Insignia por ruta completada, persistida por perfil (`localStorage` + Supabase). Completar las tres
rutas de un mismo nivel en partidas distintas otorga la insignia **Pluralista** — que es,
literalmente, el objetivo de aprendizaje del juego convertido en logro.

---

## 5. Calibración con el harness

Ninguno de los números de §3.3 es definitivo hasta que se cumpla esto (correr `npm run balance`):

| Criterio | Umbral |
|---|---|
| Cada ruta la gana al menos una estrategia sintética | Sí |
| Ninguna ruta concentra más del **60%** de las victorias | Sí |
| Ninguna ruta gana menos del **10%** de las victorias | Sí (si pasa, es decorativa: bajar exigencia) |
| Tasa global de victoria nivel 1 / 2 / 3 | 55–75% / 40–60% / 25–45% |
| `do_nothing` gana alguna ruta | **Nunca** |
| Existe al menos un par de rutas **mutuamente excluyentes** en el mismo nivel | Sí — si todas se pueden ganar a la vez, no hay trade-off real |
| Distancia estratégica entre rutas ganadoras | El conjunto de políticas activas de dos rutas ganadoras debe diferir en ≥3 políticas |

El último criterio es el que hace que esto no sea cosmético. Si `all_green` gana las tres rutas,
el sistema de rutas es una etiqueta sobre una única solución, y hay que endurecer los trade-offs
en `constants.ts` (típicamente: subir el costo fiscal de las políticas de conservación y el impacto
en biodiversidad de las productivas) hasta separarlas.

Documentar la calibración final en `reports/routes-calibration.md`, con la matriz
estrategia × ruta × nivel. Ese documento es material directo para el artículo.

---

## 6. Cadenas i18n nuevas

Agregar en `src/i18n/ui/{es,en}.ts`, bajo `routes.*` y `cond.*`. Como mínimo:

```ts
routes: {
  panelTitle: 'Rutas de victoria',
  panelSubtitle: 'Podés ganar este nivel de varias maneras',
  floorsTitle: 'Mínimos de gobernabilidad',
  floorsBroken: 'Hay un mínimo incumplido: ninguna ruta es alcanzable así',
  bottleneck: 'Te falta: {condition} ({gap})',
  achieved: 'Nivel superado por la {route}',
  closest: 'La ruta más cercana era la {route}: te faltó {condition}',
  conservation: {
    name: 'Vía de la Integridad Ecológica',
    tagline: 'El capital natural primero',
    desc: 'Exige biodiversidad y bosque nativo altos, y emisiones bajas. Tolera un desempeño económico más modesto.',
  },
  production: { /* ... */ },
  innovation: { /* ... */ },
  equilibrium: { /* ... */ },
},
```

En inglés, los nombres son `Ecological Integrity Pathway`, `Productive Transition Pathway`,
`Innovation Pathway`, `Balanced Pathway`. Mantener "Pathway" en los cuatro: es el término usado en
la literatura de escenarios de descarbonización y ancla el juego en su campo.

---

## Verificación

1. `npm test`: suite `tests/sim/winRoutes.spec.ts` en verde, incluyendo
   - un estado que cumple una ruta y falla los pisos ⇒ `won === false`;
   - un estado que cumple dos rutas ⇒ `achieved` es la de mayor multiplicador;
   - `progress` monótono al mejorar cualquier condición.
2. `npm run balance` y los siete criterios de §5 cumplidos, con reporte versionado.
3. El panel de rutas se ve en los tres niveles, ordenado por progreso, y sin recomendar ninguna.
4. Ganar el nivel 1 por la vía productiva y por la ecológica en dos partidas: ambos informes finales
   nombran correctamente la ruta lograda y el multiplicador aplicado.
5. `npm run i18n:audit` sin cadenas sueltas nuevas.

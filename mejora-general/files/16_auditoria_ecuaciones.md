# 16 — Auditoría de ecuaciones: extracción, invariantes y balance

**Depende de:** `09_saneamiento_repo.md`
**Habilita:** `17_multiples_vias_victoria.md` (no se pueden calibrar rutas sin harness)
**Toca:** `src/sim/*` (nuevo), `src/App.tsx` (adelgaza), `tests/*`, `scripts/*`

---

## 1. El problema de fondo

La simulación vive dentro de `App.tsx`, mezclada con `setState`, `logEvent`, `addToast` y llamadas
a Gemini. Esto produce tres consecuencias graves:

1. **No es testeable.** No hay forma de correr un año sin montar React.
2. **No es reproducible.** El `Math.random()` de los eventos aleatorios no tiene semilla: la misma
   partida no se puede repetir, ni para depurar ni para el artículo científico.
3. **No es auditable.** Las ecuaciones documentadas en el `EquationsManual` describen el modelo
   *pretendido*; nadie verificó que el código haga eso. Cuando un participante pregunta "¿por qué
   bajó la biodiversidad?", no hay respuesta trazable.

Este archivo no cambia el modelo. **Extrae, congela y verifica** lo que ya hay, y recién después
corrige lo que esté mal. El orden importa: primero el test de regresión, después el arreglo.

---

## 2. Extracción del motor

### 2.1 Estructura objetivo

```
src/sim/
  index.ts            # API pública: stepYear, createInitialState, evaluateLevel
  types.ts            # SimState, SimInput, SimTrace (sin nada de React)
  rng.ts              # PRNG con semilla (mulberry32)
  carbon.ts           # balance de carbono, emisiones, secuestro, per cápita
  landUse.ts          # matriz de transición de usos del suelo
  indicators.ts       # biodiversidad, seg. alimentaria, económica, bienestar
  pressures.ts        # presiones sectoriales (curva S) y estabilidad política
  economy.ts          # PBI, tesoro, deuda, intereses, impuestos
  policies.ts         # eficiencia, decaimiento, esfuerzo de instrumentos
  score.ts            # puntaje general por nivel
  events.ts           # eventos aleatorios (deterministas dada la semilla)
  trace.ts            # registro de contribuciones por término (explicabilidad)
```

### 2.2 Contrato de la función principal

```ts
// src/sim/index.ts
/**
 * Advances the simulation exactly one year. Pure: same (state, input, seed) → same output.
 * Contains no I/O, no React, no Date.now(), no Math.random().
 */
export function stepYear(state: SimState, input: SimInput): { next: SimState; trace: SimTrace } {
  const rng = makeRng(state.seed, state.year);          // determinista por año
  const policies = updatePolicyEfficiency(state, input);
  const landUses = updateLandUse(state, policies, rng);
  const carbon   = computeCarbonBalance(state, policies, landUses);
  const indicators = updateIndicators(state, policies, landUses, carbon);
  const pressures  = updatePressures(state, policies, indicators);
  const economy    = updateEconomy(state, policies, indicators, input);
  const event      = rollEvent(state, rng);
  const withEvent  = applyEvent({ indicators, economy, carbon }, event);
  const score      = computeScore(state.currentLevel, withEvent);
  // ...
}
```

`SimTrace` es la pieza que hace la simulación **explicable**: por cada indicador guarda la lista
de términos que lo movieron (`{ source, amount }`), ordenados por magnitud. Con eso, DecarboNito
puede responder "la biodiversidad bajó 3,1 puntos: −4,2 por expansión de cultivos convencionales,
+1,1 por conservación" en vez de improvisar. Además alimenta el tooltip del indicador y el informe
anual del archivo `19`.

### 2.3 Semilla y reproducibilidad

```ts
// src/sim/rng.ts
/** Deterministic PRNG. Seeded per (session seed, year) so replays are exact. */
export function makeRng(seed: number, year: number): () => number {
  let a = (seed ^ (year * 0x9e3779b9)) >>> 0;
  return function mulberry32() {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
```

La semilla de la partida se genera al iniciar, se muestra en el informe final y **se guarda en
Supabase**. Una partida se puede reproducir exactamente a partir de `(seed, secuencia de acciones)`:
esto convierte el registro de partidas en evidencia reproducible para el artículo.

### 2.4 Procedimiento de extracción sin romper nada

1. Crear `tests/sim/golden.spec.ts` **antes de mover una sola línea**: capturar el output actual de
   10 partidas guionadas (definidas en `tests/fixtures/scripts.ts`) contra el código de `App.tsx`,
   con `Math.random` parcheado a una secuencia fija. Guardar como *snapshots*.
2. Mover el código a `src/sim/` **sin cambiar ninguna fórmula ni constante**.
3. Correr los golden tests: deben pasar sin actualizar snapshots. Si alguno falla, la extracción
   introdujo un cambio de comportamiento; arreglarlo antes de seguir.
4. Recién ahí, aplicar las correcciones de §4, actualizando los snapshots **de a una** y anotando
   en el commit qué cambió y por qué.

> **Checkpoint 1.** `npm test` en verde con los 10 golden tests, y `App.tsx` con menos de 400 líneas.

---

## 3. Invariantes

Estas propiedades deben cumplirse en **toda** simulación. Se testean sobre miles de años simulados
con estrategias aleatorias (`fast-check` o un bucle propio de 2.000 corridas).

```ts
// tests/sim/invariants.spec.ts
const INVARIANTS: Invariant[] = [
  { id: 'INV-01', desc: 'Total land area is conserved (±0.01 kHa)',
    check: s => Math.abs(totalArea(s.landUses) - TOTAL_AREA) < 0.01 },

  { id: 'INV-02', desc: 'No land use area is negative',
    check: s => Object.values(s.landUses).every(lu => lu.area >= 0) },

  { id: 'INV-03', desc: '0-100 indicators stay within bounds',
    check: s => BOUNDED_INDICATORS.every(k => s.indicators[k] >= 0 && s.indicators[k] <= 100) },

  { id: 'INV-04', desc: 'Sectoral pressures stay within 0-100',
    check: s => (['ppAgricola','ppAmbientalista','ppSocial'] as const)
                  .every(k => s.indicators[k] >= 0 && s.indicators[k] <= 100) },

  { id: 'INV-05', desc: 'No NaN or Infinity anywhere in the state',
    check: s => deepNumbers(s).every(Number.isFinite) },

  { id: 'INV-06', desc: 'Policy efficiency stays within 0-1',
    check: s => Object.values(s.policies).every(p => !p.isActive || (p.currentEfficiency >= 0 && p.currentEfficiency <= 1)) },

  { id: 'INV-07', desc: 'Total instrument effort per policy never exceeds 100%',
    check: s => Object.values(s.policies).every(p => totalEffort(p) <= 100.001) },

  { id: 'INV-08', desc: 'General score stays within 0-1000',
    check: s => s.indicators.generalScore >= 0 && s.indicators.generalScore <= 1000 },

  { id: 'INV-09', desc: 'CO2eq per capita is non-negative and below the reference ceiling',
    check: s => s.indicators.co2EqEmissionsPerCapita >= 0 &&
                s.indicators.co2EqEmissionsPerCapita <= CONTROL_PARAMS.Referencia_Max_CO2_per_Capita_Puntaje * 1.5 },

  { id: 'INV-10', desc: 'Debt never becomes negative (a loan repaid in full lands exactly on 0)',
    check: s => s.stella.Deuda >= -0.001 },

  { id: 'INV-11', desc: 'Determinism: same seed + same actions ⇒ identical state',
    check: null /* comparación de dos corridas */ },

  { id: 'INV-12', desc: 'Monotonicity: with all else equal, more effort never reduces a policy\'s own effect',
    check: null /* test comparativo */ },

  { id: 'INV-13', desc: 'No game-over condition can trigger on year 0 of a fresh game',
    check: s => s.year > INITIAL_YEAR || !s.gameOverReason },

  { id: 'INV-14', desc: 'Score weights for each level sum to 1.0 (±1e-6)',
    check: null /* test sobre CONTROL_PARAMS */ },
];
```

**INV-14 y INV-01 son los que más probablemente fallen hoy.** No adivinar: correrlos y reportar.

---

## 4. Lista de verificación de fórmulas

Para cada punto: leer el código, contrastar con el `EquationsManual`, y **documentar el resultado
en `docs/audit-equations.md`** con una de tres etiquetas: `OK`, `CORREGIR` o `DOCUMENTAR`
(el código está bien pero el manual dice otra cosa).

### 4.1 Carbono

| ID | Qué verificar | Por qué importa |
|---|---|---|
| C-1 | **Unidades**: las tasas están en Mg C/kHa. ¿Se convierte a CO₂eq con el factor **44/12 = 3,667** antes de calcular per cápita? Si no, las emisiones están subestimadas ~3,7× | Es el indicador central del juego y el que se compara con datos reales de NDC |
| C-2 | Población: ¿es constante? ¿Está declarada en algún lado? El per cápita depende de ella | Si es constante, decirlo en el manual; si crece, documentar la tasa |
| C-3 | ¿El balance neto anual acumula en un stock (`Conteo_Carbono_Neut`) o se usa solo el flujo? ¿Cuál alimenta el puntaje? | Determina si "neutralidad" es un flujo anual o un acumulado histórico |
| C-4 | Sinergia CR+C (`Peso_Sin_CR_C_Carbono_Stella`): ¿se aplica al secuestro **antes** o **después** del efecto de instrumentos? ¿Se puede duplicar? | Riesgo de sinergia multiplicativa desbocada |
| C-5 | Antagonismo C+SE: ¿es multiplicativo sobre emisiones totales o aditivo? | Idem |
| C-6 | Efectos de instrumentos (`Factor_Reduccion_Emisiones_Renovables_PCN`, `Factor_Aumento_Secuestro_CAC_PCN`): ¿escalan con el esfuerzo asignado o son binarios? | Si son binarios, el deslizador de esfuerzo es decorativo → mentira de interfaz |

### 4.2 Usos del suelo

| ID | Qué verificar |
|---|---|
| L-1 | ¿La suma de las áreas se conserva? Toda tasa `A→B` debe restar de A exactamente lo que suma a B |
| L-2 | ¿Puede un uso llegar a área negativa si varias tasas de salida se aplican el mismo año? Requiere normalización proporcional cuando la salida total supera el stock |
| L-3 | ¿Las tasas de transición se modulan por eficiencia de política, o son constantes? |
| L-4 | ¿Hay caminos de retorno para todos los usos? Si `PRG → BNNP` no existe, la ganadería es irreversible: decisión de diseño legítima, pero debe ser explícita |
| L-5 | Áreas iniciales: hoy son 100 kHa para varios usos (valores de maqueta). Definir un reparto plausible para un territorio subtropical tipo Bosque Atlántico y documentar la fuente |

### 4.3 Indicadores y presiones

| ID | Qué verificar |
|---|---|
| I-1 | ¿Los pesos `Factor_Impacto_*_Peso` suman 1 por indicador? Si no, la escala del cambio anual es arbitraria |
| I-2 | ¿El cambio es aditivo sobre el valor previo (Δ) o se recalcula el nivel? El manual dice Δ: verificar |
| I-3 | Clamping: ¿se acota a [0,100] después de sumar todos los términos, o término a término? Debe ser al final |
| I-4 | Curva S de presiones: `f(P) = 4·P·(100−P)/100²` o similar. Verificar que `f(0)=f(100)=0` para que las presiones no se salgan del rango, y que la fuerza de normalización no empuje fuera del rango |
| I-5 | Con `PRESION_PUNTO_EQUILIBRIO` y `PRESION_TASA_NORMALIZACION` actuales, ¿cuántos años tarda una presión de 80 en volver a 50 sin acción del jugador? Si son más de 8, es inmanejable dentro de un nivel |
| I-6 | Estabilidad política vs. polarización (`Umbral_polarizacion`): ¿usa max−min de las tres presiones? ¿Qué pasa si las tres son altas y parejas (polarización baja pero descontento total)? Caso probablemente mal modelado |
| I-7 | Retroalimentación biodiversidad → seguridad alimentaria → presión agrícola: buscar bucles positivos sin amortiguación (fuente de espirales de muerte) |

### 4.4 Políticas y economía

| ID | Qué verificar |
|---|---|
| P-1 | Decaimiento exponencial `e^(−t/D)`: con `D` por política, ¿cuánto vale la eficiencia al año 10? Si cae bajo 0,2, toda estrategia de largo plazo es inviable |
| P-2 | El factor de esfuerzo `(esfuerzo/100)` multiplica la eficiencia: en nivel 2, una política con esfuerzo 0 tiene eficiencia 0. ¿El jugador entiende que activar sin asignar esfuerzo no hace nada? (problema de interfaz, pero nace acá) |
| P-3 | Costos: `costFactor` × PBI × eficiencia, ¿o × PBI a secas? Si el costo no escala con eficiencia, políticas viejas cuestan igual y rinden menos: correcto, pero debe estar dicho |
| E-1 | Intereses: ¿simples o compuestos? ¿Se cobran antes o después del pago de capital? |
| E-2 | ¿El pago de deuda puede dejar el tesoro negativo? ¿Hay default? |
| E-3 | Impuesto adicional: 20% máximo con penalización lineal en cuatro indicadores. Verificar que no haya un óptimo trivial (p. ej., 20% siempre conviene, o nunca) |
| E-4 | Crecimiento del PBI: base + efectos de políticas − impuestos. ¿Puede ser negativo indefinidamente (espiral)? |
| S-1 | Puntaje: verificar que los pesos por nivel sumen 1 y que cada componente esté normalizado a [0,1] antes de ponderar. El componente de carbono usa `Max_Abs_Total_Carbon_Ref`: revisar que un balance positivo grande no dé >100% |

---

## 5. Harness de simulación sin interfaz

```ts
// scripts/simulate.ts — se corre con: npx tsx scripts/simulate.ts --runs 500 --level 1
import { createInitialState, stepYear } from '../src/sim';
import { STRATEGIES } from './strategies';

/**
 * Runs a full level with a scripted strategy and returns the outcome.
 * A "strategy" is a function (state, year) => SimInput, i.e. a synthetic player.
 */
export function runLevel(level: number, strategy: Strategy, seed: number): RunOutcome {
  let state = createInitialState({ level, seed });
  const history: SimState[] = [state];
  for (let y = 0; y < YEARS_PER_LEVEL; y++) {
    const input = strategy(state, y);
    const { next } = stepYear(state, input);
    state = next;
    history.push(state);
    if (state.gameOverReason) break;
  }
  return { level, seed, strategy: strategy.id, final: state, history, won: evaluateLevel(state) };
}
```

### 5.1 Estrategias sintéticas (jugadores de prueba)

Como mínimo, ocho, que representan arquetipos reales observados en talleres:

| id | Descripción |
|---|---|
| `all_green` | Solo políticas ambientales, esfuerzo repartido parejo |
| `all_brown` | Solo políticas productivas |
| `balanced` | Mezcla 3 verdes + 2 productivas |
| `tech_bet` | Neutralidad de carbono + I+D CAC al máximo |
| `populist` | Maximiza bienestar social e ignora biodiversidad |
| `random_walk` | Cambios aleatorios cada año (control) |
| `do_nothing` | Ninguna política activa (línea de base) |
| `min_max` | Optimizador voraz sobre el puntaje del año siguiente |

`do_nothing` es la línea de base crítica: **si la partida se gana sin hacer nada, el juego no
enseña nada.** Si se pierde catastróficamente sin hacer nada, tampoco (es un tutorial de castigo).

### 5.2 Barrido Monte Carlo

```bash
npx tsx scripts/simulate.ts --runs 200 --seeds 1..200 --all-strategies --out reports/balance.csv
npx tsx scripts/balance-report.ts reports/balance.csv   # genera reports/balance.md
```

El reporte debe contener, por nivel:

- **Tasa de victoria por estrategia** (matriz estrategia × nivel).
- **Distribución del puntaje final** (mediana, p10, p90).
- **Año típico de colapso** para las estrategias que pierden.
- **Indicador que más veces bloquea la victoria** (el "cuello de botella" del nivel).
- **Sensibilidad**: derivada del puntaje final respecto de cada `CONTROL_PARAM` (±10%), ordenada.
  Los cinco parámetros más sensibles son los que hay que calibrar con cuidado y documentar.
- **Correlación entre indicadores finales**: si dos indicadores correlacionan >0,9, uno es redundante
  y el jugador solo tiene que atender uno (falso trade-off).

### 5.3 Criterios de balance aceptable

| Criterio | Umbral |
|---|---|
| `do_nothing` gana el nivel | **Nunca** |
| `do_nothing` colapsa antes del año 5 | No (debe llegar al final del ciclo, perdiendo) |
| Al menos 3 estrategias distintas ganan el nivel | Sí (requisito del archivo `17`) |
| Ninguna estrategia gana más del 60% de las corridas | Sí (no hay estrategia dominante) |
| Tasa global de victoria en nivel 1 | 45–70% (accesible pero no trivial) |
| Tasa global de victoria en nivel 3 | 20–40% |
| Varianza por semilla (mismo jugador, distinta suerte) | El resultado no debe invertirse en >20% de los casos: la suerte no decide |

---

## 6. Explicabilidad hacia el jugador

Con `SimTrace` disponible, agregar (barato, alto impacto pedagógico):

1. **Tooltip de indicador**: "Biodiversidad −3,1 este año: −4,2 conversión a cultivos convencionales,
   +1,1 conservación". Tres términos máximo, ordenados por magnitud.
2. **Contexto del chatbot**: inyectar los 5 términos principales del último `SimTrace` en el prompt.
   Elimina de raíz la alucinación causal de DecarboNito, que hoy inventa explicaciones plausibles.
3. **`docs/audit-equations.md`** enlazado desde el `EquationsManual`, con las tres etiquetas de §4 y
   la fecha de auditoría. Es lo que hace defendible el modelo ante una audiencia académica.

---

## 7. Configuración de testing

```bash
npm i -D vitest @vitest/coverage-v8 tsx fast-check
```

```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.spec.ts'],
    coverage: { include: ['src/sim/**'], thresholds: { lines: 85, functions: 90 } },
  },
  resolve: { alias: { '@': '/src' } },
});
```

```json
// package.json → scripts
"test": "vitest run",
"test:watch": "vitest",
"sim": "tsx scripts/simulate.ts",
"balance": "tsx scripts/simulate.ts --runs 200 --all-strategies --out reports/balance.csv && tsx scripts/balance-report.ts reports/balance.csv"
```

Agregar a CI (GitHub Actions): `npm ci && npm run build && npm test`. El barrido de balance **no**
va en CI (tarda); se corre a mano antes de cada release y su reporte se versiona en `reports/`.

---

## Verificación

1. `src/sim/` no importa nada de `react` ni de `@google/genai`: `grep -r "from 'react'" src/sim/` vacío.
2. Los 10 golden tests pasan sin actualizar snapshots tras la extracción.
3. Los 14 invariantes corren sobre ≥2.000 años simulados sin violaciones.
4. Dos corridas con la misma semilla y las mismas acciones producen estados idénticos (`INV-11`).
5. `reports/balance.md` existe, está versionado y cumple los criterios de §5.3.
6. `docs/audit-equations.md` tiene una etiqueta (`OK`/`CORREGIR`/`DOCUMENTAR`) para cada uno de los
   ~25 puntos de §4, sin ninguno vacío.
7. El tooltip de cada indicador muestra la descomposición del último año.

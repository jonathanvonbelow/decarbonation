# 35 — Motor 2.0: estructura, parámetros y anclas

| | |
|---|---|
| **Objetivo** | Preparar el esqueleto del modelo 2.0: un único integrador `advance(state, dt)` para los dos juegos, la biblioteca matemática, la tabla de parámetros, las anclas del estado inicial y el test *golden* contra el prototipo. |
| **Rama** | `v6-modelo-v2`, creada desde `main` **después** del merge de la fase 34 |
| **Depende de** | 34 |
| **Riesgo** | Medio (refactor del motor; el comportamiento todavía es 1.1 al terminar esta fase) |

## 1. Por qué un integrador único

Hoy `stepYear` (`src/sim/index.ts`) y `stepMonth` (`src/sim/monthly.ts`) repiten el mismo cuerpo con pequeñas
diferencias, y el mensual aproxima con Euler (`toward`). En 2.0 todas las variables acotadas son de relajación, con
discretización exacta, de modo que un solo cuerpo con `dt` sirve para ambos:

```
x(t+dt) = x* + (x(t) − x*) · (1 − k)^dt      dt = 1 (anual) o 1/12 (mensual)
```

Para `dt = 1` es exactamente `x + k (x* − x)`; para `dt = 1/12` conserva el mismo punto fijo y la misma constante de
tiempo anual sin el error de Euler. Los flujos (suelo, dinero, población) se integran como `flujo anual × dt`.

## 2. Archivos

| Archivo | Cambio |
|---|---|
| `src/sim/v2/math.ts` (nuevo) | `sigmoid`, `logit`, `relax`, `sLow`, `sHigh`, `phiEffort`, `toLogitDelta` |
| `src/sim/v2/params.ts` (nuevo) | `PARAMS_V2`: todas las tablas del modelo 2.0 (copia fiel de `P` del prototipo) |
| `src/sim/v2/anchors.ts` (nuevo) | `computeAnchors(state, CP)`: valores de referencia del estado inicial |
| `src/sim/v2/core.ts` (nuevo) | `advance(state, dt, rng, CP, opts)`: orden de operaciones 2.0 |
| `src/sim/v2/README.md` (nuevo) | mapa de módulos, orden, convenciones, qué fase implementa qué |
| `src/sim/index.ts` | `stepYear` = `advance(…, dt = 1)` + bookkeeping; `createInitialState` calcula anclas |
| `src/sim/monthly.ts` | `stepMonth` = `advance(…, dt = 1/12)` + calendario + `flows` para el mapa |
| `src/types.ts` | `ModelAnchors`, `ModelState` (sub-estado 2.0 dentro de `GameState`), campos nuevos de `PolicyState` |
| `src/constants.ts` | escalares nuevos en `CONTROL_PARAMS` (los que el facilitador puede tocar) |
| `tests/sim/core.spec.ts`, `tests/sim/golden.v2.spec.ts` (nuevos) | equivalencia y golden |

## 3. Matemática común — `src/sim/v2/math.ts`

```ts
/** Logistic function. */
export const sigmoid = (x: number): number => 1 / (1 + Math.exp(-x));

/** Inverse logistic on a 0-1 probability, clamped away from 0 and 1. */
export const logit = (p: number): number => {
  const q = Math.min(Math.max(p, 1e-4), 1 - 1e-4);
  return Math.log(q / (1 - q));
};

/** Logistic target on the 0-100 scale: 100 * sigmoid(l0 + drive). */
export const target100 = (l0: number, drive: number): number => 100 * sigmoid(l0 + drive);

/**
 * Exact discretisation of dx/dt = -r (x - xs) with annual step fraction k = 1 - e^{-r}.
 * dt = 1 gives x + k (xs - x); dt = 1/12 keeps the same fixed point and annual time constant.
 */
export const relax = (x: number, xs: number, k: number, dt: number): number => xs + (x - xs) * Math.pow(1 - k, dt);

/** Smooth step: ~1 well below x0, ~0 well above (width w). Replaces hard thresholds `x < x0`. */
export const sLow = (x: number, x0: number, w: number): number => 1 / (1 + Math.exp((x - x0) / w));
export const sHigh = (x: number, x0: number, w: number): number => 1 / (1 + Math.exp(-(x - x0) / w));

/** Diminishing returns of instrument effort (0-100). */
export const phiEffort = (effort: number, e0: number): number => 1 - Math.exp(-effort / e0);

/** Converts a change in points of a 0-100 indicator at its current value into a change in logit units. */
export const toLogitDelta = (points: number, current: number): number => {
  const p = Math.min(0.99, Math.max(0.01, current / 100));
  return points / (100 * p * (1 - p));
};
```

## 4. Parámetros — `src/sim/v2/params.ts`

Copia fiel de `P` en `scripts/reference/modelo_v2.py`. Tablas no editables en vivo; los escalares que el facilitador
puede mover van a `CONTROL_PARAMS` (§5). Cada fase posterior lee de acá; ninguna fase escribe números en funciones.

```ts
import { Policy, LandUseType } from '../../types';

/** Short ids used in the tables; map to the Policy enum once, here. */
export const PID = {
  AS: Policy.Agroecological, CR: Policy.NaturalConservation, GS: Policy.SustainableLivestock,
  AGUA: Policy.SustainableWaterManagement, CN: Policy.CarbonNeutrality, PAI: Policy.IntensiveAgriculture,
  PEA: Policy.AgriculturalExports, PIE: Policy.ForeignInvestment, FRA: Policy.FlexibleEnvironmentalRegulations,
  SE: Policy.EnergySubsidies,
} as const;
export type Pid = keyof typeof PID;

export const PARAMS_V2 = {
  /** 36 — years to reach 63 % of full effect after activation. Criterio experto. */
  rampYears:   { AS: 1.5, CR: 2.5, GS: 1.5, AGUA: 2.0, CN: 2.5, PAI: 1.0, PEA: 0.5, PIE: 1.5, FRA: 0.5, SE: 0.5 },
  /** 36 — fatigue time constant (years of accumulated activity). Replaces efficiencyDecayDuration. */
  fatigueYears: { AS: 15, CR: 25, GS: 12, AGUA: 20, CN: 25, PAI: 8, PEA: 10, PIE: 10, FRA: 6, SE: 5 },
  /** 36/44 — annual cost at full effort, fraction of GDP. Rescaled from v1 costFactor once base spending exists. */
  costShare:   { AS: 0.008, CR: 0.010, GS: 0.006, AGUA: 0.008, CN: 0.012, PAI: 0.006, PEA: 0.003, PIE: 0.005, FRA: 0.002, SE: 0.012 },
  costFixedShare: 0.3,          // share of the cost paid regardless of effort
  effortE0: 40,                 // diminishing returns of effort (phiEffort)

  /** 37 — land: base annual rates (v1 values) and the agricultural reallocation pool. */
  land: {
    BNNP_BNP: 0.008, BNNP_CC: 0.010, BNNP_CA: 0.002, CA_BNNP: 0.001, RES_BNP: 0.04,
    poolShare: 0.02, rentBeta: 1.0, fallowReentry: 0.25, fallowRegen: 0.05,
  },

  /** 38 — carbon. Flux in tCO2e/ha/yr (+ emission), stock in Mg C/ha (biomass + soil relevant to conversion). */
  flux:  { BNP: -1.0, BNNP: 0.5, CA: 0.8, CC: 2.5, PF: -4.0, PRG: 3.0, HUM: -3.0, RES: -9.0, ENR: 0.1, FAL: -2.0 },
  stock: { BNP: 200, BNNP: 170, CA: 60, CC: 45, PF: 90, PRG: 50, HUM: 250, RES: 70, ENR: 40, FAL: 55 },
  energy: {
    eps0: { 1: 4.0, 2: 5.0, 3: 4.6 },  // energy tCO2/cap/yr at start, per level (calibrated: c0 ≈ 6.0 / 7.1 / 5.7)
    electricShare: 0.35, adjust: 0.15, parksFullShare: 0.04, incomeElasticity: 0.3,
    renewablesMaxCN: 0.60, efficiencyMaxCN: 0.35, budgetCut2054: 0.30,
  },

  /** 40 — habitat affinity (countryside species-area), z exponent. */
  habitat: { BNP: 1.0, HUM: 1.0, BNNP: 0.8, RES: 0.55, CA: 0.35, PF: 0.15, PRG: 0.15, FAL: 0.3, CC: 0.05, ENR: 0.05 },
  zSAR: 0.35,
  qB: { CR: 0.55, AS: 0.20, GS: 0.12, AGUA: 0.08, CN: 0.05, PAI: -0.25, PEA: -0.06, PIE: -0.03, FRA: -0.45, SE: -0.10 },

  /** 41 — food balance. */
  food: { yield: { CC: 1.0, CA: 0.7, PRG: 0.25 }, yieldTrend: 0.006, export0: 0.30, kappa1: 2.5, kappa2: 0.6 },

  /** 39 — economic security coefficients (logit units per unit of effective efficiency). */
  bE: { PIE: 0.55, PEA: 0.45, PAI: 0.35, FRA: 0.20, SE: 0.15, AS: 0.10, GS: 0.10, AGUA: 0.05, CN: -0.10, CR: -0.05 },
  productiveValue: { CC: 1.0, CA: 0.8, PRG: 0.6, PF: 0.9, ENR: 1.2 },

  /** 39/45 — social conflict. */
  conflict: { FRA: 0.60, PAI: 0.30, PIE: 0.20, SE: -0.10 },
  greenRelief: { CN: 0.25, CR: 0.25, AGUA: 0.15 },
  conflictWeights: { food: 0.6, econ: 0.5, envPressure: 0.4, gini: 3.0, just: 0.6 },

  /** 42 — pressures: v1 impulse factors, divided by phiScale in logit space. */
  pressure: {
    a: { AS: -2.0, GS: -1.5, PAI: -10.0, PEA: -6.0, CR: 3.0 },
    e: { AS: -5.0, CR: -12.5, GS: -4.0, AGUA: -4.0, CN: -9.0, PAI: 7.5, FRA: 12.5, SE: 10.0 },
    s: { AS: -5.0, AGUA: -3.5, CN: -3.5, CR: -2.5, PAI: 5.0, PIE: 3.5, FRA: 7.5 },
    phiScale: 15,
  },

  /** 43 — pacts as target shifts while active (logit units); costs as fractions of GDP. */
  pacts: {
    biodiversityTreaty:     { entry: 0.03, annual: 0.002, B: 0.25, E: -0.05, protectFactor: 1.5, deforestFactor: 0.5 },
    globalCarbonAccord:     { entry: 0.05, annual: 0.004, E: -0.10, Pc: -0.15, renewables: 0.05, efficiency: 0.05 },
    techTransferInitiative: { entry: 0.10, annual: 0.008, E: 0.15, renewables: 0.10, efficiency: 0.05 },
  },

  /** 44 — public finance. */
  finance: {
    reserveFloor: 0.02, riskPremium: 0.05, debtThreshold: 0.6,
    bankruptcyDebtRatio: 1.0, bankruptcyInterestBurden: 0.20, bankruptcyYears: 2,
    stressMid: 0.20, stressWidth: 0.04,
  },
} as const;
```

## 5. Escalares en `CONTROL_PARAMS`

Agregar (y tipar en `ControlParams`). Son los que el facilitador puede mover en vivo (fase 50 los expone):

```ts
// v6 — modelo 2.0
Poblacion_Inicial: 400_000,                 // 00_INDICE_v6 decisión 4
Velocidad_Ajuste_Biodiversidad: 0.12,       // k_B, fracción anual del camino al objetivo
Velocidad_Ajuste_Seg_Alimentaria: 0.35,     // k_F
Velocidad_Ajuste_Seg_Economica: 0.30,       // k_E
Velocidad_Ajuste_Conflicto: 0.35,           // k_C
Velocidad_Ajuste_Colapso: 0.25,             // k_P
Velocidad_Ajuste_Presiones: 0.35,           // k_pi
Eficiencia_Minima_Politicas: 0.35,          // piso institucional (36)
Recuperacion_Politicas_Anios: 5,            // recuperación del desgaste en reposo (36)
Gasto_Publico_Base_Nivel_1: 0.13,           // fracción del PBI (44)
Gasto_Publico_Base_Nivel_2: 0.125,
Gasto_Publico_Base_Nivel_3: 0.125,
```

`Gasto_Publico_Base_*` es el parámetro más sensible del modelo (ver paper §9): +20 % deja la cartera verde con −14
puntos de seguridad económica en N2. Dejar ese aviso en el comentario.

## 6. Tipos — `src/types.ts`

```ts
export interface ModelAnchors {
  /** Logit of each bounded indicator at level start. */
  l: { B: number; F: number; E: number; C: number; Pc: number; pa: number; pe: number; ps: number };
  B0: number; F0: number; E0: number; W0: number;
  habitat0: number; foodPerCapita0: number; productiveValue0: number; concentration0: number;
  productiveShare0: number; shareCC0: number; sharePF0: number; forestShare0: number;
  c0: number; emissions0: number; pressureMean0: number; pressureSpread0: number; pressureEnv0: number;
  gdp0: number; agriAreas0: Record<'CC' | 'CA' | 'PRG' | 'PF', number>;
}

export interface TargetImpulse { indicator: 'B' | 'F' | 'E' | 'C' | 'Pc' | 'pa' | 'pe' | 'ps'; logit: number; t: number; tau: number; }

export interface ModelState {
  version: string;
  t: number;                                   // years since level start
  anchors: ModelAnchors;
  targets: Partial<Record<TargetImpulse['indicator'], number>>;   // last computed X*, for UI and debugging
  energy: { renewableShare: number; efficiency: number };
  emissions: { energy: number; afolu: number; luc: number; total: number };   // tCO2e/yr
  cumulativeEmissions: number;
  fiscal: { growth: number; primaryBalance: number; interestBurden: number; stress: number; breachYears: number; primaryHistory: [number, number][] };
  impulses: TargetImpulse[];
  productiveYears: number;
  yieldShock: number;
}

// GameState: agregar
model?: ModelState;   // undefined only for states created before 2.0 (never in practice after this phase)

// PolicyState: agregar (reemplazan a Tiempo_Activacion_* y efficiencyDecayDuration)
rampTime?: number;      // years since last activation (0 when inactive)
fatigueTime?: number;   // accumulated active years, decays while inactive
```

Los stocks Stella que la UI y Gemini leen (`PBI_Real`, `Deuda`, `Reservas_del_Tesoro`, `PP_*`, `Conflicto_social`,
`Colapso_politico`, `Poblacion_Total`) **se conservan** como almacenamiento: el motor 2.0 los escribe. Los
`Tiempo_Activacion_*` y `Conteo_*` se borran en la fase 36.

## 7. `advance()` — orden de operaciones 2.0 (`src/sim/v2/core.ts`)

```ts
/**
 * One step of the 2.0 model. dt = 1 (3-level game) or 1/12 (Territorio).
 * Order (each step reads what the previous ones already updated):
 *  1. population            P *= (1 + g_P)^dt
 *  2. policy clocks         rampTime/fatigueTime (36)
 *  3. random events         independent draws, level shocks, land -> fallow (46)
 *  4. effective efficiency  per policy and channel (36)
 *  5. land                  conservative transition matrix, realised flows in ha (37)
 *  6. economy               GDP, revenue, base spending, policies, pacts, debt (44)
 *  7. carbon                energy, AFOLU flux, LUC from realised flows (38)
 *  8. indicators            B -> F -> E -> C (W) -> Pc (St) -> pressures (39-42, 45)
 *  9. bookkeeping           cumulative emissions, fiscal history, productive years, game over
 * Pure: never mutates its input; deterministic for a given (state, dt, rng, CP, opts).
 */
export function advance(state: GameState, dt: number, rng: Rng | null, CP: ControlParams, opts: AdvanceOptions = {}): AdvanceResult
```

En **esta** fase `advance` todavía llama a las funciones 1.1 (en el orden 1.1) para que el comportamiento no cambie:
el objetivo es mover el código, no las ecuaciones. Cada fase siguiente reemplaza un paso. `stepYear` y `stepMonth`
quedan como envoltorios finos; `stepMonth` sigue devolviendo `flows`, `landUseDelta`, `upkeep`, `month`, `yearRolled`.

## 8. Anclas — `src/sim/v2/anchors.ts`

`computeAnchors(state, CP)` se llama al final de `createInitialState` y guarda en `state.model.anchors` los valores
de §6 calculados sobre el estado inicial del nivel (habitat, producción per cápita, valor productivo, concentración,
participaciones, CO₂ inicial con el flujo de suelo del primer año — usar una corrida en seco de la matriz, como hace
el prototipo —, presiones). Los logits se toman de los valores iniciales de cada indicador. El Nivel 1 arranca con
`Colapso_politico = 5` (antes 0) para que su logit sea finito: anotar el cambio en el log.

## 9. Golden test — `tests/sim/golden.v2.spec.ts`

```ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
/** Activated in phase 46, once every submodel of 2.0 is in place. */
const GOLDEN_ACTIVE = false;

describe.skipIf(!GOLDEN_ACTIVE)('2.0 engine matches the reference prototype (no events)', () => {
  const rows = readFileSync('scripts/reference/golden_v2.csv', 'utf8').trim().split('\n').slice(1).map((l) => l.split(','));
  it.each(rows)('L%s %s year %s', (level, strategy, year, B, F, E, W, St, c) => {
    const h = playLevel(Number(level), strategy, Number(year));           // helper in tests/sim/testHelpers.ts
    expect(h.biodiversity).toBeCloseTo(Number(B), 0);                     // ±0.5 points
    expect(h.foodSecurity).toBeCloseTo(Number(F), 0);
    expect(h.economicSecurity).toBeCloseTo(Number(E), 0);
    expect(h.socialWellbeing).toBeCloseTo(Number(W), 0);
    expect(h.politicalStability).toBeCloseTo(Number(St), 0);
    expect(Math.abs(h.co2EqEmissionsPerCapita - Number(c))).toBeLessThan(0.1);
  });
});
```

`playLevel` usa las estrategias de `scripts/harness/strategies.ts` y `rng = () => 0.999` (sin eventos, sin choques
de rendimiento: en el prototipo, `--golden` corre sin `rng`).

## 10. Si el equipo eligió congelar el juego de 3 niveles en 1.1 (decisión 3, alternativa)

Antes de cualquier cambio de esta fase: copiar `src/sim/` a `src/sim-v1/` tal cual está en `main` (modelo 1.1),
apuntar `src/App.tsx` y `scripts/simulate.ts` a `src/sim-v1`, y desarrollar 2.0 solo para Territorio. Los tests de
`tests/sim/` se duplican en `tests/sim-v1/` con las expectativas actuales.

## 11. Verificación

- [ ] `npm run sim:check -- --quick` da **los mismos números** que el reporte 1.1 (la fase solo reorganiza).
- [ ] `tests/sim/core.spec.ts`: `relax(x, xs, k, 1)` = `x + k (xs − x)`; doce pasos de `relax(…, 1/12)` = un paso anual
      (precisión 1e-9); `advance` no muta la entrada.
- [ ] `createInitialState(n).gameStatePatch.model.anchors` existe para n = 1, 2, 3 y sus logits reproducen los valores
      iniciales.
- [ ] `npx tsc --noEmit`, `npm test`, `npm run build` limpios. `MODEL_VERSION` pasa a `'2.0-dev'` en la rama.

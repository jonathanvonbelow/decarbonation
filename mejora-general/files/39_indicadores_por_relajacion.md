# 39 — Indicadores por relajación hacia un objetivo anclado: seguridad económica, conflicto y colapso

| | |
|---|---|
| **Objetivo** | Introducir el marco común de los indicadores 2.0 —objetivo logístico anclado al estado inicial y relajación con discretización exacta— y aplicarlo a seguridad económica (E), conflicto social (C, bienestar W = 100 − C) y colapso político (Pc, estabilidad St = 100 − Pc). Reemplazar los umbrales en escalón por desvíos continuos. |
| **Rama** | `v6-modelo-v2` |
| **Depende de** | 38 |
| **Cierra** | N-04/T-04 (E inmóvil), N-05 (bienestar condenado por umbrales que el estado inicial ya viola), I-2, I-3, I-6 |
| **Riesgo** | Alto |

## 1. Marco común (vale también para 40, 41 y 42)

Para cada indicador acotado X ∈ {B, F, E, C, Pc, πa, πe, πs}:

```
objetivo:    X* = 100 · σ( ℓ_X0 + D_X(t) )         ℓ_X0 = logit(X_0/100),  D_X(0) = 0 sin políticas
dinámica:    X(t+dt) = X* + (X(t) − X*) · (1 − k_X)^dt
```

- `D_X` es la suma de **impulsores**, todos escritos como desvío respecto del estado inicial del nivel (anclas de
  la fase 35) o como efecto de una política (0 si está apagada). Por construcción, un nivel sin políticas y con el
  territorio quieto no se mueve: lo que el jugador ve es atribuible.
- El objetivo vive en (0, 100) sin recortes; no hay `clip` por término ni topes ±4/±5.
- `k_X` = `CP.Velocidad_Ajuste_*` (fase 35). Constante de tiempo ≈ 1/k años (E: ~3 años; B: ~8 años).
- Los choques de eventos se aplican como saltos de nivel sobre X (fase 46): la relajación los disipa solos.
- Las decisiones con efecto duradero (pactos, situaciones) entran como desplazamientos de `D_X` (43, 47), con un
  tope `|Σ impulsos de situaciones| ≤ 0,6` unidades logit por indicador.

Un desplazamiento de `D` en 0,5 unidades logit mueve X ≈ 12 puntos cerca de 50 y ≈ 10,5 puntos cerca de 25 (25 → 35,5;
v6/39: decía "≈ 9").

## 2. Seguridad económica

```
D_E = Σ_j bE_j · η_j^prod  −  0,15·η_CN^tax
    + 0,25 · (g − 0,02)/0,01                     crecimiento del PBI respecto de la base
    + 1,5 · (V/V_0 − 1)                           valor productivo del suelo, V = Σ v_k·a_k
    + 0,15 · (B − B_0)/20                         servicios ecosistémicos
    − 0,8 · φ_fiscal                              estrés fiscal (fase 44; 0 hasta entonces)
    − 0,04 · τ                                    presión fiscal adicional (pp)
    − 0,6 · sLow(F; 20, 4)                        volatilidad por crisis alimentaria
    + Σ pactos.E + cap(impulsos E)
```

`bE`, `productiveValue` en `PARAMS_V2` (fase 35). `a_k = A_k / ΣA`.

## 3. Conflicto social y bienestar

```
D_C = 0,6·(F_0 − F)/15 + 0,5·(E_0 − E)/15 + 0,4·(πe − πe_0)/20        inseguridad y movilización ambiental
    + Σ_j conflict_j · η_j^social + 0,3·φ_fiscal·η_SE^social           políticas que generan o alivian conflicto
    − Σ_j greenRelief_j · η_j^social                                   CN, CR, AGUA (antes, bonos por umbral)
    + 2,0·(a_CC − a_CC0) + 1,0·(a_PF − a_PF0)                          expansión de usos intensivos
    + [concentración y transición justa: fase 45]
    + 0,03·τ + 0,6·φ_fiscal + desgaste de situaciones (47) + cap(impulsos C)
W = 100 − C
```

Antes, `F < 45` y `E < 45` sumaban 7,5 puntos de conflicto por año desde el primer día (los tres niveles arrancan con
F y E por debajo de 45), y el bienestar convergía a ≤ 17 en cualquier estrategia. Ahora el castigo es proporcional al
deterioro **respecto del inicio**.

## 4. Colapso político y estabilidad

```
D_Pc = 0,9·(W_0 − W)/20 + 0,5·(E_0 − E)/20 + 0,8·φ_fiscal
     + 0,5·(polarización − pol_0)/30 + 0,6·(π̄ − π̄_0)/20 + Σ pactos.Pc + cap(impulsos Pc)
St = 100 − Pc
```

`polarización = max(π) − min(π)`; `π̄` = media de las tres presiones (del paso anterior; las presiones se actualizan
después, fase 42). El Nivel 1 arranca con `Pc = 5` (St = 95) para que el logit sea finito.

Fin de juego (sin cambios de umbral): St ≤ 5, B ≤ 5, F ≤ 10 (desde N2). Con objetivos logísticos anclados, llegar a
St ≤ 5 desde St = 70 exige ≈ +3,8 unidades logit: una crisis combinada (bienestar −40, presiones +30, estrés fiscal),
no un descuido.

## 5. Implementación

| Archivo | Cambio |
|---|---|
| `src/sim/v2/indicators.ts` (nuevo) | `targetE`, `targetC`, `targetPc`, `stepIndicator(x, target, k, dt)`, `impulseSum(state, X)` |
| `src/sim/v2/core.ts` | paso 8: B y F siguen con 1.1 hasta 40 y 41; E, C, Pc con 2.0 |
| `src/sim/indicators.ts` | `calculateEconomicSecurityChange`, `calculateSocialConflictChange`, `calculatePoliticalCollapseChange` se borran |
| `src/constants.ts` | borrar `INDICATOR_IMPACT_WEIGHTS.ECONOMIC_SECURITY`, `.SOCIAL_WELLBEING`, `.POLITICAL_STABILITY`, `Tasa_disipacion_social` (lo reemplaza `Velocidad_Ajuste_Conflicto`), `Umbral_polarizacion`, `EcoSec_Reduction_Factor_Per_Tax_Point`, `SocialConflict_Increase_Factor_Per_Tax_Point` |
| `src/types.ts` | `ModelState.targets` se completa con E*, C*, Pc* |

Pseudocódigo del objetivo (el resto es análogo):

```ts
export function targetE(s: GameState, eff: Record<Pid, PolicyEfficiency>, CP: ControlParams): number {
  const a = s.model!.anchors;
  let d = 0;
  (Object.keys(PARAMS_V2.bE) as Pid[]).forEach((j) => { d += PARAMS_V2.bE[j] * eff[j].prod; });
  d -= 0.15 * (eff.CN.tax ?? 0);
  d += 0.25 * (s.model!.fiscal.growth - CP.Tasa_Base_Crecimiento_PBI) / 0.01;
  d += 1.5 * (productiveValue(s.landUses) / a.productiveValue0 - 1);
  d += 0.15 * (s.indicators.biodiversity - a.B0) / 20;
  d -= 0.8 * s.model!.fiscal.stress;
  d -= 0.04 * s.additionalTaxPressurePercentage;
  d -= 0.6 * sLow(s.indicators.foodSecurity, 20, 4);
  d += pactShift(s, 'E') + capImpulses(impulseSum(s, 'E'));
  return target100(a.l.E, d);
}
```

## 6. Tests — `tests/sim/indicators.v2.spec.ts`

- **Ancla:** estado inicial de cada nivel, sin políticas, con suelo y economía congelados (mock): E*, C*, Pc* = valores
  iniciales (±1e-9).
- **Relajación:** con objetivo fijo, 12 pasos mensuales = 1 paso anual (±1e-9).
- **Respuesta:** PIE a eficiencia 1 (con su efecto sobre el crecimiento, +0,01) sube E* de 30 a ≈ 48,8 (±1).
- **Sin escalones:** C* es continua en F (sin saltos al cruzar 45).
- **Rango (arnés, criterio C6):** con B y F todavía en 1.1, el recorrido de W entre estrategias extremas en N2 debe
  ser ya ≥ 15 (prototipo completo, año 30 sin eventos: extractiva 55,1 → innovación 75,2, ≈ 20; con `tech_tax`, 51,3, ≈ 24).

## 7. Verificación

- [ ] `npm run sim:check -- --quick`: C6 mejora para E y W; ninguna estrategia termina en colapso político.
- [ ] La UI no supone que W o St puedan valer exactamente 0 o 100 (revisar barras y textos).
- [ ] `npx tsc --noEmit`, `npm test`, `npm run build` limpios.
- [ ] `docs/audit-equations.md`: I-2 (ahora relajación), I-3 (sin recortes), I-6 (polarización y nivel medio) actualizados.

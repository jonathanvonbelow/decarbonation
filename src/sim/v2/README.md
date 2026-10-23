# `src/sim/v2/` — motor del modelo 2.0

Esqueleto del modelo 2.0 de DecarboNation (paquete v6, `mejora-general/files/35`–`51`). El prototipo ejecutable de
todas las ecuaciones es `scripts/reference/modelo_v2.py`; sus valores sin eventos están en
`scripts/reference/golden_v2.csv`. **El prototipo manda en las ecuaciones, el arnés (`npm run sim:check`) en la
calibración.**

## Módulos

| Archivo | Contenido |
|---|---|
| `math.ts` | `sigmoid`, `logit`, `target100`, `relax` (discretización exacta), `sLow`/`sHigh`, `phiEffort`, `toLogitDelta` |
| `params.ts` | `PARAMS_V2`: tablas del modelo (copia fiel de `P` del prototipo), `PID` (códigos cortos → enum `Policy`) |
| `anchors.ts` | `computeAnchors` / `createModelState`: anclas del estado inicial de cada nivel (`GameState.model`) |
| `policies.ts` | fase 36: `tickPolicyClocks`, `baseEfficiency`, `channelStrength`, `computeEfficiencies` (η base + canales `land`/`prod`/`social`, y `elec`/`other`/`tax` de CN), `policyCost` (por esfuerzo), `policyStatus` ("en marcha" / "desgastada" para la UI) |
| `carbon.ts` | fase 38: `energyTargets` / `updateEnergyState` (s*, u*, inercia k = 0,15), `fluxOf`, `computeEmissions` (energía, AFOLU, LUC desde los flujos realizados ÷ dt, total y per cápita en tCO₂e), `budgetPath` / `carbonBudgetIndex` (B_t), `CO2_PER_C` = 44/12 |
| `land.ts` | fase 37: `landFlows` (matriz conservativa: frontera, barbecho, pool agrícola por renta anclada, neteo), `realiseLandFlows` / `applyLandFlows` (dt exacto, sin negativos, flujos en kHa y ha), `transferArea`, `applyLandEffects` (efectos de suelo de eventos y situaciones) |
| `core.ts` | `advance(state, dt, rng, CP, opts)`: el integrador único de los dos juegos |

`stepYear` (`src/sim/index.ts`) es `advance(…, dt = 1)`; `stepMonth` (`src/sim/monthly.ts`) es
`advance(…, dt = 1/12, { month })`. `createInitialState` guarda las anclas en `gameStatePatch.model`.

## Orden de operaciones 2.0 (objetivo)

1. población `P *= (1 + g_P)^dt`
2. relojes de políticas `rampTime` / `fatigueTime` (36)
3. eventos aleatorios: sorteos independientes, choques de nivel, suelo → barbecho (46)
4. eficiencia efectiva por política y canal (36)
5. suelo: matriz de transición conservativa, flujos realizados en ha (37)
6. economía: PBI, recaudación, gasto base, políticas, pactos, deuda (44)
7. carbono: energía, flujo AFOLU, LUC de los flujos realizados (38)
8. indicadores B → F → E → C (W) → Pc (St) → presiones (39–42, 45)
9. contabilidad: emisiones acumuladas, historia fiscal, años productivos, fin de partida

Hoy (`MODEL_VERSION = '2.0-dev'`, fase 35) `advance` todavía ejecuta las funciones 1.1 en el orden 1.1 (pasos
0–14 + 11.5 del viejo `stepYear`, ver el comentario de cabecera de `core.ts`): `stepYear` y `stepMonth` dan
exactamente los números de antes. Lo único que todavía depende de que `dt` sea el paso anual — porque 1.1 tenía dos
cuerpos distintos — es: el `toward` de Euler de los stocks 1.1 (con `dt = 1` toma el valor anual tal cual), el sorteo
de eventos (anual / mensual), el préstamo y el calendario. Lo eliminan las fases 39–46.

## Qué fase implementa qué

| Fase | Paso de `advance` / módulo | Estado |
|---|---|---|
| 35 | estructura, `math`, `params`, `anchors`, `advance` con funciones 1.1, golden test apagado | hecho |
| 36 | pasos 2 y 4: puesta en marcha, fatiga, recuperación, instrumentos (`rampYears`, `fatigueYears`, `INSTRUMENT_CHANNELS`, costo por esfuerzo) | hecho (costo con la escala puente `costShareBridge` hasta la 44) |
| 37 | paso 5: matriz conservativa, barbecho, reasignación por renta (`land`, `agriAreas0`) | hecho (tasas base de frontera en `CONTROL_PARAMS`) |
| 38 | paso 7: carbono físico, energía, LUC (`flux`, `stock`, `fluxPolicy`, `energy`; `Poblacion_Total` = `Poblacion_Inicial`, crecimiento `(1 + g)^dt`) | hecho (topes de CO₂ de las rutas reescalados de forma provisoria hasta la 49) |
| 39 | paso 8: marco logístico, E, conflicto, colapso (`Velocidad_Ajuste_*`) | pendiente |
| 40 | B por especies-área (`habitat`, `zSAR`, `qB`) | pendiente |
| 41 | F por balance oferta/demanda (`food`, `foodPerCapita0`) | pendiente |
| 42 | presiones en logit, ancladas (`pressure`) | pendiente |
| 43 | pactos como desplazamiento de objetivo (`pacts`) | pendiente |
| 44 | paso 6: gasto base, deuda automática, quiebra (`finance`, `Gasto_Publico_Base_*`); `costShareOf` pasa a `costShare` (κ) y se borra `costShareBridge` | pendiente |
| 45 | conflicto distributivo (`conflict`, `greenRelief`, `conflictWeights`) | pendiente |
| 46 | paso 3 y mensual exacto (`relax` en lugar de `toward`); `GOLDEN_ACTIVE = true` | pendiente |

## Convenciones

- Ningún número del modelo vive en una función: tablas en `params.ts`, escalares que el facilitador puede mover en
  `CONTROL_PARAMS` / `ControlParams` (`src/constants.ts`, `src/types.ts`), con unidad, fuente o "criterio experto" e ID
  de fase. Los coeficientes que el prototipo escribe dentro de sus funciones pasan a `params.ts` en la fase que porta
  cada función.
- Pureza: nada aquí importa React ni usa `Math.random` / `Date.now`; la aleatoriedad entra por `Rng`. `advance` nunca
  muta su entrada (`tests/sim/core.spec.ts`).
- Pactos con los IDs del código (`biodiversityTreaty`, `globalCarbonAccord`, `techTransferInitiative`), no los del
  prototipo (`treaty` / `accord` / `tech`).
- Población: `CP.Poblacion_Inicial` (400 000) en las anclas (`pop0`) y como `Poblacion_Total` inicial (fase 38).
- Golden: `tests/sim/golden.v2.spec.ts` (apagado con `GOLDEN_ACTIVE = false` hasta la fase 46) compara B, F, E, W, St
  y c de `playLevel` (`tests/sim/testHelpers.ts`, estrategias de `scripts/harness/strategies.ts`, sin eventos) con
  `golden_v2.csv`. Si una fase cambia una ecuación o un parámetro del prototipo, regenera el golden en el mismo commit
  (`python scripts/reference/modelo_v2.py --golden > scripts/reference/golden_v2.csv`).

## Recortes

Ninguno en la fase 35.

Fase 36: el costo de las políticas usa la fórmula por esfuerzo de la spec (`κ·Y·(0,3 + 0,7·ē)`) pero con la escala
1.1 (`PARAMS_V2.costShareBridge`, los viejos `costFactor`) en lugar de κ (`costShare`): κ está calibrado contra el
gasto público base de la fase 44, que todavía no existe; con κ el tesoro nunca aprieta y `sim:check -- --quick` pierde
C3 (`buy_everything` de Territorio y `green` de N1 ganan todas las rutas). La fase 44 cambia `costShareOf` a κ.
Los submodelos 1.1 leen la eficiencia por `getPolicyEfficiency` = `eff[pid].prod`; cada fase 37–45 pasa su submodelo
a su canal (`land`, `social`, `elec`/`other`/`tax`).

Fase 37: ningún recorte de la spec. Las tasas base de frontera quedan en `CONTROL_PARAMS` (no se duplican en
`PARAMS_V2.land`). Hasta la fase 38 el carbono 1.1 lee la matriz 2.0, y sin el flujo CC→CA de 1.1 las emisiones
suben (rutas dirigidas de los 3 niveles en 0 % en `sim:check --quick`): transitorio, documentado en el log.

Fase 38: ningún recorte de la spec. Desvíos: el doble acotado del prototipo (`min(0,95, s*)` dentro del `relax`, después
de acotar s* a 0,9) no se porta por redundante; las claves `s`/`u` de pactos del prototipo son `renewables`/`efficiency`;
los canales son los de la spec (η_PAI^prod en CC, η^land en el resto y en SE), el prototipo usa el `eta` uniforme (iguales
con reparto parejo). El paso de carbono va justo después de la economía (como el prototipo), antes de los indicadores 1.1.
Los topes de CO₂ de las rutas (`winRoutes.ts`, `territorio/routes.ts`) se reescalaron de forma provisoria; los recalibra la
fase 49. El umbral 8 t de la presión ambientalista por CO₂ (fase 42), el escrutinio `c > 12` (fase 46) y
`RANGE.co2 = 15` de la predicción (fase 48) quedan en la escala vieja, anotados en el log.

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
| `indicators.ts` | fase 39: marco común X* = 100·σ(ℓ₀ + D), `stepIndicator` (= `relax`), `impulseSum` / `capImpulses` (±0,6), `pactShift`, `productiveValue`, `driveE` / `driveC` / `drivePc`, `targetE` / `targetC` / `targetPc`, `updateRelaxedIndicators` (paso 8: E → C (W) → Pc (St)) |
| `biodiversity.ts` | fase 40: `habitatIndex` (H = Σ h·a, también el ancla H₀), `driveB` / `targetB` (especies-área en logit, γ_H = z/(1 − B₀/100), calidad de manejo qB·η^land, sinergias continuas, conectividad γ_K·ln(K/K₀) solo con mapa, pactos), `connectivityTerm`, `updateBiodiversity` (paso 8, primero) |
| `food.ts` | fase 41: `exportShare` (x = 0,30 + 0,20·η_PEA), `domesticSupply` (Q, también el ancla ρ₀), `foodPerCapita` (ρ con piso 0,001·ρ₀), `meanYield` (capa del mapa), `driveF` / `targetF` (κ₁·ln(ρ/ρ₀) + 0,6·(E − E₀)/50, κ₁ = 3,0 desde la 49b; 2,5 en la spec 41), `updateFoodSecurity` (paso 8, segundo; lee la E del paso anterior) |
| `pressures.ts` | fase 42: `productiveShare` (a_prod = (CC + CA + PRG)/ΣA, PF fuera), `sectorSize` (σ_prod), `drivePressures` / `targetPressures` (φ·η^social/15, σ_prod solo sobre la suma de políticas de π_a, desvíos de E, F, a_prod, B, c, W y τ, desgaste, impulsos con tope), `updatePressures` (paso 8, último) |
| `pacts.ts` | fase 43: `pactParams`, `pactShift` (B / E / Pc, logit), `pactEnergyShift` (s* / u*), `pactLandFactors` (frontera BNNP → BNP / CC), `pactAnnualCost` / `pactEntryCost` / `pactYearlyCostOf` (fracciones del PBI) |
| `land.ts` | fase 37: `landFlows` (matriz conservativa: frontera, barbecho, pool agrícola por renta anclada, neteo), `realiseLandFlows` / `applyLandFlows` (dt exacto, sin negativos, flujos en kHa y ha), `transferArea`, `applyLandEffects` (efectos de suelo de eventos y situaciones) |
| `core.ts` | `advance(state, dt, rng, CP, opts)`: el integrador único de los dos juegos |
| `research.ts` | fase 48: índices de investigación (no están en el prototipo): `brierDeterministic` / `brierProbabilistic` / `skillScore` / `predictionSkill`, `oneYearRegret` (cartera vs. vecinas, misma semilla), `safeJustGap`, `ResearchTracker` (`trackStep`, `trackRegret`), `policyEntropy`, `researchIndices` (objeto de `research_indices`) |

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

Desde la fase 46 `advance` ejecuta este orden con un solo cuerpo para todo `dt` (sin ramas por `dt`: el calendario
avanza 12·dt meses y cambia de año después de diciembre). `stepMonth` = `advance(…, 1/12)`; `stepYear` = `advanceYear`
= 12 sub-pasos mensuales sobre una sola copia del estado (`stepInPlace`), igual que el prototipo (`play_level`,
`SUBSTEPS_PER_YEAR`). Los dos juegos comparten la discretización: sin eventos, anual y mensual coinciden (C9 = 0).

## Qué fase implementa qué

| Fase | Paso de `advance` / módulo | Estado |
|---|---|---|
| 35 | estructura, `math`, `params`, `anchors`, `advance` con funciones 1.1, golden test apagado | hecho |
| 36 | pasos 2 y 4: puesta en marcha, fatiga, recuperación, instrumentos (`rampYears`, `fatigueYears`, `INSTRUMENT_CHANNELS`, costo por esfuerzo) | hecho (costo con la escala puente `costShareBridge` hasta la 44, que la borró) |
| 37 | paso 5: matriz conservativa, barbecho, reasignación por renta (`land`, `agriAreas0`) | hecho (tasas base de frontera en `CONTROL_PARAMS`) |
| 38 | paso 7: carbono físico, energía, LUC (`flux`, `stock`, `fluxPolicy`, `energy`; `Poblacion_Total` = `Poblacion_Inicial`, crecimiento `(1 + g)^dt`) | hecho (topes de CO₂ de las rutas reescalados de forma provisoria hasta la 49) |
| 39 | paso 8: marco logístico, E, conflicto, colapso (`Velocidad_Ajuste_*`, `bE`, `productiveValue`, `conflict`, `greenRelief`, `conflictWeights`, `relaxation`) | hecho (presiones de D_C/D_Pc todavía 1.1 hasta la 42; φ_fiscal puente sobre la deuda 1.1 hasta la 44) |
| 40 | paso 8: B por especies-área (`habitat`, `zSAR`, `qB`, `biodiversity`, `Velocidad_Ajuste_Biodiversidad`; conectividad K del mapa vía `AdvanceOptions.connectivity`) | hecho (FAL sigue con su peso 1.1 en F hasta la 41) |
| 41 | paso 8: F por balance oferta/demanda (`food`, `foodPerCapita0`, `Velocidad_Ajuste_Seg_Alimentaria`; choque ε = `model.yieldShock`, 0 hasta la 46) | hecho (`src/sim/indicators.ts`, `INDICATOR_IMPACT_WEIGHTS` y `Pact.impulses` borrados) |
| 42 | paso 8, último: presiones en logit, ancladas (`pressure`, `Velocidad_Ajuste_Presiones`) | hecho (desgaste de situaciones como desplazamiento hasta la 47) |
| 43 | pasos 4, 5, 7.5 y 8: pactos como datos (`pacts`): desplazamientos, frontera, costos ∝ PBI | hecho (entrada pagada de las reservas hasta la 44) |
| 44 | paso 6: gasto base, deuda automática, quiebra (`finance.ts`, `PARAMS_V2.finance`, `Gasto_Publico_Base_*`); `costShareOf` pasa a `costShare` (κ) y se borra `costShareBridge`; `payPublicInvestment` | hecho (`src/sim/economy.ts` borrado; φ, B, F, E, c y D/Y coinciden con el golden ±5e-4 sin eventos) |
| 45 | conflicto distributivo: G y J en D_C (`src/sim/v2/social.ts`, `conflictWeights.gini/just`, `justTransition`; `model.social`) | hecho (golden W/St coinciden) |
| 46 | paso 3: eventos con sorteo independiente, choques de nivel, ε AR(1) (`src/sim/events.ts`, `PARAMS_V2.events`); paso anual = 12 sub-pasos mensuales; `deferred.ts` borrado; `GOLDEN_ACTIVE = true` | hecho (golden activo y exacto) |
| 47 | Territorio: situaciones como impulsos del objetivo (`model.impulses`, vida media 18 meses, tope ±0,6, descarte a 6τ; `PARAMS_V2.situations`), descuido del escritorio sobre D_Pc (`AdvanceOptions.wear.Pc`), `investmentScale` √(Y/Y₀) en costos de situaciones y lotes | hecho (`SITUATION_EFFECT_SCALE` borrado; prototipo sin golden nuevo) |
| 48 | fuera de `advance`: bandas de predicción por terciles (`scripts/prediction-bands.ts`), índices de investigación (`research.ts`, `PARAMS_V2.research`) | hecho (el modelo no cambia) |
| 50 | fuera de `advance`: interfaz, manuales, hoja docente y DecarboNito leen el submodelo con `src/game/modelView.ts`; `advanceYear` anota `eventsThisYear` (solo contabilidad) | hecho (el modelo no cambia) |

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
- Golden: `tests/sim/golden.v2.spec.ts` (activo desde la fase 46; `playLevel` corre con `noShocks`) compara B, F, E, W, St
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

Fase 39: ningún recorte de la spec. El estrés fiscal φ se adelanta como puente (fórmula del prototipo sobre la deuda 1.1;
la 44 lo reemplaza). Lo que todavía no existe vale 0 y lo agrega su fase: concentración y transición justa del conflicto (45), desgaste de situaciones (47); `model.impulses` se lee y se acota a
±0,6 pero nada lo escribe antes de la 47. Desvíos: (1) el término de crisis alimentaria es un desvío respecto del inicio,
`−0,6·[sLow(F) − sLow(F₀)]` — el prototipo restaba `0,6·sLow(F)` a secas (−0,014 logit en F₀ = 35, así que E* ≠ E₀ sin
políticas); corregido también en el prototipo y regenerado `golden_v2.csv`. (2) El crecimiento g del impulsor de E es la
tasa anual de la economía 1.1 de este paso (`model.fiscal.growth`, arranca en `Tasa_Base_Crecimiento_PBI`). (3) Los
pactos desplazan E* y Pc* con `PARAMS_V2.pacts.*.E` / `.Pc`: el +3 de estabilidad del Acuerdo de Carbono y los
`impulses.economicSecurity` de 1.1 se borraron (los `impulses` de B y F siguen hasta 40/41). (4) Un choque sobre W o St
(diferido) se escribe también en su stock (`Conflicto_social` / `Colapso_politico`) para que la relajación lo disipe.
(5) Los términos de presiones de D_C y D_Pc leen las presiones 1.1, que se saturan en 0/100 (polarización 100): con
`extractive` N2/N3 el colapso político llega a St ≤ 5 hacia el año 19 (el prototipo, con presiones ancladas, termina en
St 55 / 47). Transitorio hasta la fase 42.


Fase 40: sin recortes de ecuación. B es el port exacto del bloque B del prototipo (24 casos ±1e-9). Desvíos: (1) la
conectividad K (spec §3) no está en el prototipo; se agrega solo en Territorio, con piso K ≥ 0,001·K₀
(`PARAMS_V2.biodiversity.connectivityFloor`) para que un mapa sin bosque no dé ln 0. (2) K se cachea en la sesión
(`Session.connectivity`) y se recalcula solo si el mapa cambió desde el último cálculo o los cambios del mes tocaron
bosque (BNNP, BNP, RES). (3) `targetB` no recibe `CP` (ningún término lo lee; k_B se aplica en `updateBiodiversity`).

Fase 41: sin recortes de ecuación. F es el port exacto de `food_production` + bloque F del prototipo (24 casos ±1e-9,
con t, población y choque ε variables). El choque ε queda en 0 hasta la fase 46 (`model.yieldShock`, el gancho ya
está). Con esto los cinco indicadores acotados (B, F, E, W, St) relajan exacto; quedan en 1.1 + `toward` las presiones
(42) y el dinero (44).

Fase 42: sin recortes de ecuación. Las presiones son el port exacto del bloque del prototipo (24 casos ±1e-9, con desgaste).
Desvíos: (1) canal η^social (spec) en lugar del `eta` uniforme del prototipo (iguales con reparto parejo). (2) El desgaste de
situaciones abiertas es un desplazamiento de los objetivos de C y de las tres presiones (`AdvanceOptions.wear`, de `wearShift`:
0,04 logit por punto del catálogo × factor de edad 1–2, como `play_territorio` del prototipo); antes empujaba los stocks
(`applyWear`, borrada) y la relajación lo disipaba. La 47 porta las situaciones como impulsos. (2b) `targetPressures(state, eff,
wear)` no recibe `CP` (ningún término lo lee; k_π en `updatePressures`), como `targetF`. (3) Un choque de evento sobre una presión (stock o indicador diferido) es un salto del stock que la
relajación disipa (como W/St desde la 39). Con esto todo indicador acotado y las presiones relajan exacto; queda en 1.1 +
`toward` solo el dinero (44).

Fase 43: sin recortes de ecuación. Desvíos: (1) la entrada se paga de las reservas (como 1.1) hasta que la 44 traiga la regla
de inversión pública (TODO en los dos `togglePact`). (2) La cuota anual se cobra sobre el PBI antes del crecimiento del paso
(orden 1.1 de los costos; el prototipo, después) hasta la 44. (3) Las funciones reciben `pacts`, no el estado. Con esto
ningún `GameState` lleva funciones: un clon JSON es completo.

Fase 44: sin recortes de ecuación. `stepFinance` es el port exacto de `economy_step` (36 casos ±1e-9 con dt anual y mensual,
deuda, reservas, τ, φ previo, políticas con esfuerzo, pactos, mantenimiento) y `payPublicInvestment` el de `pay()` (24 casos).
Desvíos / decisiones: (1) qué PBI lee cada término sigue al prototipo (d y el costo de políticas con Y antes del crecimiento;
recaudación, γ, cuotas de pactos y piso con Y'). (2) φ = sHigh(CI) también sin deuda (0,0067), como el prototipo; el puente de
la 39 daba 0 (E quedaba 0,16 puntos arriba del golden en N1/N2). (3) El préstamo voluntario entra entero a R y D en el paso
siguiente (ambos `dt`), antes del piso; desaparece la rama `dt` del préstamo y el `toward` del dinero. (4) Reloj de quiebra con
`PARAMS_V2.finance.breachEps` (quiebra al mes 24 exacto). (5) La ruta productiva de Territorio pasa de "reservas ≥ 8 % del PBI"
(inalcanzable con el piso del 2 %) a las condiciones fiscales del prototipo (saldo primario medio de 5 años ≥ 0 y D/Y ≤ 0,6);
el piso "reservas ≥ −200" de N1 pasa a D/Y ≤ 0,8 (ROUTES3). El resto de la recalibración de rutas sigue en la 49.

Fase 45: sin recortes de ecuación. Concentración G y transición justa J entran en D_C con los pesos del prototipo (ν_G 3,0,
ν_J 0,6). Desvío: la spec pide sumar η_j·e_jk/100 por instrumento etiquetado, que con reparto parejo no da las constantes del
prototipo; se usa peso del prototipo × η × canal enmascarado por etiqueta (igual con reparto parejo, sensible al esfuerzo).
G/J quedan en `model.social`; su presentación (panel social, DecarboNito) es de la fase 50 y los índices de investigación de la 48.

Fase 46: sin recortes de ecuación. Decisiones: (1) el paso anual del juego de 3 niveles son 12 sub-pasos mensuales (también
en el prototipo; golden regenerado): con un solo paso de dt = 1 los impulsores se evaluaban una vez por año y C9 quedaba en
2,05 también en el prototipo. (2) ε se sortea después de los eventos y antes de las eficiencias (orden del prototipo) con
η_AGUA^prod del paso anterior (la spec pide η^prod; el prototipo usa su η genérico, iguales con reparto parejo).
(3) Estacionalidad de la sequía (solo Territorio, `seasonality`) como exponente del peligro: p_mes = 1 − (1 − p)^(w_m/12),
que conserva p anual exacto (la spec dice "multiplicada por w_m"; con el producto la frecuencia anual cambia en segundo
orden). (4) Sin multiplicador de estrés de N3 (🟧 opcional de la spec, no activado). (5) Escrutinio c > 1,5·c₀
(prototipo; la spec no lo menciona). (6) `rng = null` o `noShocks` ⇒ ε = 0.

Fase 47: sin recortes de ecuación. Decisiones: (1) un efecto de situación sobre B, F, E, C/W, Pc/St o una presión es un
impulso Δℓ = Δpts/(100·p·(1 − p)) del objetivo (W y St se invierten sobre C y Pc); dinero inmediato (ingresos > 0 × √(Y/Y₀),
cargos fijos, % sobre el stock), PBI_Real como choque de nivel de Y (como el Y% de los eventos), suelo por transferencias.
(2) Descuido del escritorio (decisión del usuario 2026-09-19): cada situación vencida suma 1 a un contador con vida media de
36 meses (las oportunidades, tono `good`, no cuentan); D_Pc += 1,2·max(0, N − 3) (sin tope, como el desgaste). Ignorar la bandeja cae por colapso político en 2036–2044.
(3) El descarte de impulsos es a 6τ (prototipo; la spec dice "6 vidas medias"). (4) El −5 % de reservas de la recesión se
mantiene y se agrega al prototipo (`R%`). (5) Solo `aquifer-drop` declara `halfLifeMonths` (60).

Fase 48: sin recortes de la spec salvo §7 (predicción en Territorio, 🟧 no incluida por defecto). Desvíos: un "choque" para la
resiliencia es un paso con evento donde F o E cae ≥ 0,5 puntos (el motor no expone los blancos del evento); el arrepentimiento
de Territorio deja fuera bandeja y mapa (conectividad congelada) y sólo lo pide la UI (`advanceMonth(…, { regret: true })`).

Fase 49b (2026-10-28, decisión del usuario del 2026-10-27 sobre C6, opción 3): sin recortes. Se cambia un parámetro, no una
ecuación: `PARAMS_V2.food.kappa1` 2,5 → 3,0 (también en el prototipo; golden, `food41`/`indicators39`/`pressures42_cases.json`,
trayectorias de `core.spec.ts` y bandas de predicción regenerados). El piso de F de la ruta de producción del N3 pasa de 33 a 31
(`winRoutes.ts` y `ROUTES3` del prototipo) para que `production` N3 conserve su tasa. C6 F N3 16,8 (antes 14,6); C1–C9 PASS.

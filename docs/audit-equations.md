# Auditoría de ecuaciones — DecarboNation

Checklist de `mejora-general/files/16_auditoria_ecuaciones.md` §4. Cada ítem se etiqueta:

- **OK** — el código hace lo que el `EquationsManual` describe.
- **CORREGIR** — el código tiene un problema real (bug, inconsistencia, valor no defendible).
- **DOCUMENTAR** — el código está bien, pero el manual/la documentación dice otra cosa o no lo cubre.
- **PENDIENTE** — todavía no auditado contra fuentes académicas ni contrastado con el manual.

Este documento se abrió en la Fase 2 del ciclo v3 (extracción del motor a `src/sim/`, ver
`docs/DESIGN_DECISIONS_LOG.md`). La mayoría de los ítems quedan `PENDIENTE`: la extracción confirma
*qué* calcula el código hoy (con tests de invariantes), pero verificar que cada fórmula sea
*correcta* frente a IPCC / literatura de economía ambiental es un trabajo separado, no completado en
este ciclo. Se actualiza a medida que cada ítem se revisa.

## Carbono

| ID | Qué verificar | Estado | Nota |
|---|---|---|---|
| C-1 | Conversión a CO₂eq con 44/12 antes del per cápita | **OK (modelo 2.0, fase 38)** | La constante `CO2_PER_C = 44/12` vive en `src/sim/v2/carbon.ts` y solo convierte las pérdidas de stock (Mg C/ha) del cambio de uso; los flujos del suelo y la energía ya están en tCO₂e. Se borraron `FACTOR_C_A_CO2EQ` (3,67) y el factor de escala 40 000. |
| C-2 | Población constante o creciente, y documentada | **OK (fase 38)** | Arranca en `CP.Poblacion_Inicial` (400 000) en todos los niveles y crece `P *= (1 + g)^dt` (exacto: 12 meses = 1 año; antes `1 + g·dt`). Documentada en el manual del facilitador y el de ecuaciones. |
| C-3 | Balance neto: ¿flujo o stock acumulado? | **OK (fase 38): ambos** | `co2EqEmissionsPerCapita` es el flujo anual (energía + suelo + cambio de uso) / población; el acumulado vive en `model.cumulativeEmissions` (Σ E_total·dt) y alimenta el índice de presupuesto `carbonBudgetIndex` (B_t, > 1 = sobre el presupuesto). |
| C-4 | Sinergia CR+C: ¿antes o después de instrumentos? | PENDIENTE | No se encontró una sinergia explícita CR+C en el bloque de carbono (`src/sim/carbon.ts`); sí existe una sinergia CR+C en biodiversidad (`Sinergia_AS_CR_Bio_Factor`, distinta). Revisar si el manual describe una sinergia de carbono que el código no implementa. |
| C-5 | Antagonismo C+SE: ¿multiplicativo o aditivo? | PENDIENTE | No identificado en el bloque de carbono actual. |
| C-6 | Efectos de instrumentos: ¿escalan con esfuerzo o son binarios? | OK | Desde la fase 38 los instrumentos de Neutralidad de Carbono entran por los canales `elec` / `other` (φ con rendimientos decrecientes, fase 36), que mueven los objetivos s* / u*; escalan con el esfuerzo. |

## Usos del suelo

| ID | Qué verificar | Estado | Nota |
|---|---|---|---|
| L-1 | ¿Toda tasa A→B resta de A exactamente lo que suma a B? | **OK (modelo 2.0, fase 37)** | Toda transición es una transferencia: la matriz 2.0 (`src/sim/v2/land.ts`) aplica cada flujo como `A_i −= F·dt·escala_i; A_j += lo mismo`, y los efectos `landUseChange` de eventos y situaciones pasan por `applyLandEffects` (pares ± = transferencia directa; pérdida suelta → barbecho FAL; ganancia suelta desde FAL, PRG, CC). INV-01 vale con eventos a 1e-9 kHa (`tests/sim/invariants.spec.ts`, 50 semillas × 30 años). Historia: en 1.0/1.1 la sequía severa retiraba área de CC y CA sin destino (~16 kHa en una corrida). |
| L-2 | ¿Puede un uso llegar a área negativa? ¿Normalización proporcional? | DOCUMENTAR | El clamp final (`Math.max(0, area)`) es independiente por uso, no proporcional. Con las tasas actuales no se observó ningún uso llegar a 0 en 20 años de simulación sin políticas (BNNP bajó de 100 a 68.4), así que el caso límite no se disparó en las pruebas — pero el código no lo previene si ocurriera. Documentar el riesgo; no se evidenció como problema activo en este ciclo. |
| L-3 | ¿Tasas moduladas por eficiencia de política o constantes? | OK | Sí, moduladas: cada tasa final es `(Base + eff*factor) * changeFactor` (`src/sim/landUse.ts`), no una constante. |
| L-4 | ¿Hay caminos de retorno para todos los usos? | **OK (modelo 2.0, fase 37)** | Plantaciones (PF) y pasturas (PRG) participan del pool agrícola por renta (CC, CA, PRG, PF y barbecho) con rentas ancladas; el barbecho rebrota a BNNP (5 %/año) y vuelve al pool (25 %/año). Siguen sin retorno, a propósito, BNP (protegido) y los usos públicos HUM/ENR (solo los crea una declaración). |
| L-5 | Áreas iniciales: ¿reparto plausible documentado? | PENDIENTE | `INITIAL_LAND_USES` reparte 20% parejo entre 5 usos (100 kHa c/u de 500 kHa total) — valores de maqueta, tal como anticipaba el archivo `16`. Falta definir un reparto inspirado en un territorio subtropical real (tipo Bosque Atlántico) y documentar la fuente. |

## Indicadores y presiones

| ID | Qué verificar | Estado | Nota |
|---|---|---|---|
| I-1 | ¿Los pesos `Factor_Impacto_*_Peso` suman 1 por indicador? | PENDIENTE | No verificado numéricamente contra `CONTROL_PARAMS` en este ciclo. |
| I-2 | ¿El cambio es aditivo (Δ) o se recalcula el nivel? | **OK (modelo 2.0, fase 39): relajación** | E, conflicto (W) y colapso (St) relajan exacto hacia un objetivo logístico anclado, `X ← X* + (X − X*)(1 − k)^dt` con `X* = 100·σ(logit(X₀) + D)` (`src/sim/v2/indicators.ts`); 12 pasos mensuales = 1 anual. B y F siguen aditivos (1.1) hasta las fases 40/41. |
| I-3 | Clamping: ¿al final o término a término? | **OK (fase 39): sin recortes en E, C, Pc** | El objetivo logístico vive en (0, 100) y la relajación no sale de ahí: E, W, St no necesitan clamp ni topes ±4 por término. El clamp final `[0,100]` (paso 11 de `advance`) queda para B, F y las presiones 1.1. |
| I-4 | Curva S de presiones: ¿`f(0)=f(100)=0`? | OK (fase 42) | Desde la fase 42 las tres presiones relajan hacia un objetivo logístico anclado `π* = 100·σ(ℓ_π0 + D_π)` (`src/sim/v2/pressures.ts`): la curva S que el manual prometía existe, y las presiones viven en el interior del rango (ninguna estrategia del arnés toca 0 ni 100 a 30 años; `extractive` llega a π_e ≈ 75 en N1). El impulso lineal con disipación de 1.1 (`src/sim/pressures.ts`) se borró. |
| I-5 | Años para que una presión de 80 vuelva a 50 sin acción | OK (fase 42, medido) | N2 sin políticas, paso mensual, sin eventos: agrícola 1,67 años (20 meses), ambientalista 1,83 (22), social 1,50 (18). Con k_π = 0,35 el camino de 80 a 50 hacia π₀ = 20–25 tarda ≈ ln((50 − π₀)/(80 − π₀))/ln(0,65); el resto lo aporta la realimentación por W y St. |
| I-6 | Estabilidad política vs. polarización: ¿tres presiones altas y parejas? | **OK (fase 39)** | D_Pc suma dos términos continuos: polarización `0,5·(max π − min π − pol₀)/30` y nivel medio `0,6·(π̄ − π̄₀)/20` (`drivePc`). Tres presiones altas y parejas suben el colapso por el nivel medio aunque no haya polarización. Los umbrales individuales de 70 y `Umbral_polarizacion` se borraron. Transitorio: las presiones 1.1 se saturan en 0/100 hasta la fase 42. |
| I-7 | Retroalimentación biodiversidad → seg. alimentaria → presión agrícola sin amortiguar | PENDIENTE | No se buscaron bucles positivos sin amortiguación en este ciclo; requiere el harness de sensibilidad (Fase 5). |

## Políticas y economía

| ID | Qué verificar | Estado | Nota |
|---|---|---|---|
| P-1 | Decaimiento exponencial: ¿eficiencia al año 10? | **CORREGIR** | Confirmado con datos reales por `scripts/simulate.ts` (Fase 5, `reports/routes-calibration.md`): la mayoría de las políticas tienen `efficiencyDecayDuration` de 5-7 años, muy por debajo de los 30 años de un nivel — con `e^(-30/6) ≈ 0,007`, una política activada una sola vez queda con ~0,7% de eficiencia mucho antes de terminar el nivel. Peor aún: `Tiempo_Activacion_X` (el stock que alimenta el decaimiento) nunca se resetea al desactivar una política (`src/sim/policies.ts`, confirmado por grep en todo `src/`), así que ni siquiera desactivar y reactivar la misma política ayuda — el `POLICY_LOCK_IN_DURATION` de 5 años sugiere que sí debería. Esto explica por qué `economicSecurity` casi no responde a ninguna estrategia probada (ver hallazgo 1 de `reports/routes-calibration.md`). Candidato a arreglo real: resetear el contador al desactivar, con su propio test de regresión — no se toca en esta fase (afecta ecuaciones ya congeladas en la Fase 2, y un cambio de balance de este tamaño necesita su propia calibración dedicada, no una corrección de paso dentro de la Fase 5). |
| P-2 | Esfuerzo 0 ⇒ eficiencia 0 en nivel 2+: ¿está bien comunicado? | OK (código) / pendiente (UX) | Confirmado en `getPolicyEfficiency` (`src/sim/policies.ts`): `baseEfficiency * (totalInstrumentEffortApplied / 100)`. La comunicación al jugador es tarea de la Fase 9 (tutoriales), ya prevista ahí explícitamente. |
| P-3 | Costos: ¿escalan con eficiencia o solo con PBI? | DOCUMENTAR | `computeTotalPolicyCost` (`src/sim/policies.ts`) usa `costFactor * PBI_Real`, **sin** escalar por eficiencia — una política vieja y decaída cuesta lo mismo que una recién activada. Es una decisión válida pero debe decirse explícitamente (coincide con la sospecha del archivo `16`). |
| E-1 | Intereses: ¿simples o compuestos? ¿Antes o después del capital? | OK | Simple sobre el saldo del año (`Deuda * interestRate`), y el pago de interés se computa junto con el de capital en el mismo `totalExpenses` antes de amortizar la deuda (`src/sim/economy.ts`). |
| E-2 | ¿El tesoro puede quedar negativo? ¿Hay default? | DOCUMENTAR | Sí puede quedar negativo (no hay clamp en `Reservas_del_Tesoro`); el "default" es indirecto vía la condición de game over "Bancarrota Nacional" en `src/sim/index.ts` paso 13, no un mecanismo de default explícito. |
| E-3 | Impuesto adicional: ¿óptimo trivial en 0% o 20%? | PENDIENTE | Requiere el barrido de sensibilidad del harness (Fase 5). |
| E-4 | Crecimiento del PBI: ¿puede ser negativo indefinidamente? | PENDIENTE | La fórmula lo permite algebraicamente (`pbiGrowthRate` puede ser negativo con impuesto alto y sin políticas de inversión/exportación); no se verificó si el juego llega a una espiral sin salida antes del game over de bancarrota. |
| S-1 | Puntaje: ¿pesos por nivel suman 1? ¿Componentes normalizados a [0,1]? | PENDIENTE | Pesos visualmente suman 1.00 en los tres niveles (`src/sim/score.ts`: 0.40+0.45+0.15; 0.15+0.20+0.30+0.35; 0.10+0.15+0.20+0.25+0.30) — confirmar con un test dedicado en la Fase 5 en vez de a mano. `pbiScore` con techo 25000 (nivel 3) no está documentado como valor defendible. |

## Verificación de esta auditoría

- [x] `src/sim/` no importa `react` ni `@google/genai`.
- [x] Extracción cubierta por `tests/sim/stepYear.spec.ts` (pureza, determinismo) e
      `tests/sim/invariants.spec.ts` (6 invariantes vía `fast-check`).
- [ ] Los 14 invariantes completos de `16` §3 — 6 cubiertos, 8 pendientes (harness Fase 5).
- [ ] `reports/balance.md` (Monte Carlo, 8 estrategias) — pendiente, Fase 5.
- [x] Un hallazgo real documentado (L-1: eventos rompen la conservación de área) con su etiqueta
      y sin corrección apresurada.

## Cambios de modelo de la fase v4 / F8 (2026-09-19)

Todos limitados a la vista previa Territorio: `stepYear` y el juego de 3 niveles quedan idénticos
(`npm run sim` da los mismos números antes y después).

| ID | Cambio | Dónde | Efecto sobre el juego de 3 niveles |
|---|---|---|---|
| F8-1 | La restauración pública madura hacia **bosque nativo protegido** (antes, no protegido). La tasa (`Tasa_de_RES_a_BNNP_Base`, renombrada `Tasa_de_RES_a_BNP_Base` en la fase 37; 4 %/año) no cambia; cambia el destino del flujo. | `src/sim/landUse.ts` (`RES_to_BNP`), `src/sim/monthly.ts` | Ninguno: ningún nivel del juego de 3 niveles tiene área RES, así que el término vale exactamente 0 ahí. El área sigue conservándose (`tests/sim/invariants.spec.ts`). |
| F8-2 | Nuevo parámetro `Costo_Mantenimiento_Uso_Publico_por_kHa_Anual` (0,8): el área bajo uso público (BNP + HUM + RES + ENR) paga mantenimiento anual, cobrado como 1/12 por mes. | `src/constants.ts`, `src/sim/monthly.ts` (opción `publicUseUpkeep`) | Ninguno: la opción está apagada por defecto y sólo la enciende `advanceMonth` de Territorio. `stepMonth` sigue siendo la discretización exacta de `stepYear` sin ella (`tests/sim/monthly.spec.ts`). |
| F8-3 | El costo de las opciones de las situaciones escala con √(PBI_Real / PBI inicial), con techo 2,5×. | `src/territorio/situations/index.ts` (`situationCost`) | Ninguno: las situaciones son sólo de Territorio. Calibrado: con escala lineal la estrategia de conservación se quedaba sin ninguna opción pagable (bio 60 → 46 en `npm run sim:territorio`). |
| F8-4 | Derrota por incumplimiento sostenido: bienestar social < 10 o seguridad alimentaria < 20 durante 12 meses seguidos. | `src/territorio/session.ts` (`BREACHES`) | Ninguno: `evaluateGameOver` no cambia; esto se suma sólo en la sesión de Territorio. |
| F8-5 | Ruta de producción: el tesoro se mide como **% del PBI** (≥ 8) en vez de un valor fijo (1.000), sube seguridad económica a 36 y se exige una familia productiva activa. Conservación pide biodiversidad ≥ 45,5 (era 47); innovación, emisiones ≤ 6,2 (era 5,5) y parque energético ≥ 1,6 % (era 2,5). | `src/territorio/routes.ts` | Ninguno: `LEVEL_ROUTES` no se toca. |
| F8-6 | El préstamo se topea por año calendario (10 % del PBI) y el lock-in de políticas cuenta meses. | `src/territorio/session.ts` | Ninguno: son reglas de la sesión mensual; en el juego anual una ronda ya es un año. |

Calibración resultante (`npm run sim:territorio`, 7 estrategias × 3 semillas): no hacer nada pierde
antes de 2040 por incumplimiento sostenido; conservación 3/3; producción 2/3; innovación 2/3;
"sólo resolver la bandeja" 0/3 (antes ganaba producción); "comprar todo" gana conservación e
innovación —es una estrategia deliberada de gasto público, no un agujero— y "todo a la vez" pierde
por quiebra.

**Tensión que queda abierta.** Aun con mantenimiento y situaciones más caras, una partida sin
políticas termina con decenas de miles en el tesoro: el ingreso público crece con el PBI y el gasto
no. El tope por ruta lo neutraliza como vía de victoria, pero el dinero sigue sin ser escaso en la
segunda mitad de la partida.

## Historial de versiones del modelo

`MODEL_VERSION` (`src/sim/version.ts`) versiona las ecuaciones y parámetros, no la app. Reglas: *patch* = solo texto o UI,
ninguna trayectoria cambia; *minor* = correcciones que cambian trayectorias sin cambiar la estructura; *major* = variables
de estado o formas de ecuación nuevas. Cada fila de investigación (`game_sessions`, `predictions`, `territorio_feedback`)
guarda la versión; ningún análisis mezcla versiones sin estratificar. Nunca se reutiliza una cadena para ecuaciones distintas.

| Versión | Commit / tag | Estado |
|---|---|---|
| Modelo 1.0 — commit 144c321 — estado auditado el 19/10/2026 | `144c321`, tag local `model-v1.0` (pendiente de `git push origin model-v1.0`) | Modelo con el que se recolectaron todos los datos de talleres hasta la fase 32 del paquete v6. Las filas existentes quedan con `'1.0'` (default de la migración `supabase/model_version_migration.sql`). |
| Modelo 1.1 — correcciones de la auditoría (fase 34, 22/10/2026) | rama `v6-modelo-1-1`, tag local `model-v1.1` | Cambia trayectorias en los dos juegos; detalle por ID en la sección siguiente y balance en `reports/balance-1.1.md`. |
| Modelo 2.0 — en desarrollo, `'2.0-dev'` (fase 35, 22/10/2026) | rama `v6-modelo-v2` | Estructura del motor 2.0 (`src/sim/v2/`); las ecuaciones siguen siendo las 1.1. Única diferencia numérica: el Nivel 1 arranca con `Colapso_politico` = 5 (ver la sección de la fase 35). Las fases 36–46 reemplazan cada submodelo; la versión `2.0` se publica en la fase 51. |

## Modelo 1.1 — correcciones de la auditoría (fase 34, 2026-10-22)

Spec: `mejora-general/files/34_correcciones_modelo_1_1.md`. Una línea por ID cerrado; verificado con `npm run sim:check`
completo (`reports/balance-1.1.md`, comparado con `reports/balance-1.0.md`).

| ID | Cambio | Dónde | Efecto en el juego de 3 niveles |
|---|---|---|---|
| N-01 / T-02 | `stellaName` de Neutralidad de Carbono estaba dentro del comentario de `costFactor`: CN nunca contaba años activos ni perdía eficiencia. Ahora decae como las demás (`e^(−t/20)`; 10 años ⇒ 0,607). INV-15 lo protege. | `src/constants.ts` (`INITIAL_POLICIES`) | CN pierde ≈ 40 % de eficiencia en 10 años: la ruta de innovación y el "verde" se vuelven algo más caros. |
| N-02 | Al activar una política se reparte el esfuerzo en partes iguales entre sus instrumentos (`evenEffort`), en los dos juegos. En N1 (sin panel) los canales de CO₂ de CN (renovables, captura) corrían con esfuerzo 0. | `src/sim/policies.ts`, `App.tsx` `togglePolicy`, `territorio/session.ts` | N1 con CN: −1,25 % de emisiones y +25 de secuestro (antes 0). La eficiencia de N1 ignora el esfuerzo, el resto no cambia. |
| N-03 / T-03 | Los pactos ya no escriben B, F, E como nivel (`B + 5` por año): pasan a `Pact.impulses`, sumados al impacto de políticas de cada función (como una política más con eficiencia 1). Tratado: B +0,40, E −0,05; Acuerdo: E −0,10; Transferencia: E +0,15. `effects()` conserva solo CO₂ × 0,95 / × 0,90, estabilidad +3 y los factores de uso del suelo. INV-16: ningún impulso supera el mayor peso de política del mismo indicador. | `src/types.ts` (`PactImpulses`), `src/constants.ts` (`INITIAL_PACTS`), `src/sim/indicators.ts` (`pactImpulse`), `index.ts`/`monthly.ts` | Se cierra el atajo: el tratado llevaba B de 40 a 100 en 13 años; ahora suma 0,12 B/año (0,40 × 0,2 × 1,5). |
| N-14 | `createInitialState` restaura las funciones `effects` de los pactos (`restorePactFunctions`, que reemplaza las tres restauraciones inline de `stepYear`, `stepMonth` y `App.tsx`). | `src/sim/deferred.ts` | Ninguno numérico; un nivel ya no arranca con pactos sin `effects`. |
| N-09 / T-08 | La probabilidad de sequía usa el área total del estado, no los 500 kHa fijos del N1. | `src/constants.ts` (`drought_severe`) | Al inicio, N2 pierde el +0,02 (CC 150/600 = 0,25, no es > 0,25; antes 150/500 = 0,30); N1 (100/500) y N3 (100/600, antes 100/500 = 0,20) no lo tenían. Si CC crece, N2/N3 lo recuperan más tarde que antes. El área que la sequía retira sigue sin destino (excepción de INV-01; la resuelve la fase 37: va al barbecho). |
| T-06 | Reactivar una política no restaura su eficiencia: arranca en `efficiencyFromCounter` (lo que da el contador de tiempo activo) y `previousEfficiencyForNotification` toma ese valor. | `src/sim/policies.ts`, `App.tsx`, `territorio/session.ts` | Ninguno sobre trayectorias: el motor ya recalculaba desde el contador al paso siguiente. Arregla lo que ve el jugador y que el aviso del 40 % se volvía a disparar. |
| T-07 | `GameState.declaredProtectedArea`: el bosque protegido que declara el jugador (más lo que madura de la restauración pública) se cuenta aparte. `publicNaturePct` y el mantenimiento usan ese valor (acotado al BNP existente), no todo el BNP. `cond.publicNature` 12 → 4,5 %. | `src/sim/territory.ts`, `src/sim/monthly.ts`, `src/territorio/routes.ts` | Ninguno (solo Territorio). |
| T-12 | Los efectos de las situaciones sobre indicadores derivados (CO₂, estabilidad, dinero, presiones) ya no se aplican en el acto: van a `Session.pendingDeferred` y `stepMonth` los aplica en el paso 11.5 (`options.extraDeferred`). Antes los borraba el recálculo del mes siguiente. | `src/territorio/situations/index.ts`, `session.ts`, `src/sim/monthly.ts` | Ninguno (solo Territorio). |
| N-08 | Interfaz honesta: el panel del facilitador deja de exponer 8 claves sin efecto; el manual del facilitador y la hoja docente dejan de describir sinergias de carbono inexistentes, una presión con curva S y una eficiencia "afectada por el entorno político"; se borran de `CONTROL_PARAMS`/`ControlParams` las 70 claves que ningún camino del motor lee; aviso bajo las pistas de instrumentos. `tests/sim/facilitatorParams.spec.ts` comprueba que cada clave del panel mueve algo. | `FacilitatorPanel.tsx` (`paramGroups.ts`), `FacilitatorManual.tsx`, `EquationsManual.tsx`, `descriptions.ts`, `docentes-ecuaciones.html` | Ninguno numérico. |

## Modelo 2.0-dev — estructura, parámetros y anclas (fase 35, 2026-10-22)

Spec: `mejora-general/files/35_motor_v2_estructura.md`. La fase mueve el código, no las ecuaciones: `stepYear` y
`stepMonth` pasan a ser envoltorios de `advance(state, dt, …)` (`src/sim/v2/core.ts`), que llama a las funciones 1.1
en el orden 1.1. Verificado con `npm run sim:check -- --quick`: con `MODEL_VERSION` todavía en 1.1, el JSON del reporte
es idéntico byte a byte al de antes de la fase; los criterios C1–C8 dan los mismos valores con `'2.0-dev'`.

| ID | Cambio | Dónde | Efecto en el juego de 3 niveles |
|---|---|---|---|
| — (estructura) | Integrador único `advance(state, dt, rng, CP, opts)`; `PARAMS_V2` (tablas del prototipo), `math.ts`, anclas del estado inicial en `GameState.model` (`computeAnchors`, con la corrida en seco de la matriz de suelo del prototipo para c₀), tipos `ModelAnchors` / `ModelState` / `TargetImpulse`, `PolicyState.rampTime` / `fatigueTime`, 12 escalares nuevos en `CONTROL_PARAMS` que todavía no lee ninguna ecuación. | `src/sim/v2/*`, `src/sim/index.ts`, `src/sim/monthly.ts`, `src/types.ts`, `src/constants.ts` | Ninguno. |
| — (§8) | El Nivel 1 arranca con `Colapso_politico` = 5 (antes 0; `INITIAL_STELLA_STOCKS`), para que el logit del colapso sea finito, como en el prototipo. | `src/constants.ts` | Estabilidad política de N1 5 puntos más baja en toda la partida (95 al inicio; p50 final de `do_nothing` 89,7 → 84,7): en N1 el colapso nunca toca el piso 0, así que el corrimiento se mantiene entero. No cambia ninguna victoria, ruta, puntaje ni criterio del arnés (N1 no tiene piso de estabilidad). N2, N3 y Territorio (que usa el nivel 2) no cambian. |


## Modelo 2.0-dev — políticas: puesta en marcha, desgaste e instrumentos (fase 36, 2026-10-22)

Spec: `mejora-general/files/36_politicas_eficiencia_instrumentos.md`; prototipo: `base_eta`, `channel`, `compute_eta`,
`policy_cost` y el bloque de relojes de `step()` en `scripts/reference/modelo_v2.py`. Código: `src/sim/v2/policies.ts`,
pasos 2 y 4 de `advance` (`src/sim/v2/core.ts`). Verificado con `npm run sim:check -- --quick` contra la fase 35.

| ID | Cambio | Dónde | Efecto en el juego de 3 niveles |
|---|---|---|---|
| P-1 / N-07 | La eficiencia deja de ser `e^(−T/δ)` de por vida: `η = (1 − e^(−τ/λ))·[η_min + (1 − η_min)·e^(−T/δ)]`, con reloj de puesta en marcha τ (vuelve a 0 al desactivar) y reloj de desgaste T (crece activa, decae `T·e^(−dt/ρ)` en reposo). λ, δ en `PARAMS_V2.rampYears` / `fatigueYears`; η_min = `Eficiencia_Minima_Politicas` (0,35), ρ = `Recuperacion_Politicas_Anios` (5). Se borran `initialEfficiency`, `efficiencyDecayDuration`, `stellaName` de las políticas, `Tiempo_Activacion_*` y `Conteo_*` (salvo `Conteo_Chatgpt`), `updatePolicyEfficiency`, `decayedEfficiency`, `efficiencyFromCounter`. | `src/sim/v2/policies.ts`, `core.ts`, `src/constants.ts`, `src/types.ts` | El primer año una política rinde la mitad o menos (programas λ = 1,5 ⇒ 49 %; extractivas λ = 0,5 ⇒ 86 %); una política vieja no muere (tiende a 35 %, antes a ~0). C6 (recorrido de indicadores) 0,341 → 0,911. |
| N-01 / T-02 (residual) | Neutralidad de Carbono ya no depende de un `stellaName`: todas las políticas leen λ, δ y κ por id (`PID_OF`); INV-15 verifica que las diez tengan las tres. 10 años ⇒ 0,772. | `src/sim/v2/policies.ts`, `tests/sim/invariants.spec.ts` | Ninguno adicional. |
| N-02 / P-2 | El esfuerzo cuenta en todos los niveles: canal χ^c = Σ μ_k φ(e_k) / Σ μ_k φ(25), φ(e) = 1 − e^(−e/40), con relevancias por instrumento (`INSTRUMENT_CHANNELS`, orden = `INITIAL_POLICY_INSTRUMENTS`). Reparto parejo ⇒ χ = 1 (el Nivel 1 juega siempre así); 12,5 por instrumento ⇒ 0,58; esfuerzo 0 ⇒ 0. Los submodelos 1.1 leen `getPolicyEfficiency` = η·χ^prod. | `src/sim/v2/params.ts`, `src/sim/policies.ts` | Con reparto parejo, nada cambia respecto del esfuerzo; concentrar (N2+) sube el canal de los instrumentos relevantes y baja el resto (antes daba igual cómo se repartiera). |
| T-06 | La eficiencia que se muestra al activar es la de los relojes (`baseEfficiency`: 0 al activar, "en marcha"), y reactivar conserva el desgaste acumulado (el reloj T no se reinicia). | `App.tsx`, `src/territorio/session.ts` | Ninguno sobre trayectorias. |
| P-3 | El costo sigue al esfuerzo: `K = κ·Y·(0,3 + 0,7·ē)`, ē = min(100, Σ e_k)/100. **Escala transitoria**: κ = `costShareBridge` (los viejos `costFactor`) hasta que la fase 44 agregue el gasto base y pase a `costShare`. | `src/sim/v2/policies.ts` (`policyCost`, `costShareOf`) | Con reparto parejo (100 %) el costo es el de 1.1; una política con menos esfuerzo cuesta menos (30 % fijo). |
| N-08 (parte) | Las pistas de instrumentos dejan de ser solo orientativas: el aviso dice qué canal lee hoy el motor. Aviso de desgaste nuevo (factor `e^(−T/δ)` < 0,5, una vez por cruce) y estados "en marcha (NN %)" (rampa < 0,9) / "desgastada" en los dos juegos. | `src/sim/policies.ts`, `PolicyToggle.tsx`, `src/territorio/panels.tsx`, i18n | Ninguno numérico. |


## Modelo 2.0-dev — uso del suelo: matriz conservativa y barbecho (fase 37, 2026-10-22)

Spec: `mejora-general/files/37_uso_del_suelo_matriz.md`; prototipo: `land_step`, `move_land` y `apply_land_effects` de
`scripts/reference/modelo_v2.py`. Código: `src/sim/v2/land.ts`, paso 5 de `advance` (`src/sim/v2/core.ts`), efectos de
suelo en `src/sim/events.ts`, mapa en `src/sim/territory.ts`. Verificado contra el prototipo (participaciones agrícolas a
30 años idénticas a 2 decimales, `tests/sim/land.v2.spec.ts`) y con `npm run sim:check -- --quick` contra la fase 36.

| ID | Cambio | Dónde | Efecto en el juego de 3 niveles |
|---|---|---|---|
| L-1 / T-08 | Conservación de área con eventos: la pérdida de suelo de un evento o situación va al barbecho (`LandUseType.Fallow`, FAL, 0 kHa al inicio en los tres niveles); los pares ± de las situaciones son transferencias directas. Se borra la excepción ±0,01 kHa de INV-01. | `src/sim/v2/land.ts` (`transferArea`, `applyLandEffects`), `src/sim/events.ts`, `src/constants.ts`, `src/types.ts` | La sequía severa ya no destruye área: 3 % de CC y 5 % de CA pasan a FAL, que rebrota y vuelve a cultivarse. |
| L-4 / R-matriz | Matriz 2.0: frontera y protección como 1.1 (η^land), RES→BNP, FAL→BNNP 0,05; el flujo CC→CA de 1.1 (`Tasa_de_CC_a_CA_Base`, borrada) se reemplaza por el pool agrícola: Σ 0,02·A_k (CC, CA, PRG, PF) + 0,25·A_FAL repartido con pesos e^{β r_k}, r_k = ln A_k,0 + Δr_k(η^prod), β = 1. Neteo de todos los pares bilaterales (como el prototipo). Se aplica exacto con dt (sin el Euler `toward`) y con escala por fuente para no dejar negativos. | `src/sim/v2/land.ts`, `src/sim/v2/params.ts` (`PARAMS_V2.land`) | Sin políticas la mezcla agrícola queda anclada (solo la mueve la deforestación: CC 25,0 → 27,9 % de lo agrícola en N1). AS sube CA (N1 25,0 → 29,5; N2 14,0 → 17,7); PAI+PEA suben CC (N1 25,0 → 35,3; N2 30,0 → 38,2). **Efecto transitorio hasta la fase 38**: sin el CC→CA de 1.1 (0,5 %/año + 3 %·η_AS) el CC queda más alto y el balance de carbono 1.1 (CC emite 8,0) sube: c a 30 años de `conservation` N1 1,32 → 5,07, N2 5,72 → 12,11; las rutas dirigidas de los 3 niveles pasan a 0 % (ver log). La fase 38 reemplaza el carbono. |
| — (renombre) | `Tasa_de_RES_a_BNNP_Base` → `Tasa_de_RES_a_BNP_Base` (el destino ya era BNP desde F8-1). | `src/constants.ts`, `src/types.ts` | Ninguno. |
| — (Territorio) | El barbecho del mapa es el área FAL del modelo (`parcelTargets`), no "lo que el modelo dejó de contar"; declarar sobre barbecho descuenta de FAL; `SOURCES` agrega el pool y BNNP ← barbecho; las situaciones pasan sus transferencias al mapa. | `src/sim/territory.ts`, `src/territorio/*` | — |


## Modelo 2.0-dev — carbono en unidades físicas (fase 38, 2026-10-22)

Spec: `mejora-general/files/38_carbono_unidades_fisicas.md`; prototipo: `carbon` y `budget` de
`scripts/reference/modelo_v2.py`. Código: `src/sim/v2/carbon.ts`, paso 7.5 de `advance` (`src/sim/v2/core.ts`), anclas
(`src/sim/v2/anchors.ts`). Verificado: c₀ = 5,947 / 7,135 / 5,733 t (prototipo), `tests/sim/carbon.v2.spec.ts`, y
`npm run sim:check` (rápido y completo) contra la fase 37.

| ID | Cambio | Dónde | Efecto en el juego de 3 niveles |
|---|---|---|---|
| N-12 / T-11 / R-4 | Inventario en tCO₂e con tres componentes: energía `ε0_N·y^0,3·(1 + 0,15·η_SE)·[0,35(1 − s) + 0,65(1 − u)]·P`, flujo del suelo `Σ f_i·A_i[ha]` (puede ser negativo) y cambio de uso `Σ F_ij·max(0, C_i − C_j)·44/12` con los flujos realizados de la matriz (÷ dt). s, u con inercia k = 0,15 hacia s* = min(0,9; 0,60·η_CN^elec + min(1; a_ENR/0,04) + pactos) y u* = min(0,6; 0,35·η_CN^other + pactos). Se borran `computeCarbonBalance` (`src/sim/carbon.ts`), `emissionRate`/`sequestrationRate` de `LandUse`, `CO2_EMISSIONS_SCALING_FACTOR`, `FACTOR_C_A_CO2EQ`, `Factor_Reduccion_Emisiones_Renovables_PCN`, `Factor_Aumento_Secuestro_CAC_PCN`, `Factor_Aumento_Emisiones_*`, `Factor_Desplazamiento_Emisiones_Parque_Energetico`, y el −5 % / −10 % de CO₂ de los pactos 1.1 (pasan a `renewables`/`efficiency`). | `src/sim/v2/carbon.ts`, `params.ts` (`flux`, `stock`, `fluxPolicy`, `energy`), `core.ts`, `src/constants.ts`, `src/types.ts` | Cambia la escala: c₀ 7,8 / 17,4 / 10,6 → 5,95 / 7,13 / 5,73 t. Recorrido de c en N2 a 30 años: extractiva 8,05 vs innovación 4,84 (≥ 3 t). Con el carbono físico vuelven las rutas dirigidas (ver log). El puntaje sube (la parte de carbono `100 − c/12·100` deja de estar en 0 en N2/N3) y la presión ambientalista por CO₂ (umbral 8 t) casi no actúa: lo recalibran las fases 42/49. |
| C-1 / C-3 | Ver la tabla de Carbono arriba (44/12 explícito; flujo y acumulado). Presupuesto `B_t = Σ E·dt / [E0·(t − 0,30·t²/60)]` (`budgetCut2054` = 0,30, 🟧). | `src/sim/v2/carbon.ts` | El índice se calcula; lo muestra el tablero en la fase 50. |
| — (población) | `Poblacion_Total` arranca en `CP.Poblacion_Inicial` (400 000; antes 10 millones con el factor 40 000) y crece `(1 + g)^dt`. Anclas con `pop0`. | `src/sim/index.ts`, `src/constants.ts`, `core.ts`, `anchors.ts` | El per cápita es físico; el paso anual da igual que antes, el mensual compone exacto. |
| — (rutas, provisorio) | Topes de `cond.emissions` reescalados a la escala física, anclados a c₀ como `ROUTES3`/`TERR_ROUTES` del prototipo (N1 5,2 / 6,5 / 4,6; N2 6,5 / 7,8 / 5,5; N3 5,4 / 6,3 / 4,5, equilibrio 2 → 4,5; Territorio 6,2 / 7,8 / 4,8). `carbonTechEffort` = (Renovables + Eficiencia)/2 (antes Renovables + Captura). | `src/sim/winRoutes.ts`, `src/territorio/routes.ts`, `src/constants.ts` (`winConditions` N3) | La fase 49 los recalibra. |

## Modelo 2.0-dev — indicadores por relajación: E, conflicto y colapso (fase 39, 2026-10-22)

Spec: `mejora-general/files/39_indicadores_por_relajacion.md`; prototipo: bloques E, C y Pc de `indicators_step` en
`scripts/reference/modelo_v2.py`. Código: `src/sim/v2/indicators.ts`, paso 8 de `advance` (`src/sim/v2/core.ts`), tablas en
`PARAMS_V2` (`bE`, `productiveValue`, `conflict`, `greenRelief`, `conflictWeights`, `relaxation`). Verificado:
`tests/sim/indicators.v2.spec.ts` (ancla ±1e-9 en los 3 niveles, 12 meses = 1 año, PIE → E* 48,8, continuidad en F,
24 casos contra el prototipo ±1e-9 con `scripts/reference/indicators39_cases.json`) y `npm run sim:check` contra la 38.

| ID | Cambio | Dónde | Efecto en el juego de 3 niveles |
|---|---|---|---|
| N-04 / T-04 / I-2 | E relaja (k = `Velocidad_Ajuste_Seg_Economica` 0,30) hacia `100·σ(ℓ_E0 + D_E)`, `D_E = Σ bE·η^prod − 0,15·η_CN^tax + 0,25·(g − g₀)/0,01 + 1,5·(V/V₀ − 1) + 0,15·(B − B₀)/20 − 0,8·φ − 0,04·τ − 0,6·[sLow(F;20,4) − sLow(F₀)] + pactos.E + cap(impulsos)`; φ = sHigh(intereses/recaudación; 0,20, 0,04) del prototipo sobre la deuda 1.1 (puente hasta la 44). Se borran `calculateEconomicSecurityChange`, `INDICATOR_IMPACT_WEIGHTS.ECONOMIC_SECURITY`, `EcoSec_Reduction_Factor_Per_Tax_Point` y `impulses.economicSecurity` de los pactos. | `src/sim/v2/indicators.ts`, `params.ts`, `core.ts`, `constants.ts` | E deja de estar inmóvil: recorrido entre estrategias 22–26 puntos (antes ≈ 9; N1 0,4 en 1.0). |
| N-05 / I-3 | Conflicto: `D_C = 0,6·(F₀ − F)/15 + 0,5·(E₀ − E)/15 + 0,4·(πe − πe₀)/20 + Σ c·η^social + 0,3·φ·η_SE^social − Σ alivio·η^social + 2·Δa_CC + Δa_PF + 0,03·τ + 0,6·φ + cap(impulsos)`, k = 0,35; W = 100 − C. Sin umbrales F/E < 45 (que el estado inicial ya violaba), sin bonos verdes por umbral, sin `Tasa_disipacion_social` (pasa a `Tasa_disipacion_presion_social`, solo la presión social 1.1 hasta la 42). | ídem; `pressures.ts` | W ya no converge a ≤ 17: `do_nothing` N2 se queda en ≈ 60; recorrido de W 18–69. |
| I-6 | Colapso: `D_Pc = 0,9·(W₀ − W)/20 + 0,5·(E₀ − E)/20 + 0,8·φ + 0,5·(pol − pol₀)/30 + 0,6·(π̄ − π̄₀)/20 + pactos.Pc + cap(impulsos)`, k = 0,25; St = 100 − Pc. El +3 de estabilidad del Acuerdo de Carbono pasa a `pactos.Pc` = −0,15. Se borran `calculatePoliticalCollapseChange`, `POLITICAL_STABILITY`, `SOCIAL_WELLBEING` y `Umbral_polarizacion`. | ídem | Con las presiones 1.1 saturadas (0/100) `extractive` N2/N3 llega a St ≤ 5 hacia el año 19 (35/40 de 40 semillas): transitorio hasta la 42. |
| — (impuesto) | τ entra en E y C en todos los niveles (antes solo N3, `fiscalTermsActive`, que se borra). | `core.ts`, `monthly.ts`, `territorio/session.ts` | Solo N3 y Territorio pueden fijar τ: sin cambio práctico en N1/N2. |
| — (rutas, provisorio) | Producción: piso de E 25 / 32 / 30 → 36 / 40 / 36 (`ROUTES3` del prototipo); los viejos estaban calibrados para un E inmóvil y dos eran E₀ (C1: `do_nothing` N3 ganaba producción en 5/10). | `src/sim/winRoutes.ts` | C1 PASS; la fase 49 recalibra. |


## Modelo 2.0-dev — biodiversidad por especies-área (fase 40, 2026-10-22)

Spec: `mejora-general/files/40_biodiversidad_especies_area.md`; prototipo: bloque B de `indicators_step` en
`scripts/reference/modelo_v2.py`. Código: `src/sim/v2/biodiversity.ts`, primer indicador del paso 8 de `advance`
(`src/sim/v2/core.ts`), tablas `PARAMS_V2.habitat` / `zSAR` / `qB` / `biodiversity`, k = `CP.Velocidad_Ajuste_Biodiversidad`;
conectividad en `src/sim/territory.ts` (`forestConnectivity`) y `src/territorio/session.ts`. Verificado:
`tests/sim/biodiversity.v2.spec.ts` (ancla ±1e-9 en los 3 niveles; CC → HUM 5 kHa: H +3,006 %, ΔB* +0,4154; SAR cerca
del inicio; sinergia continua 0,05; tratado +0,25 logit; 12 meses = 1 año; 24 casos del prototipo ±1e-9 con
`scripts/reference/biodiversity40_cases.json`; K 4-conexo, lote contiguo / aislado, caché de la sesión) y
`npm run sim:check` contra la 39.

| ID | Cambio | Dónde | Efecto en el juego de 3 niveles |
|---|---|---|---|
| R-5 / N-04 / T-04 / I-2 | B relaja (k_B = 0,12) hacia `100·σ(ℓ_B0 + D_B)`, `D_B = z/(1 − B₀/100)·ln(H/H₀) + Σ qB·η^land + 0,10·min(η_AS, η_CR) − 0,12·min(η_PAI, η_FRA) + γ_K·ln(K/K₀) + pactos.B + cap(impulsos)`, `H = Σ h_i·a_i` (FAL 0,3), z = 0,35. Se borran `calculateBiodiversityChange`, `INDICATOR_IMPACT_WEIGHTS.BIODIVERSITY`, `Factor_Impacto_Politicas_y_Presiones_en_Biodiversidad_Peso`, `Factor_Impacto_Usos_del_Suelo_en_Biodiversidad_Peso` y `impulses.biodiversity` del tratado (ahora `pactos.B` = +0,25 logit). | `src/sim/v2/biodiversity.ts`, `params.ts`, `core.ts`, `anchors.ts`, `constants.ts`, `types.ts` | B deja de estar casi inmóvil: N2 año 30 sin eventos `do_nothing` 39,3, verde 54,9, conservación con tratado 60,4 (sin tratado 54,2), extractiva 28,7 (prototipo 39,2 / 54,8 / 60,3 / 54,2 / 28,5); recorrido 27–32 puntos (antes ≈ 12). |
| — (conectividad) | Territorio: K = fracción del bosque (BNNP + BNP + RES) en el parche 4-conexo más grande del mapa; K₀ al crear la sesión; γ_K = 0,25, piso 0,001·K₀; `advanceMonth` pasa {K, K₀} en `opts.connectivity` y recalcula K solo si cambió bosque. | `src/sim/territory.ts`, `src/sim/geography.ts` (`largestComponent4`), `src/territorio/session.ts` | Ninguno (0 sin mapa). En Territorio `conservation` sigue ganando (100 %) y `do_nothing` no (0 %). |
| — (capa del mapa) | Capa "Biodiversidad" de Territorio: h_i − H actual (antes el peso 1.1 del uso). | `src/territorio/heat.ts` | — |

## Modelo 2.0-dev — seguridad alimentaria por balance (fase 41, 2026-10-22)

Spec: `mejora-general/files/41_seguridad_alimentaria_balance.md`; prototipo: `food_production` y bloque F de
`indicators_step` en `scripts/reference/modelo_v2.py`. Código: `src/sim/v2/food.ts`, segundo indicador del paso 8 de
`advance` (B → F → E: F lee la E del paso anterior), tabla `PARAMS_V2.food`, k = `CP.Velocidad_Ajuste_Seg_Alimentaria`
(0,35), ancla `foodPerCapita0`. Verificado: `tests/sim/food.v2.spec.ts` (ancla ±1e-9 en los 3 niveles; ρ₀ N2 = 167,3/400 000;
+20 % de ρ → 51,26; PEA → 22,33; rendimientos, agua, tendencia y choque; piso de ρ; k y 12 = 1; N1 sin políticas 35 → 37,6;
reglas de hambruna y de incumplimiento sostenido sin cambio; 24 casos del prototipo ±1e-9 con
`scripts/reference/food41_cases.json`) y `npm run sim:check` contra la 40.

| ID | Cambio | Dónde | Efecto en el juego de 3 niveles |
|---|---|---|---|
| R-6 / N-04 / T-04 / I-2 / I-3 | F relaja hacia `100·σ(ℓ_F0 + 2,5·ln(ρ/ρ₀) + 0,6·(E − E₀)/50 + cap(impulsos))`, `ρ = max(Q/P, 0,001·ρ₀)`, `Q = (1 − x)·[A_CC·1,0·(1 + 0,25·η_PAI) + A_CA·0,7·(1 + 0,15·η_AS) + A_PRG·0,25·(1 + 0,20·η_GS)]·(1 + 0,06·η_AGUA)·1,006^t·(1 + ε)`, `x = 0,30 + 0,20·η_PEA` (η^prod; ε = `model.yieldShock` = 0 hasta la 46). Sin clamp ni tope ±4. Se borran `calculateFoodSecurityChange` (y con ella `src/sim/indicators.ts` y `pactImpulse`), `INDICATOR_IMPACT_WEIGHTS` entero, `Factor_Impacto_Politicas_y_Presiones_en_Seguridad_Alimentaria_Peso`, `Factor_Impacto_Usos_del_Suelo_en_Seguridad_Alimentaria_Peso`, `Impacto_Biodiversidad_en_Seguridad_Alimentaria_Peso`, `PactImpulses` y `Pact.impulses`. | `src/sim/v2/food.ts`, `params.ts`, `anchors.ts`, `core.ts`, `constants.ts`, `types.ts`, `sim/index.ts` | F deja de estar inmóvil: N2 año 30 sin eventos `do_nothing` 40,6, extractiva 51,1, verde 37,6, balanceada 32,6 (prototipo 40,5 / 51,1 / 37,4 / 32,4; en 1.1 40,3–41,1); exportar baja Q y sube E (*trade-off* explícito). |
| — (rutas, provisorio) | Producción N1: piso de F 40 → 32 (`ROUTES3`). | `src/sim/winRoutes.ts` | C2 producción N1 0 % → 100 %; la 49 recalibra. |
| — (capa del mapa) | Capa "Alimentos" de Territorio: rendimiento relativo del uso − rendimiento medio del territorio (antes el peso 1.1). | `src/territorio/heat.ts` | — |

## Modelo 2.0-dev — presiones sectoriales en S (fase 42, 2026-10-22)

Spec: `mejora-general/files/42_presiones_sectoriales.md`; prototipo: bloque de presiones de `indicators_step`
(`scripts/reference/modelo_v2.py`, py:472-487). Código: `src/sim/v2/pressures.ts`, último del paso 8 de `advance`
(B → F → E → C → Pc → presiones; D_C y D_Pc leen las presiones del paso anterior), tabla `PARAMS_V2.pressure` (factores φ de
1.1 + CR +3,0 sobre π_a, `phiScale` = 15, `drivers`), k = `CP.Velocidad_Ajuste_Presiones` (0,35). Verificado:
`tests/sim/pressures.v2.spec.ts` (ancla ±1e-9 en los 3 niveles; CR → π_e* 12,65 y FRA → 43,4 en N2; monotonía en FRA;
σ_prod solo sobre la suma de políticas y PF fuera de a_prod; desgaste; k fuera de [0, 1]; 24 casos del prototipo ±1e-8/1e-9 con
`scripts/reference/pressures42_cases.json`; las 8 estrategias del arnés × 3 niveles sin tocar 0/100 a 30 años, `extractive`
< 90) y `npm run sim:check` contra la 41.

| ID | Cambio | Dónde | Efecto en el juego de 3 niveles |
|---|---|---|---|
| I-4 / I-5 / N-04 | π_k relaja hacia `100·σ(ℓ_πk0 + D_πk)`: `D_πa = σ_prod·Σ φa·η^social/15 + 0,03·(E₀ − E) + 0,02·(F₀ − F) + 4,0·(a_prod,0 − a_prod)`, `D_πe = Σ φe·η^social/15 + 0,035·(B₀ − B) + 1,5·(c − c₀)/c₀`, `D_πs = Σ φs·η^social/15 + 0,04·(W₀ − W) + 0,04·τ`, más desgaste (0 hasta la 47) y `cap(impulsos)`; `σ_prod = a_prod/a_prod,0`, `a_prod = (CC + CA + PRG)/ΣA`. Un choque de evento sobre una presión es un salto del stock que se relaja (como W/St). Se borran `src/sim/pressures.ts` (`updatePressures` 1.1), `Factor_Presion_*` (19), `Umbral_PP_*` (5, incluido el umbral de 8 t de CO₂ en escala vieja), `Sensibilidad_PP_*` (5), `PPSocial_Increase_Factor_Per_Tax_Point`, `Tasa_disipacion_presion_social` y el impulso `Impulso_PP_Agricola_por_kHa_Convertida` de `declarePublicUse`; limpieza: `Factor_Impacto_Politicas_y_Presiones_en_Seguridad_Economica_Peso`, `Factor_Impacto_Usos_del_Suelo_en_Seguridad_Economica_Peso`, `Impacto_Biodiversidad_en_SE_Peso` (sin uso desde la 39). | `src/sim/v2/pressures.ts`, `params.ts`, `core.ts`, `src/sim/territory.ts`, `constants.ts`, `types.ts`, `sim/index.ts` | Las presiones dejan de pegarse a 0/100: N2 año 30 sin eventos π_e verde 3,4 → extractiva 55,1, π_a extractiva 4,7 / verde 22,0 (prototipo 3,9 / 55,1 / 4,8 / 22,3). `extractive` N2/N3 deja de terminar en colapso político (St 51 / 42 con eventos; sin eventos 61,5 / 52,8, prototipo 55,5 / 47,2). π_a y π_e coinciden con el golden (máx |Δ| 0,6 y 0,08); π_s difiere hasta 4,5 porque lee W, que todavía no tiene concentración ni transición justa (45). |

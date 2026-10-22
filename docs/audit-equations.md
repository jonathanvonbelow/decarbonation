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
| C-1 | Conversión a CO₂eq con 44/12 antes del per cápita | PENDIENTE | El factor vive en `CONTROL_PARAMS.FACTOR_C_A_CO2EQ` (`src/sim/carbon.ts`); falta confirmar su valor numérico contra 44/12 = 3.667. |
| C-2 | Población constante o creciente, y documentada | DOCUMENTAR | `Poblacion_Total *= (1 + Tasa_Crecimiento_Poblacional_Base)` cada año (`src/sim/index.ts` paso 0) — sí crece. No está documentado en el `EquationsManual` in-app; agregar. |
| C-3 | Balance neto: ¿flujo o stock acumulado? | PENDIENTE | `co2EqEmissionsPerCapita` es un flujo anual recalculado desde cero cada año (`computeCarbonBalance`), no un acumulado. Falta confirmar si `Conteo_Carbono_Neut` (Stella stock, no tocado por `stepYear`) debería acumularlo y no lo hace. |
| C-4 | Sinergia CR+C: ¿antes o después de instrumentos? | PENDIENTE | No se encontró una sinergia explícita CR+C en el bloque de carbono (`src/sim/carbon.ts`); sí existe una sinergia CR+C en biodiversidad (`Sinergia_AS_CR_Bio_Factor`, distinta). Revisar si el manual describe una sinergia de carbono que el código no implementa. |
| C-5 | Antagonismo C+SE: ¿multiplicativo o aditivo? | PENDIENTE | No identificado en el bloque de carbono actual. |
| C-6 | Efectos de instrumentos: ¿escalan con esfuerzo o son binarios? | OK | `renInst?.effortPercentage > 0` y `ccsInst?.effortPercentage > 0` con multiplicación por `effortPercentage / 100` — sí escalan continuamente (`src/sim/carbon.ts`), no son binarios. |

## Usos del suelo

| ID | Qué verificar | Estado | Nota |
|---|---|---|---|
| L-1 | ¿Toda tasa A→B resta de A exactamente lo que suma a B? | **CORREGIR (parcial)** | La matriz de transición base (`src/sim/landUse.ts`) conserva el área exactamente — verificado algebraicamente y con `tests/sim/invariants.spec.ts` (INV-01, núcleo determinista). **Hallazgo real:** con eventos aleatorios activos, un test de propiedades encontró ~16 kHa de pérdida no conservada, atribuible a un efecto `landUseChange` de algún evento en `ALL_RANDOM_EVENTS` que mueve área en un solo uso del suelo sin transferencia pareada. Pendiente: revisar los `effects()` de cada evento en `src/constants.ts` uno por uno y decidir si es (a) un bug a corregir empatando la transferencia, o (b) una decisión de diseño legítima (choque exógeno tipo "degradación", que sí puede destruir/crear área neta) que solo falta documentar. Ver `docs/DESIGN_DECISIONS_LOG.md`, entrada Fase 2. |
| L-2 | ¿Puede un uso llegar a área negativa? ¿Normalización proporcional? | DOCUMENTAR | El clamp final (`Math.max(0, area)`) es independiente por uso, no proporcional. Con las tasas actuales no se observó ningún uso llegar a 0 en 20 años de simulación sin políticas (BNNP bajó de 100 a 68.4), así que el caso límite no se disparó en las pruebas — pero el código no lo previene si ocurriera. Documentar el riesgo; no se evidenció como problema activo en este ciclo. |
| L-3 | ¿Tasas moduladas por eficiencia de política o constantes? | OK | Sí, moduladas: cada tasa final es `(Base + eff*factor) * changeFactor` (`src/sim/landUse.ts`), no una constante. |
| L-4 | ¿Hay caminos de retorno para todos los usos? | DOCUMENTAR | Existen 5 tasas: BNNP→BNP, BNNP→CC, BNNP→CA, CA→BNNP, CC→CA. No hay ningún camino de retorno hacia BNNP salvo indirecto vía CA→BNNP; Plantaciones Forestales (PF) y Praderas (PRG) no participan de ninguna transición — su área es efectivamente fija. Si es intencional, falta decirlo explícitamente en el manual. |
| L-5 | Áreas iniciales: ¿reparto plausible documentado? | PENDIENTE | `INITIAL_LAND_USES` reparte 20% parejo entre 5 usos (100 kHa c/u de 500 kHa total) — valores de maqueta, tal como anticipaba el archivo `16`. Falta definir un reparto inspirado en un territorio subtropical real (tipo Bosque Atlántico) y documentar la fuente. |

## Indicadores y presiones

| ID | Qué verificar | Estado | Nota |
|---|---|---|---|
| I-1 | ¿Los pesos `Factor_Impacto_*_Peso` suman 1 por indicador? | PENDIENTE | No verificado numéricamente contra `CONTROL_PARAMS` en este ciclo. |
| I-2 | ¿El cambio es aditivo (Δ) o se recalcula el nivel? | OK | Aditivo: cada `calculate*Change` devuelve `valorActual + delta acotado` (`src/sim/indicators.ts`), no un nivel absoluto recalculado. |
| I-3 | Clamping: ¿al final o término a término? | OK | Al final: el clamp `[0,100]` sobre `indicators` corre una sola vez, después de sincronizar desde Stella (`src/sim/index.ts`, paso 11), no dentro de cada `calculate*Change`. |
| I-4 | Curva S de presiones: ¿`f(0)=f(100)=0`? | PENDIENTE | El modelo actual de presiones (`src/sim/pressures.ts`) no usa una curva S explícita del tipo `4P(100-P)/100²` — usa un impulso lineal más una disipación proporcional (`presión * 0.1` o `* Tasa_disipacion_social`). Confirmar si el `EquationsManual` promete una curva S que el código no implementa (posible ítem DOCUMENTAR o CORREGIR pendiente de decidir). |
| I-5 | Años para que una presión de 80 vuelva a 50 sin acción | PENDIENTE | No simulado en este ciclo; calculable con el harness de la Fase 5. |
| I-6 | Estabilidad política vs. polarización: ¿tres presiones altas y parejas? | DOCUMENTAR | `calculatePoliticalCollapseChange` (`src/sim/indicators.ts`) suma incrementos independientes por umbral individual (`PP_AGRICOLA_THRESHOLD`, etc.) además del término de polarización (`max-min`). Si las tres presiones son altas y parejas, la polarización es baja pero los tres términos de umbral igual se disparan — el caso "descontento total sin polarización" sí se penaliza, solo que por otra vía. Documentar esto explícitamente en el manual. |
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
| F8-1 | La restauración pública madura hacia **bosque nativo protegido** (antes, no protegido). La tasa (`Tasa_de_RES_a_BNNP_Base`, 4 %/año) no cambia; cambia el destino del flujo. | `src/sim/landUse.ts` (`RES_to_BNP`), `src/sim/monthly.ts` | Ninguno: ningún nivel del juego de 3 niveles tiene área RES, así que el término vale exactamente 0 ahí. El área sigue conservándose (`tests/sim/invariants.spec.ts`). |
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
| N-09 / T-08 | La probabilidad de sequía usa el área total del estado, no los 500 kHa fijos del N1. | `src/constants.ts` (`drought_severe`) | Al inicio, N2 pierde el +0,02 (CC 150/600 = 0,25, no es > 0,25; antes 150/500 = 0,30); N1 (100/500) y N3 (100/600, antes 100/500 = 0,20) no lo tenían. Si CC crece, N2/N3 lo recuperan más tarde que antes. El área que la sequía retira sigue sin destino (excepción de INV-01; la resuelve la fase 37). |
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

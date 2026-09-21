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

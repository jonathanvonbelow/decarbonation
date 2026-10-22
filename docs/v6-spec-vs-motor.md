# Paquete v6 frente al motor: discrepancias

Registro vivo de las diferencias entre el paquete `mejora-general/files/00_INDICE_v6.md` y `32`–`51` y el código real.
Partió de la auditoría del plan v6 contra `main` @ `144c321` (22/10/2026). Cada fase que resuelve una fila la marca como
resuelta, agrega lo que encuentre y deja el detalle en su entrada de `docs/DESIGN_DECISIONS_LOG.md`.

Regla del índice (§2): cuando el paquete y el código discrepan en un hecho del estado actual, **gana el código**.

## Estado general (auditoría inicial)

En general la spec describe bien el estado 1.0: `stellaName` de Neutralidad de Carbono comentado (`constants.ts:120`),
factor 40 000 (`carbon.ts:54`), F/E < 45 → +7,5/año, quiebra inalcanzable (`gameOver.ts:27`), 8 parámetros del panel del
facilitador sin efecto, sorteo de eventos sesgado por orden, `SITUATION_EFFECT_SCALE` = 0,5. El prototipo reproduce las
cifras de las fases 38–43. Antes de la fase 32 no existía ninguno de los entregables (`MODEL_VERSION`, `sim:check`,
`src/sim/v2`, `scripts/reference`, ramas v6, tag) ni los invariantes INV-10, INV-11, INV-14 e INV-16.

## Tabla de discrepancias

| Fase | Discrepancia | Resolución | Estado |
|---|---|---|---|
| 32 | `feedbackService` no usa `warnedOnce`: un 4xx da `'rejected'` y la respuesta se pierde | El reintento sin `model_version` va en la rama `rejected` (una vez), también en `flushFeedbackQueue` | Resuelta (fase 32) |
| 32 | La carpeta del paquete se llama `referencia/`, no `reference/` | Se copia a `scripts/reference/` | Resuelta (fase 32) |
| 32 | La spec solo pide degradación en el cuestionario; sin migrar, `createGameSession` perdería la fila de la partida | Reintento único sin `model_version` también en `createGameSession` y `logPrediction` | Resuelta (fase 32) |
| 33 | `simulate-territorio.ts` tiene 7 estrategias distintas de las 8 canónicas | El arnés nuevo usa las del prototipo; los scripts viejos quedan intactos | Resuelta (fase 33) |
| 33 | El prototipo paga pactos, lotes y situaciones con `pay()` (puede endeudarse hasta D/Y 0,6); la app solo con reservas | El arnés usa la API real (gana el código); explica por qué `buy_everything` no quiebra en 1.0 | Documentada (fase 33) |
| 33/38/49 | La ruta de innovación de Territorio mide `carbonTechEffort` = (renovables + captura)/2 ≥ 25; la estrategia canónica pone CN = 20/40/40/0, así que da 20 y nunca cumple la ruta | Decidir en 38/49 si cambia la condición o el vector | Pendiente (encontrada en fase 33) |
| 33/43 | El tratado de biodiversidad suma +5 de B por año (efecto aditivo): `conservation` termina con B = 100 en N2, N3 y Territorio | Lo reemplaza el modelo de pactos de la fase 43 | Mitigada (fase 34: impulso +0,40 en B, conservation ya no llega a 100); el modelo final es el de la fase 43 |
| 33/34 | `togglePolicy` de `App.tsx` no reparte esfuerzo al activar: en N1 (sin panel) Carbono Neutralidad corre con esfuerzo 0 | El arnés usa reparto parejo (33 §3.1); lo corrige la fase 34 §3.2 | Resuelta (fase 34, `evenEffort`) |
| 33 | Línea base 1.0: C1 falla en N3 (do_nothing cumple producción en 3/40) y C2 falla también en los 3 niveles (N2: 0 % en las tres), además de lo que esperaba 33 §6 | Ver `reports/balance-1.0.md` | Documentada (fase 33) |
| 34 | El test `facilitatorParams` fallaría con claves reales: deuda en N1/N2, 4 claves fiscales, `Ano_Activacion_Prestamo`, `Max_Additional_Tax_Rate` | Usar nivel 3 con impuesto > 0, o una lista explícita de claves solo-UI; además `App.tsx:358,1130,1139` pasa a leer el CP vivo | Resuelta (fase 34): deuda N1/N2 con préstamo en su nivel, fiscales en N3 con 10 pp, `UI_ONLY_PARAM_KEYS`; App lee el CP vivo |
| 34 | T-06: el reset de eficiencia dura un solo paso | El arreglo apunta a la UI y al re-armado del aviso del 40 % | Resuelta (fase 34, `efficiencyFromCounter`); desde la fase 36 la eficiencia mostrada sale de los relojes 2.0 (`baseEfficiency`: 0 al activar, el desgaste se conserva) y `efficiencyFromCounter` se borró |
| 34 | El arreglo de la sequía quita el +0,02 en N2 (150/600 = 0,25, no es > 0,25) | Documentar | Documentada (fase 34) |
| 34 | Hay copias muertas del motor en `App.tsx:99-352` y `EquationsManual.tsx` referencia parámetros que se borran | Borrar las copias y limpiar el manual | Resuelta (fase 34) |
| 37 | La spec netea solo el pool; el prototipo netea todos los pares (c₀ depende de eso) | Seguir el prototipo y corregir el texto | Seguido en la corrida en seco de `src/sim/v2/anchors.ts` (fase 35, c₀ = prototipo); pendiente en la matriz (37) |
| 37 | Las situaciones usan pares ±; la regla "positivo sale de FAL" depende del orden | Pares = transferencia directa origen→destino; FAL solo para efectos sueltos | Resuelta en el prototipo (fase 32); pendiente en TS |
| 37 | El parámetro `Tasa_de_RES_a_BNNP_Base` en realidad va a BNP | Renombrar o comentar | Pendiente |
| 38 | Innovación da 4,75, no "≈ 4,9"; las claves de pactos s/u difieren de renewables/efficiency | Gana el prototipo | Pendiente |
| 40 | Territorio usa `neighbors8`; K pide 4-conexo | 4-conexo según la spec | Pendiente |
| 43 | Costo anual de pactos 30/50/100 → 0,002/0,004/0,008·PBI: baja sin decirlo | Documentar | Pendiente |
| 43 | Las claves `treaty`/`accord`/`tech` del prototipo no son las del código (`biodiversityTreaty`/…) | `PARAMS_V2.pacts` usa las del código | Resuelta en `PARAMS_V2` (fase 35; `s`/`u` → `renewables`/`efficiency`, `m_protect`/`m_deforest` → `protectFactor`/`deforestFactor`); el modelo de pactos es de la 43 |
| 43 | `restorePactFunctions` no existe; la restauración está inline en 3 lugares | La crea la fase 34 y la borra la 43 | Creada (fase 34); la borra la 43 |
| 44 | `breach += dt` quiebra en el mes 25, no en el 24 (1/12 × 24 ≈ 1,9999…) | Prototipo: tolerancia `breach ≥ 2 − 1e-9` (vale para cualquier `dt`); TS: misma tolerancia o pasos enteros | Resuelta en el prototipo (fase 32); pendiente en TS |
| 44 | Préstamo habilitado en N1/N2 desde 2035 (`App.tsx:1139`) | Documentar | Pendiente |
| 44/47 | El `declare()` del prototipo cobra dos veces, y cobra aunque no haya área | Corregir el prototipo y recalcular las tasas de Territorio | Resuelta en el prototipo (fase 32); tasas nuevas en el log de la fase 32 |
| 46 | `deferred.ts` también lo usan las situaciones (`situations/index.ts:177`) | Migrarlas antes de borrarlo | Pendiente |
| 46 | El escrutinio pasa de `c > 12` a `c > 1,5·c₀` sin decirlo; el prototipo no tiene estacionalidad w_m | Documentar; la estacionalidad se valida con el test de consistencia anual–mensual | Pendiente |
| 47 | El prototipo ignoraba los efectos de suelo y `when` de las situaciones, y escalaba las reservas negativas | Corregir el prototipo | Resuelta en el prototipo (fase 32) |
| 47 | El prototipo sigue ignorando los efectos de situaciones sobre `PBI_Real` (5 en el catálogo) y los efectos en `%` sobre reservas y deuda | Decidir en la fase 47 si se modelan | Pendiente (encontrada en fase 32) |
| 47/49 | Con las correcciones de la fase 32, la ruta de producción de Territorio baja de 75 % a 55 % de las semillas (falla F < 44), dentro de la franja 30–70 % que prohíbe el índice §6 | Recalibrar en 47/49 (rutas o estrategia `settle: first`); no se tocó `TERR_ROUTES` | Pendiente (encontrada en fase 32) |
| 47 | La pantalla final **no** muestra el desgaste hoy | Agregarlo (fase 50) | Pendiente |
| 48 | El prototipo no genera bandas, Brier ni regret | Las bandas se generan con el arnés TS | Pendiente |
| 49 | `Referencia_Max_CO2_per_Capita_Puntaje` también se usa en `App.tsx:358,368` y `FacilitatorPanel` | Limpiarlo ahí también | Pendiente |
| 50 | Términos de búsqueda: "40.000" da falso positivo; falta `docentes-consignas.html` | Ajustar la búsqueda | Pendiente |
| 35 | `stepYear` (`index.ts`) y `stepMonth` (`monthly.ts`) repetían el cuerpo (pasos 0–14 + 11.5) | Un solo cuerpo, `advance(state, dt, …)` en `src/sim/v2/core.ts`; los dos quedan como envoltorios | Resuelta (fase 35). Quedan 4 ramas por `dt` heredadas de 1.1 (Euler `toward` con `dt = 1` exacto, sorteo anual/mensual, préstamo, calendario): las borran 39–46 |
| 35 | Con `MODEL_VERSION = '2.0-dev'` el arnés pasa a evaluar C9 (mayor ≥ 2): el paso mensual sigue siendo Euler | Esperado: lo resuelve la fase 46 (`relax`) | Documentada (fase 35): C9 SKIP → FAIL con el mismo valor 1,529; no es regresión (antes no se evaluaba) |
| 35 | `Colapso_politico` = 5 en N1 (§8) sí cambia números 1.1 | Única diferencia aceptada de la fase | Documentada (fase 35): St de N1 −5 en toda la partida; ninguna victoria, ruta, puntaje ni criterio cambia |
| 35 | La spec §4 no lista todo `P`: `pop0`, `pop_growth`, `eta_min`, `rho_recovery`, `k`, `g0`, `tax0`, `gamma`, `i`, `alpha` | Son escalares de `CONTROL_PARAMS` (nuevos o ya existentes con el mismo valor); `BREACH_EPS` va a `PARAMS_V2.finance.breachEps`; los coeficientes internos de las funciones del prototipo pasan a `params.ts` en la fase que porta cada función | Documentada (fase 35, mapa en la cabecera de `params.ts`) |
| 35 | Las anclas usan 400 000 habitantes (`Poblacion_Inicial`) pero el motor 1.1 sigue con `Poblacion_Total` = 10 millones | La fase 38 iguala `Poblacion_Total` a `Poblacion_Inicial` | Pendiente (38) |
| 35 | c₀ del prototipo: 5,947 / 7,135 / 5,733 (la spec 38 dice "≈ 6,0 / 7,1 / 5,7") | Gana el prototipo; `tests/sim/core.spec.ts` fija los valores | Documentada (fase 35) |
| 35 | `golden_v2.csv` tiene columnas extra (`pa`, `pe`, `ps`, `DY`, `S`) además de las 9 del test | El test lee solo las 9; las demás quedan para depurar | Documentada (fase 35) |
| 34 | `evenEffort` en todos los niveles cambia N2/N3: antes una política recién activada tenía esfuerzo 0 hasta mover los sliders (P-2) | Se sigue la spec; el aviso "sin esfuerzo" queda para cuando el jugador baja todo a 0 | Documentada (fase 34) |
| 34 | `INSTRUMENT_IMPACT_HINTS` no se muestra en ningún panel (Dashboard recibe la prop y no la usa) | El aviso 1.1 va bajo el subtítulo del panel de instrumentos y en Territorio bajo "Esfuerzo por instrumento" | Resuelta (fase 36): los canales por instrumento existen (`INSTRUMENT_CHANNELS`) y el aviso dice qué lee hoy el motor (canal de producción + Renovables/Captura sobre CO₂) |
| 34/46 | T-12: ninguna situación del catálogo tiene efectos sobre indicadores derivados; un diferido sobre `treasuryReserves`/`pp*` solo toca la copia en `indicators` (igual que los eventos) | Mecanismo listo y probado con una situación sintética; lo reemplaza la fase 46 | Documentada (fase 34) |
| 34/47 | `cond.publicNature` con solo lo declarado: la spec espera ≈ 7 %, el arnés da `conservation` 4,7–8,9 % | Umbral 4,5 % (margen 0,2 pp) | Documentada (fase 34); revisar en 47/49 |
| 34/50 | `PlayerManual.tsx` describe una sinergia Conservación + Ganadería que el motor no tiene | Fuera del alcance de 34 | Pendiente (fase 50) |
| 34 | El dev server sin `.env.local` queda en blanco: `new GoogleGenAI` sin clave lanza al importar `geminiService.ts` | Preexistente; fuera del modelo | Pendiente (encontrada en fase 34) |
| 36 | El prototipo calcula `eta[j]` de toda política con relevancia uniforme (`channel(effort)` = [1,1,1,1]); los canales `land`/`prod`/`social` por instrumento son de la spec y no están en `modelo_v2.py` | Se implementan los canales de la spec y además `eff[pid].eta` (el canal uniforme del prototipo). Con reparto parejo coinciden (χ = 1); las estrategias del arnés solo concentran CN, cuyo `land`/`prod` es uniforme, así que el golden no cambia | Documentada (fase 36); cada fase 37–45 que lea un canal decide si el prototipo pasa a canales (y regenera el golden) |
| 36 | La spec deja en blanco `land`/`prod` de Neutralidad de Carbono ("—") | Uniformes [1,1,1,1] = el `eta["CN"]` del prototipo; `social` y `elec`/`other`/`tax` (= `CN_RELEVANCE`) como la tabla | Documentada (fase 36) |
| 36/44 | `costShare` (κ, 0,2–1,2 % del PBI) está calibrado contra el gasto base de la fase 44; con la economía 1.1 (sin gasto base) el tesoro nunca aprieta: `sim:check --quick` pasa C3 PASS → FAIL (`buy_everything` de Territorio 80 %, `green` de N1 70 % ganan todas las rutas) y C4 0,6 → 1,0 | Fórmula por esfuerzo de la spec con la escala 1.1 (`PARAMS_V2.costShareBridge` = los viejos `costFactor`) vía `costShareOf`; C3/C4 quedan como en la 35 | Pendiente (44: `costShareOf` → `costShare`, borrar el puente) |
| 36 | N1 sin panel de instrumentos: el prototipo no tiene excepción de nivel (aplica el vector de esfuerzo de la estrategia en cualquier nivel); el juego y el arnés usan siempre el reparto parejo en N1 | `computeEfficiencies` no distingue niveles; en N1 el reparto parejo de `evenEffort` da χ = 1 y ē = 1 (costo pleno) | Documentada (fase 36); el arnés ya lo hacía (fase 33) |
| 36 | La spec pide borrar `Conteo_*` | `Conteo_Chatgpt` no es un contador de política (lo usa la UI de DecarboNito): se conserva. Se borraron también `stellaName` de las políticas (solo alimentaba el contador) | Documentada (fase 36) |
| 36 | `checkEfficiencyWarning` devolvía un solo aviso (y solo actualizaba el último valor de la política avisada) | Devuelve un aviso por política que cruza y actualiza `previousFatigueFactor` de todas (una política que se recupera y vuelve a desgastarse vuelve a avisar) | Resuelta (fase 36) |
| 36/46 | C9 (anual–mensual) empeora 1,529 → 1,790: el peor c pasa a `green` año 10 (Δ 0,18 t) porque las políticas conservan más eficiencia (piso 0,35 en lugar de e^(−t/δ) → 0) y mueven más el uso del suelo, y la integración Euler mensual de 1.1 (`toward`) se aparta más del paso anual | Por diseño de la fase; lo resuelve la fase 46 (`relax`) junto con el carbono físico de la 38. C9 ya fallaba (sale 0 en quick) | Pendiente (46) |
| 36 | `tests/sim/core.spec.ts` fijaba las trayectorias 1.1 de `caa9275` | Regeneradas con `advance` de la fase 36 (pin de regresión del motor 2.0-dev) | Documentada (fase 36) |

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
| 33/43 | El tratado de biodiversidad suma +5 de B por año (efecto aditivo): `conservation` termina con B = 100 en N2, N3 y Territorio | Lo reemplaza el modelo de pactos de la fase 43 | Pendiente (encontrada en fase 33) |
| 33/34 | `togglePolicy` de `App.tsx` no reparte esfuerzo al activar: en N1 (sin panel) Carbono Neutralidad corre con esfuerzo 0 | El arnés usa reparto parejo (33 §3.1); lo corrige la fase 34 §3.2 | Pendiente (encontrada en fase 33) |
| 33 | Línea base 1.0: C1 falla en N3 (do_nothing cumple producción en 3/40) y C2 falla también en los 3 niveles (N2: 0 % en las tres), además de lo que esperaba 33 §6 | Ver `reports/balance-1.0.md` | Documentada (fase 33) |
| 34 | El test `facilitatorParams` fallaría con claves reales: deuda en N1/N2, 4 claves fiscales, `Ano_Activacion_Prestamo`, `Max_Additional_Tax_Rate` | Usar nivel 3 con impuesto > 0, o una lista explícita de claves solo-UI; además `App.tsx:358,1130,1139` pasa a leer el CP vivo | Pendiente |
| 34 | T-06: el reset de eficiencia dura un solo paso | El arreglo apunta a la UI y al re-armado del aviso del 40 % | Pendiente |
| 34 | El arreglo de la sequía quita el +0,02 en N2 (150/600 = 0,25, no es > 0,25) | Documentar | Pendiente |
| 34 | Hay copias muertas del motor en `App.tsx:99-352` y `EquationsManual.tsx` referencia parámetros que se borran | Borrar las copias y limpiar el manual | Pendiente |
| 37 | La spec netea solo el pool; el prototipo netea todos los pares (c₀ depende de eso) | Seguir el prototipo y corregir el texto | Pendiente |
| 37 | Las situaciones usan pares ±; la regla "positivo sale de FAL" depende del orden | Pares = transferencia directa origen→destino; FAL solo para efectos sueltos | Resuelta en el prototipo (fase 32); pendiente en TS |
| 37 | El parámetro `Tasa_de_RES_a_BNNP_Base` en realidad va a BNP | Renombrar o comentar | Pendiente |
| 38 | Innovación da 4,75, no "≈ 4,9"; las claves de pactos s/u difieren de renewables/efficiency | Gana el prototipo | Pendiente |
| 40 | Territorio usa `neighbors8`; K pide 4-conexo | 4-conexo según la spec | Pendiente |
| 43 | Costo anual de pactos 30/50/100 → 0,002/0,004/0,008·PBI: baja sin decirlo | Documentar | Pendiente |
| 43 | Las claves `treaty`/`accord`/`tech` del prototipo no son las del código (`biodiversityTreaty`/…) | `PARAMS_V2.pacts` usa las del código | Pendiente |
| 43 | `restorePactFunctions` no existe; la restauración está inline en 3 lugares | La crea la fase 34 y la borra la 43 | Pendiente |
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

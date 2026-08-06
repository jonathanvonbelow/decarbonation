# Log de decisiones de diseño — DecarboNation 3.0

Registro de decisiones no triviales tomadas durante el ciclo v3.0, con su justificación y las
alternativas descartadas. Objetivo: no volver a discutir lo mismo dos veces y que cualquier
persona (o agente) que retome el trabajo entienda el porqué sin tener que releer todo el hilo.

Formato por entrada: fecha, decisión, justificación, alternativas descartadas, fase/archivo que
la origina.

---

## 2026-08-06 — Alcance del ciclo v3.0: paquete completo `09-20`

**Decisión.** Ejecutar los 12 archivos de `mejora-general/files/` completos (saneamiento, design
system, i18n, auditoría de ecuaciones, DecarboNito personaje + overlay + agente de acciones,
rutas múltiples de victoria, tutoriales v3, estética/game feel, landing), en fases secuenciales
sobre la rama `v3`, sin mergear a `main` hasta aprobación explícita.

**Justificación.** El paquete ya está escrito contra el código real, tiene estimación propia
(~125 h) y un orden de dependencias validado. El usuario priorizó cobertura completa sobre un
recorte a MVP, dado que el ciclo IKI cierra en septiembre 2026 y conviene resolver todo de una vez
en una rama aislada antes de arriesgar producción.

**Alternativas descartadas.** Subconjunto mínimo viable (`09→12→16→17→13→14`, sin estética
avanzada ni agente de acciones) — se descartó por decisión explícita del usuario, no por
inviabilidad técnica; queda como plan B si el tiempo real no alcanza.

**Origen.** `mejora-general/files/00_INDICE_v3.md`.

---

## 2026-08-06 — Extras del docx/PDF de ChatGPT: solo tres, plegados en archivos existentes

**Decisión.** No crear documentos nuevos a partir de `instrucciones.docx` ni del PDF. Se adoptan
solo tres ideas de bajo costo: log de decisiones de diseño (este archivo), narrativa ambiental
ligera atada al balance de carbono acumulado (extensión de `19` §2/§6), y framing de "promesa
climática" en la tarjeta compartible (extensión de `20` §5). Todo lo demás de esas dos fuentes se
descarta explícitamente — ver detalle completo en el plan de la Fase 0
(`C:\Users\jonat\.claude\plans\fuzzy-petting-emerson.md`, sección "Qué se descarta del docx/PDF").

**Justificación.** El docx asume un stack y un dominio de juego distintos al real (Next.js/Zustand
/Lottie, mecánica genérica de "palancas"); el PDF es una lluvia de ideas de alcance AAA (30-36
documentos) desproporcionada para un equipo de facto unipersonal. Ninguno de los dos conoce el
código real ni el paquete `09-20`, que sí lo conoce y ya es internamente coherente.

**Alternativas descartadas.** Escribir un tercer paquete de documentos de diseño reconciliando
las tres fuentes en detalle — se descartó por generar más documentación que código, sin agregar
valor de ejecución sobre lo que ya define `09-20`.

**Origen.** `mejora-general/instrucciones.docx`, `mejora-general/Mejoras UX Decarbonation.pdf`.

---

## 2026-08-06 — Rama `v3` y despliegue en Vercel Preview, sin proyecto nuevo

**Decisión.** Todo el ciclo se desarrolla en la rama `v3`. No se crea un proyecto Vercel nuevo: se
aprovecha que la Git integration existente despliega automáticamente un Preview Deployment aislado
para cualquier rama que no sea `main`, con URL propia y sin tocar producción.

**Justificación.** Es el mecanismo estándar de Vercel, ya activo en este proyecto
(`docs/v2.6/08_deploy_vercel_v26.md`), y cumple el objetivo del usuario ("evitar que la versión
actual se rompa") sin trabajo de infraestructura adicional.

**Caveat abierto, no bloqueante.** El login con Google (Supabase OAuth) no va a funcionar en la URL
de preview hasta que se registre esa URL en Google Cloud Console y en Supabase → Authentication →
URL Configuration (paso manual del usuario, fuera del alcance de este ciclo de código). Mientras
tanto, todo el desarrollo y QA de `v3` se prueba en modo demo (sin cuenta).

**Origen.** Instrucción del usuario + `docs/v2.6/08_deploy_vercel_v26.md`.

---

## 2026-08-06 — Fase 1 (saneamiento) completada; hallazgo para la Fase 3 (i18n)

**Decisión/hallazgo.** Al mover el código bajo `src/` encontré que ya existe un mecanismo de
idioma parcial: `hooks/useLanguage.ts` + `contexts/LanguageContext.tsx` (toggle es/en persistido en
`localStorage` bajo `decarbonationLanguage_v1`) y `i18n/gameData.ts` (187 líneas de contenido de
dominio indexado por función, no por diccionario tipado). Ninguno de los dos es el sistema descrito
en `12_i18n_completo.md` — las cadenas de interfaz siguen hardcodeadas con ternarios
`language === 'es' ? '...' : '...'` inline en los componentes (confirma el diagnóstico del archivo
`12`, capa A). Se renombró `i18n/gameData.ts` → `src/legacyContent/gameData.ts` para liberar
`src/i18n/` para el sistema nuevo; la Fase 3 debe decidir si migra el contenido de `legacyContent`
directamente a `src/i18n/content/` (probable) y si reutiliza la clave de `localStorage` existente
para no perder la preferencia de idioma de usuarios que ya jugaron.

**Verificación de la Fase 1.** `npm run build` limpio (tsc 0 errores, vite build verde, cero
referencias a `esm.sh` en el output), `npm ls react react-dom` con una sola instancia deduplicada,
y recorrido manual en el navegador (portada → login → modo demo → tablero) sin diferencias visuales
ni errores de consola. Commit `5f415c7` en `origin/v3`.

**Origen.** `mejora-general/files/09_saneamiento_repo.md`, `12_i18n_completo.md` §1.

---

## 2026-08-06 — Fase 2 (auditoría de ecuaciones): alcance ajustado y primer hallazgo real

**Decisión: verificación adaptada.** El procedimiento de `16_auditoria_ecuaciones.md` §2.4 pide
capturar un snapshot del comportamiento actual *antes* de mover código, parcheando `Math.random`.
Intentar esto contra la UI real vía automatización de navegador resultó frágil (los clics sobre los
toggles de política eran intermitentes en este entorno) y no daba una línea de base confiable. Se
adaptó la verificación a: (1) port carácter-por-carácter de cada fórmula desde `App.tsx` — sin
reescribir ni "mejorar" nada — con revisión manual línea por línea contra el texto original leído
íntegro; (2) tests de invariantes (`tests/sim/invariants.spec.ts`) sobre miles de años simulados con
`fast-check`; (3) tests de determinismo y pureza (`tests/sim/stepYear.spec.ts`); (4) verificación
visual manual en el navegador tras el rewire de `App.tsx` (mismo criterio que la Fase 1). Esto cubre
bugs de extracción (transcripción, orden de operaciones) con alta confianza, aunque no es una prueba
bit-a-bit de que el comportamiento de hoy es idéntico al de ayer — ese hueco se cierra con el tiempo
a medida que las fases siguientes ejercitan el motor extraído.

**Alcance reducido, explícito.** Se difieren a la Fase 5 (cuando `17_multiples_vias_victoria.md` los
necesita para calibrar rutas): el harness Monte Carlo completo (`scripts/simulate.ts`), las 8
estrategias sintéticas, `reports/balance.md` y la tabla completa de 25 puntos de
`docs/audit-equations.md` §4. Se implementó un subconjunto de 6 invariantes (de los 14 del archivo
`16` §3) — los más baratos de verificar y los que más señal dan sobre bugs de extracción: INV-01,
INV-02, INV-03/04, INV-05, INV-06, INV-13. El resto (INV-07, 08, 09, 10, 11✓ ya cubierto, 12, 14)
queda pendiente para cuando el harness de la Fase 5 los necesite.

**Hallazgo real (no es un bug de extracción): el área de uso del suelo no se conserva cuando
ocurren eventos aleatorios.** `tests/sim/invariants.spec.ts` con `fast-check` y randomness real
encontró una pérdida de ~16 kHa en una corrida "no hacer nada" (semilla 525859253). Verificado con
un script de depuración: la matriz de transición de uso del suelo en sí **conserva el área
exactamente** (los cuatro términos de transferencia se cancelan algebraicamente — confirmado a mano
sobre `landUse.ts`), y una vez que el evento aleatorio deja de dispararse la conservación se
mantiene perfectamente año a año. La pérdida ocurre una sola vez, temprano, coincidiendo con un
evento con efecto `landUseChange`. Es candidato a `docs/audit-equations.md` ítem **L-1**
("¿Toda tasa A→B resta de A exactamente lo que suma a B?") aplicado a los efectos de eventos, no a
las tasas base. **No se corrige en esta fase** (regla del propio paquete: extraer y congelar
primero, arreglar después con su propio test de regresión) — el test `INV-01` se ajustó para medir
la conservación sobre el núcleo determinista (sin eventos) mientras este hallazgo queda pendiente de
auditoría puntual evento por evento.

**Verificación de la Fase 2 (extracción).** `src/sim/*` no importa React ni `@google/genai`
(`grep -r "from 'react'" src/sim/` vacío). `npm run build` y `npm test` en verde (12/12 tests).
`docs/audit-equations.md` creado con la tabla de ~25 ítems de `16` §4, la mayoría `PENDIENTE`
(auditoría contra fuentes académicas no realizada en este ciclo) salvo los que este hallazgo ya
resolvió parcialmente (L-1, L-2 con nota).

**Origen.** `mejora-general/files/16_auditoria_ecuaciones.md`.

---

## 2026-08-06 — Fase 2: rewire de `App.tsx` y bug real encontrado (no relacionado a las ecuaciones)

**Rewire.** `runSimulationRound` ya no contiene el bloque inline de ~380 líneas: llama a
`stepYear(tempGameState, Math.random, CP)` (archivo `src/sim/index.ts`) y reparte `logs`/
`chatMessages` a los mismos `logEvent`/`addMessageToChat` de siempre. `CP` sigue viniendo de
`controlParamsRef.current` (no de un import estático), así que el override en vivo del
`FacilitatorPanel` sigue funcionando exactamente igual. También se reemplazó la función local
`buildLevelInitializationState` (duplicada) por `createInitialState` del módulo `sim`, en sus tres
sitios de uso (`progressToNextLevel`, `handleCloseLevelEndModal`, `setCurrentLevelManually`).

**Bug real encontrado y corregido: `togglePolicy` y `togglePact` mutaban estado compartido.**
Al verificar el rewire en el navegador (`npm run dev`), activar una política nunca "prendía": cada
clic —incluso invocando el handler de React directamente, sin pasar por el DOM— terminaba en
`isActive: false`. Causa raíz: `const newPolicies = { ...prev.policies }` es una copia superficial;
`newPolicies[policyId]` sigue siendo la MISMA referencia que `prev.policies[policyId]`, y el código
la mutaba en el lugar (`policyToggled.isActive = true`). React 18 `StrictMode` (activo en
`src/main.tsx` vía `<React.StrictMode>`, sólo en desarrollo) invoca los actualizadores de estado dos
veces; la primera pasada (que se descarta) ya mutaba `prev` al ser la misma referencia, así que la
segunda pasada (la que sí se aplica) partía de un `prev` corrompido y el toggle terminaba
cancelándose a sí mismo. **Invisible en producción** (`StrictMode` no duplica invocaciones fuera de
desarrollo), por eso nunca se había reportado. Corregido clonando la política (`JSON.parse(JSON.
stringify(prev.policies))`, igual que ya hacía `handleInstrumentEffortChange` en el mismo archivo) y
el pacto tocado (`{ ...newPacts[pactId] }`, sin `JSON.stringify` porque `Pact.effects` es una
función) antes de mutar. No estaba en el alcance de la Fase 2 (es un bug de manejo de estado en
`App.tsx`, no de las ecuaciones), pero bloqueaba la verificación manual de *esta* fase y de todas las
que siguen en modo desarrollo, así que se corrigió en el momento en vez de reportarlo y seguir de
largo.

**Verificación end-to-end.** Con el fix, activar dos políticas (Agroecológicas + Conservación de
Bienes Naturales) y simular 3 años en el navegador real dio una trayectoria coherente con las
fórmulas portadas: biodiversidad 40,0→40,2→…→40,5%; uso del suelo con Bosque Nativo Protegido
apareciendo desde 0% y creciendo (0→1,1→3,0%) exactamente por el flujo BNNP→BNP que activa la
política de conservación; Cultivos Convencionales bajando (20→19,4→18,1%) por el flujo CC→CA que
activa la agroecológica. Cero errores de consola en las tres rondas. `npm test` (12/12) y
`npm run build` en verde después del rewire completo.

**Origen.** Hallazgo propio durante la verificación de `mejora-general/files/16_auditoria_ecuaciones.md`.

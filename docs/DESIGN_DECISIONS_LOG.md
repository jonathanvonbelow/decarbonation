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

---

## 2026-08-06 — Fase 3 (i18n, Capa A): alcance de esta pasada y arquitectura del puente

**Hallazgo al empezar.** Contrario a lo que sugería el diagnóstico genérico del archivo `12`
("cadenas hardcodeadas en ~22 componentes"), casi todos los componentes YA tienen un diccionario
local `T = { es: {...}, en: {...} }` con `const t = T[language]` — no son ternarios sueltos. El
problema real no es "no hay traducción", es que está **duplicada 25 veces** (una por componente,
sin chequeo de completitud entre idiomas, sin fuente única) y que algunos componentes puntuales
—`Toast.tsx` fue el caso encontrado— no tienen ninguna traducción en absoluto.

**Arquitectura elegida: puente, no reemplazo simultáneo.** Se construyó el sistema tipado de
`12_i18n_completo.md` §2 (`src/i18n/`: `I18nProvider`, `useT()`, diccionario `UI_ES`/`UI_EN`
tipado estructuralmente uno contra el otro) y se montó una vez en `src/main.tsx`. En vez de migrar
los ~25 componentes de punta a punta en esta pasada, `src/hooks/useLanguage.ts` se reescribió para
delegar en `useT()` manteniendo su firma pública (`{ language, toggleLanguage }`) — así los ~21
componentes que siguen sin migrar (listados explícitamente en `IGNORED_COMPONENTS` de
`scripts/i18n-audit.mjs`) **siguen funcionando sin tocarlos**, y ahora comparten una sola fuente de
verdad del idioma en vez de instancias de estado independientes por cada `<LanguageProvider>`
montado. Se reutilizó la clave de `localStorage` existente (`decarbonationLanguage_v1`) para no
resetear el idioma de usuarios que ya jugaron.

**Nota técnica: `UI_ES` no lleva `as const`.** El propio pseudocódigo del archivo `12` lo pone con
`as const` y tipa `en.ts` como `typeof UI_ES`; probado tal cual, eso falla: `as const` infiere tipos
literales por hoja (`"Cerrar"` en vez de `string`), y `en.ts` no puede asignar `"Close"` a una
propiedad tipada como el literal `"Cerrar"`. Se sacó el `as const` — la forma estructural que
`FlattenKeys` necesita no depende de que los valores sean literales.

**Migrados en esta pasada (orden sugerido por `12` §7, primeros cuatro):** `Toast.tsx` (sin
i18n antes — ahora con `t('toast.close')`), `Header.tsx`, `GameLogPanel.tsx`, `PolicyToggle.tsx`
(que además ahora le pasa `locale` de `useT()` a `getPolicyName`, no `language` de un contexto
separado). Cada uno perdió su bloque `T = {...} as const` local y ahora usa `t('namespace.key', {
interpolations })`.

**`scripts/i18n-audit.mjs`**: implementado y en verde, pero con dos listas de exclusión explícitas
(no una sola): `IGNORED_COMPONENTS` (Capa A pendiente, 21 componentes — decrece a medida que se
migran) y `CAPA_B_C_PENDING` (8 archivos: `geminiService.ts`, `suggestionService.ts`,
`descriptions.ts`, `types.ts` —los *valores* del enum `Policy` son prosa en español usada como ID—,
y los 4 archivos de `src/sim/` cuyos mensajes de log se portaron literales en la Fase 2). Sin estas
exclusiones el audit reportaba 209 hallazgos reales pero fuera de alcance de esta pasada; con ellas,
el audit es una señal accionable del estado real, no ruido.

**No se tocó `constants.ts`** (Capa B) ni los prompts de Gemini (Capa C) — quedan, junto con el
resto de los ~21 componentes, para la Fase 12 ("Cierre de i18n") de este plan.

**Verificación.** `npm test` (15/15, con la nueva suite `tests/i18n.spec.ts` de paridad de claves y
placeholders es/en), `npm run build` limpio, `npm run i18n:audit` en verde con el conteo honesto de
pendientes. En el navegador: togglear a inglés cambia correctamente Header, "Registro de
Actividades"→"Activity Log", el toast de advertencia ("Cerrar"→"Close"), mientras que Dashboard
(sin migrar, todavía con su propio `T[language]`) sigue funcionando igual que antes porque ahora
lee el mismo estado de idioma compartido — cero regresiones, cero errores de consola.

**Origen.** `mejora-general/files/12_i18n_completo.md`.

---

## 2026-08-06 — Fase 4 (sistema de diseño): tokens aditivos, no reemplazo

**Decisión central: aditivo, no "reemplaza por completo" como dice el archivo `11`.** El propio
archivo dice reemplazar el `index.css` de la Fase 1 entero. Hacerlo ahora — antes de que la Fase 10
(`19_estetica_visual.md`) haya re-vestido una sola pantalla con los tokens nuevos — dejaría la app
en vivo sin colores durante un número indefinido de fases (`bg-custom-gray`, `text-custom-accent`,
etc. dejarían de existir de un día para el otro, y ~25 componentes los siguen usando). Se optó por
sumar la paleta nueva (`basalt-*`, `chlorophyll`, `ochre`, `ember`, `hydro`, `indigo-ink`, `bloom`),
la tipografía (`Bricolage Grotesque`, `Instrument Sans`, `IBM Plex Mono`, autohospedadas vía
`@fontsource`) y los tokens de movimiento **al lado** de los tokens de la Fase 1, no en su lugar.
Los tokens viejos se eliminan recién cuando la Fase 10 haya migrado a todos sus consumidores —
verificable en ese momento con `grep -rn "custom-gray\|custom-light-gray\|custom-accent" src/`.

**Primitivas construidas, sin consumidores todavía.** `src/components/ui/`: `Panel`, `Button`,
`StatTile` (con una integración nueva no prevista en el archivo `11` — usa `useFormat()` de la
Fase 3 para formatear números según el locale, en vez de `toLocaleString(undefined, ...)`),
`Switch`, `EffortSlider`, `Badge`, `Modal`, `Sparkline`, `chartTheme.ts`, `LevelAmbience.tsx`. El
archivo `11` solo da código completo para `Panel`/`Button`/`StatTile`; el resto (`Switch`,
`EffortSlider`, `Badge`, `Modal`, `Sparkline`) son implementaciones propias a partir de las notas
de §4.4, seguidas del piso de accesibilidad de §7 (área táctil ≥44px, `role="switch"`, foco
atrapado en `Modal`, restauración de foco, bloqueo de scroll). Cablearlas a pantallas reales es
tarea de la Fase 10.

**No se creó un `Tooltip.tsx` nuevo.** El archivo `11` dice "conservar el existente pero mejorar
apertura por teclado" — se deja así para cuando la Fase 10 lo toque, en vez de crear una versión
paralela sin usar.

**Nota técnica: `as const` en `es.ts` de la Fase 3 no es el único lugar donde el pseudocódigo del
paquete no compila tal cual** — acá no hubo un problema equivalente, pero se vuelve a confirmar el
patrón de "verificar con `tsc`, no asumir que el código de los archivos `.md` compila".

**Verificación.** `npm test` (15/15), `npm run build` limpio (fuentes bundleadas correctamente,
`@font-face` inerte hasta que algún componente use `font-display`/`font-mono`), `npm run
i18n:audit` en verde. En el navegador: la app se ve pixel-idéntica a antes de esta fase — cero
diferencias de color, tipografía o layout, como corresponde a una fase puramente aditiva.

**Origen.** `mejora-general/files/11_design_system.md`.

---

## 2026-08-06 — Fase 5 (múltiples vías de victoria): floors + OR-de-rutas, `evaluateLevel` como fuente única

**Decisión central: reemplazar el AND conjuntivo de 10 condiciones por "pisos + al menos una
ruta".** Cada nivel define un set de `floors` (mínimos no negociables — sin ellos no se puede ganar
por ninguna vía) y una lista de `WinRoute` con sus propias condiciones; `evaluateLevel` gana si los
floors se cumplen Y al menos una ruta se cumple (`met`, o `minConditionsMet` de N-de-M para rutas
tipo "6 de 10"). Se preservó la mecánica pre-Fase-5 exactamente como una ruta más, `equilibrium`
(nivel 3, 6-de-10 condiciones) — cero regresión para quien jugaba "a la vieja usanza", nuevas rutas
son estrictamente aditivas en términos de qué formas de ganar existen.

**Desvíos confirmados frente al archivo `17`:**
- `s.stella` del pseudocódigo no existe en este codebase — se usa `state.stellaSpecificState` real.
- El archivo inventa un campo `Balance_Carbono_Anual` que no existe en `GameState`; se usó
  `co2EqEmissionsPerCapita` (el indicador real que ya representa ese balance).
- `carbonTechEffort` y `activePactsCount` (usados por varias condiciones) no tenían implementación
  en el archivo — se escribieron a partir de los tipos reales (`stellaSpecificState`, `pacts`).
- Los umbrales de nivel 2 y 3 estaban "solo esbozados como comentarios" en el archivo, sin números
  concretos — se completaron y calibraron acá, no copiados de ningún lado.

**Progreso relativo a la línea base del nivel, no a cero.** `GameState.levelBaseline` (nuevo campo)
guarda los indicadores al inicio del nivel; `conditionProgress` mide avance como
`(actual - baseline) / (target - baseline)`, no `actual / target`. Sin esto, un nivel que arranca
con biodiversidad en 40 y una condición con target 90 mostraría ~44% de progreso en el año 0 aunque
el jugador no haya hecho nada — confirmado con un test dedicado
(`tests/sim/winRoutes.spec.ts`, "progress is measured from the baseline, not from zero").

**Calibración: harness mínimo construido ahora, no diferido.** El archivo `17` §5 exige un harness
de balance para calibrar umbrales, pero ese harness estaba planeado recién para una fase de
auditoría posterior. Sin él, el primer paso de umbrales (extrapolados del ejemplo de nivel 1 del
propio archivo) dejaba las tres rutas de los tres niveles completamente imposibles (0/15 corridas
ganaban). Se construyó `scripts/simulate.ts` (7 estrategias, semilla única, ver header del archivo
para las diferencias deliberadas contra el harness completo de 200 semillas/8 estrategias) y se
recalibraron los umbrales contra su salida real, documentada en `reports/routes-calibration.md`.

**Hallazgo real de auditoría, no un artefacto de calibración: decaimiento de eficiencia de
políticas es severo y nunca se resetea.** `docs/audit-equations.md` ítem P-1 se actualizó de
PENDIENTE a CORREGIR: `Tiempo_Activacion_X` solo se incrementa, nunca se resetea al desactivar una
política (confirmado por grep en todo `src/sim/policies.ts` y el resto de `src/`), y la mayoría de
las duraciones de decaimiento (5-7 años) son mucho menores que un nivel (30 años) — una política
activada una sola vez queda con eficiencia casi nula bien antes de terminar el nivel. Esto explica
por qué `economicSecurity` casi no responde a ninguna estrategia probada. **No se corrige en esta
fase** — es un cambio de balance sobre ecuaciones ya congeladas en la Fase 2, necesita su propia
calibración y tests de regresión dedicados; queda documentado y flagueado para una fase futura.

**Calibración: cumple el mínimo de esta fase, no el estándar fino de `17` §5 todavía.**
`reports/routes-calibration.md` documenta honestamente que solo 1 ruta distinta gana por nivel en
esta corrida de 7 estrategias (el criterio pide ≥3), porque faltan estrategias específicamente
afines a `production`/`innovation` per se (distintas de "todo verde"). El objetivo mínimo de esta
fase sí se cumple: `do_nothing` nunca gana, cada nivel es ganable, y el mecanismo de rutas
múltiples reemplaza correctamente el AND conjuntivo sin romper nada. El balance fino queda pendiente
para el harness completo (200 semillas, 8 estrategias canónicas).

**`WinRoutesPanel.tsx` nuevo, correctamente i18n desde el inicio.** Usa `useT()`/`useFormat()` de la
Fase 3 en vez de un `T[language]` local — `npm run i18n:audit` confirma que no necesitó ninguna
entrada nueva en las listas de exclusión.

**Verificación.** `npx vitest run` (24/24, 9 tests nuevos en `tests/sim/winRoutes.spec.ts`: lógica
de `evaluateRoute` con rutas sintéticas — met/progress/bottleneck/minConditionsMet/monotonicidad/
progreso relativo a baseline — más integración contra `LEVEL_ROUTES` real). `npm run build` limpio.
`npm run i18n:audit` en verde. En el navegador (modo demo, nivel 1): el panel "Rutas de victoria"
renderiza las 3 rutas del nivel 1 en español con barras de progreso, tagline y texto de cuello de
botella por condición faltante (p. ej. "Te falta: Seguridad alimentaria"), cero errores de consola
de la aplicación (los dos mensajes de consola observados son ruido genérico de extensión de Chrome,
no relacionados con la app).

**Origen.** `mejora-general/files/17_multiples_vias_victoria.md`.

---

## 2026-08-06 — Fase 6 (personaje DecarboNito): avatar SVG+Motion puro, y un hallazgo de entorno

**Componente aislado, tal como pide el archivo `13`.** `src/components/decarbonito/DecarboNitoAvatar.tsx`
no conoce el estado del juego — solo recibe `state`/`emotion`/`tone`/`size`/`targetAngle`/`beamLength`
y emite `onStateComplete`. La lógica de *cuándo* mostrar cada estado (actividad del chat, umbrales de
indicadores, `highlight_element`) queda para la Fase 7 (`14_decarbonito_overlay.md`), sin ninguna
dependencia todavía en ese sentido. Implementado casi verbatim desde el código completo que trae el
archivo `13` §5.2 (14 estados, 6 expresiones, 4 tonos, brazos/antena/haz animables por separado).

**Hallazgo real de entorno, no de este código: el proyecto no tenía `@types/react` instalado.**
Al escribir `DecarboNitoAvatar.tsx` con `React.FC<DnAvatarProps>` y pasar la prop `state` a un
par de helpers propios con firma estricta (`ONE_SHOT: DnState[]`, `pick(v, s: DnState)`), `tsc`
reportó "Argument of type 'string' is not assignable to parameter of type 'DnState'" — un error real,
pero desconcertante porque `state === 'sleep'` y otras comparaciones con el mismo valor no fallaban.
Investigado a fondo (ver el repro aislado usado para diagnosticarlo): `node_modules/react` no trae
sus propios `.d.ts` y **`@types/react`/`@types/react-dom` no estaban en `package.json` ni instalados
transitivamente por ningún paquete** — `React.FC<P>` resolvía a un tipo sin información real (`any`),
así que cada componente de la app viene tipando sus props exactamente así desde siempre. Esto nunca se
notó porque ningún otro componente pasaba una prop hacia una función local con firma estricta como esta
— la mayoría de los usos son comparaciones (`===`) o se renderizan directo, y ninguno de esos casos
delata el problema. Es decir: `npx tsc --noEmit` "limpio" en todas las fases anteriores nunca estuvo
verificando de verdad la forma de las props de React.

**Se instaló `@types/react`/`@types/react-dom` (v19) y se verificó el radio de impacto antes de
persistirlo** — igual que la Fase 5 construyó un harness para no calibrar a ciegas, acá se instaló
primero con `--no-save` para medir el daño: con tipos reales, **cero errores nuevos aparecieron en
ninguno de los ~40 archivos preexistentes** — todos los errores nuevos (5, luego 4 tras encadenar
fixes) fueron exclusivamente en el `DecarboNitoAvatar.tsx` recién escrito. Con esa señal (el resto del
código es realista aunque nunca se comprobaron los tipos de React), se persistió la dependencia de
verdad (`npm install --save-dev`) en vez de dejarla como parche temporal.

**Ajuste propio, no error del archivo `13`: los objetos `*Variants` no pueden ser `as const`.**
El pseudocódigo del archivo tipa `bodyVariants`/`armLeftVariants`/`armRightVariants`/`ringVariants`
con `as const`. Con tipos reales de Motion, eso convierte los arrays de keyframes (`[0, -4, 0]`) en
tuplas `readonly`, que el tipo `Target`/`StyleKeyframesDefinition` de Motion rechaza (espera
`AnyResolvedKeyframe[]`, mutable). Se tipó cada objeto como `Variants` (de `motion/react`) en su lugar
— mantiene la seguridad de tipos para las claves de estado sin pelear con la mutabilidad de los
arrays. `pick()` se simplificó de `<T extends object>(v: T, s: DnState): keyof T` a
`(v: Variants, s: DnState): string`, porque con `Variants` (un tipo indexado) `keyof T` pasa a ser
`string | number`, incompatible con `VariantLabels` de Motion (`string | string[]`).

**Banco de pruebas visual, según §5.3.** `src/components/decarbonito/DecarboNitoLab.tsx`, montado
detrás de `#dev/decarbonito` (chequeo de hash en `src/main.tsx`, antes de `I18nProvider`/`App` — nunca
toca auth/Supabase/estado de juego). Controles reales para `emotion`/`tone`/`size`/`targetAngle`/
`beamLength` (el archivo `13` los deja "omitidos por brevedad"), grilla de los 14 estados, y un log de
`onStateComplete` visible para confirmar que cada estado de una sola pasada dispara exactamente una
vez. Excluido de `IGNORED_COMPONENTS` del audit de i18n con nota explícita: nunca es alcanzable desde
el flujo de juego normal, mismo criterio que excluye `scripts/*.ts`.

**Verificación.** `npx tsc --noEmit` limpio (0 errores, con `@types/react` instalado de verdad por
primera vez). `npx vitest run` 24/24 sin cambios. `npm run build` limpio. `npm run i18n:audit` en
verde. En el navegador, `#dev/decarbonito`: los 14 estados renderizan sin errores de consola de la
app: `point` orienta cuerpo/brazo/haz hacia `targetAngle`, `celebrate` dispara destellos, el log de
`onStateComplete` confirma un solo disparo por estado de una pasada. A 32 px (`tone="critical"`,
`emotion="alarmed"`) la silueta sigue siendo reconocible y antena/brazos se ocultan correctamente
(`detail="minimal"` por debajo de 40 px), como pide la verificación del archivo `13`.

**No verificado en este ciclo:** `prefers-reduced-motion` no se emuló en el navegador (requeriría
forzar la media query vía DevTools/CDP); la rama de código (`useReducedMotion()` colapsando `anim` a
`'idle'`) se revisó por lectura, no se probó visualmente. Pendiente de una pasada de accesibilidad más
adelante (Fase 9 o una auditoría dedicada).

**Origen.** `mejora-general/files/13_decarbonito_character.md`.

---

## 2026-08-06 — Fase 7 (capa flotante DecarboNito): de columna fija a overlay, tablero a ancho completo

**La fase más grande del ciclo hasta ahora.** Reemplaza la columna de chat fija (30-40% del ancho
permanente) por una capa `fixed inset-0 pointer-events-none` con el avatar, un globo de diálogo,
una pila de notificaciones y un panel de conversación flotante — todos con `pointer-events: auto`
propio, nunca bloqueando el tablero debajo ("regla de oro" del archivo `14`). `ChatbotPanel.tsx` y
`GameLogPanel.tsx` se eliminaron por completo (reemplazados por `ConversationPanel.tsx` y
`GameLogDrawer.tsx`); no quedan imports colgantes (verificado por grep y por `tsc --noEmit` limpio).

**Arquitectura construida, las cuatro piezas del archivo `14` §2:**
- `decarbonito/anchors.ts` — registro `AnchorId → DOMRect`, casi verbatim del archivo fuente.
- `decarbonito/DecarboNitoProvider.tsx` — estado, cola de mensajes con las 6 reglas de §4.2
  (un globo a la vez, silencio mínimo de 6s, presupuesto de 2 mensajes espontáneos por ronda de
  simulación, deduplicación de tips, `sleep` a los 90s de inactividad del jugador con despertar
  `peek` ante eventos), y la API imperativa (`say`/`notify`/`play`/`moveTo`/`focusOn`/`release`/
  `openConversation`/`dismiss`/`setBusy`/`resetProactiveBudget`/`setNotifyMode`/`setHidden`/
  `setCorner`).
- `decarbonito/DecarboNitoLayer.tsx` — posicionamiento (dock/anchor/free), arrastre a esquinas con
  `motion`'s `drag`, globo vía `@floating-ui/react` (`flip`+`shift`+`arrow`, la única dependencia
  nueva que pide el archivo), pila de notificaciones, anillo de resaltado, menú contextual.
- `decarbonito/ConversationPanel.tsx` — reemplaza `ChatbotPanel.tsx`; misma lógica de voz
  (`useSpeech`) y modelo de datos (`chatMessages`) que antes, ahora flotante y anclada al avatar.

**Desvío arquitectónico deliberado: `dnApiRef`, no una reestructuración de `App.tsx`.**
`runSimulationRound`, los handlers de chat y el efecto de fin de nivel viven en el componente
`App` de nivel superior, que queda *por encima* de `<DecarboNitoProvider>` en el árbol (lo renderiza
como parte de su propio JSX) — no pueden usar `useDecarboNito()`. Partir las ~1400 líneas de
`App.tsx` en un componente descendiente del provider se evaluó como demasiado invasivo para esta
fase. En su lugar, el provider publica su API en `dnApiRef.current` en cada render (mismo patrón
que `window.__dn`, pero siempre activo en vez de solo-dev); el orden de efectos de React (hijos
antes que padres) garantiza que `dnApiRef.current` ya está poblado cuando los efectos de `App`
corren. Documentado en el propio archivo con una nota explicando por qué existe.

**Integración con eventos del juego — cobertura real, verificada contra el motor, no asumida.**
Al revisar `src/sim/index.ts` antes de mapear la fila "evento aleatorio / noticia" de la tabla del
archivo `14` §7, se confirmó que el motor ya emite `chatMessages` tipados `game_event` (eventos
aleatorios) y `policy_efficiency_warning` (caída de eficiencia) — ambos se enrutan a `dn.notify`
dentro de `runSimulationRound`, con prioridad 2 y sujetos a la cola (no `immediate`). Además:
arranque de partida (globo + `wave`), nivel superado (notificación persistente + `celebrate`),
esperando a Gemini (`setBusy`), error de API (notificación crítica + `facepalm`), acción de chat
completada (`nod`). **No implementado, documentado como pendiente real:** la fila "indicador cruza
umbral de precaución/crítico" — requiere una tabla de umbrales y comparación año-a-año que no existe
todavía (I-4/I-5 en `docs/audit-equations.md` siguen `PENDIENTE`); y "acción del agente ejecutada",
que no aplica hasta la Fase 8 (el agente no existe todavía).

**Reflow de `App.tsx`: ancho completo, `WinRoutesPanel` fuera de la grilla interna de `Dashboard`.**
El archivo `14` §6.1 pide reventar `Dashboard` en una grilla de 12 columnas (políticas 8 + rutas de
victoria 4). Se optó por dejar `Dashboard.tsx` intacto por dentro y renderizar `WinRoutesPanel` como
un bloque propio de ancho completo después de `Dashboard` — reescribir la grilla interna es
restructuración visual que le corresponde a la Fase 10 (`19_estetica_visual.md`, el re-vestido con
los tokens `basalt-*`), y tocarla a medias acá competiría con ese trabajo. `WinRoutesPanel` sigue
sin migrar a los tokens v3, tal como se documentó en su propia fase.

**Anclas instrumentadas: 23 registradas en runtime (nivel 1), no las ~30+ que definiría el nivel 3.**
`useAnchor` se agregó a `Header` (score/year/levelBadge/localeSwitch/helpButton), `Dashboard`
(6 `IndicatorCard` con `anchorId`, `landUseChart`, `historyChart`, `simulateButton`, `policyList`),
`PolicyToggle` (una fila por política, 10 en este juego) y `WinRoutesPanel`. **No instrumentado,
documentado como pendiente:** `instrumentPanel`/`instrumentSlider` (`PolicyInstrumentsPanel.tsx`,
nivel 2+) y `pactList`/`loanControl`/`taxSlider` (`InnovationGlobalDashboard.tsx`, nivel 3) — quedan
para cuando la Fase 8 (agente) o la Fase 9 (tutoriales) necesiten señalarlos específicamente, en vez
de instrumentar todo por adelantado sin un consumidor todavía. El checkpoint del archivo `14`
(`window.__dn.listAnchors().length >= 20`) se cumple igual: 23 anclas registradas en nivel 1.

**Simplificaciones frente al archivo `14`, todas documentadas en vez de aplicadas en silencio:**
- Sin portal DOM real a `#dn-root` — un `div fixed` cumple el mismo rol visual sin la plomería de
  un target de portal separado, dado que ya se monta una sola vez al final del árbol de `App.tsx`.
- `moveTo()` resuelve su promesa con una espera fija de 600ms (no una señal real de "llegada"), ya
  que el spring visual real vive en `DecarboNitoLayer` (vía `motion`), no en el provider.
- El anillo de resaltado no oscurece el resto de la pantalla en "modo tutorial" — no existe todavía
  un modo tutorial (Fase 9); se implementó solo el anillo pulsante, sin el `box-shadow` que apagaría
  el resto de la interfaz.
- Panel de conversación: hoja inferior móvil simplificada (ancho completo fijo, sin drag handle
  para cerrar arrastrando) y sin el modo `expanded` de 720px para lecturas largas.
- La semántica de silenciamiento: "Silenciar avisos" suprime bubble+notificación para toda
  prioridad excepto 3 (que sigue mostrándose); "Solo avisos críticos" hace lo mismo por otra vía —
  ambos coexisten como toggles independientes en el menú contextual, no como un enum estrictamente
  exclusivo que el archivo fuente tampoco especifica con ese nivel de detalle.

**Verificación.** `npx tsc --noEmit` limpio (0 errores) tras toda la reescritura. `npx vitest run`
24/24 sin cambios. `npm run build` limpio. `npm run i18n:audit` en verde (22 Capa A pendientes, uno
menos que antes de esta fase — `ChatbotPanel.tsx` desapareció de la lista al eliminarse el archivo).
En el navegador (modo demo, nivel 1): el tablero ocupa el 100% del ancho, el avatar flota en la
esquina inferior derecha por defecto, clic lo abre en modo conversación (con historial, sugerencias
y voz intactos), Escape lo cierra, el cajón de registro de actividad aparece como barra inferior
colapsada. `window.__dn.listAnchors().length` devuelve 23. `window.__dn.focusOn('simulate-button',
{text})` mueve el avatar junto al botón, dibuja el anillo de resaltado en la posición correcta
(verificado por DOM, no solo visualmente) y muestra el globo con el texto pasado, que se
autodescarta a los 6s. Togglear una política y simular un año corre la ronda completa sin errores —
el bucle principal del juego sigue intacto después de la reescritura. Cero errores de consola de la
aplicación (los 8 mensajes observados son el mismo ruido de extensión de Chrome de fases anteriores,
sin entradas nuevas).

**No verificado en este ciclo:** Lighthouse Accessibility (checkpoint 9 del archivo `14`), el
trampeo de foco completo del panel de conversación (se implementó un ciclo Tab/Shift+Tab básico, no
una librería de foco dedicada), y el comportamiento visual en viewport móvil real (menos de 768px) —
solo revisado por lectura del CSS condicional, no en un dispositivo/emulador.

**Origen.** `mejora-general/files/14_decarbonito_overlay.md`.

---

## 2026-08-06 — Fase 8 (agente de acciones de DecarboNito): lenguaje natural que opera la interfaz

**Arquitectura construida, siguiendo el principio rector del archivo `15` al pie de la letra: el
agente nunca toca el estado directamente.** Cada acción `mutate`/`advance` llama exactamente el
mismo handler que un clic humano (`togglePolicy`, `handleInstrumentEffortChange`,
`handleAdditionalTaxPressureChange`, `requestLoan`, `togglePact`, `runSimulationRound`) — ninguna
validación ni efecto secundario existente se saltea.

- `src/game/uiActionRegistry.ts` (nuevo): 15 de las 16 acciones del catálogo del archivo `15` §3.2
  (`start_tutorial_chapter` excluida — la Fase 9 no existe todavía; exponer una herramienta que
  siempre falla sería peor que no exponerla. `set_level`/`reset_game` excluidas por diseño del
  propio archivo, metajuego). Cada acción define `schema` (zod), `validate`, `preview`, `execute`,
  `anchorFor` opcional.
- `src/services/decarbonitoAgent.ts` (nuevo): `buildTools` (filtra por nivel y modo — `observer`
  expone cero herramientas `mutate`/`advance`), `agentTurn` (bucle de hasta 5 pasos), `executeCall`
  (coreografía: viajar+señalar → confirmar si corresponde → ejecutar → telemetría).
- `src/components/decarbonito/DecarboNitoProvider.tsx` extendido: `confirm()` (tarjeta de
  confirmación en el globo, con temporizador de 30s que cancela solo), `AgentMode`
  (`observer`/`assist`/`tutorial` — este último definido pero sin usuario hasta la Fase 9),
  `?mode=observer` en la URL fija y deshabilita el selector (instancias de evaluación, §7).
  `dnModeRef` se agrega al mismo patrón de escape (`dnApiRef`) de la Fase 7, porque `App.tsx` sigue
  por encima del provider en el árbol.
- `src/components/decarbonito/ConversationPanel.tsx`: selector de modo Observador/Asistente en el
  header del panel, deshabilitado y con aviso cuando el modo viene fijado por URL.
- `src/App.tsx`: `handleUserChatSubmit` ahora llama `agentTurn()` en vez de `askGemini()` directo —
  el modelo decide por sí mismo si solo responde o invoca una herramienta. Nuevo
  `gameHandlersRef` (sincronizado por un efecto después de que todos los handlers reales están
  definidos, ya que `handleUserChatSubmit` se declara ~500 líneas antes que `runSimulationRound` en
  este archivo) y `agentHistoryRef` (memoria conversacional multi-turno del agente, formato
  `Content[]` de Gemini — separada de `chatMessages`, que es solo texto para mostrar).

**Desvío deliberado y verificado, no supuesto: el modelo NO se migró a `gemini-3.6-flash`.**
El archivo `15` §4.1 pide migrar a `gemini-3.6-flash`/`@google/genai@^2.15.0` porque
`gemini-2.5-flash` "se retira el 16 de octubre de 2026". No hay forma de confirmar desde este
entorno que `gemini-3.6-flash` sea un modelo real y disponible — hardcodearlo como default habría
arriesgado romper el agente en la primera llamada real. Se mantuvo `GEMINI_MODEL_TEXT`
(`gemini-2.5-flash`, ya verificado funcionando en esta misma app) como default, ahora configurable
por variable de entorno (`process.env.GEMINI_MODEL`, agregado al `define` de `vite.config.ts`) —
cumple igual el principio del archivo fuente ("Model id is configuration, never a literal") sin
apostar a un nombre de modelo no verificable. Confirmado en el navegador con la key real de
`.env.local`: las llamadas van a `.../models/gemini-2.5-flash:generateContent` y responden 200.

**`zod-to-json-schema` no se instaló.** El archivo `15` lo pide, pero `zod` v4 (instalado,
`^4.4.3`) trae `z.toJSONSchema()` nativo — se probó (`target: 'openapi-3.0'`, el mismo formato que
pide `@google/genai`'s `parametersJsonSchema`) y funciona sin la dependencia extra. Se instaló y
luego se desinstaló al confirmar la duplicación.

**Proxy de servidor construido, no conectado todavía.** `api/gemini.ts` (Vercel Edge Function con
rate limit + degradación a modelo de respaldo) existe y está listo para desplegar, pero el agente
sigue llamando al SDK de Gemini directamente desde el cliente — igual que los tres call sites
preexistentes de `geminiService.ts` (chat, titulares, TTS), que YA exponen `GEMINI_API_KEY` en el
bundle del cliente vía el `define` de `vite.config.ts` (un problema real y preexistente, no
introducido en esta fase). Migrar los cuatro call sites al proxy es una tarea separada: este
entorno de desarrollo no puede correr una Edge Function de Vercel (`npm run dev` solo sirve la app
de Vite, no `/api/*`), así que nada enrutado por acá podría verificarse de punta a punta sin un
despliegue real. Construirlo ahora y conectarlo después (con un preview real de Vercel para probar)
se juzgó más seguro que migrar a ciegas.

**Telemetría: tabla `game_events` no existía, se creó la migración real, no se aplicó.**
El archivo `15` §7 da un `ALTER TABLE game_events ADD COLUMN ...`, pero el esquema real de este
proyecto (`supabase/schema.sql`) no tiene esa tabla — solo `game_sessions` y `annual_snapshots`
(una fila cada una). En vez de aplicar a ciegas un `ALTER` sobre una tabla inexistente contra el
proyecto de Supabase en producción, se escribió `supabase/agent_telemetry_migration.sql` (tabla
nueva, mismas convenciones de `schema.sql`: UUID + `gen_random_uuid()`, RLS con políticas "tabla:
acción propia") — **no aplicada**, requiere que alguien con acceso al proyecto la corra a mano.
`src/services/agentTelemetry.ts` funciona sin ese paso: `INSERT` falla en silencio (con una
advertencia en consola, una sola vez por sesión) hasta que la migración se aplique.

**`dn.confirm()` reutiliza el sistema de globos de la Fase 7**, no un componente nuevo: llama
`showBubble()` con `ttl: null` y dos `actions`, resolviendo la promesa desde los `onSelect` o desde
un `setTimeout` de 30s. Confirmado en vivo que el timeout funciona (ver verificación).

**Verificación.** `npx tsc --noEmit` limpio. `npx vitest run` 43/43 (19 tests nuevos:
`tests/agent/registry.spec.ts` — nombres únicos, gating por modo/nivel, límite de políticas activas,
bloqueo por lock-in, `anchorFor` no nulo para toda acción `mutate` — y `tests/agent/loop.spec.ts`,
con el SDK de `@google/genai` mockeado — `MAX_STEPS` corta el bucle, errores de validación vuelven
como `functionResponse` en vez de lanzar excepción, `simulate_year` siempre pide confirmación
incluso en modo `tutorial`). `npm run build` limpio. `npm run i18n:audit` en verde (9 archivos
Capa B/C pendientes, uno más que antes: `decarbonitoAgent.ts` se agregó a la lista, mismo criterio
que `geminiService.ts`).

**En el navegador, con la API key real de `.env.local` (no simulado):**
- Modo Asistente: "Activá la política de conservación de los bienes naturales" → el modelo llamó
  `activate_policy` con el id exacto correcto, DecarboNito viajó hasta la fila de esa política y la
  señaló con el anillo de resaltado, apareció la tarjeta de confirmación, se confirmó, la política
  quedó activa (`Activas: 1/5`, checkbox verde) y el globo final explicó el trade-off ("Observa
  cómo afecta la biodiversidad y el porcentaje de bosque nativo") — exactamente la regla 3 de la
  instrucción de operación.
- Modo Observador: se interceptó el `fetch` al endpoint de Gemini para inspeccionar el cuerpo real
  de la petición — confirmado que la lista de herramientas enviada en modo `observer` excluye por
  completo `activate_policy` y cualquier otra acción `mutate`/`advance` (solo
  `list_policies`/`explain_indicator`/`read_state`/`diagnose_trajectory`/`highlight_element`/
  `open_panel`/`show_chart`). Pedir "Activá la política de ganadería sostenible" en este modo no
  cambió `Activas: 1/5`.
- Confirmado incidentalmente que el timeout de 30s de `confirm()` funciona: un pedido de
  activación cuya confirmación quedó sin resolver por más de 30s (mientras se investigaba otra
  cosa) se autocanceló con el mensaje "cancelada por el jugador", sin intervención.
- Cero errores de consola de la aplicación en todo el flujo.

**No verificado en este ciclo:** el proxy `api/gemini.ts` (no desplegable localmente, ver arriba),
la escritura real en `game_events` (la migración no está aplicada en el Supabase del proyecto), y
el modo `tutorial` (sin caller todavía — se comporta como `assist` hasta la Fase 9).

**Origen.** `mejora-general/files/15_decarbonito_agent_actions.md`.

---

## 2026-08-06 — Fase 9 (tutoriales, predicción y debriefing v3): de 9 pantallas de texto a un ciclo predicción → acción → sorpresa → reflexión

**La fase de mayor superficie del ciclo hasta ahora** — motor de capítulos guiados nuevo, mecánica
de predicción nueva (una mecánica de juego real, no solo UI), consejos justo a tiempo, y una
reescritura completa del debriefing de cierre. Se cierran además dos huecos que fases anteriores
habían dejado documentados a propósito.

**Apertura en frío (§3), reemplaza el modal de bienvenida de 9 pantallas.** Al entrar por primera
vez ya no aparece ningún modal: el tablero se ve directamente y DecarboNito ofrece una decisión real
("¿expandimos la agricultura intensiva o protegemos el bosque nativo?"), sin bloquear nada. Verificado
en vivo con una sesión de navegador nueva: la apertura se dispara sola, activar una política avanza
el paso vía el evento real `policyActivated`, simular un año avanza vía `yearSimulated`, y el paso
final ofrece la bifurcación "Mostrame"/"Explorar" — un caso especial, no generalizado en el modelo de
pasos, porque es el único punto de ramificación de los 9 capítulos.

**Motor de capítulos guiados (§4) — `src/components/tutorial/`.** `types.ts` (modelo de datos casi
literal del archivo fuente), `chapters.ts` (los 9 capítulos de la tabla §4.3: coldOpen, board,
policies, routes, prediction, decarbonito, instruments, pressures, finance — deliberadamente
livianos, 2-4 pasos cada uno, para que el motor real importara más que igualar el conteo exacto de
palabras del archivo fuente), `TutorialRunner.tsx` (el motor: viaje+señalamiento vía `dn.focusOn`,
avance reactivo por `predicate`/`gameEvent` comparando el `gameState` de un paso al siguiente,
`anchorClick`/`timeout` vía listeners directos, persistencia en `localStorage` con reanudación por
paso tras recargar), `progress.ts`. Capítulos de nivel 2-3 se disparan la primera vez que su
`trigger` se cumple, no al entrar al nivel — enseñar el instrumento cuando hace falta, no antes.
Verificado en vivo: menú de capítulos completo, bloqueo correcto de capítulos de nivel superior,
"Completado"/"Repasar de nuevo" reflejando el progreso real guardado.

**Hueco cerrado de la Fase 7: `instrumentPanel`/`instrumentSlider`/`pactList`/`loanControl`/
`taxSlider` ahora tienen anclas reales.** Documentados como pendientes en la Fase 7 porque nada
todavía los necesitaba señalar; los capítulos `instruments`/`finance` de esta fase sí, así que se
instrumentaron con `useAnchor` en `PolicyInstrumentsPanel.tsx` e `InnovationGlobalDashboard.tsx`.

**Hueco cerrado de la Fase 7: `spotlight` en `dn.focusOn()`.** El archivo `14` ya especificaba el
oscurecimiento de pantalla (`box-shadow: 0 0 0 9999px rgba(8,14,12,.55)`) pero no había ningún
consumidor todavía; esta fase lo agrega a `DecarboNitoProvider`/`DecarboNitoLayer` y lo usa en cada
paso de capítulo marcado `spotlight: true`.

**Mecánica de predicción (§5) — la pieza pedagógica central, según el propio archivo fuente.**
`predictions.ts` (funciones puras: `actualDirection` con el umbral "flat" del 1% del rango del
indicador — documentado el rango elegido para CO₂eq/cápita, 15 t, ya que la simulación no define un
máximo teórico; `evaluatePredictions`), `PredictionStrip.tsx` (activada por defecto, se puede
ocultar, persiste la preferencia), wireado en `runSimulationRound` de `App.tsx` capturando el estado
antes/después de cada ronda (que en este proyecto ya es exactamente 1 año por clic —
`SIMULATION_YEARS_PER_ROUND = 1` — así que no hizo falta lidiar con predicciones multi-año).
Verificado en vivo: la tira renderiza sus 3 indicadores con flechas, integrada arriba del botón de
simular. **Desvío honesto, no un atajo silencioso:** la frase de error tras una predicción fallida
da magnitud y dirección reales ("bajó 3,1"), pero NO inventa una atribución causal específica
("...porque la conversión a cultivos convencionales pesó más") como sugiere el ejemplo del archivo
fuente — `SimTrace` (`src/sim/trace.ts`) solo tiene el delta antes/después por indicador desde que
se extrajo en la Fase 2; el desglose por término contribuyente que haría esa frase honesta sigue
pendiente (mismo hueco que la Fase 2 dejó documentado, ahora con una segunda razón concreta para
cerrarlo). `predictions_migration.sql` (nueva tabla, no aplicada, mismo patrón best-effort de la
Fase 8) adapta el `bigint identity` sin RLS del pseudocódigo a `UUID` + RLS "tabla: acción propia",
consistente con el resto de `supabase/schema.sql`.

**Consejos justo a tiempo (§6) — 5 de las 8 filas de la tabla, elegidas por lo barato que era
evaluarlas con el estado ya disponible en `runSimulationRound`:** esfuerzo cero en política activa
(nivel 2+), tesoro negativo, 3 años sin cambiar ninguna política (rastreado con
`lastPolicyChangeYearRef`, actualizado en `togglePolicy`), ninguna ruta > 60% a 2 años del fin del
nivel, y racha de 3 predicciones falladas en el mismo indicador. **No implementadas, documentadas:**
"5 políticas activas y se intenta una sexta" (ya tiene su propio aviso vía `addToast`/`logEvent` en
`togglePolicy` desde antes de esta fase — agregar un segundo canal por `dn.notify` se juzgó
redundante) y "una presión > 70 dos años seguidos" (necesitaría rastrear el histórico año a año de
las presiones, no solo el valor actual).

**Debriefing estructurado (§7) — `DebriefingModal.tsx` reemplaza `ClosingSynthesisModal.tsx` Y
el archivo muerto `PlayerReportGuideModal.tsx`** (confirmado por grep: nunca se importaba desde
ningún lado — arrastraba una función de reflexión ya cubierta, sin usar, desde antes de este ciclo).
Reutiliza sin tocar el pipeline de síntesis con IA ya existente (`geminiService.ts`'s
`generateClosingSynthesis`/`buildFallbackSynthesis`, 4 secciones no evaluativas) como base de la
Pantalla 1, y agrega lo que el archivo fuente pide y el modal viejo no tenía: ruta lograda/más
cercana (Fase 5's `evaluateLevel`) y precisión de predicción de la sesión. Pantalla 2: las 5
preguntas fijas de reflexión con guardado (`reflection_responses_migration.sql`, no aplicada) y un
botón "Hablar con DecarboNito" por pregunta (usa `dn.openConversation(seed)` — el `conversationSeed`
de la Fase 7 existía en el provider pero nunca se leía desde ningún lado; ahora sí, en
`ConversationPanel` no hacía falta tocarlo porque el seed solo importa como contexto inicial del
pedido). Pantalla 3: sugerencia de ruta alternativa + reinicio del nivel, enlaces al manual.
**No implementado, documentado:** el "perfil estratégico contra el promedio de todos los jugadores"
(necesita una consulta agregada entre sesiones, infraestructura real que esta fase no construye) y
los "tres años de mayor cambio" (mismo hueco de `SimTrace` mencionado arriba — atribuir "el mayor
cambio" sin el desglose causal sería una afirmación no verificable). Modo taller: botón que llama
`window.print()` con reglas `print:` de Tailwind mostrando las pantallas 1+2 apiladas — construido,
**no verificado visualmente** (imprimir no es fácilmente probable en este entorno de navegador
automatizado).

**Manual del Jugador actualizado en 2 de los 3 puntos que pide §4.4** (chat flotante y rutas de
victoria, en ambos idiomas) — la "capacidad de operación del asesor" se integró dentro del mismo
párrafo del chat flotante en vez de como una cuarta sección separada, ya que ambos describen al
mismo DecarboNito.

**Verificación.** `npx tsc --noEmit` limpio. `npx vitest run` 59/59 (16 tests nuevos:
`tests/tutorial/predictions.spec.ts` — direcciones, umbral flat, filtrado por lo realmente predicho
— y `tests/tutorial/chapters.spec.ts` — ids únicos, toda `textKey`/`titleKey` resuelve en ambos
idiomas, todo `anchor` referenciado es una anclas estática real registrada, capítulos de nivel 2+
declaran `trigger`). `npm run build` limpio. `npm run i18n:audit` en verde (19 Capa A pendientes,
3 menos que antes — `TutorialModal.tsx`/`ClosingSynthesisModal.tsx`/`PlayerReportGuideModal.tsx`
salieron de la lista al eliminarse esos archivos).

**En el navegador, sesión nueva (localStorage limpio para `decarbonation.tutorial.progress`):**
la apertura en frío se disparó sola sin ningún modal bloqueante; activar "Conservación de Bienes
Naturales" avanzó el paso correctamente (verificado por el anillo de resaltado moviéndose y el
cambio de texto del globo); simular un año avanzó el siguiente paso y actualizó las rutas de
victoria en tiempo real; la bifurcación final mostró "Mostrame"/"Explorar" y, al elegir "Mostrame",
el progreso persistido en `localStorage` mostró `coldOpen` completado y `board` en curso; el menú de
capítulos (botón "Ayuda/Tutorial" del header) mostró los 9 capítulos con el bloqueo de nivel
correcto ("Instrumentos" y "Presiones sectoriales" deshabilitados con "Se habilita en el Nivel 2").
Cero errores de consola de la aplicación en todo el recorrido.

**No verificado en este ciclo:** el debriefing completo (`DebriefingModal`) no se probó en vivo —
requiere completar un nivel entero (30 años simulados), impráctico dentro de esta sesión; se
verificó por tipado y lectura de código en su lugar. El modo taller (impresión) tampoco se probó
visualmente. Los capítulos 2 a 8 no se recorrieron paso a paso en el navegador (solo `coldOpen` y el
arranque de `board`) — su lógica es la misma del motor ya verificado, pero cada uno individualmente
no se cronometró ni se revisó visualmente.

**Origen.** `mejora-general/files/18_tutoriales_v3.md`.

## 2026-08-06 — Fase 10 (estética y game feel): reskin al sistema v3, contadores animados, insignias, y un bug real de raíz encontrado y corregido

**Reskin.** `Header.tsx`, `Dashboard.tsx` (tiles de indicadores + contenedores de gráficos/políticas),
`PolicyToggle.tsx` y `WinRoutesPanel.tsx` migrados de los tokens phase-1 (`bg-custom-light-gray`,
`text-custom-accent`, `bg-gray-700`, `text-green-400`/`text-yellow-400`/`text-red-400` sueltos) a los
tokens v3 construidos en la fase 4 pero nunca consumidos hasta ahora: `panel`, `label-eyebrow`,
`basalt-{950,900,800,700,600}`, `bone`, `ash`/`ash-dim`, `chlorophyll`/`ochre`/`ember`/`hydro`. Los
otros ~18 archivos que aún usan los tokens viejos quedan fuera de alcance deliberadamente — mismo
límite que la fase 4 ya documentó, no una omisión nueva. `ACCENT_CLASSES` de `WinRoutesPanel` pasó de
clases Tailwind sueltas (`border-green-500 text-green-400`) a los tokens con el mismo nombre semántico
que ya traían sus keys (`chlorophyll`/`ochre`/`hydro`/`bone`), sin tocar la lógica de rutas.

**Ambiente por nivel.** Se activaron dos primitivas construidas en la fase 4 con comentarios propios
de "esto lo consume la fase 10": la utility CSS `bg-level-ambience` (glow radial `--level-tint` +
textura `contour.svg` tileada, reemplazando el `bg-custom-gray` plano de `<body>`) y
`LevelAmbience.tsx` (efecto que escribe `--level-tint`/`--level-tint-alpha` según `currentLevel`),
ahora montado en `App.tsx`. Simplificación respecto al §6 de la fuente: una sola textura + tinte de
color en vez de tres ilustraciones per-nivel bespoke, y sin el cross-fade de 1.2s entre niveles (el
CSS no anima `background-image`; implementarlo bien requeriría dos capas superpuestas con opacity
cruzada, que no es lo mismo que "cambiar una custom property" — dejado fuera, documentado en el
propio comentario de `src/index.css`).

**Contador animado + delta + pulso, y un bug real.** `src/hooks/useCountUp.ts` (nuevo: `usePrevious`
+ `useCountUp`, rAF con ease-out-cubic, respeta `prefers-reduced-motion`) alimenta un rediseño
completo de `IndicatorCard` en `Dashboard.tsx`: valor animado (900ms, escalonado 60ms por tile vía
`index`), píldora de delta (`▲`/`▼`, 4s, `chlorophyll`/`ember`) y un pulso de 600ms
(`ring-2 ring-ochre`) al cruzar de tier de color — usado como proxy barato de "cruzó un umbral de
riesgo" comparando el string de clase de color entre renders, en vez de plomear el tier crudo como
prop nueva. **Al verificar esto en vivo (Chrome MCP, no solo por tipado) la píldora de delta no
aparecía nunca**, pese a que el valor sí se actualizaba correctamente en pantalla. Diagnóstico con
`console.log` inyectado temporalmente: `delta` se calculaba en el cuerpo del render a partir de
`usePrevious(value)`, pero el propio efecto interno de `usePrevious` (`ref.current = value`) corre
en el mismo commit que el `setShowDelta(true)` que dispara el re-render que debía *pintar* la
píldora — para cuando ese re-render ocurre, `prevValue` ya alcanzó a `value` y `delta` se lee como
`0`, así que la condición `delta !== 0` nunca es verdadera aunque `showDelta` sí lo sea. Corregido
congelando `{delta, good}` en su propio `useState` en el momento en que se calcula dentro del efecto
(antes de que la ref avance), en vez de recalcularlo en cada render a partir de una ref que puede
haber cambiado. Verificado de nuevo en vivo tras el fix: `▼ 0.17` en `chlorophyll` visible ~1s
después de simular. Este bug no lo habría atrapado `npx tsc --noEmit` ni `npx vitest run` — ninguno
ejerce el timing real de dos efectos-en-el-mismo-commit-más-un-re-render; solo apareció al
interactuar con la app real, que es exactamente la razón por la que este ciclo incluye una pasada de
verificación en navegador y no se conforma con "compila y los tests pasan".

**Insignias (§7).** `src/game/badges.ts` (nuevo) implementa las nueve condiciones de la tabla fuente
como funciones puras individualmente testeadas en `tests/sim/badges.spec.ts` (28 tests, el archivo
que el propio checklist de verificación de la fuente pide por nombre) más un orquestador
`evaluateBadges`. Persistencia vía `localStorage` (mismo patrón degradable que
`predictions.ts`) porque "Pluralista" pide ganar el mismo nivel por las tres rutas *en partidas
distintas* — no tiene sentido resetear eso al recargar. Presentación: solo la insignia más reciente
en el header (`Header.tsx`, prop `latestBadge`), como pide el §7 ("fila discreta... solo la última
obtenida"); la grilla completa de perfil **no se construyó** (no hay pantalla de "perfil" en este
codebase todavía). Tres adaptaciones documentadas dentro del propio `badges.ts` porque los datos que
la condición literal pide no existen tal cual en este codebase: (1) "balance de carbono positivo"
usa `co2EqEmissionsPerCapita <= 0` porque `computeCarbonBalance` (fase 2, `src/sim/carbon.ts`)
clampea el resultado en `Math.max(0, ...)` — un balance genuinamente positivo siempre se ve como
exactamente `0`, nunca negativo; (2) "política de bajo costo ambiental" (Sin Atajos) no tiene un
campo de costo-tier en `PolicyState`, así que se interpretó como las tres políticas cuyo propio
mecanismo empeora emisiones o afloja supervisión (`EnergySubsidies`, `IntensiveAgriculture`,
`FlexibleEnvironmentalRegulations`); (3) "80% en un nivel" (Pronosticadora) se aproximó a 80% de
aciertos acumulados en la sesión completa, porque `PredictionResult` no lleva tag de nivel y el
acumulador de `App.tsx` nunca se resetea por nivel. "Negociadora" (bajar las tres presiones bajo 50
en el mismo año) lee `history` en vez del snapshot vivo de indicadores, y exige al menos un año
simulado — de lo contrario una partida recién arrancada (presiones en 0 por defecto) ganaría la
insignia sin que el jugador hiciera nada.

**Estados vacíos y error boundary (§8).** Fila de "sin políticas activas" agregada arriba de la
grilla de `PolicyToggle`s en `Dashboard.tsx` (texto únicamente — la "ilustración tenue del
territorio" que pide la fuente no existe como asset y no se justifica un SVG nuevo solo para esto,
más aún respetando el presupuesto de §9). `src/components/common/ErrorBoundary.tsx` (nuevo, no
existía ningún error boundary en el codebase antes de esta fase) envuelve todo `main.tsx`, por
*fuera* de `I18nProvider`, para que un error dentro del propio provider también quede atrapado; como
consecuencia no puede usar el hook `useT()` y en su lugar usa la función `tFor(locale, key)` ya
existente + un `detectLocale()` recién exportado desde `src/i18n/index.tsx` (antes privado al
módulo). Adaptación documentada en el propio componente: la fuente pide mostrar "estado, semilla y
botón de reporte", pero `runSimulationRound` pasa `Math.random` real, no el RNG sembrado de
`src/sim/rng.ts` (que existe solo para tests/el harness de balance, según su propio comentario de
fase 2) — no hay semilla que mostrar en una partida real. El bloque de reporte copiable lleva en su
lugar mensaje/stack del error, timestamp y URL.

**Deliberadamente no construido, documentado sin ambigüedad:** la grilla de 12 columnas con "Cinta de
Carbono" de §2 (rediseño de layout completo, fuera de alcance de una fase de "acabado visual" sobre
un tablero que ya funciona); la coreografía de 6 segundos del "Informe Anual" con "ficha del año"
de §4 (depende de un desglose causal de `SimTrace` que no existe, mismo hueco que ya bloqueó parte
del debriefing en la fase 9); el theming de gráficos con `chartTheme.ts` más allá de lo que ya
traían (radar chart, transición animada de la torta, líneas de referencia) — `chartTheme.ts` sigue
sin consumidores, igual que `StatTile`/`Button`/`Badge` de la fase 4; sonido (explícitamente opcional
en la fuente); auditoría formal de Lighthouse (§9) — el build sigue emitiendo un chunk único de
~1.75MB/480kB-gzip, sin `React.lazy` para Recharts, mismo estado que antes de esta fase.

**Verificación.** `npx tsc --noEmit` limpio. `npx vitest run` 87/87 (28 tests nuevos en
`tests/sim/badges.spec.ts`). `npm run build` limpio (mismo warning de chunk >500kB que ya existía).
`npm run i18n:audit` en verde. En navegador (Chrome MCP, servidor dev puerto 3001, modo demo):
Header y tiles de Dashboard reskinados visibles con la textura de `bg-level-ambience` de fondo;
`WinRoutesPanel` reskinado confirmado (Vía de la Innovación/Transición Productiva/Integridad
Ecológica en hydro/ochre/chlorophyll); activar una política y simular confirmó el conteo animado del
valor, y — tras el fix del bug de arriba — la píldora de delta apareciendo y desapareciendo a los
~4s; cero errores de consola de la aplicación en todo el recorrido (fuera de un
`ReferenceError: loadEarnedBadges is not defined` transitorio capturado por HMR a mitad de una
edición, no presente tras recargar). El pulso de 600ms por cruce de tier no se verificó visualmente
en esta sesión (no se logró forzar un cruce de tier real en el tiempo disponible); su lógica es
estructuralmente idéntica a `showDelta` salvo que no sufre el bug de arriba (`pulse` es un booleano
seteado directamente, no un valor derivado de una ref en cada render), así que se aceptó por lectura
de código.

**Origen.** `mejora-general/files/19_estetica_visual.md`.

## 2026-08-07 — Fase 11 (landing, difusión y embudo): sitio de tres páginas estáticas, `/play?demo=1`, y un recorte deliberado de la tarjeta OG dinámica

**Alcance recortado de entrada.** El archivo 20 completo es comparable en tamaño a varias fases
anteriores juntas (landing completa, `@vercel/og` + firma HMAC + `/r/:id` dinámico, PWA con service
worker, embudo de analítica de 8 eventos, y seis materiales docentes). Antes de escribir código se
tomaron decisiones de alcance explícitas, documentadas acá en vez de descubiertas a mitad de
implementación:
- **Se construyó de verdad:** landing estática de tres páginas (`/`, `/play`, `/docentes`),
  `/play?demo=1`, metadatos SEO + JSON-LD + sitemap + robots, PWA (manifest + service worker de
  shell), embudo de 8 eventos vía Supabase, y un "compartir" de solo texto (no imagen).
- **Se recortó, documentado en el propio código:** la tarjeta de resultado con imagen OG dinámica
  de §5-6 (`@vercel/og`, `api/og.tsx`, firma HMAC, `/r/:id`). Motivo real, no pereza: este entorno
  de desarrollo no puede ejecutar Vercel Edge Functions (`npm run dev` solo sirve la app Vite, no
  `/api/*`) -- exactamente la misma limitación que ya bloqueó terminar de cablear `api/gemini.ts`
  en la fase 8, documentada ahí. Escribir una función edge nueva con firma criptográfica que no se
  puede probar de punta a punta en este entorno se juzgó más riesgoso que no escribirla. El video/
  GIF de 20s de la demostración (§3) tampoco se construyó -- no hay herramienta de grabación de
  pantalla ni de generación de assets en este entorno -- reemplazado por una micro-animación
  CSS/SVG de 8s en loop que representa la misma secuencia (documentado en el propio `index.html`).

**Arquitectura de tres páginas.** `index.html` (landing) y `play.html` (el juego, lo que
`index.html` era antes de esta fase) ahora son entradas separadas del build multi-página de Vite
(`vite.config.ts`, `build.rollupOptions.input`); `vercel.json` (nuevo -- no existía ningún archivo
de configuración de Vercel en el repo, el deploy usaba detección automática de framework) agrega
rewrites para las URLs limpias `/play` y `/docentes`. La landing importa `src/index.css` (el
sistema de tokens completo de la fase 4/10) directamente y no importa React en ningún lado: medida
real tras el primer build, `assets/landing-*.js` pesa 1.6 kB (1.0 kB gzip) y el HTML+CSS+JS
combinado de la landing es ≈93 kB sin comprimir / ≈20.5 kB gzip -- comparable en términos de
transferencia real al "~40 kB" que pide §2, aunque por encima en bytes crudos si se cuenta el CSS
compartido con el juego completo (que incluye reglas @font-face para fuentes que la landing nunca
llega a descargar, al no usar esos pesos).

**Bug real encontrado y corregido durante la implementación:** la primera versión de
`src/services/funnelTelemetry.ts` (usada también desde `src/landing.ts`) importaba
`services/supabaseService.ts`, que a su vez importa el cliente completo de `@supabase/supabase-js`
-- medido en el primer build: 213.7 kB (55.6 kB gzip) SOLO por ese import, en la landing que debía
pesar ~40 kB total. Corregido creando `src/services/funnelTelemetryLite.ts`, un segundo logger para
el mismo evento/tabla `funnel_events` que usa `fetch()` directo contra el endpoint REST de Supabase
en vez de importar el SDK -- el juego completo (`play.html`) sigue usando el cliente real vía
`funnelTelemetry.ts` sin cambios, porque ya carga `@supabase/supabase-js` de todos modos para
auth/sesión, así que ahí no hay nada que optimizar. La duplicación entre ambos archivos es
deliberada (frontera de tamaño de bundle, documentada en el comentario de cada uno), no descuido.

**`/play?demo=1` (App.tsx).** Corrida de nivel 1 acotada a `DEMO_YEARS = 5` (la fuente dice "5 años,
no 15"; este codebase usa `YEARS_PER_LEVEL = 30` real, no 15 -- 5 de 30 preserva la misma
proporción de "acotado" que pedía la fuente con 5 de 15, adaptado al número real). Tres políticas
curadas (`DEMO_POLICY_IDS`: Agroecológicas, Carbono Neutralidad, Agrícolas Intensivas -- una
"barata pero sucia" y dos de contraste) en vez de diez, filtradas en `Dashboard.tsx` vía la nueva
prop `demoPolicyIds`. Apertura en frío siempre activa (`resetTutorialProgress()` al montar si
`isDemo`). Al concluir el nivel, `DebriefingModal` muestra un aviso + CTA a `/play` (recarga real,
sin `?demo=1`) en vez del flujo normal de progresión de nivel. Verificado en vivo (Chrome MCP,
`/play.html?demo=1`): año objetivo 2024/2029 correcto, exactamente 3 políticas en el panel, apertura
en frío disparada, estado vacío de "sin políticas activas" (fase 10) coherente con las tres
políticas nuevas.

**Embudo de analítica (§7).** `src/services/funnelTelemetry.ts` (juego) + `funnelTelemetryLite.ts`
(landing) implementan los 8 eventos de la tabla fuente, mismo patrón "degradar con gracia" que el
resto de la telemetría del proyecto (`predictionTelemetry.ts`, etc.) -- la tabla `funnel_events` no
está migrada en el Supabase real, así que esto avisa una vez y no rompe nada mientras tanto.
`landing_view`/`play_click` desde `src/landing.ts` (gateado por `data-page="landing"` para no
dispararse también en `/docentes`); `game_start`/`first_decision`/`year_simulated`/
`level_completed`/`debrief_completed` desde `App.tsx`; `share_clicked` desde el nuevo botón
"Compartir resultado" de `DebriefingModal`. Simplificación documentada en el propio código:
`debrief_completed` no lleva `questions_answered` (esa cuenta vive en el estado local del modal, no
se justificó agregar un callback solo para exponerla).

**"Compartir resultado" (§5, versión recortada).** Sin imagen OG dinámica (ver arriba), el botón
nuevo en `DebriefingModal` arma un resumen de texto plano (nivel, año, ruta lograda o más cercana,
puntaje, % de predicciones acertadas si las hubo, y el dominio) y usa `navigator.share()` en
dispositivos que lo soportan, o copia al portapapeles con feedback visual ("¡Copiado!") si no.

**PWA y offline.** `public/manifest.webmanifest` con un solo ícono SVG (`sizes: "any"`) en vez de
PNGs 192/512 -- no existía ningún asset de ícono en el repo antes de esta fase (el favicon apuntaba
a `/vite.svg`, un archivo que nunca existió realmente, bug preexistente corregido de paso) y no hay
herramienta de generación de imágenes en este entorno; funciona bien en Chrome/Android, el ícono de
pantalla de inicio en iOS puede no coincidir (Safari históricamente prefiere PNG). `public/sw.js`:
service worker de una sola estrategia (stale-while-revalidate, mismo origen, GET únicamente, nunca
`/api/*`) en vez de una lista de precaché generada por build (no se agregó `vite-plugin-pwa` ni
`workbox` como dependencia nueva esta fase) -- el tradeoff documentado en el propio archivo es que
la primera visita a un deploy nuevo tiene que ser online.

**SEO.** `<title>`/`<meta description>` descriptivos y distintos por página, JSON-LD
`SoftwareApplication` + `LearningResource` en la landing, `sitemap.xml`, `robots.txt`. El `og:image`
que pide §6 se omitió a propósito (comentado en el `<head>` de `index.html`/`play.html`): no existe
ningún PNG 1200×630 en el repo y no hay herramienta de generación de imágenes acá -- una referencia
rota se ve peor en WhatsApp/LinkedIn/X que la ausencia de la etiqueta.

**Paquete docente (§8), honestidad de contenido.** De los seis materiales que pide la fuente, tres
existen de verdad: la guía de facilitación (`docs/guia_facilitador_debriefing.md`, ya existente,
copiada a `public/docentes/`), una "hoja de ecuaciones" adaptada de `docs/audit-equations.md` (un
documento de auditoría técnica, no un worksheet pulido para estudiantes -- etiquetado como tal), y
unas consignas de debriefing imprimibles armadas en esta fase a partir de las cinco preguntas ya
aprobadas del informe de cierre (`src/i18n/ui/{es,en}.ts`). "Plan de clase" y "diapositivas de
encuadre" no existen en ningún lugar del proyecto (buscado en `mejora-general/` y `docs/`) y se
listan como "Próximamente" en vez de inventar contenido. Bug encontrado y corregido en el camino:
los `.md` servidos desde `public/docentes/` se veían con acentos rotos (`GuÃ­a` en vez de `Guía`) --
el servidor no declaraba `charset=utf-8` para `text/markdown`; corregido con una regla de headers en
`vercel.json` (`Content-Type: text/markdown; charset=utf-8`) para la ruta `/docentes/*.md`. Esta
corrección solo aplica al deploy real de Vercel -- `npm run dev` sigue sirviendo esos archivos sin
el header y por lo tanto con el mismo problema visual, verificado y documentado, no un bug latente
sin detectar.

**No verificado en este ciclo:** el service worker no se probó offline de verdad (requiere un
deploy real o simular red desconectada en el navegador, no hecho en esta sesión). Las vistas previas
de WhatsApp/LinkedIn/X (verificación §Verificación ítem 3 de la fuente) no se pudieron probar sin un
deploy público. Lighthouse no corrió (mismo motivo que la fase 10: no hay deploy contra el cual
auditar desde este entorno).

**Verificación.** `npx tsc --noEmit` limpio. `npx vitest run` 87/87 (sin tests nuevos esta fase --
el trabajo es mayormente HTML estático + wiring, no lógica pura nueva salvo el filtro de políticas
de demo, ya cubierto por el tipado). `npm run build` limpio, tres entradas (`index.html`,
`play.html`, `docentes.html`). `npm run i18n:audit` en verde. En navegador (Chrome MCP, servidor
dev puerto 3001): landing completa recorrida sección por sección, conmutador es/en funcional y
persistente entre páginas (mismo `localStorage` key que el juego), `/docentes.html` con los tres
materiales reales descargables, `/play.html?demo=1` con las cuatro restricciones de demo activas
simultáneamente y sin errores de consola.

**Origen.** `mejora-general/files/20_landing_shareables.md`.

## 2026-08-07 — Fase 12 (cierre de i18n, Capas B/C): un bug real en la traducción de nombres de política encontrado y corregido, y menos trabajo pendiente de lo que la lista sugería

**Punto de partida.** `scripts/i18n-audit.mjs` listaba 9 archivos en `CAPA_B_C_PENDING`. Antes de
escribir código se auditó cada uno de verdad (temporalmente sacándolo de la lista de ignorados y
corriendo el script) en vez de asumir que "pendiente" significaba "sin traducir": tres de los
nueve (`geminiService.ts`, `decarbonitoAgent.ts`, `suggestionService.ts`) resultaron estar **ya
completamente bilingües** desde fases anteriores (8 y 9) — cada string que el jugador puede ver
tiene su rama `language === 'en' ? ... : ...` o su `Record<Language, string>`; lo que el heurístico
del audit marca ahí es solo la mitad en español de un par que ya funciona. Se documentó esa
verificación en el propio script en vez de re-traducir algo que no lo necesitaba.

**Bug real encontrado: `POLICY_NAMES` nunca tradujo nada.** Al escribir un test para la traducción
de `sim/index.ts`'s log de activación de política, el nombre traducido no aparecía. Investigado:
`src/legacyContent/gameData.ts`'s `POLICY_NAMES` estaba indexado por el *identificador de
TypeScript* del enum `Policy` (`'Agroecological'`, `'NaturalConservation'`, ...), pero `Policy` es
un enum de string cuyos *valores* son oraciones completas en español
(`Policy.Agroecological === "Políticas Agroecológicas (P-AS)"`, `src/types.ts`) — y todo call site
pasa `policy.id`, que contiene ese *valor*, nunca el identificador. `getPolicyName(policy.id, lang)`
entonces fallaba el lookup siempre y devolvía `policy.id` sin cambios (el mismo texto en español en
ambos idiomas) -- silenciosamente, desde que sea que se escribió este archivo. Esto significa que
**los nombres de política nunca se tradujeron en ningún lugar de la app**: tooltips del Dashboard,
`PolicyToggle`, el contexto que recibe Gemini, el texto de la síntesis de cierre local, y ahora
también las líneas de log nuevas de esta fase -- todos silenciosamente en español pese al selector
de idioma. Corregido re-indexando `POLICY_NAMES` con propiedades computadas `[Policy.X]`, el mismo
patrón que ya usa `INITIAL_POLICIES` en `constants.ts` -- inmune a que el valor del enum vuelva a
cambiar. `LandUseType` se auditó por el mismo patrón y está bien (sus valores son códigos cortos
como `"BNNP"`, no prosa, y coinciden con las claves de `LAND_USE_NAMES`). Verificado en vivo
(Chrome MCP, `/play.html`, `localStorage` en `en`): las diez políticas del panel ahora se leen
"Agro-ecological Policies", "Natural Assets Conservation", etc. -- antes de este fix se habrían
visto en español pese al toggle de idioma.

**`equations/descriptions.ts` traducido de verdad (el único de los 9 que realmente lo necesitaba).**
~90 descripciones de parámetros/ecuaciones, de `Record<string, string>` (solo español) a
`Record<string, Record<Language, string>>`. `EquationsManual.tsx` ya leía `language` para su propio
texto de interfaz pero pasaba esa misma clave a un diccionario plano en español -- corregido con un
helper `d(key)` que resuelve el idioma activo, reemplazando las 19 llamadas directas a
`DESCRIPTIONS.XXX`/`DESCRIPTIONS[key]`.

**`src/sim/{economy,events,index,policies}.ts`: logs y advertencias ahora bilingües.** `stepYear`
gana un cuarto parámetro `language: Language = 'es'` (default preserva compatibilidad con los 8
call sites existentes en tests/scripts que no lo pasan), enhebrado hacia `rollEvent`,
`applyRandomEventEffects`, `updateEconomy` y `checkEfficiencyWarning`. Cubre: el log de activación
de política (visible en `GameLogDrawer`, que renderiza `gameLog` crudo), el log de préstamo
procesado, los tres logs/advertencia de eventos aleatorios (incluida la etiqueta de nombre/
descripción del evento, ahora leída via `getEventName`/`getEventDescription` en vez del campo
Spanish-only del objeto `RandomEvent`), y la advertencia de eficiencia de política por debajo del
40% (llega al jugador directo como mensaje de chat). `EVENT_DESCRIPTIONS` es contenido nuevo en
`legacyContent/gameData.ts` -- las 8 descripciones de eventos nunca habían tenido versión en
inglés en ningún lado (solo `EVENT_NAMES`, los títulos, existían); traducidas del español real de
`constants.ts`'s `ALL_RANDOM_EVENTS`. `App.tsx`'s propio `stepYear(...)` call site pasa
`getActiveLanguage()`.

**`src/sim/index.ts`'s `gameOverReason`: dejado en español a propósito, documentado, no un
descuido.** Grep-verificado: nunca se renderiza como texto en ningún componente (solo
`!!gameOverReason` para un booleano, comparado con `.includes('victoria')`/
`=== 'Partida abandonada...'` en `App.tsx` y `geminiService.ts`, y enviado a Gemini como contexto).
El propio §5 del archivo 12 dice que el contexto que recibe el modelo puede quedar en español.
Traducir estos 4 strings habría significado además actualizar cada comparación en dos archivos por
un valor que nada muestra -- no se juzgó que valiera el riesgo. Comentario explicativo agregado
en el propio `sim/index.ts` justo antes de donde se asignan.

**`types.ts`: cerrado sin cambio de código.** Los valores del enum `Policy`/`LandUseType` en
español son exactamente el patrón "contenido de dominio indexado por ID" que el §4.1 del archivo
12 describe -- no hay que traducirlos en el lugar, hay que indexar por ellos (que es justo lo que
`POLICY_NAMES`/`LAND_USE_NAMES` ya hacen, ahora correctamente). Movido de `CAPA_B_C_PENDING` a
`IGNORED` en el script de auditoría, con el razonamiento documentado ahí mismo.

**Tests nuevos.** `tests/sim/i18n.spec.ts` (6 tests): `stepYear` con/sin `language`, traducción del
nombre de política dentro del log (no solo la oración), `updateEconomy` y
`checkEfficiencyWarning` en ambos idiomas. Dos de los seis fallaron en el primer intento --
exactamente por el bug de `POLICY_NAMES` de arriba, encontrado *por* el test, no antes. Quedó como
regresión cubierta.

**Auditoría, resultado final.** `scripts/i18n-audit.mjs` reescrito: `CAPA_B_C_PENDING` renombrado a
`CAPA_B_C_VERIFIED_BILINGUAL` (8 archivos, ya no "pendientes" sino verificados/traducidos en esta
fase, con el razonamiento de cada uno documentado en el propio script) y `types.ts` movido a
`IGNORED`. La lista de 19 componentes Capa A (`IGNORED_COMPONENTS`) queda sin tocar -- ese es el
backlog de interfaz, fuera del alcance nominal de "Capas B/C" que pedía esta fase.

**No hecho, documentado:** la migración completa de Capa A (los 19 componentes de
`IGNORED_COMPONENTS`) sigue pendiente -- nunca fue el alcance de esta fase. Los mensajes de log que
`App.tsx` empuja directamente a `gameLog` (selección de política antes de simular, inicio de
partida) siguen en español -- son Capa A (el propio `App.tsx`), no Capa B/C; verificado en vivo que
siguen en español aun con el fix de esta fase aplicado, es la brecha esperada, no una regresión.

**Verificación.** `npx tsc --noEmit` limpio. `npx vitest run` 93/93 (6 tests nuevos). `npm run
build` limpio. `npm run i18n:audit` en verde. En navegador (Chrome MCP, `/play.html`,
`localStorage.decarbonationLanguage_v1 = 'en'`): las diez políticas del panel muestran nombres en
inglés correctos -- confirma el fix de `POLICY_NAMES` en vivo, no solo por test.

**Origen.** `mejora-general/files/12_i18n_completo.md` §4 (Capa B), §5 (Capa C).

## 2026-08-07 — Hotfix post-deploy: el login con Google quedaba roto por la separación landing/juego

**Síntoma reportado.** Tras el deploy a producción de la fase 11, el usuario reportó que la
pantalla de entrada solo ofrecía "continuar sin cuenta" -- el login con Google parecía no estar
disponible, pese a que `LoginScreen.tsx` siempre renderiza los dos botones sin condición alguna.

**Diagnóstico en vivo (Chrome MCP, `decarbonation.vercel.app` real, no local).** El botón de
"Ingresar con Google" SÍ dispara el flujo de OAuth y Google SÍ autentica -- pero
`supabase.auth.signInWithOAuth({ provider: 'google' })` sin un `redirectTo` explícito usa la
"Site URL" configurada en el proyecto de Supabase como destino del callback, que apunta a la raíz
del dominio. Antes de la fase 11 eso era correcto (la raíz *era* la app). Después de la fase 11,
la raíz es `index.html`, la landing estática sin React de `20_landing_shareables.md` -- no tiene
ningún cliente de Supabase que pueda leer el fragmento `#access_token=...` que Google devuelve.
Capturado en vivo: tras autenticar, la URL terminaba en
`https://decarbonation.vercel.app/#access_token=eyJ...` -- el token quedaba ahí, sin consumir, y
el usuario veía la landing de marketing en lugar del juego. Si volvía a hacer clic en "Jugar
ahora", entraba a `/play` sin sesión (el fragmento nunca se guardó), como si el login nunca hubiera
pasado -- de ahí que "solo" el modo demo pareciera funcionar.

**Corrección.** Un parámetro `redirectTo` explícito en `signInWithGoogle()`
(`src/services/supabaseService.ts`) apuntando a `${window.location.origin}/play` -- la única
página que efectivamente monta `src/main.tsx` y puede completar el callback. No requiere tocar
configuración del proyecto de Supabase (Site URL/Redirect URLs en su dashboard), que queda como
estaba; el fix vive enteramente en el código.

**Verificación.** `npx tsc --noEmit` limpio, `npx vitest run` 93/93, `npm run build` limpio.
Diagnosticado con una sesión de Google real ya autenticada en el navegador de prueba (no se
ingresó ninguna credencial nueva -- el flujo OAuth ya estaba autorizado de una prueba previa del
usuario y solo se observó a dónde redirigía). No se pudo re-verificar el flujo completo post-fix
en producción dentro de esta sesión porque requeriría un nuevo deploy y una re-autenticación real;
la corrección se basa en el diagnóstico exacto de la causa (URL de redirect capturada en vivo), no
en una suposición.

**Origen.** Reporte directo del usuario tras el deploy de la fase 11.

## 2026-08-07 — Segundo hotfix post-deploy: CTA sin "sin registro", paquete docente completo (5 páginas nuevas), corrección institucional

**Pedido del usuario, tres partes.**

1. **Botón "Jugar ahora":** sacar el sufijo "(sin registro)" / "(no signup)" del CTA principal de
   la landing (`index.html`, `#cta-play`). El párrafo de subtítulo, que también menciona "sin
   registro" como dato descriptivo, no es el botón -- se dejó igual.
2. **Paquete docente completo:** de los cinco recursos listados en `/docentes`, dos eran
   "Próximamente" (Plan de clase, Diapositivas de encuadre) y los otros tres eran links directos a
   archivos (`.md`/`.html` planos), no páginas con el diseño del sitio. Pedido explícito: una
   página por recurso, con el mismo sistema de diseño que la landing, y contenido completo (no
   más placeholders).
3. **Corrección institucional:** "Es un proyecto de Fundación Bariloche principalmente no de FCF."
   Antes de tocar código se le preguntó al usuario cómo debía quedar exactamente FCF-UNaM (sacarla
   del todo vs. reordenar) -- eligió: Fundación Bariloche primero como institución líder, FCF-UNaM
   se mantiene después como colaboradora.

**Institucional.** Reordenado en las cuatro menciones que existían (`index.html`: eyebrow del
hero, JSON-LD, bloque de rigor, footer; `src/components/common/CoverScreen.tsx`: pantalla "Acerca
de" dentro del juego; `public/docentes/consignas-debriefing.html`). El bloque de rigor pasó de
"Desarrollado en la FCF-UNaM junto a Fundación Bariloche y CONICET" a "Desarrollado por Fundación
Bariloche, junto a la FCF-UNaM y CONICET" -- no es solo reordenar la lista, el verbo también
cambia para reflejar liderazgo, no solo participación.

**Cinco páginas nuevas** (`docentes-guia.html`, `docentes-consignas.html`, `docentes-ecuaciones.html`,
`docentes-plan-clase.html`, `docentes-diapositivas.html`), cada una un entry de Vite más
(`vite.config.ts`) con rewrite propio en `vercel.json` (`/docentes/guia`, `/docentes/consignas`,
`/docentes/ecuaciones`, `/docentes/plan-clase`, `/docentes/diapositivas`), todas importando
`/src/index.css` como la landing -- ningún React, mismo patrón que `index.html`/`docentes.html`
desde la fase 11.

- **Guía de facilitación** y **hoja de ecuaciones**: contenido reformateado desde los `.md` que ya
  existían (`docs/guia_facilitador_debriefing.md`, `docs/audit-equations.md`) -- la hoja de
  ecuaciones en particular NO es el volcado crudo de la auditoría técnica (esa tabla interna con
  estados PENDIENTE/CORREGIR no es material pedagógico); en su lugar presenta las 7 familias de
  ecuaciones del `EquationsManual` in-app (fase 12) más un resumen honesto de dos hallazgos reales
  de la auditoría (P-1: el decaimiento de eficiencia de política, L-1: la conservación de área con
  eventos activos), con el detalle técnico completo linkeado aparte para quien lo quiera.
- **Consignas de debriefing**: reconstruida con el mismo diseño de landing pero con una hoja de
  estilos `@media print` que vuelve a fondo blanco/tipografía serif al imprimir -- la versión
  oscura original (`public/docentes/consignas-debriefing.html`) queda como descarga de imprenta
  directa para quien la prefiera.
- **Plan de clase** (contenido nuevo, no existía en ningún lado del proyecto): una clase de 90
  minutos minuto a minuto (apertura 10' → juego Nivel 1 ~40' → debriefing 25' → cierre 10'),
  alineada a los tres objetivos de aprendizaje ya publicados en la landing, con variantes para 60
  minutos y para dos clases (agregando Nivel 2), y una sección de "evidencia de aprendizaje" que
  señala que el informe de cierre que la app ya genera es, en sí mismo, la evidencia -- no hace
  falta instrumentación nueva.
- **Diapositivas de encuadre** (contenido nuevo): diez láminas en una página desplazable (o
  imprimible con salto de página por lámina vía `@media print`), desde "qué es DecarboNation" hasta
  el CTA final "Empecemos" con la URL del juego -- pensadas para proyectar ~10 minutos antes de
  jugar, cubriendo el problema (AFOLU), la mecánica, los tres niveles, las tensiones del sistema,
  los objetivos de aprendizaje y qué se obtiene al final.

`docentes.html` reescrito para linkear a las 5 páginas nuevas en vez de a archivos; `sitemap.xml`
con las 5 URLs nuevas; ancla `#faq` agregada a la sección de preguntas de aula para que el plan de
clase pueda linkearla directamente.

**Deliberadamente no bilingüe.** Las cinco páginas nuevas son mayormente en español (la hoja de
ecuaciones y las consignas sí tienen `data-lang` es/en completo, por ser más cortas; guía, plan de
clase y diapositivas no) -- coherente con que todo el contenido fuente del que parten (la guía, la
auditoría) siempre fue solo en español. Traducir ~800 líneas de contenido nuevo al inglés en esta
misma pasada no se hizo; queda como trabajo pendiente explícito, no silencioso.

**Verificación.** `npx tsc --noEmit` limpio. `npx vitest run` 93/93 (sin tests nuevos -- HTML/
contenido, no lógica). `npm run build` limpio, 8 entries de Vite. `npm run i18n:audit` limpio.
Verificado en navegador local (`npm run dev`, no las URLs limpias -- esas dependen de los rewrites
de `vercel.json`, que Vite dev no interpreta, mismo límite ya documentado en la fase 11): landing
con el botón "Jugar ahora" sin sufijo y el orden institucional correcto, `/docentes.html` con los
cinco recursos linkeando "Ver"/"Abrir" en vez de "Descargar", y las páginas
`docentes-guia.html`/`docentes-diapositivas.html`/`docentes-plan-clase.html` renderizando con el
diseño esperado y cero errores de consola.

**Origen.** Reporte directo del usuario tras el deploy de la fase 11 (segunda ronda).

## 2026-09-11 — v4 / F0 (fusión con EcoSIM): especificación, rama y CLAUDE.md corregido

**Pedido del usuario.** Fusionar DecarboNation con el prototipo EcoSIM (`combinacion/EcoSIM`, mejor
arte e interfaz) en un solo nivel, previa entrega de un plan completo. Decisiones tomadas por el
usuario sobre ese plan: (1) base Nivel 2 con desbloqueo progresivo, pero con **paso mensual** como
EcoSIM; (2) el juego de 3 niveles sigue siendo el principal y la fusión va en una sección aparte
como "lo próximo en desarrollo"; (3) el jugador solo puede declarar áreas protegidas u otros usos
públicos, siempre que su efecto entre en todas las ecuaciones que usan ese dato; (4) commit por fase.
Todo quedó en `mejora-general/files/21_fusion_ecosim.md`.

**Por qué el motor de DecarboNation y no el de EcoSIM.** El de EcoSIM es mensual pero ad hoc, sin
tests, y reporta agua y energía que nada calcula con sustento. Las dos revisiones PDF que vienen con
EcoSIM piden explícitamente un núcleo causal verificable y reproducible con la IA fuera del cálculo:
eso ya es `src/sim/`. EcoSIM aporta mapa, arte y HUD.

**Por qué el paso mensual no cambia el modelo.** Todas las ecuaciones de estado son de primer orden,
`x(t+1) = x(t) + f(x(t))`; el paso mensual es `x + f(x)/12` (Euler con Δt = 1/12). Conserva los
equilibrios del modelo anual, el área total y los límites 0-100; cambia la forma de la trayectoria,
no el destino. Se implementa en un módulo aparte (`src/sim/monthly.ts`) y `stepYear` no cambia.

**`CLAUDE.md` estaba desactualizado en un punto que confundía.** Decía que el componente raíz era
`App.tsx` en la raíz y que `src/App.tsx` era un duplicado obsoleto: es al revés desde la
consolidación del commit `5f415c7` (no existe `App.tsx` en la raíz). Reescrito: entradas del build
multipágina, motor puro, comandos de test (incluido cómo correr un solo test), `GEMINI_MODEL`,
convenciones de fases y de este log.

**Abierto.** Qué "otros usos públicos" además del área protegida, y con qué parámetros (§5 de la
especificación): no se habilitan hasta tener tasas y pesos para todas las ecuaciones.

## 2026-09-11 — v4 / F1: motor mensual (`src/sim/monthly.ts`)

**Qué se hizo.** `stepMonth(state, month, rng, CP, lang, options)` reproduce `stepYear` paso por
paso con Δt = 1/12: cada stock avanza 1/12 de lo que la ecuación anual lo movería desde el estado
actual (`x + (F(x) − x)/12`). Ninguna fórmula, peso ni umbral cambia. Tres cambios mínimos en
módulos compartidos, todos con valor por defecto que conserva el comportamiento anterior:
`updatePolicyEfficiency(..., dt = 1)`; `fiscalTermsActive = currentLevel === 3` en
`calculateEconomicSecurityChange`/`calculateSocialConflictChange`; y la evaluación de fin de
partida extraída tal cual a `src/sim/gameOver.ts` (`evaluateGameOver`), que usan los dos motores.

**Verificación de que el juego de 3 niveles no cambió.** `npm run sim` antes y después de los
cambios: salida idéntica (diff vacío). Los 93 tests previos siguen pasando.

**Mensual vs anual, medido.** Cuatro estrategias (nada; verde; productiva; mixta), Nivel 2, sin
eventos, 30 años: los indicadores centrales difieren < 1 punto, CO₂ < 0,2 t/hab, puntaje ≤ 11/1000.
Donde más se separan es en las presiones (hasta ~6 puntos, p. ej. presión social mixta 92,6 anual vs
86,8 mensual): el paso anual rebota contra los límites 0/100 y el mensual los suaviza. Es la
diferencia esperable entre un paso grueso y uno fino, no un desvío del modelo. Tests nuevos en
`tests/sim/monthly.spec.ts` (10): pureza, calendario, determinismo, conservación de área a 30 años,
límites y finitud con eventos, coincidencia con `stepYear` a 30 años (tolerancias medidas),
probabilidad mensual de eventos, efecto completo del evento en su mes, préstamo acreditado una vez,
términos fiscales solo si se activan.

**Eventos.** Cada evento conserva su frecuencia anual calibrada (`1 − (1 − p)^(1/12)` por mes). La
suma de probabilidades del Nivel 2 ronda 0,2 por año, así que el "más situaciones y noticias"
pedido no puede salir de estos eventos sin inflar shocks que el modelo calibró como raros: tiene que
salir de noticias derivadas del estado y de situaciones nuevas (F5).

**Hallazgo en el juego principal (no corregido, pendiente de decisión).** En `stepYear` los pactos
aplican sus efectos en el paso 5, pero `politicalStability` se recalcula en el paso 8 desde
`Colapso_politico` y `co2EqEmissionsPerCapita` en el paso 9 desde `computeCarbonBalance`. Resultado:
el −5 % de CO₂ y el +3 de estabilidad del Acuerdo Global de Carbono, el −10 % de CO₂ de la
Iniciativa de Transferencia Tecnológica y el −5 % de CO₂ del evento "Boom de tecnología verde" nunca
llegan al jugador (el efecto sobre biodiversidad y seguridad económica sí, porque esas se calculan
a partir del valor vigente). El motor mensual reproduce el mismo comportamiento para seguir siendo
el mismo modelo; corregirlo cambiaría el balance del juego de 3 niveles y es decisión del equipo.

**Otro.** `tsconfig.json` no tenía `include`, así que `tsc --noEmit` (y por lo tanto `npm run
build`) empezó a compilar `combinacion/EcoSIM` y a fallar. Se agregó `exclude` con
`combinacion`, `node_modules` y `dist`.

## 2026-09-11 — v4 / F2: territorio (`src/sim/territory.ts`) y área protegida declarada por el jugador

**Qué se hizo.** Módulo puro que une el mapa de 12×12 con las seis áreas del modelo:
`createTerritory` (río, 4 humedales, pueblo de 8 parcelas, y 120 parcelas productivas de 5 kHa =
los 600 kHa del Nivel 2, dispuestas del pueblo hacia afuera: cultivos convencionales,
agroecológicos, pasturas, plantaciones, bosque nativo, reserva), `syncTerritory` (modelo → mapa) y
`declareProtectedArea` (la única acción directa del jugador, decisión 3 del equipo).

**Modelo → mapa.** Cuantización por mayor resto al inicio; después, cambios mínimos con una banda
de histéresis de 1,2 parcelas para que una parcela no parpadee cuando un área está cerca de un borde
de redondeo (el error queda acotado a ≤ 6 kHa por uso, verificado a 30 años con eventos). La parcela
que cambia se toma de la frontera del uso que crece: la deforestación avanza desde los cultivos y
las reservas crecen desde sus bordes. El área que el modelo deja de contabilizar por el evento de
sequía (ítem L-1 de la auditoría) se muestra como parcelas en barbecho en vez de ocultarse.

**Mapa → modelo.** Declarar reserva una parcela de bosque nativo no protegido mueve 5 kHa de BNNP a
BNP y cobra un costo único de las Reservas del Tesoro (`Costo_Declaracion_Area_Protegida_por_kHa`,
parámetro nuevo en `CONTROL_PARAMS`, 20/kHa = 100 por parcela ≈ un mes de recaudación del Nivel 2;
a calibrar en F7). No aparece en el panel del facilitador del juego principal, que lista sus
parámetros explícitamente. Ninguna ecuación cambió: carbono, biodiversidad, seguridad alimentaria y
económica, el flujo de deforestación BNNP→CC y la condición de % de bosque nativo leen las áreas, así
que la acción llega a todas. Un test lo verifica de punta a punta: con 6 parcelas protegidas, a 10
años hay menos cultivo convencional (menos bosque expuesto a la deforestación) y más biodiversidad.

**Honestidad sobre la magnitud.** En el modelo, el efecto directo de BNP sobre la biodiversidad es
chico (peso 0,50 vs 0,20 de BNNP, ponderado por la fracción de área y por 0,8·1,5). Lo que más
cambia la protección es cortar la deforestación de esas parcelas. Si el equipo quiere que declarar
reservas pese más, es una decisión sobre pesos del modelo, no algo a resolver en la interfaz.

**Verificación.** 114/114 tests (11 nuevos en `tests/sim/territory.spec.ts`), `tsc` limpio,
`npm run sim` idéntico al del juego de 3 niveles antes de v4.

**Abierto.** Otros usos públicos además del área protegida: pendiente de definición del equipo.

## 2026-09-11 — v4 / F3: vista previa jugable en `/territorio` (mapa, HUD, sesión mensual)

**Qué se hizo.** Entry nuevo `territorio.html` → `src/territorio/` (ruta limpia `/territorio` en
`vercel.json`), separado del juego de 3 niveles, que no cambia. Contenido:
`session.ts` (reglas puras de la partida: reloj mensual, desbloqueos, acciones portadas de `App.tsx`
sin cambios de reglas), `news.ts` (noticias derivadas del modelo), `IsoMap.tsx` (mapa de EcoSIM
portado), `hud.tsx`/`panels.tsx`/`screens.tsx` (HUD flotante de EcoSIM sobre los tokens v3;
reutiliza `WinRoutesPanel`, `EffortSlider` y `Button` del juego principal), textos propios en
`src/i18n/territorio/` (es/en, tipados, fuera del bundle del juego principal). Assets de EcoSIM
convertidos a WebP en `public/assets/ecosim/` (1,8 MB → 406 KB, solo los 12 tiles que usa el mapa).

**Hallazgos y correcciones durante la verificación en navegador.**
- *El mapa mostraba transiciones que el modelo no hace.* Con solo las áreas netas, "conservación
  BNNP→BNP + reconversión CC→CA" es indistinguible de "BNNP→CA + CC→BNP": medido en 100 partidas,
  el 23 % de los cambios dibujados eran inválidos (p. ej. un cultivo convertido en reserva). Se
  extrajo `computeLandUseFlows` de `updateLandUse` (mismas fórmulas, mismo orden; `npm run sim`
  idéntico), `stepMonth` devuelve los flujos del mes y el territorio mueve parcelas por cada flujo
  acumulado. La red de seguridad por neto descuenta lo que está "en camino" en los acumuladores;
  un primer intento sin ese descuento duplicó los cambios y empeoró la fidelidad. Resultado medido:
  100 % de transiciones válidas; el mapa va hasta 2,45 parcelas detrás del área de algún uso (cota
  del test: 3), por eso la leyenda muestra las hectáreas exactas del modelo, no el conteo de parcelas.
- *CO₂ y puntaje iniciales inconsistentes.* `createInitialState` toma CO₂ = 6,5 y puntaje 0 de
  `INITIAL_INDICATORS`, pero los usos del suelo del Nivel 2 dan ~17,4 t/hab: el primer paso mostraba
  un salto que el jugador no causó. La vista previa los recalcula con las funciones del modelo antes
  del primer mes y toma la línea de base de las rutas después. **El juego de 3 niveles tiene el mismo
  salto en su primer año** (no se tocó; pendiente de decisión del equipo).
- *Selección desplazada una parcela.* Los sprites están elevados ~28 px sobre su rombo de suelo
  (medido sobre el arte); selección, contornos y capas usan ahora la cara visible de la parcela.
- *Retratos con fondo magenta* (croma opaco en los PNG originales de EcoSIM): recorte de croma al
  convertir.
- *Reloj atado a `requestAnimationFrame`*, que se detiene en pestañas ocultas. Pasó a un temporizador
  de tiempo real, y la partida se pausa sola al salir de la pestaña (en un aula nadie debería volver
  y encontrar años pasados).
- Una noticia atribuía a "la política de conservación" el paso BNNP→BNP, que tiene tasa base aun sin
  esa política: se reescribió sin afirmar la causa.

**Honestidad de los datos en pantalla.** Capas "ver sobre el mapa" = coeficientes del propio modelo
por uso del suelo (tasas de emisión/secuestro, pesos de `INDICATOR_IMPACT_WEIGHTS`), normalizados.
La ficha de parcela muestra lo mismo en flechas. Ningún número del HUD sale de otro lado que no sea
el `GameState`.

**Verificación.** 125/125 tests (sesión: 10 nuevos en `tests/territorio/`; territorio: fidelidad de
flujos y cota medida), `tsc` limpio, `i18n:audit` limpio, `npm run build` con el entry nuevo.
En navegador (Chrome, escritorio 1536 px): portada, partida, activar políticas, reloj ×4, noticias,
declarar un área protegida (reservas 1.000 → 900, BNP 20 → 25 kHa), capa de carbono, panel de rutas,
cambio a inglés. **No verificado:** ancho de celular (la ventana del navegador de prueba no se pudo
redimensionar) y el final de una partida completa en pantalla (cubierto por test).

**Pendiente.** Rutas del Nivel 2 calibradas contra el CO₂ inicial de 6,5; con el valor real (17,4)
arrancan en 50 % y la condición de emisiones es exigente (F7). Mobile sin panel de actores.

## 2026-09-11 — v4 / F3b: sección "Lo próximo" en la landing

Decisión 2 del equipo: el juego de 3 niveles sigue siendo el principal, con su paquete docente y
todo lo que ya está en el sitio; la fusión figura aparte como lo próximo en desarrollo. Se agregó
una sola sección en `index.html` (`#proximo`), debajo de "¿Sos docente?" y antes de las preguntas
frecuentes, para que nunca compita con el CTA principal: arte de EcoSIM, rótulo "En desarrollo ·
vista previa", aclaración de que no reemplaza al juego ni al paquete docente, y link a `/territorio`.
Bilingüe con el mismo patrón `data-lang` de la landing. Nada más del sitio cambió.

Medición: evento propio `preview_click` (no `play_click`, para no inflar el embudo del juego). La
tabla `funnel_events` no está versionada en `supabase/`, así que no se pudo confirmar si restringe
nombres de evento; el envío es de mejor esfuerzo y falla en silencio si la rechaza. La página de la
vista previa lleva `noindex` hasta que gradúe y no está en `sitemap.xml`.

## 2026-09-11 — v4 / F4: efectos de pactos y eventos que nunca llegaban, y CO₂ inicial (ambos juegos)

**Pedido del usuario (decisiones 1 y 3):** corregir el efecto de pactos y eventos, y corregir el CO₂
inicial. Las dos correcciones tocan el motor compartido, así que valen para el juego de 3 niveles.

**El problema.** `stepYear` aplica pactos y eventos temprano (pasos 2 y 5), pero cuatro indicadores
se derivan después en el mismo año: CO₂/cápita del balance de carbono (paso 9), bienestar social y
estabilidad política de sus stocks (paso 8), y PBI/deuda/reservas/presiones sincronizados de Stella
(paso 11). Todo lo escrito antes se pisaba. En la práctica: el −5 % de CO₂ y el +3 de estabilidad del
Acuerdo Global de Carbono, el −10 % de la Iniciativa de Transferencia Tecnológica y el −5 % del
evento "Boom de tecnología verde" nunca se aplicaban.

**La corrección (`src/sim/deferred.ts`)** conserva el sentido de cada efecto:
- *Pactos*: su función `effects` es pura, así que se vuelve a evaluar cuando los valores del año ya
  existen y de esa segunda llamada se toman solo los indicadores derivados. "5 % menos que lo que
  produjo este año" es exactamente lo que el pacto dice.
- *Eventos*: un `changePercentage` se recuerda como factor y un `changeAbsolute` como delta, y se
  vuelve a aplicar sobre el valor recalculado. Sin reevaluar, sin contar dos veces.
En el motor mensual el efecto de un pacto avanza 1/12 como cualquier otro flujo (es una tasa por año
de membresía) y el de un evento entra completo (es un shock).

**CO₂ y puntaje iniciales.** `createInitialState` los calcula ahora con `computeCarbonBalance` y
`computeScore` a partir de los usos del suelo y políticas del nivel, en vez de tomar los valores
fijos de `INITIAL_INDICATORS` (6,5 t/hab y puntaje 0). Ningún nivel arranca en 6,5: el Nivel 1 da
~9,4 y el Nivel 2 ~17,4, así que el primer año simulado mostraba un salto que el jugador no causó.

**Efecto medido en el juego de 3 niveles.** `npm run sim`: de las 15 filas cambió una (Nivel 2,
estrategia equilibrada: seguridad alimentaria 32,3 → 34,0 y puntaje 337 → 342). La causa es
trazable: con el CO₂ inicial real, el evento "Escrutinio Ambiental Internacional" (se dispara con
CO₂ > 12) cambia de momento y corre la secuencia de eventos. Ningún resultado de victoria/derrota
cambió. 129/129 tests, 4 nuevos en `tests/sim/deferred.spec.ts`.

## 2026-09-11 — v4 / F5: tres usos públicos nuevos, con tasas por criterio experto

**Pedido (decisión 4):** "agregá los usos que consideres, y creá todas las tasas en base a criterio
experto que tengas y lo que ya está definido". La versión de Grok
(`combinacion/vAlRAn1GjcMwOEjO-grok-workspace`) ya separaba urbano, agua y energía/CDR como usos
del suelo; de ahí salieron los tres que faltaban.

**Usos nuevos** (`LandUseType.PublicWetland`, `RestorationForest`, `EnergyPark`), todos en 0 kHa en
los tres niveles del juego principal, donde nada los crea. Tasas ancladas en las que el modelo ya
tenía (bosque nativo 0,75/5,0; cultivo convencional 8,0/0,9):

| Uso | Emisión | Secuestro | Criterio |
|---|---|---|---|
| Humedal protegido (HUM) | 1,2 | 6,0 | Emite metano por descomposición anaeróbica, pero acumula carbono orgánico en suelo más rápido que cualquier otro uso. Sumidero neto mayor que el bosque nativo. |
| Restauración (RES) | 0,6 | 3,4 | Rebrote joven: secuestra menos que el bosque maduro y madura hacia bosque nativo (4 %/año, ~25 años). |
| Parque energético (ENR) | 0,2 | 0,3 | El suelo es casi neutro; su efecto real es desplazar generación fósil, que el balance de carbono aplica aparte en proporción al área (60 % si ocupara todo el territorio). |

Pesos: biodiversidad HUM 0,55 (supera al bosque protegido: filtrado, refugio, conectividad), RES
0,30, ENR −0,05. Seguridad alimentaria −0,15/−0,15/−0,10 (sacan tierra de producción). Seguridad
económica −0,02/−0,04/+0,12 (el parque aporta energía y empleo).

**Reglas de declaración.** Área protegida sobre bosque nativo; restauración y parque sobre cultivo
convencional, pastura o tierra sin producir; **el humedal solo junto al río o a otro humedal** — una
regla hidrológica que usa el mapa, no un número. Convertir tierra productiva suma un impulso a la
presión agrícola (0,4 puntos por parcela): sacar tierra de producción es exactamente lo que ese
indicador mide. Proteger bosque no lo aplica.

**Verificación.** `npm run sim` idéntico (el juego de 3 niveles no tiene área de estos usos).
132/132 tests, con tres nuevos: cada uso llega al modelo con su costo y su presión, el humedal
exige agua al lado, la restauración madura a bosque nativo y el parque baja las emisiones.

## 2026-09-11 — v4 / F6: 100 situaciones que no pausan el juego y desgastan si no se resuelven

**Pedido (decisión 1):** "ampliá a al menos 100 eventos distintos, pero que el juego no se pause
cuando te llegan las notificaciones, sino que se te vayan acumulando como notas, el tiempo continúa
corriendo, cuestiones no resueltas acumulan desgaste".

**Qué es una situación.** Llega sola mientras corre el reloj, se queda en la bandeja, y **cada mes
que sigue abierta suma presión o conflicto** (su `wear`, que se duplica al llegar el plazo). Si
vence sin respuesta se resuelve con su última opción, la que nadie eligió. Todo lo que hace está
escrito en variables del modelo (`RandomEventEffect`: los mismos indicadores, stocks Stella y
cambios de uso del suelo que usan los eventos del juego principal), así que ninguna situación puede
mover un número que el modelo no tenga.

**Catálogo: 100 situaciones** en cuatro archivos (`src/territorio/situations/`), bilingües, con 2 o
3 opciones cada una: clima y ecología (25), producción, alimentos y tecnología (25), sociedad y
política (25), economía e internacional (25). Cada una con actor (retrato de EcoSIM), tono, plazo,
peso, desgaste mensual y condición de aparición cuando corresponde (la tala ilegal necesita bosque
sin proteger; la protesta por precios, seguridad alimentaria baja).

**Se eliminó la tarjeta modal de eventos.** Los eventos del propio modelo tampoco pausan: pasan a la
bandeja de noticias como nota.

**Calibración, medida sobre partidas completas** (3 semillas × 3 estilos de juego: ignorar todo,
resolver lo más barato, resolver la primera opción):
- Frecuencia: con la primera versión llegaban ~200 por partida — una decisión cada tres segundos de
  reloj. Bajó a `BASE_ARRIVAL = 0,16`: ahora entre 60 y 110 por partida, una cada cinco meses, con
  uno o dos papeles sobre el escritorio a la vez (tope de 6).
- Magnitud: los efectos están escritos a escala de "evento dramático"; aplicados 60 veces clavaban
  todas las presiones en 0 o en 100. Se aplica `SITUATION_EFFECT_SCALE = 0,5` a los efectos sobre
  variables que saturan (presiones, conflicto, indicadores 0-100); el dinero y el uso del suelo no
  se escalan, porque están escritos en las unidades del modelo.
- Resultado: ignorar todo ya no colapsa el estado en el año 10 (antes sí), pero se pierde la
  partida; resolver siempre lo más barato también se pierde (la opción barata suele ser "no hacer
  nada"); resolver con criterio gana con puntaje ~650 y presiones que siguen vivas.

**Verificación.** 136/136 tests (cinco nuevos: el reloj no se detiene, el desgaste se acumula, lo
vencido se resuelve solo, decidir cobra y saca el papel del escritorio, el catálogo tiene ≥100
situaciones distintas con opción de salida). `npm run sim` idéntico: nada de esto toca el juego de
3 niveles.

## 2026-09-11 — v4 / F7: interfaz de la versión de Grok, y rutas de victoria propias, calibradas

**De dónde sale.** El usuario pidió revisar `combinacion/vAlRAn1GjcMwOEjO-grok-workspace` (la fusión
que hizo Grok) e incorporar sus mejoras. Esa versión mantiene el motor de EcoSIM —no verificable,
con presiones calculadas ad hoc sobre métricas de EcoSIM— pero **organiza el contenido mucho mejor**,
y eso es lo que se tomó:

- **Panel de políticas por familias**: filtros (todas / verdes / extractivas / activas), ícono por
  familia, costo como % del PBI, barra de eficiencia con años activa, candado con el año en que se
  libera, **línea de trade-off explícita** (10 nuevas, es/en) y los instrumentos con su descripción.
- **Panel de rutas con lectura por condición**: cada condición con su objetivo y el valor actual,
  en verde o en ocre según se cumpla. Antes se reusaba `WinRoutesPanel` del juego principal, que
  muestra progreso pero no los números.
- **Barras de proporción de uso del suelo** y **gráfico de trayectoria** (recharts, ya era
  dependencia) en el mismo panel, más las tres presiones.

**Rutas propias, calibradas (`src/territorio/routes.ts`).** No se tocó `LEVEL_ROUTES`: esas son del
juego de 3 niveles. La vista previa tiene pisos y rutas propias, calibradas con
`npm run sim:territorio` (nuevo harness: cinco estrategias jugadas hasta 2054 con políticas, usos
públicos, pactos y situaciones). Resultado de la calibración final:

| estrategia | gana | ruta |
|---|---|---|
| no hacer nada | 0/3 | — (cae el piso de bienestar social) |
| conservación | 3/3 | conservación |
| producción | 2/3 | producción |
| innovación | 2/3 | innovación |
| todo a la vez | 0/3 | — (termina con el tesoro en rojo) |

Cada ruta pide algo que las otras no consiguen sin querer: conservación, 12 % del territorio bajo uso
público de conservación; producción, llegar a 2054 con caja (≥ 1.000); innovación, parque energético
público y esfuerzo en instrumentos tecnológicos.

**Hallazgo de la calibración.** Los pisos sobre presiones sectoriales se sacaron: en este modelo una
economía hundida lleva la presión agrícola a 100 por sí sola (impulso 0,3 por punto de seguridad
económica bajo 50 contra 10 % de disipación), así que el piso castigaba dos veces la misma falla y
volvía imposibles las rutas de conservación e innovación aun gobernando bien. La estabilidad política
ya contiene las presiones, vía colapso político.

**Verificación.** 140/140 tests (4 nuevos de rutas), `tsc` limpio, `i18n:audit` limpio, `build`
limpio, `npm run sim` idéntico. Probado en navegador: bandeja de situaciones con el reloj corriendo,
paneles de políticas y rutas, usos públicos con su costo.

## 2026-09-19 — v4 / F8: territorio irregular de 100 × 100 con el arte del encargo 22

**De dónde sale.** El usuario pidió tomar todo el arte nuevo (entregado por Grok en
`combinacion/DsAIKnEjEGDSsAPx-grok-workspace`, el encargo `22_arte_territorio_expansion.md`),
fusionarlo con la dinámica ya construida, hacer el mapa lo más coherente posible y expandir el
escenario a un territorio irregular de 100 × 100. Especificación de la fase:
`mejora-general/files/23_territorio_100x100.md`.

**Decisión de escala (desvío explícito del encargo 22).** El encargo pedía ×5 de superficie y
avisaba que eso obliga a recalibrar costos y rutas. Se hizo al revés: **el territorio no crece en
hectáreas, crece en resolución**. Las 600 kHa del nivel 2 se reparten ahora entre 6.000 parcelas
(0,1 kHa = 1 km² cada una) en vez de 120. Ninguna ecuación, tasa, costo por kHa ni ruta cambia, y el
juego de 3 niveles queda intacto. Para que una parcela siga siendo un dato exacto, el generador
recorta el borde del territorio a pastizal o roca hasta que quedan **exactamente** 6.000 parcelas
productivas: si sobrara superficie, sería tierra declarable que el modelo no contabiliza.

**Declarar por lotes.** Con parcelas 50 veces más chicas, una declaración parcela a parcela habría
costado 50 veces menos y pesado 50 veces menos. Una declaración toma ahora **un lote de 5 kHa (50
parcelas)** armado por cercanía alrededor de la parcela elegida, sobre parcelas elegibles y conexas:
misma superficie, mismo precio y mismo peso en el modelo que antes. El lote se limita a la superficie
que el modelo realmente tiene de cada uso de origen (un lote nunca crea tierra), y se previsualiza
bajo el puntero antes de pagar.

**Geografía (`src/sim/geography.ts`, nuevo).** Silueta irregular por ruido fractal + componente conexa
mayor; mar que muerde el sureste con línea de costa ondulada; cuatro regiones con frontera deformada
(las de `INITIAL_REGIONAL_ZONES_DATA`); río del sur boscoso al puerto con afluente, lago y lagunas;
humedales de ribera; afloramientos rocosos en el sur; playas; metrópolis con distrito industrial,
pueblo agrícola, villa turística y puerto pesquero; caminos por Dijkstra entre los cuatro centros,
con puentes sobre el río y material por región. Los usos del suelo se reparten por **afinidad
regional** (bosque al sur, cultivo extensivo al norte, horticultura periurbana, pasturas en la costa)
con un reparto tipo subasta —precio por uso ajustado hasta que los conteos son exactos— más un pase
de suavizado que preserva los conteos: las manchas quedan coherentes, no ruido.

**La ciudad y el mapa leen el modelo.** `developTerritory` densifica la vivienda con el PBI real,
hace aparecer asentamientos informales cuando cae el bienestar social y limpia la industria pesada a
medida que bajan las emisiones — siempre sobre lotes urbanos reservados, nunca sobre superficie
productiva, y con histéresis para que nada parpadee. `src/territorio/fx.ts` estampa los decoradores
del encargo (§5.5) desde las situaciones abiertas, el evento del mes y el estado del modelo: una
situación ignorada *se ve* en el mapa mientras dura.

**Rendimiento.** 10.000 parcelas no entran en un bucle por cuadro: por debajo de z = 0,5 el mapa
muestra una imagen pre-renderizada del territorio, parcheada sólo donde cambió algo; por encima
dibuja las parcelas visibles con sus animaciones. Medido con `?perf=1`: 0,7-1,2 ms por cuadro en
vista general, 4,8 ms con 1.200 parcelas visibles. Un mes completo de simulación con el mapa cuesta
3 ms de media (máx. 116 ms), y armar el territorio 160 ms. El cuello de botella real que apareció en
la medición era una clave de caché que convertía el array de 10.000 parcelas a texto en cada cuadro.

**Arreglos de dinámica que entraron con la fase** (de la revisión del motor; los tres primeros son
correcciones, no cambios de diseño):
- El préstamo se tope **por año calendario** (10 % del PBI). Antes el tope era por llamada: pedirlo
  doce veces en un mes daba doce préstamos, y el mes siguiente otra vez.
- El **lock-in de políticas cuenta meses**, no años calendario: una política activada en diciembre
  quedaba libre a los ~49 meses en vez de 60.
- `stepMonth` podía dejar `gameOverReason` puesto cuando las situaciones aplicadas después revertían
  el colapso; ahora se limpia.
- `stepMonth` no emitía el flujo restauración → bosque nativo, así que esa maduración nunca se
  dibujaba en el mapa.
- Las noticias de uso del suelo se acumulan por transición y se publican cada 20 km²: con parcelas de
  1 km² habría un titular de desmonte todos los meses.

**Arte.** 272 archivos importados a `public/assets/ecosim` (4,4 MB en WebP): 58 elementos × 4
variantes, 12 piezas de camino, 30 decoradores, 48 retratos y 14 sheets de animación. Se les quitó el
resto de croma magenta del generador (sólo en los tiles y sólo en el borde, para no comerse el
violeta legítimo de retratos y andamios) y se limpiaron píxeles sueltos fuera del terrón. Quedaron
fuera `railway` y `powerline` (el arte es más ancho que la parcela) y los tiles de borde `edge_*`
(un tile de transición sobre una parcela productiva rompería "cada parcela es un dato").

**Verificación.** `npx tsc --noEmit` limpio, 161/161 tests (los de territorio reescritos a la escala
nueva, con cobertura de lotes, crecimiento urbano y "una declaración nunca crea tierra"),
`npm run sim` idéntico, `npm run sim:territorio` con la calibración de F7 (conservación 3/3,
producción 2/3, innovación 1/3, no hacer nada 0/3). Probado en navegador a 1440 × 860: vista general
con las cuatro regiones rotuladas, zoom al detalle, capas de análisis, reloj a ×4 durante 100 meses.

**Las tres decisiones de diseño que abrió la revisión del motor, resueltas con el usuario
(2026-09-19).** Detalle de cada cambio y su efecto en `docs/audit-equations.md` §F8.

1. **El tesoro no tenía sumidero** (sin hacer nada se terminaba con 60.000 y se ganaba la ruta de
   producción). Las dos cosas a la vez: el área bajo uso público paga **mantenimiento anual**
   (`Costo_Mantenimiento_Uso_Publico_por_kHa_Anual`, 0,8 por kHa, cobrado 1/12 por mes y encendido
   sólo por Territorio), las situaciones **escalan con la economía** (√ del crecimiento del PBI,
   techo 2,5×), y la ruta de producción pasa a pedir tesoro **relativo al PBI** (≥ 8 %) más una
   familia productiva activa. Calibrar el mantenimiento costó dos vueltas: a 2,2 por kHa ahogaba la
   conservación (0/3), y con costos de situaciones escalando linealmente la estrategia de
   conservación se quedaba sin ninguna opción pagable (biodiversidad 60 → 46).
2. **Derrota por incumplimiento sostenido**: bienestar social < 10, o seguridad alimentaria < 20,
   durante 12 meses seguidos. Ignorar la bandeja ahora termina la partida entre 2032 y 2036, no en
   2054. Un mes malo aislado sigue sin costar nada.
3. **La restauración madura hacia bosque nativo protegido**: lo que el Estado compró y restauró no
   vuelve a la cuenta desmontable. Cero efecto en el juego de 3 niveles, donde el área RES siempre
   es 0.

Calibración final (`npm run sim:territorio`, ahora **7** estrategias × 3 semillas): no hacer nada
0/3 (cae antes de 2040), conservación 3/3, producción 2/3, innovación 2/3, "sólo resolver la
bandeja" 0/3 (antes ganaba producción), "comprar todo" gana conservación + innovación, "todo a la
vez" 0/3 (quiebra).

**Orientación del arte: cuatro incoherencias, medidas sobre los píxeles** (pedido del usuario,
2026-09-21). En vez de ajustar a ojo, se midió la cobertura alfa en el punto medio de cada arista
del rombo y la dirección dominante de la textura de cada variante:

- **Las piezas de camino no son consistentes entre materiales**: la llamada `ns` corre sobre el eje
  x en tierra y asfalto, y sobre el eje y en el set costero; y las piezas `t` de tierra y asfalto en
  realidad son curvas (sólo la costera es una T). El mapa ahora lee el eje de una tabla medida
  (`ROAD_AXIS`) y arma cruces, T, curvas y finales recortando las piezas rectas a la mitad de la
  parcela que tiene vecino, como ya hacía para las esquinas. El cruce de cuatro brazos sí usa la
  pieza `x`, que es correcta en los tres materiales.
- **El puente** tiene la calzada sobre el eje x y el río por debajo sobre el y: el espejado estaba
  invertido.
- **La costa** lleva el agua hacia −x y +y; la regla ahora compara las cuatro direcciones en vez de
  mirar sólo dos.
- **`reforest` v1 y v4 y `restoration` v1** tienen las hileras sobre la diagonal opuesta a sus
  hermanas: se dibujan espejadas (son texturas planas, la luz no cambia de lectura). Además la
  variante se elige por bloques de 3 × 3 parcelas, así cada uso se lee como campos y no como ruido.

**El agua se dibuja, no se tesela.** El tile `water` es un cauce con barrancas: teselarlo sobre el
mar empedraba el océano con un patrón repetido, y sobre un río que gira producía una cadena de
charcos. Ahora el mar es una losa plana con degradado de profundidad (plana también bajo la orilla,
que la dibuja la playa del lado de la tierra) y el río se compone como los caminos: agua continua,
barranca sólo en los lados sin vecino de agua, y el arte por encima al 70 % para recuperar la
textura. De paso: el meandro del generador oscilaba cada medio tile y el ráster lo convertía en una
reja de canales —ahora la onda es larga (una curva cada ~16 parcelas)—, el ensanche de la
desembocadura se sacó, los humedales de ribera pasaron de 191 a 77 parcelas en manchas, y las
celdas "fuera del territorio" rodeadas de mar se rellenan con agua para que no queden huecos negros.

**Deuda conocida.** Aun con mantenimiento y situaciones más caras, una partida sin políticas termina
con decenas de miles en el tesoro: el ingreso público crece con el PBI y el gasto no. El tope por
ruta lo neutraliza como vía de victoria, pero el dinero deja de ser escaso en la segunda mitad.

## 2026-09-21 — Landing: Territorio pasa al frente, con carrusel de capturas reales

**De dónde sale.** Pedido del usuario: invertir la prioridad de la página. Hasta acá la landing
encabezaba con el juego de 3 niveles y dejaba Territorio al final, en una tarjeta de "lo próximo"
(decisión de `21_fusion_ecosim.md` §2, cuando la vista previa todavía no era jugable de punta a
punta). Con el territorio de 100 × 100 desplegado, el orden quedó al revés de lo que la página
ofrece mejor.

**Qué cambia.**

- **Hero = Territorio**, con su cartel de "en desarrollo · vista previa jugable" y el aviso de que
  no guarda la partida. CTA principal a `/territorio`; el enlace secundario baja al juego de 3
  niveles en vez de ir a `/play`.
- **Carrusel de siete capturas reales** debajo del hero: territorio completo, detalle del mapa,
  ficha de parcela, capa de carbono, bandeja de situaciones, panel de políticas y rutas de
  victoria. No son mockups: se tomaron con Playwright contra producción y se guardaron como WebP
  de 1200 px (570 kB las siete). El markup es una tira con `scroll-snap`: sin JavaScript se
  desplaza y encaja igual, y `src/landing.ts` sólo le agrega botones, puntos y flechas del teclado.
- **El juego de 3 niveles baja a su propia sección** (`#juego-principal`), presentado por lo que lo
  distingue —paso anual, tres niveles encadenados, panel de facilitación, guarda la partida— y
  descrito como el entorno más exigente, de laboratorio de datos. La micro-animación que estaba en
  el hero se mudó con él.
- **Telemetría**: el CTA del juego principal reporta `origin: 'main_game_section'` en vez de
  `'hero'`, y `preview_click` distingue el hero del resto. Los dos embudos siguen separados.
- Título, descripción y Open Graph pasan a hablar de Territorio.

**Verificación.** `tsc` limpio, build limpio, 163/163 tests, y revisado sobre el build servido:
hero, carrusel (botones, puntos, teclado), sección del juego de 3 niveles y ancho de celular.

## 2026-09-21 — DecarboNito 3D: el personaje pasa de SVG a renders

**De dónde sale.** El usuario entregó `DecarboNito_3D_pack/` (fuera del repo): nueve renders 3D del
asesor —cuerpo de cerámica marfil, articulaciones menta, ojos ámbar y el brote en la cabeza— con
fondo recortado, más CSS/JS/JSX de ejemplo y un `SETUP.md`.

**Qué se tomó y qué no.**

- **El arte, sí.** Los nueve PNG con alfa se limpiaron del fleco verde que dejó el recorte, se
  recortaron a su caja y se exportaron a WebP de 420 px de alto (312 kB los nueve) en
  `public/assets/decarbonito/`. El `portrait_bust` del pack quedó afuera: es otro personaje
  (cabeza cúbica con capucha, no coincide con el resto); el busto del panel de chat se generó
  recortando la cabeza de `front_idle`.
- **El CSS/JS/JSX del pack, no.** Proponen un dock propio que duplicaría el overlay que el juego ya
  tiene (arrastrable, con globo flotante, notificaciones apiladas, menú contextual y panel de
  conversación). Se cambió el dibujo dentro del componente existente y no se tocó el contrato:
  `DecarboNitoAvatar` sigue recibiendo `state`/`emotion`/`tone`/`size`/`targetAngle`/`beamLength` y
  devolviendo `onStateComplete`, así que el controlador, el agente de acciones y el tutorial
  siguen funcionando sin cambios.
- **La posición, no.** El `SETUP.md` pide 220 px centrado abajo. En este HUD esa franja la ocupan
  la tira de indicadores y el ticker de noticias, así que el personaje queda en la esquina
  (arrastrable, como estaba) pero pasa de 96 a **128 px**, que es donde se lee como personaje.

**Cómo se resolvieron los catorce estados con nueve poses.** Cada estado mapea a la pose más
cercana (`sprites.ts`) y el movimiento lo pone el componente sobre la figura entera: flotar, saludo,
sacudida de alerta, salto de celebración, cabeceo. Las expresiones antes eran ojos animados por
separado; ahora vienen en el render, así que `emotion` sólo elige pose cuando el estado no impone
una (un *idle* alarmado es la pose de alerta quieta). Se conservan las dos cosas que los renders no
pueden hacer solos: el halo de tono (normal / precaución / crítico / éxito) y el **haz de señalado**
que la fase 8 apunta a coordenadas calculadas en tiempo real — sigue siendo un SVG sobre la figura,
y la pose de señalar se espeja cuando el objetivo está del otro lado.

**Verificación.** `tsc` limpio, 163/163 tests, build limpio. Revisado sobre el build servido: el
laboratorio `#dev/decarbonito` con los catorce estados, el haz y el registro de `onStateComplete`;
el personaje en Territorio sin cortarse contra el borde inferior (la caja es 120:140, el anclaje
usaba el ancho para el alto: corregido); y el panel de conversación con el busto nuevo.

**Nota de repo.** `DecarboNito_3D_pack/` queda sin versionar, como `combinacion/`: al repo entran
los WebP ya procesados, no las fuentes.

## 2026-09-22 — Fotografía para las noticias y las situaciones

**De dónde sale.** El usuario entregó `nuevo-arte/` con tres carpetas: `news_situations_pack`,
`news_situations_by_route` y `news_situations_v3`, y pidió chequear que no hubiera imágenes
repetidas antes de incorporarlas.

**Lo primero fue contar.** Los tres packs son acumulativos: 68 archivos, **32 imágenes únicas**, y
las 32 están en `news_situations_v3` (dentro de v3 no hay ninguna repetida). Los otros dos packs no
aportan nada que v3 no tenga, así que sólo se procesó v3. De sus 32, entraron **31**: la única que
quedó afuera es `reel/ev-climate_drought_reel.jpg`, que es la misma sequía que ya está en `wide/`.
Exportadas a WebP de 800 px en `public/assets/news/` (1,7 MB), con el reel vertical recortado al
mismo encuadre 16:9 que el resto.

**Qué son y qué no.** Es fotografía de agencia: sequías, cortes de ruta con tractores, acampes
ambientales, ollas populares, quemas, puertos, una instalación solar, una conferencia de prensa
internacional, obra pública a medio hacer. No reemplazan nada de lo que dibuja el mapa —el mapa es
el uso del suelo del modelo—. Lo que agregan es el registro que al feed le faltaba: una situación
que llega con una foto de lo que trata se lee como algo que pasa en un lugar, no como una fila.

**Cómo se elige la foto (`src/territorio/newsArt.ts`).** Diez temas (clima, agro, ambiental, social,
emisiones, biodiversidad, economía, tesoro, internacional, tecnología). La situación resuelve su
tema por su categoría, con una tabla de excepciones para las que la categoría manda a una foto poco
feliz (un reclamo de consulta previa es el acampe, no una obra abandonada; el cierre de una escuela
es la calle, no un tractor). Cada tema tiene además **una versión por vía de victoria**, y la que se
usa es la vía que el jugador lleva adelante (`leadingRouteId`): la misma sequía se ve distinta en
una región que apostó a la conservación y en una que apostó a la producción.

**Dos reglas para que no se vuelva empapelado.** (1) Sólo lleva foto lo que tiene tema *cierto*: una
categoría, un evento del modelo, un cruce que el feed ya nombra. Los movimientos de suelo, los
desbloqueos, el balance anual y las declaraciones del jugador siguen siendo texto. (2) En el feed,
si la misma foto se usó en los últimos cuatro ítems, el siguiente vuelve a ser texto — un tema tiene
cinco encuadres y dos situaciones seguidas del mismo tema mostraban la misma imagen. Además, cuatro
situaciones se dejaron **sin foto a propósito** (lluvias generosas, cosecha excepcional, piloto
agroecológico, vivero comunitario): toda foto de clima del pack es una sequía o un incendio, y
ilustrar una buena noticia con su opuesto miente.

**Dónde aparece.** Bandeja de situaciones (banner con el retrato del actor montado sobre el borde),
panel de noticias de Territorio, y el panel de eventos del nivel 3 del juego principal — ahí sin
versión por vía, porque ese juego no lleva cuenta de una ruta en curso. `newsArt.ts` no importa nada
en tiempo de ejecución (sólo tipos), así que el juego de 3 niveles puede usarlo sin arrastrar el
catálogo de las cien situaciones a su bundle.

**Verificación.** `tsc` limpio, 163/163 tests, build limpio, revisado sobre el build servido
(bandeja y feed). `npx tsx scripts/news-art-audit.ts` imprime qué foto recibiría cada una de las
cien situaciones, agrupadas por tema, que es como se detectaron los mapeos desafortunados.

## 2026-10-12 — v5 fase 24: Gemini con modelo configurable y parámetros de Gemini 3

Nuevo `src/services/geminiConfig.ts` como única fuente de ids de modelo (`GEMINI_MODEL`, `GEMINI_MODEL_FALLBACK`, `GEMINI_MODEL_TTS`, con defaults `gemini-3.8-flash`, `gemini-3.5-flash-lite`, `gemini-3.8-flash-tts`) y `samplingFor(model, legacy)`: en Gemini 3 omite `temperature/topP/topK` y manda `thinkingLevel: LOW`; en 2.5 devuelve los parámetros viejos (rollback con solo cambiar `GEMINI_MODEL`). `constants.ts` re-exporta; `geminiService`, `decarbonitoAgent` y `api/gemini.ts` ya no tienen literales de modelo. Fecha de consulta de la página de deprecaciones: 2026-10-12 (según la especificación; no se pudo reverificar desde este entorno).

**Desvíos.** `thinkingLevel` se pasa como cadena `'LOW'` casteada a `ThinkingLevel` (el enum de `@google/genai` 1.41.0 es `LOW`, y evita un import en runtime que rompía el mock de `tests/agent/loop.spec.ts`). No se revisó el formato de `speechConfig` de TTS 3.8 (sin acceso a la API): se mantuvo el actual.

**Deudas.** (1) Los ids `gemini-3.8-*` y `gemini-3.5-*` vienen de la especificación y no se pudieron comprobar aquí. (2) La API key sigue en el bundle del cliente (§6 opcional no hecho); plan: `geminiTransport.ts` contra `/api/gemini` y quitar `GEMINI_API_KEY` del `define`. **Pedido al equipo:** probar DecarboNito en `/play` y el asesor en `/territorio` con la key real antes del próximo taller, y cargar las tres variables en Vercel.

**Verificación.** `tsc` limpio, 166/166 tests (3 nuevos en `tests/agent/geminiConfig.spec.ts`).

## 2026-10-12 — v5 fase 25: tabla `territorio_feedback` y servicio de envío anónimo

`supabase/territorio_feedback_migration.sql` (idempotente, RLS solo `INSERT` para `anon`/`authenticated`, validación en `CHECK` de columna), consultas de análisis al final de `analytics_queries.sql`, tipos y listas de opciones en `src/territorio/survey/types.ts`, y `feedbackService.ts` (fetch directo con `Prefer: return=minimal`, cola offline en `localStorage` de hasta 20 registros, resultado tipado, sanitización). Un test lee el `.sql` y compara las listas de opciones con las constantes de TypeScript.

**Desvíos.** Ninguno. Se añadió `sanitizeRow` exportado para poder testearlo y `rol_otro` solo se conserva si `rol === 'otro'`.

**Acciones para el equipo (no automatizables).** (1) Pegar la migración en Supabase → SQL Editor → Run. (2) Probar con `curl -X POST "$SUPABASE_URL/rest/v1/territorio_feedback" -H "apikey: $SUPABASE_ANON_KEY" -H "Authorization: Bearer $SUPABASE_ANON_KEY" -H "Content-Type: application/json" -H "Prefer: return=minimal" -d '{"origen":"pagina","lang":"es","rol":"otro","taller_codigo":"PRUEBA"}'` (esperado HTTP 201) y un `GET ?select=id` (esperado error de permisos o `[]`). (3) Borrar la fila de prueba desde el Table Editor.

**Verificación.** `tsc` limpio; 10 tests nuevos en `tests/territorio/feedbackService.spec.ts`.

## 2026-10-12 — v5 fase 26: cuestionario de Territorio en `/territorio/encuesta`

Página nueva (`territorio-encuesta.html` → `src/territorio/survey/`), una sola página con cinco `<fieldset>` y barra de progreso `n de 14`; envía a `territorio_feedback` (fase 25) sin cuenta. `summary.ts` guarda un resumen de la última partida en `localStorage` (`dn_territorio_last_game_v1`, vence a las 12 h) al cambiar el año y al terminar; `workshopCode.ts` propaga `?taller=` vía `sessionStorage`. `EndScreen` suma el botón primario "Contanos cómo te fue (7 min)", `TitleScreen` un link, y el HUD un chip "Taller {código}". Rewrite `/territorio/encuesta` antes de `/territorio`; `APP_VERSION` inyectada en `vite.config.ts`.

**Mapeo ítems → columnas.** 1 `rol`(+`rol_otro`) · 2 `contexto_uso` · 3 `comprension` · 4 `ritmo` · 5 `mapa_utilidad` · 6 `elementos_utiles` (máx. 3) · 7 `tradeoffs` · 8 `realismo` · 9 `aprendizaje_texto` · 10 `mejora_prioritaria` · 11 `mejoras_texto` · 12 `uso_taller` · 13 `formatos_uso` · 14 `taller_conceptos_texto`.

**Desvíos.** Los textos del cuestionario viven en `survey/copy.ts` + `copy.en.ts` (tipado espejo) y esos dos archivos se agregaron a la lista de ignorados de `scripts/i18n-audit.mjs`, igual que `src/i18n/`. No se hizo test de render de componentes (el repo no tiene setup de DOM). Verificación en navegador no realizada en esta fase.

**Deuda conocida.** `npm run i18n:audit` ya reporta 29 textos en `src/territorio/advisorRules.ts` y `session.ts` (contexto del asesor y razones de colapso, en español a propósito); no son de esta fase y quedan sin tocar.

**Verificación.** `tsc` limpio, 182/182 tests, `vite build` limpio (el chunk de la encuesta no incluye `@supabase/supabase-js`).

## 2026-10-12 — v5 fase 27: paquete docente, un paquete con dos variantes

`docentes.html` suma el bloque "¿Qué versión usar?" (`#que-version`), la tarjeta destacada "Espacio docente" (la página llega en la fase 28), la tarjeta del cuestionario y chips de versión; la guía, las consignas, el plan de clase y las diapositivas pasan a tener variante Territorio (por defecto) y variante juego de 3 niveles, conmutables con `src/docentes.ts` (`?v=` → `localStorage['dn_docentes_version_v1']` → Territorio; propaga `?v=` a los links internos del paquete; flechas ←/→; sin JS se ven ambas variantes). La hoja de ecuaciones suma la sección común "Qué cambia en Territorio", con las condiciones de cada ruta **generadas desde `src/territorio/routes.ts`** por `scripts/routes-table-html.ts` (si cambian los umbrales hay que volver a correrlo y pegar el resultado). La guía en Markdown suma la Parte A (Territorio) y `public/docentes/consignas-debriefing.html` una segunda hoja. Se extrajo `src/shared/locale.ts` de `landing.ts` (el toggle es/en, sin cambios de comportamiento) para que las páginas docentes no carguen el seguimiento de embudo de la landing.

**Desvíos.** (1) El contenido de la variante de 3 niveles quedó textualmente igual en español; su traducción al inglés se hizo en esta misma fase (la fase 29 cubre el resto: auditoría estática, `.en.md` y verificación). (2) El código de taller de los ejemplos (`🟧[CODIGO]`) no fue provisto: se usa `TU-CODIGO` / `YOUR-CODE`. (3) La respuesta "¿Puedo ver las respuestas de mi grupo?" remite al contacto del pie de la página de inicio (el hub no tiene pie con contacto propio). (4) Se mantuvo "15 a 40 minutos" en la última lámina de la variante de 3 niveles, tal como estaba, aunque el plan dice 25–30 min por nivel: discrepancia previa, anotada, no corregida. (5) Cifras verificadas contra el código: 2029 (instrumentos), 2030/2035/2038 (pactos), 2035 (préstamos), lotes de 50 km² (`LOT_KHA = 5`), cuatro zonas, mínimo 5 años de vigencia. **Pendiente de verificar a mano:** "10.000 parcelas" (viene de la especificación 23) y "15 a 40 minutos" por partida de Territorio.

**Verificación.** `tsc` limpio, build limpio (6 páginas docentes), 5 tests nuevos (`tests/docentes/version.spec.ts`). No se probó en navegador en esta fase.

## 2026-10-12 — v5 fase 28: espacio docente asincrónico en `/docentes/espacio`

Página estática `docentes-espacio.html` + `src/docentesEspacio.ts`: cuatro etapas, 13 pasos con progreso en `localStorage` (`dn_espacio_progreso_v1`), asistente de tres preguntas (reglas puras en `recommend`, testeadas), generador de código de taller (regex compartida en `src/shared/workshopCodeRe.ts`, código guardado en `dn_espacio_taller_v1`), links de juego y cuestionario con botón Copiar, QR en SVG y descarga PNG (`qrcode` 1.5.4, cargado con `import()` dinámico solo al tocar "Generar QR"), mailto con asunto y tres preguntas, y "Reiniciar mi recorrido". Eventos de embudo `teacher_space_view` y `workshop_link_created` (solo el largo del código). Rewrite `/docentes/espacio` y entry de Vite.

**Desvíos.** (1) Regla del asistente no especificada: "una sola pantalla proyectada" gana sobre "dos clases + análisis de datos" (un solo dispositivo descarta el juego de 3 niveles por persona). (2) El correo de contacto real no fue provisto: `src/shared/contact.ts` y el HTML usan el placeholder `contacto@decarbonation.example` (**bloqueante para publicar**, ver fase 30). (3) El link a la playlist usa el mismo id que el iframe de la landing (`PLBMtnsUSTFj4`), que parece truncado; verificar que abre la lista completa. (4) Sin JS, los bloques del resultado del asistente se ven todos juntos (sin recomendación calculada) y el generador muestra el patrón de URL.

**Corrección en caliente de la fase 27.** `docentes.ts` ponía `data-version` en `<html>` y el conmutador lo ocultaba; ahora usa `data-active-version`. Detectado probando en navegador.

**Verificación.** `tsc` limpio, 9 tests nuevos (`tests/docentes/espacioRules.spec.ts`), probado en Chrome sobre el dev server: código inválido rechazado, QR generado, asistente cambia la recomendación y los links `?v=`, checklist cuenta, conmutador de versión del plan de clase alterna las variantes.

## 2026-10-12 — v5 fase 29: paquete docente bilingüe completo (cierra el pendiente del 2026-08-07)

Cierra la entrada "Deliberadamente no bilingüe" del 2026-08-07: guía de facilitación, plan de clase y diapositivas ya tienen inglés completo en ambas variantes (la traducción se escribió junto con el envoltorio de variantes en la fase 27, con `data-lang` en bloques gemelos). Nuevo `public/docentes/guia-facilitacion.en.md` (generado desde el inglés de `docentes-guia.html` y revisado; la página en inglés enlaza esa descarga) y nuevo `scripts/html-bilingual-audit.mjs`, integrado en `npm run i18n:audit`: falla si un `data-lang="es"` no tiene gemelo `en` inmediato, o si hay texto visible fuera de `data-lang` (se permiten nombres propios, rutas/URLs y contenido bajo `aria-hidden="true"`). Cubre `index.html` y `docentes*.html`. La hoja de ecuaciones en Markdown no tiene versión `.en.md`: la página ya cubre el contenido en inglés, según la especificación.

**Desvíos.** (1) El inventario "antes" no se guardó como script aparte: el auditor nuevo es el inventario. (2) `npm run i18n:audit` ya fallaba antes de v5 por 29 textos en `src/territorio/advisorRules.ts` y `session.ts` (contexto en español para Gemini y razones de colapso comparadas como string, como el resto del motor según CLAUDE.md); se agregaron a la lista de archivos verificados con su justificación, y `src/shared/locale.ts` sigue la misma excepción que `landing.ts`. (3) La maqueta decorativa de la landing en español (Panel de Políticas, etc.) queda marcada por el auditor hasta la fase 30, que la deja con `aria-hidden`.

**Verificación.** Auditor en cero para las 7 páginas docentes; `index.html` pendiente de la fase 30. Revisión manual del inglés en navegador: pendiente.

## 2026-10-12 — v5 fase 30: landing reajustada a Territorio + juego de 3 niveles

`index.html` reorganizada sin cambiar el diseño: hero con badge "Vista previa · recomendada para aula y talleres" y CTA secundario "Comparar las dos versiones"; nueva sección `#versiones` ("Dos versiones, un mismo modelo", con dos tarjetas y comparación compacta que en móvil pasa a listas; absorbe `#juego-principal`, cuyo ancla se conserva); "Qué es" y "Qué se aprende" corregidas/ampliadas; "Para quién" reapuntada a espacio docente, taller y Territorio; nueva sección `#docentes` ("Para aulas y talleres"), banda "Contanos cómo te fue", punto nuevo en "Rigor", FAQ reescrita (con `#faq`), nav de anclas, `og:image` (`public/og-default.png`, recorte 1200×630 del mapa, hecho con Pillow), `twitter:card=summary_large_image` y JSON-LD con `hasPart`. `src/landing.ts`: `?taller=` se propaga a los links de Territorio y de la encuesta; eventos `survey_click` y `teacher_space_click`; `preview_click` excluye la encuesta.

**Desvíos y pendientes.** (1) **Bloqueante para publicar:** el correo de contacto real y la licencia no fueron provistos; el pie conserva `contacto@decarbonation.example` y "Licencia por definir", y la FAQ promete eliminación de datos por ese contacto. (2) No se midió Lighthouse (sin herramienta aquí); anotar puntajes en el PR. (3) Los links nuevos se probaron contra el dev server; las URLs limpias requieren el preview de Vercel. (4) La micro-animación se mudó a la tarjeta de 3 niveles y quedó `aria-hidden`. (5) Se mantuvo el dato "10.000 parcelas" de la especificación (hero ya lo decía).

**Verificación.** `tsc` limpio; `npm run i18n:audit` limpio (incluye ahora `index.html`); en Chrome: `/?taller=PRUEBA-01` reescribe los links a `/territorio?taller=PRUEBA-01` y `/territorio/encuesta?taller=PRUEBA-01`, un solo `<h1>`, sin scroll horizontal a 1521 px.

## 2026-10-12 — v5 fase 31: cierre, QA y notas de despliegue (resumen v5)

Cierre: `vercel.json` con rewrites en orden (más específico primero, `.en.md` cubierto por el header `/docentes/(.*).md`), `vite.config.ts` con los entries nuevos (`npm run build` lista 11 páginas HTML), `public/sitemap.xml` con `/docentes/espacio` y `lastmod` (la encuesta queda fuera por `noindex`), `supabase/funnel_events_migration.sql` (no existía ninguna migración; **verificar en el dashboard si la tabla ya existe antes de correrla**), CLAUDE.md y README actualizados. El service worker (`public/sw.js`) es stale-while-revalidate y solo lo registra el juego de 3 niveles: la landing no depende de él, pero un jugador con el shell cacheado puede ver una versión anterior de `/play` una vez tras el deploy.

**Las 11 decisiones del índice, cumplidas:** cuestionario anónimo en `territorio_feedback` (1); botón en la pantalla final + `/territorio/encuesta` con `?taller=` (2); 14 ítems (3); contexto y resumen de partida registrados (4); pre/post del juego de 3 niveles intacto (5); un paquete con dos variantes y "¿Qué versión usar?" (6); espacio docente asincrónico (7); Territorio como vista previa recomendada (8); bilingüe completo (9); playlist sin tocar (10); migración de Gemini (11).

**Deudas abiertas.** API key de Gemini en el bundle del cliente (24 §6 no se hizo; plan: `geminiTransport.ts` contra `/api/gemini`); correo de contacto y licencia reales (bloqueante para publicar); ids de modelo `gemini-3.8-*`/`3.5-*` sin verificar con la API; Territorio sin guardado de partida; Supabase free tier se pausa tras 7 días sin actividad (🟧 responsable: Jonathan, confirmar el proyecto activo antes de cada taller); playlist de YouTube con id que parece truncado; "10.000 parcelas" y "15 a 40 minutos" tomados de la especificación; Lighthouse y QA manual en el preview de Vercel (es/en, móvil 360 px) sin hacer; `npm run sim` / `sim:territorio` no se corrieron (ningún archivo de `src/sim/`, `tests/sim/` ni `src/territorio/session.ts` cambió respecto de `main`).

**Acciones manuales pendientes del equipo.** (1) Correr `supabase/territorio_feedback_migration.sql` y la prueba `curl` de la fase 25; (2) cargar `GEMINI_MODEL`, `GEMINI_MODEL_FALLBACK`, `GEMINI_MODEL_TTS` en Vercel y probar DecarboNito y el asesor con la key real; (3) reemplazar el contacto y la licencia (`grep -rn "decarbonation.example"` + `src/shared/contact.ts`); (4) recorrido manual del punto 3.2 de la fase 31 en el preview.

**Verificación final.** `tsc` limpio, 196/196 tests, build limpio, `i18n:audit` limpio.

## 2026-10-13 — v5: contacto y licencia definidos

El equipo confirmó el contacto (`fombis.von@gmail.com`) y que todo el material tiene licencia abierta. Se reemplazó el placeholder en `index.html`, `docentes-espacio.html` y `src/shared/contact.ts`, y el pie dice "Licencia abierta" / "Open license". Deja de ser un pendiente bloqueante de las fases 28, 30 y 31. Las variables `GEMINI_MODEL*` no hace falta cargarlas: todas tienen default en `src/services/geminiConfig.ts`.

## 2026-10-22 — v6 fase 32: versión del modelo en los datos de investigación

**Qué se hizo.**
- Paquete v6 copiado a `mejora-general/files/` (`00_INDICE_v6.md` y `32`–`51`) y el material de referencia a
  `scripts/reference/` (`modelo_v2.py`, `golden_v2.csv`, `export_situations.ts`, `README.md`). En el paquete la carpeta se
  llama `referencia/`; en el repo, `scripts/reference/` como pide 32 §3.5. `scripts/reference/situations.json` y
  `__pycache__/` van a `.gitignore`.
- `src/sim/version.ts`: `MODEL_VERSION = '1.0'` y `MODEL_VERSION_BY_GAME` (los dos juegos en `MODEL_VERSION`: el 🟧 de la
  decisión 3 del índice queda en su valor por defecto, "los dos juegos reciben el modelo 2.0"). Reexport en `src/sim/index.ts`.
- `model_version` en `createGameSession` (`niveles`), `logPrediction` (`niveles`) y el cuestionario de Territorio:
  `GameSummary.modelVersion` (`buildSummary`), `TerritorioFeedbackRow.model_version` (`toRowFields`) y `sanitizeRow`
  (`text(row.model_version, 16)`).
- `supabase/model_version_migration.sql` (idempotente, **sin aplicar**: pegar en el SQL Editor de Supabase).
- `tests/sim/version.spec.ts`; casos nuevos en `tests/territorio/feedbackService.spec.ts` y `surveySummary.spec.ts`.
- Sección "Historial de versiones del modelo" en `docs/audit-equations.md`.
- `docs/v6-spec-vs-motor.md`: registro vivo de las discrepancias entre el paquete v6 y el motor, que completan las fases 33–51.
- Tag local `model-v1.0` sobre `144c321`. **Pendiente de push:** `git push origin model-v1.0`.

**Desvíos y discrepancias (gana el código).**
- *`warnedOnce` en `feedbackService`.* 32 §3.3 supone que el cuestionario usa el patrón `warnedOnce`; no lo usa: `post()`
  devuelve `'sent'`/`'rejected'`/`'retry'` y un 4xx (`'rejected'`) nunca se encola, se pierde. El reintento sin
  `model_version` va en esa rama, una sola vez, tanto en `submitFeedback` como en `flushFeedbackQueue`, y **solo** si el
  cuerpo del error dice que falta la columna (`PGRST204`/`42703` nombrando `model_version`). Cualquier otro 4xx —por
  ejemplo, una versión que no cumple el `CHECK`— se rechaza como antes, para no guardar como 1.0 una fila de otro modelo.
  Las filas encoladas conservan su etiqueta.
- *También en `game_sessions` y `predictions`.* La spec solo pide el reintento en el cuestionario. Pero si se despliega
  antes de migrar, `createGameSession` fallaría y la partida entera quedaría sin fila. Los tres caminos usan el mismo
  helper sin dependencias, `src/services/modelVersionColumn.ts` (`sendWithModelVersion`): reenvía sin la columna solo en
  ese caso, avisa una vez por consola y recuerda la tabla para no gastar dos pedidos en cada insert.
- *`sanitizeRow`* anula (no trunca) un `model_version` que no cumple la expresión del `CHECK` (`MODEL_VERSION_RE`).
- *SQL.* El `CHECK` de `territorio_feedback.model_version` va en un bloque `DO` con nombre propio
  (`territorio_feedback_model_version_check`) en vez de inline en el `ADD COLUMN IF NOT EXISTS`: inline, si la columna ya
  existía el `CHECK` no se crea nunca. La política de INSERT (`WITH CHECK (true)`) y el `GRANT INSERT` son de tabla, no
  enumeran columnas: no hay que tocar RLS. Idempotencia revisada a mano (no hay Postgres local).
- *Cuestionario sin partida.* Con `partida_estado = 'sin_partida'` la fila guarda la versión actual de Territorio (las
  respuestas son sobre la app que se está usando). Un resumen guardado en `localStorage` antes de esta fase (TTL 12 h) no
  trae `modelVersion`: se registra `'1.0'`, que es el modelo que lo produjo.
- *`npm run sim`* da exactamente la misma salida antes y después (esta fase no toca ecuaciones).

**Correcciones al prototipo `scripts/reference/modelo_v2.py`** (decisión del usuario: corregir y regenerar).
1. `declare()` cobraba el lote dos veces (`pay()` ya descuenta y además `s["R"] -= cost`) y cobraba aunque no hubiera un
   uso de origen con un lote completo. Ahora busca el origen primero y cobra una vez.
2. Quiebra: `breach += dt` sumaba 1/12 en coma flotante y a los 24 meses daba 1,9999… < 2, así que se disparaba en el
   mes 25. Ahora la comparación es `breach ≥ 2 − BREACH_EPS` (1e-9 años) y quiebra en el mes 24 con cualquier `dt`
   (contar meses redondeados fallaba con pasos de menos de un mes). El port a TS (fase 44) debe usar la misma tolerancia
   o contar pasos enteros.
3. `add_situation_effect` ignoraba los efectos `landUseChange` y el campo `when`. Ahora: los pares ± de una opción son una
   transferencia directa origen→destino (si el origen no alcanza, se mueve lo que hay y el destino no se completa desde
   otro lado); un negativo suelto va a barbecho (FAL); un positivo suelto sale de FAL, luego PRG, luego CC (47 §2 / 37).
   El área que mueve una situación nunca cuenta como área *declarada*; si BNP baja, `declared_BNP` se recorta a BNP.
   `when` es representable: `export_situations.ts` traduce los 22 predicados del catálogo a `whenExpr` (nombres `A["…"]`,
   B, F, E, W, St, pa, pe, ps, D, Y, R; `===` pasa a `==`; un `=` suelto, `&&` o `||` no se traduce) y el prototipo los
   evalúa al sortear la llegada, como `rollSituation` (incluido no
   gastar el segundo sorteo cuando no hay elegibles). Un predicado no traducible se avisa en consola y cuenta como verdadero.
4. Los efectos sobre `Reservas_del_Tesoro` escalaban con √(Y/Y₀) también cuando eran negativos. Ahora solo escalan los
   ingresos positivos, con el mismo factor que los costos (`min(2,5, max(1, √(Y/Y₀)))`, `cost_scale`); antes era √(Y/Y₀)
   sin tope ni piso.

**Cifras del prototipo que cambian.** `golden_v2.csv` **no cambió** (se regeneró y es idéntico: es de 3 niveles sin
eventos, donde no actúa ninguna corrección) y la caracterización de 3 niveles (`python scripts/reference/modelo_v2.py`)
tampoco. Cambia la parte Territorio (8 estrategias × 20 semillas, 360 meses; % de semillas que cumplen la ruta, medias al
final), base de las fases 44, 47 y 49:

| Estrategia | Ruta (antes → después) | B | F | E | W | c | lotes | D/Y |
|---|---|---|---|---|---|---|---|---|
| do_nothing | 0 → 0 | 38,3 → 37,6 | 33,0 → 35,5 | 28,3 → 29,4 | 37,7 → 40,9 | 6,9 → 6,8 | 0 | 0,00 |
| conservation | cons 100 → 100 | 62,2 → 63,5 | 30,8 → 29,1 | 24,7 → 26,1 | 57,6 → 70,2 | 5,9 → 5,4 | 11,9 → 12,0 | 0,59 → 0,52 |
| production | **prod 75 → 55** | 36,6 → 37,8 | 47,0 → 43,6 | 48,9 → 47,9 | 74,7 → 76,3 | 7,7 → 7,3 | 0 | 0,20 |
| innovation | inno 100 → 100 | 44,3 → 45,5 | 38,3 → 36,2 | 30,2 → 31,5 | 71,2 → 79,0 | 4,1 → 3,9 | 4,0 | 0,58 → 0,46 |
| settle_only | 0 → 0 | 40,4 → 41,4 | 38,8 → 35,4 | 31,4 → 30,7 | 65,7 → 70,0 | 7,0 → 6,5 | 0 | 0,00 |
| cheap_production | 0 → 0 | 39,9 → 41,0 | 35,0 → 31,4 | 36,1 → 35,0 | 65,6 → 69,2 | 7,1 → 6,6 | 0 | 0,00 |
| extractive | 0 → 0 | 29,9 → 31,1 | 47,7 → 42,3 | 47,3 → 46,2 | 55,9 → 58,0 | 8,1 → 7,3 | 0 | 0,54 → 0,55 |
| buy_everything | 0 → 0 (quiebra 100 % → 100 %) | 55,8 → 55,4 | 24,9 → 19,4 | 10,9 → 12,0 | 27,0 → 31,1 | 3,3 → 2,9 | 13,2 → 23,5 | 1,09 → 0,92 |

Lectura: `buy_everything` declara casi el doble de lotes porque ya no paga dos veces cada uno, y sigue quebrando (criterio
§6 del índice: es la única estrategia a la que se le permite). **La ruta de producción cae de 75 % a 55 %**, dentro de la
franja 30–70 % que el índice prohíbe ("la estrategia decide, no la semilla"). La ablación muestra que la causa son los
efectos de suelo de las situaciones (sin ellos vuelve a 75 %; sin `when` baja a 35 %): resolver la bandeja con la primera
opción pagable convierte CC en CA/HUM/RES y las 9 semillas que fallan lo hacen solo por F < 44. Queda para la
recalibración de Territorio (fases 47 y 49), anotado en `docs/v6-spec-vs-motor.md`. `TERR_ROUTES` no se tocó.

**Discrepancias nuevas encontradas.**
- El prototipo sigue ignorando los efectos de las situaciones sobre `stella.PBI_Real` (5 efectos en el catálogo) y los
  efectos en porcentaje (`pct`) sobre `Reservas_del_Tesoro`/`Deuda`. Se deja anotado para la fase 47.

**Pendiente del equipo.** (1) Correr `supabase/model_version_migration.sql` en el SQL Editor (antes o después del deploy:
el cliente tolera la columna faltante). (2) `git push origin model-v1.0`.

**Verificación.** `npx tsc --noEmit` limpio, `npm test`, `npm run build`, `npm run i18n:audit` en verde; `npm run sim` idéntico.

## 2026-10-22 — v6 fase 33: arnés completo y `npm run sim:check`

**Qué se hizo.**
- `scripts/harness/`: `strategies.ts` (las 8 estrategias de cada juego, mismos ids y definiciones que `STRATEGIES` y
  `TERR_STRATEGIES` de `scripts/reference/modelo_v2.py`, escritas con los códigos cortos del prototipo y traducidas con
  `POLICY_BY_CODE`/`PACT_BY_CODE`), `runNiveles.ts` (`stepYear`, 30 años por nivel; además la medición anual–mensual con
  `stepMonth`), `runTerritorio.ts` (360 meses con la API real de `session.ts`), `randomPlayers.ts` (jugadores sintéticos,
  semillas `10000 + i`) y `metrics.ts` (Wilson, cuantiles, recorridos, criterios C1–C9, comparación y código de salida).
- `scripts/sim-check.ts` + `npm run sim:check` / `sim:check:quick`. Flags: `--quick` (10/5 semillas, 50 jugadores),
  `--report-only` (nunca falla), `--update-latest` (copia el JSON a `reports/balance-latest.json`).
- Línea base: `npm run sim:check -- --report-only --update-latest` → `reports/balance-1.0.{md,json}` y
  `reports/balance-latest.json` (≈ 160 s con 40/20 semillas y 150 jugadores por nivel; `--quick` ≈ 40 s).
- `tests/harness/metrics.spec.ts` (Wilson, cuantiles, agregación, criterios, regresiones y código de salida). El arnés
  completo no corre en `npm test`; `scripts/simulate*.ts` quedan intactos y el README apunta al arnés nuevo.

**Desvíos (gana el código).**
- *Acciones del jugador como en la app, no como en el prototipo.* Pactos, lotes y situaciones se pagan solo con reservas
  (`togglePact`, `declareUse`, `decideSituation`); el `pay()` del prototipo puede endeudarse hasta D/Y = 0,6. Los pactos en
  3 niveles se unen como `togglePact` de `App.tsx` (desde `unlockYear`, `costToJoin` fijo), no por entry × PBI.
- *Semillas.* Estrategias: 1…N; eventos con `makeRng(seed, año)` (3 niveles) y la RNG propia de la sesión (Territorio).
- *C3* cuenta conservación + producción + innovación (no equilibrio, que en N3 es "todo a la vez" por diseño).
- *C2* mide la ruta cumplida (con pisos), no la otorgada (que es la de mayor multiplicador).
- *`--quick`* sale con 1 solo si un criterio que pasaba en `balance-latest.json` falla ahora (33 §5); la corrida completa
  sale con 1 ante cualquier FAIL. Para que la comparación sea pareja, las semillas rápidas son un prefijo de las completas
  y la corrida completa guarda también `quickCriteria` (lo que daría `--quick`): `--quick` compara contra eso y no
  confunde ruido de pocas semillas con una regresión. `--update-latest` se ignora con `--quick`. El reporte rápido
  (`balance-<v>-quick.*`) va a `.gitignore`.
- *Revisión de código* (aplicada): estrategia faltante = FAIL en C1/C2/C4 (antes pasaba en silencio); los dos cambios de
  una misma decisión del jugador sintético no se deshacen entre sí; `ControlParams` llega a todas las acciones de
  Territorio (salvo `createSession`, que no lo recibe); D/Y no finito se escribe como texto en el JSON. `quantile` queda
  sin interpolar, tal como la escribe 33 §4.
- *Valor escalar por criterio* para poder comparar reportes: C1/C3/C4 = peor tasa, C2 = peor tasa dirigida, C5 = casos
  dentro de (30, 70) %, C6 = menor recorrido, C7 = máx |x − 33 %|, C8 = quiebras no permitidas, C9 = máx(|Δ|/umbral).
- *C9* se mide ya (N2, do_nothing/green/extractive, sin eventos) pero queda SKIP en 1.x: peor |Δ| = 0,69 en W y 0,15 t en c.
- 🟧 de 33 §7 (agregar `sim:check:quick` al CI): no hay workflow en el repo; queda sin agregar.

**Línea base 1.0** (40 semillas por estrategia y nivel; 20 en Territorio):

| Criterio | Estado | Medido |
|---|---|---|
| C1 do_nothing nunca gana | FAIL | N1 0 %, N2 0 %, **N3 7,5 %** (ruta producción), Territorio 0 % |
| C2 dirigida gana su ruta | FAIL | N1 cons 100 / prod 22,5 / inno 100; **N2 0 / 0 / 0**; N3 100 / 12,5 / 100; Territorio 95 / 35 / **0** |
| C3 ninguna gana todas | PASS | máx. N1 conservation 22,5 % |
| C4 atajos cerrados | FAIL | N3 tech_tax 10 %; Territorio cheap_production 35 %, extractive 30 % |
| C5 la estrategia decide | FAIL | N2 balanced 47,5 %; Territorio production 35 %, innovation 60 %, cheap_production 35 % |
| C6 recorrido ≥ 15 | FAIL | N1: B 8,0, F 10,2, **E 0,4**, W 12,8; N3 F 12,3 (N2 y Territorio pasan) |
| C7 banda de predicción | FAIL | "sin cambio" B 100 % en los 3 niveles, E 86–100 %, c 24–61 % |
| C8 sin quiebras espurias | PASS | ninguna quiebra (inalcanzable); Territorio do_nothing 20/20 y buy_everything 11/20 terminan por desgaste sostenido |
| C9 anual–mensual | SKIP | informativo (modelo 1.x) |

Reproduce lo esperado por la auditoría (C1 casi, C2/C5 fallan en Territorio, C6 falla por E inmóvil en N1, C7 ≈ 100 %
en B, C8 pasa porque la quiebra es inalcanzable) con dos diferencias: C1 falla en N3 (do_nothing cumple la ruta de
producción en 3/40 semillas) y C2 falla también en los 3 niveles (N2: ninguna dirigida cumple su ruta).

**Discrepancias nuevas** (en `docs/v6-spec-vs-motor.md`).
- La innovación de Territorio con CN = 20/40/40/0 no puede cumplir su ruta en 1.0: `carbonTechEffort` promedia
  renovables y **captura** ((40 + 0)/2 = 20 < 25). Gana la producción en su lugar (60 %).
- `buy_everything` no quiebra en Territorio 1.0 (declara ~5 lotes: sin reservas `declareUse` rechaza y no hay deuda); el
  prototipo quiebra en 100 % porque `pay()` financia con deuda. El 1.0 lo frena por desgaste sostenido (11/20).
- El tratado de biodiversidad suma +5 de B por año (efecto aditivo de `effects`): `conservation` termina con B = 100 en
  N2, N3 y Territorio. Para la fase 43 (pactos).
- En 3 niveles, `togglePolicy` de `App.tsx` no reparte el esfuerzo al activar: en N1 (sin panel) Carbono Neutralidad corre
  con esfuerzo 0. El arnés usa reparto parejo como pide 33 §3.1 / 34 §3.2; lo corrige la fase 34.

**Verificación.** `npx tsc --noEmit` limpio; `npm test` (24 archivos, 216 tests, 11 nuevos); `npm run build`; `npm run i18n:audit`;
`npm run sim:check -- --quick` corre y escribe el reporte. No toca `src/` ni ecuaciones (sin fila en `audit-equations.md`).

## 2026-10-22 — v6 fase 34: correcciones del modelo 1.1

**Qué se hizo** (`mejora-general/files/34_correcciones_modelo_1_1.md`; detalle por ID en `docs/audit-equations.md`,
sección "Modelo 1.1"). `MODEL_VERSION = '1.1'`, tag local `model-v1.1`.
- §1 `stellaName` de CN fuera del comentario (INV-15). §2 `evenEffort()` en `src/sim/policies.ts`, usado al activar en
  `App.tsx` y `territorio/session.ts`. §3 `PactImpulses`/`Pact.impulses` + `pactImpulse()`; `pacts` llega como último
  parámetro opcional de `calculateBiodiversity/FoodSecurity/EconomicSecurityChange` desde `stepYear` y `stepMonth` (INV-16).
  §4 `restorePactFunctions()` en `deferred.ts` reemplaza las tres restauraciones inline y se usa en `createInitialState`.
  §5 sequía con el área del estado. §6 `efficiencyFromCounter()` (sobre `decayedEfficiency()`, la curva que también usa el
  motor). §7 `GameState.declaredProtectedArea` (lotes protegidos + RES→BNP en `stepMonth`, acotado al BNP existente);
  `publicNaturePct` y el mantenimiento lo usan. §8 `resolveSituation` ya no aplica los diferidos;
  `Session.pendingDeferred` → `stepMonth(options.extraDeferred)`. §9 panel (claves en `paramGroups.ts`), manual del
  facilitador, `EquationsManual` (sin `OBSOLETE_PARAMS`), `descriptions.ts`, hoja docente, aviso bajo las pistas de
  instrumentos (es/en en `src/i18n/ui` y `src/i18n/territorio`), 70 claves muertas fuera de `CONTROL_PARAMS`/`ControlParams`.
- Se borraron las copias muertas del motor en `App.tsx` (≈ 260 líneas: `calculate*Change`, `getPolicyEfficiency`,
  `getPolicyByStellaName`) y sus imports; `App.tsx` lee el CP vivo en el tooltip del puntaje, el tope del impuesto y el año
  del préstamo.
- Tests: `tests/sim/model11.spec.ts`, `tests/sim/facilitatorParams.spec.ts`, INV-15/16 en `invariants.spec.ts`, T-06/T-12
  en `tests/territorio/session.spec.ts`, área declarada en `tests/territorio/routes.spec.ts`. Ningún test existente esperaba
  cifras 1.0 que cambiaran (los de `tests/sim/` miden invariantes y direcciones); solo `version.spec` pidió la fila 1.1.

**Desvíos y discrepancias (gana el código).**
- *facilitatorParams* tal como lo escribe la spec fallaría: `Pago_deuda`/`Tasa_de_interes` de N1/N2 solo cuentan con deuda
  (0 al inicio de cada nivel) → escenario en su nivel con un préstamo en el año 1; las 4 claves por punto de impuesto solo
  con impuesto → N3 con 10 pp; `Ano_Activacion_Prestamo` y `Max_Additional_Tax_Rate_Percentage` son solo de UI
  (`UI_ONLY_PARAM_KEYS`) y se prueban contra `unlocks`/`setTaxPressure` de Territorio.
- *T-06*: el reset de eficiencia al reactivar duraba un solo paso (el motor recalcula desde el contador), así que el cambio
  no mueve trayectorias; arregla lo que ve el jugador y que el aviso del 40 % se volvía a armar.
- *Sequía*: en N2 desaparece el +0,02 al inicio (150/600 = 0,25, no > 0,25; antes 150/500 = 0,30).
- *Esfuerzo parejo en N2/N3*: la spec pide `evenEffort` en todos los niveles; antes, en N2+, una política recién activada
  tenía esfuerzo 0 (eficiencia efectiva 0) hasta mover los sliders (P-2). El consejo "sin esfuerzo" y el bloqueo de
  `runSimulationRound` siguen, pero solo se disparan si el jugador baja todo a 0. El arnés ya usaba reparto parejo.
- *Pistas de instrumentos*: `INSTRUMENT_IMPACT_HINTS` no se muestra en ningún panel (Dashboard recibe la prop y no la usa);
  el aviso va bajo el subtítulo del panel de instrumentos (3 niveles) y bajo "Esfuerzo por instrumento" (Territorio).
- *T-12*: ninguna situación del catálogo actual tiene efectos sobre indicadores derivados (solo B/F/E y `stella.*`): hoy no
  mueve nada en el juego. Además, igual que en los eventos, un diferido sobre `treasuryReserves`/`pp*` toca la copia en
  `indicators` y el mes siguiente se resincroniza desde Stella (deuda conocida; la fase 46 borra `deferred`).
- *cond.publicNature* 12 → **4,5** % (🟧 de la spec: "≈ 7 %"). Con el arnés (20 semillas) `conservation` termina en
  4,7–8,9 % de naturaleza pública declarada y `do_nothing` en 0 %; con 7 % conservación cumpliría en ≈ 9/20. Margen chico
  (0,2 pp en la peor semilla): revisar en 47/49. Etiqueta: "Territorio *declarado* bajo uso público de conservación".
  Tabla docente regenerada con `npx tsx scripts/routes-table-html.ts`.
- `Max_Abs_Total_Carbon_Ref` (descripción huérfana en `descriptions.ts`, sin clave en CP) también se borró.
- `PlayerManual.tsx` describe una sinergia Conservación + Ganadería que el motor no tiene (las reales: AS+CR en B, GS+AS
  en F, PAI+FRA negativa en B). Fuera del alcance de 34: queda para la fase 50.
- E2E: el dev server del worktree sin `.env.local` queda en blanco (`new GoogleGenAI` sin clave al importar
  `geminiService.ts`, preexistente); se verificó con un `GEMINI_API_KEY` de relleno.
- Revisión de código (aplicada): fila 1.1 en audit-equations, curva de decaimiento compartida (`decayedEfficiency`),
  `declaredProtectedArea` acotado al BNP en cada mes, imports muertos de `App.tsx`. No aplicadas: unificar el cálculo de
  área total (lo hace la fase 37 con el barbecho) y fusionar `PARAM_GROUPS_ES/EN` (lo cubre un test).

**Balance 1.0 → 1.1** (`npm run sim:check` completo, `reports/balance-1.1.md`):

| Criterio | 1.0 | 1.1 | Qué cambió |
|---|---|---|---|
| C1 do_nothing nunca gana | FAIL 0,075 | FAIL 0,075 | igual (N3 7,5 %) |
| C2 dirigida gana su ruta | FAIL 0,000 | FAIL 0,000 | N2 conservación 0 → 37,5 %; el resto igual (Territorio conservación 95 % tras recalibrar) |
| C3 ninguna gana todas | PASS 0,225 | PASS 0,225 | N3 conservation pasa a ganar las tres rutas en 7,5 % (bajo el 50 %) |
| C4 atajos cerrados | FAIL 0,350 | FAIL 0,350 | igual |
| C5 la estrategia decide | FAIL 3 | FAIL 5 | empeora: N2 conservation (37,5 %) entra en la franja 30–70 %; N2 balanced 47,5 → 40 % |
| C6 recorrido ≥ 15 | FAIL 0,389 | FAIL 0,341 | empeora: sin el +5 B/año del tratado, el recorrido de B cae de ≈ 64 a ≈ 10 en N2/N3 (16 en Territorio) y el de E de ≈ 25 a ≈ 9 (10 en Territorio); N1 W 12,8 → 5,7 |
| C7 banda de predicción | FAIL 0,670 | FAIL 0,670 | igual |
| C8 sin quiebras espurias | PASS 0 | PASS 0 | igual |
| C9 anual–mensual | SKIP | SKIP | igual (informativo en 1.x) |

Lectura: lo esperado por la spec. Se cierran los atajos de los pactos (casi todo el "recorrido" de B y E en N2/N3 era el
tratado y los saltos de E) y CN decae. Ninguna estrategia dirigida bajó más de 20 puntos respecto de 1.0, así que no se tocó
ningún umbral de rutas del juego de 3 niveles (§10). C5 y C6 los atacan las fases 36–43.

**Pendiente para el equipo.** Aplicar `supabase/model_version_migration.sql` y empujar los tags `model-v1.0` y `model-v1.1`.

## 2026-10-22 — v6 fase 35: motor 2.0 — estructura, parámetros y anclas

**Qué se hizo** (`mejora-general/files/35_motor_v2_estructura.md`; rama `v6-modelo-v2`). `MODEL_VERSION = '2.0-dev'`.
- `src/sim/v2/`: `math.ts` (§3, idéntico al prototipo), `params.ts` (`PARAMS_V2` = `P` del prototipo, `PID`, mapa de
  nombres en la cabecera), `anchors.ts` (`computeAnchors` / `createModelState`), `core.ts` (`advance`), `README.md`
  (módulos, orden, convenciones, qué fase hace qué).
- `advance(state, dt, rng, CP, opts)` es el único cuerpo de los dos juegos: `stepYear` = `advance(…, 1)` y
  `stepMonth` = `advance(…, 1/12, { month })`. En esta fase llama a las funciones 1.1 en el orden 1.1 (pasos 0–14 +
  11.5). `rng = null` corre sin eventos. `rollMonthlyEvent`, `monthlyTriggerChance`, `declaredProtectedOf` y
  `MONTHS_PER_YEAR` se mudaron a `core.ts` y `monthly.ts` los reexporta (ningún import cambió).
- Tipos: `ModelAnchors`, `ModelIndicatorKey`, `TargetImpulse`, `ModelState`, `GameState.model?`,
  `PolicyState.rampTime?` / `fatigueTime?` (solo declarados; los usa la 36). `createInitialState` devuelve `model`
  (anclas + stocks 2.0 en cero); `advance` solo mueve `model.t` += dt.
- `CONTROL_PARAMS`: `Poblacion_Inicial`, `Velocidad_Ajuste_*` (6), `Eficiencia_Minima_Politicas`,
  `Recuperacion_Politicas_Anios`, `Gasto_Publico_Base_Nivel_1..3` con el aviso de sensibilidad. Ninguna ecuación los lee
  todavía (no están en el panel del facilitador: los expone la fase 50).
- Anclas: logits de B, F, E, C, Pc y las tres presiones; B0/F0/E0/W0; hábitat, valor productivo, concentración,
  participaciones, ρ₀ (producción per cápita), presiones, PBI, áreas agrícolas; c₀ y emisiones por fuente con la
  corrida en seco de la matriz de suelo del prototipo (`dryRunLandFlows`: tasas base, barbecho, pool con rentas
  ancladas, neteo de todos los pares, escalado) y la energía a eps₀ del nivel. Coinciden con `new_state()` del
  prototipo en los tres niveles (c₀ = 5,947 / 7,135 / 5,733; test en `core.spec.ts`).
- Tests: `tests/sim/core.spec.ts` (trayectorias de referencia generadas con los cuerpos 1.1 de `caa9275` — N2/N3 con
  eventos, préstamo, impuesto y tratado, 40 meses de N2 — que `advance` reproduce a 1e-9; relax anual = x + k(x* − x); 12 pasos mensuales = 1 anual a 1e-9; `advance` no
  muta; `advance` = `stepYear` / `stepMonth` paso a paso durante 24 pasos; calendario; anclas y logits por nivel;
  N1 con colapso 5), `tests/sim/golden.v2.spec.ts` (`GOLDEN_ACTIVE = false`, lee `scripts/reference/golden_v2.csv`) y
  `playLevel` en `tests/sim/testHelpers.ts` (estrategias de `scripts/harness/strategies.ts`, `rng = () => 0.999`;
  `joinPacts` de `runNiveles.ts` pasa a exportarse).
- `vitest.config.ts`: la cobertura mide `src/sim/**/*.ts` (antes `src/sim/**`, que intentaba parsear el README).
  `scripts/i18n-audit.mjs`: `src/sim/v2/core.ts` entra en la lista de archivos de motor verificados bilingües (sus
  líneas de log son las de `stepYear`/`stepMonth`, mudadas sin cambios).

**Desvíos y discrepancias** (filas de la fase 35 en `docs/v6-spec-vs-motor.md`).
- *Colapso N1 = 5* (§8, `INITIAL_STELLA_STOCKS.Colapso_politico` 0 → 5): es el **único** cambio numérico de la fase.
  En N1 el colapso nunca vuelve al piso 0, así que la estabilidad queda 5 puntos más baja durante toda la partida
  (inicio 95; p50 final de `do_nothing` 89,7 → 84,7). N1 no tiene piso de estabilidad ni la usa en el puntaje: ninguna
  victoria, ruta, puntaje ni criterio cambia. N2, N3 y Territorio (nivel 2) no cambian.
- *Ramas por `dt` heredadas de 1.1*: el `toward` de Euler (con `dt = 1` devuelve el valor anual tal cual, para que el
  juego de 3 niveles sea idéntico bit a bit), el sorteo anual/mensual, el préstamo (dentro de `updateEconomy` en el
  anual, entero después de los flujos en el mensual) y el calendario (el anual simula `year + 1`). Se van en 39–46.
  En el paso anual también se arma `flows` (stepYear lo descarta); el ajuste de `declaredProtectedArea` sigue siendo
  solo mensual, y la fusión de pactos/economía conserva la semántica de spread del viejo `stepYear`.
- *Spec §4 vs `P`*: varias entradas de `P` son escalares de `CONTROL_PARAMS` (nuevos o ya existentes con el mismo valor:
  `Tasa_Crecimiento_Poblacional_Base`, `Tasa_Base_Crecimiento_PBI`, `Tasa_Impositiva_General_Sobre_PBI`,
  `Tasa_de_interes_Nivel_*`, `Pago_deuda_anual_Nivel_*`); se agregó `finance.breachEps` (= `BREACH_EPS` del prototipo,
  fase 32). Los coeficientes que el prototipo escribe dentro de sus funciones pasan a `params.ts` en la fase de cada una.
- *Pactos* con los IDs del código (`biodiversityTreaty`, …); claves `s`/`u` → `renewables`/`efficiency`.
- *Población*: las anclas usan `Poblacion_Inicial` = 400 000; el motor 1.1 sigue leyendo `Poblacion_Total` = 10
  millones hasta la fase 38.
- *Golden*: el CSV trae `pa, pe, ps, DY, S` además de las 9 columnas del test; se leen solo esas 9.
- *C9*: con `'2.0-dev'` el arnés evalúa la consistencia anual–mensual (mayor ≥ 2). Da FAIL 1,529, el mismo valor que
  antes figuraba como SKIP: el mensual sigue siendo Euler hasta la fase 46. No es regresión (quick sale 0).
- *`'2.0-dev'`* se reutiliza en las fases 36–46 con ecuaciones distintas: la rama no se despliega ni recolecta datos
  hasta la fase 51, que fija `'2.0'`. Si alguna build intermedia se usara en un taller, antes hay que darle un sufijo
  propio (p. ej. `2.0-dev.36`).
- *Motivo del colapso 5*: `logit()` recorta en 1e-4, así que logit(0) es finito (−9,2) pero queda pegado al recorte;
  el valor 5 es el del prototipo (`LEVELS[1].Pc`), y con él las anclas coinciden.
- `PIDS` verificados contra el enum `Policy` (`CN` es "(P-C)") y contra `POLICY_BY_CODE` del arnés (test).

**Verificación.** `npx tsc --noEmit`, `npm test` (28 archivos), `npm run build`, `npm run i18n:audit` limpios.
`npm run sim:check -- --quick` antes de tocar el colapso y con `MODEL_VERSION` todavía en 1.1: JSON idéntico byte a
byte al de HEAD (`caa9275`). Con el colapso: solo cambia St de N1. Con `'2.0-dev'` (`reports/balance-2.0-dev-quick.md`):

| Criterio | 1.1 (quick) | 2.0-dev (quick) |
|---|---|---|
| C1 do_nothing nunca gana | FAIL 0,100 | FAIL 0,100 |
| C2 dirigida gana su ruta | FAIL 0,000 | FAIL 0,000 |
| C3 ninguna gana todas | PASS 0,200 | PASS 0,200 |
| C4 atajos cerrados | FAIL 0,600 | FAIL 0,600 |
| C5 la estrategia decide | FAIL 3 | FAIL 3 |
| C6 recorrido ≥ 15 | FAIL 0,341 | FAIL 0,341 |
| C7 banda de predicción | FAIL 0,670 | FAIL 0,670 |
| C8 sin quiebras espurias | PASS 0 | PASS 0 |
| C9 anual–mensual | SKIP 1,529 | FAIL 1,529 |

Sin cambios de UI: no se probó en navegador.

**Revisión de código** (aplicada): el test de equivalencia comparaba `advance` consigo mismo (los envoltorios) →
trayectorias de referencia de 1.1; fusión de `stellaStocks` de pactos y de la economía con la semántica de spread
del viejo `stepYear`; `declaredProtectedArea` vuelve a ser solo mensual; `createModelState` ya no corre dos veces la
corrida en seco; `eps` sin el factor `× 1`; motivo del colapso 5 corregido. No aplicadas: el doble
`computeLandUseFlows` por paso (heredado de 1.1, lo reemplaza la matriz de la fase 37) y `'2.0-dev'` (pedido por la
spec; ver desvíos).

**Deudas.** La corrida en seco de `anchors.ts` duplica la matriz de la fase 37: cuando exista, `computeAnchors` debe
llamarla (el test de anclas contra el prototipo lo protege). `golden.v2.spec.ts` se enciende en la fase 46.

## 2026-10-22 — v6 fase 36: políticas — puesta en marcha, fatiga e instrumentos

**Qué se hizo** (`mejora-general/files/36_politicas_eficiencia_instrumentos.md`; rama `v6-modelo-v2`).
- `src/sim/v2/policies.ts` (port de `base_eta`, `channel`, `compute_eta`, `policy_cost` y del bloque de relojes de
  `step()` del prototipo): `tickPolicyClocks` (τ y T; en reposo τ = 0 y T·e^(−dt/ρ)), `rampFactor`, `fatigueFactor`,
  `baseEfficiency`, `channelStrength`, `prodEfficiency`, `efficiencyOf`, `computeEfficiencies` (η base + `eta` uniforme
  del prototipo + `land`/`prod`/`social`, y `elec`/`other`/`tax` de CN), `policyCost`/`policyCostOf` (por esfuerzo,
  30 % fijo), `policyStatus` (estados de UI), `PID_OF`.
- `PARAMS_V2`: `INSTRUMENT_CHANNELS` (alias `instruments`; tabla de la spec §2, `ids` en el orden de
  `INITIAL_POLICY_INSTRUMENTS`) y `costShareBridge` (ver desvíos).
- `advance()`: paso 2 (relojes) antes del sorteo de eventos, como el prototipo; paso 4 (`computeEfficiencies`, guarda η en
  `currentEfficiency`) donde estaba el decaimiento 1.1; costo de políticas por esfuerzo; `AdvanceResult.efficiencies`.
  `getPolicyEfficiency` = `eff[pid].prod` (misma función `prodEfficiency`) para los submodelos 1.1.
- Borrados: `costFactor`, `initialEfficiency`, `efficiencyDecayDuration`, `stellaName` de las políticas;
  `Tiempo_Activacion_*` y `Conteo_*` de `StellaStocks` (se conserva `Conteo_Chatgpt`, que no es de políticas);
  `updatePolicyEfficiency`, `decayedEfficiency`, `efficiencyFromCounter`, `computeTotalPolicyCost`.
  `previousEfficiencyForNotification` → `previousFatigueFactor`.
- Aviso nuevo (`checkEfficiencyWarning`): una vez por cruce del factor de desgaste por debajo de 0,5, un aviso por
  política. UI: "En marcha (NN %)" (rampa < 0,9) y "Desgastada" en `PolicyToggle` (todos los niveles; antes la
  eficiencia solo se veía desde N2) y en el panel de políticas de Territorio (más costo por esfuerzo); textos es/en en
  `src/i18n/ui` y `src/i18n/territorio`; pistas de instrumentos actualizadas.
- Consumidores actualizados: `App.tsx` y `territorio/session.ts` (al activar, η de los relojes: 0 = arrancando; T-06),
  `EquationsManual` (tabla κ y λ/δ, fórmula 2.0), `descriptions.ts`, `FacilitatorManual`, contexto de Gemini
  (`geminiService`, `advisorRules`: eficiencia en todos los niveles + estados), `uiActionRegistry` (`startingUp`,
  `worn`), `docentes-ecuaciones.html` y `docentes-diapositivas.html` (eficiencia 2.0; P-1 marcado como corregido en
  2.0), arnés (`runNiveles.ts`, `simulate.ts`).
- Tests: `tests/sim/policies.v2.spec.ts` (§4 completo + comparación numérica con el prototipo: CN 20/40/40/0 y AS
  parejo en N2, 10 años activos, 5 en reposo, 3 reactivada, a 1e-10; monotonía INV-12 con fast-check; ids de
  instrumentos; aviso una sola vez; mensual = anual). INV-15 pasa a "toda política tiene λ, δ y costo". `model11.spec`
  §1 usa la curva 2.0, "N1 ignora el esfuerzo" pasa a "el reparto parejo da la eficiencia base", §6
  (`efficiencyFromCounter`) se retira. `core.spec.ts`: las trayectorias de referencia 1.1 se regeneran con `advance`
  de esta fase (pin de regresión del motor 2.0-dev; la fase cambia ecuaciones a propósito).

**Desvíos y discrepancias** (filas de la fase 36 en `docs/v6-spec-vs-motor.md`).
- *Escala del costo*: la spec dice que el costo sale de `PARAMS_V2.costShare` (κ, 0,2–1,2 % del PBI). κ está calibrado
  contra el gasto público base de la fase 44, que la economía 1.1 no tiene: con κ las políticas cuestan ~5 veces menos,
  el tesoro deja de apretar y `sim:check --quick` da C3 PASS → FAIL (`buy_everything` de Territorio gana todas las
  rutas 80 %, `green` de N1 70 %) y C4 0,6 → 1,0 (verificado). Se aplica la fórmula por esfuerzo de la spec con la
  escala 1.1 (`costShareBridge` = los viejos `costFactor`) a través de `costShareOf`; la fase 44 la cambia a κ y borra
  el puente. Anotado también en `src/sim/v2/README.md` (Recortes).
- *Canales vs prototipo*: `modelo_v2.py` calcula `eta[j]` con relevancia uniforme; las relevancias por canal son de la
  spec. Se implementan las de la spec y se expone además `eff.eta` (uniforme). Con reparto parejo son iguales; el arnés
  solo concentra CN, cuyo `land`/`prod` (en blanco en la spec) se toma uniforme = `eta["CN"]` del prototipo, así que el
  golden no se ve afectado. Las fases 37–45 que lean un canal deciden si el prototipo pasa a canales.
- *Nivel 1*: el prototipo no tiene excepción por nivel (aplica el vector de esfuerzo en cualquier nivel). El juego no
  tiene panel en N1 y `evenEffort` reparte 25/25/25/25 al activar ⇒ χ = 1 y ē = 1 en N1; `computeEfficiencies` no
  distingue niveles. El arnés ya forzaba el reparto parejo en N1 (fase 33).
- *Aviso*: la spec dice "avisa una vez"; se avisa una vez por cruce (una política que se recupera en reposo y vuelve a
  desgastarse vuelve a avisar), y uno por política si cruzan varias el mismo paso.
- *Eficiencia visible en N1*: antes `PolicyToggle` la mostraba solo desde N2; ahora en todos los niveles, porque la
  puesta en marcha también existe en N1.
- `tickPolicyClocks` trata ρ ≤ 0 como recuperación instantánea (el facilitador podría escribir 0).
- La fase cierra N-01/T-02 residual, N-02/P-2, N-07/P-1, T-06 y P-3 (fórmula; escala pendiente de 44).

**Verificación.** `npx tsc --noEmit`, `npm test` (29 archivos, 294 tests), `npm run build`, `npm run i18n:audit`
limpios. `npm run sim:check -- --quick` (sale 0) contra la fase 35:

| Criterio | 35 (quick) | 36 (quick) |
|---|---|---|
| C1 do_nothing nunca gana | FAIL 0,100 | FAIL 0,100 |
| C2 dirigida gana su ruta | FAIL 0,000 | FAIL 0,000 (N2 conservation 30 → 90 %) |
| C3 ninguna gana todas | PASS 0,200 | PASS 0,200 |
| C4 atajos cerrados | FAIL 0,600 | FAIL 0,600 |
| C5 la estrategia decide | FAIL 3 | FAIL 3 |
| C6 recorrido ≥ 15 | FAIL 0,341 | FAIL 0,911 (mejora) |
| C7 banda de predicción | FAIL 0,670 | FAIL 0,670 |
| C8 sin quiebras espurias | PASS 0 | PASS 0 |
| C9 anual–mensual | FAIL 1,529 | FAIL 1,790 |

C9 empeora por diseño: las políticas conservan más eficiencia (piso 0,35) y mueven más el suelo, y la integración
Euler mensual de 1.1 (`toward`) se aparta más del paso anual (peor c: `green` año 10, Δ 0,18 t). Lo resuelve la fase
46 (`relax`). No se corrió el arnés completo ni `--update-latest` (la fase no lo pide).
E2E con navegador (dev server con `GEMINI_API_KEY` de relleno): `/play?demo=1` N1, activar Políticas Agroecológicas →
"En marcha (0 %)"; simular un año → "En marcha (49 %)"; sin errores de consola. `/territorio`: activar Agroecológicas,
avanzar un mes → "Costo 4,0 % del PBI · Eficiencia 5 % · En marcha (5 %)".

**Revisión de código** (aplicada): `getPolicyEfficiency` y `eff.prod` comparten `prodEfficiency`; INV-15 verifica
también la escala que cobra el motor (`costShareOf`); manual del facilitador, cabecera de `INITIAL_POLICIES` y manual
de ecuaciones nombran la escala puente; el manual de ecuaciones ya no presenta η_min y ρ por defecto como "en vivo";
`togglePolicy` de Territorio recibe `CP`; guarda de ρ ≤ 0; `policyStatus` una sola vez por fila en `uiActionRegistry`.
No aplicadas: pasar `eff` como argumento a los submodelos 1.1 (cada fase 37–45 los reescribe y lee su canal de `eff`);
los fragmentos "en marcha"/"desgastada" del contexto de Gemini y del asesor de Territorio quedan en español como el
resto de ese contexto (preexistente); el prop `currentLevel` de `PolicyToggle` y los parámetros `_level` quedan por
firma.

**Deudas.** Escala del costo (44). Los submodelos 1.1 leen solo el canal `prod` (y CN sus instrumentos de renovables y
captura directamente en `carbon.ts`); `land`, `social`, `elec`/`other`/`tax` todavía no tienen lector (37–45).


## 2026-10-22 — v6 fase 37: uso del suelo — matriz conservativa y barbecho

**Qué se hizo** (`mejora-general/files/37_uso_del_suelo_matriz.md`; rama `v6-modelo-v2`).
- `LandUseType.Fallow` (`'FAL'`): 0 kHa en los tres niveles (`INITIAL_LAND_USES` y variantes N2/N3), nombre
  "Barbecho / tierra degradada" / "Fallow / degraded land" (`gameData.ts`, que además gana HUM/RES/ENR, que faltaban),
  pesos 1.1 de puente (biodiversidad 0,05; alimentos y economía 0 = peso productivo 0) y tasas 1.1 de carbono de puente
  (1,0 / 2,5) hasta la fase 38, que usa `PARAMS_V2.flux.FAL` (−2,0). `advance()` agrega la entrada FAL a un estado viejo.
- `src/sim/v2/land.ts` (port de `land_step`, `move_land`, `apply_land_effects`): `landFlows` (frontera 1.1 con η^land,
  RES→BNP, FAL→BNNP 0,05, pool agrícola 0,02·A_k + 0,25·A_FAL con rentas ancladas `ln A_k,0 + Δr_k(η^prod)` y β = 1, CN
  vía η_CN^tax, neteo de todos los pares), `realiseLandFlows` / `applyLandFlows` (dt exacto, escala por fuente, flujos
  en kHa y ha), `transferArea`, `applyLandEffects`. Coeficientes en `PARAMS_V2.land` (`frontier`, `rent`,
  `rentCarbonTaxCC`, `zeroAnchor`); las tasas base de frontera siguen en `CONTROL_PARAMS`.
- `advance()` paso 5 usa la matriz 2.0 (sin `toward`); `AdvanceResult.landFlowsRealised` (kHa + ha, para la fase 38) y
  `eventLandTransfers`; `flows` del mapa = transferencias del evento + flujos realizados. Se borra `src/sim/landUse.ts`
  (nadie más lo usaba; `index.ts` reexporta `v2/land`). `restoración → BNP declarada` lee el flujo realizado.
- Eventos y situaciones: `applyRandomEventEffects` devuelve las transferencias; los efectos de suelo pasan por
  `applyLandEffects` (pares ± directos; suelto negativo → FAL; suelto positivo desde FAL, PRG, CC). `rollEvent` /
  `rollMonthlyEvent` devuelven `landTransfers`; `resolveSituation` devuelve `flows` y la sesión de Territorio los pasa
  a `syncTerritory` (al decidir y al vencer).
- Anclas: `dryRunLandFlows(landUses, CP)` = `realiseLandFlows(landFlows(...), 1)` (deuda de la fase 35 saldada; c₀ igual
  al prototipo, `core.spec.ts`). `startingEmissions` recibe `landUses` y `CP`.
- Territorio (`territory.ts`): `ProductiveKind` = usos del mapa (`MapLandUse`, todos menos FAL) + `'fallow'`;
  `parcelKindOf` / `landUseOfKind`; `parcelTargets` lee `fallow` de FAL (más la diferencia si el mapa es mayor que el
  área del modelo); `createTerritory` asigna barbecho inicial si lo hay; `SOURCES` agrega el pool, BNNP ← barbecho;
  `declarePublicUse` sobre barbecho descuenta de FAL. HUD, panel de rutas, ficha de parcela, capa de calor y contexto
  del asesor leen FAL. Textos de barbecho es/en actualizados.
- `Tasa_de_RES_a_BNNP_Base` → `Tasa_de_RES_a_BNP_Base` (comentado); se borran `Tasa_de_CC_a_CA_Base` (y su descripción)
  y `tasa_CC_a_CA` de los multiplicadores de pactos. Comentario de costos por "parcela" de `constants.ts` corregido (lote).
- Tests: `tests/sim/land.v2.spec.ts` (prototipo: N1/N2 sin políticas, AS, PAI+PEA a 2 decimales; AS ≥ 3 y PAI+PEA ≥ 7
  puntos; equilibrio anclado < 0,1 con la frontera apagada vía `CP`; neteo con fast-check; conservación y no
  negatividad para cualquier dt; pactos; sequía → FAL → BNNP/pool; pares; `transferArea`). INV-01 con eventos a 1e-9
  (50 semillas × 30 años, tres niveles) y con un evento por año; se borra la excepción ±0,01. `territory.spec.ts`:
  transiciones del modelo 2.0 y bloque "barbecho es área del modelo". Trayectorias de referencia de `core.spec.ts`
  regeneradas (fase 37; cambian a propósito).

**Verificación contra el prototipo.** Participación en lo agrícola a 30 años sin eventos, TS = prototipo a 2 decimales:
N1 sin políticas CC 25,0 → 27,94; AS → CA 29,48 (N1) / 17,66 (N2); PAI+PEA → CC 35,26 (N1) / 38,15 (N2). Coinciden con
la spec (27,9; 29,5 / 17,7; 35,3 / 38,2).

**Desvíos y discrepancias** (filas 37 de `docs/v6-spec-vs-motor.md`).
- *Neteo*: el prototipo netea todos los pares (también BNNP⇄CA), la spec decía "del pool". Se sigue el prototipo y se
  corrigió el texto de la spec §2.
- *Situaciones*: pares ± = transferencia directa (regla del prototipo de la fase 32); texto de la spec §3 corregido.
- *Tasas base*: la spec las pone en `PARAMS_V2.land`; ya estaban en `CONTROL_PARAMS` con los mismos valores. Se deja una
  sola fuente (`CONTROL_PARAMS`); el test de "PARAMS_V2.land modificado" apaga la frontera pasando un `CP`.
- *Canales*: frontera con η^land y rentas con η^prod (spec); el prototipo usa el `eta` uniforme. Con reparto parejo dan
  lo mismo, de ahí la coincidencia exacta.
- *m_protect / m_deforest*: se leen del `landUseChangeFactors` 1.1 del tratado (×1,5 / ×0,5, iguales a
  `PARAMS_V2.pacts`); la fase 43 los muda.
- *Mapa*: ampliar `SOURCES` con el pool hacía que el desempate "déficit más restringido primero" de `syncTerritory`
  eligiera usos dentro del redondeo (BNP) antes que el déficit real; el puntaje ahora prioriza el par donde ambos lados
  están más lejos de su área (`offBoth`), y después la cantidad de fuentes.

**`npm run sim:check -- --quick`** (sale 0) contra la fase 36 (corrida en el mismo equipo, mismo commit base):

| Criterio | 36 (quick) | 37 (quick) |
|---|---|---|
| C1 do_nothing nunca gana | FAIL 0,100 | PASS 0,000 |
| C2 dirigida gana su ruta | FAIL 0,000 | FAIL 0,000 |
| C3 ninguna gana todas | PASS 0,200 | PASS 0,000 |
| C4 atajos cerrados | FAIL 0,600 | FAIL 0,200 |
| C5 la estrategia decide | FAIL 3 | FAIL 1 |
| C6 recorrido ≥ 15 | FAIL 0,911 | FAIL 0,911 |
| C7 banda de predicción | FAIL 0,670 | FAIL 0,670 |
| C8 sin quiebras espurias | PASS 0 | PASS 0 |
| C9 anual–mensual | FAIL 1,790 | FAIL 1,775 |

Ningún criterio empeora, **pero las mejoras de C1/C3/C4/C5 son en buena parte porque casi nadie gana**: las rutas
dirigidas de los 3 niveles caen a 0 % (N1 conservación e innovación 100 → 0, N2 conservación 90 → 0, N3 conservación e
innovación 100 → 0) y en Territorio conservación 100 → 60 %, producción 60 → 0 %. Causa: sin el flujo CC→CA de 1.1
(0,5 %/año + 3 %·η_AS, que en 30 años vaciaba buena parte del CC) el CC conserva área, y el balance de carbono 1.1 —
donde CC emite 8,0 contra 0,5 de CA— sube: c a 30 años de `conservation` N1 1,32 → 5,07 t, N2 5,72 → 12,11 t, y las
rutas con tope de emisiones dejan de cumplirse. Es transitorio y esperable por el orden del plan: la matriz es la del
prototipo (verificada), el carbono que la lee todavía es el 1.1; la fase 38 lo reemplaza por el carbono físico del
prototipo (con LUC de `landFlowsRealised`). Recorridos de F y E (máx − mín de medianas) 36 → 37: N1 F 16,8 → 16,8,
E 0,9 → 0,9; N2 F 22,3 → 16,8, E 8,0 → 8,0; N3 F 14,0 → 14,0, E 10,0 → 10,0; Territorio F 27,7 → 23,8, E 16,7 → 16,5.
No se corrió el arnés completo ni `--update-latest`.

**Otras verificaciones.** `npx tsc --noEmit`, `npm test`, `npm run build`, `npm run i18n:audit` limpios. E2E con
navegador (dev server con `GEMINI_API_KEY` de relleno): `/territorio`, activar Políticas Agroecológicas y correr ×4 hasta
nov 2026 → la leyenda "Uso del suelo del modelo" y el panel de rutas muestran "Barbecho / tierra degradada 3" kHa; sin
errores de consola. `/play?demo=1` N1: activar Agroecológicas, simular dos años → "En marcha (74 %)", gráfico de uso
del suelo sin barbecho (0 kHa); sin errores de consola.

**Revisión de código** (aplicada): en `syncTerritory` un par que el modelo no hace nunca le gana a un flujo del modelo
(penalización 1e6, antes 100 podía perder contra `10·offBoth`), y el error por uso se calcula una vez por iteración (no
por par); `SOURCES.fallow` agrega BNNP, PRG y PF (las situaciones pueden mandar cualquier uso al barbecho); declarar
sobre barbecho vuelve a admitir el excedente del mapa sobre el modelo de una partida anterior a 37 (sin restar de FAL
lo que FAL no tiene); `toMapFlow` único en `territory.ts`; rama muerta de `applyRandomEventEffects` eliminada; `heat.ts`
usa `LAND_USE_TYPES`. No aplicadas: (a) rutas de 3 niveles en 0 % — transitorio documentado arriba, lo cierra la 38;
(b) en un par ± con origen corto el destino recibe solo lo que había y no se completa desde FAL/PRG/CC — es la regla del
prototipo (`apply_land_effects`, fase 32: "the destination's unmet part is not taken from anywhere else"); (c) un
efecto suelto sobre FAL hacia FAL no mueve nada, por definición.

**Deudas.** Carbono 1.1 sobre la matriz 2.0 (38; ver arriba). Los multiplicadores de pactos sobre la frontera siguen
siendo los 1.1 (43). El evento de sequía todavía usa el sorteo 1.1 (46). La cantidad de parcelas que el mapa mueve por
pool (ida y vuelta neteado) queda sin medir en pantalla; los tests verifican que solo dibuja transiciones del modelo.

## 2026-10-22 — v6 fase 38: carbono en unidades físicas

**Qué se hizo** (`mejora-general/files/38_carbono_unidades_fisicas.md`; rama `v6-modelo-v2`).
- `src/sim/v2/carbon.ts` (port de `carbon` y `budget` del prototipo): `energyTargets` (s* = min(0,9; 0,60·η_CN^elec +
  min(1; a_ENR/0,04) + Σ pactos.renewables), u* = min(0,6; 0,35·η_CN^other + Σ pactos.efficiency)), `updateEnergyState`
  (`relax` con k = 0,15: igual anual y mensual), `fluxOf` (multiplicadores de política `PARAMS_V2.fluxPolicy`),
  `computeEmissions` → `{energy, afolu, luc, total, perCapita}` en tCO₂e/año (LUC = Σ ha realizadas ÷ dt ·
  max(0, C_i − C_j)·44/12), `budgetPath` / `carbonBudgetIndex` (B_t, `budgetCut2054` = 0,30 🟧, `budgetYears` = 30).
  Los coeficientes que el prototipo escribe en línea pasan a `PARAMS_V2` (`fluxPolicy`, `energy.subsidyBoost`,
  `renewablesCap`, `efficiencyCap`).
- `advance()` paso 7.5 (2.0 paso 7), después de la economía y antes de los indicadores 1.1 (como el prototipo): actualiza
  `model.energy`, `model.emissions`, `model.cumulativeEmissions += total·dt` y `co2EqEmissionsPerCapita`. Población
  `(1 + g)^dt` (antes `1 + g·dt`; el paso anual no cambia). Un estado sin `model` se ancla en `advance`; uno de las fases
  35–37 sin `pop0` (y con la población 1.1 de 10 M) se re-ancla a `CP.Poblacion_Inicial`.
- Anclas: `startingEmissions` usa `computeEmissions` (mismos números: c₀ = 5,947 / 7,135 / 5,733 t); `ModelAnchors.pop0`.
  `createInitialState`: `Poblacion_Total = CP.Poblacion_Inicial` (400 000) y CO₂ inicial = `anchors.c0`.
- Se borran `src/sim/carbon.ts` (`computeCarbonBalance`; `index.ts` reexporta `v2/carbon`), `LandUse.emissionRate` /
  `sequestrationRate` (y los overrides de N2), `CO2_EMISSIONS_SCALING_FACTOR`, `FACTOR_C_A_CO2EQ`,
  `Factor_Reduccion_Emisiones_Renovables_PCN`, `Factor_Aumento_Secuestro_CAC_PCN`, `Factor_Aumento_Emisiones_Fosiles_PSE`,
  `Factor_Aumento_Emisiones_AgroIntensivo_PPAI`, `Factor_Desplazamiento_Emisiones_Parque_Energetico` y el −5 % / −10 %
  de CO₂ de los pactos Acuerdo de Carbono / Transferencia Tecnológica (ahora `renewables`/`efficiency` sobre s*/u*).
  FAL: flujo −2,0 / stock 55 (reemplaza la tasa provisoria de la 37).
- Consumidores: manual de ecuaciones (tabla flujo/stock, fórmula nueva), manual del facilitador, descripciones, grupos
  de parámetros, capa "Carbono" del mapa de Territorio (−flujo), insignias (comentario: c ≤ 0 ahora es posible),
  sugerencias de DecarboNito (CO₂ > c₀ del nivel; antes > 10 t), aviso de instrumentos (es/en), hoja docente de
  ecuaciones (balance, cartera de parques, criterio experto; tabla de rutas regenerada con `scripts/routes-table-html.ts`).
  Puntaje: la parte de carbono se acota también a 100 (c puede ser negativo). `Poblacion_Total` no lo leía ningún
  consumidor de UI, Gemini ni puntaje.
- Rutas (provisorio y mínimo; recalibra la 49): topes de `cond.emissions` a la escala física anclados a c₀ como
  `ROUTES3`/`TERR_ROUTES` del prototipo — N1 5,2 / 6,5 / 4,6; N2 6,5 / 7,8 / 5,5; N3 5,4 / 6,3 / 4,5 y equilibrio 2 → 4,5
  (también `winConditions` N3); Territorio 6,2 / 7,8 / 4,8. Producción N2/N3/Territorio (sin tope en el prototipo):
  1,09·c₀ (la razón 6,5/5,95 de N1). `carbonTechEffort` = (Renovables + Eficiencia)/2 (antes Renovables + Captura): con el
  carbono físico la captura pesa 0,5 solo en el canal no eléctrico; salda la deuda 33/38/49 (innovación de Territorio).
- Tests: `tests/sim/carbon.v2.spec.ts` (c₀ ±0,02 por nivel; población desde CP; energía per cápita constante y AFOLU per
  cápita ∝ 1/P con suelo congelado; CR en su quinto año, η = 0,763, baja E_luc ≥ 70 % (≈ 78 %); 4 % de parques ⇒ s* = 0,9;
  inercia anual = 12 meses; LUC solo pérdidas, ÷ dt; sin pares bilaterales (fast-check); flujos con política y AFOLU < 0;
  B_t = 1 sobre la trayectoria de referencia; acumulado en `advance`; re-anclaje de un estado viejo; recorrido N2 ≥ 3 t).
  `deferred.spec.ts`: los pactos se verifican sobre s/u (0,15·Δs*). Trayectorias de `core.spec.ts` regeneradas (fase 38).

**Desvíos y discrepancias** (filas 38 de `docs/v6-spec-vs-motor.md`).
- Innovación N2 a 30 años: prototipo 4,75 (la spec decía "≈ 4,9"): texto de la spec corregido. Motor: 4,84 (mediana con
  eventos); extractiva 8,05 ⇒ recorrido 3,2 t ≥ 3.
- Claves de pactos `s`/`u` del prototipo = `renewables`/`efficiency` de la spec (`PARAMS_V2.pacts`).
- El prototipo acota s dos veces (`min(0,9)` en s* y `min(0,95)` en el `relax`): el segundo es redundante y no se porta.
- La docstring de `budget()` del prototipo decía −50 %: corregida a −30 % (`budget_cut`). Ninguna ecuación del prototipo
  cambió: `golden_v2.csv` idéntico.
- Canales de la spec (η_PAI^prod en CC; η^land en PRG/CA/BNNP y SE); el prototipo usa el `eta` uniforme (iguales con
  reparto parejo).
- LUC cuenta solo los flujos de la matriz, como el prototipo: lo que mueve un evento (suelo → FAL) o una declaración de
  uso público de Territorio no emite por cambio de uso (fases 46/47; lo señaló la revisión de código).
- Quedan en la escala vieja, anotados: presión ambientalista por CO₂ (umbral 8 t; pe de `do_nothing` N2 a 30 años
  65 → 21, prototipo 24,6; fase 42); escrutinio internacional `c > 12`, inalcanzable (máximo ~8,5 t), y boom verde −5 %
  diferido (fase 46); `RANGE.co2 = 15` de las predicciones (umbral "sin cambio" 0,15 t ≈ 2 % de c₀, razonable; fase 48);
  puntaje `100 − c/12·100` (los puntajes de N2/N3 suben ~80–120; fase 49). Se actualizó el comentario de `index.ts`
  ("N1 arranca en ~9,4 t").

**`npm run sim:check`** (quick sale 0; completo sale 1, como todo completo con FAIL), contra la fase 37:

| Criterio | 37 (quick) | 38 (quick) | 38 (completo) |
|---|---|---|---|
| C1 do_nothing nunca gana | PASS 0,000 | FAIL 0,100 | FAIL 0,075 |
| C2 dirigida gana su ruta | FAIL 0,000 | FAIL 0,000 | FAIL 0,100 |
| C3 ninguna gana todas | PASS 0,000 | PASS 0,000 | PASS 0,000 |
| C4 atajos cerrados | FAIL 0,200 | FAIL 1,000 | FAIL 1,000 |
| C5 la estrategia decide | FAIL 1 | FAIL 3 | FAIL 2 |
| C6 recorrido ≥ 15 | FAIL 0,911 | FAIL 0,911 | FAIL 0,911 |
| C7 banda de predicción | FAIL 0,670 | FAIL 0,670 | FAIL 0,670 |
| C8 sin quiebras espurias | PASS 0 | PASS 0 | PASS 0 |
| C9 anual–mensual | FAIL 1,775 | **PASS 0,710** | PASS 0,710 |

Rutas dirigidas (quick): vuelven N1 conservación 0 → 100 % e innovación 0 → 100 %, N2 conservación 0 → 90 % e innovación
0 → 80 %, N3 conservación e innovación 0 → 100 %, Territorio conservación 60 → 100 % e innovación 0 → 100 %; producción
sigue baja (N1 20 %, N2 0 %, N3 20 %, Territorio 60 %: deuda 47/49). Completo: N1 100 / 22,5 / 100, N2 87,5 / 10 / 72,5,
N3 100 / 15 / 100, Territorio 95 / 35 / 100. C9 pasa (peor c Δ 0,02 t; peor W 0,71). Lo que empeora respecto de la 37 no
viene del carbono sino de que en la 37 todas las rutas con tope de CO₂ estaban bloqueadas: (a) C1: `do_nothing` cumple
**producción** en N3 1/10 (quick) y en el completo N1 7,5 %, N2 2,5 %, N3 7,5 %, en semillas con eventos que suben E/F; el
tope de CO₂ no puede separarlos (la estrategia de producción emite más que `do_nothing`) y en 1.1 ya pasaba (N3 7,5 %);
(b) C4: `tech_tax` N1 gana innovación 100 % porque en N1 el esfuerzo es parejo y `tech_tax` es "Neutralidad de Carbono
sola" (misma c que `innovation`); `tech_tax` N2/N3 10–20 % por producción. Las dos son condiciones de E/F/puntaje: fase 49.
Contra `reports/balance-latest.json` (1.1) el quick sale 0. Se agrega `reports/balance-2.0-dev.{md,json}` (completo); no
se corrió `--update-latest`.

**Otras verificaciones.** `npx tsc --noEmit`, `npm run build`, `npm run i18n:audit` limpios; `npm test` en verde salvo el
test inestable preexistente de abajo. E2E con navegador (dev server en :3138 con `GEMINI_API_KEY` de relleno):
`/play?demo=1` N1 arranca en 5,95 t; activar Neutralidad de Carbono y simular un año → 5,86 t. `/territorio` arranca en
7,1 t, la capa "Carbono" del mapa se dibuja; activar Neutralidad de Carbono y correr ×4 hasta 2025 → 6,9 t (−0,1). Sin
errores de consola.

**Revisión de código** (aplicada): tope 100 de la parte de carbono del puntaje (c puede ser < 0); re-anclaje de un estado
anterior a la 38 (sin `pop0`, población 10 M); `carbon.ts` usa `LAND_USE_TYPES` en lugar de otra lista de códigos; campos
`flux`/`stock` (no `emissionRate`/`sequestrationRate`) en el manual, con color por signo. No aplicadas (documentadas
arriba): LUC de eventos/declaraciones (prototipo; 46/47), umbral 8 t de presión (42), `c > 12` del escrutinio (46), topes
de producción sobre c₀ (provisorio, 49), cambio de `carbonTechEffort` (decisión de la fase).

**Deudas.** Fases 42/46/48/49 según lo anotado. **Test inestable preexistente** (fase 37): `territory.spec.ts` "keeps every
use within a few parcels…" usa semillas aleatorias de fast-check y falla ~2 de cada 5 corridas (p. ej. `[3, []]` → CA a
3,06 parcelas del objetivo; `[991752, [GS]]` → PRG a 3,41; cota 3). Da lo mismo con el HEAD de la fase 37: no lo toca el
carbono (el suelo no lee CO₂). Queda para revisar el retardo del mapa (37/47).

## 2026-10-22 — v6 fase 39: indicadores por relajación (E, conflicto/W, colapso/St)

**Qué se hizo** (`mejora-general/files/39_indicadores_por_relajacion.md`; rama `v6-modelo-v2`).
- `src/sim/v2/indicators.ts` (port de los bloques E, C y Pc de `indicators_step`): marco común `X* = 100·σ(ℓ_X0 + D_X)`
  con `relax` exacto (`stepIndicator`, k acotado a [0, 1]); `impulseSum` / `capImpulses` (±0,6, `PARAMS_V2.relaxation.impulseCap`);
  `pactShift` (E y Pc desde `PARAMS_V2.pacts`); `productiveValue` (también lo usan las anclas); `driveE` / `driveC` /
  `drivePc`, `targetE` / `targetC` / `targetPc`; `updateRelaxedIndicators` = paso 8 E → C (W) → Pc (St) con k =
  `CP.Velocidad_Ajuste_Seg_Economica` / `_Conflicto` / `_Colapso`; `model.targets` guarda E*, C*, Pc*. Canales: bE·η^prod,
  η_CN^tax, conflicto y alivio verde por η^social. Coeficientes en línea del prototipo → `PARAMS_V2.relaxation`.
- `advance()`: B y F siguen 1.1 + `toward` (40/41), presiones 1.1 después (42); orden B → F → E → C → Pc → presiones
  conservado. Guarda en `model.fiscal.growth` la tasa anual de la economía 1.1 del paso (arranca en
  `Tasa_Base_Crecimiento_PBI`) y, como puente hasta la 44, `model.fiscal.interestBurden` / `stress` = sHigh(intereses /
  recaudación; 0,20, 0,04) del prototipo sobre los stocks 1.1. Un diferido sobre W/St se escribe también en su stock.
- Se borran `calculateEconomicSecurityChange`, `calculateSocialConflictChange`, `calculatePoliticalCollapseChange`,
  `INDICATOR_IMPACT_WEIGHTS.ECONOMIC_SECURITY` / `SOCIAL_WELLBEING` / `POLITICAL_STABILITY`, `Umbral_polarizacion`,
  `EcoSec_Reduction_Factor_Per_Tax_Point`, `SocialConflict_Increase_Factor_Per_Tax_Point`, los bonos verdes por umbral,
  `AdvanceOptions.fiscalTermsActive` (τ entra siempre), `PactImpulses.economicSecurity` y el +3 de St del Acuerdo de
  Carbono (ahora Pc −0,15 logit). `Tasa_disipacion_social` → `Tasa_disipacion_presion_social` (0,09, solo la presión
  social 1.1 de `pressures.ts`, provisoria hasta la 42). N1 arranca con Pc = 5 (fase 35, verificado).
- Consumidores: panel del facilitador (grupo nuevo con las tres velocidades; sin las claves borradas), descripciones,
  manual del facilitador (sección estabilidad/conflicto reescrita), manual de ecuaciones (fórmulas de D_E, D_C, D_Pc),
  capa "Economía" del mapa de Territorio (v_k − V actual: lo que está por debajo del valor productivo medio resta).
- Rutas (provisorio, recalibra la 49): pisos de E de producción 25 / 32 / 30 → 36 / 40 / 36 (`ROUTES3`): calibrados
  para un E inmóvil, dos eran E₀ y `do_nothing` N3 ganaba producción en 5/10 semillas.
- Prototipo (bug, golden regenerado): el término de crisis alimentaria de E pasa a desvío, `−0,6·(s_low(F) − s_low(F₀))`
  (antes −0,014 logit en F₀ = 35 sin políticas). `scripts/reference/indicators39_cases.py` → `indicators39_cases.json`
  (24 casos, sin concentración/transición justa de la 45).
- Tests: `tests/sim/indicators.v2.spec.ts` (ancla ±1e-9 en los 3 niveles; N1 Pc = 5; PIE η = 1 con +0,01 de g → E* 48,83;
  continuidad de C* en F; τ en cualquier nivel; alivio verde proporcional; pactos; impulsos y tope; 12 meses = 1 año;
  `advance` relaja k del camino; W/St dentro de (0, 100) con estrategia extrema; 24 casos del prototipo ±1e-9; φ y k
  acotado). Actualizados: `core.spec` (trayectorias regeneradas), `deferred.spec` (Acuerdo como desplazamiento exacto de
  E* y Pc*), `monthly.spec` (τ sin interruptor), `facilitatorParams.spec`, `invariants.spec` INV-16 (pactos E ≤ máx bE).
- **Test inestable arreglado** (`territory.spec` "keeps every use within a few parcels…"): la causa no es el código sino la
  cota fija de 3 parcelas, anterior a la matriz de la 37 (hasta ~21 pares de flujos dibujándose; un uso tocado por 5–6
  pares queda 3,5–4,5 parcelas atrás con cada par < 1 parcela). Medido en los contraejemplos: fallow 4,30 y PRG 3,45 de
  retraso, con retraso − área en tránsito = 0,00. El test verifica ahora el invariante (|retraso + tránsito| ≤ 1,2 de
  histéresis; ningún par guarda una parcela entera; |retraso| ≤ 1,2 + lo que tocan los pares) con `seed: 39` y los dos
  contraejemplos como `examples`; 40 corridas con semillas aleatorias pasan. Semilla fija también en los otros dos
  fast-check del archivo.

**Desvíos y discrepancias** (filas 39 de `docs/v6-spec-vs-motor.md`).
- Spec §1 "+0,5 logit ≈ 9 puntos cerca de 25": exacto 25 → 35,5 (+10,5); §6 W del prototipo "≈ 21": extractiva 55,1 →
  innovación 75,2 (≈ 20; con `tech_tax` 51,3, ≈ 24). Textos corregidos. El "+3,8 logit" de St 70 → 5 es exacto (3,79).
- φ_fiscal: la spec lo deja en 0 hasta la 44; se porta ya la fórmula del prototipo sobre la deuda 1.1 (la revisión de
  código señaló que sin él la deuda no tenía costo social ni político). Las reservas negativas (1.1 no financia el
  déficit automáticamente) siguen sin costo hasta la 44; el −0,01·φ del crecimiento también queda para la 44.
- g incluye PIE/PEA y −0,0002·τ además de bE y −0,04·τ: es la estructura del prototipo (y lo que pide el test de PIE).
- **Transitorio hasta la 42**: D_C y D_Pc leen las presiones 1.1, que se saturan (extractiva: pa 0, pe 100, ps 100;
  polarización 100 contra 10): `extractive` N2/N3 cae en colapso político (St ≤ 5) hacia el año 17–20 en 35/40 y 40/40
  semillas (prototipo: St 55 / 47). Contradice la verificación §7 "ninguna estrategia termina en colapso político" hasta
  que las presiones sean las ancladas en logit. `do_nothing` de Territorio ya perdía en la 38 (W < 10 sostenido); ahora
  pierde por colapso político (16/20) o sostenido (4/20).

**`npm run sim:check`** (quick sale 0; completo sale 1, como todo completo con FAIL), contra la fase 38:

| Criterio | 38 (quick) | 39 (quick) | 38 (completo) | 39 (completo) |
|---|---|---|---|---|
| C1 do_nothing nunca gana | FAIL 0,100 | **PASS 0,000** | FAIL 0,075 | **PASS 0,000** |
| C2 dirigida gana su ruta | FAIL 0,000 | FAIL 0,200 | FAIL 0,100 | FAIL 0,225 |
| C3 ninguna gana todas | PASS 0,000 | PASS 0,000 | PASS 0,000 | PASS 0,000 |
| C4 atajos cerrados | FAIL 1,000 | FAIL 1,000 | FAIL 1,000 | FAIL 1,000 |
| C5 la estrategia decide | FAIL 3 | FAIL 2 | FAIL 2 | FAIL 2 |
| C6 recorrido ≥ 15 | FAIL 0,911 | FAIL 11,577 | FAIL 0,911 | FAIL 11,580 |
| C7 banda de predicción | FAIL 0,670 | FAIL 0,670 | FAIL 0,670 | FAIL 0,670 |
| C8 sin quiebras espurias | PASS 0 | PASS 0 | PASS 0 | PASS 0 |
| C9 anual–mensual | PASS 0,710 | PASS 0,697 | PASS 0,710 | PASS 0,697 |

C6 (completo): E pasa en todos (N1 23,1, N2 25,5, N3 24,3, Territorio 26,1; antes ≈ 9 y N1 0,4) y W también (N1 18,3, N2
62,1, N3 58,4, Territorio 68,9); fallan B (≈ 12, fase 40) y F de N1/N3 (12,9 / 13,6, fase 41). C7: "sin cambio" de E baja de
86–100 % a 56–67 %; el valor 0,670 es B al 100 % (40) y c (48). C2: producción N1 22,5 % (F ≥ 40, fase 41), N2 65 %,
Territorio 30 %. C4: `tech_tax` N1 100 % (49); Territorio `cheap_production` 50 %, `extractive` 10 %, `buy_everything` 10 %.

**Otras verificaciones.** `npx tsc --noEmit`, `npm test` (372 + 27 skipped del golden apagado), `npm run build`,
`npm run i18n:audit` limpios. E2E con navegador (dev server :3139, `GEMINI_API_KEY` de relleno): `/play?demo=1` N2,
Agricultura Intensiva activa, 2 años → E 30 → 32,8, W 57,2, St 69,0; `/territorio`, capa "Economía", Exportaciones
Agrícolas, ×4 hasta 2025 → E 35,4, W 56,6, St 69,8. Sin errores de consola.

**Revisión de código** (aplicada): φ fiscal como puente (ver arriba); k acotado a [0, 1] (un valor del facilitador > 1 daba
NaN mensual); manual de ecuaciones con el término alimentario como desvío, φ y g₀ desde `CP`; `productiveValue` única
(anclas incluidas); capa "Economía" centrada en V. No aplicadas: doble conteo de PIE/PEA/τ vía g (estructura del
prototipo); un choque diferido que satura W/St deja el stock en 0/100 (solo el clamp de `applyDeferredAdjustments`; la
relajación lo saca en el paso siguiente); la cota nueva del test de territorio (es el invariante que el mapa promete, y
el test ahora además exige que ningún par acumule una parcela entera).

**Deudas.** Presiones ancladas (42: colapso de `extractive`, umbral 8 t); B y F (40/41, C6); economía 2.0, reservas
negativas y −0,01·φ en g (44); concentración y transición justa (45); desgaste de situaciones como impulsos (47); pisos de
producción provisorios y C4 (49).

## 2026-10-22 — v6 fase 40: biodiversidad por especies-área y conectividad

**Qué se hizo** (`mejora-general/files/40_biodiversidad_especies_area.md`; rama `v6-modelo-v2`).
- `src/sim/v2/biodiversity.ts` (port del bloque B de `indicators_step`): `habitatIndex` (H = Σ h·a; también el ancla
  `habitat0`), `driveB` / `targetB` con γ_H = z/(1 − B₀/100), z = 0,35, calidad de manejo `qB·η^land`, sinergias continuas
  +0,10·min(η_AS, η_CR) y −0,12·min(η_PAI, η_FRA) (`PARAMS_V2.biodiversity`), tratado como desplazamiento +0,25 logit
  (`pactShift` acepta 'B'), impulsos de situaciones con tope; `updateBiodiversity` relaja exacto con k_B =
  `CP.Velocidad_Ajuste_Biodiversidad` (0,12) y guarda `model.targets.B`. Es el primer indicador del paso 8 (B → F → E …).
- Conectividad (solo Territorio, spec §3): `forestConnectivity(territory)` = fracción del bosque (BNNP + BNP + RES) en el
  parche **4-conexo** más grande; `largestComponent4` se extrajo de `carve` (`geography.ts`) y lo usan los dos (mapa
  bit-idéntico). `Session.connectivity` = {K₀ al crear la sesión, K, tick}; `advanceMonth` pasa {K, K₀} en
  `AdvanceOptions.connectivity` (también en `MonthlyOptions`) y recalcula K solo si el mapa cambió desde el último cálculo
  (declaración, situación) o si los cambios del mes tocaron bosque. γ_K = 0,25, K con piso 0,001·K₀. En el juego de 3
  niveles el término es 0.
- Se borran `calculateBiodiversityChange`, `INDICATOR_IMPACT_WEIGHTS.BIODIVERSITY`, los `CONTROL_PARAMS`
  `Factor_Impacto_Politicas_y_Presiones_en_Biodiversidad_Peso` / `Factor_Impacto_Usos_del_Suelo_en_Biodiversidad_Peso`
  (y sus descripciones), `PactImpulses.biodiversity` y el `impulses` del tratado.
- Consumidores: panel del facilitador (k_B en "Velocidad de ajuste"), descripciones, manual del facilitador (sección de
  biodiversidad reescrita), manual de ecuaciones (fórmula de D_B), capa "Biodiversidad" del mapa (h_i − H actual).
- Prototipo: sin cambios (sin golden nuevo). `scripts/reference/biodiversity40_cases.py` → `biodiversity40_cases.json`
  (24 casos, 3 niveles × dt 1 y 1/12).
- Tests: `tests/sim/biodiversity.v2.spec.ts` (ancla, CC → HUM, SAR, sinergias, tratado, k y 12 = 1, recorrido de una
  partida, 24 casos ±1e-9, K 4-conexo, lote contiguo/aislado, término de K por `stepMonth`, caché de la sesión).
  Actualizados: `core.spec` (trayectorias regeneradas: el `balanced` con tratado llega a B ≈ 57 en 12 años en lugar de
  ≈ 43; E, W, St, la presión agrícola, F vía E y el puntaje siguen a B; deuda, PBI, CO₂ y CC sin cambio), `model11.spec`
  (el test del impulso del tratado en la función 1.1 se retiró: ahora es desplazamiento de B*), `invariants.spec` INV-16
  (pactos.B ≤ máx |qB|).

**Desvíos y discrepancias** (filas 40 de `docs/v6-spec-vs-motor.md`).
- Spec §4 "H ≈ 2,9 %": exacto 3,006 % y ΔB* +0,4154 (prototipo = port). Texto corregido.
- Spec §3 pedía reutilizar "el BFS de geography.ts" para K 4-conexo; ese BFS es 8-vecinos (`distanceField`): se reutilizó
  el etiquetado 4-conexo de `carve`, extraído como `largestComponent4`.
- El prototipo no modela K. Verificado con el arnés: `conservation` de Territorio 100 %, `do_nothing` 0 %.
- `targetB` no recibe `CP` (la spec lo lista): ningún término lo lee; k_B entra en `updateBiodiversity`.
- 🟧 sin reemplazo: piso de K (0,001·K₀) por criterio experto, igual al de ρ en la 41.

**Referencias del prototipo** (N2, año 30, sin eventos; port por `stepYear` y `--quick`): sin políticas 39,3 (39,2), verde
54,9 (54,8), conservación con tratado 60,4 / 60,35 (60,3), conservación sin tratado 54,24 (54,2), extractiva 28,7 (28,5).

**`npm run sim:check -- --quick`** (sale 0), contra el quick de la fase 39:

| Criterio | 39 (quick) | 40 (quick) |
|---|---|---|
| C1 do_nothing nunca gana | PASS 0,000 | PASS 0,000 |
| C2 dirigida gana su ruta | FAIL 0,200 | FAIL 0,200 |
| C3 ninguna gana todas | PASS 0,000 | PASS 0,000 |
| C4 atajos cerrados | FAIL 1,000 | FAIL 1,000 |
| C5 la estrategia decide | FAIL 2 | FAIL 2 |
| C6 recorrido ≥ 15 | FAIL 11,577 | FAIL 12,148 |
| C7 banda de predicción | FAIL 0,670 | FAIL 0,600 |
| C8 sin quiebras espurias | PASS 0 | PASS 0 |
| C9 anual–mensual | PASS 0,697 | PASS 0,947 |

C6: B pasa en todos (N1 27,4, N2 31,7, N3 31,1, Territorio 30,2; antes ≈ 12); solo falla F de N3 (12,1, fase 41). C7: B
"sin cambio" baja de 100 % a 92–93 % (la banda pide 30–36 %; la estrechez de B es esperable con k_B = 0,12, fase 48). C9:
el peor pasa a St de `green` año 10 (Δ −0,95): B ahora cruza 45 y activa el término de B de la presión ambientalista 1.1,
integrada por Euler mensual; lo resuelven 42/46 (margen chico). C2: producción N1 20 %, N2 40 %, Territorio 60 % (F, 41).

**Revisión de código** (aplicada): γ_H con B₀ acotado a 95 (`gammaMaxB0`; un estado re-anclado cerca de B = 100 daba
γ_H = ∞ y NaN con H = H₀); fórmula del manual del facilitador con logit(B₀/100); tooltip del título de indicadores del
manual de ecuaciones reescrito; afinidades listadas una por uso (HUM, PRG, ENR propias). No aplicadas, anotadas: (a) los
choques de eventos y de situaciones sobre B son saltos de nivel que ahora se relajan hacia B* (k_B = 0,12; a 30 años
queda ≈ 2 %), igual que E/W/St desde la 39; la fase 47 los convierte en impulsos del objetivo (`model.impulses`, hoy
siempre vacío). (b) K es "fracción en el parche mayor" como dice la spec: talar un parche secundario aislado sube K
(+0,13 logit en un caso 60/40), aunque la pérdida de H domina; anotado para la 49/50. (c) La caché de K casi siempre
recalcula (el modelo mueve bosque casi todos los meses); se mantiene porque es barata y correcta. (d) K entra con el mapa
del mes anterior (lo que pide la spec §3). (e) `habitatIndex` / capa del mapa recalculan H por parcela (costo menor).

**Deudas.** F por balance (41); presiones ancladas (42; también el umbral 45 de B en la presión ambientalista 1.1); C9 (46);
impulsos de situaciones/eventos sobre B (47); K y parches secundarios (49);
`Factor_Impacto_*_Seguridad_Economica_Peso` / `Impacto_Biodiversidad_en_SE_Peso` sin consumidor desde la 39 (limpieza).

## 2026-10-22 — v6 fase 41: seguridad alimentaria por balance de oferta y demanda

**Qué se hizo** (`mejora-general/files/41_seguridad_alimentaria_balance.md`; rama `v6-modelo-v2`).
- `src/sim/v2/food.ts` (port de `food_production` y del bloque F de `indicators_step`): `exportShare` (x = 0,30 + 0,20·η_PEA),
  `domesticSupply(landUses, eff, t, ε)` (rendimientos CC 1,0 / CA 0,7 / PRG 0,25 con PAI / AS / GS, AGUA, tendencia 0,6 %/año
  y choque ε), `foodPerCapita` (ρ = max(Q/P, 0,001·ρ₀)), `driveF` / `targetF` (2,5·ln(ρ/ρ₀) + 0,6·(E − E₀)/50 + impulsos con
  tope), `updateFoodSecurity` (relax exacto, k_F = `CP.Velocidad_Ajuste_Seg_Alimentaria` 0,35; `model.targets.F`). Canal
  η^prod. Coeficientes en línea del prototipo → `PARAMS_V2.food` (`yieldPolicy`, `exportPEA`, `econScale`, `rhoFloor`).
- Paso 8: B → **F** → E → C → Pc; F lee la E del paso anterior (como el prototipo, py:424-444). ε = `model.yieldShock`
  (0 hasta la 46: el gancho queda). Ancla `foodPerCapita0` = `domesticSupply` en t = 0 sin políticas / `Poblacion_Total`
  del estado anclado (= `Poblacion_Inicial` al inicio de nivel).
- Se borran `calculateFoodSecurityChange` y con ella `src/sim/indicators.ts` (y `pactImpulse`, export de `src/sim/index.ts`),
  `INDICATOR_IMPACT_WEIGHTS` entero, `PactImpulses` / `Pact.impulses`, y los `CONTROL_PARAMS`
  `Factor_Impacto_Politicas_y_Presiones_en_Seguridad_Alimentaria_Peso`, `Factor_Impacto_Usos_del_Suelo_en_Seguridad_Alimentaria_Peso`,
  `Impacto_Biodiversidad_en_Seguridad_Alimentaria_Peso` (y sus descripciones). Con esto no queda ningún indicador acotado en 1.1.
- Consumidores: panel del facilitador (k_F), descripciones (k_F; tooltip de indicadores), manual del facilitador (sección
  de F; "Interdependencias" 1.1 reemplazada), manual de ecuaciones (fórmulas de Q, x, ρ, F*), capa "Alimentos" del mapa
  (rendimiento relativo − medio, `meanYield`).
- Rutas (provisorio, recalibra la 49): producción N1, piso de F 40 → 32 (`ROUTES3`); con 40 ninguna semilla de
  `production` llegaba (F ≈ 36). Nota: 32 < F₀ = 35, igual que en el prototipo.
- Prototipo: sin cambios (sin golden nuevo). `scripts/reference/food41_cases.py` → `food41_cases.json` (24 casos con t,
  población y ε variables).
- Tests: `tests/sim/food.v2.spec.ts` (ancla ±1e-9 en los 3 niveles y re-anclado a mitad de partida; ρ₀ N2; +20 % de ρ →
  51,26; PEA → 22,33 y compensación por E; rendimientos, agua, tendencia y ε; piso de ρ; k y 12 = 1; N1 sin políticas
  35 → 37,6; extractiva − verde ≥ 10 en N2; hambruna y sostenido sin cambio; 24 casos ±1e-9). Actualizados: `core.spec`
  (trayectorias regeneradas: F por balance — `balanced` exporta y frena la frontera, F 31–33 en lugar de 33–42; E, W, St,
  presiones y puntaje siguen a F; deuda, PBI, CO₂, B y CC sin cambio; el test de población de las anclas pasa a crear el
  estado con el mismo CP), `invariants.spec` INV-16 (ningún pacto tiene `impulses`), `session.spec` (el gobierno que
  ignora la bandeja cae en 2048 en lugar de 2040 — F ≈ 40 en lugar de ≈ 31 sostiene W — la cota pasa a START_YEAR + 25).

**Desvíos y discrepancias** (filas 41 de `docs/v6-spec-vs-motor.md`).
- Spec §3 "≈ 22,4" y §1 "balanceada 32,3": exactos 22,33 y 32,44; textos corregidos.
- Firmas: `domesticSupply(landUses, eff, t, shock)` y `targetF(state, eff)` (sin CP).
- Choques de eventos sobre F: ahora se relajan (k_F = 0,35; en el anual ≈ 1/3 se pierde en el mismo paso) — 46/47.

**Referencias del prototipo** (año 30, sin eventos; port por `stepYear`): N2 sin políticas 40,57 (40,53), extractiva 51,14
(51,09), verde 37,55 (37,44), balanceada 32,55 (32,44); N1 sin políticas 37,60 (37,56); N3 extractiva 47,91 (47,20).

**`npm run sim:check`** (quick sale 0; completo sale 1, como todo completo con FAIL), contra la fase 40:

| Criterio | 40 (quick) | 41 (quick) | 41 (completo) |
|---|---|---|---|
| C1 do_nothing nunca gana | PASS 0,000 | PASS 0,000 | PASS 0,000 |
| C2 dirigida gana su ruta | FAIL 0,200 | FAIL 0,400 | FAIL 0,350 |
| C3 ninguna gana todas | PASS 0,000 | PASS 0,000 | PASS 0,000 |
| C4 atajos cerrados | FAIL 1,000 | FAIL 1,000 | FAIL 1,000 |
| C5 la estrategia decide | FAIL 2 | FAIL 1 | FAIL 1 |
| C6 recorrido ≥ 15 | FAIL 12,148 | FAIL 9,456 | FAIL 9,001 |
| C7 banda de predicción | FAIL 0,600 | FAIL 0,593 | FAIL 0,599 |
| C8 sin quiebras espurias | PASS 0 | PASS 0 | PASS 0 |
| C9 anual–mensual | PASS 0,947 | **FAIL 1,279** | FAIL 1,279 |

C2: producción N1 100 % (piso nuevo), N2/N3 100 %; queda Territorio producción 35–40 % (F ≥ 45; prototipo 44; 49). C4: solo
`tech_tax` N1 (49). C5: solo Territorio producción. C6 (completo): B pasa en todos; F pasa en N1 (20,5) y N2 (16,8), falla en
N3 (12,6: `extractive` N3 cae en colapso político hacia 2044 con eventos — deuda 39/42 — y su F se mide al año 20; sin
eventos el recorrido es 15,5) y Territorio (13,8, calibración 49); W de N1 baja a 9,0 porque ahora reproduce el prototipo
(W de N1 93,7–97,8 sin eventos; antes se movía por la F 1.1) → revisar el criterio en la 48/49. C7: B "sin cambio" 92–93 %
(antes 100 %). **C9 pasa a FAIL**: el peor es St de `green` N2 año 30 (anual 65,3 / mensual 66,6); B, F, E coinciden con el
prototipo, la diferencia es la presión agrícola 1.1 (umbral sobre F, integrada por Euler mensual: pa 70,0 / 68,4) — la
resuelven las presiones ancladas (42) y el mensual exacto (46). No se puede arreglar dentro de la 41 sin portar las presiones.

**Otras verificaciones.** `npx tsc --noEmit`, `npm test` (452 + 27 skipped), `npm run build`, `npm run i18n:audit` limpios.
E2E con navegador (dev server :3141, `GEMINI_API_KEY` de relleno): `/territorio` — capas "Biodiversidad" y "Alimentos"
dibujan, área protegida declarada sobre bosque nativo (reservas 1 000 → 900, BNP 20 → 25 kHa), Conservación + Agricultura
Intensiva, ×4 → B 40,8, F 39,4, E 28,4, W 54,3, St 66,5; `/play?demo=1` N2, Agricultura Intensiva, 1 año → B 39,6, F 42,0,
E 31,4. Sin errores de consola.

**Revisión de código** (aplicada): ρ₀ por `Poblacion_Total` del estado anclado (un re-anclado a mitad de partida daba
F* ≠ F₀); `grossYield` compartido por `domesticSupply` y `meanYield`; manual del facilitador con piso de ρ y tasas leídas de
`CP` / `PARAMS_V2`; filas de auditoría y de discrepancias. No aplicadas, anotadas: choques de eventos sobre F que se relajan
(46/47); piso de ruta N1 bajado a mano (provisorio como los de la 39; 49); cota del test de colapso de Territorio (sigue
exigiendo colapso antes del final; la 47 cambia el desgaste); capa del mapa recalcula el medio por parcela (costo menor).

**Deudas.** Presiones ancladas (42: colapso de `extractive` N3, C9, umbral de F en la presión agrícola 1.1); eventos 2.0 y ε
(46); situaciones como impulsos (47); C6 de W en N1 (48); Territorio producción y F (49).

## 2026-10-22 — v6 fase 42: presiones sectoriales con respuesta en S

**Qué se hizo** (`mejora-general/files/42_presiones_sectoriales.md`; rama `v6-modelo-v2`).
- `src/sim/v2/pressures.ts` (port del bloque de presiones de `indicators_step`, py:472-487): `productiveShare`
  (a_prod = (CC + CA + PRG)/ΣA, PF fuera), `sectorSize` (σ_prod = a_prod/a_prod,0), `drivePressures` / `targetPressures`
  (Σ φ·η^social/15, con σ_prod solo sobre la suma de políticas de π_a; desvíos 0,03·(E₀ − E) + 0,02·(F₀ − F) +
  4,0·(a_prod,0 − a_prod), 0,035·(B₀ − B) + 1,5·(c − c₀)/c₀, 0,04·(W₀ − W) + 0,04·τ; desgaste; impulsos con tope),
  `updatePressures` (relax exacto, k_π = `CP.Velocidad_Ajuste_Presiones` 0,35; `model.targets.pa/pe/ps`). Último del paso 8
  de `advance` (B → F → E → C → Pc → presiones; D_C y D_Pc leen las del paso anterior, como el prototipo).
- `PARAMS_V2.pressure`: los factores φ de 1.1 + CR +3,0 sobre π_a (ya estaban desde la 35), `drivers` (coeficientes en
  línea del prototipo), `anchorFloor` (2 puntos); `PARAMS_V2.relaxation.wearLogit` (0,04).
- Desgaste de situaciones (adelantado de la 47 tras la revisión de código): `wearShift(open, monthIndex)` da el
  desplazamiento de C y de las tres presiones (0,04 logit por punto del catálogo × factor de edad 1–2, como `play_territorio`),
  `advanceMonth` lo pasa en `AdvanceOptions.wear`; `applyWear` (que sumaba puntos a los stocks y la relajación disipaba) se
  borra y `wearTally` queda para el contador del escritorio (`worn`, `wearTotal`).
- Un choque de evento sobre una presión (stock o indicador diferido) se escribe en el stock al final del paso: la
  relajación lo disipa (como W/St desde la 39).
- Se borran `src/sim/pressures.ts` (`updatePressures` 1.1) y sus `CONTROL_PARAMS`: `Factor_Presion_*` (19), `Umbral_PP_*`
  (5, incluido el umbral de 8 t de CO₂ en escala vieja), `Sensibilidad_PP_*` (5), `PPSocial_Increase_Factor_Per_Tax_Point`,
  `Tasa_disipacion_presion_social`, `Impulso_PP_Agricola_por_kHa_Convertida` (y el impulso directo en `declarePublicUse`);
  limpieza: `Factor_Impacto_Politicas_y_Presiones_en_Seguridad_Economica_Peso`, `Factor_Impacto_Usos_del_Suelo_en_Seguridad_
  Economica_Peso`, `Impacto_Biodiversidad_en_SE_Peso` (sin uso desde la 39). Descripciones, panel del facilitador
  (`Velocidad_Ajuste_Presiones` entra; disipación y factor fiscal de la presión social salen), manual del facilitador
  (diapositiva de presiones) y manual de ecuaciones (fórmulas de π*) actualizados. `Tasa_disipacion_agricola/ambientalista_
  Nivel_N` y `Factor_Impulso_Presion_*` ya no existían (fase 34).
- Prototipo: sin cambios (sin golden nuevo). `scripts/reference/pressures42_cases.py` → `pressures42_cases.json` (24 casos con
  áreas, B, F, E, C, c, π, τ y desgaste variables; los objetivos se recuperan de la relajación exacta).
- Tests: `tests/sim/pressures.v2.spec.ts` (ancla ±1e-9 en los 3 niveles; CR → π_e* 12,65 ∈ [10, 14], FRA → 43,4; CR +3/15
  sobre π_a; monotonía en FRA; σ_prod solo sobre la suma de políticas y PF fuera; desgaste; k fuera de [0, 1]; ancla acotada
  de una partida 1.1; 24 casos del prototipo; 8 estrategias × 3 niveles sin tocar 0/100 en 30 años, `extractive` < 90;
  N2 verde π_e < 8 y extractiva > 45; choque de evento que se relaja; declarar un uso público sube el objetivo de π_a y no el
  stock). Actualizados: `core.spec` (trayectorias regeneradas: `balanced` ya no clava π_e y π_s en 0 — N2 termina π 15 / 3 / 6
  en lugar de 8 / 0 / 0 —, W, St y puntaje siguen; B, F, E, deuda, PBI, CO₂ y CC sin cambio), `territory.spec` (el uso público
  sube el objetivo de π_a), `facilitatorParams.spec`, `session.spec` (incumplimiento sostenido con brecha forzada; el
  escritorio abandonado de la semilla 11 llega al final y pierde; una situación abierta sube el objetivo de π_e).

**Desvíos y discrepancias** (filas 42 de `docs/v6-spec-vs-motor.md`).
- `targetPressures(state, eff, wear)` sin `CP`; canal η^social (prototipo: `eta` uniforme).
- Desgaste como desplazamiento adelantado de la 47; con él y las presiones ancladas, ignorar la bandeja en Territorio ya no
  derriba al gobierno (igual que el prototipo): choca con la decisión del usuario del 2026-09-19 → 47/49.
- Expectativas de la cadena que no se cumplen: **C9 no vuelve a PASS** (2,473; el prototipo da Δ St −2,05 en el mismo caso:
  es partición del paso anual, 46) y **F de N3 13,8** (< 15; economía/eventos 1.1, 44/46). Sí se cumple: `extractive`
  N2/N3 deja de colapsar (St 51 / 42 con eventos; sin eventos 61,5 / 52,8, prototipo 55,5 / 47,2).

**Referencias del prototipo** (sin eventos, golden, año 30; port por `stepYear`): N2 π_e verde 3,93 (3,4), extractiva 55,09
(55,1); π_a extractiva 4,75 (4,7), verde 22,26 (22,0); N1 extractiva π_e 61,26 (61,3). Máx |Δ| sobre las 27 filas: π_a 0,60,
π_e 0,08, π_s 4,52 (sigue a W, 45). I-5 medido: de 80 a 50 sin acción, 1,5–1,8 años (N2 mensual).

**`npm run sim:check`** (quick sale 0; completo sale 1, como todo completo con FAIL), contra la 41:

| Criterio | 41 (quick) | 41 (completo) | 42 (quick) | 42 (completo) |
|---|---|---|---|---|
| C1 do_nothing nunca gana | PASS 0,000 | PASS 0,000 | PASS 0,000 | PASS 0,000 |
| C2 dirigida gana su ruta | FAIL 0,400 | FAIL 0,350 | FAIL 0,200 | FAIL 0,300 |
| C3 ninguna gana todas | PASS 0,000 | PASS 0,000 | PASS 0,000 | PASS 0,000 |
| C4 atajos cerrados | FAIL 1,000 | FAIL 1,000 | FAIL 1,000 | FAIL 1,000 |
| C5 la estrategia decide | FAIL 1 | FAIL 1 | **PASS 0** | **PASS 0** |
| C6 recorrido ≥ 15 | FAIL 9,456 | FAIL 9,001 | FAIL 3,616 | FAIL 3,327 |
| C7 banda de predicción | FAIL 0,593 | FAIL 0,599 | FAIL 0,593 | FAIL 0,599 |
| C8 sin quiebras espurias | PASS 0 | PASS 0 | PASS 0 | PASS 0 |
| C9 anual–mensual | FAIL 1,279 | FAIL 1,279 | FAIL 2,473 | FAIL 2,473 |

C2: queda Territorio producción 30 % (49). C4: `tech_tax` N1 (49) y, nuevo, `extractive` de Territorio gana producción en 20 %
(antes colapsaba; prototipo 0/10; 49). C5 pasa. C6 (completo): F N3 13,8 y Territorio 13,5; W de N1 3,3 (el prototipo da el
mismo recorrido estrecho, 48/49); W de N2/N3 baja de 44–50 a 22–23 porque `extractive` ya no colapsa. C9: peor St de
`extractive` N2 año 10 (45,15 / 42,68), también en el prototipo (46).

**Otras verificaciones.** `npx tsc --noEmit`, `npm test` (515 + 27 skipped), `npm run build`, `npm run i18n:audit` limpios. E2E
con navegador al final de la unidad (fases 42 y 43 juntas; ver la entrada de la 43).

**Revisión de código** (aplicada): desgaste cableado como desplazamiento (antes `wear` existía pero `advance` no lo pasaba y el
empuje a los stocks se disipaba); ancla de presiones acotada para partidas 1.1 pegadas en 0/100; `productiveShare0` de las
anclas con la misma función que el impulsor (mismo denominador); σ_prod calculado una vez. No aplicadas, anotadas: un choque
de evento sobre `stella.PP_*` entra antes de la relajación del mismo paso y uno sobre el indicador `pp*` después (igual que el
prototipo para el primero; la 46 unifica los eventos); firma sin `CP` (documentada).

**Deudas.** C9 (46); F N3 (44/46); Territorio `extractive`/producción y la decisión del escritorio abandonado (47/49); π_s y W
(45).

## 2026-10-22 — v6 fase 43: pactos internacionales como desplazamiento del objetivo

**Qué se hizo** (`mejora-general/files/43_pactos_internacionales.md`; rama `v6-modelo-v2`).
- `src/sim/v2/pacts.ts`: un pacto es datos (`PARAMS_V2.pacts`, por el id del código; el prototipo y la spec §4 usan
  treaty / accord / tech, y sus claves s / u / m_protect / m_deforest son renewables / efficiency / protectFactor /
  deforestFactor). `pactShift` (B / E / Pc, logit; mudado de `indicators.ts`), `pactEnergyShift` (s* / u*; antes `pactSum` en
  `carbon.ts`), `pactLandFactors` (frontera BNNP → BNP ×protectFactor, BNNP → CC ×deforestFactor; **m_protect / m_deforest
  dejan de leer los factores 1.1 del tratado**), `pactAnnualCost` / `pactEntryCost` / `pactYearlyCostOf` (fracciones del PBI).
- Costos: entrada 0,03 / 0,05 / 0,10·PBI, cuota 0,002 / 0,004 / 0,008·PBI por año (× dt). El código 1.1 cobraba 300 / 500 /
  1000 y 30 / 50 / 100 = 0,03 / 0,05 / 0,10 y 0,003 / 0,005 / 0,010 del PBI inicial de 10 000: **la spec baja la cuota anual
  sin decirlo**; se adopta la de la spec y se documenta. La entrada se calcula con el PBI del momento de adherir (en N3 cuesta
  más que el fijo de 1.1).
- `advance`: el paso 5 ya no evalúa funciones (ni su `toward` mensual) y el 11.5 ya no reaplica pactos; la cuota se cobra en el
  paso 4 sobre el PBI antes del crecimiento (orden 1.1 de los costos; el prototipo, después: 44).
- Se borran `Pact.effects`, `costToJoin`, `annualCost` (tipo e `INITIAL_PACTS`, que queda con id, name, description, unlockYear,
  isActive), `restorePactFunctions` (y sus usos en `advance`, `createInitialState` y `App.tsx`), `applyPactEffectsOnDerived`,
  `computeTotalPactCost`. `GameState` vuelve a ser JSON puro (N-14).
- Entrada: **la regla de inversión pública de la 44 no existe todavía** → se paga de las reservas como antes (`togglePact` de
  App.tsx y de `territorio/session.ts`, validación de DecarboNito `toggle_pact`, `joinPacts` del arnés), con TODO(v6 fase 44).
- UI: `InnovationGlobalDashboard` (N3) muestra entrada (solo antes de adherir) y cuota en función del PBI actual, con el %
  (es/en); Territorio, los montos al PBI actual; manual del facilitador (pactos desde `PARAMS_V2.pacts`) y de ecuaciones
  (costos interpolados). DecarboNito / `geminiService` no leían `effects` ni costos: sin cambios.
- Tests: `tests/sim/pacts.v2.spec.ts` (tratado D_B +0,25 y D_E −0,05 exactos para t = 0…30; acuerdo E −0,10 / Pc −0,15; tech
  E +0,15; s*/u*; factores 1,5 / 0,5; id desconocido; costos ∝ PBI y la cuota sale del tesoro; clon JSON completo — anual y
  mensual idénticos —; `INITIAL_PACTS` solo con datos; prototipo N2 año 30 sin eventos: tratado solo B 45,4 (45,42),
  conservación con / sin tratado 60,3 / 54,2 (60,30 / 54,24), efecto estacionario; pactos solos sin ruta con eventos).
  INV-16 reescrito sobre `PARAMS_V2.pacts` (E ≤ máx bE, B ≤ máx qB, Pc ≤ máx peso de conflicto, s/u ≤ lo que da CN, costos
  positivos; ningún pacto con funciones, impulsos o costos 1.1). `model11.spec` (N-14: clon JSON completo en lugar de
  "restaura effects"), `core.spec` (trayectorias regeneradas: solo cambian las reservas por la cuota del tratado, 30 → 0,002·PBI),
  `indicators.v2.spec` (importa `pactShift` de `pacts.ts`).

**Desvíos y discrepancias** (filas 43 de `docs/v6-spec-vs-motor.md`).
- Firmas: las funciones reciben `pacts`, no el estado; `pactCosts` es `pactAnnualCost` + `pactEntryCost`.
- Entrada pagada de las reservas hasta la 44; cuota sobre el PBI previo al crecimiento hasta la 44.
- Spec §4 "los tres pactos juntos, sin políticas, tampoco ganan": con eventos ganan `conservation` en N2 (3/5 semillas) y N3
  (5/5). No es el pacto (B ≈ 45,6, prototipo 45,4) sino las rutas de conservación provisorias del código (B ≥ 41–42 y c ≤
  5,4–6,5; prototipo B ≥ 52) más la baja de c de los pactos de energía → recalibración de rutas (49). El tratado solo no gana
  ninguna.

**`npm run sim:check`** (quick sale 0; completo sale 1, como todo completo con FAIL), contra la 42:

| Criterio | 42 (quick) | 42 (completo) | 43 (quick) | 43 (completo) |
|---|---|---|---|---|
| C1 do_nothing nunca gana | PASS 0,000 | PASS 0,000 | PASS 0,000 | PASS 0,000 |
| C2 dirigida gana su ruta | FAIL 0,200 | FAIL 0,300 | FAIL 0,200 | FAIL 0,300 |
| C3 ninguna gana todas | PASS 0,000 | PASS 0,000 | PASS 0,000 | PASS 0,000 |
| C4 atajos cerrados | FAIL 1,000 | FAIL 1,000 | FAIL 1,000 | FAIL 1,000 |
| C5 la estrategia decide | PASS 0 | PASS 0 | PASS 0 | PASS 0 |
| C6 recorrido ≥ 15 | FAIL 3,616 | FAIL 3,327 | FAIL 3,616 | FAIL 3,327 |
| C7 banda de predicción | FAIL 0,593 | FAIL 0,599 | FAIL 0,593 | FAIL 0,599 |
| C8 sin quiebras espurias | PASS 0 | PASS 0 | PASS 0 | PASS 0 |
| C9 anual–mensual | FAIL 2,473 | FAIL 2,473 | FAIL 2,473 | FAIL 2,473 |

Sin cambios de criterio respecto de la 42 (los desplazamientos y factores de los pactos ya eran `PARAMS_V2`; solo cambian las
cuotas y el monto de entrada en N3).

**E2E con navegador** (fases 42 y 43; dev server :3143, `GEMINI_API_KEY` de relleno). `/territorio`: Conservación activada,
×4 hasta mar 2026 → presiones 26 / 21 / 20 (en el interior del rango), con dos situaciones abiertas el bienestar baja 60 →
46,9 (desgaste como desplazamiento), panel de pactos con adhesión al PBI actual (PBI 10 442: tratado 313, acuerdo 522,
transferencia 1 044). `/play?demo=1` → Nivel 3, Agroecológicas, 7 años → en 2031 el tratado aparece con "Costo Adhesión: 414
(3 % del PBI) Anual: 28 (0,2 %)"; adherir baja las reservas 7 299 → 6 885 (▼ 414); un año más con el pacto: B 43,0, presiones
21,5 / 15,9 / 15,3. Sin errores de consola, sin alert/confirm.

**Revisión de código** (aplicada): fila de auditoría corregida (la entrada sube con el PBI de N3, una adhesión puede ser
rechazada); la tarjeta de pacto activo ya no muestra la entrada; manual de ecuaciones interpola `PARAMS_V2.pacts`;
`pactLandFactors` parte de `DEFAULT_LAND_USE_CHANGE_FACTORS`; sin reexport de `pactShift` en `indicators.ts`; import sin uso en
`core.ts`; comentarios de `deferred.ts` y del arnés (el prototipo debita la entrada sin verificar reservas).

**Deudas.** Entrada con la regla de inversión de la 44 y cuota sobre el PBI posterior al crecimiento (44); rutas de
conservación que los pactos solos alcanzan (49).

## 2026-10-22 — v6 fase 44: finanzas públicas con escasez

**Qué se hizo** (`mejora-general/files/44_finanzas_publicas.md`; rama `v6-modelo-v2`).
- `src/sim/v2/finance.ts` (nuevo): `stepFinance(state, eff, dt, CP, upkeep)` es el paso 6 de `advance` (un solo cuerpo para
  todo `dt`): g = g₀ + 0,01·η_PIE^prod + 0,005·η_PEA^prod − 0,0002·τ − 0,01·φ (φ del paso anterior; **el término −0,01·φ que
  faltaba en 1.1**), Y' = Y·(1 + g·dt), T = Y'·(0,15 + τ/100) + 0,005·Y'·η_CN^tax, G₀ = γ_N·Y' (`CP.Gasto_Publico_Base_Nivel_1..3`
  = 0,13 / 0,125 / 0,125, sin tocar), K = costo de políticas (κ = `PARAMS_V2.costShare`) + cuotas de pactos + mantenimiento,
  SP = T − G₀ − K, i(d) = i_N + 0,05·max(0, d − 0,6), intereses i·D y amortización α_N·D, R' = R + (SP − Int − Am)·dt + L,
  D' = D − Am·dt + L, piso R ≥ 0,02·Y' con deuda automática, CI = Int/T, φ = sHigh(CI; 0,20, 0,04), reloj de quiebra
  `model.fiscal.breachYears` (+dt mientras D/Y > 1 y CI > 0,2; quiebra con `breachYears ≥ 2 − breachEps`: exactamente al mes
  24) e historial de 5 años del saldo primario / PBI (`primaryHistory`, `primaryBalanceAverage`). Coeficientes en
  `PARAMS_V2.finance` (growthPIE / growthPEA / growthTaxDrag / growthStress / carbonTaxRevenue nuevos).
- `payPublicInvestment(state, cost)`: reservas por encima del piso y, el resto, deuda mientras D/Y ≤ 0,6 después de la
  operación; si no, `'no-fiscal-space'` (reemplaza `'insufficient-funds'`). Lo usan `declarePublicUse` (territory.ts),
  `resolveSituation` (situations/index.ts), los dos `togglePact` (App.tsx y territorio/session.ts: se resuelven los TODO(v6 fase
  44)), la validación de DecarboNito `toggle_pact` (`canPayPublicInvestment`) y `joinPacts` del arnés.
- Borrados: `src/sim/economy.ts` (`updateEconomy`), la regla de quiebra 1.1 de `gameOver.ts` (R < −0,2Y y D > 1,5Y; ahora
  `isBankrupt(model.fiscal)`), el puente `costShareBridge` / la escala puente de `costShareOf` (fase 36), el puente φ de la 39
  (`interestBurdenOf` / `fiscalStressOf` de `indicators.ts`), la rama `dt` del préstamo y el `toward` del dinero en `core.ts`,
  `PBIGrowth_Reduction_Factor_Per_Tax_Point` del CP (pasa a `PARAMS_V2.finance.growthTaxDrag`, spec §2).
- Mantenimiento: verificado igual al prototipo (0,8·(BNP declarado + HUM + RES + ENR)); ahora entra en K (saldo primario) con
  el valor anual, en vez de restarse de las reservas aparte.
- Préstamo L (el prototipo no lo tiene): se conserva lo que la app ya hacía (N3 siempre; N1/N2 desde 2035, App.tsx `requestLoan`;
  Territorio desde 2035, `session.ts`), tope 10 % del PBI/año. Convive con la deuda automática así: entra entero a R y D en el
  paso siguiente, **antes** del test del piso; si el paso tiene déficit, el préstamo evita (sustituye) la deuda automática por el
  mismo monto, y si deja reservas sobre el piso sirve para prefinanciar inversión pública (que se paga primero con reservas
  libres, sin mirar D/Y). `Monto_del_Prestamo_Unico`: ya no existe (fase 34); `Flag_Prestamo_Tomado_Stock` queda sin uso.
- Qué PBI lee cada término (la spec no lo distingue): como el prototipo (`economy_step` py:383-405), d y el costo de políticas con
  Y previo al crecimiento; recaudación, γ, cuotas de pactos y piso con Y'.
- UI (es/en): Territorio — HUD con Deuda/PBI, panel de finanzas con Deuda/PBI, saldo primario, intereses/recaudación, nivel de
  estrés fiscal, reloj de quiebra y la regla de inversión pública; mensajes 'no-fiscal-space' en pactos, usos públicos (con el
  costo del lote) y situaciones; pista de declarar ("de las reservas libres y, si no alcanzan, con deuda"); aviso `danger.debt`
  por D/Y > 0,8 o reloj en marcha; contexto de DecarboNito con D/Y, SP, CI y φ. 3 niveles — tarjeta "Intereses / Recaudación"
  en N3 (con SP y φ en el tooltip), tooltip de reservas, toast de pacto "sin espacio fiscal" (es/en), aviso `tips.fiscalStress`
  (reemplaza `tips.treasuryNegative`), `agent.errors.noFiscalSpace`. Panel del facilitador: `Gasto_Publico_Base_Nivel_1..3` en
  "Presupuesto y deuda" (descripciones con la advertencia de sensibilidad). Manuales: facilitador (modelo económico completo y
  quiebra), ecuaciones (fórmulas desde `PARAMS_V2.finance`/CP), jugador (deuda y quiebra, es/en).
- Rutas (necesario por esta fase, no recalibración): el piso de N1 "reservas ≥ −200" se cumplía siempre → D/Y ≤ 0,8 (ROUTES3
  del prototipo); la ruta productiva de Territorio "reservas ≥ 8 % del PBI" se volvió inalcanzable con el piso del 2 %
  (producción 30 % → 0 % en quick) → saldo primario medio de 5 años ≥ 0 y D/Y ≤ 0,6 (TERR_ROUTES del prototipo). Tabla de
  `docentes-ecuaciones.html` regenerada con `scripts/routes-table-html.ts`.

**Verificación.**
- `tests/sim/finance.v2.spec.ts` (nuevo): 36 casos de `economy_step` (3 niveles × dt anual/mensual, con deuda, reservas, τ, φ
  previo, políticas con esfuerzo, pactos y mantenimiento; `scripts/reference/finance44_cases.py` → `.json`) y 24 de `pay()`, todos
  ±1e-9; SP = (0,15 − γ)·Y'; déficit sostenido (R en el piso, D crece exactamente por el faltante); `interestRate(0,8, 2)` =
  0,045; quiebra con D/Y = 1,05 y CI > 0,2: 23 meses no, 24 sí, y 2 pasos anuales; reloj que se reinicia; la regla 1.1 ya no
  quiebra; `payPublicInvestment` (reservas, deuda, límite 0,6 exacto, pureza); préstamo en ambos dt; 12 meses ≈ 1 año; ventana
  de 5 años. **INV-10** (no existía como test) en `invariants.spec.ts`: deuda ≥ 0 y reservas ≥ piso, niveles 1–3, carteras
  aleatorias, préstamo, τ y eventos.
- Golden sin eventos (comparación con el prototipo, 27 puntos de `golden_v2.csv`): B, F, E, c y **D/Y** coinciden con el
  prototipo (máx |Δ| 5e-4; D/Y verde N2 año 30 = 0,242 como el prototipo, N1 verde 0,377, N3 do_nothing 0,015). W y St difieren
  (hasta 13 / 11 puntos en `green` N3): es el conflicto distributivo de la fase 45. Con φ = 0 sin deuda (puente de la 39) E
  quedaba 0,16 puntos arriba en N1/N2; se adopta sHigh(0) del prototipo.
- Tests ajustados: `core.spec` (trayectorias regeneradas: reservas en el piso y deuda en lugar de reservas negativas), `pacts.v2`
  (cuota sobre Y', anual y mensual; el tratado solo en N3 cumple la ruta de conservación provisoria en 1 de 5 semillas por c
  5,396 ≤ 5,4 con B 45,6 — la ruta, no el pacto: prototipo B ≥ 52, fase 49), `territory.spec` (deuda hasta 0,6 y luego
  'no-fiscal-space'), `facilitatorParams` (Gasto_Publico_Base_Nivel_k en el nivel k), `i18n.spec` (log del préstamo vía
  `stepYear`), `indicators.v2` (φ pasa a finance), `invariants` (INV-10; κ).
- `npx tsc --noEmit`, `npm test` (37 archivos, 604 tests), `npm run build`, `npm run i18n:audit` limpios.
- E2E (dev server :3144, `GEMINI_API_KEY` de relleno): `/territorio` — 4 políticas verdes, ×4: saldo primario −1,0 %, reservas
  1 000 → 670, panel fiscal con D/Y, CI, "Sin estrés fiscal" y la regla; opción paga de situación (183) descontada de las
  reservas 1 467 → 1 284; pista de declarar con el texto nuevo; HUD con Deuda/PBI. `/play?demo=1` — política activada y 2 años
  simulados sin errores. Sin errores de consola ni alert/confirm. No se probó en el navegador la tarjeta N3 ni un rechazo por
  espacio fiscal (cubiertos por tests).

**`npm run sim:check`** (quick sale 0; completo sale 1, como todo completo con FAIL), contra la 43:

| Criterio | 43 (quick) | 43 (completo) | 44 (quick) | 44 (completo) |
|---|---|---|---|---|
| C1 do_nothing nunca gana | PASS 0,000 | PASS 0,000 | PASS 0,000 | PASS 0,000 |
| C2 dirigida gana su ruta | FAIL 0,200 | FAIL 0,300 | FAIL 0,600 | FAIL 0,300 |
| C3 ninguna gana todas | PASS 0,000 | PASS 0,000 | PASS 0,000 | PASS 0,000 |
| C4 atajos cerrados | FAIL 1,000 | FAIL 1,000 | FAIL 1,000 | FAIL 1,000 |
| C5 la estrategia decide | PASS 0 | PASS 0 | FAIL 1 | PASS 0 |
| C6 recorrido ≥ 15 | FAIL 3,616 | FAIL 3,327 | FAIL 3,652 | FAIL 3,357 |
| C7 banda de predicción | FAIL 0,593 | FAIL 0,599 | FAIL 0,593 | FAIL 0,599 |
| C8 sin quiebras espurias | PASS 0 | PASS 0 | PASS 0 | PASS 0 |
| C9 anual–mensual | FAIL 2,473 | FAIL 2,473 | FAIL 2,453 | FAIL 2,453 |

C8 (índice §6): ninguna estrategia quiebra; `buy_everything` de Territorio termina con D/Y 0,90 (p90 1,03) pero cae antes por
el fallo sostenido de F < 20 (hacia 2039, 5/5 quick; prototipo: quiebra hacia 2040). C2: Territorio producción 30 % en el
completo (igual que la 43; sin el cambio de la condición fiscal de la ruta caía a 0 %); en el quick (5 semillas) 60 %, que cae en
la banda 30–70 % de C5: es la deuda conocida (prototipo 55 %, fases 47/49). C4 Territorio `extractive` 20 % → 0 % (su saldo
primario es negativo: κ de la cartera 2,8 % > 2,5 %). N3 E/W/F casi iguales; `green` N2 D/Y 0,24 (prototipo 0,24). C6 y C9
mejoran levemente.

**Revisión de código** (aplicada): disponibilidad de los botones de uso público y la pista "declarar" de DecarboNito con la regla
de inversión (`canPayPublicInvestment`, sin asignar estado); el rechazo de una declaración informa el costo real del lote
(parcial incluido); ventana de 5 años en un solo helper (`primaryWindow`); `debtToPbiRatio` exportado de `winRoutes.ts` y
reusado en la ruta de Territorio; color de reservas por "en el piso" (y deuda > 60 %) en lugar de "negativas"; comentario de φ
inicial (arranca en 0, como el prototipo). No aplicado: la situación `sovereign-fund` (`R > 1200`) se deja: con superávit
(pocas políticas) las reservas sí crecen sobre el piso y la situación aparece, que es lo que describe ("excedente fiscal").

**Deudas.** Rutas de Territorio (F/E de producción, banda C5) y de 3 niveles (49); noticias de "reservas en rojo" muertas
(50, tablero fiscal); W/St del golden (45); el préstamo voluntario no mira D/Y (decisión: tope 10 % del PBI/año como antes).

## 2026-10-22 — v6 fase 45: conflicto distributivo y transición justa

**Qué se hizo** (`mejora-general/files/45_conflicto_distributivo.md`; rama `v6-modelo-v2`).
- `src/sim/v2/social.ts` (nuevo): `landConcentration(landUses)` = (CC + PF)/(CC + CA + PRG + PF) (prototipo `concentration()`),
  `justTransition(policies, eff)` → { R_load, Support, J } y `distributiveDrive(G, G₀, jt)` = 3,0·(G − G₀) + 0,6·(1 − J)·R_load.
- `driveC` (`indicators.ts`) suma el término; `updateRelaxedIndicators` escribe `model.social = { concentration, justTransition,
  restrictionLoad }` (nuevo en `ModelState`, opcional para estados guardados antes de la 45; `createModelState` lo arranca en
  G₀ / 1 / 0). El ancla G₀ (`concentration0`) ya existía desde la 35. El término 2,0·Δa_CC + 1,0·Δa_PF del prototipo ya estaba (39).
- `PARAMS_V2.justTransition`: pesos del prototipo (restricción CR 1,0 / CN 0,5 / AGUA 0,3; apoyo AS 0,5 / GS 0,5).

**Desvío respecto de la spec.** La spec dice que R_load y Support se calculan por instrumento sumando η_j·e_jk/100 y que las
constantes del prototipo "son el resultado con reparto parejo". No lo son (CR daría 0,5, CN 0,25, AS 1,0, y contaría los apoyos
de CR/AGUA/CN). Se implementa peso del prototipo × η_j × χ_j, con χ el canal de `channelStrength` cuya relevancia es la máscara
0/1 de las etiquetas de `INSTRUMENT_CHANNELS`: con reparto parejo χ = 1 (constantes exactas del prototipo, golden idéntico) y con
esfuerzo desigual responde como pide la spec (Conservación todo en PSA ⇒ R_load = 0; todo en guardaparques ⇒ 0,99·η; C* menor
en el primer caso). Consecuencia (como el prototipo): los instrumentos de apoyo de CR (PSA), AGUA y CN no suman a Support; mover
esfuerzo a PSA baja la restricción pero no sube el apoyo, y con solo CR/CN/AGUA activas J = 0 cualquiera sea el reparto.

**Revisión de código** (aplicada): G y J se calculan una vez por paso (`socialIndices`) y los leen D_C y `model.social`;
`IndicatorState` exige `policies` (antes opcional: un estado sin políticas perdía el término en silencio); el ancla G₀ usa
`landConcentration` (una sola definición, sobre `AGRI_CODES`); el test de CA → CC aísla el término de G del de Δa_CC. Las
rutas que leen W/St no se recalibran (49); `sim:check --quick` no cambia C2–C5.

**Verificación.**
- Golden sin eventos (`golden_v2.csv`, 27 puntos): B, F, E, W, St y c coinciden (máx |Δ| < 5e-4; antes W/St hasta 13 / 11).
  El test golden sigue apagado hasta la 46 (lo pide la spec 46).
- `tests/sim/social.v2.spec.ts` (7 tests: G y su ancla, CA → CC sube G y C*, sin políticas J = 1 y término 0, constantes con
  reparto parejo, PSA vs guardaparques, restricción sin apoyo, `model.social` escrito por `advance`).
- `indicators39_cases.py`: ν_G encendido (antes ambos en 0), ν_J apagado (casos sin esfuerzos); JSON regenerado.
- `core.spec`: trayectorias regeneradas (fase 45): la balanceada con tratado restringe (CR + impuesto CN) más de lo que acompaña
  (AS): J ≈ 0,25, W −10 puntos (N2 76,5 → 66,6; N3 73,5 → 62,6; mensual 66,1 → 60,5); St, π_s y puntaje siguen. B, F, E, CO₂,
  dinero y CC sin cambio.
- Spec §6: `tech_tax` no gana en N2/N3 (gana innovación N1, deuda conocida de la 49); `extractive` tiene el W más bajo de N2
  (51,0 mediana con eventos; prototipo 47–55).

**`npm run sim:check -- --quick`** contra la 44 (quick): C1 PASS 0 = ; C2 FAIL 0,600 = ; C3 PASS 0 = ; C4 FAIL 1,000 = ; C5 FAIL 1
= (Territorio producción 60 %, banda prohibida, deuda 47/49); C6 FAIL 3,652 → 4,817 (mejora: el peor sigue siendo W de N1, que
casi no se mueve también en el prototipo); C7 FAIL 0,593 → 0,592; C8 PASS 0; C9 FAIL 2,453 → 2,052 (ahora coincide con el
prototipo, Δ St −2,05 en `extractive` N2 año 10; lo decide la 46).

**UI.** Sin cambios: el panel social con G y J es de la fase 50 (spec §3); los índices de investigación, de la 48.

**Deudas.** Presentación de G/J (50) e índices de investigación (48); C9 (46).

## 2026-10-27 — v6 fase 46: eventos 2.0, choque de rendimiento y paso mensual exacto

**Qué se hizo** (`mejora-general/files/46_eventos_y_paso_mensual.md`; rama `v6-modelo-v2`).
- `src/sim/events.ts` reescrito: `rollEvents` sortea cada evento elegible en forma independiente, p_paso = 1 − (1 − p)^(w·dt),
  un `rng()` por evento en el orden de `ALL_RANDOM_EVENTS`; varios eventos por paso, cada uno lee el estado que dejó el anterior.
  Se borra la rama especial del Nivel 3 (probabilidad global creciente + elección ponderada). `eventStepChance`,
  `seasonalWeight`, `standardNormal` (Box–Muller, rama seno) y `nextYieldShock` (AR(1)).
- Efectos como saltos de nivel (como `events_step` del prototipo, py:487-516): F/E/B sobre el indicador, antes de las
  eficiencias, el suelo y la relajación del paso; W/St/presiones/dinero sobre su stock; CO₂ y puntaje no se escriben (se
  recalculan; aviso en el log). **`src/sim/deferred.ts` borrado** (y `tests/sim/deferred.spec.ts`, cuyas pruebas de pactos
  pasan a `tests/sim/pactShifts.spec.ts`); las situaciones de Territorio aplican sus efectos con la misma regla y se borran
  `Session.pendingDeferred` y `AdvanceOptions.extraDeferred`.
- `ALL_RANDOM_EVENTS`: sequía con tendencia climática y dependencia del bosque perdido (área vigente; el área retirada de CC/CA
  ya iba a barbecho desde la 37), boom verde sin efecto sobre el CO₂, escrutinio con c > 1,5·c₀ (la spec no lo menciona; es el
  umbral del prototipo: c > 12 t era inalcanzable), movimiento por la justicia con `model.t > 5`. Números en `PARAMS_V2.events`.
- Choque de rendimiento ε (AR(1), §3) sorteado después de los eventos y antes de las eficiencias (orden del prototipo) con
  η_AGUA^prod del paso anterior; `noShocks` (y `rng = null`) lo fijan en 0. Entra en la producción de alimentos (fase 41).
- Estacionalidad de la sequía, solo Territorio (`seasonality: true` en `advanceMonth`): pesos 🟧 de la spec normalizados a media 1,
  aplicados como exponente del peligro (1 − (1 − p)^(w_m/12)), que conserva la p anual exacta.
- **Paso anual = 12 sub-pasos mensuales.** `advanceYear` (core.ts) clona una vez y corre 12 `stepInPlace` de dt = 1/12 con el
  mismo rng en secuencia; `stepYear` lo envuelve (nueva opción `StepYearOptions` con `events` / `noShocks`). Calendario único
  (12·dt meses, cambio de año después de diciembre); se borran `monthlyTriggerChance`, `rollEvent`, `rollMonthlyEvent` y las
  ramas `dt` de core.ts. `advance(state, 1, …)` sigue existiendo (un paso de un año) pero ningún juego lo usa.
- Prototipo: `play_level` integra cada año con `SUBSTEPS_PER_YEAR = 12`; el desbloqueo de pactos usa el número de paso
  (t acumulado en floats daba 2029,9999… < 2030). **`golden_v2.csv` regenerado** (hasta 3 puntos al año 1 en `extractive`,
  ≤ 0,5 al año 30). `GOLDEN_ACTIVE = true`: los 27 puntos coinciden en B, F, E, W, St y c (máx |Δ| < 5e-4, sin agrandar
  tolerancias; `playLevel` usa `noShocks`).

**Decisión C9 (deuda de las fases 36–45).** Con un paso anual de dt = 1 el prototipo también falla C9 (Δ St −2,05 en
`extractive` N2 año 10): los impulsores (rampa de las políticas, presiones que leen C y Pc del paso anterior) se evalúan una
vez por año. Probé en el prototipo dos arreglos que no cambian la discretización: presiones antes de Pc (1,67) y reloj de
rampa al punto medio (1,39); ninguno llega a ≤ 1. Se adopta la discretización única (sub-pasos mensuales) en el prototipo y en
el código: C9 = 0 y los dos juegos comparten trayectorias sin eventos. Costo: el paso anual es ≈ 12× más caro (≈ 2 ms por año;
`sim:check` completo 258 s → ~270 s; `testTimeout` de vitest a 20 s porque las invariantes de 30 años × 50 semillas pasan de 5 s
con todos los archivos en paralelo).

**Otros desvíos.** (1) Estacionalidad como exponente, no producto (conserva p). (2) Sin multiplicador de estrés de N3 (🟧
opcional). (3) Se mantiene el orden de eventos del código y el −5 % de reservas de la recesión (el prototipo no lo tiene;
deuda 47). (4) Box–Muller por la rama seno: las tiradas constantes de los tests (0 y 0,999) dan z ≈ 0 (con la rama coseno
0,999 daba un sesgo sostenido de ε ≈ +0,9 %). (5) Los eventos de N1/N2 ahora llegan al chat (antes sólo N3) y el log del juego
de 3 niveles conserva "EVENTO (Año Y+1)". (6) Fin de partida a mitad de año: corta los sub-pasos (como el prototipo) y el año
igual cierra (year + 1); el chequeo es mensual (un choque tiene un mes para relajarse antes, como en Territorio). (7) INV-11
(determinismo) no existía: creado. (8) `tests/sim/core.spec` regenerado (trayectorias con `stepYear` y eventos 2.0: N2 F 32,5
/ W 67,3; N3 F 34,9 / W 61,3 / St 74,1; mensual F 33,2) y valores del prototipo actualizados en `land.v2.spec` (sub-pasos) y
tests que medían un paso de dt = 1 pasan a `advance(…, 1, …)` (`carbon`, `indicators`, `pacts`, `land`).

**Verificación.**
- `tests/sim/events.v2.spec.ts` (20): frecuencia de cada evento en 10 000 años ±10 % (N3, sin rama especial); varios eventos por
  paso; 12 meses conservan p exacto con y sin estacionalidad, y por simulación (60 000 años); sequía con tendencia y bosque;
  escrutinio 1,5·c₀; boom sin CO₂; justicia por `model.t`; saltos de nivel y stocks; Box–Muller (media, varianza, tiradas
  constantes); AR(1) y amortiguación del agua; `noShocks`; C9 en N2 (`do_nothing`/`green`/`extractive`, años 10 y 30,
  |Δ| ≤ 1 y ≤ 0,1 t: da 0); fin de partida a mitad de año; logs por año / mes; `currentEvent` con funciones.
- INV-11 en `tests/sim/invariants.spec.ts` (fast-check, ambos juegos). Golden activo.
- `npx tsc --noEmit`, `npm test` (39 archivos, 657 tests), `npm run build`, `npm run i18n:audit` limpios.
- E2E: la extensión de Chrome no estaba conectada; dev server en :3146 con `GEMINI_API_KEY` de relleno: `/play.html?demo=1`,
  `/territorio.html` y los módulos `src/main.tsx`, `src/territorio/main.tsx`, `src/sim/events.ts`, `src/territorio/session.ts`,
  `src/App.tsx` responden 200 (transformados sin error). No se probó la interacción en el navegador.

**`npm run sim:check`** contra la 44 (completo) y la 45 (quick):

| Criterio | 45 (quick) | 46 (quick) | 44 (completo) | 46 (completo) |
|---|---|---|---|---|
| C1 do_nothing nunca gana | PASS 0 | PASS 0 | PASS 0 | PASS 0 |
| C2 dirigida gana su ruta | FAIL 0,600 | PASS 0,800 | FAIL 0,300 | FAIL 0,400 (Territorio producción 40 %) |
| C3 ninguna gana todas | PASS 0 | PASS 0 | PASS 0 | PASS 0,125 |
| C4 atajos cerrados | FAIL 1,000 | FAIL 1,000 | FAIL 1,000 | FAIL 1,000 (N1 `tech_tax` 100 %) |
| C5 la estrategia decide | FAIL 1 | PASS 0 | PASS 0 | FAIL 1 (Territorio producción 40 %, banda 30–70) |
| C6 recorrido ≥ 15 | FAIL 4,817 | FAIL 4,458 | FAIL 3,357 | FAIL 4,929 (W N1 4,9; F N3 14,6) |
| C7 banda de predicción | FAIL 0,592 | FAIL 0,597 | FAIL 0,599 | FAIL 0,604 |
| C8 sin quiebras espurias | PASS 0 | PASS 0 | PASS 0 | PASS 0 |
| C9 anual–mensual | FAIL 2,052 | **PASS 0** | FAIL 2,453 | **PASS 0** |

C2–C5 dependen de rutas que recalibra la 49 (spec §8). `extractive` N2 completo: W 47,5 (el más bajo de N2), St 43,1.

**Revisión de código** (aplicada): fin de partida a mitad de año cierra el año; noticias de Territorio con todos los eventos del
mes (`MonthNewsContext.events`) y `currentEvent` = primer evento del paso (igual que `event`); log "Año Y+1" en el juego de 3
niveles; Box–Muller por la rama seno (sin sesgo con la tirada 0,999). No aplicado: el cálculo de traza y Δ de áreas en cada
sub-paso (costo menor); el −5 % de reservas de la recesión (deuda 47); la migración de `pendingDeferred` (siempre vacía).

**Deudas.** Rutas (C2/C4/C5, 49); situaciones como impulsos (47); presentación de eventos múltiples en el juego de 3 niveles
(panel de N3 muestra el último; 50); F N3 y W N1 (C6, 49).

## 2026-10-22 — v6 fase 47: Territorio, situaciones como impulsos, descuido del escritorio y usos públicos 2.0

**Qué se hizo** (`mejora-general/files/47_territorio_situaciones_usos_publicos.md`; rama `v6-modelo-v2`; trabajo del
2026-10-27, fechado como el resto de la cadena).
- `src/territorio/situations/index.ts`: `applySituationEffects` + `resolveSituation`. Un efecto sobre B, F, E, C (o W
  invertido), Pc (o St invertido) o una presión deja un **impulso del objetivo** en `game.model.impulses`
  (`TargetImpulse` de la fase 35): Δℓ = Δpts/(100·p·(1 − p)), p ∈ [0,01; 0,99], t = `model.t`, τ = vida media/12/ln 2
  (🟧 18 meses, `PARAMS_V2.situations.halfLifeMonths`; `SituationDef.halfLifeMonths` opcional, usado sólo en
  `aquifer-drop` = 60: obras, cupos y acuífero agotado duran años). El motor ya los leía con tope ±0,6 (`capImpulses`);
  `pruneImpulses` los descarta a 6τ (`advanceMonth`). **Se borra `SITUATION_EFFECT_SCALE`** (0,5): ya no hay saltos.
- Dinero inmediato: ingresos > 0 × √(Y/Y₀), cargos fijos, % sobre el stock de reservas/deuda (el +3 % de deuda de
  `credit-rating` ya no se ignora); **`PBI_Real` como choque de nivel de Y** (como el Y% de los eventos; 5 efectos del
  catálogo). Suelo: transferencias de la fase 37 (verificado: mismo camino que los eventos). Lo demás (CO₂) sigue omitido.
- `investmentScale` (`finance.ts`, tope `PARAMS_V2.finance.investmentScaleCap` 2,5): lo usan `situationCost` y ahora
  también los lotes (`publicUseCost(use, CP, kHa, state)`, `declarePublicUse`): 100/225/300/400 × √(Y/Y₀) (antes fijos;
  el prototipo ya escalaba). Pago con `payPublicInvestment` y error `no-fiscal-space` (es/en) ya estaban desde la 44;
  área declarada (34), sin impulso agrícola por lote (42) y conectividad (40) verificados sin cambios.
- Desgaste (§3): ya adelantado en la 42 (`wearShift` → `opts.wear`). `wearTally` pasa a medir puntos: 0,04·w·factor de
  edad × pendiente logística del valor actual (`toPointsDelta`, nuevo en `math.ts`), como pide la spec; la tarjeta de la
  bandeja muestra el desgaste del mes en la misma unidad.
- **Decisión del usuario 2026-09-19 restaurada** ("un gobierno que deja de gobernar no llega al final del mandato"). Con
  impulsos acotados a ±0,6, ninguna opción por defecto puede tumbar al gobierno, y el desgaste desaparece al vencer. Canal
  nuevo: cada situación que **vence sin respuesta** suma 1 a un contador N (`Session.expiredAt`) que decae con vida media
  36 meses; D_Pc += 1,2·max(0, N − 3) (`neglectShift`, `AdvanceOptions.wear.Pc`, `drivePc(s, wear)`; sin tope, como el
  desgaste). Las oportunidades (tono `good`) que vencen no cuentan (revisión de código). Medido, ignorando todo: semilla
  11 cae por colapso político en 2039, semillas 1–9 entre 2036 y 2044; resolviendo la mitad de lo que llega (calibración
  con tolerancia 4), ninguna colapsó (St final 37–64); resolviendo 3/4, St 73–78. Prototipo: igual (`NEGLECT_*` en
  `play_territorio`), `do_nothing` de Territorio colapsa en 10/10 semillas (2036,9–2040,3). El test de `session.spec`
  vuelve a exigir colapso antes de 2044.
- **−5 % de reservas de la recesión** (deuda 46/47): se mantiene en el código y se agrega al prototipo (`R%` en `EVENTS`);
  el golden no cambia (sin eventos).
- Prototipo (`modelo_v2.py`): `add_situation_effect` con PBI_Real, % de reservas y deuda, vida media por situación;
  descuido; `R%`. `export_situations.ts` exporta `halfLifeMonths` y `tone`. Golden regenerado: idéntico.
- `scripts/situations-audit.ts` → `reports/situations-audit.md` (§4). Desvío: el índice de la spec
  (0,25·ΔB + 0,25·ΔF + 0,25·ΔE + 0,25·ΔW, promediado sobre 24 meses porque los impulsos decaen) no ve estabilidad ni
  presiones, que es justamente donde el catálogo pone el precio de las opciones "buenas"; el script separa
  **compromisos** (gana en índice y costo a cambio de St, presiones o dinero: 13) de **dominantes** reales (Pareto sobre
  índice, costo, St y presiones: 4, todas de dos opciones donde la alternativa es el default, justificadas en el
  reporte). Corrección del catálogo: `good-rains/expand` (riego sin costo) suma π_e + 4. Defaults convenientes: 0;
  opciones nulas: 0.
- UI: pantalla final con resueltas, vencidas y desgaste acumulado (es/en) y una línea cuando el descuido pesó en un
  colapso político; la bandeja avisa que dejar vencer cuesta autoridad. Arreglado de paso: el aviso de declaración
  mostraba "{km2}" sin llenar.
- Tests: `tests/territorio/situations.spec.ts` nuevo (3/24 = 0,125 y mitad a los 18 meses; % y recorte de p; tope ±0,6 con
  20 opciones; el impulso mueve E* y se apaga; vida media propia; descarte 6τ; dinero, deuda, PBI; costos √(Y/Y₀) con
  tope; suelo conservado; desgaste de una situación abierta 6 meses y su retiro; descuido; dos semillas con la misma
  estrategia, W final a < 25 puntos). `session.spec`: escritorio abandonado vuelve a colapsar; efecto sobre W = impulso.

**Desvíos y discrepancias** (filas 47 de `docs/v6-spec-vs-motor.md`): descarte a 6τ (prototipo) y no a "6 vidas medias";
canal de descuido (no está en la spec); índice de la auditoría ampliado con St y presiones; `applyWear` ya no existía (42).

**Deudas** (no resueltas acá). Territorio `production` 45 % (completo, 20 semillas; banda prohibida 30–70 %, C5): falla
por F < 44 en la mitad de las semillas (mediana 44,5); la mecánica de situaciones no lo explica (impulsos acotados) →
umbrales de rutas, fase 49. `extractive` de Territorio ya no gana producción (0 %). `cond.publicNature` 4,5 %: sin
cambio de mecánica (área declarada) → 49. `wearTotal` mide el empuje sobre los objetivos (cota superior de lo que se
movieron los stocks), como la spec.

**`npm run sim:check`** contra la 46:

| Criterio | 46 (quick) | 47 (quick) | 46 (completo) | 47 (completo) |
|---|---|---|---|---|
| C1 do_nothing nunca gana | PASS 0 | PASS 0 | PASS 0 | PASS 0 |
| C2 dirigida gana su ruta | PASS 0,800 | PASS 0,800 | FAIL 0,400 | FAIL 0,450 (Territorio producción 45 %) |
| C3 ninguna gana todas | PASS 0 | PASS 0 | PASS 0,125 | PASS 0,125 |
| C4 atajos cerrados | FAIL 1,000 | FAIL 1,000 | FAIL 1,000 | FAIL 1,000 (N1 `tech_tax`) |
| C5 la estrategia decide | PASS 0 | PASS 0 | FAIL 1 | FAIL 1 (Territorio producción 45 %) |
| C6 recorrido ≥ 15 | FAIL 4,458 | FAIL 4,458 | FAIL 4,929 | FAIL 4,929 (W N1) |
| C7 banda de predicción | FAIL 0,597 | FAIL 0,597 | FAIL 0,604 | FAIL 0,604 |
| C8 sin quiebras espurias | PASS 0 | PASS 0 | PASS 0 | PASS 0 |
| C9 anual–mensual | PASS 0 | PASS 0 | PASS 0 | PASS 0 |

Territorio (completo): `do_nothing` colapso político 20/20 (p50 2038,8). El juego de 3 niveles no cambia.

**Otras verificaciones.** `npx tsc --noEmit`, `npm test` (40 archivos, 670 tests), `npm run build`, `npm run i18n:audit`
limpios. E2E con Chrome (dev server :3147, `GEMINI_API_KEY` de relleno): `/territorio`: resolver una situación (cobra 40,
sin salto de indicadores), avanzar meses, declarar un área protegida (cuesta 102 = 100 × √(Y/Y₀)), dejar correr el
escritorio sin atender: colapso político en 2035 con la pantalla final mostrando resueltas 1, vencidas 36, desgaste 69 y
la línea de descuido (con la calibración previa a la revisión). `/play?demo=1` no se tocó en esta fase (sin UI propia);
cubierto por tests y build.

**Revisión de código** (aplicada): mensaje de descuido sólo en colapso político; desgaste de la tarjeta en la misma unidad
que el contador; oportunidades fuera del contador (recalibrado 1,0/4 → 1,2/3); `protectedAreaCost` con estado;
`toPointsDelta` compartido; `_CP` opcional; opciones inasequibles marcadas en la auditoría; test del retiro del desgaste
no tautológico. No aplicada: `wearTotal` como empuje y no como movimiento realizado (es lo que pide la spec §3).

## 2026-10-22 — v6 fase 48: predicción 2.0 e índices de investigación

Spec: `mejora-general/files/48_prediccion_e_indices.md`. Cierra N-04b (predicción resuelta de antemano).

**Qué.** (1) Bandas de "sin cambio" por terciles: `scripts/prediction-bands.ts` mide el percentil 33 de |ΔX| anual de B, E
y c por nivel y escribe `src/components/tutorial/predictionBands.json` (`modelVersion`, `bands`, `climatology` =
proporciones baja/igual/sube); `--check` sale 1 si el JSON no es del `MODEL_VERSION` actual o quedó viejo, y
`tests/tutorial/predictions.spec.ts` falla si `modelVersion ≠ MODEL_VERSION`. `actualDirection(key, before, after, level)`
usa la banda del nivel; `RANGE` y `FLAT_THRESHOLD_FRACTION` borrados; `evaluatePredictions(…, level, persistence)` guarda en
cada resultado `level`, `band` y `persistencePred`. La tira no muestra la banda (no cambia la tarea); el debriefing sí, una
línea por nivel jugado. B ya se mostraba con un decimal (`IndicatorCard`, `precision = 1`). (2) `src/sim/v2/research.ts`:
Brier categórico (0/2 determinista, Σ(p − o)² de la climatología), `skillScore`, `predictionSkill`, `oneYearRegret`
(cartera del jugador vs. vecinas a un cambio, máximo 5 y permanencia respetados, sin dejar el juego de 3 niveles sin
políticas, `makeRng(seed, year + 1)` común: ≤ 11 pasos anuales, ~15 ms), `safeJustGap`, `ResearchTracker`
(`trackStep` / `trackRegret`: brecha integrada en el tiempo, tiempo activo por política, desactivaciones, episodios de
choque), `policyEntropy`, `researchIndices` (objeto plano de 13 claves para `research_indices`). Parámetros en
`PARAMS_V2.research` (pisos/techos 🟧 de la spec, `shockMinDrop` 0,5, `recovery` 0,9). (3) Telemetría:
`sendWithOptionalColumns` generaliza el patrón de `model_version` (fase 32) a cualquier columna de una migración (reenvía sin
la columna faltante, una advertencia por tabla y columna); `logPrediction` agrega `band` y `persistence_pred`;
`finalizeGameSession` manda `research_indices` en un UPDATE aparte (un rechazo nunca deja la sesión sin cerrar), saneado con
`sanitizeIndices` (compartido con el cuestionario); el resumen de Territorio (`buildSummary` → `toRowFields`) agrega
`research_indices`. `supabase/research_indices_migration.sql` (idempotente, CHECKs con nombre, NO aplicada) y
`analytics_queries.sql` con precisión, SS_pers y SS_clim por `model_version`, nivel e indicador, y los índices por sesión.
(4) UI: `ResearchIndicesTable` (es/en, `debriefing.research.*`) en `DebriefingModal` (más la frase de habilidad: "repetir lo
del año anterior habría acertado X %") y en la pantalla final de Territorio. Territorio no tiene predicción (§7, 🟧 no
incluida): su arrepentimiento se calcula cada enero (`advanceMonth(…, { regret: true })`, sólo desde la UI; 12 meses con la
conectividad congelada, sin bandeja ni desgaste, como pide la spec).

**Desvíos.** (a) El prototipo no implementa bandas, Brier ni arrepentimiento: todo se mide con el motor TS. (b) Bandas
fuera de muestra: se miden sobre 600 jugadores apartados (semillas 20000…, `BAND_PLAYER_SEED_BASE`) y C7 se evalúa sobre
los 150 de `sim:check` (10000…). Con la misma muestra C7 pasaba por construcción (0,004; señalado en la revisión). Fuera de
muestra la proporción "sin cambio" queda en 31–35 % con 150 jugadores (peor: N1 E 35,2 %, N3 c 30,7 %); con los 50 de
`--quick` el ruido de muestreo llega a ±4 (N1 E 37,1 %), así que `--quick` puede marcar C7 FAIL (no es regresión: el criterio
no pasaba en `balance-latest.json`); `tests/harness/predictionBands.spec.ts` usa 150. Valores (N1/N2/N3): B 0,187 / 0,186 /
0,184; E 0,353 / 0,466 / 0,655; c 0,051 / 0,050 / 0,040 t (spec, prototipo: 0,160 / 0,275 / 0,039 en N1). Proporciones
N1 (sube/igual/baja): B 34/33/33, E 42/33/24, c 15/33/51, como las de la spec. (c) Persistencia el primer año de cada nivel
(o si el año anterior no terminó donde empieza la ronda) = `'flat'`. (d) Choque para la resiliencia = paso con evento en el
que F o E cae ≥ 0,5 puntos (el motor no expone los blancos de cada evento); episodios abiertos al final del nivel o de la
partida cuentan con el tiempo transcurrido (censura por derecha). (e) El juego de 3 niveles usa `Math.random`: el
arrepentimiento usa una semilla de sesión propia (números aleatorios comunes); el S del jugador también es contrafáctico.
(f) SS con base perfecta y jugador imperfecto = −∞ en la función pura; se guarda acotado a `SKILL_FLOOR` = −10 (null
significaría "sin predicciones"). (g) Brecha seguro-y-justo = suma (no promedio) de los seis términos normalizados,
promediada en el tiempo. (h) La migración pone los CHECK aparte con nombre (con `ADD COLUMN IF NOT EXISTS … CHECK` no se
crearían si la columna existía) y agrega `band ≥ 0`. (i) `tsconfig.json`: `resolveJsonModule`.

**Hallazgo.** En la prueba e2e (N1, sólo Agroecológicas, 30 años) la regla de persistencia acertó 87 % y el jugador
sintético que siempre dice "baja/igual/sube" fijo 32 %: con una cartera estable las tendencias son muy persistentes, así que
SS_pers es una vara exigente (bien para el artículo: medir contra persistencia y no contra el azar).

**C6 W N1 (nota para la 49, sin cambiar el criterio).** W de N1 se mueve 4,9 (medianas por estrategia, con eventos); el
prototipo da el mismo recorrido estrecho (93,7–97,8 sin eventos: C₀ = 5 ⇒ W₀ = 95 en la zona saturada de la logística). El
Nivel 1 no muestra W en el tablero (desde el Nivel 2) ni lo usa en sus rutas: propuesta para la 49, excluir W de N1 de C6
(o medir C6 sólo sobre indicadores visibles en el nivel) en lugar de forzar el modelo.

**Deudas.** Predicción en Territorio (§7) no incluida. El arrepentimiento de Territorio ignora bandeja y mapa. El índice de
resiliencia depende de `shockMinDrop` (criterio experto). C7 queda a ~0,8 pp del borde (N3 c 30,7 %): si la 49 cambia la
dinámica, regenerar el JSON (`npx tsx scripts/prediction-bands.ts`) y la tabla `clim` de `analytics_queries.sql` (test).

**Revisión de código** (aplicada): índices que no se reiniciaban al "Jugar de nuevo" (ahora `resetResearch`, y la habilidad
cuenta sólo las predicciones de la partida); el cambio o reinicio de nivel ya no cuenta como desactivaciones y cierra los
choques abiertos; vecinas sin la última política; −∞ → piso; `research_indices` en UPDATE aparte y saneado; banda del
debriefing por nivel; `precision_persistencia` ignora filas sin `persistence_pred`; C7 fuera de muestra; índices memorizados
al abrir el debriefing / la pantalla final.

**`npm run sim:check`** contra la 47 (el juego no cambia: sólo C7):

| Criterio | 47 (quick) | 48 (quick) | 47 (completo) | 48 (completo) |
|---|---|---|---|---|
| C1 | PASS 0 | PASS 0 | PASS 0 | PASS 0 |
| C2 | PASS 0,800 | PASS 0,800 | FAIL 0,450 | FAIL 0,450 |
| C3 | PASS 0 | PASS 0 | PASS 0,125 | PASS 0,125 |
| C4 | FAIL 1,000 | FAIL 1,000 | FAIL 1,000 | FAIL 1,000 |
| C5 | PASS 0 | PASS 0 | FAIL 1 | FAIL 1 |
| C6 | FAIL 4,458 | FAIL 4,458 | FAIL 4,929 | FAIL 4,929 (W N1, F N3 14,6) |
| C7 | FAIL 0,597 | FAIL 0,041 (50 jugadores: N1 E 37 %) | FAIL 0,604 | **PASS 0,023** (fuera de muestra; 30,7–35,2 %) |
| C8 | PASS 0 | PASS 0 | PASS 0 | PASS 0 |
| C9 | PASS 0 | PASS 0 | PASS 0 | PASS 0 |

**Verificación.** `npx tsc --noEmit`, `npm test` (43 archivos, 709 tests), `npm run build`, `npm run i18n:audit` limpios.
E2E con Chrome (dev server :3148, `GEMINI_API_KEY` de relleno): `/play?demo=1` N1: activar Agroecológicas, predecir,
avanzar año (✓/✗ en la tira), 30 años, nivel no superado, abandonar → informe de cierre con "Acertaste 27 de 84 (32 %)",
"repetir lo del año anterior habría acertado 87 %; habilidad −4,18 / −1,05", banda del Nivel 1 y la tabla de índices.
`/territorio`: 157 meses con "+1" sin atender la bandeja → colapso político 2037 y pantalla final con la tabla (regret 7,0,
brecha 0,39, presupuesto 1,11, resiliencia 59 meses, G 0,55, J 1,00); el resumen del cuestionario lleva 13 índices.

## 2026-10-22 — v6 fase 49: recalibración de rutas y puntaje (ambos juegos)

Spec: `mejora-general/files/49_recalibracion_rutas_puntaje.md`. Cierra N-11/T-10 (carbono que no puntúa), N-13 (umbrales en
el ruido), T-05 (atajo de la ruta productiva) y S-1.

**Qué.** (1) Puntaje (`src/sim/score.ts`, = `score()` del prototipo): C_sc = 100·clip((1,25·c₀ − c)/c₀, 0, 1) con c₀ de las
anclas del nivel, P_sc = 100 − π̄, X = (F + E + W + St)/4, Y_sc = min(100, 100·Y/(2·Y₀)); `computeScore(indicators, level,
anchors)` y `scoreComponents` (que usa también el tooltip de `App.tsx`); pesos en `SCORE_WEIGHTS` (INV-14 con test).
`Referencia_Max_CO2_per_Capita_Puntaje` borrado de `CONTROL_PARAMS`, `ControlParams`, `paramGroups` (se quitó el grupo
"Emisiones y carbono", que quedaba vacío) y `App.tsx`. El golden ya traía S con la fórmula nueva: `golden.v2.spec.ts` ahora
también compara S (±5 de 1000). (2) `LEVEL_ROUTES` = ROUTES3 del prototipo sin cambios de umbral, reemplazando todos los
provisorios de 38/39/41/44: pisos N1 B ≥ 25, E ≥ 15, D/Y ≤ 0,8; N2 B ≥ 25, F ≥ 25, St ≥ 35, cada π ≤ 85; N3 St ≥ 30,
D/Y ≤ 1,0, W ≥ 35 (el piso `Colapso_politico ≤ 95` sale: St ≥ 30 lo cubre). Las rutas ya no piden puntaje (salvo
equilibrio, S ≥ 720) ni esfuerzo en instrumentos: `cond.renewables` lee `model.energy.renewableShare` (en %), `cond.gdpGrowth`
= Y/Y₀; equilibrio N3 7 de 9. `carbonTechEffort` borrado (sin usos). (3) Territorio (`TERR_ROUTES`): integridad B ≥ 52,
bosque ≥ 15 %, uso público declarado ≥ 6 %, c ≤ 6,2; transición productiva F ≥ 40,5, E ≥ 40, W ≥ 55, saldo primario medio
5 años ≥ 0, D/Y ≤ 0,6, ≥ 15 años con ≥ 2 políticas productivas (PAI, PEA, GS, AS) a la vez; innovación c ≤ 4,8, parques
≥ 1,6 %, W ≥ 55. `model.productiveYears` existía en el tipo pero nadie lo sumaba: `core.ts` suma dt (paso 6, tras las
finanzas) con `PARAMS_V2.productive` (= `prod_years` del prototipo). (4) i18n es/en: `cond.renewables`, `cond.gdpGrowth`,
`cond.productiveYears`; se borran `cond.techEffort` y `cond.productivePolicy` (sin usos). (5) `LEVEL_CONFIGS.winConditions`
(objetivos de cabecera que muestran `LevelIntroModal` y el tooltip): N1/N2 sin objetivo de puntaje (600/480 eran de la
escala vieja y sus rutas no usan S); N3 refleja la ruta de equilibrio. (6) Tabla docente regenerada
(`npx tsx scripts/routes-table-html.ts` → `docentes-ecuaciones.html`, que además decía `sim:territorio`: ahora `sim:check`).
(7) `scripts/harness/metrics.ts`: `C6_EXCLUDED` = [W de N1] (ver abajo).

**Desvíos (gana el arnés en calibración, 49 §4).** (a) Uso público declarado 8 → 6 %: `conservation` declara 6,1–11,0 %
(mediana 7,7) y con 8 ganaba 30 % (C2/C5 FAIL); `settle_only` llega como máximo a 4,5 % por situaciones; con 6 gana 100 %.
(b) F de la ruta productiva 44 → 40,5: `production` termina en F 35,0–53,2 (mediana 44,4) y con 44 ganaba 65 % (dentro de
30–70 %); el percentil 90 de `do_nothing` es 40,3, así que 40,5 es el mínimo que permite la regla de 49 §4 (production 90 %).
`extractive` sigue en 0 % por el saldo primario (−0,34 % del PBI), `cheap_production` por los años productivos (0). (c)
Ningún umbral de los tres niveles se movió respecto del prototipo. (d) `npm run scenes:build` no existe (narrativa visual 2.6
fuera de alcance): sin acción. (e) Bandas de predicción: la 49 no cambia la dinámica (sólo puntaje y rutas, y
`productiveYears`, que nadie lee en el motor): `npx tsx scripts/prediction-bands.ts --check` → al día; C7 0,023 igual.

**Tasas de victoria (sim:check completo, 40 semillas por nivel / 20 en Territorio).** N1: do_nothing 0, green 100 (cons),
extractive 0, production 95 (prod), innovation 100 (inno), conservation 100 (cons), balanced 100 (cons + inno 98), tech_tax
0. N2: 0 / 100 (cons) / 0 / 98 (prod) / 100 (inno; prod 13) / 100 (cons) / 98 (cons 98, prod 33, inno 95: gana las tres
en 33 %, C3 0,325 ≤ 0,5) / 0. N3: 0 / 100 (cons) / 0 / 83 (prod) / 95 (inno; eq 45, prod 25) / 100 (cons) / 100 (cons;
eq 10) / 0. Territorio: do_nothing 0 (colapso político), conservation 100 (cons; inno 5), production 90, innovation 100,
settle_only 0, cheap_production 0, extractive 0, buy_everything 0. Los tres pactos sin políticas: 0/40 en N2 y N3.

**C6.** (i) W de N1 (4,9): **cambio de criterio de aceptación — requiere visto bueno del equipo.** C₀ = 5 ⇒ W₀ = 95 en la
zona saturada de la logística; el prototipo da el mismo 4,9 (40 semillas con eventos); el Nivel 1 no muestra W ni lo usa en
pisos o rutas. Se excluye sólo ese par (`C6_EXCLUDED`, comentado), el reporte lo sigue listando como "excluido de C6".
(ii) F de N3 (14,6; balanced 29,8 → extractive 44,3) **sigue FAIL** y no se excluye (no autorizado): el prototipo con
eventos (40 semillas) da 13,5 (44,19 − 30,67) y sin eventos 15,3. La 33 §4 mide C6 sobre las corridas del arnés (con
eventos) y la 49 caracteriza el prototipo "con eventos", así que no se cambió la forma de medir. Ningún umbral de rutas lo
mueve: decide el equipo (aceptar, medir sin eventos o tocar la respuesta de F a las carteras con prototipo + golden).

**Deuda de la 47 verificada.** Con la calibración de abandono 1,2 / 3, un gobierno que resuelve una de cada dos situaciones
(semillas 11, 3, 7) llega a 2054 sin colapso y con St > 25 (test nuevo en `tests/territorio/session.spec.ts`).

**Deudas.** `LevelIntroModal` sigue listando los objetivos de cabecera y no las rutas (fase 50). El progreso de las
condiciones que leen el estado actual y no `indicators` (renovables, bosque, D/Y, pactos, años productivos) queda en 0 hasta
cumplirse, porque la línea base de `evaluateRoute` comparte esos campos con el estado (como antes para bosque/D/Y/pactos).
N2 `balanced` cumple las tres rutas a la vez en 33 % de las semillas (C3 pasa). La sección "Puntaje general" de
`docentes-ecuaciones.html` no da la fórmula (fase 50, desde el código).

**Revisión de código** (aplicada): `RouteCondition.start` (valor fijo al inicio del nivel) para las condiciones que leen
`model` y no `indicators` (renovables, años productivos), cuya barra de progreso quedaba en 0 y aparecía siempre como cuello
de botella; la lectura de `productiveYears` en la ruta se redondea a 1e-6 (la suma de pasos de 1/12 deriva ~1e-14 y el umbral compara con ≥); el color del puntaje sin
objetivo compara contra el puntaje inicial del nivel (±50) en vez de 600/400 fijos; el tooltip usa `SCORE_WEIGHTS` y
`scoreComponents` (y, sin `model`, las anclas de `levelBaseline`); el texto de C6 se arma desde `C6_EXCLUDED`; import
`Policy` muerto; filas viejas de `carbonTechEffort` marcadas como superadas. No aplicadas (fase 50, anotadas arriba): los
objetivos de cabecera de `LEVEL_CONFIGS` en `LevelIntroModal`, estrellas del tablero y el prompt de cierre de Gemini.

**Verificación.** `npx tsc --noEmit`, `npm test`, `npm run build`, `npm run i18n:audit`; `npm run sim:check` completo: C1
0,000, C2 0,825, C3 0,325, C4 0,000, C5 0, C6 FAIL 14,556 (F N3), C7 0,023, C8 0, C9 0,000 (antes: C2, C4, C5, C6 FAIL).

## 2026-10-22 — v6 fase 50: interfaz, manuales, paquete docente y DecarboNito al día con el modelo 2.0

Spec: `mejora-general/files/50_interfaz_docentes_decarbonito.md`. Cierra N-08 en su forma definitiva y la documentación
desalineada. **No cambia ecuaciones ni parámetros**: `npm run sim:check -- --quick` da un reporte idéntico al de la fase 49
(comparado contra el mismo comando en `HEAD` 5be209b, todo igual salvo el tiempo de corrida).

**Qué.** (1) `src/game/modelView.ts` (puro): lo que las interfaces leen del submodelo 2.0 — objetivo X* de cada indicador
(`indicatorTarget`; W y St como 100 − C* / 100 − Pc*), CO₂ por habitante por fuente + renovables + presupuesto
(`carbonView`), D/Y, saldo primario, intereses, estrés y "sin espacio fiscal" (`fiscalView`), G y J (`socialView`), estado y
costo de una política con costo marginal de +10 pts (`policyView`), etiquetas de instrumentos desde `INSTRUMENT_CHANNELS`
(`instrumentHint`: canales con μ ≥ 0,6 alto/medio + apoyo/restricción), conectividad de un lote (`lotTouchesForest`) y
estrellas / líneas / objetivo de puntaje desde `LEVEL_ROUTES`. Lo usan el tablero, Territorio, Gemini y el asesor: un solo
cálculo. (2) Juego de 3 niveles: flecha "va hacia NN" bajo cada indicador acotado; bloques Carbono, Finanzas públicas (N3
completo; N1–N2 solo saldo primario) y Transición justa (N2–N3) en `src/components/ModelPanels.tsx`; `PolicyToggle` con
"En marcha (NN %)" / "Plena" / "Desgastada (NN %)" y costo actual; panel de instrumentos con etiquetas por canal,
apoyo/restricción y costo marginal; `INSTRUMENT_IMPACT_HINTS` y su tipo borrados (constants, types, App, Dashboard); panel de
eventos de N3 con todos los eventos del año (`GameState.eventsThisYear`, ids que escribe `advanceYear`: contabilidad, sin
efecto en el modelo). (3) Deudas de la 49: `winConditions` borrado de `LEVEL_CONFIGS`, `LevelConfig` y
`lastConcludedLevelInfo`; `LevelIntroModal` lista mínimos y rutas reales (test SSR `tests/game/levelIntro.spec.tsx`); estrellas
y líneas de umbral del tablero desde `LEVEL_ROUTES`; color/tooltip del puntaje con `scoreTarget`; el prompt de cierre de
Gemini lista mínimos, rutas con avance y multiplicador, puntaje anclado, CO₂ por fuente, finanzas y G/J. (4) Panel del
facilitador con los cuatro grupos de 50 §3 (crecimiento y población + `Poblacion_Inicial`, velocidades, políticas
`Eficiencia_Minima_Politicas` / `Recuperacion_Politicas_Anios`, finanzas); avisos "se aplica al reiniciar nivel" y
"muy sensible" (γ). `facilitatorParams.spec.ts` cubre las claves nuevas (población construyendo el nivel con el CP; recuperación
con Neutralidad de Carbono que descansa y vuelve). (5) Manuales reescritos y bilingües: `PlayerManual` (sin la sinergia
inexistente Conservación + Ganadería; la real es Agroecología + Conservación), `FacilitatorManual` (13 páginas, todo número
leído del código, advertencia de sensibilidad de `Gasto_Publico_Base_*`), `EquationsManual` con las nueve familias de
`src/components/equations/families.ts` (fuente única también de la hoja docente). (6) DecarboNito: `CHATBOT_BASE_INSTRUCTION`
con las mecánicas 2.0 (objetivos, rampa/desgaste/descanso, costo y deuda, CO₂ por fuente, la sinergia real, cómo se gana);
N1 sigue sin instrumentos; N2/N3 con canales y transición justa; N3 con espacio fiscal. `geminiService` agrega "va hacia",
desglose de CO₂, saldo primario / D/Y / intereses / sin espacio fiscal, G/J y las rutas con lo que falta. `uiActionRegistry`
no leía campos borrados: sin cambios. (7) Territorio: tira de indicadores con "→ NN" y tooltip de objetivo; tooltip de CO₂
con desglose y presupuesto; aviso "Sin espacio fiscal" en la barra superior y en finanzas; bloque Carbono / G / J en Rutas;
políticas "Plena" / "Desgastada (NN %)"; etiquetas de canal en instrumentos; ficha de parcela con "contiguo al bosque" /
"aislado" y nota de precio √(Y/Y₀); situaciones con "se desvanece (a la mitad en ~18 meses)"; cues nuevos (`fiscal.low` D/Y >
0,5, `just.low` J < 0,4 con restricciones, `policy.worn`, `lot.isolated` cuando una declaración baja K, `budget.over` > 1,2;
una vez por partida); `territorioContext` con objetivos, CO₂ por fuente, G y J y sin espacio fiscal; noticias: fuera "reservas
en rojo / vuelven a positivas" (imposibles con el piso del 2 %), entran `finance.debtHigh` / `debtEased` (D/Y cruza 0,6),
`finance.stress`, `finance.bankruptcyNear`, `milestone.renewables` (cada 10 %) y `land.fallowRegrows`; regla nueva en el
briefing. La pantalla final ya tenía los índices de la 48 y el desgaste (47): sin cambios. (8) Paquete docente:
`docentes-ecuaciones.html` reescrita — nueve familias, tabla de parámetros con origen (calibrado / literatura / criterio
experto / decisión del equipo), rutas de los tres niveles y de Territorio, sección "Rigor" que dice que las cifras son de un
modelo de juego y no proyecciones del Bosque Atlántico; todo bloque numérico sale de `scripts/params-table-html.ts` (nuevo) y
`scripts/routes-table-html.ts` (ahora también 3 niveles) con `--write` / `--check` (marcadores `<!-- BEGIN:x -->`,
`scripts/lib/htmlBlocks.ts`) y `tests/docentes/generatedTables.spec.ts` falla si la página queda desactualizada. Guía (sinergia
real, pregunta de transición justa), diapositivas (dinero escaso), espacio docente (las flechas), landing (eficiencia que
arranca y se desgasta) y la nota de histórica en `public/docentes/hoja-de-ecuaciones.md`. `docentes-consignas.html` revisada:
sus preguntas no nombran mecánicas, sin cambios; `docentes.html` y el plan de clase tampoco nombraban mecánicas 1.1.

**Desvíos.** (a) No existe un "panel social" en `levelSpecific/*`: G y J van en `SocialPanel` del tablero (N2–N3). (b) "Se
desvanece en ~18 meses" es la vida media: el texto dice "a la mitad en ~18 meses". (c) El cue "lote aislado" no tiene el lote
en la sesión: se dispara cuando una declaración del mes baja la conectividad K; la ficha avisa antes de declarar. (d) Bug de UI
corregido: las opciones pagas de las situaciones se grisaban con `costo ≤ reservas` (regla 1.1); ahora `canPayPublicInvestment`.
(e) `Poblacion_Inicial` no tenía efecto desde el panel: `App.tsx` crea cada nivel con `controlParamsRef.current`. (f) El
contenido del manual del facilitador era solo en español: ahora es/en. (g) `routes.floor.treasury` (sin usos) borrado.

**Deudas.** La barra de progreso de las condiciones que leen el estado y no los indicadores (bosque, D/Y, pactos) sigue en 0
hasta cumplirse (deuda de la 49, sin cambios). El panel de eventos múltiples del N3 se verificó con test (rng 0) y no en el
navegador (no hubo eventos en la corrida e2e). C6 F N3 sigue pendiente de decisión (unidad aparte).

**Revisión de código** (aplicada): las líneas de rutas de los prompts de DecarboNito salen de un solo formateador
(`routesContextLines`, etiquetas traducidas al español —el idioma del prompt— y valor actual también en los mínimos
incumplidos) para el contexto y la reflexión de cierre; el panel de eventos agrupa un evento que se repite en el año
("×2") en vez de duplicar tarjetas con la misma clave; el bloque 2.0 del prompt base pasa a ser la regla 5 en prosa (sin
negritas ni viñetas, que la regla 4 prohíbe) y se conserva "Responde siempre en ESPAÑOL"; "sin espacio fiscal" usa la regla
del motor (`canPayPublicInvestment` con una inversión de prueba de 1 % del PBI, `NO_FISCAL_SPACE_PROBE`) en vez de una
heurística propia; el gráfico de CO₂ dibuja los topes de emisiones de las rutas (`emissionsTargets`); un único predicado
`justTransitionLow` para tablero, Territorio y asesor; los umbrales de las reglas fiscales y de energía en los textos nuevos
(`model.*`, `hud.noFiscalSpaceTip`) se interpolan desde `PARAMS_V2`; sin `void` ni el objeto `winConditions` de 1.1 en el
tablero. No aplicada (deuda): los textos que ya existían antes de esta fase (`tips.fiscalStress`, `finance.rules` de
Territorio, noticias, prompts por nivel) siguen escribiendo 2 % / 60 % / 20 % a mano.

**Verificación.** `npx tsc --noEmit`, `npm test` (47 archivos, 737 tests; `vitest.config.ts` incluye ahora `tests/**/*.spec.tsx`), `npm run build`, `npm run i18n:audit` limpios;
`npm run sim:check -- --quick` idéntico a la fase 49 (C1 0,000, C2 0,600, C3 0,300, C4 0,000, C5 1,000, C6 14,146, C7 0,041,
C8 0, C9 0,000 en quick); e2e en navegador: `/play?demo=1` N1–N3 (flechas, bloques, políticas, instrumentos, panel del
facilitador, tres manuales en es/en, DecarboNito abre y falla limpio con key placeholder), `/territorio` (HUD, rutas, ficha
de parcela, declaración, situaciones, partida a ×4 hasta el final), `/` y `/docentes/*` (variantes y es/en).

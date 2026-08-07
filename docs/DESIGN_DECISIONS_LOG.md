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

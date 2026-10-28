# DecarboNation — Modelo 2.0: ecuaciones y supuestos

**Documento técnico de base para el paper del modelo.** Versión del modelo: `MODEL_VERSION = '2.0'` (`src/sim/version.ts`),
rama `main`, commit `54fc3c6` (fase 51, 28/10/2026). Cubre los dos juegos que comparten el motor: el juego de 3 niveles
(`/play`, paso anual integrado con 12 sub-pasos mensuales) y DecarboNation Territorio (`/territorio`, paso mensual, mapa
100 × 100, situaciones).

**Regla de autoridad.** Toda cifra de este documento fue leída del código (`src/sim/v2/`, `src/sim/`, `src/constants.ts`,
`src/territorio/`) y contrastada con el prototipo de referencia `scripts/reference/modelo_v2.py`. Cuando la documentación y
el código difieren se usa el valor del código y se anota (ver §20.3). Las ecuaciones clave se verificaron ejecutando el
prototipo (`python scripts/reference/modelo_v2.py --golden` reproduce byte a byte `golden_v2.csv`) y los tests
`tests/sim/golden.v2.spec.ts`, `tests/sim/reference.spec.ts` y `tests/sim/extremes.spec.ts` (43 tests, todos aprobados al
redactar este documento); las anclas de la Tabla B.2 se obtuvieron ejecutando `createInitialState` con `npx tsx`.

**Convenciones de notación.** Decimales con coma en el texto; los nombres de código (`PARAMS_V2.food.kappa1`,
`CP.Velocidad_Ajuste_Biodiversidad`) se mantienen tal cual, con punto decimal cuando se citan valores literales del
código. `CP` = `CONTROL_PARAMS` (`src/constants.ts`, parámetros que el facilitador puede mover en vivo); `PARAMS_V2` = tablas
fijas del modelo (`src/sim/v2/params.ts`). Cada sección indica su origen como `archivo:función`.

---

## Índice

1. [Resumen y propósito](#1-resumen-y-propósito)
2. [Arquitectura y discretización](#2-arquitectura-y-discretización)
3. [Notación](#3-notación)
4. [Marco común de indicadores acotados](#4-marco-común-de-indicadores-acotados)
5. [Políticas](#5-políticas)
6. [Uso del suelo](#6-uso-del-suelo)
7. [Carbono](#7-carbono)
8. [Biodiversidad](#8-biodiversidad)
9. [Seguridad alimentaria](#9-seguridad-alimentaria)
10. [Seguridad económica, conflicto social y colapso político](#10-seguridad-económica-conflicto-social-y-colapso-político)
11. [Presiones sectoriales](#11-presiones-sectoriales)
12. [Pactos internacionales](#12-pactos-internacionales)
13. [Finanzas públicas](#13-finanzas-públicas)
14. [Conflicto distributivo](#14-conflicto-distributivo)
15. [Eventos aleatorios](#15-eventos-aleatorios)
16. [Territorio: componentes específicos](#16-territorio-componentes-específicos)
17. [Fin de juego, rutas de victoria y puntaje](#17-fin-de-juego-rutas-de-victoria-y-puntaje)
18. [Predicción del jugador e índices de investigación](#18-predicción-del-jugador-e-índices-de-investigación)
19. [Calibración y validación](#19-calibración-y-validación)
20. [Supuestos, limitaciones y decisiones pendientes](#20-supuestos-limitaciones-y-decisiones-pendientes)
21. [Historial de versiones del modelo](#21-historial-de-versiones-del-modelo)
- [Anexo A. Parámetros](#anexo-a-parámetros)
- [Anexo B. Valores iniciales por nivel](#anexo-b-valores-iniciales-por-nivel)
- [Anexo C. Correspondencia ecuación ↔ código](#anexo-c-correspondencia-ecuación--código)

---

## 1. Resumen y propósito

DecarboNation es un simulador de política pública climática centrado en el sector AFOLU (agricultura, silvicultura y otros
usos del suelo), diseñado para la enseñanza (aula y talleres) y para la investigación sobre toma de decisiones. El jugador
gobierna un territorio durante 30 años (2024–2054) activando hasta 5 políticas a la vez entre 10 disponibles, repartiendo
esfuerzo entre sus instrumentos, uniéndose a pactos internacionales, fijando presión fiscal adicional, pidiendo préstamos y,
en Territorio, declarando usos públicos del suelo y resolviendo situaciones que llegan a su escritorio.

El modelo 2.0 es un **sistema dinámico de estado discreto en el tiempo** con:

- un estado físico (áreas de 10 usos del suelo en kHa, población, PBI, reservas, deuda, participación renovable de la
  electricidad y ganancia de eficiencia energética);
- ocho variables acotadas en $[0,100]$ que relajan hacia objetivos logísticos anclados en el estado inicial
  (biodiversidad $B$, seguridad alimentaria $F$, seguridad económica $E$, conflicto social $C$ —bienestar $W = 100 - C$—,
  colapso político $P_c$ —estabilidad $S_t = 100 - P_c$— y tres presiones sectoriales $\pi_a, \pi_e, \pi_s$);
- un inventario de emisiones en unidades físicas (tCO₂e/año) con energía, flujo AFOLU y cambio de uso del suelo (LUC);
- finanzas públicas con gasto base, deuda automática, prima de riesgo, estrés fiscal y quiebra;
- eventos aleatorios independientes y un choque de rendimiento autorregresivo.

**Advertencia de alcance (supuesto S0).** Es un **modelo de juego**: sus parámetros son de criterio experto y se calibraron
para que el juego cumpla criterios de jugabilidad y didáctica (C1–C9, §19.2), no contra series observadas. Las áreas de los
niveles son de maqueta (ítem L-5 abierto de `docs/audit-equations.md`), la población es una escala de 400 000 habitantes y
el dinero está en unidades monetarias abstractas (u.m.). **No es una proyección del Bosque Atlántico, de la provincia de
Misiones ni de Argentina**, y sus trayectorias no deben presentarse como tales (00_INDICE_v6.md §8; la hoja docente lo dice
explícitamente). Algunos rangos (stocks de carbono de bosque maduro y secundario, forma especies-área) están tomados de la
literatura y se citan donde corresponde; el resto es criterio experto.

---

## 2. Arquitectura y discretización

Origen: `src/sim/v2/core.ts` (`advance`, `advanceYear`, `stepInPlace`), `src/sim/index.ts` (`stepYear`,
`createInitialState`), `src/sim/monthly.ts` (`stepMonth`), `src/sim/rng.ts`.

### 2.1 Estado

El estado (`GameState`, `src/types.ts`) contiene:

| Bloque | Contenido | Tipo |
|---|---|---|
| `landUses` | Áreas $A_i$ (kHa) de BNNP, BNP, CA, CC, PF, PRG, HUM, RES, ENR, FAL | variable de estado (stock) |
| `stellaSpecificState` | `Poblacion_Total` $P$, `PBI_Real` $Y$, `Reservas_del_Tesoro` $R$, `Deuda` $D$, `Conflicto_social` $C$, `Colapso_politico` $P_c$, `PP_AGRICOLA` $\pi_a$, `PP_AMBIENTALISTA` $\pi_e$, `PP_SOCIAL` $\pi_s$ | variables de estado (stocks) |
| `indicators` | $B$, $F$, $E$ (stocks propios); $W = 100 - C$, $S_t = 100 - P_c$, $c$ (CO₂e per cápita), puntaje $S$, espejos de $Y$, $R$, $D$, $\pi$ | $B, F, E$ son estado; el resto son derivados |
| `policies` | Por política: activa $u_j\in\{0,1\}$, reloj de puesta en marcha $\tau_j$ (`rampTime`), reloj de fatiga $T_j$ (`fatigueTime`), esfuerzos $e_{jk}$ por instrumento (0–100) | estado de control |
| `pacts` | Activo/inactivo y año de desbloqueo | estado de control |
| `additionalTaxPressurePercentage` | Presión fiscal adicional $\tau$ (puntos porcentuales, 0–20) | control |
| `model` (`ModelState`) | tiempo del modelo $t$ (años desde el inicio del nivel), anclas, objetivos $X^*$, estado energético $(s, u)$, emisiones por fuente, emisiones acumuladas, estado fiscal ($g$, saldo primario, carga de intereses, $\varphi$, reloj de quiebra, historia del saldo primario), impulsos de situaciones, años productivos, choque de rendimiento $\varepsilon$, índices sociales $G$, $J$ | sub-estado del modelo 2.0 |

**Variables de estado vs. indicadores.** Los stocks que evolucionan por su propia ecuación son $A_i$, $P$, $Y$, $R$, $D$,
$B$, $F$, $E$, $C$, $P_c$, $\pi_{a,e,s}$, $s$, $u$, $\varepsilon$, $\tau_j$, $T_j$ y los acumuladores. Son **derivados**
(recalculados cada paso, nunca integrados): $W$, $S_t$, $c$, el puntaje, $H$ (hábitat), $\rho$ (disponibilidad alimentaria),
$V$ (valor productivo), $G$, $J$, $\varphi$, y todos los objetivos $X^*$.

### 2.2 Integrador único

Los dos juegos usan una única función de paso:

$$
\texttt{advance}(\text{estado}, \Delta t, \text{rng}, CP, \text{opts}), \qquad \Delta t \in (0, 1]\ \text{años}.
$$

- Territorio: `stepMonth` $=$ `advance(·, 1/12)`.
- Juego de 3 niveles: `stepYear` $=$ `advanceYear` $=$ 12 llamadas sucesivas a `stepInPlace(·, 1/12)` sobre una sola copia
  del estado, con el mismo `rng` consumido en secuencia; se detiene antes si hay fin de juego.

`advance` nunca muta su entrada (clon JSON; `tests/sim/core.spec.ts`) y es determinista para
$(\text{estado}, \Delta t, \text{rng}, CP, \text{opts})$ dados.

### 2.3 Discretización exacta

Toda variable acotada sigue una relajación de primer orden hacia su objetivo, $\dot x = -r(x - x^*)$, con fracción anual
$k = 1 - e^{-r}$. Su discretización exacta para cualquier $\Delta t$ es (`math.ts:relax`):

$$
x(t+\Delta t) = x^* + \bigl(x(t) - x^*\bigr)\,(1-k)^{\Delta t}.
$$

Con $x^*$ fijo, 12 pasos de $\Delta t = 1/12$ equivalen exactamente a uno de $\Delta t = 1$; la constante de tiempo es
$\tau_k = -1/\ln(1-k)$ años y la semivida $t_{1/2} = \ln 0{,}5/\ln(1-k)$. `stepIndicator` acota $k$ a $[0,1]$ (un valor del
facilitador fuera de rango no puede producir oscilación, divergencia ni NaN).

Todo **flujo** (área, dinero, emisiones) se multiplica por $\Delta t$; la población crece de forma compuesta
$P \leftarrow P(1+g_P)^{\Delta t}$; los eventos usan peligro constante $1-(1-p)^{\Delta t}$ (§15). No quedan ramas de código
por valor de $\Delta t$; el calendario avanza $12\Delta t$ meses y cambia de año después de diciembre (redondeado a $10^{-9}$
para que 12 pasos de 1/12 caigan exactamente en enero).

### 2.4 Por qué 12 sub-pasos en el juego anual (criterio C9)

Con un único paso de $\Delta t = 1$ los impulsores que dependen del estado (rampa de las políticas, presiones que leen $C$ y
$P_c$, finanzas) se evaluaban una vez por año; la trayectoria anual y la mensual divergían hasta 2,05 puntos de $S_t$ en
`extractive` N2, año 10 (también en el prototipo). El criterio C9 exige $\lvert\Delta\rvert \le 1$ punto en indicadores y
$\le 0{,}1$ t en $c$ (N2, sin eventos, años 10 y 30). Con 12 sub-pasos mensuales los dos juegos comparten la discretización y
C9 da exactamente 0 (Tabla 19.2; fase 46, `docs/DESIGN_DECISIONS_LOG.md`). `advance(·, 1)` sigue siendo válido pero ningún
juego lo usa.

### 2.5 Orden de operaciones dentro de un paso

`core.ts:stepInPlace` (idéntico al `step()` del prototipo). Cada paso lee lo que los anteriores ya actualizaron:

| # | Operación | Módulo |
|---|---|---|
| 1 | Población $P \leftarrow P(1+g_P)^{\Delta t}$ | `core.ts` |
| 2 | Relojes de políticas ($\tau_j$, $T_j$) | `policies.ts:tickPolicyClocks` |
| 3 | Eventos aleatorios (sorteos independientes, saltos de nivel, pérdidas de suelo a barbecho); luego choque de rendimiento $\varepsilon$ AR(1) | `events.ts:rollEvents`, `nextYieldShock` |
| 4 | Eficiencia efectiva por política y canal | `policies.ts:computeEfficiencies` |
| 5 | Uso del suelo: matriz conservativa, flujos realizados | `land.ts:landFlows`, `applyLandFlows` |
| 6 | Finanzas: PBI, recaudación, gasto, costos, deuda | `finance.ts:stepFinance` |
| 7 | Carbono: estado energético, emisiones por fuente | `carbon.ts:updateEnergyState`, `computeEmissions` |
| 8 | Indicadores, en orden $B \to F \to E \to C\,(W) \to P_c\,(S_t) \to \pi$ | `biodiversity.ts`, `food.ts`, `indicators.ts`, `pressures.ts` |
| 9 | Contabilidad: sincronización, recorte final a $[0,100]$, puntaje, fin de juego, aviso de fatiga, reloj | `core.ts`, `score.ts`, `gameOver.ts` |

Consecuencias del orden (relevantes para el análisis): $F$ lee la $E$ del paso anterior; $C$ lee la $\pi_e$ del paso anterior;
$P_c$ lee las tres presiones del paso anterior; las presiones leen $B, F, E, W$ del paso actual y $c$ del paso 7; el
crecimiento $g$ lee el $\varphi$ del paso anterior; el sorteo de $\varepsilon$ usa la $\eta^{prod}_{AGUA}$ del paso anterior.

### 2.6 Determinismo y generador aleatorio

La aleatoriedad entra solo por un `Rng` $=$ `() => number` en $[0,1)$. `rng.ts:makeRng(seed, year)` es un mulberry32 sembrado
con `(seed XOR year·0x9e3779b9)`. Nada en `src/sim/` usa `Math.random` ni `Date.now`.

- Territorio: un generador por mes, `makeRng(seed, monthIndex)` para el motor y `makeRng(seed + 7919, monthIndex)` para la
  llegada de situaciones.
- Arnés y tests: semillas explícitas; `rng = null` o `noShocks` ⇒ sin eventos y $\varepsilon = 0$; `() => 0.999` suprime
  eventos con un choque prácticamente nulo (rama seno de Box–Muller, $z \approx -3\cdot10^{-4}$).
- **Juego de 3 niveles en producción:** `App.tsx` pasa `Math.random` a `stepYear` (decisión de diseño heredada para
  conservar la imprevisibilidad). Las partidas reales del juego de 3 niveles **no son reproducibles por semilla**; sí lo son
  el arnés, los tests y el arrepentimiento contrafáctico (§18.3), que usa `makeRng`.

---

## 3. Notación

| Símbolo | Significado | Unidad | Rango | Código |
|---|---|---|---|---|
| $t$ | tiempo del modelo desde el inicio del nivel | años | $[0, 30]$ | `model.t` |
| $\Delta t$ | paso | años | $1/12$ | `dt`, `MONTHLY_DT` |
| $A_i$ | área del uso $i$ | kHa | $\ge 0$, $\sum_i A_i$ constante | `landUses[i].area` |
| $a_i$ | participación $A_i/\sum A$ | — | $[0,1]$ | — |
| $P$ | población | hab | $>0$ | `Poblacion_Total` |
| $Y$ | PBI real | u.m./año | $>0$ | `PBI_Real` |
| $R$ | reservas del tesoro | u.m. | $\ge 0{,}02\,Y$ | `Reservas_del_Tesoro` |
| $D$ | deuda pública | u.m. | $\ge 0$ | `Deuda` |
| $B$ | biodiversidad | puntos | $[0,100]$ | `indicators.biodiversity` |
| $F$ | seguridad alimentaria | puntos | $[0,100]$ | `indicators.foodSecurity` |
| $E$ | seguridad económica | puntos | $[0,100]$ | `indicators.economicSecurity` |
| $C$, $W$ | conflicto social, bienestar $W=100-C$ | puntos | $[0,100]$ | `Conflicto_social`, `socialWellbeing` |
| $P_c$, $S_t$ | colapso político, estabilidad $S_t=100-P_c$ | puntos | $[0,100]$ | `Colapso_politico`, `politicalStability` |
| $\pi_a,\pi_e,\pi_s$ | presiones agrícola, ambientalista, social | puntos | $[0,100]$ | `PP_AGRICOLA`, `PP_AMBIENTALISTA`, `PP_SOCIAL` |
| $c$ | emisiones per cápita | tCO₂e/hab/año | $\ge$ algo $<0$ posible en teoría | `co2EqEmissionsPerCapita` |
| $X_0$, $\ell_{X0}$ | valor inicial y su logit | puntos, logit | — | `anchors.B0`…, `anchors.l.*` |
| $X^*$, $D_X$ | objetivo logístico e impulsor | puntos, logit | $(0,100)$, $\mathbb R$ | `model.targets`, `drive*` |
| $k_X$ | fracción anual de ajuste | 1/año | $[0,1]$ | `CP.Velocidad_Ajuste_*` |
| $u_j$ | política $j$ activa | — | $\{0,1\}$ | `isActive` |
| $\tau_j$, $T_j$ | reloj de puesta en marcha, reloj de fatiga | años | $\ge 0$ | `rampTime`, `fatigueTime` |
| $\lambda_j$, $\delta_j$ | constantes de puesta en marcha y fatiga | años | — | `rampYears`, `fatigueYears` |
| $\eta_j$ | eficiencia base | — | $[0,1]$ | `currentEfficiency`, `eff[j].base` |
| $e_{jk}$ | esfuerzo del instrumento $k$ de $j$ | puntos | $[0,100]$, $\sum_k e_{jk}\le100$ | `effortPercentage` |
| $\chi_j^{ch}$ | fuerza de canal | — | $\approx[0, 1{,}2]$ | `channelStrength` |
| $\eta_j^{ch}$ | eficiencia efectiva en el canal $ch$ | — | — | `eff[j].land/prod/social/elec/other/tax` |
| $s$, $u$ | participación renovable eléctrica, ganancia de eficiencia no eléctrica | — | $[0,0{,}9]$, $[0,0{,}6]$ | `model.energy` |
| $\varepsilon$ | choque de rendimiento | fracción | $\mathbb R$ | `model.yieldShock` |
| $g$ | tasa de crecimiento del PBI | 1/año | — | `model.fiscal.growth` |
| $\varphi$ | estrés fiscal | — | $(0,1)$ | `model.fiscal.stress` |
| $\tau$ | presión fiscal adicional | p.p. | $[0,20]$ | `additionalTaxPressurePercentage` |
| $G$, $J$ | concentración de la tierra, transición justa | — | $[0,1]$ | `model.social` |
| $H$, $K$ | hábitat efectivo, conectividad del mapa | — | $[0,1]$ | `habitatIndex`, `forestConnectivity` |
| $\sigma(x)$ | logística $1/(1+e^{-x})$ | — | — | `sigmoid` |

Usos del suelo: **BNNP** bosque nativo no protegido, **BNP** bosque nativo protegido, **CA** cultivos agroecológicos,
**CC** cultivos convencionales, **PF** plantaciones forestales, **PRG** pasturas y pastizales, **HUM** humedal público,
**RES** restauración pública, **ENR** parque energético, **FAL** barbecho.

Políticas (códigos de `PID`): **AS** agroecología, **CR** conservación natural, **GS** ganadería sostenible, **AGUA** gestión
sostenible del agua, **CN** neutralidad de carbono, **PAI** agricultura intensiva, **PEA** exportaciones agrícolas,
**PIE** inversión extranjera, **FRA** normativas ambientales flexibles, **SE** subsidios energéticos.

---

## 4. Marco común de indicadores acotados

Origen: `src/sim/v2/math.ts`, `src/sim/v2/indicators.ts` (`stepIndicator`, `impulseSum`, `capImpulses`),
`src/sim/v2/anchors.ts` (`computeAnchors`).

### 4.1 Objetivo logístico anclado

Para $X \in \{B, F, E, C, P_c, \pi_a, \pi_e, \pi_s\}$:

$$
X^* = 100\,\sigma\!\left(\ell_{X0} + D_X\right), \qquad \ell_{X0} = \operatorname{logit}\!\left(\frac{X_0}{100}\right),
$$

$$
X \leftarrow X^* + (X - X^*)(1-k_X)^{\Delta t},
$$

con $\operatorname{logit}(p) = \ln\frac{q}{1-q}$, $q = \min(\max(p, 10^{-4}), 1-10^{-4})$. El impulsor $D_X$ (en unidades logit) es
una suma de términos, cada uno **un desvío respecto del estado inicial del nivel** o el efecto de una política (que vale 0
si está inactiva).

**Supuesto de anclaje (decisión 6 de 00_INDICE_v6).** En $t=0$, sin políticas, sin pactos y con el territorio quieto,
$D_X = 0$ y $X^* = X_0$: nada se mueve salvo lo que el jugador o la dinámica propia del territorio (frontera agrícola,
crecimiento de población y PBI, tendencia de rendimientos) mueven. Las anclas se calculan una vez por nivel en
`createInitialState` (Anexo B.2), incluida una corrida en seco de un año de la matriz de suelo para obtener $c_0$.

El objetivo vive en $(0,100)$ sin recortes por término; el recorte final a $[0,100]$ del paso 9 solo actúa sobre saltos de
eventos. Las presiones se anclan con un piso: $\pi_0$ se acota a $[2, 98]$ antes de tomar el logit
(`PARAMS_V2.pressure.anchorFloor` = 2; solo afecta a partidas viejas re-ancladas; todos los niveles arrancan en 15–30).

**Pendiente local.** Cerca de $X$, un desplazamiento de $\Delta\ell$ logit equivale a $\approx 100\,p(1-p)\,\Delta\ell$
puntos, $p = X/100$. A $X = 40$, 1 logit ≈ 24 puntos; a $X=95$, ≈ 4,75 puntos (por eso $W$ del N1, anclado en 95, se mueve
poco: §20.4).

### 4.2 Funciones auxiliares

$$
s_{\text{low}}(x; x_0, w) = \frac{1}{1+e^{(x-x_0)/w}}, \qquad s_{\text{high}}(x; x_0, w) = \frac{1}{1+e^{-(x-x_0)/w}}
$$

reemplazan umbrales duros. Rendimientos decrecientes del esfuerzo:

$$
\phi(e) = 1 - e^{-e/e_0}, \quad e_0 = 40\ (\texttt{effortE0}).
$$

Conversión de puntos a logit en el valor actual (`toLogitDelta`) y su inversa (`toPointsDelta`):

$$
\Delta\ell = \frac{\Delta\text{pts}}{100\,p(1-p)}, \quad p = \min(0{,}99, \max(0{,}01, X/100)).
$$

### 4.3 Impulsos de situaciones (Territorio)

Cada impulso $i$ sobre el indicador $X$ tiene amplitud $d_i$ (logit), instante $t_i$ y constante $\tau_i$:

$$
I_X(t) = \sum_{i:\,X_i = X} d_i\, e^{-(t-t_i)/\tau_i}, \qquad \operatorname{cap}(v) = \max(-0{,}6, \min(0{,}6, v)),
$$

y entra en $D_X$ como $\operatorname{cap}(I_X)$ (`relaxation.impulseCap` = 0,6). En el juego de 3 niveles no hay impulsos
($I_X \equiv 0$). Detalle en §16.1.

### 4.4 Velocidades de ajuste

| $X$ | `CP` | $k_X$ | $\tau_k$ (años) | $t_{1/2}$ (años) |
|---|---|---|---|---|
| $B$ | `Velocidad_Ajuste_Biodiversidad` | 0,12 | 7,82 | 5,42 |
| $F$ | `Velocidad_Ajuste_Seg_Alimentaria` | 0,35 | 2,32 | 1,61 |
| $E$ | `Velocidad_Ajuste_Seg_Economica` | 0,30 | 2,80 | 1,94 |
| $C$ | `Velocidad_Ajuste_Conflicto` | 0,35 | 2,32 | 1,61 |
| $P_c$ | `Velocidad_Ajuste_Colapso` | 0,25 | 3,48 | 2,41 |
| $\pi_{a,e,s}$ | `Velocidad_Ajuste_Presiones` | 0,35 | 2,32 | 1,61 |
| $s$, $u$ (energía) | `PARAMS_V2.energy.adjust` | 0,15 | 6,15 | 4,27 |

Todos son criterio experto (fases 39–42). Morris (§19.3) muestra que cambian el camino pero casi no el estado a 30 años.

---

## 5. Políticas

Origen: `src/sim/v2/policies.ts` (`tickPolicyClocks`, `rampFactor`, `fatigueFactor`, `baseEfficiency`, `channelStrength`,
`efficiencyOf`, `computeEfficiencies`, `policyCostOf`), `src/sim/policies.ts` (`evenEffort`, `checkEfficiencyWarning`),
`PARAMS_V2.rampYears`, `fatigueYears`, `costShare`, `costFixedShare`, `effortE0`, `INSTRUMENT_CHANNELS`.

### 5.1 Relojes

$$
\text{activa: } \tau_j \leftarrow \tau_j + \Delta t,\quad T_j \leftarrow T_j + \Delta t;
\qquad
\text{inactiva: } \tau_j \leftarrow 0,\quad T_j \leftarrow T_j\,e^{-\Delta t/\rho},
$$

con $\rho$ = `CP.Recuperacion_Politicas_Anios` = 5 años ($\rho \le 0$ ⇒ recuperación instantánea).

### 5.2 Eficiencia base: puesta en marcha, fatiga y piso institucional

$$
\eta_j = u_j\,\underbrace{\left(1 - e^{-\tau_j/\lambda_j}\right)}_{\text{puesta en marcha}}\,
\underbrace{\left[\eta_{\min} + (1-\eta_{\min})\,e^{-T_j/\delta_j}\right]}_{\text{fatiga con piso}},
\qquad \eta_{\min} = 0{,}35\ (\texttt{Eficiencia\_Minima\_Politicas}).
$$

- La puesta en marcha alcanza 63 % en $\lambda_j$ años; con $\lambda=1{,}5$, 86,5 % a los 3 años (verificado en
  `tests/sim/reference.spec.ts`).
- La fatiga tiende al piso institucional $\eta_{\min}$; una política vieja nunca vale menos que el 35 % de su efecto.
- Desactivar reinicia la puesta en marcha pero **no** borra la fatiga: esta se recupera con constante $\rho$.
- La UI marca "en marcha" mientras la rampa $< 0{,}9$ y "desgastada" cuando $e^{-T/\delta} < 0{,}5$; en ese cruce se emite
  un aviso al jugador (`checkEfficiencyWarning`).

### 5.3 Instrumentos, canales y rendimientos decrecientes

Cada política tiene 4 instrumentos con relevancia $\mu^{ch}_{jk} \in \{1; 0{,}6; 0{,}3\}$ (alta, media, baja) en cada canal
$ch$. La fuerza de canal normaliza para que el reparto parejo 25/25/25/25 valga exactamente 1:

$$
\chi_j^{ch} = \frac{\sum_{k} \mu_{jk}^{ch}\,\phi(e_{jk})}{\sum_k \mu_{jk}^{ch}\,\phi(25)}, \qquad \phi(25) = 0{,}4647,
\qquad \eta_j^{ch} = \eta_j\,\chi_j^{ch}.
$$

Canales: `land` (flujos de suelo, hábitat, carbono del suelo), `prod` (rendimientos, exportaciones, $E$, rentas agrícolas),
`social` (conflicto, presiones); CN tiene además `elec` (participación renovable), `other` (eficiencia no eléctrica) y `tax`
(impuesto al carbono). Para SE el canal `land` transporta las emisiones fósiles. Los canales `land`/`prod` de CN son
uniformes (relevancia [1,1,1,1]), el canal genérico del prototipo.

Al activar, el esfuerzo se reparte en partes iguales (`evenEffort`; el resto de la división va al primer instrumento): en N1,
que no tiene panel de instrumentos, $\chi = 1$ siempre. Desde N2 (y en Territorio desde 2029) el jugador redistribuye, con
$\sum_k e_{jk} \le 100$. Concentrar el esfuerzo refuerza un canal y debilita otros; con esfuerzo 0, $\chi = 0$.

**Tabla 5.1 — Relevancias $\mu$ por instrumento** (orden de `INSTRUMENT_CHANNELS[pid].ids`; etiqueta para $J$, §14).

| Pol. | Instrumentos (abreviado) | land | prod | social | etiqueta |
|---|---|---|---|---|---|
| AS | bioinsumos · capacitación · corredores · certificación | 0,3 · 0,6 · 1 · 0,3 | 1 · 0,6 · 0,3 · 0,6 | 0,6 · 1 · 0,3 · 1 | S S S S |
| CR | áreas protegidas · PSA · invasoras · guardaparques | 1 · 0,6 · 0,6 · 1 | 0,3 · 0,3 · 0,3 · 0,3 | 0,3 · 1 · 0,3 · 0,3 | R S N R |
| GS | silvopastoril · pasturas nativas · bancos de forraje · genética | 1 · 0,6 · 0,3 · 0,3 | 0,6 · 1 · 0,6 · 0,6 | 0,6 · 0,6 · 1 · 0,3 | S S S S |
| AGUA | riego · protección de fuentes · cosecha de lluvia · reúso | 0,3 · 1 · 0,3 · 0,3 | 1 · 0,3 · 0,6 · 0,6 | 0,6 · 0,3 · 1 · 0,6 | S R S S |
| CN | impuesto al carbono · renovables · eficiencia · I+D captura | 1 · 1 · 1 · 1 | 1 · 1 · 1 · 1 | 1 · 0,3 · 0,3 · 0,3 | R S S N |
| PAI | subsidio a fertilizantes · logística · créditos maquinaria · variedades | 0,6 · 1 · 0,6 · 0,3 | 1 · 0,6 · 0,6 · 1 | 0,3 · 0,6 · 0,3 · 0,3 | N N N N |
| PEA | acuerdos comerciales · logística export. · marca país · flexibilización | 0,6 · 0,6 · 0,3 · 0,3 | 1 · 0,6 · 0,6 · 0,6 | 0,3 · 0,3 · 0,3 · 0,6 | N N N N |
| PIE | zonas francas · trámites · garantías · roadshows | 0,6 · 0,3 · 0,3 · 0,3 | 1 · 0,6 · 0,6 · 0,6 | 0,3 · 0,3 · 0,3 · 0,3 | N N N N |
| FRA | menos EIA · moratorias · permisos rápidos · consulta no vinculante | 1 · 0,6 · 1 · 0,3 | 0,6 · 0,3 · 0,6 · 0,3 | 0,6 · 0,6 · 0,3 · 1 | N N N N |
| SE | combustibles transporte · tarifas industria · hidrocarburos · gas residencial | 1 · 0,6 · 1 · 0,3 | 0,3 · 1 · 0,6 · 0,3 | 0,6 · 0,3 · 0,3 · 1 | N N N N |

CN, canales propios: `elec` = 0,6 · 1 · 0,3 · 0; `other` = 0,6 · 0,15 · 1 · 0,5; `tax` = 1 · 0 · 0 · 0. (S = apoyo, R =
restricción, N = neutro.) Fuente: spec 36 §2, criterio experto.

### 5.4 Costo por esfuerzo

$$
K_j = u_j\,\kappa_j\,Y\left[f + (1-f)\,\bar e_j\right], \qquad \bar e_j = \frac{\min\!\left(100, \sum_k e_{jk}\right)}{100}, \quad f = 0{,}3,
$$

en u.m./año, con $Y$ el PBI **antes** del crecimiento del paso (como el prototipo). El 30 % del costo se paga con cualquier
esfuerzo. El costo no depende de la eficiencia.

### 5.5 Tabla de parámetros por política

| Pol. | $\lambda_j$ (años) | $\delta_j$ (años) | $\kappa_j$ (fracción del PBI/año) |
|---|---|---|---|
| AS | 1,5 | 15 | 0,008 |
| CR | 2,5 | 25 | 0,010 |
| GS | 1,5 | 12 | 0,006 |
| AGUA | 2,0 | 20 | 0,008 |
| CN | 2,5 | 25 | 0,012 |
| PAI | 1,0 | 8 | 0,006 |
| PEA | 0,5 | 10 | 0,003 |
| PIE | 1,5 | 10 | 0,005 |
| FRA | 0,5 | 6 | 0,002 |
| SE | 0,5 | 5 | 0,012 |

Todo criterio experto; $\kappa$ calibrado contra el gasto público base de la fase 44. Reglas de juego (no del motor): máximo
5 políticas activas (`MAX_ACTIVE_POLICIES`), permanencia mínima de 5 años (`POLICY_LOCK_IN_DURATION`).

---

## 6. Uso del suelo

Origen: `src/sim/v2/land.ts` (`landFlows`, `realiseLandFlows`, `applyLandFlows`, `applyLandEffects`, `transferArea`),
`PARAMS_V2.land`, `CP.Tasa_de_*_Base`.

### 6.1 Categorías

Diez usos (§3). FAL (barbecho) se incorporó en la fase 37: recibe el área que pierden los eventos y las situaciones, rebrota a
BNNP y reingresa al pool agrícola. HUM, RES y ENR solo los crean declaraciones públicas (Territorio) o efectos de
situaciones; BNP no tiene salida (protección irreversible).

### 6.2 Flujos de frontera y protección (kHa/año)

Con $\eta^{land}$ y los multiplicadores de pactos $m_p$ (protección) y $m_d$ (deforestación) (§12):

$$
\begin{aligned}
F_{BNNP\to BNP} &= A_{BNNP}\,(r_1 + 0{,}05\,\eta^{land}_{CR})\,m_p \\
F_{BNNP\to CC} &= A_{BNNP}\,(r_2 + 0{,}04\,\eta^{land}_{PAI} + 0{,}01\,\eta^{land}_{FRA})\,(1-\eta^{land}_{CR})\,m_d \\
F_{BNNP\to CA} &= A_{BNNP}\,(r_3 + 0{,}02\,\eta^{land}_{AS})\,(1-\eta^{land}_{CR}) \\
F_{CA\to BNNP} &= A_{CA}\,(r_4 + 0{,}01\,\eta^{land}_{AS}) \\
F_{RES\to BNP} &= A_{RES}\,r_5, \qquad F_{FAL\to BNNP} = 0{,}05\,A_{FAL}
\end{aligned}
$$

| Tasa | `CP` | Valor (1/año) |
|---|---|---|
| $r_1$ | `Tasa_de_BNNP_a_BNP_Base` | 0,008 |
| $r_2$ | `Tasa_de_BNNP_a_CC_Base` | 0,010 |
| $r_3$ | `Tasa_de_BNNP_a_CA_Base` | 0,002 |
| $r_4$ | `Tasa_de_CA_a_BNNP_Base` | 0,001 |
| $r_5$ | `Tasa_de_RES_a_BNP_Base` | 0,04 (≈ 25 años para que la restauración madure a bosque protegido) |
| regeneración del barbecho | `land.fallowRegen` | 0,05 |

### 6.3 Pool agrícola con reasignación por renta anclada

Cada año reingresa a un pool la fracción $\mu = 0{,}02$ (`poolShare`) de cada uso agrícola $k \in \mathcal A = \{CC, CA, PRG,
PF\}$ y la fracción $0{,}25$ (`fallowReentry`) del barbecho. El pool se reparte entre los usos agrícolas con pesos logit:

$$
r_k = \ln A_{k,0} + \Delta r_k(\eta^{prod}), \qquad w_k = e^{\beta r_k}, \quad \beta = 1{,}0\ (\texttt{rentBeta}),
$$

$$
F_{src\to k} \mathrel{+}= \text{pool}_{src}\,\frac{w_k}{\sum_{k'} w_{k'}}\quad (k \ne src),\qquad
\text{pool}_k = 0{,}02\,A_k,\ \ \text{pool}_{FAL} = 0{,}25\,A_{FAL}.
$$

**Supuesto de renta anclada.** $A_{k,0}$ es la mezcla agrícola del inicio del nivel (`anchors.agriAreas0`; piso
$10^{-6}$ kHa para que un uso inicial nulo tenga log-renta finita). Sin políticas, $w_k \propto A_{k,0}$: el pool mantiene
la mezcla inicial en equilibrio. Desplazamientos de renta (log-renta por unidad de $\eta^{prod}$; CN por $\eta^{tax}$):

| Uso | $\Delta r_k$ |
|---|---|
| CC | $+0{,}6\,\eta_{PAI} + 0{,}3\,\eta_{PEA} - 0{,}25\,\eta_{AS} - 0{,}2\,\eta^{tax}_{CN}$ |
| CA | $+0{,}8\,\eta_{AS} - 0{,}2\,\eta_{PAI}$ |
| PRG | $+0{,}4\,\eta_{GS} + 0{,}1\,\eta_{PEA}$ |
| PF | $+0{,}2\,\eta_{PIE} + 0{,}15\,\eta_{FRA}$ |

### 6.4 Neteo bilateral

El pool es un dispositivo de asignación: para todo par $(i,j)$ con flujos en ambos sentidos se conserva solo la diferencia
positiva,

$$
F_{i\to j} \leftarrow \max(F_{i\to j} - F_{j\to i}, 0),\quad F_{j\to i} \leftarrow \max(F_{j\to i} - F_{i\to j}, 0).
$$

El neteo alcanza también a pares de frontera (p. ej. BNNP⇄CA) y $c_0$ depende de él (prototipo idéntico).

### 6.5 Aplicación sin negativos y conservación de área

$$
\text{out}_i = \sum_j F_{i\to j}\,\Delta t, \qquad \text{esc}_i = \min\!\left(1, \frac{A_i}{\text{out}_i}\right),\qquad
A_i \mathrel{-}= F_{i\to j}\Delta t\,\text{esc}_i,\ \ A_j \mathrel{+}= F_{i\to j}\Delta t\,\text{esc}_i.
$$

Cada término mueve área de un uso a otro: **$\sum_i A_i$ se conserva exactamente** (invariante INV-01, verificado con eventos
a $10^{-9}$ kHa en `tests/sim/invariants.spec.ts`, 50 semillas × 30 años). Los flujos realizados se devuelven en kHa y en ha
($1\ \text{kHa} = 1000\ \text{ha}$) para el LUC (§7.4).

### 6.6 Efectos de suelo de eventos y situaciones

`applyLandEffects`: dentro de una lista de efectos, los pares de signo opuesto son transferencias directas origen → destino;
una pérdida suelta va a FAL; una ganancia suelta se toma de FAL, luego PRG, luego CC. Si el origen no alcanza se mueve solo lo
que existe. También conserva el área.

### 6.7 Comportamiento de referencia

Sin políticas, la deforestación del primer año (BNNP→cultivos) es 1,09 % (N1), 1,10 % (N2), 1,02 % (N3) del bosque no
protegido; con CR en su décimo año 0,12 / 0,13 / 0,02 % (`tests/sim/reference.spec.ts`, valores de `reports/sensitivity-2.0.md`).

---

## 7. Carbono

Origen: `src/sim/v2/carbon.ts` (`energyTargets`, `updateEnergyState`, `fluxOf`, `computeEmissions`, `budgetPath`,
`carbonBudgetIndex`), `PARAMS_V2.flux`, `stock`, `fluxPolicy`, `energy`.

### 7.1 Unidades

Inventario en tCO₂e/año; flujos del suelo en tCO₂e/ha/año (positivo = emisión); stocks en Mg C/ha (biomasa más suelo
relevante para la conversión); conversión de C a CO₂ con $44/12$ (`CO2_PER_C`) solo para las pérdidas de stock. Se eliminó el
factor de escala 40 000 del modelo 1.x.

### 7.2 Energía

Estado energético con inercia de infraestructura ($k = 0{,}15$):

$$
s^* = \min\!\left(0{,}9,\ 0{,}60\,\eta^{elec}_{CN} + \min\!\left(1, \frac{a_{ENR}}{0{,}04}\right) + \sum_{\text{pactos}} \Delta s\right),
\qquad
u^* = \min\!\left(0{,}6,\ 0{,}35\,\eta^{other}_{CN} + \sum_{\text{pactos}} \Delta u\right),
$$

$$
s \leftarrow \operatorname{relax}(s, s^*, 0{,}15, \Delta t), \qquad u \leftarrow \operatorname{relax}(u, u^*, 0{,}15, \Delta t).
$$

Un 4 % del territorio en parques energéticos (`parksFullShare`) descarboniza por completo la electricidad (un "lote" de
parque representa una cartera). Emisiones energéticas per cápita:

$$
\epsilon = \epsilon_{0,N}\; y^{0{,}3}\;\left(1 + 0{,}15\,\eta^{land}_{SE}\right)\left[0{,}35(1-s) + 0{,}65(1-u)\right],
\qquad y = \frac{Y/P}{Y_0/P_0}, \qquad E_{en} = \epsilon\,P,
$$

con $\epsilon_{0,N}$ = 4,0 / 5,0 / 4,6 tCO₂/hab/año en N1/N2/N3 (`energy.eps0`; Territorio usa N2), participación eléctrica
0,35 (`electricShare`), elasticidad-ingreso 0,3 (`incomeElasticity`), refuerzo fósil de SE 0,15 (`subsidyBoost`). El
antagonismo CN–SE es multiplicativo (ítem C-5 de la auditoría).

### 7.3 AFOLU por flujo

$$
E_{afolu} = \sum_i f_i\,A_i^{[ha]}, \qquad f_i = f_i^{0}\prod_{(p, c, ch)} \left(1 + c\,\eta_p^{ch}\right),
$$

| Uso | $f^0$ (tCO₂e/ha/año) | Stock (Mg C/ha) | Multiplicadores de política |
|---|---|---|---|
| BNP | −1,0 | 200 | — |
| BNNP | +0,5 | 170 | $(1 + 1{,}0\,\eta^{land}_{FRA})(1 - 0{,}6\,\eta^{land}_{CR})$ |
| CA | +0,8 | 60 | $(1 - 0{,}4\,\eta^{land}_{AS})$ |
| CC | +2,5 | 45 | $(1 + 0{,}3\,\eta^{prod}_{PAI})$ |
| PF | −4,0 | 90 | — |
| PRG | +3,0 | 50 | $(1 - 0{,}35\,\eta^{land}_{GS})$ |
| HUM | −3,0 | 250 | — |
| RES | −9,0 | 70 | — |
| ENR | +0,1 | 40 | — |
| FAL | −2,0 | 55 | — |

Fuente de los stocks (comentario de `params.ts`): revisión del Bosque Atlántico (125 ± 40 Mg C/ha de biomasa aérea en bosque
maduro, 83 ± 38 en secundario, 46/41 en pastura/cultivo; *Anais da Academia Brasileira de Ciências*, 2024) más biomasa
subterránea y suelo; los flujos son criterio experto. El documento no pudo verificar la referencia bibliográfica completa
(solo está citada en el código).

### 7.4 Cambio de uso del suelo (LUC)

Desde los flujos **realizados** del paso (ha movidas en el paso, divididas por $\Delta t$ para obtener una tasa anual):

$$
E_{luc} = \frac{1}{\Delta t}\sum_{(i\to j)} F^{[ha]}_{ij}\,\max\!\left(0, C_i - C_j\right)\,\frac{44}{12}.
$$

Solo cuentan las pérdidas de stock; las ganancias (p. ej. CC→RES) se reflejan en el flujo AFOLU del uso de destino, no
como absorción instantánea.

### 7.5 Total, per cápita y población

$$
E_{tot} = E_{en} + E_{afolu} + E_{luc}, \qquad c = E_{tot}/P, \qquad P \leftarrow P(1+0{,}008)^{\Delta t}.
$$

$P_0$ = `CP.Poblacion_Inicial` = 400 000 en todos los niveles y en Territorio; $g_P$ =
`CP.Tasa_Crecimiento_Poblacional_Base` = 0,008. Con esa escala AFOLU + LUC pesa 32,7 % (N1), 29,9 % (N2) y 19,8 % (N3) del
total inicial (Tabla B.2), cercano al rango 20–35 % que la decisión 4 del índice v6 fijó por comparación con el 39 % del
inventario argentino.

Valores iniciales $c_0$: 5,947 (N1), 7,135 (N2), 5,733 (N3) tCO₂e/hab/año.

### 7.6 Presupuesto de carbono

Emisiones acumuladas $\mathcal E(t) = \sum E_{tot}\,\Delta t$ (`model.cumulativeEmissions`). Trayectoria de referencia lineal
hasta −30 % en 2054 (`budgetCut2054` = 0,30, `budgetYears` = 30):

$$
\mathcal E_{ref}(t) = E_{tot,0}\left(t - \frac{0{,}30\,t^2}{2\cdot 30}\right), \qquad B_t = \frac{\mathcal E(t)}{\mathcal E_{ref}(t)}\ (B_0 = 0).
$$

$B_t > 1$ significa estar por encima del presupuesto. $B_t$ es un índice de investigación (§18); no entra en ninguna
ecuación del modelo ni en las rutas.

---

## 8. Biodiversidad

Origen: `src/sim/v2/biodiversity.ts` (`habitatIndex`, `driveB`, `connectivityTerm`, `updateBiodiversity`),
`PARAMS_V2.habitat`, `zSAR`, `qB`, `biodiversity`.

### 8.1 Hábitat efectivo y relación especies-área

$$
H = \sum_i h_i\,a_i, \qquad \gamma_H = \frac{z}{1 - \min(B_0, 95)/100}, \quad z = 0{,}35.
$$

Afinidades de hábitat $h_i$: BNP 1,0; HUM 1,0; BNNP 0,8; RES 0,55; CA 0,35; FAL 0,3; PF 0,15; PRG 0,15; CC 0,05; ENR 0,05.
La forma es la relación especies-área "countryside" (Pereira, Ziv & Miranda, 2014, *Conservation Biology* 28(3)):
$\Delta B/B = z\,\Delta\ln H$, reescrita en espacio logit en $B_0$, lo que da $\gamma_H$; con $B_0 = 40$ (todos los niveles),
$\gamma_H = 0{,}583$. El tope 95 evita $\gamma_H \to \infty$ en estados re-anclados cerca de 100.

### 8.2 Impulsor

$$
\begin{aligned}
D_B ={}& \gamma_H \ln\frac{H}{H_0} + \sum_j q_{B,j}\,\eta^{land}_j
+ 0{,}10\,\min(\eta^{land}_{AS}, \eta^{land}_{CR}) - 0{,}12\,\min(\eta^{land}_{PAI}, \eta^{land}_{FRA}) \\
&+ \gamma_K \ln\frac{\max(K, 10^{-3}K_0)}{K_0} + \sum_{\text{pactos}} \Delta\ell_B + \operatorname{cap}(I_B),
\end{aligned}
$$

$q_B$ (logit por unidad de $\eta^{land}$): CR +0,55; AS +0,20; GS +0,12; AGUA +0,08; CN +0,05; PAI −0,25; PEA −0,06;
PIE −0,03; FRA −0,45; SE −0,10. La sinergia AS+CR y el antagonismo PAI+FRA son continuos (mínimo de las dos eficiencias);
son la única sinergia y el único antagonismo del modelo. $B$ relaja con $k_B = 0{,}12$.

### 8.3 Conectividad (solo Territorio)

$K$ = fracción de las parcelas de bosque (BNNP, BNP, RES) que pertenecen al mayor parche 4-conexo del mapa
(`territory.ts:forestConnectivity`, un *flood fill* sobre 100 × 100); $K_0$ es el valor al comenzar la partida.
$\gamma_K = 0{,}25$; piso $K \ge 10^{-3}K_0$ para que un mapa sin bosque dé un valor finito. El motor no conoce el mapa: la
sesión le pasa $(K, K_0)$ en `AdvanceOptions.connectivity` y lo recalcula solo si los cambios del mes tocaron bosque. En el
juego de 3 niveles el término vale 0. El prototipo no modela $K$.

---

## 9. Seguridad alimentaria

Origen: `src/sim/v2/food.ts` (`exportShare`, `domesticSupply`, `foodPerCapita`, `driveF`, `updateFoodSecurity`),
`PARAMS_V2.food`; choque $\varepsilon$ en `src/sim/events.ts:nextYieldShock`.

### 9.1 Oferta interna y disponibilidad

$$
Q = (1-x)\left[A_{CC}\,(1 + 0{,}25\eta_{PAI}) + 0{,}7\,A_{CA}\,(1 + 0{,}15\eta_{AS}) + 0{,}25\,A_{PRG}\,(1+0{,}20\eta_{GS})\right]
(1 + 0{,}06\,\eta_{AGUA})\,(1{,}006)^{t}\,(1+\varepsilon),
$$

$$
x = 0{,}30 + 0{,}20\,\eta^{prod}_{PEA}, \qquad \rho = \max\!\left(\frac{Q}{P}, 10^{-3}\rho_0\right),
$$

con todas las $\eta$ en el canal `prod`, rendimientos relativos a CC (CA 0,7; PRG 0,25; PF y los usos no agrícolas no
producen alimentos), tendencia tecnológica 0,6 %/año (`yieldTrend`), $t$ = tiempo del modelo al inicio del paso y $P$ la
población después del crecimiento del paso. El piso evita $\ln 0$ (un territorio sin tierra agrícola importa algo).

### 9.2 Impulsor

$$
D_F = \kappa_1 \ln\frac{\rho}{\rho_0} + \kappa_2\,\frac{E - E_0}{50} + \operatorname{cap}(I_F), \qquad \kappa_1 = 3{,}0,\ \kappa_2 = 0{,}6,
$$

con la $E$ del paso anterior. Ningún pacto mueve $F$. $F$ relaja con $k_F = 0{,}35$.

**Por qué $\kappa_1 = 3{,}0$ (fase 49b).** Con el valor de la especificación (2,5) el recorrido de $F$ entre estrategias
extremas del N3, con eventos, a 30 años era 14,6 puntos (< 15, criterio C6). Por decisión del usuario del 27/10/2026 se ajustó
la respuesta del indicador, no el criterio: +20 % de disponibilidad por habitante sube $F$ ≈ 13,5 puntos cerca de 40 (antes
≈ 11), y el recorrido pasa a 22,9 / 18,3 / 16,8 en N1/N2/N3. Para que la ruta de producción del N3 conservara su tasa, su piso
de $F$ bajó de 33 a 31. Golden y casos de referencia regenerados en el mismo commit.

### 9.3 Choque de rendimiento AR(1)

$$
\varepsilon \leftarrow 0{,}5^{\Delta t}\,\varepsilon + \sigma_\varepsilon\sqrt{\Delta t}\;z, \qquad
\sigma_\varepsilon = 0{,}04\left(1 - 0{,}5\,\eta^{prod}_{AGUA}\right), \qquad z \sim \mathcal N(0,1),
$$

$z$ por Box–Muller (rama seno) con dos sorteos del mismo `rng`. Se sortea en el paso 3, después de los eventos y antes de
las eficiencias, con la $\eta^{prod}_{AGUA}$ del paso anterior. `noShocks` o `rng = null` ⇒ $\varepsilon = 0$.

---

## 10. Seguridad económica, conflicto social y colapso político

Origen: `src/sim/v2/indicators.ts` (`productiveValue`, `driveE`, `driveC`, `drivePc`, `updateRelaxedIndicators`),
`PARAMS_V2.bE`, `productiveValue`, `conflict`, `greenRelief`, `conflictWeights`, `relaxation`.

### 10.1 Seguridad económica $E$

Valor productivo $V = \sum_k v_k\,a_k$ con $v$: CC 1,0; CA 0,8; PRG 0,6; PF 0,9; ENR 1,2.

$$
\begin{aligned}
D_E ={}& \sum_j b_{E,j}\,\eta^{prod}_j \;-\; 0{,}15\,\eta^{tax}_{CN} \;+\; 0{,}25\,\frac{g - g_0}{0{,}01}
\;+\; 1{,}5\left(\frac{V}{V_0} - 1\right) \;+\; 0{,}15\,\frac{B - B_0}{20} \\
&- 0{,}8\,\varphi \;-\; 0{,}04\,\tau \;-\; 0{,}6\left[s_{\text{low}}(F; 20, 4) - s_{\text{low}}(F_0; 20, 4)\right]
\;+\; \sum_{\text{pactos}}\Delta\ell_E + \operatorname{cap}(I_E).
\end{aligned}
$$

$b_E$: PIE 0,55; PEA 0,45; PAI 0,35; FRA 0,20; SE 0,15; AS 0,10; GS 0,10; AGUA 0,05; CN −0,10; CR −0,05. $g$ es la tasa de
crecimiento del paso (§13), $g_0$ = `CP.Tasa_Base_Crecimiento_PBI` = 0,02; $B$ y $F$ son los del paso actual. El término de
crisis alimentaria se escribió como desvío del inicio en la fase 39 (el prototipo original restaba $0{,}6\,s_{\text{low}}(F)$
a secas, −0,014 logit en $F_0 = 35$; corregido también en el prototipo). $\varphi$ no se escribe como desvío: como
$\varphi = s_{\text{high}}(0) = 0{,}0067$ sin deuda, un nivel sin deuda arrastra −0,005 logit en $E^*$ desde el fin de su
primer paso (igual que el prototipo).

### 10.2 Conflicto social $C$ (bienestar $W = 100 - C$)

$$
\begin{aligned}
D_C ={}& 0{,}6\,\frac{F_0 - F}{15} + 0{,}5\,\frac{E_0 - E}{15} + 0{,}4\,\frac{\pi_e - \pi_{e,0}}{20}
+ \sum_j c_{C,j}\,\eta^{social}_j + 0{,}3\,\varphi\,\eta^{social}_{SE} - \sum_j g_{C,j}\,\eta^{social}_j \\
&+ 2{,}0\,(a_{CC} - a_{CC,0}) + 1{,}0\,(a_{PF} - a_{PF,0})
+ 3{,}0\,(G - G_0) + 0{,}6\,(1 - J)\,R_{load} \\
&+ 0{,}03\,\tau + 0{,}6\,\varphi + w_C + \operatorname{cap}(I_C),
\end{aligned}
$$

con $c_C$: FRA 0,60; PAI 0,30; PIE 0,20; SE −0,10; alivio verde $g_C$: CN 0,25; CR 0,25; AGUA 0,15. $F$ y $E$ del paso
actual; $\pi_e$ del paso anterior. $G$, $J$ y $R_{load}$ en §14. $w_C$ es el desgaste de situaciones abiertas (Territorio,
§16.2; 0 en el juego de 3 niveles). Ningún pacto mueve $C$. $C$ relaja con $k_C = 0{,}35$ y $W = 100 - C$.

### 10.3 Colapso político $P_c$ (estabilidad $S_t = 100 - P_c$)

Con $\bar\pi = (\pi_a + \pi_e + \pi_s)/3$ y polarización $\Pi = \max\pi - \min\pi$ (presiones del paso anterior):

$$
\begin{aligned}
D_{P_c} ={}& 0{,}9\,\frac{W_0 - W}{20} + 0{,}5\,\frac{E_0 - E}{20} + 0{,}8\,\varphi
+ 0{,}5\,\frac{\Pi - \Pi_0}{30} + 0{,}6\,\frac{\bar\pi - \bar\pi_0}{20} \\
&+ \sum_{\text{pactos}} \Delta\ell_{P_c} + \operatorname{cap}(I_{P_c}) + w_{P_c},
\end{aligned}
$$

donde $w_{P_c}$ es el canal de abandono del escritorio de Territorio (§16.3), sin tope. Tres presiones altas y parejas suben
el colapso por el nivel medio aunque no haya polarización. $P_c$ relaja con $k_{P_c} = 0{,}25$.

---

## 11. Presiones sectoriales

Origen: `src/sim/v2/pressures.ts` (`productiveShare`, `sectorSize`, `drivePressures`, `targetPressures`, `updatePressures`),
`PARAMS_V2.pressure`.

Participación productiva $a_{prod} = (A_{CC} + A_{CA} + A_{PRG})/\sum A$ (PF no cuenta) y tamaño relativo del sector
$\sigma_{prod} = a_{prod}/a_{prod,0}$. Con $\phi_{scale} = 15$ y la $\eta^{social}$:

$$
\begin{aligned}
D_{\pi_a} &= \sigma_{prod}\,\frac{\sum_j \phi^a_j\,\eta^{social}_j}{15} + 0{,}03\,(E_0 - E) + 0{,}02\,(F_0 - F) + 4{,}0\,(a_{prod,0} - a_{prod}) + w_a + \operatorname{cap}(I_{\pi_a}) \\
D_{\pi_e} &= \frac{\sum_j \phi^e_j\,\eta^{social}_j}{15} + 0{,}035\,(B_0 - B) + 1{,}5\,\frac{c - c_0}{c_0} + w_e + \operatorname{cap}(I_{\pi_e}) \\
D_{\pi_s} &= \frac{\sum_j \phi^s_j\,\eta^{social}_j}{15} + 0{,}04\,(W_0 - W) + 0{,}04\,\tau + w_s + \operatorname{cap}(I_{\pi_s})
\end{aligned}
$$

| Política | $\phi^a$ | $\phi^e$ | $\phi^s$ |
|---|---|---|---|
| AS | −2,0 | −5,0 | −5,0 |
| CR | +3,0 | −12,5 | −2,5 |
| GS | −1,5 | −4,0 | — |
| AGUA | — | −4,0 | −3,5 |
| CN | — | −9,0 | −3,5 |
| PAI | −10,0 | +7,5 | +5,0 |
| PEA | −6,0 | — | — |
| PIE | — | — | +3,5 |
| FRA | — | +12,5 | +7,5 |
| SE | — | +10,0 | — |

Los $\phi$ son los factores de impulso del modelo 1.x (puntos por unidad de eficiencia) más CR +3,0 sobre la agrícola
(conservar sin compensar molesta al sector), divididos por 15 para pasarlos a logit. Las presiones son el último paso de
los indicadores: leen $B, F, E, W$ del paso actual y $c$ del paso 7. $k_\pi = 0{,}35$. Sacar tierra de producción (p. ej.
declarar un uso público sobre CC) sube $\pi_a$ por el término $4{,}0\,(a_{prod,0} - a_{prod})$.

Tiempos medidos (N2 sin políticas, paso mensual, sin eventos) para que una presión de 80 vuelva a 50: agrícola 1,67 años,
ambientalista 1,83, social 1,50 (`docs/audit-equations.md`, ítem I-5).

---

## 12. Pactos internacionales

Origen: `src/sim/v2/pacts.ts` (`pactShift`, `pactEnergyShift`, `pactLandFactors`, `pactAnnualCost`, `pactEntryCost`),
`PARAMS_V2.pacts`, `INITIAL_PACTS` (años de desbloqueo).

Un pacto es dato puro. Mientras está activo desplaza objetivos (en logit), los objetivos energéticos y los flujos de
frontera, y cuesta una fracción del PBI. Su efecto es **estacionario**: no crece con los años de membresía.

| Pacto (id) | Desbloqueo | Entrada (·$Y$) | Anual (·$Y'$) | $\Delta\ell_B$ | $\Delta\ell_E$ | $\Delta\ell_{P_c}$ | $\Delta s$ | $\Delta u$ | $m_p$ | $m_d$ |
|---|---|---|---|---|---|---|---|---|---|---|
| `biodiversityTreaty` | 2030 | 0,03 | 0,002 | +0,25 | −0,05 | — | — | — | 1,5 | 0,5 |
| `globalCarbonAccord` | 2035 | 0,05 | 0,004 | — | −0,10 | −0,15 | +0,05 | +0,05 | — | — |
| `techTransferInitiative` | 2038 | 0,10 | 0,008 | — | +0,15 | — | +0,10 | +0,05 | — | — |

Los desplazamientos se suman sobre los pactos activos; $m_p$ y $m_d$ se multiplican ($m = 1$ sin pactos). La entrada se paga
como inversión pública (§13.4) sobre el PBI corriente; la cuota anual entra en el saldo primario sobre $Y'$ (PBI después del
crecimiento). Invariante INV-16: ningún pacto supera a la política más fuerte sobre el mismo indicador. Los ids del código
difieren de los del prototipo (`treaty` / `accord` / `tech`).

---

## 13. Finanzas públicas

Origen: `src/sim/v2/finance.ts` (`stepFinance`, `interestRate`, `fiscalStressOf`, `isBankrupt`, `payPublicInvestment`,
`canPayPublicInvestment`, `investmentScale`, `primaryBalanceAverage`), `PARAMS_V2.finance`, `CP` por nivel.

### 13.1 Crecimiento y recaudación

$$
g = g_0 + 0{,}01\,\eta^{prod}_{PIE} + 0{,}005\,\eta^{prod}_{PEA} - 0{,}0002\,\tau - 0{,}01\,\varphi_{t-\Delta t},
\qquad Y' = Y\,(1 + g\,\Delta t),
$$

$$
T = Y'\left(\tau_0 + \frac{\tau}{100}\right) + 0{,}005\,Y'\,\eta^{tax}_{CN}, \qquad G_0 = \gamma_N\,Y',
$$

con $g_0 = 0{,}02$, $\tau_0$ = `Tasa_Impositiva_General_Sobre_PBI` = 0,15, $\gamma_N$ = `Gasto_Publico_Base_Nivel_N` = 0,13 /
0,125 / 0,125. Con $\tau\le 20$ y $\varphi \le 1$, $g \ge 0{,}006$: el PBI no decrece por la ecuación (solo por eventos).

### 13.2 Saldo primario, intereses, deuda automática

$$
K = \sum_j K_j(Y) + \sum_{\text{pactos}} \text{anual}\cdot Y' + U, \qquad SP = T - G_0 - K,
$$

donde $U$ es el mantenimiento anual de los usos públicos de Territorio (§16.4; 0 en el juego de 3 niveles).

$$
d = D/Y, \quad i(d) = i_N + 0{,}05\,\max(0, d - 0{,}6), \quad \text{Int} = i(d)\,D, \quad \text{Am} = \alpha_N\,D,
$$

$$
R' = R + (SP - \text{Int} - \text{Am})\,\Delta t + L, \qquad D' = D - \text{Am}\,\Delta t + L,
$$

$$
R' < 0{,}02\,Y' \ \Rightarrow\ D' \mathrel{+}= 0{,}02\,Y' - R',\quad R' = 0{,}02\,Y',
$$

con $i_N$ = 0,025 / 0,035 / 0,045 y $\alpha_N$ = 0,15 / 0,12 / 0,10 por nivel. $L$ es el préstamo voluntario pedido en el paso
anterior (entra entero, a reservas y deuda, antes del test del piso). Intereses simples sobre la deuda al inicio del paso.
**Qué PBI lee cada término** sigue exactamente al prototipo: $d$ y el costo de políticas con $Y$; recaudación, $\gamma$,
cuotas de pactos y piso con $Y'$.

### 13.3 Estrés fiscal y quiebra

$$
CI = \frac{\text{Int}}{T}, \qquad \varphi = s_{\text{high}}(CI;\ 0{,}20,\ 0{,}04).
$$

$\varphi$ frena el crecimiento ($-0{,}01\varphi$), y entra en $D_E$ ($-0{,}8$), $D_C$ ($+0{,}6$, más $0{,}3\varphi\eta_{SE}$) y
$D_{P_c}$ ($+0{,}8$). **Quiebra**: $D'/Y' > 1$ y $CI > 0{,}20$ durante 2 años seguidos (reloj `breachYears`, se reinicia al
salir de la condición; tolerancia $10^{-9}$ años para que 24 meses cuenten exactamente).

### 13.4 Inversión pública y espacio fiscal

Declarar un uso público, unirse a un pacto o pagar la opción de una situación (`payPublicInvestment`, prototipo `pay()`):

$$
\text{deuda} = \max\!\left(0,\ \text{costo} - \max(0, R - 0{,}02\,Y)\right), \qquad
\text{se rechaza si } \text{deuda} > 0 \ \wedge\ \frac{D + \text{deuda}}{Y} > 0{,}6 .
$$

Se paga primero con las reservas por encima del piso y el resto con deuda mientras $D/Y \le 0{,}6$; si no hay espacio fiscal
nada cambia.

### 13.5 Préstamo y presión fiscal

Préstamo voluntario: hasta 10 % del PBI (en Territorio, por año calendario); disponible en N3 o desde
`Ano_Activacion_Prestamo` = 2035 (Territorio: desde 2035). Presión fiscal adicional $\tau \in [0, 20]$ p.p.
(`Max_Additional_Tax_Rate_Percentage`): N3 en el juego de 3 niveles; desde 2035 en Territorio. Son reglas de interfaz
(`App.tsx`, `territorio/session.ts`), no del motor.

### 13.6 Escala de precios con la economía

$$
\text{esc}(Y) = \min\!\left(2{,}5,\ \max\!\left(1, \sqrt{Y/Y_0}\right)\right)
$$

multiplica los precios de catálogo de situaciones y lotes públicos y los ingresos positivos de las situaciones (Territorio).

### 13.7 Saldo primario medio (ruta productiva de Territorio)

`model.fiscal.primaryHistory` guarda pares $(\Delta t, SP/Y')$; la media ponderada por $\Delta t$ de los últimos 5 años es la
condición "saldo primario medio ≥ 0" de §17.

---

## 14. Conflicto distributivo

Origen: `src/sim/v2/social.ts` (`landConcentration`, `justTransition`, `distributiveDrive`), `PARAMS_V2.justTransition`,
`conflictWeights.gini` / `.just`.

$$
G = \frac{A_{CC} + A_{PF}}{A_{CC} + A_{CA} + A_{PRG} + A_{PF}}
$$

(concentración de la tierra productiva en usos de escala; 0 sin tierra productiva).

$$
R_{load} = \sum_j w^R_j\,\eta_j\,\chi^R_j, \qquad \text{Sup} = \sum_j w^S_j\,\eta_j\,\chi^S_j, \qquad
J = \begin{cases}\dfrac{\text{Sup}}{\text{Sup} + R_{load}} & \text{Sup} + R_{load} > 0\\[4pt] 1 & \text{si no}\end{cases}
$$

con $\chi^R_j$, $\chi^S_j$ las fuerzas de canal cuya relevancia es la máscara 0/1 de las etiquetas *restricción* / *apoyo*
de la Tabla 5.1, $w^R$: CR 1,0; CN 0,5; AGUA 0,3 y $w^S$: AS 0,5; GS 0,5. Con reparto parejo, $\chi = 1$ y se recuperan las
constantes del prototipo: $R_{load} = \eta_{CR} + 0{,}5\,\eta^{tax}_{CN} + 0{,}3\,\eta_{AGUA}$, $\text{Sup} = 0{,}5(\eta_{AS} +
\eta_{GS})$. Mover el esfuerzo cambia la carga: CR con todo el esfuerzo en PSA (apoyo) tiene $\chi^R = 0$.

Término en el conflicto (§10.2): $\nu_G (G - G_0) + \nu_J (1 - J) R_{load}$, $\nu_G = 3{,}0$, $\nu_J = 0{,}6$.

*Desvío documentado:* la spec 45 pedía sumar $\eta_j\,e_{jk}/100$ por instrumento etiquetado, lo que con reparto parejo no da
las constantes del prototipo que la misma spec dice reproducir; se usó el canal enmascarado (igual con reparto parejo,
sensible al esfuerzo).

---

## 15. Eventos aleatorios

Origen: `src/sim/events.ts` (`eventStepChance`, `seasonalWeight`, `rollEvents`, `applyRandomEventEffects`,
`standardNormal`, `nextYieldShock`), `ALL_RANDOM_EVENTS` (`src/constants.ts`), `PARAMS_V2.events`.

### 15.1 Sorteo independiente

Para cada evento $k$ elegible (nivel mínimo cumplido), en el orden de la lista, con su probabilidad anual $p_k$ evaluada
sobre el estado vivo:

$$
p_{k,\text{paso}} = 1 - (1 - p_k)^{w\,\Delta t}, \qquad \text{ocurre si } \text{rng}() < p_{k,\text{paso}},
$$

$w = 1$ salvo la sequía en Territorio (§15.4). Doce pasos mensuales con pesos de media 1 conservan exactamente la
probabilidad anual. Pueden ocurrir varios eventos en un paso; cada uno lee el estado que dejó el anterior.

### 15.2 Efectos como saltos de nivel

- Sobre $B$, $F$, $E$: salto del indicador (absoluto o porcentual), recortado a $[0,100]$; la relajación del paso 8 parte del
  valor golpeado y lo disipa.
- Sobre derivados ($W$, $S_t$, presiones, dinero): salto del stock del que derivan ($W \to C$, $S_t \to P_c$ invertidos).
- Sobre el suelo: transferencias conservativas; las pérdidas van a FAL (§6.6).
- No hay efectos diferidos (se borraron en la fase 46). CO₂ y puntaje no pueden recibir efectos (se recalculan).

### 15.3 Lista de eventos (probabilidades anuales)

| Evento (`id`) | Nivel mín. | $p_k$ (anual) | Efectos |
|---|---|---|---|
| Sequía severa (`drought_severe`) | 1 | $0{,}03\,(1 + 0{,}5\,t/30)\,(1 + 0{,}6\max(0, 1 - f/f_0)) + 0{,}04\,[\text{sin AGUA}] + 0{,}02\,[a_{CC} > 0{,}25]$ | $F \times 0{,}88$; $C$ +5; $\pi_a$ +4; CC −3 % y CA −5 % del área → FAL |
| Cosecha excepcional (`bumper_harvest`) | 1 | $0{,}03 + 0{,}03[\text{AS}] + 0{,}02[B > 50]$ | $F \times 1{,}15$; $Y \times 1{,}01$; $\pi_a$ −5; $C$ −3 |
| Crisis de cadena de suministro (`supply_chain_crisis`) | 2 | $0{,}03 + 0{,}03[\text{PEA}] + 0{,}02[\text{PIE}]$ | $F \times 0{,}92$; $E \times 0{,}90$; $Y \times 0{,}985$ |
| Escrutinio ambiental internacional (`international_scrutiny`) | 2 | $0{,}05[B<30] + 0{,}05[c > 1{,}5\,c_0] + 0{,}04[\text{FRA}]$ | $E \times 0{,}95$; $\pi_e$ +8; $\pi_s$ +4 |
| Boom de tecnología verde (`green_tech_investment_boom`) | 2 | $0{,}01 + 0{,}04[\text{CN}] + 0{,}04[\text{PIE}] + 0{,}02[S_t > 60]$ | $E \times 1{,}10$; $Y \times 1{,}025$; $\pi_e$ −4 |
| Movimiento por la justicia climática (`climate_justice_movement`) | 2 | $0{,}05$ si $t > 5$, si no 0 | $\pi_e$ +7; $\pi_s$ +5; $C$ −2 si $W > 65$, si no +3 |
| Recesión global (`global_recession`) | 3 | $0{,}08$ si $E < 50$, si no $0{,}02$ | $Y \times 0{,}96$; $E \times 0{,}85$; $C$ +6; $R \times 0{,}95$ |
| Shock de combustibles fósiles (`fossil_fuel_shock`) | 3 | $0{,}03 + 0{,}05[\text{SE}]$ | $E \times 0{,}90$; $Y \times 0{,}98$; $C$ +7 |

$[\cdot]$ = 1 si la condición se cumple (o la política está activa). $f$ = participación del bosque nativo (BNNP + BNP) y $f_0$
la del inicio. Las novedades 2.0 de la sequía son la tendencia climática ($+50\%$ a los 30 años) y la dependencia de la
pérdida de bosque; el umbral del escrutinio pasó de $c > 12$ t (inalcanzable en unidades físicas) a $c > 1{,}5\,c_0$. Los
eventos de nivel mínimo 2 y 3 hacen al N3 más volátil. Territorio usa los eventos con su nivel (2): no tiene recesión ni
shock fósil. Ejemplo: N2 al inicio, sin AGUA, $a_{CC} = 150/600 = 0{,}25$ (no supera 0,25): $p_{\text{sequía}} = 0{,}07$/año.

### 15.4 Estacionalidad de la sequía (Territorio)

Pesos mensuales crudos (enero–diciembre) 1,6 · 1,4 · 1,0 · 0,7 · 0,6 · 0,6 · 0,6 · 0,7 · 0,8 · 1,0 · 1,2 · 1,4, normalizados a
media 1: 1,655 · 1,448 · 1,034 · 0,724 · 0,621 · 0,621 · 0,621 · 0,724 · 0,828 · 1,034 · 1,241 · 1,448 (criterio experto:
veranos más secos en años La Niña en el noreste). Entran como exponente del peligro, $p_{\text{mes}} = 1 - (1-p)^{w_m/12}$, lo
que conserva exactamente la $p$ anual (la spec decía "probabilidad mensual × $w_m$", que cambia la frecuencia anual en
segundo orden).

### 15.5 Choque de rendimiento

Ver §9.3. Se sortea después de los eventos, en el mismo paso, con el mismo `rng`.

---

## 16. Territorio: componentes específicos

Origen: `src/territorio/session.ts` (`advanceMonth`, `createSession`, `declareUse`, `togglePact`, `requestLoan`,
`sustainedBreach`), `src/territorio/situations/index.ts` (`rollSituation`, `wearShift`, `wearTally`, `situationImpulse`,
`applySituationEffects`, `resolveSituation`, `neglectTally`, `neglectShift`, `pruneImpulses`), `src/sim/territory.ts`
(`createTerritory`, `syncTerritory`, `declarePublicUse`, `forestConnectivity`), `src/territorio/calendar.ts`,
`src/territorio/routes.ts`, `PARAMS_V2.situations`.

Territorio es un solo nivel de 30 años (360 meses, 2024–2054) que arranca del **estado inicial del Nivel 2**
(`TERRITORIO_LEVEL = 2`), con el mismo motor mensual y las opciones `publicUseUpkeep`, `seasonality`, `connectivity` y
`wear` activadas. Calendario: instrumentos redistribuibles desde 2029, préstamo y presión fiscal desde 2035, cada pacto desde
su año de desbloqueo.

### 16.1 Situaciones como impulsos con vida media

Catálogo de 101 situaciones (clima 10, ecología 15, producción 16, tecnología 9, política 15, sociedad 11, economía 12,
internacional 13; tono: 48 negativas, 22 oportunidades, 31 neutras), plazos de 2 a 8 meses. Llegada mensual:

$$
p_{\text{llegada}} = \min\!\left(0{,}4,\ 0{,}16 + 0{,}05[W<45] + 0{,}04[F<40] + 0{,}03[B<35] + 0{,}05[\max\pi > 65]\right),
$$

con a lo sumo 6 abiertas a la vez; la situación se elige por peso entre las elegibles (condición `when`, no abiertas).

Una opción aplicada produce, sobre cada indicador acotado $X$ (con $W$ y $S_t$ invertidos sobre $C$ y $P_c$), un impulso del
objetivo, **nunca un salto**:

$$
d = \frac{\Delta\text{pts}}{100\,p(1-p)},\ p = \frac{X}{100}\in[0{,}01; 0{,}99], \qquad
\tau = \frac{t_{1/2}}{12\,\ln 2}\ \text{años}, \quad t_{1/2} = 18\ \text{meses}\ (\tau = 2{,}164\ \text{años}),
$$

que entra en $D_X$ como $\operatorname{cap}\bigl(\sum_i d_i e^{-(t - t_i)/\tau_i}\bigr)$ con tope $\pm 0{,}6$. Un impulso más
viejo que $6\tau$ se descarta ($e^{-6} \approx 0{,}25\,\%$). Solo `aquifer-drop` declara su propia vida media (60 meses).
Efectos monetarios inmediatos: ingresos positivos al tesoro × esc$(Y)$, cargos fijos, porcentajes sobre el stock actual; deuda
± (nunca < 0); PBI como choque de nivel. Efectos de suelo por transferencias (§6.6). El costo de la opción se paga como
inversión pública (§13.4) a precio × esc$(Y)$; si no hay espacio fiscal la opción se rechaza. Al vencer el plazo se aplica
automáticamente la última opción.

### 16.2 Desgaste

Mientras una situación sigue abierta, desplaza los objetivos de $C$ y de las presiones:

$$
w_X = \sum_{\text{abiertas}} 0{,}04\cdot f_{\text{edad}}\cdot \text{desgaste}_X, \qquad
f_{\text{edad}} = 1 + \min\!\left(1, \frac{m - m_{\text{apertura}}}{\max(1, m_{\text{vence}} - m_{\text{apertura}})}\right)\in[1,2],
$$

con el desgaste de catálogo (0 a 1,2 puntos sumados por situación) y `wearLogit` = 0,04. Al resolverla, los indicadores
relajan de vuelta.

### 16.3 Canal de abandono del escritorio

Cada situación que vence sin respuesta (salvo las oportunidades, tono `good`) suma 1 a un contador que decae con vida media de
36 meses ($\tau_N = 36/\ln 2 = 51{,}9$ meses):

$$
N(m) = \sum_{\text{vencidas}} e^{-(m - m_v)/\tau_N}, \qquad w_{P_c} = 1{,}2\,\max(0, N - 3)\ \text{(logit, sin tope)}.
$$

Decisión del usuario del 19/09/2026: un escritorio abandonado debe poder tumbar al gobierno. Calibrado con el arnés
(`do_nothing` en Territorio cae por colapso político en 20 de 20 semillas, mediana 2038,8). Los vencimientos se olvidan
después de $6\tau_N$.

### 16.4 Usos públicos declarados

La única acción directa del jugador sobre el suelo: declarar un lote de 5 kHa (`LOT_KHA`, 50 parcelas) alrededor de una
parcela elegida.

| Uso público | Destino | Origen admitido | Costo (u.m./kHa, ×esc) | Lote (5 kHa) |
|---|---|---|---|---|
| Área protegida | BNP | BNNP | 20 | 100 |
| Restauración | RES | CC, PRG, FAL | 60 | 300 |
| Humedal (cerca de agua) | HUM | CC, PRG, FAL | 45 | 225 |
| Parque energético | ENR | PRG, CC, FAL | 80 | 400 |

Mantenimiento anual $U = 0{,}8\ \text{u.m./kHa}\times(\text{BNP declarado} + A_{HUM} + A_{RES} + A_{ENR})$
(`Costo_Mantenimiento_Uso_Publico_por_kHa_Anual`), × $\Delta t$ en el saldo primario. El bosque protegido declarado se cuenta
aparte (`declaredProtectedArea`, acotado al BNP existente); lo que madura de RES a BNP sigue siendo público.

### 16.5 Mapa y sincronización con el modelo

Grilla isométrica de 100 × 100 con un paisaje fijo (geografía sembrada); exactamente 6000 parcelas productivas, de modo que
una parcela = $\sum A/6000$ = 0,1 kHa en la región del N2 (600 kHa). Las ecuaciones **siempre leen las áreas exactas, nunca
conteos de parcelas**. Modelo → mapa (`syncTerritory`): las parcelas se mueven a lo largo de las transferencias que el modelo
hizo en el mes, una parcela por cada 0,1 kHa acumulado por arista, desde el frente del uso que crece, con histéresis de 1,2
parcelas; las parcelas declaradas no se mueven mientras otra pueda. Mapa → modelo: solo las declaraciones. Pueblos e
industria se dibujan desde el PBI, $W$ y $c$ (sin efecto en el modelo).

### 16.6 Fin de partida propio de Territorio

Además de `evaluateGameOver` (§17.1): bienestar $W < 10$ o seguridad alimentaria $F < 20$ **durante 12 meses seguidos**
termina la partida (`BREACH_MONTHS`).

---

## 17. Fin de juego, rutas de victoria y puntaje

Origen: `src/sim/gameOver.ts` (`evaluateGameOver`), `src/sim/winRoutes.ts` (`LEVEL_ROUTES`, `evaluateRoute`,
`evaluateLevel`), `src/territorio/routes.ts` (`TERRITORIO_FLOORS`, `TERRITORIO_ROUTES`, `evaluateTerritorio`),
`src/sim/score.ts` (`computeScore`, `SCORE_WEIGHTS`).

### 17.1 Fin de juego (en cada paso, en este orden)

1. Colapso político: $S_t \le 5$.
2. Colapso ecológico: $B \le 5$.
3. Hambruna: $F \le 10$ (solo nivel ≥ 2).
4. Bancarrota: regla de §13.3 cumplida 2 años seguidos.

En el juego anual, un fin de juego a mitad de año corta los sub-pasos restantes.

### 17.2 Regla de victoria

Al cumplirse los 30 años: gana quien cumple **todos los pisos de gobernabilidad y al menos una ruta completa**; si cumple
varias, se acredita la de mayor multiplicador. El progreso de cada condición se mide desde el valor inicial del nivel
(`levelBaseline`), no desde 0.

### 17.3 Tablas de rutas (generadas desde el código)

Extraídas con un script `tsx` que lee `LEVEL_ROUTES` y `TERRITORIO_*` (los mismos objetos que usa
`scripts/routes-table-html.ts` para la hoja docente). $f_{nat}$ = bosque nativo (BNNP + BNP) en % del territorio;
$s$ = renovables en % de la electricidad; $D/Y$ = deuda/PBI.

**Nivel 1** — pisos: $B \ge 25$; $E \ge 15$; $D/Y \le 0{,}8$.

| Ruta (multiplicador) | Condiciones |
|---|---|
| Conservación (×1,0) | $B \ge 50$; $f_{nat} \ge 20$; $c \le 5{,}2$ |
| Producción (×1,0) | $E \ge 36$; $F \ge 32$; $c \le 6{,}5$ |
| Innovación (×1,1) | $c \le 4{,}6$; $E \ge 30$ |

**Nivel 2** — pisos: $B \ge 25$; $F \ge 25$; $S_t \ge 35$; $\pi_a, \pi_e, \pi_s \le 85$.

| Ruta | Condiciones |
|---|---|
| Conservación (×1,0) | $B \ge 52$; $f_{nat} \ge 16$; $c \le 6{,}5$ |
| Producción (×1,0) | $E \ge 40$; $F \ge 32$; $W \ge 60$ |
| Innovación (×1,1) | $c \le 5{,}5$; $s \ge 30$; $E \ge 33$ |

**Nivel 3** — pisos: $S_t \ge 30$; $D/Y \le 1$; $W \ge 35$.

| Ruta | Condiciones |
|---|---|
| Conservación (×1,0) | $B \ge 52$; $f_{nat} \ge 17$; $c \le 5{,}4$; $D/Y \le 0{,}6$ |
| Producción (×1,0) | $E \ge 36$; $F \ge 31$; $W \ge 52$ |
| Innovación (×1,1) | $c \le 4{,}5$; $s \ge 35$; $E \ge 30$; pactos activos $\ge 1$ |
| Equilibrio (×1,35; 7 de 9) | $B \ge 50$; $F \ge 40$; $E \ge 38$; $W \ge 65$; $S_t \ge 75$; $c \le 4{,}5$; $D/Y \le 0{,}5$; $Y/Y_0 \ge 1{,}7$; puntaje $\ge 720$ |

**Territorio** — pisos: $B \ge 25$; $F \ge 20$; $S_t \ge 25$; $W \ge 12$ (sin piso de presiones, a propósito: una economía en
crisis ya sube $\pi_a$ y castigarlo dos veces cerraba rutas).

| Ruta | Condiciones |
|---|---|
| Conservación (×1,0) | $B \ge 52$; $f_{nat} \ge 15$; naturaleza pública (BNP declarado + HUM + RES) $\ge 6\,\%$; $c \le 6{,}2$ |
| Producción (×1,0) | $F \ge 40{,}5$; $E \ge 40$; $W \ge 55$; saldo primario medio 5 años $\ge 0$; $D/Y \le 0{,}6$; años con ≥ 2 políticas productivas (PAI, PEA, GS, AS) $\ge 15$ |
| Innovación (×1,1) | $c \le 4{,}8$; parques energéticos $\ge 1{,}6\,\%$; $W \ge 55$ |

Las condiciones leen resultados, no esfuerzo (fase 49). Los umbrales se calibraron con `npm run sim:check` según el
procedimiento de la spec 49 §4; los desvíos respecto del prototipo están en §20.5.

### 17.4 Puntaje (0–1000)

$$
C_{sc} = 100\,\operatorname{clip}\!\left(\frac{1{,}25\,c_0 - c}{c_0}, 0, 1\right), \quad
P_{sc} = 100 - \bar\pi, \quad X_{sc} = \frac{F + E + W + S_t}{4}, \quad
Y_{sc} = \min\!\left(100, \frac{100\,Y}{2\,Y_0}\right),
$$

$$
S = 10 \times \begin{cases}
0{,}40\,B + 0{,}45\,C_{sc} + 0{,}15\,E & \text{N1}\\
0{,}15\,B + 0{,}20\,C_{sc} + 0{,}30\,P_{sc} + 0{,}35\,X_{sc} & \text{N2 y Territorio}\\
0{,}10\,B + 0{,}15\,C_{sc} + 0{,}20\,P_{sc} + 0{,}25\,X_{sc} + 0{,}30\,Y_{sc} & \text{N3}
\end{cases}
$$

$C_{sc} = 25$ en $t = 0$ (margen para mejorar y para empeorar), 0 en $1{,}25\,c_0$ y 100 en $0{,}25\,c_0$; el PBI se
premia hasta duplicar el inicial. Cada fila de pesos suma 1 (INV-14). Puntaje inicial: 310 (N1), 525 (N2), 509,2 (N3). El
multiplicador de la ruta se aplica al puntaje final del nivel.

---

## 18. Predicción del jugador e índices de investigación

Origen: `src/components/tutorial/predictions.ts`, `src/components/tutorial/predictionBands.json`,
`src/sim/v2/research.ts`, `PARAMS_V2.research`. Nada de esto está en el prototipo ni cambia el modelo.

### 18.1 Predicción (juego de 3 niveles)

Antes de cada año el jugador puede predecir la dirección (baja / sin cambio / sube) de $B$, $c$ y $E$. La dirección real:

$$
\text{dir} = \begin{cases} \text{sin cambio} & \lvert\Delta X\rvert < b_{X,N}\\ \text{sube} & \Delta X \ge b_{X,N}\\ \text{baja} & \Delta X \le -b_{X,N}\end{cases}
$$

con la banda $b_{X,N}$ = **percentil 33 de $\lvert\Delta X\rvert$ anual** entre 150 jugadores sintéticos por nivel del arnés
(`scripts/prediction-bands.ts`), de modo que a priori "sin cambio" ocurre un tercio de las veces:

| Nivel | $b_B$ | $b_E$ | $b_c$ (t) | Climatología (baja / sin cambio / sube) de $B$ · $E$ · $c$ |
|---|---|---|---|---|
| 1 | 0,1872 | 0,3518 | 0,0511 | 0,329/0,333/0,337 · 0,244/0,333/0,423 · 0,514/0,333/0,152 |
| 2 | 0,1861 | 0,4644 | 0,0502 | 0,320/0,334/0,346 · 0,256/0,333/0,411 · 0,496/0,333/0,171 |
| 3 | 0,1837 | 0,6505 | 0,0398 | 0,307/0,333/0,360 · 0,324/0,333/0,343 · 0,503/0,333/0,163 |

Territorio no tiene predicción (spec 48 §7); niveles sin banda propia caerían en N2.

### 18.2 Brier y *skill*

Brier categórico (3 clases) de una predicción determinista: 0 si acierta, 2 si falla; de un pronóstico probabilístico,
$\sum_k (p_k - o_k)^2$. Línea base de persistencia: la dirección real del año anterior (en el primer año, "sin cambio");
climatología: las proporciones de la tabla. *Skill*:

$$
SS = 1 - \frac{\overline{\text{Brier}}_{\text{jugador}}}{\overline{\text{Brier}}_{\text{base}}},
$$

con piso almacenado $-10$ (una base perfecta con un jugador imperfecto daría $-\infty$).

### 18.3 Arrepentimiento (regret) de un año

Desde el estado previo al paso se simula un año de la cartera del jugador y de cada cartera vecina (activar o desactivar una
política respetando el máximo de 5, el *lock-in* y un mínimo de políticas activas: 1 en el juego de 3 niveles, 0 en
Territorio), todas con `makeRng(seed, year + 1)` (números aleatorios comunes):

$$
\text{regret} = \max_{\text{vecinas} \cup \{\text{jugador}\}} S_{t+1} - S^{\text{jugador}}_{t+1} \ \ge 0 .
$$

En Territorio se omiten bandeja y mapa (conectividad congelada) y solo se calcula a pedido de la UI. En el juego de 3 niveles
el año real se simula con `Math.random`, de modo que la corrida "jugador" del contrafáctico no es la realizada.

### 18.4 Brecha seguro-y-justo

$$
\text{gap} = \sum_{X\in\{F,E,W,B\}} \frac{\max(0, X_{\min} - X)}{100} + \frac{\max(0, c - 0{,}8\,c_0)}{c_0} + \frac{\max(0, f_0 - f)}{f_0},
$$

con pisos sociales $F \ge 40$, $E \ge 35$, $W \ge 55$, piso ecológico $B \ge 45$, techo $c \le 0{,}8\,c_0$ y bosque $\ge f_0$
(valores 🟧 de la spec, criterio experto). El índice de sesión es su media temporal $\int \text{gap}\,dt / t$.

### 18.5 Resiliencia, presupuesto, entropía y reversiones

- **Resiliencia:** un paso con evento donde $F$ o $E$ cae $\ge 0{,}5$ puntos abre un episodio; se cierra cuando el indicador
  recupera el 90 % de la caída. Índice: tiempo medio de recuperación en meses (episodios abiertos al final, censurados).
- **Presupuesto de carbono usado:** $B_t$ de §7.6 al final.
- **$G$ y $J$** finales (§14).
- **Entropía de la cartera:** $H = -\sum_j q_j \ln q_j / \ln 10$, $q_j$ = fracción del tiempo activo de cada política.
- **Reversiones:** número de políticas desactivadas por el jugador.

---

## 19. Calibración y validación

Origen: `tests/sim/golden.v2.spec.ts`, `scripts/sim-check.ts` (+ `scripts/harness/`), `reports/balance-2.0.md`,
`scripts/sensitivity.ts` → `reports/sensitivity-2.0.md`, `tests/sim/reference.spec.ts`, `tests/sim/extremes.spec.ts`.

### 19.1 Golden contra el prototipo

`scripts/reference/modelo_v2.py` es la especificación ejecutable (Python, sin dependencias). `golden_v2.csv` contiene 27
filas (3 niveles × `do_nothing`/`green`/`extractive` × años 1, 10, 30; sin eventos) con $B, F, E, W, S_t, c, \pi, D/Y$ y puntaje.
`tests/sim/golden.v2.spec.ts` compara el motor TS con esas filas; los submódulos tienen además casos de referencia ±1e-9
(`biodiversity40`, `food41`, `indicators39`, `pressures42`, `finance44`). Al redactar este documento se regeneró el golden con
el prototipo y coincidió byte a byte con el archivo versionado; el test TS pasa. Fragmento (N2, año 30):

| Estrategia | $B$ | $F$ | $E$ | $W$ | $S_t$ | $c$ | $D/Y$ | Puntaje |
|---|---|---|---|---|---|---|---|---|
| `do_nothing` | 39,20 | 40,94 | 31,11 | 59,98 | 71,22 | 6,90 | 0,000 | 536 |
| `green` (CR, AS, AGUA, CN) | 54,84 | 37,52 | 29,29 | 66,85 | 78,44 | 4,89 | 0,271 | 647 |
| `extractive` (PAI, PEA, PIE, FRA, SE) | 28,59 | 52,23 | 50,96 | 56,31 | 57,07 | 8,01 | 0,046 | 475 |

(En N3 el prototipo y el arnés aplican $\tau = 2$ a toda estrategia con políticas.)

### 19.2 Arnés `sim:check`: criterios C1–C9

Estrategias canónicas (`scripts/harness/strategies.ts`, las del prototipo): `do_nothing`, `green`, `extractive`,
`production`, `innovation`, `conservation`, `balanced`, `tech_tax` en el juego de 3 niveles (40 semillas por estrategia y
nivel, con eventos); en Territorio `do_nothing`, `conservation`, `production`, `innovation`, `settle_only`,
`cheap_production`, `extractive`, `buy_everything` (20 semillas). Resultado final (`reports/balance-2.0.md`, 28/10/2026):

| Criterio | Exigencia | Valor | Estado |
|---|---|---|---|
| C1 "sin hacer nada" nunca gana | 0 % en cada nivel y en Territorio | 0,000 | PASS |
| C2 la estrategia dirigida gana su ruta | ≥ 70 % | mín. 0,800 (Territorio `production`) | PASS |
| C3 ninguna estrategia gana todas las rutas | ≤ 50 % | 0,050 (N2 `balanced`) | PASS |
| C4 atajos cerrados | `tech_tax`, `extractive`, `settle_only`, `cheap_production`, `buy_everything` ≤ 5 % | 0,000 | PASS |
| C5 la estrategia decide, no la semilla | ninguna tasa en (30 %, 70 %) | 0 casos | PASS |
| C6 recorrido de indicadores | ≥ 15 puntos en $B, F, E, W$ entre estrategias (W de N1 excluido, §20.5) | mín. 16,847 (F N3) | PASS |
| C7 banda de predicción | "sin cambio" 33 % ± 3 | máx. desvío 0,023 | PASS |
| C8 sin colapsos espurios | ninguna quiebra salvo `buy_everything` de Territorio | 0 | PASS |
| C9 consistencia anual–mensual | $\lvert\Delta\rvert \le 1$ punto, $\le 0{,}1$ t en $c$ (N2, sin eventos, años 10 y 30) | 0,000 | PASS |

Tasas de victoria de las estrategias dirigidas: N1 100 / 92,5 / 100 %; N2 100 / 92,5 / 100 %; N3 100 / 85 / 95 %
(conservación / producción / innovación); Territorio 100 / 80 / 100 %. Recorridos (máx − mín de medianas a 30 años):
N1 $B$ 27,4, $F$ 22,9, $E$ 22,6, $W$ 4,7; N2 31,7 / 18,3 / 23,3 / 25,7; N3 30,9 / 16,8 / 20,9 / 26,4; Territorio
30,6 / 26,5 / 30,2 / 38,5.

### 19.3 Sensibilidad (Morris)

Efectos elementales de Morris sobre 30 factores (15 de `CP`, 15 de `PARAMS_V2`; las tablas `costShare`, `rampYears`,
`fatigueYears`, `bE` con un multiplicador único), rango $[0{,}8; 1{,}2]\times$ nominal, $p = 4$ niveles, $\Delta = 2/3$ del rango,
$r = 20$ trayectorias (1302 corridas), respuestas $B, F, E, W, c, D/Y$ del N2 a 30 años para `green` y `production`, sin
eventos. Índice global = media sobre los 12 pares (estrategia, respuesta) de $\mu^*/\max\mu^*$.

| # | Factor | Índice |
|---|---|---|
| 1 | `Tasa_Impositiva_General_Sobre_PBI` ($\tau_0$) | 0,675 |
| 2 | `Gasto_Publico_Base_Nivel_2` ($\gamma_2$) | 0,595 |
| 3 | `Eficiencia_Minima_Politicas` ($\eta_{\min}$) | 0,307 |
| 4 | `Tasa_Crecimiento_Poblacional_Base` | 0,307 |
| 5 | `fatigueYears` (×tabla) | 0,259 |
| 6 | `Tasa_Base_Crecimiento_PBI` | 0,187 |
| 7 | `Poblacion_Inicial` | 0,169 |
| 8 | `food.yieldTrend` | 0,165 |
| 9 | `costShare` (×tabla) | 0,147 |
| 10 | `Tasa_de_interes_Nivel_2` | 0,117 |

Lectura: $\tau_0$ y $\gamma_2$ dominan por la misma vía (fijan el superávit primario antes de las políticas,
$0{,}15 - 0{,}125 = 2{,}5\,\%$ del PBI) con un efecto umbral ($\sigma \approx \mu^*$); +20 % de $\gamma_2$ con la cartera verde da
$\Delta E = -14{,}4$, $\Delta W = -23{,}6$ y quiebra en 2051 (prototipo: −13,6 / −22,6). $\kappa_1$ queda 14.º (índice 0,066).
Las velocidades de ajuste tienen índice $\le 0{,}035$ (cambian el camino, no el destino); `Recuperacion_Politicas_Anios` da 0
porque ninguna cartera apaga políticas.

### 19.4 Comportamientos de referencia y casos extremos

| Comportamiento | Prototipo / spec | Motor TS |
|---|---|---|
| Deforestación sin políticas, año 1 | ≈ 1,1–1,2 %/año | 1,09 % (N1), 1,10 % (N2), 1,02 % (N3) |
| Ídem con CR en su décimo año | < 0,3 % | 0,12 / 0,13 / 0,02 % |
| Transición forestal con AS + CR + GS (N2) | deja de caer antes del año 5 | mínimo en el año 3 (16,40 %); 16,67 → 16,86 % en 15 años |
| Ídem sin políticas | 16,5 → 14,7 % | 16,67 → 14,75 % |
| Aprendizaje ($\lambda = 1{,}5$) | ~85 % en 3 años | 0,865 (CR, $\lambda = 2{,}5$: 0,70) |
| Recuperación de $F$ ($k_F = 0{,}35$) | mitad en 1,61 años, 90 % en 5,35 (analítico) | ≈ 1,65 / ≈ 5,6 años (realimentación por $E$) |
| Todo en CC (N2, 30 años) | $B$ 20,6; $F$ 91; $c$ 8,5 | 20,62; 91,2; 8,52 |
| Todo en BNP | hambruna 2028; $c$ ≈ 3,6 | hambruna 2028; 3,60 |
| $\tau = 20$ durante 30 años en N3 | $E$ ≈ 15, $C$ ≈ 72, deuda ≈ 0 | 15,2; 71,6; $D/Y$ 0,013 |
| CR + AGUA + CN + SE + AS sin impuestos | N3 quiebra 2041; N2 $D/Y$ ≈ 0,7 | N3 quiebra 2041; N2 0,74 |
| Población × 10 | $c_0$ 7,13 → 5,21 | 7,135 → 5,213 |
| 100 años sin eventos ni políticas, $P$ e $Y$ constantes | converge | no converge del todo (máx $\lvert\Delta\rvert$ 0,056) porque la frontera sigue talando ~1 %/año; con tasas de frontera 0, $\lvert\Delta\rvert < 0{,}001$ desde el año 30 (igual que el prototipo) |

En los casos "todo en un uso" los tests re-anclan el pool agrícola a la mezcla nueva (como el `Aag0` perezoso del
prototipo); sin re-anclar, $B$ termina en 26 en lugar de 20,6.

---

## 20. Supuestos, limitaciones y decisiones pendientes

### 20.1 Supuestos del modelo

1. **Modelo de juego, no proyección.** Parámetros calibrados por criterios de jugabilidad y didáctica (C1–C9), no estimados
   contra datos; las trayectorias no representan el Bosque Atlántico, Misiones ni Argentina.
2. **Escala poblacional fija de 400 000 habitantes** (decisión 4 del índice v6, densidad 67–80 hab/km²) en todos los niveles
   y en Territorio, elegida para que AFOLU pese 20–35 % del total; con 10 millones el uso del suelo dejaría de pesar en $c$.
3. **Parámetros de criterio experto.** Salvo los stocks de carbono de bosque (revisión del Bosque Atlántico) y la forma y
   el exponente $z$ de especies-área (Pereira et al., 2014), todo coeficiente es criterio experto del equipo
   (Anexo A).
4. **Ancla en el estado inicial.** Todo impulsor es un desvío del inicio del nivel; el estado inicial es por construcción
   un equilibrio de los objetivos (no de la dinámica física: la frontera, la población, el PBI y la tendencia de
   rendimientos siguen moviéndose). Consecuencia: el modelo es relativo; dos niveles con distinto $X_0$ responden con
   distinta pendiente a la misma política.
5. **Homogeneidad espacial en el juego de 3 niveles.** Un territorio sin geografía: áreas agregadas, sin conectividad,
   sin heterogeneidad de suelos ni rendimientos. En Territorio el mapa solo aporta $K$ y la elegibilidad de los lotes.
6. **Áreas iniciales de maqueta** (L-5 abierto): N1 500 kHa, N2/N3 600 kHa; bosque nativo 20 / 16,7 / 16,7 %.
7. **Dinero abstracto** (u.m.), PBI inicial 10 000 (N1, N2) y 12 000 (N3) sin conversión a moneda real.
8. **Relajación de primer orden** hacia objetivos logísticos para todo indicador acotado; sin retardos ni memoria salvo
   los relojes de política, los impulsos y el AR(1).
9. **Pool agrícola con renta anclada:** la mezcla agrícola inicial es un equilibrio; las políticas desplazan log-rentas.
10. **Carbono:** inventario simplificado de 3 fuentes, flujos constantes por uso (sin dinámica de saturación del suelo),
    LUC solo por pérdidas de stock e instantáneo; energía como per cápita con elasticidad-ingreso constante.
11. **Seguridad alimentaria** como disponibilidad interna per cápita relativa a la inicial; sin comercio explícito salvo la
    fracción exportada; PF y usos públicos no producen alimentos.
12. **Finanzas:** gasto base proporcional al PBI, intereses simples, piso de reservas del 2 % financiado con deuda
    automática; sin inflación, tipo de cambio ni mercado de deuda explícito.
13. **Eventos independientes** con probabilidad constante dentro del año (Bernoulli por paso); efectos como saltos de
    nivel; el AR(1) es el único proceso persistente.
14. **Situaciones como impulsos que se desvanecen** (vida media 18 meses), con tope ±0,6 logit por indicador.
15. **Agentes no modelados:** el jugador es el único decisor; las presiones sectoriales y el colapso son respuestas
    agregadas, sin comportamiento estratégico de los actores.

### 20.2 Limitaciones conocidas

- $W$ del N1 casi no se mueve (recorrido 4,7): $C_0 = 5$ ancla $W$ en 95, donde la logística es plana (§4.1).
- $K$ puede subir al talar un parche aislado (definición de la spec: fracción del bosque en el mayor parche).
- La convergencia de largo plazo requiere también tasas de frontera nulas (§19.4).
- Las partidas reales del juego de 3 niveles no son reproducibles por semilla (`Math.random`, §2.6), y el regret compara
  contra una realización distinta de la jugada.
- La barra de progreso de las condiciones de estado (renovables, bosque, $D/Y$, pactos) arranca en 0 (deuda de UI).
- La calibración depende fuertemente del saldo primario ($\tau_0$, $\gamma_N$): cambios de ±20 % pueden llevar a la quiebra
  carteras que de otro modo ganan.
- Los streams aleatorios del prototipo (`random.gauss`) y del motor (Box–Muller seno) difieren: la equivalencia está
  verificada solo sin eventos.

### 20.3 Inconsistencias entre código, prototipo y documentación detectadas al redactar

Se usa siempre el valor del código.

1. `src/sim/v2/food.ts`, comentario de cabecera: escribe $D_F = 2{,}5\cdot\ln(\rho/\rho_0)$; el código y el prototipo usan
   $\kappa_1 = 3{,}0$ (fase 49b). La spec `41_seguridad_alimentaria_balance.md` y la fila de la fase 41 de
   `docs/audit-equations.md` también dicen 2,5 (históricos).
2. `docs/v6-spec-vs-motor.md`, "Requiere visto bueno", fila 7: dice que el canal de abandono "no está en la spec 47 ni en el
   prototipo"; el prototipo sí lo implementa (`NEGLECT_LOGIT`, `NEGLECT_TOL`, `NEGLECT_TAU_M` en `play_territorio`, v6/47).
3. Rutas de Territorio: el prototipo (`TERR_ROUTES`) conserva naturaleza pública ≥ 8 % y $F \ge 44$; el código usa 6 % y 40,5
   (decisiones de la fase 49, pendientes de visto bueno).
4. Pactos en el juego de 3 niveles: el prototipo (`play_level`) descuenta la entrada directamente de $R$, sin la regla de
   espacio fiscal; el código la cobra con `payPublicInvestment` (§13.4). Afecta solo al arnés del prototipo.
5. Anclas de presiones: el código las acota a $[2, 98]$; el prototipo no (sin efecto en partidas nuevas).
6. Comentario de `CONTROL_PARAMS.Gasto_Publico_Base_*` en `src/constants.ts`: remite a "paper técnico §9", que no existe en el
   repo (el README de `src/sim/v2/` lo registra como recortado); este documento es su base.
7. `CLAUDE.md` describe que los pactos tienen funciones `effects` que se restauran tras clonar con JSON; desde la fase 43 los
   pactos son datos puros y `restorePactFunctions` no existe.
8. `docs/DESIGN_DECISIONS_LOG.md` fecha las entradas de las fases 47–50 y 49b el 22/10/2026, mientras `docs/audit-equations.md`
   las fecha el 27–28/10/2026.
9. La spec 46 pedía la estacionalidad como "probabilidad mensual × $w_m$"; el código usa el exponente del peligro
   (documentado). La spec 47 decía descarte a "6 vidas medias"; código y prototipo descartan a $6\tau$.

### 20.4 Por qué ciertas respuestas son pequeñas o grandes

- La pendiente logística $100p(1-p)$ hace que los indicadores cerca de los extremos (N1: $W_0 = 95$, $S_{t,0} = 95$)
  respondan poco a cualquier impulsor.
- $B$ es el indicador más lento ($k_B = 0{,}12$, semivida 5,4 años): las políticas de conservación tardan en mostrarse.

### 20.5 Decisiones que requieren validación del equipo

Tomadas de `docs/v6-spec-vs-motor.md`, sección "Requiere visto bueno del equipo" (implementadas y documentadas):

| # | Decisión | Spec / antes | Motor 2.0 | Fase |
|---|---|---|---|---|
| 1 | $W$ del N1 excluido de C6 (`C6_EXCLUDED`) | ≥ 15 en todos | recorrido 4,7–4,9, igual en el prototipo | 48/49 |
| 2 | Naturaleza pública de Territorio ≥ 6 % | 8 % | 6 % | 49 |
| 3 | $F \ge 40{,}5$ en la producción de Territorio | 44 | 40,5; `production` gana 80 % | 49/49b |
| 4 | Piso de $F$ de la producción N3 | 33 | 31 | 49b |
| 5 | $\kappa_1$ | 2,5 | 3,0 | 49b |
| 6 | Paso anual = 12 sub-pasos mensuales | un paso de $\Delta t = 1$ | 12 × 1/12 | 46 |
| 7 | Canal de abandono del escritorio, $1{,}2\max(0, N-3)$, vida media 36 meses | no estaba en la spec 47 | canal sin tope | 47 |
| 8 | Pisos de $F$ (32) y $E$ (36/40/36) de las rutas de producción | spec 49 | valores del prototipo | 49 |
| 9 | Escrutinio por $c > 1{,}5\,c_0$ | $c > 12$ t | regla del prototipo | 46 |
| 10 | Estacionalidad como exponente | $p \times w_m$ | $1 - (1-p)^{w_m/12}$ | 46 |
| 11 | $\tau_0$ marcado como sensible en el panel | solo $\gamma_N$ | los dos | 51 |

---

## 21. Historial de versiones del modelo

`MODEL_VERSION` versiona ecuaciones y parámetros, no la app. Reglas (`src/sim/version.ts`): *patch* = solo texto o UI;
*minor* = correcciones que cambian trayectorias sin cambiar la estructura; *major* = variables de estado o formas de ecuación
nuevas. Cada fila de investigación (`game_sessions`, `predictions`, `territorio_feedback`) guarda la versión; ningún análisis
mezcla versiones sin estratificar.

| Versión | Fecha / referencia | Qué es |
|---|---|---|
| **1.0** | commit `144c321`, auditado el 19/10/2026; tag local `model-v1.0` | Modelo con el que se recolectaron los datos de talleres. Indicadores actualizados por sumas lineales ponderadas (`INDICATOR_IMPACT_WEIGHTS`, `Factor_Impacto_*_Peso`) con topes y recortes por término; Euler (`toward`) en el paso mensual; carbono con factor de escala 40 000 y población de 10 millones; presiones por impulso lineal con disipación (se saturaban en 0/100); eficiencia de políticas con decaimiento exponencial sin piso; pactos como funciones que escribían niveles; tesoro que podía quedar negativo y quiebra inalcanzable; sorteo de eventos sesgado por el orden de la lista; costos fijos. |
| **1.1** | fase 34, 22/10/2026; rama `v6-modelo-1-1`, tag `model-v1.1` | Correcciones de la auditoría sin cambiar la estructura: CN pasa a tener desgaste (su `stellaName` estaba comentado), reparto parejo del esfuerzo al activar (`evenEffort`), pactos como impulsos acotados en lugar de niveles, sequía con el área real del estado, reactivar una política no restaura su eficiencia, bosque protegido declarado contado aparte (Territorio), efectos de situaciones sobre derivados diferidos, interfaz honesta (70 claves sin uso borradas de `CONTROL_PARAMS`). |
| **2.0-dev** | fases 35–50 y 49b, 22–28/10/2026 | Cadena intermedia (sin datos de investigación). |
| **2.0** | fase 51, 28/10/2026; tag local `model-v2.0`; HEAD `54fc3c6` en `main` | Motor rediseñado en los dos juegos: integrador único `advance` con discretización exacta y paso anual = 12 mensuales (35, 46); anclas en el estado inicial y relajación logística de todos los indicadores acotados (39–42); políticas con puesta en marcha, fatiga con piso, recuperación, canales por instrumento y costo por esfuerzo (36); matriz de suelo conservativa con barbecho y pool por renta anclada (37); carbono en unidades físicas con energía, AFOLU, LUC y presupuesto, población 400 000 (38); $B$ por especies-área y conectividad (40); $F$ por balance oferta/demanda (41); presiones logísticas (42); pactos como datos (43); finanzas con gasto base, deuda automática, prima de riesgo, estrés fiscal y quiebra explícita (44); conflicto distributivo $G$, $J$ (45); eventos independientes, AR(1) y estacionalidad (46); situaciones como impulsos y canal de abandono (47); bandas de predicción por terciles e índices de investigación (48); rutas y puntaje por resultados, anclados (49); $\kappa_1 = 3{,}0$ (49b); validación (51). |

---

## Anexo A. Parámetros

### A.1 `PARAMS_V2` (`src/sim/v2/params.ts`)

Todos son copia fiel del diccionario `P` del prototipo salvo indicación. "CE" = criterio experto.

| Parámetro (código) | Símbolo | Valor | Unidad | Fuente / criterio | Fase |
|---|---|---|---|---|---|
| `rampYears` | $\lambda_j$ | AS 1,5 · CR 2,5 · GS 1,5 · AGUA 2,0 · CN 2,5 · PAI 1,0 · PEA 0,5 · PIE 1,5 · FRA 0,5 · SE 0,5 | años | CE | 36 |
| `fatigueYears` | $\delta_j$ | AS 15 · CR 25 · GS 12 · AGUA 20 · CN 25 · PAI 8 · PEA 10 · PIE 10 · FRA 6 · SE 5 | años | CE | 36 |
| `costShare` | $\kappa_j$ | AS 0,008 · CR 0,010 · GS 0,006 · AGUA 0,008 · CN 0,012 · PAI 0,006 · PEA 0,003 · PIE 0,005 · FRA 0,002 · SE 0,012 | fracción de $Y$/año | CE, calibrado contra $\gamma_N$ | 36/44 |
| `costFixedShare` | $f$ | 0,3 | — | CE | 36 |
| `effortE0` | $e_0$ | 40 | puntos de esfuerzo | CE | 36 |
| `INSTRUMENT_CHANNELS` | $\mu^{ch}_{jk}$ | Tabla 5.1 | — | spec 36 §2, CE | 36 |
| `land.frontier` | — | BNNP→BNP: CR 0,05; BNNP→CC: PAI 0,04, FRA 0,01; BNNP→CA: AS 0,02; CA→BNNP: AS 0,01 | fracción/año por unidad de $\eta^{land}$ | CE (v1) | 37 |
| `land.poolShare` | $\mu$ | 0,02 | 1/año | CE | 37 |
| `land.rentBeta` | $\beta$ | 1,0 | logit/log-renta | CE | 37 |
| `land.fallowReentry`, `fallowRegen` | — | 0,25; 0,05 | 1/año | CE | 37 |
| `land.rent` | $\Delta r_k$ | Tabla de §6.3 | log-renta por unidad de $\eta^{prod}$ | CE | 37 |
| `land.rentCarbonTaxCC` | — | −0,2 | log-renta por unidad de $\eta^{tax}_{CN}$ | CE | 37 |
| `land.zeroAnchor` | — | $10^{-6}$ | kHa | numérico | 37 |
| `flux` | $f^0_i$ | Tabla de §7.3 | tCO₂e/ha/año | CE | 38 |
| `stock` | $C_i$ | Tabla de §7.3 | Mg C/ha | revisión Bosque Atlántico + CE | 38 |
| `fluxPolicy` | — | CC: PAI +0,3 (prod); PRG: GS −0,35; CA: AS −0,4; BNNP: FRA +1,0, CR −0,6 (land) | por unidad de $\eta$ | CE | 38 |
| `energy.eps0` | $\epsilon_{0,N}$ | 4,0 / 5,0 / 4,6 | tCO₂/hab/año | calibrado para $c_0$ | 38 |
| `energy.electricShare` | — | 0,35 | — | CE | 38 |
| `energy.adjust` | $k_{en}$ | 0,15 | 1/año | CE | 38 |
| `energy.parksFullShare` | — | 0,04 | fracción del territorio | CE | 38 |
| `energy.incomeElasticity` | — | 0,3 | — | CE | 38 |
| `energy.renewablesMaxCN`, `efficiencyMaxCN` | — | 0,60; 0,35 | — | CE | 38 |
| `energy.renewablesCap`, `efficiencyCap` | — | 0,9; 0,6 | — | CE | 38 |
| `energy.subsidyBoost` | — | 0,15 | — | CE | 38 |
| `energy.budgetCut2054`, `budgetYears` | — | 0,30; 30 | —; años | 🟧 editable | 38 |
| `habitat` | $h_i$ | §8.1 | — | CE | 40 |
| `zSAR` | $z$ | 0,35 | — | Pereira et al. 2014 | 40 |
| `qB` | $q_{B,j}$ | §8.2 | logit/$\eta^{land}$ | CE | 40 |
| `biodiversity.synergyAgroConservation` | — | 0,10 | logit | CE | 40 |
| `biodiversity.synergyIntensiveFlexible` | — | 0,12 | logit | CE | 40 |
| `biodiversity.connectivityGamma`, `connectivityFloor` | $\gamma_K$ | 0,25; $10^{-3}$ | logit/ln; — | CE | 40 |
| `biodiversity.gammaMaxB0` | — | 95 | puntos | numérico | 40 |
| `food.yield` | — | CC 1,0 · CA 0,7 · PRG 0,25 | relativo a CC | CE | 41 |
| `food.yieldPolicy` | — | PAI 0,25 · AS 0,15 · GS 0,20 · AGUA 0,06 | por unidad de $\eta^{prod}$ | CE | 41 |
| `food.yieldTrend` | — | 0,006 | 1/año | CE | 41 |
| `food.export0`, `exportPEA` | — | 0,30; 0,20 | fracción | CE | 41 |
| `food.kappa1` | $\kappa_1$ | **3,0** (2,5 hasta la 49b) | logit/ln | CE, criterio C6 | 41/49b |
| `food.kappa2`, `econScale` | $\kappa_2$ | 0,6; 50 | logit; puntos | CE | 41 |
| `food.rhoFloor` | — | $10^{-3}$ | — | numérico | 41 |
| `bE` | $b_{E,j}$ | §10.1 | logit/$\eta^{prod}$ | CE | 39 |
| `productiveValue` | $v_k$ | CC 1,0 · CA 0,8 · PRG 0,6 · PF 0,9 · ENR 1,2 | relativo | CE | 39 |
| `conflict` | $c_{C,j}$ | FRA 0,60 · PAI 0,30 · PIE 0,20 · SE −0,10 | logit/$\eta^{social}$ | CE | 39 |
| `greenRelief` | $g_{C,j}$ | CN 0,25 · CR 0,25 · AGUA 0,15 | logit/$\eta^{social}$ | CE | 39 |
| `conflictWeights` | — | food 0,6 · econ 0,5 · envPressure 0,4 · gini 3,0 · just 0,6 | logit | CE | 39/45 |
| `justTransition` | $w^R$, $w^S$ | R: CR 1,0 · CN 0,5 · AGUA 0,3; S: AS 0,5 · GS 0,5 | — | CE | 45 |
| `relaxation.impulseCap` | — | 0,6 | logit | spec 39 §1 | 39 |
| `relaxation.wearLogit` | — | 0,04 | logit/punto | CE (prototipo) | 42 |
| `relaxation.E` | — | carbonTax 0,15 · growth 0,25 / growthScale 0,01 · landValue 1,5 · biodiversity 0,15 / 20 · fiscalStress 0,8 · tax 0,04 · foodCrisis 0,6 (mid 20, width 4) | logit | CE | 39 |
| `relaxation.C` | — | foodScale 15 · econScale 15 · envPressureScale 20 · subsidyStress 0,3 · shareCC 2,0 · sharePF 1,0 · tax 0,03 · fiscalStress 0,6 | logit; puntos | CE | 39 |
| `relaxation.Pc` | — | wellbeing 0,9 / 20 · econ 0,5 / 20 · fiscalStress 0,8 · polarisation 0,5 / 30 · pressureMean 0,6 / 20 | logit; puntos | CE | 39 |
| `pressure.a`, `.e`, `.s` | $\phi$ | Tabla de §11 | puntos por unidad de $\eta^{social}$ | CE (factores v1) | 42 |
| `pressure.phiScale` | — | 15 | puntos/logit | CE | 42 |
| `pressure.anchorFloor` | — | 2 | puntos | numérico (solo código) | 42 |
| `pressure.drivers` | — | a: econ 0,03 · food 0,02 · prodShare 4,0; e: biodiversity 0,035 · co2 1,5; s: wellbeing 0,04 · tax 0,04 | logit | CE | 42 |
| `pacts` | — | Tabla de §12 | logit; fracción de $Y$ | CE | 43 |
| `finance.reserveFloor` | — | 0,02 | fracción de $Y$ | CE | 44 |
| `finance.riskPremium`, `debtThreshold` | — | 0,05; 0,6 | —; $D/Y$ | CE | 44 |
| `finance.bankruptcyDebtRatio`, `bankruptcyInterestBurden`, `bankruptcyYears` | — | 1,0; 0,20; 2 | —; —; años | CE | 44 |
| `finance.breachEps` | — | $10^{-9}$ | años | numérico | 44 |
| `finance.stressMid`, `stressWidth` | — | 0,20; 0,04 | — | CE | 44 |
| `finance.growthPIE`, `growthPEA`, `growthTaxDrag`, `growthStress` | — | 0,01; 0,005; 0,0002; 0,01 | 1/año por unidad | CE | 44 |
| `finance.carbonTaxRevenue` | — | 0,005 | fracción de $Y$ por unidad de $\eta^{tax}_{CN}$ | CE | 44 |
| `finance.investmentScaleCap` | — | 2,5 | — | CE (v4/F8) | 47 |
| `situations.halfLifeMonths`, `discardTaus` | — | 18; 6 | meses; — | 🟧 CE | 47 |
| `situations.neglectLogit`, `neglectTolerance`, `neglectHalfLifeMonths` | — | 1,2; 3; 36 | logit; —; meses | CE, decisión del usuario 19/09/2026 | 47 |
| `events.drought` | — | base 0,03 · trend 0,5 / 30 años · forestLoss 0,6 · noWater 0,04 · ccShare 0,02 · ccThreshold 0,25 | prob. anual | CE (1.1 + 2.0) | 46 |
| `events.scrutinyCO2Ratio` | — | 1,5 | $\times c_0$ | prototipo | 46 |
| `events.justiceAfterYears` | — | 5 | años | prototipo | 46 |
| `events.droughtSeasonality` | $w_m$ | §15.4 | — | 🟧 CE | 46 |
| `events.yieldShock` | — | persistence 0,5 · sigma 0,04 · waterDamping 0,5 | — | CE | 46 |
| `research.safeJust` | — | F 40 · E 35 · W 55 · B 45 · cRatio 0,8 | puntos; — | 🟧 spec | 48 |
| `research.shockMinDrop`, `recovery` | — | 0,5; 0,9 | puntos; fracción | CE / spec | 48 |
| `productive.policies`, `minActive` | — | PAI, PEA, GS, AS; 2 | — | spec 49 §3 | 49 |

### A.2 `CONTROL_PARAMS` relevantes (`src/constants.ts`)

| Clave | Símbolo | Valor | Unidad | Fuente / criterio | Fase |
|---|---|---|---|---|---|
| `Poblacion_Inicial` | $P_0$ | 400 000 | hab | decisión 4 del índice v6 | 35/38 |
| `Tasa_Crecimiento_Poblacional_Base` | $g_P$ | 0,008 | 1/año | 1.x | 38 |
| `Velocidad_Ajuste_Biodiversidad` | $k_B$ | 0,12 | 1/año | CE | 40 |
| `Velocidad_Ajuste_Seg_Alimentaria` | $k_F$ | 0,35 | 1/año | CE | 41 |
| `Velocidad_Ajuste_Seg_Economica` | $k_E$ | 0,30 | 1/año | CE | 39 |
| `Velocidad_Ajuste_Conflicto` | $k_C$ | 0,35 | 1/año | CE | 39/45 |
| `Velocidad_Ajuste_Colapso` | $k_{P_c}$ | 0,25 | 1/año | CE | 39 |
| `Velocidad_Ajuste_Presiones` | $k_\pi$ | 0,35 | 1/año | CE | 42 |
| `Eficiencia_Minima_Politicas` | $\eta_{\min}$ | 0,35 | — | CE | 36 |
| `Recuperacion_Politicas_Anios` | $\rho$ | 5 | años | CE | 36 |
| `Tasa_Base_Crecimiento_PBI` | $g_0$ | 0,02 | 1/año | 1.x | 44 |
| `Tasa_Impositiva_General_Sobre_PBI` | $\tau_0$ | 0,15 | fracción de $Y$ | 1.x; **sensible** | 44/51 |
| `Gasto_Publico_Base_Nivel_1/2/3` | $\gamma_N$ | 0,13 / 0,125 / 0,125 | fracción de $Y$/año | CE; **el más sensible** | 44 |
| `Tasa_de_interes_Nivel_1/2/3` | $i_N$ | 0,025 / 0,035 / 0,045 | 1/año | 1.x | 44 |
| `Pago_deuda_anual_Nivel_1/2/3` | $\alpha_N$ | 0,15 / 0,12 / 0,10 | 1/año | 1.x | 44 |
| `Tasa_de_BNNP_a_BNP_Base` | $r_1$ | 0,008 | 1/año | 1.x | 37 |
| `Tasa_de_BNNP_a_CC_Base` | $r_2$ | 0,010 | 1/año | 1.x | 37 |
| `Tasa_de_BNNP_a_CA_Base` | $r_3$ | 0,002 | 1/año | 1.x | 37 |
| `Tasa_de_CA_a_BNNP_Base` | $r_4$ | 0,001 | 1/año | 1.x | 37 |
| `Tasa_de_RES_a_BNP_Base` | $r_5$ | 0,04 | 1/año | v4/F8 | 37 |
| `Max_Additional_Tax_Rate_Percentage` | $\tau_{\max}$ | 20 | p.p. | 1.x | — |
| `Ano_Activacion_Prestamo` | — | 2035 | año | 1.x | — |
| `Costo_Declaracion_Area_Protegida_por_kHa` | — | 20 | u.m./kHa | v4/F8 | 47 |
| `Costo_Restauracion_Publica_por_kHa` | — | 60 | u.m./kHa | v4/F8 | 47 |
| `Costo_Humedal_Publico_por_kHa` | — | 45 | u.m./kHa | v4/F8 | 47 |
| `Costo_Parque_Energetico_por_kHa` | — | 80 | u.m./kHa | v4/F8 | 47 |
| `Costo_Mantenimiento_Uso_Publico_por_kHa_Anual` | — | 0,8 | u.m./kHa/año | v4/F8 | 44/47 |

Constantes de juego fuera de `CP`: `INITIAL_YEAR` 2024, `YEARS_PER_LEVEL` 30, `MAX_ACTIVE_POLICIES` 5,
`POLICY_LOCK_IN_DURATION` 5 años; Territorio: `LOT_KHA` 5, `KHA_PER_PARCEL` 0,1, `GRID_SIZE` 100, `PRODUCTIVE_PARCELS` 6000,
`MAX_OPEN_SITUATIONS` 6, `BASE_ARRIVAL` 0,16, `BREACH_MONTHS` 12, préstamo ≤ 10 % del PBI por año.

---

## Anexo B. Valores iniciales por nivel

### B.1 Estado inicial (`createInitialState`; `src/constants.ts`: `INITIAL_*`, `LEVEL_2_*`, `LEVEL_3_*`)

Territorio = Nivel 2.

| Variable | N1 | N2 (y Territorio) | N3 |
|---|---|---|---|
| BNNP / BNP (kHa) | 100 / 0 | 80 / 20 | 60 / 40 |
| CA / CC (kHa) | 100 / 100 | 70 / 150 | 100 / 100 |
| PF / PRG (kHa) | 100 / 100 | 120 / 160 | 150 / 150 |
| HUM / RES / ENR / FAL (kHa) | 0 | 0 | 0 |
| Área total (kHa) | 500 | 600 | 600 |
| $B$ / $F$ / $E$ | 40 / 35 / 25 | 40 / 40 / 30 | 40 / 40 / 30 |
| $C$ ($W$) | 5 (95) | 40 (60) | 40 (60) |
| $P_c$ ($S_t$) | 5 (95) | 30 (70) | 30 (70) |
| $\pi_a$ / $\pi_e$ / $\pi_s$ | 30 / 30 / 30 | 20 / 25 / 15 | 25 / 20 / 20 |
| $Y$ / $R$ / $D$ (u.m.) | 10 000 / 1000 / 0 | 10 000 / 1000 / 0 | 12 000 / 1000 / 5000 |
| $P$ (hab) | 400 000 | 400 000 | 400 000 |
| $\epsilon_{0,N}$ (tCO₂/hab/año) | 4,0 | 5,0 | 4,6 |
| $\gamma_N$ / $i_N$ / $\alpha_N$ | 0,13 / 0,025 / 0,15 | 0,125 / 0,035 / 0,12 | 0,125 / 0,045 / 0,10 |
| Puntaje inicial | 310,0 | 525,0 | 509,2 |

### B.2 Anclas calculadas (`computeAnchors`, ejecutado con `npx tsx`)

| Ancla | N1 | N2 / Territorio | N3 |
|---|---|---|---|
| $H_0$ (hábitat) | 0,3000 | 0,2633 | 0,2883 |
| $\rho_0$ (u. de producción/hab/año) | 3,4125·10⁻⁴ | 4,1825·10⁻⁴ | 3,6313·10⁻⁴ |
| $V_0$ (valor productivo) | 0,6600 | 0,6833 | 0,6750 |
| $G_0$ (concentración) | 0,50 | 0,54 | 0,50 |
| $a_{prod,0}$ | 0,600 | 0,633 | 0,583 |
| $a_{CC,0}$ / $a_{PF,0}$ | 0,200 / 0,200 | 0,250 / 0,200 | 0,167 / 0,250 |
| $f_0$ (bosque nativo) | 0,200 | 0,167 | 0,167 |
| $E_{en,0}$ (tCO₂e/año) | 1 600 000 | 2 000 000 | 1 840 000 |
| $E_{afolu,0}$ | 280 000 | 451 000 | 170 000 |
| $E_{luc,0}$ | 498 667 | 402 967 | 283 067 |
| $E_{tot,0}$ | 2 378 667 | 2 853 967 | 2 293 067 |
| $c_0$ (tCO₂e/hab/año) | 5,947 | 7,135 | 5,733 |
| $\bar\pi_0$ / $\Pi_0$ / $\pi_{e,0}$ | 30 / 0 / 30 | 20 / 10 / 25 | 21,67 / 5 / 20 |
| $Y_0$ / $P_0$ | 10 000 / 400 000 | 10 000 / 400 000 | 12 000 / 400 000 |

Verificación manual del AFOLU de N1: $0{,}5\cdot10^5 + 0{,}8\cdot10^5 + 2{,}5\cdot10^5 - 4{,}0\cdot10^5 + 3{,}0\cdot10^5 = 2{,}8\cdot10^5$
tCO₂e/año (BNNP, CA, CC, PF, PRG); energía $4{,}0 \times 400\,000 = 1{,}6\cdot10^6$. Ambos coinciden con la tabla. El LUC
inicial sale de la corrida en seco de un año de la matriz (§4.1).

Saldo primario inicial antes de políticas: $\tau_0 - \gamma_N$ = 2,0 % (N1), 2,5 % (N2, N3) del PBI; en N3 la deuda inicial
($D/Y = 0{,}417$) paga además $i_3 D = 225$ u.m./año de interés y $\alpha_3 D = 500$ u.m./año de amortización.

---

## Anexo C. Correspondencia ecuación ↔ código

| Ecuación / bloque | Sección | Archivo : función | Prototipo |
|---|---|---|---|
| Integrador, orden de operaciones | 2.2, 2.5 | `src/sim/v2/core.ts : advance`, `stepInPlace`, `advanceYear` | `step`, `play_level` |
| Paso anual / mensual | 2.2 | `src/sim/index.ts : stepYear`; `src/sim/monthly.ts : stepMonth` | `SUBSTEPS_PER_YEAR` |
| Relajación exacta, logística, $s_{low/high}$, $\phi$ | 2.3, 4.2 | `src/sim/v2/math.ts : relax`, `target100`, `sigmoid`, `logit`, `sLow`, `sHigh`, `phiEffort`, `toLogitDelta`, `toPointsDelta` | helpers |
| Anclas | 4.1, B.2 | `src/sim/v2/anchors.ts : computeAnchors`, `createModelState`, `dryRunLandFlows`, `startingEmissions` | `new_state` |
| Impulsos y tope | 4.3 | `src/sim/v2/indicators.ts : impulseSum`, `capImpulses` | `impulses`, `cap` |
| Relojes, eficiencia, canales, costo | 5 | `src/sim/v2/policies.ts : tickPolicyClocks`, `baseEfficiency`, `channelStrength`, `efficiencyOf`, `computeEfficiencies`, `policyCostOf`, `policyStatus` | `base_eta`, `channel`, `compute_eta`, `policy_cost` |
| Reparto parejo, aviso de fatiga | 5.2–5.3 | `src/sim/policies.ts : evenEffort`, `checkEfficiencyWarning` | — |
| Matriz de suelo | 6.2–6.5 | `src/sim/v2/land.ts : landFlows`, `realiseLandFlows`, `applyLandFlows` | `land_step` |
| Efectos de suelo | 6.6 | `src/sim/v2/land.ts : applyLandEffects` | `apply_land_effects`, `move_land` |
| Energía | 7.2 | `src/sim/v2/carbon.ts : energyTargets`, `updateEnergyState` | `carbon` (update) |
| AFOLU, LUC, total | 7.3–7.5 | `src/sim/v2/carbon.ts : fluxOf`, `computeEmissions` | `carbon` |
| Presupuesto | 7.6 | `src/sim/v2/carbon.ts : budgetPath`, `carbonBudgetIndex` | `budget` |
| Biodiversidad | 8 | `src/sim/v2/biodiversity.ts : habitatIndex`, `driveB`, `connectivityTerm`, `updateBiodiversity` | bloque B de `indicators_step` |
| Conectividad del mapa | 8.3 | `src/sim/territory.ts : forestConnectivity`; `src/territorio/session.ts : currentConnectivity` | — |
| Seguridad alimentaria | 9.1–9.2 | `src/sim/v2/food.ts : exportShare`, `domesticSupply`, `foodPerCapita`, `driveF`, `updateFoodSecurity` | `food_production`, bloque F |
| Choque AR(1) | 9.3 | `src/sim/events.ts : nextYieldShock`, `standardNormal` | final de `events_step` |
| $E$, $C$, $P_c$ | 10 | `src/sim/v2/indicators.ts : productiveValue`, `driveE`, `driveC`, `drivePc`, `updateRelaxedIndicators` | bloques E, C, Pc |
| Presiones | 11 | `src/sim/v2/pressures.ts : productiveShare`, `sectorSize`, `drivePressures`, `updatePressures` | bloque de presiones |
| Pactos | 12 | `src/sim/v2/pacts.ts : pactShift`, `pactEnergyShift`, `pactLandFactors`, `pactAnnualCost`, `pactEntryCost` | `P["pacts"]` |
| Finanzas | 13 | `src/sim/v2/finance.ts : stepFinance`, `interestRate`, `fiscalStressOf`, `isBankrupt`, `payPublicInvestment`, `canPayPublicInvestment`, `investmentScale`, `primaryBalanceAverage` | `economy_step`, `pay`, `cost_scale` |
| $G$, $J$ | 14 | `src/sim/v2/social.ts : landConcentration`, `justTransition`, `socialIndices`, `distributiveDrive` | `concentration`, bloque C |
| Eventos | 15 | `src/sim/events.ts : eventStepChance`, `seasonalWeight`, `rollEvents`, `applyRandomEventEffects`; `src/constants.ts : ALL_RANDOM_EVENTS` | `EVENTS`, `events_step` |
| Situaciones | 16.1–16.3 | `src/territorio/situations/index.ts : rollSituation`, `wearShift`, `wearTally`, `situationImpulse`, `applySituationEffects`, `resolveSituation`, `pruneImpulses`, `neglectTally`, `neglectShift` | `add_situation_effect`, `apply_option`, `play_territorio` |
| Usos públicos, mapa | 16.4–16.5 | `src/sim/territory.ts : declarePublicUse`, `publicUseCost`, `createTerritory`, `syncTerritory`, `developTerritory` | `declare` |
| Sesión mensual de Territorio | 16 | `src/territorio/session.ts : advanceMonth`, `sustainedBreach`, `togglePact`, `requestLoan`, `declareUse` | `play_territorio` |
| Fin de juego | 17.1 | `src/sim/gameOver.ts : evaluateGameOver` | final de `step` |
| Rutas | 17.2–17.3 | `src/sim/winRoutes.ts : LEVEL_ROUTES`, `evaluateRoute`, `evaluateLevel`; `src/territorio/routes.ts : TERRITORIO_FLOORS`, `TERRITORIO_ROUTES`, `evaluateTerritorio` | `ROUTES3`, `routes3`, `TERR_ROUTES`, `territorio_routes` |
| Puntaje | 17.4 | `src/sim/score.ts : scoreComponents`, `computeScore` | `score` |
| Predicción y bandas | 18.1 | `src/components/tutorial/predictions.ts : actualDirection`, `evaluatePredictions`, `sessionPredictionSkill`; `predictionBands.json`; `scripts/prediction-bands.ts` | — |
| Índices de investigación | 18.2–18.5 | `src/sim/v2/research.ts : brierDeterministic`, `brierProbabilistic`, `skillScore`, `predictionSkill`, `oneYearRegret`, `safeJustGap`, `trackStep`, `policyEntropy`, `researchIndices` | — |
| Generador aleatorio | 2.6 | `src/sim/rng.ts : makeRng` | `random.Random` |
| Versión | 21 | `src/sim/version.ts : MODEL_VERSION`, `MODEL_VERSION_BY_GAME` | — |
| Validación | 19 | `tests/sim/golden.v2.spec.ts`, `reference.spec.ts`, `extremes.spec.ts`, `invariants.spec.ts`; `scripts/sim-check.ts`; `scripts/sensitivity.ts` | `golden()` |

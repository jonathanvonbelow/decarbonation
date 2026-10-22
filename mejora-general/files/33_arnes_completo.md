# 33 — Arnés completo de balance y `npm run sim:check`

| | |
|---|---|
| **Objetivo** | Un arnés único, multisemilla, para los dos juegos, que mida los criterios de aceptación del índice (§6) y falle el build de la rama si se rompen. Correrlo sobre el modelo 1.0 para dejar la línea base documentada. |
| **Rama** | `v6-modelo-1-1` |
| **Depende de** | 32 |
| **Cierra** | Pendiente de `16_auditoria_ecuaciones.md` §5 (200 semillas, 8 estrategias) y de `reports/routes-calibration.md` |
| **Riesgo** | Bajo (no toca el motor) |

## 1. Por qué

Hoy hay dos arneses parciales: `scripts/simulate.ts` (1 semilla, 7 estrategias, sin rutas por semilla) y
`scripts/simulate-territorio.ts` (3 semillas). La auditoría mostró que en Territorio la misma estrategia gana o pierde
según la semilla: con 3 semillas eso no se ve. Ninguna recalibración del paquete es defendible sin medir tasas de
victoria con intervalo.

## 2. Archivos afectados

| Archivo | Cambio |
|---|---|
| `scripts/harness/strategies.ts` (nuevo) | Estrategias canónicas de ambos juegos (mismas que el prototipo) |
| `scripts/harness/runNiveles.ts` (nuevo) | Corre N semillas × estrategias × niveles con `stepYear` |
| `scripts/harness/runTerritorio.ts` (nuevo) | Corre N semillas × estrategias con `advanceMonth` |
| `scripts/harness/randomPlayers.ts` (nuevo) | Jugadores sintéticos que cambian políticas cada 3–6 años (para bandas de predicción) |
| `scripts/harness/metrics.ts` (nuevo) | Tasas con intervalo de Wilson, cuantiles, recorridos, criterios |
| `scripts/sim-check.ts` (nuevo) | Orquesta, evalúa criterios, escribe reportes, código de salida |
| `package.json` | scripts `sim:check`, `sim:check:quick` |
| `reports/balance-1.0.md`, `reports/balance-1.0.json` | línea base generada |
| `scripts/simulate.ts`, `scripts/simulate-territorio.ts` | quedan como están (atajos rápidos); el README apunta al arnés nuevo |

## 3. Estrategias canónicas

Los nombres y definiciones **deben coincidir** con `scripts/reference/modelo_v2.py` (`STRATEGIES`, `TERR_STRATEGIES`).

### 3.1 Juego de 3 niveles (se juegan los tres niveles por separado, 30 años cada uno)

| id | Políticas activas desde el año 0 | Esfuerzo | Pactos (N2+) | Presión fiscal (N3) |
|---|---|---|---|---|
| `do_nothing` | — | — | — | 0 |
| `green` | CR, AS, AGUA, CN | parejo | — | 2 pp |
| `extractive` | PAI, PEA, PIE, FRA, SE | parejo | — | 2 pp |
| `production` | PEA, PIE, GS, AS | parejo | — | 2 pp |
| `innovation` | CN, PIE, AS | CN = 20/40/40/0 (impuesto/renovables/eficiencia/captura) | accord, tech | 2 pp |
| `conservation` | CR, AS, GS | parejo | treaty | 2 pp |
| `balanced` | CR, AS, PEA, CN, PIE | parejo | — | 2 pp |
| `tech_tax` | CN | 100/0/0/0 | — | 2 pp |

“Parejo” = 25/25/25/25. En el Nivel 1 (sin panel de instrumentos) el esfuerzo es siempre parejo (fase 34 §3.2).

### 3.2 Territorio (360 meses)

| id | Políticas | Usos públicos | Bandeja | Otros |
|---|---|---|---|---|
| `do_nothing` | — | — | no resuelve | — |
| `conservation` | CR, AS, AGUA | 6 × área protegida, luego humedal y restauración alternados (3 c/u), uno cada 12 meses | primera opción pagable | tratado; +2 pp de impuesto desde 2035 |
| `production` | PAI, PEA, PIE, GS | — | primera pagable | — |
| `innovation` | CN (20/40/40/0 desde 2029), GS, AS | 4 × parque energético, uno cada 18 meses | primera pagable | transferencia tecnológica; +2 pp desde 2035 |
| `settle_only` | — | — | primera pagable | — |
| `cheap_production` | PEA | — | primera pagable | — |
| `extractive` | PAI, PEA, PIE, FRA, SE | — | primera pagable | — |
| `buy_everything` | CR, CN, AS | un lote por mes, ciclando los cuatro usos (24) | primera pagable | — |

`settle_only`, `cheap_production`, `extractive` y `buy_everything` son **atajos**: el criterio es que no ganen.

## 4. Métricas

```ts
// scripts/harness/metrics.ts
/** Wilson score interval for a binomial proportion (95 %). */
export function wilson(successes: number, n: number, z = 1.96): [number, number] {
  if (n === 0) return [0, 1];
  const p = successes / n;
  const d = 1 + (z * z) / n;
  const c = p + (z * z) / (2 * n);
  const r = z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n));
  return [(c - r) / d, (c + r) / d];
}

export function quantile(values: number[], q: number): number {
  const v = [...values].sort((a, b) => a - b);
  return v[Math.min(v.length - 1, Math.floor(q * v.length))];
}
```

Por estrategia y nivel: tasa de victoria (con intervalo), ruta lograda, todas las rutas cumplidas, cuantiles 10/50/90
de B, F, E, W, St, c, D/Y y puntaje al final, año de fin y motivo de derrota.

Recorrido entre extremos: para cada indicador, `max(mediana) − min(mediana)` entre estrategias del mismo nivel.

Bandas de predicción: 150 jugadores sintéticos por nivel (`randomPlayers.ts`: cada 3–6 años alternan 1 o 2 políticas,
máximo 5 activas, semillas `10000 + i`); se registran las variaciones anuales de B, E y c. Con la banda vigente del
juego (`predictions.ts`) se reporta la proporción “sin cambio”. Desde la fase 48 la banda sale de este mismo cálculo.

Consistencia anual–mensual (solo modelo 2.0, desde la fase 35): N2, estrategias `do_nothing`, `green`, `extractive`,
sin eventos, años 10 y 30; diferencia entre `stepYear` y 12 × `stepMonth`.

## 5. `scripts/sim-check.ts`

```ts
/**
 * Balance check for the simulation model (00_INDICE_v6.md §6).
 *   npm run sim:check            -> 40 seeds (3-level) / 20 seeds (Territorio)
 *   npm run sim:check -- --quick -> 10 / 5 seeds, for every phase commit
 *   npm run sim:check -- --report-only -> never fails (used for the 1.x baseline)
 * Writes reports/balance-<MODEL_VERSION>.{md,json} and compares with reports/balance-latest.json.
 * Exit code 1 if any criterion fails (unless --report-only).
 */
```

Criterios, cada uno con su resultado `PASS`/`FAIL` y el número medido (los umbrales son los del índice §6):

| Clave | Regla |
|---|---|
| `C1_do_nothing_never_wins` | tasa = 0 en cada nivel y en Territorio |
| `C2_targeted_wins` | `conservation`→conservación, `production`→producción, `innovation`→innovación: ≥ 70 % |
| `C3_no_strategy_wins_all` | ninguna estrategia cumple todas las rutas en > 50 % de las semillas |
| `C4_shortcuts_closed` | atajos ≤ 5 % |
| `C5_strategy_decides` | ninguna estrategia con tasa en (30 %, 70 %) |
| `C6_indicator_range` | recorrido ≥ 15 en B, F, E, W (año 30) |
| `C7_prediction_band` | “sin cambio” entre 30 y 36 % en B, E, c |
| `C8_no_spurious_collapse` | ninguna derrota por quiebra salvo `buy_everything` |
| `C9_annual_monthly` | consistencia anual–mensual (solo 2.x) |

El reporte en Markdown lleva una tabla por nivel y un resumen con los criterios. La comparación con
`balance-latest.json` imprime qué criterio mejoró o empeoró y por cuánto; en modo `--quick`, si un criterio que
pasaba deja de pasar, el script sale con código 1 aunque el umbral global no aplique todavía.

`package.json`:

```json
"sim:check": "tsx scripts/sim-check.ts",
"sim:check:quick": "tsx scripts/sim-check.ts --quick"
```

## 6. Línea base 1.0

Correr `npm run sim:check -- --report-only` sobre `main` sin cambios y guardar `reports/balance-1.0.md`. Resultados
esperados (de la auditoría): C1 pasa; C2 y C5 fallan en Territorio (la semilla decide); C6 falla (E, F casi
inmóviles); C7 falla (“sin cambio” ≈ 95–100 % en B y E); C8 pasa porque la quiebra es inalcanzable (no porque esté
bien). Copiar el reporte como `reports/balance-latest.json`.

## 7. Tests

`tests/harness/metrics.spec.ts`: `wilson(0,40)` → `[0, ~0.088]`; `wilson(40,40)` → `[~0.912, 1]`; `quantile` con
valores conocidos. El arnés completo **no** corre en `npm test` (tarda); `npm run sim:check -- --quick` sí corre en CI
si existe (🟧[agregar al workflow de Vercel/GitHub si el equipo lo usa]).

## 8. Verificación

- [ ] `npm run sim:check -- --report-only` termina en < 5 min (40 semillas) y escribe ambos reportes.
- [ ] Las estrategias del arnés coinciden en nombre y definición con el prototipo (`grep` de los ids).
- [ ] La línea base 1.0 reproduce los hallazgos de la auditoría (anotar los números en el log).
- [ ] `npx tsc --noEmit`, `npm test`, `npm run build` limpios.

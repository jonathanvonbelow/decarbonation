# 38 — Carbono en unidades físicas: energía, AFOLU y cambio de uso

| | |
|---|---|
| **Objetivo** | Reemplazar el balance con factor 40.000 por un inventario en tCO₂e con tres componentes (energía, flujo del suelo, cambio de uso), permitir balance AFOLU negativo, y agregar el índice de presupuesto de carbono acumulado. |
| **Rama** | `v6-modelo-v2` |
| **Depende de** | 37 (flujos realizados en ha) |
| **Cierra** | N-12, T-11, C-1, C-3 de `docs/audit-equations.md`; R-4 |
| **Riesgo** | Alto: cambia la escala de `co2EqEmissionsPerCapita`; las rutas se recalibran en 49 |

## 1. Escala

`CP.Poblacion_Inicial = 400.000` (índice, decisión 4). Áreas en kHa → hectáreas × 1000. Con esa escala, los valores
iniciales (prototipo) son:

| Nivel | Energía | Flujo del suelo | Cambio de uso | **c₀ (t/cáp.)** | AFOLU / total | Total (MtCO₂e) |
|---|---|---|---|---|---|---|
| 1 | 4,00 | 0,70 | 1,25 | **5,95** | 33 % | 2,38 |
| 2 | 5,00 | 1,13 | 1,01 | **7,13** | 30 % | 2,85 |
| 3 | 4,60 | 0,42 | 0,71 | **5,73** | 20 % | 2,29 |

Referencia de plausibilidad: el inventario argentino 2018 suma 366 MtCO₂e, 51 % energía y 39 % AFOLU (Cuarto IBA).

## 2. Ecuaciones

```
Energía (tCO2/año):
  y_t = (Y_t / P_t) / (Y_0 / P_0)                               ingreso per cápita relativo
  ε_t = ε0_N · y_t^0,3 · (1 + 0,15·η_SE^land) · [0,35·(1 − s_t) + 0,65·(1 − u_t)]
  E_en = ε_t · P_t
  s* = min(0,9, 0,60·η_CN^elec + min(1, a_ENR / 0,04) + Σ pactos.renewables)    participación renovable eléctrica objetivo
  u* = min(0,6, 0,35·η_CN^other + Σ pactos.efficiency)                          eficiencia no eléctrica objetivo
  s ← relax(s, s*, 0,15, dt);   u ← relax(u, u*, 0,15, dt)                       inercia de infraestructura

Flujo del suelo (tCO2e/año), f_i en tCO2e/ha/año (+ = emisión):
  f_CC   ×= 1 + 0,3·η_PAI^prod
  f_PRG  ×= 1 − 0,35·η_GS^land
  f_CA   ×= 1 − 0,4·η_AS^land
  f_BNNP ×= (1 + 1,0·η_FRA^land)·(1 − 0,6·η_CR^land)
  E_afolu = Σ_i f_i · A_i[ha]

Cambio de uso (tCO2/año), solo pérdidas de stock; las ganancias se realizan por el flujo del uso nuevo:
  E_luc = Σ_{(i→j)} F_ij[ha/año] · max(0, C_i − C_j) · 44/12

Per cápita (puede ser negativo en el componente AFOLU; el total, en la práctica, no):
  c = (E_en + E_afolu + E_luc) / P
```

`F_ij` es el flujo realizado del paso (fase 37) dividido por `dt` (tasa anual), así el mensual da el mismo valor anual.

Parámetros en `PARAMS_V2.flux`, `stock`, `energy` (fase 35). Fuentes: stocks del Bosque Atlántico
(125,3 ± 40,3 Mg C/ha de biomasa aérea en bosque maduro, 82,7 ± 38,2 en secundario; 46 y 41 Mg C/ha en pastura y
agricultura; revisión 2000–2021, Anais da ABC, 2024) más fracción subterránea y suelo; flujos por criterio experto
(documentar como tal en la hoja docente).

**Parques energéticos.** `a_full = 0,04`: con 4 % del territorio en parques, la electricidad sería 100 % renovable.
Un lote representa una cartera (generación, transmisión, almacenamiento), no un dimensionamiento físico; decirlo
en la hoja docente. Reemplaza al `Factor_Desplazamiento_Emisiones_Parque_Energetico` de 1.1, que actuaba sobre el
total y pesaba ~1 %.

**Impuesto al carbono.** El canal `tax` de CN reduce la renta de CC (fase 37), entra en la eficiencia eléctrica y no
eléctrica por sus relevancias (fase 36) y recauda `0,005·Y·η_CN^tax` (fase 44).

## 3. Presupuesto de carbono

```
B_t = Σ_{τ≤t} E_total,τ·dt  /  [E_0 · (t − 0,30·t²/60)]       (trayectoria lineal a −30 % en 2054)
```

`> 1` = el territorio va por encima de su presupuesto. Se guarda en `model.cumulativeEmissions` y se muestra en el
tablero (fase 50). El −30 % es 🟧[editable: `PARAMS_V2.energy.budgetCut2054`].

## 4. Implementación

| Archivo | Cambio |
|---|---|
| `src/sim/v2/carbon.ts` (nuevo) | `updateEnergyState`, `computeEmissions(state, eff, flowsHa, dt)` → `{energy, afolu, luc, total, perCapita}` |
| `src/sim/carbon.ts` | se borra `computeCarbonBalance` (o queda como envoltorio que llama a la 2.0) |
| `src/sim/v2/core.ts` | paso 7 |
| `src/sim/v2/anchors.ts` | `c0` y `emissions0` con una corrida en seco de la matriz (como `new_state` del prototipo) |
| `src/constants.ts` | borrar `CO2_EMISSIONS_SCALING_FACTOR`, `FACTOR_C_A_CO2EQ` (queda la constante 44/12 en `carbon.ts`), `Factor_Reduccion_Emisiones_Renovables_PCN`, `Factor_Aumento_Secuestro_CAC_PCN`, `Factor_Aumento_Emisiones_*`, `Factor_Desplazamiento_Emisiones_Parque_Energetico`; `Poblacion_Total` inicial = `CP.Poblacion_Inicial` |
| `src/constants.ts` (`INITIAL_LAND_USES`) | `emissionRate`/`sequestrationRate` se borran: los reemplazan `flux` y `stock` de `PARAMS_V2` |
| `src/types.ts` | `LandUse` sin `emissionRate`/`sequestrationRate` (actualizar los usos en UI: tooltips de usos del suelo leen `PARAMS_V2`) |
| `src/sim/deferred.ts` | los efectos diferidos sobre CO₂ (pactos de 1.1, evento “boom verde”) se reemplazan por efectos sobre `s*`/`u*` (43, 46) |

Las cifras que muestran la UI y DecarboNito (“t CO₂eq por habitante”) no cambian de nombre; sí de escala.

## 5. Tests — `tests/sim/carbon.v2.spec.ts`

- `c₀` de cada nivel reproduce la tabla de §1 (±0,02).
- Con el suelo congelado, sin políticas y con ingreso per cápita constante, la energía per cápita no cambia y el
  componente AFOLU per cápita baja exactamente en la proporción del crecimiento poblacional (en 1.1, la población
  bajaba el total un 21 %).
- CR en su quinto año de actividad (η ≈ 0,76) reduce `E_luc` al menos 70 % respecto de no tenerla.
- 4 % del territorio en parques ⇒ `s* = 1` acotado a 0,9.
- `E_luc` no cuenta flujos bilaterales netos nulos (depende del neteo de 37).
- `B_t` = 1 si las emisiones siguen exactamente la trayectoria de referencia.

## 6. Verificación

- [ ] `npm run sim:check -- --quick`: el recorrido de `c` entre estrategias extremas en N2 es ≥ 3 t (prototipo:
      extractiva 8,0 vs innovación ≈ 4,9). Los umbrales de rutas en t/cáp. quedan desalineados hasta la fase 49:
      **esperado**; anotar en el log.
- [ ] `predictions.ts` usa todavía `RANGE.co2 = 15`: queda así hasta 48.
- [ ] `npx tsc --noEmit`, `npm test`, `npm run build` limpios.
- [ ] `docs/audit-equations.md`: C-1 (44/12) OK, C-3 (flujo vs acumulado: ahora ambos) OK, N-12 cerrado.

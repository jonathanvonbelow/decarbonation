# 42 — Presiones sectoriales con respuesta en S

| | |
|---|---|
| **Objetivo** | Que las tres presiones (agrícola, ambientalista, social) relajen hacia un objetivo logístico anclado —la respuesta en S que el manual ya describe— en lugar de un impulso lineal con disipación que las deja casi siempre en 0 o en 100. Escalar la presión agrícola por el tamaño del sector productivo. |
| **Rama** | `v6-modelo-v2` |
| **Depende de** | 39 |
| **Cierra** | I-4 (curva en S prometida e inexistente), comportamiento todo-o-nada, presión agrícola saturada sin políticas |
| **Riesgo** | Medio |

## 1. Ecuaciones

```
tamaño del sector:   σ_prod = (a_CC + a_CA + a_PRG) / (a_CC + a_CA + a_PRG)_0

D_πa = σ_prod · Σ_j φa_j·η_j^social / 15
     + 0,03·(E_0 − E) + 0,02·(F_0 − F) + 4,0·(a_prod,0 − a_prod) + desgaste a + cap(impulsos πa)
D_πe = Σ_j φe_j·η_j^social / 15
     + 0,035·(B_0 − B) + 1,5·(c − c_0)/c_0 + desgaste e + cap(impulsos πe)
D_πs = Σ_j φs_j·η_j^social / 15
     + 0,04·(W_0 − W) + 0,04·τ + desgaste s + cap(impulsos πs)

π_k* = 100·σ(ℓ_πk0 + D_πk);   π_k ← relax(π_k, π_k*, k_π = 0,35, dt)
```

Coeficientes `φ` en `PARAMS_V2.pressure` (los mismos de 1.1, más CR +3,0 sobre la presión agrícola: conservar sin
compensar molesta al sector). Dividir por 15 los lleva al espacio logit: CR (−12,5) baja la presión ambientalista de
25 a ≈ 12,6 a eficiencia plena; FRA (+12,5) la sube a ≈ 43.

- Las presiones viven en el interior del rango: en el prototipo, a los 30 años en N2 la ambientalista va de 4 (verde)
  a 55 (extractiva) y la agrícola de 5 a 25, sin pegarse a los bordes salvo con carteras extremas.
- `4,0·(a_prod,0 − a_prod)` reemplaza el impulso de 0,4 por lote de 1.1: sacar tierra de producción (usos públicos,
  regeneración) tensiona al gremio en proporción al área.
- El desgaste de situaciones abiertas (fase 47) entra como desplazamiento del objetivo mientras siguen abiertas.

## 2. Implementación

| Archivo | Cambio |
|---|---|
| `src/sim/v2/pressures.ts` (nuevo) | `targetPressures(state, eff, CP, wear)` |
| `src/sim/pressures.ts` | se borra `updatePressures` |
| `src/sim/territory.ts` | se borra el impulso directo `Impulso_PP_Agricola_por_kHa_Convertida` en `declarePublicUse` |
| `src/constants.ts` | se borran `Factor_Presion_*`, `Umbral_PP_*`, `Sensibilidad_PP_*`, `PPSocial_Increase_Factor_Per_Tax_Point`, `Impulso_PP_Agricola_por_kHa_Convertida` |
| `src/sim/v2/core.ts` | paso 8, último: presiones con 2.0 |

## 3. Tests

- Ancla: sin políticas y con todo congelado, π* = π₀ para las tres.
- CR a eficiencia 1 en N2 (π_e0 = 25): π_e* ∈ [10, 14].
- Monotonía: más FRA nunca baja π_e*.
- Las presiones no tocan 0 ni 100 con ninguna estrategia del arnés salvo `extractive` (permitido hasta 90).

## 4. Verificación

- [ ] `npm run sim:check -- --quick`: piso de presiones de las rutas de N2 (≤ 85) ya no se viola por saturación.
- [ ] El tablero y el panel de presiones no asumen valores 0/100 exactos.
- [ ] `docs/audit-equations.md`: I-4 OK, I-5 (años para volver de 80 a 50) medido con el arnés y anotado.

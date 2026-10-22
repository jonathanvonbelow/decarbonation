# 41 — Seguridad alimentaria por balance de oferta y demanda

| | |
|---|---|
| **Objetivo** | Que la seguridad alimentaria dependa de cuánto produce el territorio frente a cuánto consume su población, y del acceso por ingreso; que exportar, intensificar, regar o pasar a agroecología actúen por mecanismos explícitos (rendimiento, fracción exportada, resiliencia) y no por pesos fijos. |
| **Rama** | `v6-modelo-v2` |
| **Depende de** | 39 (y 37 para las áreas) |
| **Cierra** | R-6 (parte alimentaria); parte de N-04/T-04 (F inmóvil) |
| **Riesgo** | Medio |

## 1. Ecuación

```
producción doméstica disponible:
  Q = (1 − x) · [ A_CC·1,0·(1 + 0,25·η_PAI^prod) + A_CA·0,7·(1 + 0,15·η_AS^prod) + A_PRG·0,25·(1 + 0,20·η_GS^prod) ]
          · (1 + 0,06·η_AGUA^prod) · (1 + 0,006)^t · (1 + ε_t)
  x = 0,30 + 0,20·η_PEA^prod                         fracción exportada
  ρ = max(Q / P, 0,001·ρ_0)                           disponibilidad per cápita (piso: evita ln 0 si no queda tierra agrícola)

objetivo:
  D_F = 2,5·ln(ρ / ρ_0) + 0,6·(E − E_0)/50 + cap(impulsos F)
  F* = 100·σ(ℓ_F0 + D_F);   F ← relax(F, F*, k_F = 0,35, dt)
```

- Rendimientos relativos y tendencia tecnológica (0,6 %/año) en `PARAMS_V2.food`. Con población creciendo 0,8 %/año y
  rendimientos 0,6 %/año, un territorio que no hace nada mantiene la disponibilidad solo porque la frontera agrícola
  avanza sobre el bosque (prototipo, 30 años: N1 35 → 37,5; N2 40 → 40,5). Si se frena la deforestación sin subir
  rendimientos, F baja: es el *trade-off* conservación–alimentos que la ruta de conservación tiene que gestionar.
- `ε_t` es el choque de rendimiento AR(1) de la fase 46 (0 hasta entonces). AGUA lo amortigua.
- κ₁ = 2,5: un 20 % más de disponibilidad sube F ≈ 11 puntos cerca de F = 40. κ₂ = 0,6: 20 puntos de E suben F ≈ 6.
- Exportar baja `Q` (más `x`) pero sube E (fase 39): el *trade-off* que en 1.1 era un peso fijo (−0,1) ahora es un
  mecanismo.

Valores de referencia del prototipo (N2, año 30, sin eventos): sin políticas 40,5; extractiva 51,1; cartera verde 37,4;
balanceada 32,3. En 1.1, 40,3–41,1 para todas.

## 2. Implementación

| Archivo | Cambio |
|---|---|
| `src/sim/v2/food.ts` (nuevo) | `domesticSupply(state, eff)`, `targetF(state, eff, CP)` |
| `src/sim/v2/anchors.ts` | `foodPerCapita0` = ρ₀ del estado inicial |
| `src/sim/v2/core.ts` | paso 8: F con 2.0 (después de B, antes de E: lee la E del paso anterior) |
| `src/sim/indicators.ts` | se borra `calculateFoodSecurityChange` |
| `src/constants.ts` | se borra `INDICATOR_IMPACT_WEIGHTS.FOOD_SECURITY` |

## 3. Tests

- Ancla: sin políticas, con suelo congelado, sin tendencia ni crecimiento poblacional (mock) ⇒ F* = F₀.
- +20 % de ρ con E = E₀ ⇒ F* sube de 40 a ≈ 51,3 (±0,5).
- PEA a eficiencia 1: F* baja (x de 0,30 a 0,50 ⇒ ρ × 0,714 ⇒ de 40 a ≈ 22,4 antes de la compensación por E).
- El juego no cambia la condición de hambruna (F ≤ 10 desde N2) ni la de incumplimiento sostenido de Territorio.

## 4. Verificación

- [ ] `npm run sim:check -- --quick`: recorrido de F entre estrategias extremas ≥ 15 puntos (prototipo ≈ 19 en N2).
- [ ] `npx tsc --noEmit`, `npm test`, `npm run build` limpios.

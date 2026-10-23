# 40 — Biodiversidad: relación especies-área de paisaje y conectividad

| | |
|---|---|
| **Objetivo** | Reemplazar la suma lineal de pesos por usos del suelo con una relación especies-área de paisaje (*countryside SAR*) expresada en el marco logístico de la fase 39, más un factor de calidad de manejo por políticas; en Territorio, sumar conectividad leída del mapa. |
| **Rama** | `v6-modelo-v2` |
| **Depende de** | 39 |
| **Cierra** | R-5; parte de N-04/T-04 (B casi inmóvil) |
| **Riesgo** | Medio |

## 1. Ecuación

```
H   = Σ_i h_i · a_i                               hábitat efectivo (afinidad h_i ∈ [0,1], a_i = A_i/ΣA)
γ_H = z / (1 − B_0/100)                           z = 0,35
D_B = γ_H · ln(H / H_0)                            especies-área, localmente S ∝ H^z
    + Σ_j qB_j · η_j^land                          calidad de manejo
    + 0,10·min(η_AS, η_CR) − 0,12·min(η_PAI, η_FRA)  sinergias continuas (en 1.1 eran binarias)
    + γ_K · ln(K / K_0)                            conectividad (solo Territorio, §3)
    + Σ pactos.B + cap(impulsos B)
B* = 100·σ(ℓ_B0 + D_B);   B ← relax(B, B*, k_B = 0,12, dt)
```

Por qué `γ_H = z/(1 − B₀/100)`: la SAR clásica da ΔB/B = z·Δln H; en espacio logit, Δlogit = ΔB/[B(1 − B/100)], de
donde Δlogit = z·Δln H/(1 − B/100). Así el término respeta la SAR cerca del estado inicial y queda acotado lejos de él.
Fuente de la forma y de z = 0,35: Pereira, Ziv y Miranda (2014), *Conservation Biology* 28(3).

Afinidades y `qB` en `PARAMS_V2.habitat` y `PARAMS_V2.qB` (fase 35): BNP y HUM 1,0; BNNP 0,8 (degradación por
extracción); RES 0,55; CA 0,35; FAL 0,3; PF y PRG 0,15; CC y ENR 0,05.

Valores de referencia del prototipo (N2, año 30, sin eventos): sin políticas 39,2; cartera verde 54,8; conservación
con tratado 60,3; extractiva 28,5. En 1.1 el recorrido era 36–44.

`k_B = 0,12` (≈ 8 años de constante de tiempo) representa la deuda de extinción: el hábitat responde lento. Por eso
la variación anual de B es chica (≈ 0,2–0,5 puntos) y la banda de predicción de B es la más estrecha (fase 48).

## 2. Implementación

| Archivo | Cambio |
|---|---|
| `src/sim/v2/biodiversity.ts` (nuevo) | `habitatIndex(landUses)`, `targetB(state, eff, CP, connectivity?)` |
| `src/sim/v2/core.ts` | paso 8: B con 2.0 |
| `src/sim/indicators.ts` | se borra `calculateBiodiversityChange` |
| `src/constants.ts` | se borra `INDICATOR_IMPACT_WEIGHTS.BIODIVERSITY` |

## 3. Conectividad en Territorio

`K` = fracción del área de bosque (BNNP + BNP + RES) que pertenece al parche 4-conexo más grande del mapa
(`src/sim/territory.ts` ya calcula componentes en `geography.ts`; reutilizar el BFS). `γ_K = 0,25`, `K_0` se toma al
crear el territorio. Como el motor es puro y no conoce el mapa, `advanceMonth` (`src/territorio/session.ts`) calcula
`K` con el territorio sincronizado del mes anterior y lo pasa en `opts.connectivity`. En el juego de 3 niveles el
término vale 0.

Recalcular `K` cada mes es caro en un mapa de 10.000 celdas: cachear y recalcular solo cuando cambian parcelas de
bosque (`syncTerritory` ya devuelve `changes`).

Efecto buscado: declarar áreas protegidas o restauración **contiguas** al bosque existente rinde más biodiversidad
que lotes aislados. DecarboNito lo menciona (fase 50).

El prototipo de referencia no modela `K` (no tiene mapa): las tasas de victoria de Territorio que citan las fases 47 y
49 son sin conectividad. Al activar este término, confirmar en la fase 49 que `conservation` sigue ganando y que
`do_nothing` sigue sin ganar; si `γ_K` desplaza el balance, bajarlo antes de mover umbrales.

## 4. Tests

- Ancla: sin políticas y con suelo congelado, B* = B₀.
- Convertir 5 kHa de CC en humedal en N2 sube H 3,01 % y B* +0,415 puntos (prototipo: 3,006 % y +0,4154; v6/40: decía
  "H ≈ 2,9 %").
- Sinergia continua: con η_AS = 0,5 y η_CR = 0,8 suma 0,05.
- Conectividad: un lote contiguo al parche mayor sube K; uno aislado no.

## 5. Verificación

- [ ] `npm run sim:check -- --quick`: recorrido de B entre estrategias extremas ≥ 25 puntos (prototipo ≈ 32).
- [ ] `npx tsc --noEmit`, `npm test`, `npm run build` limpios.

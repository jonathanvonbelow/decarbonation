# 44 — Finanzas públicas con escasez: gasto base, deuda automática y quiebra alcanzable

| | |
|---|---|
| **Objetivo** | Que el dinero sea escaso y el déficit tenga consecuencias: gasto público base proporcional al PBI, déficit financiado con deuda a una tasa que sube con el endeudamiento, estrés fiscal que pesa sobre economía, conflicto y estabilidad, y una quiebra que se puede alcanzar. |
| **Rama** | `v6-modelo-v2` |
| **Depende de** | 39 |
| **Cierra** | N-06/T-05, E-2, E-4 |
| **Riesgo** | Alto (el parámetro más sensible del modelo vive acá) |

## 1. Ecuaciones (por año; se integran con `dt`)

```
g      = 0,02 + 0,01·η_PIE^prod + 0,005·η_PEA^prod − 0,0002·τ − 0,01·φ_fiscal
Y'     = Y·(1 + g·dt)
T      = Y'·(0,15 + τ/100) + 0,005·Y'·η_CN^tax                      recaudación (+ impuesto al carbono)
G_0    = γ_N · Y'                                                    gasto público base (CP.Gasto_Publico_Base_Nivel_N)
K      = Σ_j costo_j (fase 36) + Σ pactos.annual·Y' + mantenimiento de usos públicos (Territorio)
SP     = T − G_0 − K                                                 saldo primario
d      = D / Y;   i(d) = i_N + 0,05·max(0, d − 0,6)                  prima de riesgo
Int    = i(d)·D;   Am = α_N·D                                        intereses y amortización (α_N como 1.1)
R'     = R + (SP − Int − Am)·dt + L
D'     = D − Am·dt + L
si R' < 0,02·Y':   D' += 0,02·Y' − R';   R' = 0,02·Y'               financiamiento automático del déficit
carga de intereses:  CI = Int / T
estrés fiscal:       φ_fiscal = sHigh(CI; 0,20, 0,04)
quiebra:             D/Y > 1,0 y CI > 0,20 durante 2 años seguidos (24 meses en Territorio)
```

`i_N` (0,025 / 0,035 / 0,045) y `α_N` (0,15 / 0,12 / 0,10) se conservan de 1.1. `γ_N` = 0,13 / 0,125 / 0,125.

Con `γ` = 0,125 y recaudación base de 15 %, el superávit primario sin políticas es 2,5 % del PBI. Una cartera verde de
cuatro políticas cuesta ≈ 3,8 % del PBI: déficit primario de ≈ 1,3 % y deuda que crece hasta D/Y ≈ 0,24 en 30 años
(prototipo, N2; con γ = 0,13 llega a ≈ 0,4). Una cartera que gasta mucho más sin recaudar quiebra antes de 2054 (Territorio, `buy_everything`: quiebra
hacia 2040). En 1.1, ni gastar el 21 % del PBI cada año producía consecuencias.

**Inversión pública** (usos públicos, entrada a pactos, opciones pagas de situaciones): se paga con reservas por
encima del piso y, si no alcanza, con deuda **mientras D/Y ≤ 0,6** después de la operación; si no, se rechaza con el
mensaje “sin espacio fiscal”. Implementar como `payPublicInvestment(state, cost)` en `src/sim/v2/finance.ts`.

**Préstamo voluntario** (N3 y Territorio desde 2035): sigue topeado en 10 % del PBI por año; ahora sirve para
prefinanciar inversión cuando el piso de reservas lo impediría.

**Sensibilidad.** +20 % en `γ` (0,125 → 0,15) elimina el superávit base: en el prototipo, la cartera verde pierde
13,6 puntos de E y 22,6 de W en N2. Este parámetro decide la dificultad fiscal de todo el juego: cualquier cambio pasa
por `npm run sim:check` completo.

## 2. Implementación

| Archivo | Cambio |
|---|---|
| `src/sim/v2/finance.ts` (nuevo) | `stepFinance(state, eff, dt, CP, upkeep)`, `payPublicInvestment`, `interestRate(d, level)` |
| `src/sim/economy.ts` | se borra `updateEconomy`, `computeTotalPactCost` |
| `src/sim/gameOver.ts` | bancarrota = `model.fiscal.breachYears >= 2` (se acumula en `stepFinance`) |
| `src/sim/territory.ts` (`declarePublicUse`) | usa `payPublicInvestment`; error nuevo `'no-fiscal-space'` |
| `src/territorio/situations/index.ts` (`resolveSituation`), `session.ts` (`togglePact`) | ídem |
| `src/App.tsx` | préstamo y pactos con las reglas nuevas; el préstamo único (`Monto_del_Prestamo_Unico`) ya fue borrado en 34 |
| `src/constants.ts` | `Pago_deuda_anual_Nivel_N` y `Tasa_de_interes_Nivel_N` siguen; se borra `PBIGrowth_Reduction_Factor_Per_Tax_Point` (pasa a `PARAMS_V2`) |
| `src/i18n/*` | mensajes de espacio fiscal, estrés fiscal, carga de intereses |

`ModelState.fiscal` (fase 35) guarda `growth`, `primaryBalance`, `interestBurden`, `stress`, `breachYears` y el
historial de saldo primario de los últimos 5 años (para la ruta productiva de Territorio, fase 49).

## 3. Tests — `tests/sim/finance.v2.spec.ts`

- Sin políticas, saldo primario = (0,15 − γ)·Y.
- Déficit sostenido ⇒ R se mantiene en el piso y D crece exactamente por el faltante.
- `interestRate(0,8, 2)` = 0,035 + 0,05·0,2 = 0,045.
- Quiebra: D/Y = 1,05 y CI = 0,25 durante 23 meses no quiebra; 24 sí.
- `payPublicInvestment` rechaza si D/Y quedaría > 0,6.
- INV-10 (deuda nunca negativa) sigue valiendo.

## 4. Verificación

- [ ] `npm run sim:check -- --quick`: C8 (sin colapsos espurios) pasa: ninguna estrategia del arnés quiebra salvo
      `buy_everything`.
- [ ] El tablero muestra deuda/PBI, saldo primario y carga de intereses (50 lo completa).
- [ ] `npx tsc --noEmit`, `npm test`, `npm run build` limpios.
- [ ] `docs/audit-equations.md`: E-2 (tesoro negativo: ahora imposible, se financia), E-4 (PBI negativo: acotado por
      el estrés fiscal) actualizados.

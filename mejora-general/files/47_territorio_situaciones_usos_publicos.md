# 47 — Territorio: situaciones como impulsos que decaen, desgaste en el objetivo y usos públicos 2.0

| | |
|---|---|
| **Objetivo** | Que el resultado de una partida de Territorio lo decida la estrategia y no la semilla: las situaciones dejan de aplicar saltos permanentes sobre B, F, E y pasan a empujar el objetivo del indicador con un efecto que decae; el desgaste de las situaciones abiertas actúa sobre el objetivo; los usos públicos se pagan con la regla fiscal 2.0 y cuentan solo lo declarado. |
| **Rama** | `v6-modelo-v2` |
| **Depende de** | 46 |
| **Cierra** | T-01 (la semilla decide), resto de T-07, T-12 en su forma definitiva |
| **Riesgo** | Alto |

## 1. Por qué

En 1.1, cada opción resuelta aplica, por ejemplo, `E × 0,95` sobre un integrador que casi no se mueve por política:
60–110 situaciones por partida suman saltos que dominan la trayectoria. Medido: la misma estrategia, cinco semillas,
bienestar final entre 21 y 79. En el prototipo 2.0, el rango p10–p90 del bienestar de una misma estrategia baja a
≈ 9–17 puntos y ninguna estrategia del arnés tiene tasa de victoria entre 30 % y 70 %.

## 2. Efectos de las opciones

Para cada efecto de una opción sobre un indicador acotado X ∈ {B, F, E, C, Pc, πa, πe, πs}:

```
Δpuntos = changeAbsolute,  o  changePercentage · X_actual
Δℓ      = toLogitDelta(Δpuntos, X_actual)          (fase 35; Δpuntos / [100·p·(1 − p)])
impulso = { indicator: X, logit: Δℓ, t: ahora, tau: 18 meses / ln 2 }     (vida media 18 meses)
D_X    += cap( Σ_impulsos Δℓ_i · e^{−(t − t_i)/tau_i} ),   cap = ±0,6
```

- Se elimina `SITUATION_EFFECT_SCALE` (0,5): el tope por indicador y el decaimiento cumplen esa función.
- Los efectos sobre dinero (`Reservas_del_Tesoro`, `Deuda`) siguen siendo inmediatos; los ingresos positivos escalan con
  √(Y/Y₀), igual que los costos (`situationCost`).
- Los efectos sobre suelo son transferencias (fase 37: negativos al barbecho, positivos desde barbecho, PRG, CC).
- La vida media es 🟧[18 meses] para todas; una situación puede declarar `halfLifeMonths` propia si su efecto es
  estructural (por ejemplo, una obra de riego: 60 meses). Agregar el campo opcional a `SituationDef` y usarlo en no más
  de 🟧[10] casos, documentados.
- Los impulsos con más de 6 vidas medias se descartan (memoria acotada del estado).

## 3. Desgaste de lo no resuelto

En lugar de sumar puntos de conflicto y presión al stock cada mes, el desgaste empuja el objetivo mientras la
situación sigue abierta:

```
factor_edad = 1 + min(1, edad / plazo)
D_C  += 0,04 · Σ_abiertas wear.conflict      · factor_edad
D_πa += 0,04 · Σ_abiertas wear.ppAgricola    · factor_edad      (ídem πe, πs)
```

`applyWear` (`src/territorio/situations/index.ts`) pasa a devolver estos desplazamientos; `advanceMonth` los entrega a
`stepMonth` en `opts.wear`, y el motor los suma en los objetivos (fases 39 y 42). Al resolver o vencer, el empuje
desaparece y el indicador vuelve con la velocidad de relajación. `wearTotal` (para la pantalla final) sigue midiendo
puntos: acumular `0,04 · w · factor` convertido a puntos con la pendiente del logístico en el valor actual.

## 4. Auditoría del valor esperado del catálogo

Script nuevo `scripts/situations-audit.ts`: para cada situación y opción, simula 24 meses desde el estado inicial de
Territorio con la opción aplicada y sin ella (misma semilla, sin otras situaciones) y reporta el cambio en un índice
de referencia (`0,25·ΔB + 0,25·ΔF + 0,25·ΔE + 0,25·ΔW`) y el costo. Marca:

- opciones **dominantes** (mejor índice y menor costo que todas las demás de la misma situación);
- situaciones cuyo **default** (la última opción, la que se aplica si nadie decide) **no** es la peor en índice;
- opciones con efecto total nulo.

Salida `reports/situations-audit.md`. Corregir el catálogo (es/en) hasta que no haya dominantes ni defaults que
convengan; dejar las excepciones justificadas en el reporte.

## 5. Usos públicos

- Costos por lote: 🟧[100 / 225 / 300 / 400] × min(2,5, max(1, √(Y/Y₀))) (antes fijos), pagados con
  `payPublicInvestment` (fase 44). Error nuevo `'no-fiscal-space'` con su texto es/en.
- “Uso público de conservación” y mantenimiento usan el área **declarada** (`declaredProtectedArea` de la fase 34 + HUM +
  RES; mantenimiento suma ENR).
- La presión agrícola por sacar tierra de producción sale del término de tamaño sectorial (fase 42); se borra el
  impulso directo por lote.
- La conectividad (fase 40) premia lotes contiguos al bosque.

## 6. Implementación

| Archivo | Cambio |
|---|---|
| `src/territorio/situations/index.ts` | `resolveSituation` produce impulsos; `applyWear` devuelve desplazamientos; se borra `SITUATION_EFFECT_SCALE` |
| `src/territorio/situations/types.ts` | `halfLifeMonths?: number` |
| `src/territorio/session.ts` | `Session.impulses` no hace falta: los impulsos viven en `game.model.impulses`; `advanceMonth` pasa `opts.wear` y `opts.connectivity` |
| `src/sim/v2/core.ts` | lee `opts.wear` y suma impulsos en los objetivos |
| `src/sim/territory.ts` | costos con √(Y/Y₀); pago con la regla fiscal |
| `scripts/situations-audit.ts` (nuevo) | §4 |
| `tests/territorio/session.spec.ts`, `situations.spec.ts` | expectativas nuevas |

## 7. Tests

- Una opción con `foodSecurity +3` a F = 40 crea un impulso Δℓ = 3/24 = 0,125; a los 18 meses vale la mitad.
- El tope ±0,6 se respeta con 20 opciones del mismo signo seguidas.
- Una situación abierta 6 meses con `wear.conflict = 1` empuja C*; al resolverla, el empuje vuelve a 0.
- Con dos semillas distintas y la misma estrategia, el bienestar final difiere menos de 25 puntos (prototipo: p10–p90
  entre 9 y 17 puntos según la estrategia).

## 8. Verificación

- [ ] `reports/situations-audit.md` sin dominantes ni defaults convenientes (o justificados).
- [ ] `npm run sim:check -- --quick`: C5 (la estrategia decide) pasa en Territorio con los umbrales de la fase 49
      provisionalmente cargados desde el prototipo (§ en 49).
- [ ] La pantalla final sigue mostrando desgaste total, resueltas y vencidas.
- [ ] `npx tsc --noEmit`, `npm test`, `npm run build`, `npm run i18n:audit` limpios.

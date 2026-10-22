# 46 — Eventos aleatorios 2.0, choques de rendimiento y paso mensual exacto

| | |
|---|---|
| **Objetivo** | Sortear cada evento en forma independiente (sin sesgo por orden de lista), agregar tendencia climática y dependencia de la cobertura forestal a la sequía, un choque de rendimiento persistente, estacionalidad mensual, y cerrar el motor mensual con discretización exacta. Activar el test *golden*. |
| **Rama** | `v6-modelo-v2` |
| **Depende de** | 35–45 |
| **Cierra** | N-10/T-09 (sorteo con sesgo), consistencia anual–mensual (criterio C9) |
| **Riesgo** | Medio |

## 1. Sorteo independiente

Para cada evento elegible (nivel mínimo cumplido) en cada paso:

```
p_k(estado)          probabilidad anual (misma función triggerChance de ALL_RANDOM_EVENTS, con los cambios de §2)
p_k,paso = 1 − (1 − p_k)^dt
dispara si rng() < p_k,paso          (un rng() por evento y paso, en el orden de la lista: determinismo)
```

Varios eventos pueden dispararse en el mismo paso. Se elimina la rama especial del Nivel 3 (probabilidad global
creciente + elección ponderada): los eventos de N3 (recesión, shock fósil) ya tienen su propio nivel mínimo.
🟧[Opcional: conservar un multiplicador de estrés en N3, `p_k × (1 + 0,15·t/30)`; si se activa, actualizar el prototipo.]

## 2. Efectos y probabilidades

| Evento | Cambio respecto de 1.1 |
|---|---|
| Sequía severa | `p = 0,03·(1 + 0,5·t/30)·(1 + 0,6·max(0, 1 − bosque/bosque_0))` + 0,04 sin política de agua + 0,02 si CC > 25 % del área **vigente**; el área retirada de CC (3 %) y CA (5 %) va al barbecho |
| Boom de tecnología verde | sin efecto directo sobre el CO₂ (el CO₂ ahora tiene inercia de infraestructura; el boom actúa por E, PBI y presión ambientalista) |
| Todos | los efectos `changePercentage`/`changeAbsolute` sobre F, E (y B si algún evento lo usa) son **saltos de nivel** sobre X: la relajación los disipa; sobre stocks (C, presiones, PBI, reservas) como hoy |

Los efectos sobre indicadores derivados que en 1.1 se difieren (`src/sim/deferred.ts`) desaparecen: en 2.0 no hay
indicadores “recalculados desde cero” salvo c y el puntaje, y ningún evento los toca. Borrar `deferred.ts` si queda vacío.

## 3. Choque de rendimiento persistente

```
ε_t = 0,5^dt · ε_{t−dt} + N(0, σ_ε²·dt),   σ_ε = 0,04·(1 − 0,5·η_AGUA^prod)
```

Entra en la producción de alimentos (fase 41). Generar la normal con Box–Muller a partir de dos `rng()` (no
`Math.random`). Con `rng = () => 0.999` el choque es determinista y casi nulo: el test golden lo usa así. **Atención:**
`0,999` en Box–Muller no da exactamente 0; para el golden, `advance` acepta `opts.noShocks = true` que fija ε = 0.

## 4. Estacionalidad mensual (solo Territorio)

Probabilidad mensual de sequía multiplicada por `w_m` (media 1):
🟧[ene 1,6 · feb 1,4 · mar 1,0 · abr 0,7 · may 0,6 · jun 0,6 · jul 0,6 · ago 0,7 · sep 0,8 · oct 1,0 · nov 1,2 · dic 1,4],
normalizados para que su media sea exactamente 1 (la frecuencia anual no cambia). Los valores representan veranos más
secos en años Niña en el noreste; son criterio experto: decirlo en la hoja docente.

## 5. Paso mensual exacto

`stepMonth` ya llama a `advance(…, dt = 1/12)` desde la fase 35. En esta fase se verifica que **todas** las variables
de relajación usan `relax(…, dt)` (exacta) y los flujos `× dt`. Se borran `toward` y `monthlyTriggerChance` de
`src/sim/monthly.ts` (los reemplazan `relax` y §1).

## 6. Golden test

Cambiar `GOLDEN_ACTIVE = true` en `tests/sim/golden.v2.spec.ts`. Si falla, comparar paso a paso contra
`scripts/reference/modelo_v2.py` (agregar `--trace` al prototipo si hace falta imprimir los objetivos de cada año). No
agrandar la tolerancia: buscar la diferencia de implementación (orden de pasos, canal de eficiencia usado, anclas).

## 7. Tests

- Frecuencia: en 10.000 años simulados con estado fijo, cada evento ocurre con su `p_k` ± 10 %.
- Frecuencia mensual: 12 pasos de `1 − (1 − p)^(1/12)` ⇒ frecuencia anual `p` (± 2 %), con y sin estacionalidad.
- `INV-11` (determinismo) con el sorteo nuevo.
- Consistencia anual–mensual (C9): N2, sin eventos, `do_nothing`/`green`/`extractive`, años 10 y 30: |Δ| ≤ 1 punto en
  indicadores y ≤ 0,1 t en c (prototipo: ≤ 0,5 y ≤ 0,05).

## 8. Verificación

- [ ] Golden activo y en verde.
- [ ] `npm run sim:check` **completo**: C1–C9 informados; los que dependen de rutas (C2–C5) pueden fallar hasta la
      fase 49 porque los umbrales siguen siendo los de 1.1. Anotar el estado en el log.
- [ ] `npx tsc --noEmit`, `npm test`, `npm run build` limpios.

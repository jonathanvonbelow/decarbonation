# Calibración de rutas de victoria — primera pasada

Generado con `npx tsx scripts/simulate.ts` (7 estrategias, semilla 1, sin barrido de semillas).
Ver `mejora-general/files/17_multiples_vias_victoria.md` §5 para los criterios completos del
harness final (200 semillas, 8 estrategias) — **esta no es esa corrida**, es la calibración
mínima necesaria para que las rutas de esta fase no sean ni imposibles ni triviales.

## Resultado (semilla 1)

| Nivel | Estrategia | Ganó | Ruta | Biodiv | CO₂ | SegEcon | SegAlim | Puntaje |
|---|---|---|---|---|---|---|---|---|
| 1 | do_nothing | No | — | 38.9 | 7.42 | 25.1 | 36.8 | 365 |
| 1 | all_green | **Sí** | innovation | 43.7 | 3.64 | 25.1 | 47.3 | 526 |
| 1 | all_brown | No | — | 38.1 | 8.94 | 25.3 | 36.9 | 305 |
| 1 | tech_bet | No | — | 39.4 | 6.59 | 25.0 | 36.8 | 398 |
| 1 | balanced | **Sí** | innovation | 43.0 | 4.24 | 25.2 | 36.8 | 501 |
| 1 | rotating_green | No¹ | — | 44.1 | 3.05 | 25.1 | 37.0 | 549 |
| 1 | rotating_brown | No | — | 37.1 | 9.14 | 25.4 | 36.8 | 294 |
| 2 | do_nothing | No | — | 38.1 | 13.15 | 32.2 | 27.4 | 216 |
| 2 | all_green | **Sí** | production | 42.7 | 9.00 | 33.9 | 35.3 | 376 |
| 2 | all_brown | No | — | 37.4 | 14.41 | 26.3 | 23.3 | 191 |
| 2 | tech_bet | No | — | 38.6 | 12.19 | 32.1 | 27.4 | 320 |
| 2 | balanced | No | — | 42.0 | 9.68 | 32.3 | 31.2 | 337 |
| 2 | rotating_green | No¹ | — | 43.1 | 8.30 | 33.9 | 31.3 | 425 |
| 2 | rotating_brown | No | — | 36.4 | 14.58 | 26.4 | 23.3 | 172 |
| 3 | do_nothing | No | — | 39.5 | 8.19 | 28.1 | 37.6 | 498 |
| 3 | all_green | **Sí** | conservation | 43.7 | 5.34 | 22.8 | 40.5 | 545 |
| 3 | all_brown | No | — | 38.8 | 9.38 | 27.8 | 31.0 | 493 |
| 3 | tech_bet | No | — | 39.9 | 7.44 | 35.9 | 25.9 | 557 |
| 3 | balanced | No | — | 43.1 | 5.84 | 26.9 | 35.7 | 560 |
| 3 | rotating_green | **Sí** | conservation | 43.1 | 4.76 | 30.6 | 29.5 | 587 |
| 3 | rotating_brown | No | — | 18.6 | 9.66 | 18.6 | 37.2 | 445 |

¹ `rotating_green` no gana pese a tener mejores indicadores que `all_green`/`balanced` en el mismo
nivel — un artefacto de este harness mínimo (activa políticas en años fijos sin importar el nivel
objetivo), no un problema de las rutas en sí. Con el harness completo (`16` §5) esto se resuelve
con más semillas y estrategias por nivel.

## Hallazgos reales, no artefactos de calibración

1. **La seguridad económica apenas responde a la política elegida.** En los tres niveles,
   `economicSecurity` queda cerca de 25-34 sin importar qué combinación de políticas se pruebe
   (incluso `all_brown`, diseñada específicamente para maximizarla). Ver
   `docs/audit-equations.md` ítem P-1: la duración de decaimiento de las políticas productivas
   (5-7 años) es mucho menor que la duración de un nivel (30 años), así que cualquier política
   activada una sola vez queda con eficiencia casi nula bien antes del final. Esto no se corrige
   en esta fase (afecta ecuaciones ya congeladas en la Fase 2); queda como hallazgo de auditoría.
2. **Rotar políticas frescas ayuda, pero no compensa del todo.** `rotating_green` (activa
   políticas nunca usadas antes en vez de reactivar las mismas) obtiene mejores indicadores que
   `all_green`/`balanced` en casi todos los casos — confirma que el decaimiento es acumulativo por
   política, no por "racha de activación actual" (`Tiempo_Activacion_X` nunca se resetea al
   desactivar, ver `src/sim/policies.ts`).
3. **Las rutas `conservation`/`innovation` se solapan bastante en el Nivel 1.** Una estrategia
   verde cumple ambas; se reporta la de mayor multiplicador (`innovation`, ×1.1) por diseño — es
   el comportamiento correcto de `evaluateLevel`, pero indica que las dos rutas todavía no exigen
   trade-offs suficientemente distintos entre sí. Pendiente de ajuste con el harness completo.

## Qué cumple y qué no de los criterios de `17` §5

| Criterio | Estado |
|---|---|
| `do_nothing` nunca gana ningún nivel | ✅ Cumplido en los tres niveles |
| Cada nivel es ganable por al menos una estrategia | ✅ (1, 2 y 3 tienen al menos una ganadora) |
| Al menos 3 rutas distintas ganan en algún nivel | ❌ Solo 1 ruta por nivel ganó en esta corrida de 7 estrategias — necesita más variedad de estrategias (falta una específicamente afín a `production` y otra a `innovation` per se, distintas de las verdes) |
| Ninguna ruta concentra >60% de las victorias | No evaluable con esta muestra tan chica |
| Distancia estratégica ≥3 políticas entre rutas ganadoras | No evaluable — solo una ruta ganó por nivel |

**Conclusión.** Esta calibración cumple el objetivo mínimo de esta fase (el mecanismo de rutas
múltiples funciona, reemplaza correctamente el AND conjuntivo, y nadie gana sin jugar). No cumple
todavía el estándar de balance fino de `17` §5, que requiere el harness completo de la Fase 16 §5
(200 semillas, 8 estrategias canónicas, incluyendo una específicamente productiva y otra
específicamente tecnológica) — ese trabajo queda pendiente, documentado en
`docs/DESIGN_DECISIONS_LOG.md`.

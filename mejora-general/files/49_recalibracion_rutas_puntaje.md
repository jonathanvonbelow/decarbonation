# 49 — Recalibración de rutas de victoria y puntaje (ambos juegos)

| | |
|---|---|
| **Objetivo** | Ajustar el puntaje y las rutas de victoria al espacio de resultados del modelo 2.0, de modo que pasen todos los criterios del índice §6. Cargar los umbrales del prototipo como punto de partida y afinarlos con `npm run sim:check`. |
| **Rama** | `v6-modelo-v2` |
| **Depende de** | 48 |
| **Cierra** | N-11/T-10 (carbono que no puntúa), N-13 (umbrales en el ruido), T-05 (atajo de la ruta productiva) |
| **Riesgo** | Alto |

## 1. Puntaje (`src/sim/score.ts`)

```
C_sc = 100 · clip( (1,25·c₀ − c) / c₀, 0, 1 )            c₀ = CO₂ inicial del nivel (anclas)
P_sc = 100 − π̄;    X = (F + E + W + St)/4;    Y_sc = min(100, 100·Y/(2·Y₀))
S = 10 × { N1: 0,40·B + 0,45·C_sc + 0,15·E
          N2: 0,15·B + 0,20·C_sc + 0,30·P_sc + 0,35·X
          N3: 0,10·B + 0,15·C_sc + 0,20·P_sc + 0,25·X + 0,30·Y_sc }
```

Cambios: `C_sc` se ancla al CO₂ inicial de cada nivel (al empezar vale 25: hay margen para mejorar y para empeorar;
antes, el N2 arrancaba con el componente en 0); `Y_sc` premia duplicar el PBI inicial (antes, techo fijo de 25.000).
Se borra `Referencia_Max_CO2_per_Capita_Puntaje`. `INV-14` (pesos suman 1) sigue.

## 2. Rutas del juego de 3 niveles (`LEVEL_ROUTES`, `src/sim/winRoutes.ts`)

Punto de partida (prototipo, 40 semillas con eventos):

| Nivel | Pisos | Conservación (×1,0) | Producción (×1,0) | Innovación (×1,1) | Equilibrio (×1,35) |
|---|---|---|---|---|---|
| 1 | B ≥ 25; E ≥ 15; D/Y ≤ 0,8 | B ≥ 50; bosque ≥ 20 %; c ≤ 5,2 | E ≥ 36; F ≥ 32; c ≤ 6,5 | c ≤ 4,6; E ≥ 30 | — |
| 2 | B ≥ 25; F ≥ 25; St ≥ 35; cada π ≤ 85 | B ≥ 52; bosque ≥ 16 %; c ≤ 6,5 | E ≥ 40; F ≥ 32; W ≥ 60 | c ≤ 5,5; renovables ≥ 30 %; E ≥ 33 | — |
| 3 | St ≥ 30; D/Y ≤ 1,0; W ≥ 35 | B ≥ 52; bosque ≥ 17 %; c ≤ 5,4; D/Y ≤ 0,6 | E ≥ 36; F ≥ 33; W ≥ 52 | c ≤ 4,5; renovables ≥ 35 %; E ≥ 30; ≥ 1 pacto | 7 de 9: B ≥ 50; F ≥ 40; E ≥ 38; W ≥ 65; St ≥ 75; c ≤ 4,5; D/Y ≤ 0,5; Y ≥ 1,7·Y₀; S ≥ 720 |

> **Nota v6/49b (2026-10-28).** El piso de F de la ruta de producción del N3 pasó de 33 a 31 junto con κ₁ 2,5 → 3,0 (criterio
> C6): con 33 la estrategia `production` del N3 bajaba de 82,5 % a 72,5 % en el arnés; con 31 vuelve a 85 %. Las tasas del
> prototipo de la tabla siguiente son anteriores a ese cambio. Ver `docs/DESIGN_DECISIONS_LOG.md` (fase 49b).

“Renovables” = `model.energy.renewableShare` (resultado, no esfuerzo: la condición de “esfuerzo tecnológico ≥ 30”
de 1.1 se cumplía con el reparto parejo). Condiciones nuevas → claves i18n `cond.renewables`, `cond.debtRatio` (ya
existe), `cond.gdpGrowth`.

Tasas de victoria del prototipo con estos umbrales:

| Estrategia | N1 | N2 | N3 |
|---|---|---|---|
| do_nothing | 0 % | 0 % | 0 % |
| green | 100 % (conservación) | 100 % (conservación) | 100 % (conservación) |
| extractive | 0 % | 0 % | 2 % |
| production | 88 % (producción) | 90 % (producción) | 75 % (producción) |
| innovation | 100 % (innovación) | 100 % (innovación) | 98 % (innovación/equilibrio) |
| conservation | 100 % (conservación) | 100 % (conservación) | 100 % (conservación) |
| balanced | 100 % (innovación) | 95 % (innovación) | 100 % (conservación) |
| tech_tax | 0 % | 0 % | 0 % |

## 3. Rutas de Territorio (`src/territorio/routes.ts`)

Pisos sin cambios (B ≥ 25, F ≥ 20, St ≥ 25, W ≥ 12) más la derrota por incumplimiento sostenido.

| Ruta | Condiciones (todas) |
|---|---|
| Integridad ecológica (×1,0) | B ≥ 52; bosque nativo ≥ 15 %; uso público de conservación **declarado** ≥ 8 %; c ≤ 6,2 |
| Transición productiva (×1,0) | F ≥ 44; E ≥ 40; W ≥ 55; saldo primario medio de los últimos 5 años ≥ 0; D/Y ≤ 0,6; ≥ 15 años con al menos dos políticas productivas (PAI, PEA, GS, AS) activas a la vez |
| Innovación (×1,1) | c ≤ 4,8; parque energético ≥ 1,6 %; W ≥ 55 |

Cambios respecto de 1.1: la ruta productiva deja de pedir “tesoro ≥ 8 % del PBI” (se cumplía sin gobernar) y pide
sostenibilidad fiscal y producción gobernada en el tiempo; innovación deja de pedir esfuerzo en instrumentos (se
cumplía con el reparto parejo) y pide resultado (CO₂) más parques.

Tasas del prototipo (20 semillas): `do_nothing` 0 %, `conservation` 100 %, `production` 90 %, `innovation` 100 %,
`settle_only` 0 %, `cheap_production` 0 %, `extractive` 0 %, `buy_everything` 0 % (quiebra hacia 2040).

## 4. Procedimiento

1. Cargar los umbrales de §2 y §3.
2. `npm run sim:check`. Si un criterio falla, mover **solo umbrales**, de a uno, y volver a correr. Reglas: no bajar un
   umbral por debajo del valor que alcanza `do_nothing` en el percentil 90; no subirlo por encima del percentil 25 de la
   estrategia dirigida.
3. Si después de mover umbrales un criterio sigue fallando, el problema es de ecuaciones o parámetros: volver a la fase
   correspondiente, actualizar el prototipo y regenerar el golden en el mismo commit.
4. Regenerar `reports/balance-2.0.md`, la tabla de rutas de la hoja docente
   (`npx tsx scripts/routes-table-html.ts`) y el catálogo de escenas de la narrativa visual si está en `main`
   (`npm run scenes:build`, se genera desde `LEVEL_ROUTES`).

## 5. Tests

- `tests/sim/winRoutes.spec.ts` y `tests/territorio/routes.spec.ts`: actualizar expectativas a los umbrales nuevos.
- Nuevo: con el estado inicial de cada nivel, ninguna ruta está cumplida (nadie gana en el año 0).
- Nuevo: la ruta productiva de Territorio no se cumple con una sola política productiva aunque el tesoro sea alto.

## 6. Verificación

- [ ] `npm run sim:check` completo: **C1–C9 en PASS**.
- [ ] Hoja docente y catálogo de escenas regenerados.
- [ ] `npx tsc --noEmit`, `npm test`, `npm run build`, `npm run i18n:audit` limpios.

# Balance del modelo 1.0 (full)

Generado por `npm run sim:check` (scripts/sim-check.ts) el 2026-10-22, en 156 s. Modelo por juego: niveles 1.0, Territorio 1.0. Semillas: 40 por estrategia y nivel (3 niveles), 20 por estrategia (Territorio); 150 jugadores sintéticos por nivel. Criterios: 00_INDICE_v6.md §6; estrategias: scripts/harness/strategies.ts.

## Criterios

| Criterio | Estado | Valor | Umbral |
|---|---|---|---|
| `C1_do_nothing_never_wins` | FAIL | 0.075 | = 0 % en cada nivel y en Territorio |
| `C2_targeted_wins` | FAIL | 0.000 | ≥ 70.0 % |
| `C3_no_strategy_wins_all` | PASS | 0.225 | ≤ 50.0 % por estrategia |
| `C4_shortcuts_closed` | FAIL | 0.350 | ≤ 5.0 % |
| `C5_strategy_decides` | FAIL | 4.000 | ninguna tasa de victoria en (30.0 %, 70.0 %); valor = casos dentro |
| `C6_indicator_range` | FAIL | 0.389 | ≥ 15 puntos en B, F, E, W |
| `C7_prediction_band` | FAIL | 0.670 | "sin cambio" entre 30.0 % y 36.0 %; valor = máx |x − 33 %| |
| `C8_no_spurious_collapse` | PASS | 0.000 | ninguna quiebra salvo buy_everything (Territorio); valor = quiebras no permitidas |
| `C9_annual_monthly` | SKIP | 1.529 | |Δ| ≤ 1 en indicadores y ≤ 0.1 t en c (N2, sin eventos, años 10 y 30); valor = máx(|Δ|/umbral); solo modelo 2.x |

<details><summary>C1_do_nothing_never_wins</summary>

- N1: 0.0 %
- N2: 0.0 %
- N3: 7.5 %
- Territorio: 0.0 %

</details>

<details><summary>C2_targeted_wins</summary>

- N1 conservation→conservation: 100.0 %
- N1 production→production: 22.5 % ✗
- N1 innovation→innovation: 100.0 %
- N2 conservation→conservation: 0.0 % ✗
- N2 production→production: 0.0 % ✗
- N2 innovation→innovation: 0.0 % ✗
- N3 conservation→conservation: 100.0 %
- N3 production→production: 12.5 % ✗
- N3 innovation→innovation: 100.0 %
- Territorio conservation→conservation: 95.0 %
- Territorio production→production: 35.0 % ✗
- Territorio innovation→innovation: 0.0 % ✗

</details>

<details><summary>C3_no_strategy_wins_all</summary>

- N1 conservation: 22.5 %

</details>

<details><summary>C4_shortcuts_closed</summary>

- N1 tech_tax: 0.0 %
- N1 extractive: 0.0 %
- N2 tech_tax: 0.0 %
- N2 extractive: 0.0 %
- N3 tech_tax: 10.0 % ✗
- N3 extractive: 0.0 %
- Territorio settle_only: 0.0 %
- Territorio cheap_production: 35.0 % ✗
- Territorio extractive: 30.0 % ✗
- Territorio buy_everything: 0.0 %

</details>

<details><summary>C5_strategy_decides</summary>

- N2 balanced: 47.5 % ✗
- Territorio production: 35.0 % ✗
- Territorio innovation: 60.0 % ✗
- Territorio cheap_production: 35.0 % ✗

</details>

<details><summary>C6_indicator_range</summary>

- N1 B: 8.0 (extractive → green) ✗
- N1 F: 10.2 (tech_tax → green) ✗
- N1 E: 0.4 (tech_tax → extractive) ✗
- N1 W: 12.8 (extractive → green) ✗
- N2 B: 64.4 (extractive → conservation)
- N2 F: 17.1 (extractive → green)
- N2 E: 24.9 (conservation → green)
- N2 W: 33.1 (do_nothing → green)
- N3 B: 63.0 (extractive → conservation)
- N3 F: 12.3 (extractive → green) ✗
- N3 E: 24.4 (conservation → balanced)
- N3 W: 28.4 (extractive → green)
- Territorio B: 63.2 (do_nothing → conservation)
- Territorio F: 28.7 (do_nothing → conservation)
- Territorio E: 54.1 (conservation → innovation)
- Territorio W: 79.1 (do_nothing → innovation)

</details>

<details><summary>C7_prediction_band</summary>

- N1 B: 100.0 % ✗
- N1 E: 100.0 % ✗
- N1 c: 61.5 % ✗
- N2 B: 100.0 % ✗
- N2 E: 86.6 % ✗
- N2 c: 23.8 % ✗
- N3 B: 100.0 % ✗
- N3 E: 86.2 % ✗
- N3 c: 48.7 % ✗

</details>

<details><summary>C9_annual_monthly</summary>

- peor W: do_nothing año 10, anual 33.42 vs mensual 34.10 (Δ 0.69)
- peor c: green año 30, anual 8.57 vs mensual 8.42 (Δ -0.15)
- modelo 1.x: informativo, el criterio aplica desde el modelo 2.0 (fase 35)

</details>

## Comparación con `reports/balance-latest.json`

No había reporte anterior.

## Nivel 1 (30 años)

Tasa de victoria con intervalo de Wilson al 95 %; rutas = % de semillas que cumplen cada ruta (con pisos); valores al final: mediana (p10–p90).

| Estrategia | Victoria | cons / prod / inno | todas | B | F | E | W | St | c | D/Y | Puntaje | Fin (p50) | Derrotas |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| do_nothing | 0 % [0 %–9 %] | 0 % / 0 % / 0 % | 0 % | 38.9 (38.9–38.9) | 31.6 (24.6–36.8) | 25.1 (25.1–25.1) | 19.2 (16.1–22.2) | 89.9 (88.7–91.9) | 7.37 (7.22–7.67) | 0.00 (0.00–0.00) | 367 | 2054.0 | — |
| green | 0 % [0 %–9 %] | 0 % / 0 % / 0 % | 0 % | 44.2 (44.2–44.2) | 41.8 (31.7–47.9) | 25.0 (25.0–25.0) | 31.9 (28.8–68.1) | 88.3 (87.5–92.5) | 3.10 (3.05–3.15) | 0.00 (0.00–0.00) | 548 | 2054.0 | — |
| extractive | 0 % [0 %–9 %] | 0 % / 0 % / 0 % | 0 % | 36.2 (36.2–36.2) | 31.6 (24.6–36.9) | 25.4 (25.4–25.4) | 19.1 (16.0–22.1) | 91.8 (90.9–93.1) | 9.10 (8.93–9.48) | 0.00 (0.00–0.00) | 292 | 2054.0 | — |
| production | 100 % [91 %–100 %] | 0 % / 23 % / 100 % | 0 % | 39.9 (39.9–39.9) | 32.8 (25.0–47.6) | 25.3 (25.3–25.3) | 20.2 (16.2–47.4) | 92.1 (91.0–96.6) | 5.35 (5.28–5.50) | 0.00 (0.00–0.00) | 447 | 2054.0 | — |
| innovation | 100 % [91 %–100 %] | 0 % / 23 % / 100 % | 0 % | 40.2 (40.2–40.2) | 32.7 (24.9–47.5) | 25.1 (25.1–25.1) | 28.5 (24.6–55.7) | 91.1 (90.4–96.0) | 4.86 (4.79–5.01) | 0.00 (0.00–0.00) | 466 | 2054.0 | — |
| conservation | 100 % [91 %–100 %] | 100 % / 23 % / 100 % | 23 % | 43.8 (43.8–43.8) | 32.8 (25.0–47.6) | 25.1 (25.1–25.1) | 21.0 (17.1–48.2) | 91.6 (90.5–95.7) | 3.51 (3.44–3.64) | 0.00 (0.00–0.00) | 531 | 2054.0 | — |
| balanced | 0 % [0 %–9 %] | 0 % / 0 % / 0 % | 0 % | 43.9 (43.9–43.9) | 32.7 (24.9–47.4) | 25.2 (25.2–25.2) | 29.4 (25.4–56.5) | 88.8 (87.9–92.7) | 3.03 (2.96–3.15) | 0.00 (0.00–0.00) | 550 | 2054.0 | — |
| tech_tax | 0 % [0 %–9 %] | 0 % / 0 % / 0 % | 0 % | 39.4 (39.4–39.4) | 31.6 (24.6–36.8) | 25.0 (25.0–25.0) | 27.6 (24.4–30.6) | 90.1 (89.5–91.5) | 6.85 (6.71–7.15) | 0.00 (0.00–0.00) | 388 | 2054.0 | — |

Recorrido entre estrategias (máx − mín de las medianas): B 8.0, F 10.2, E 0.4, W 12.8.

## Nivel 2 (30 años)

Tasa de victoria con intervalo de Wilson al 95 %; rutas = % de semillas que cumplen cada ruta (con pisos); valores al final: mediana (p10–p90).

| Estrategia | Victoria | cons / prod / inno | todas | B | F | E | W | St | c | D/Y | Puntaje | Fin (p50) | Derrotas |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| do_nothing | 0 % [0 %–9 %] | 0 % / 0 % / 0 % | 0 % | 38.1 (38.1–38.2) | 32.2 (21.0–41.4) | 28.3 (24.2–36.4) | 15.6 (10.5–24.1) | 60.9 (59.2–65.6) | 13.14 (12.62–13.64) | 0.00 (0.00–0.00) | 216 | 2054.0 | — |
| green | 83 % [68 %–91 %] | 83 % / 38 % / 0 % | 0 % | 43.2 (43.1–43.2) | 43.4 (33.3–63.1) | 31.0 (26.7–39.9) | 48.7 (26.1–73.1) | 62.1 (58.3–64.0) | 8.43 (8.29–8.57) | 0.00 (0.00–0.00) | 528 | 2054.0 | — |
| extractive | 0 % [0 %–9 %] | 0 % / 0 % / 0 % | 0 % | 35.6 (35.6–35.6) | 26.2 (19.3–37.0) | 24.2 (19.9–32.9) | 15.8 (10.4–22.9) | 56.3 (55.7–60.9) | 14.58 (14.00–15.13) | 0.00 (0.00–0.00) | 175 | 2054.0 | — |
| production | 0 % [0 %–9 %] | 0 % / 0 % / 0 % | 0 % | 39.2 (39.2–39.2) | 33.5 (23.0–48.4) | 26.7 (21.7–35.6) | 18.2 (12.9–58.6) | 61.6 (60.0–68.2) | 10.39 (10.11–10.55) | 0.00 (0.00–0.00) | 290 | 2054.0 | — |
| innovation | 18 % [9 %–32 %] | 0 % / 18 % / 0 % | 0 % | 39.5 (39.5–39.5) | 38.4 (23.8–50.5) | 26.4 (20.3–36.1) | 26.4 (22.3–68.9) | 64.8 (63.2–71.2) | 8.50 (8.27–8.63) | 0.00 (0.00–0.00) | 411 | 2054.0 | — |
| conservation | 0 % [0 %–9 %] | 0 % / 0 % / 0 % | 0 % | 100.0 (100.0–100.0) | 41.6 (26.1–54.6) | 6.1 (2.2–9.9) | 21.3 (15.2–61.4) | 60.7 (59.4–66.1) | 8.36 (8.09–8.51) | 0.00 (0.00–0.00) | 433 | 2054.0 | — |
| balanced | 48 % [33 %–63 %] | 48 % / 28 % / 0 % | 0 % | 42.9 (42.9–42.9) | 34.2 (22.9–48.3) | 29.3 (21.8–42.0) | 27.0 (22.9–69.3) | 58.8 (57.3–64.3) | 8.29 (8.02–8.43) | 0.00 (0.00–0.00) | 433 | 2054.0 | — |
| tech_tax | 0 % [0 %–9 %] | 0 % / 0 % / 0 % | 0 % | 38.6 (38.5–38.6) | 32.2 (21.0–41.4) | 29.7 (25.4–39.3) | 24.3 (18.9–43.7) | 61.4 (59.3–65.3) | 13.14 (12.62–13.64) | 0.00 (0.00–0.00) | 326 | 2054.0 | — |

Recorrido entre estrategias (máx − mín de las medianas): B 64.4, F 17.1, E 24.9, W 33.1.

## Nivel 3 (30 años)

Tasa de victoria con intervalo de Wilson al 95 %; rutas = % de semillas que cumplen cada ruta (con pisos); valores al final: mediana (p10–p90).

| Estrategia | Victoria | cons / prod / inno / eq | todas | B | F | E | W | St | c | D/Y | Puntaje | Fin (p50) | Derrotas |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| do_nothing | 8 % [3 %–20 %] | 0 % / 8 % / 0 % / 0 % | 0 % | 39.4 (39.4–39.5) | 35.9 (28.0–47.5) | 21.3 (14.3–30.1) | 10.6 (4.1–37.7) | 60.4 (59.0–64.8) | 8.57 (8.30–8.72) | 0.01 (0.01–0.01) | 457 | 2054.0 | — |
| green | 100 % [91 %–100 %] | 100 % / 18 % / 0 % / 8 % | 0 % | 44.2 (44.2–44.2) | 47.0 (35.1–54.2) | 24.2 (17.1–34.1) | 36.9 (19.9–63.9) | 59.6 (56.9–63.9) | 4.87 (4.80–4.87) | 0.01 (0.01–0.01) | 620 | 2054.0 | — |
| extractive | 0 % [0 %–9 %] | 0 % / 0 % / 0 % / 0 % | 0 % | 37.0 (37.0–37.0) | 34.7 (26.8–41.9) | 17.6 (13.5–28.0) | 8.5 (1.9–16.4) | 58.6 (57.5–59.6) | 9.69 (9.52–9.85) | 0.01 (0.01–0.01) | 439 | 2054.0 | — |
| production | 13 % [5 %–26 %] | 0 % / 13 % / 0 % / 0 % | 0 % | 40.4 (40.4–40.4) | 38.2 (29.5–50.5) | 23.3 (17.1–31.5) | 15.6 (8.3–45.2) | 60.2 (58.9–65.5) | 6.50 (6.42–6.56) | 0.01 (0.01–0.01) | 545 | 2054.0 | — |
| innovation | 100 % [91 %–100 %] | 0 % / 8 % / 100 % / 8 % | 0 % | 40.7 (40.7–40.7) | 38.1 (30.5–54.1) | 20.3 (13.2–28.2) | 22.9 (17.4–61.9) | 64.5 (63.0–69.4) | 5.22 (5.16–5.27) | 0.01 (0.01–0.01) | 582 | 2054.0 | — |
| conservation | 100 % [91 %–100 %] | 100 % / 0 % / 100 % / 5 % | 0 % | 100.0 (100.0–100.0) | 41.8 (33.1–50.3) | 1.1 (0.0–6.4) | 16.3 (7.6–50.3) | 59.7 (58.6–63.3) | 4.95 (4.84–5.01) | 0.01 (0.01–0.01) | 585 | 2054.0 | — |
| balanced | 100 % [91 %–100 %] | 100 % / 18 % / 0 % / 10 % | 0 % | 43.9 (43.9–43.9) | 37.6 (30.6–54.1) | 25.5 (17.4–34.8) | 24.4 (18.4–61.7) | 59.3 (57.3–62.5) | 4.81 (4.75–4.87) | 0.01 (0.01–0.01) | 614 | 2054.0 | — |
| tech_tax | 10 % [4 %–23 %] | 0 % / 10 % / 0 % / 0 % | 0 % | 39.9 (39.9–39.9) | 36.5 (29.3–46.8) | 23.9 (15.9–34.3) | 20.5 (13.8–48.6) | 61.2 (59.4–63.8) | 8.57 (8.32–8.72) | 0.01 (0.01–0.01) | 509 | 2054.0 | — |

Recorrido entre estrategias (máx − mín de las medianas): B 63.0, F 12.3, E 24.4, W 28.4.

## Territorio (360 meses)

Tasa de victoria con intervalo de Wilson al 95 %; rutas = % de semillas que cumplen cada ruta (con pisos); valores al final: mediana (p10–p90).

| Estrategia | Victoria | cons / prod / inno | todas | B | F | E | W | St | c | D/Y | Puntaje | Fin (p50) | Derrotas |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| do_nothing | 0 % [0 %–16 %] | 0 % / 0 % / 0 % | 0 % | 36.8 (34.5–39.4) | 32.6 (22.1–36.6) | 27.1 (24.7–31.5) | 3.7 (0.2–9.0) | 62.1 (57.2–67.3) | 16.89 (15.73–17.85) | 0.00 (0.00–0.00) | 216 | 2033.7 | sustained 20 |
| conservation | 95 % [76 %–99 %] | 95 % / 0 % / 0 % | 0 % | 100.0 (100.0–100.0) | 61.3 (46.7–73.5) | 11.4 (6.2–22.4) | 67.9 (43.6–78.6) | 69.9 (64.9–75.2) | 3.20 (0.53–3.88) | 0.00 (0.00–0.03) | 705 | 2054.0 | — |
| production | 35 % [18 %–57 %] | 0 % / 35 % / 0 % | 0 % | 46.1 (42.7–49.5) | 47.8 (36.8–61.9) | 37.5 (28.6–50.5) | 45.7 (28.9–69.5) | 71.2 (66.4–78.7) | 9.47 (6.54–11.23) | 0.00 (0.00–0.03) | 490 | 2054.0 | — |
| innovation | 60 % [39 %–78 %] | 0 % / 60 % / 0 % | 0 % | 48.2 (43.4–50.8) | 48.9 (35.8–59.8) | 65.4 (54.0–82.1) | 82.8 (55.1–94.5) | 72.3 (68.2–77.9) | 5.13 (3.89–6.28) | 0.00 (0.00–0.01) | 691 | 2054.0 | — |
| settle_only | 0 % [0 %–16 %] | 0 % / 0 % / 0 % | 0 % | 46.3 (44.3–50.9) | 49.0 (41.1–60.4) | 37.0 (31.9–49.2) | 59.6 (33.1–72.4) | 71.0 (66.8–77.7) | 8.61 (7.15–10.37) | 0.01 (0.00–0.03) | 538 | 2054.0 | — |
| cheap_production | 35 % [18 %–57 %] | 0 % / 35 % / 0 % | 0 % | 46.8 (43.4–52.1) | 47.2 (38.0–59.7) | 36.5 (27.5–41.9) | 54.4 (32.6–72.4) | 71.0 (66.5–78.0) | 8.21 (6.37–10.37) | 0.01 (0.00–0.03) | 527 | 2054.0 | — |
| extractive | 30 % [15 %–52 %] | 0 % / 30 % / 0 % | 0 % | 44.9 (41.0–48.9) | 48.3 (38.0–65.1) | 34.5 (25.4–45.1) | 52.4 (32.6–73.1) | 69.7 (67.5–77.2) | 9.98 (7.02–11.44) | 0.00 (0.00–0.02) | 472 | 2054.0 | — |
| buy_everything | 0 % [0 %–16 %] | 0 % / 0 % / 0 % | 0 % | 43.3 (42.2–44.3) | 33.9 (24.5–45.8) | 32.0 (26.7–40.6) | 9.3 (6.3–32.6) | 60.3 (56.4–64.2) | 7.35 (7.04–7.88) | 0.00 (0.00–0.00) | 382 | 2051.5 | sustained 11 |

Recorrido entre estrategias (máx − mín de las medianas): B 63.2, F 28.7, E 54.1, W 79.1.

## Banda de predicción (jugadores sintéticos)

Proporción de años en que `actualDirection` (src/components/tutorial/predictions.ts) da "sin cambio". Objetivo: 30–36 %.

| Nivel | años | B | E | c |
|---|---|---|---|---|
| N1 | 4500 | 100 % | 100 % | 61 % |
| N2 | 4500 | 100 % | 87 % | 24 % |
| N3 | 4500 | 100 % | 86 % | 49 % |

## Consistencia anual–mensual (N2, sin eventos)

Informativo en el modelo 1.x: `stepMonth` todavía no es la discretización del modelo 2.0.

| Estrategia | Año | Indicador | Anual | Mensual | Δ |
|---|---|---|---|---|---|
| do_nothing | 10 | B | 39.33 | 39.33 | -0.00 |
| do_nothing | 10 | F | 40.33 | 40.33 | -0.00 |
| do_nothing | 10 | E | 30.02 | 30.02 | -0.00 |
| do_nothing | 10 | W | 33.42 | 34.10 | 0.69 |
| do_nothing | 10 | St | 68.50 | 68.60 | 0.10 |
| do_nothing | 10 | c | 16.33 | 16.31 | -0.01 |
| do_nothing | 30 | B | 38.07 | 38.07 | -0.00 |
| do_nothing | 30 | F | 40.99 | 40.99 | -0.00 |
| do_nothing | 30 | E | 30.06 | 30.06 | -0.00 |
| do_nothing | 30 | W | 19.03 | 19.36 | 0.33 |
| do_nothing | 30 | St | 62.78 | 63.09 | 0.31 |
| do_nothing | 30 | c | 13.90 | 13.87 | -0.03 |
| green | 10 | B | 41.46 | 41.50 | 0.04 |
| green | 10 | F | 40.38 | 40.39 | 0.00 |
| green | 10 | E | 30.00 | 30.00 | 0.00 |
| green | 10 | W | 47.00 | 47.33 | 0.34 |
| green | 10 | St | 68.20 | 68.29 | 0.09 |
| green | 10 | c | 11.79 | 11.66 | -0.13 |
| green | 30 | B | 43.14 | 43.23 | 0.09 |
| green | 30 | F | 41.05 | 41.06 | 0.00 |
| green | 30 | E | 29.98 | 29.98 | 0.00 |
| green | 30 | W | 28.67 | 29.10 | 0.43 |
| green | 30 | St | 60.51 | 60.71 | 0.20 |
| green | 30 | c | 8.57 | 8.42 | -0.15 |
| extractive | 10 | B | 38.08 | 38.00 | -0.08 |
| extractive | 10 | F | 40.37 | 40.38 | 0.00 |
| extractive | 10 | E | 30.26 | 30.28 | 0.02 |
| extractive | 10 | W | 33.03 | 33.68 | 0.66 |
| extractive | 10 | St | 66.68 | 66.69 | 0.01 |
| extractive | 10 | c | 18.88 | 19.01 | 0.13 |
| extractive | 30 | B | 35.56 | 35.45 | -0.11 |
| extractive | 30 | F | 41.05 | 41.06 | 0.01 |
| extractive | 30 | E | 30.36 | 30.38 | 0.02 |
| extractive | 30 | W | 18.94 | 19.25 | 0.31 |
| extractive | 30 | St | 57.74 | 57.78 | 0.04 |
| extractive | 30 | c | 15.42 | 15.51 | 0.08 |

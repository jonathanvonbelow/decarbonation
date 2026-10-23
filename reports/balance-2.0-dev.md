# Balance del modelo 2.0-dev (full)

Generado por `npm run sim:check` (scripts/sim-check.ts) el 2026-10-23, en 350 s. Modelo por juego: niveles 2.0-dev, Territorio 2.0-dev. Semillas: 40 por estrategia y nivel (3 niveles), 20 por estrategia (Territorio); 150 jugadores sintéticos por nivel. Criterios: 00_INDICE_v6.md §6; estrategias: scripts/harness/strategies.ts.

## Criterios

| Criterio | Estado | Valor | Umbral |
|---|---|---|---|
| `C1_do_nothing_never_wins` | PASS | 0.000 | = 0 % en cada nivel y en Territorio |
| `C2_targeted_wins` | FAIL | 0.300 | ≥ 70.0 % |
| `C3_no_strategy_wins_all` | PASS | 0.000 | ≤ 50.0 % por estrategia |
| `C4_shortcuts_closed` | FAIL | 1.000 | ≤ 5.0 % |
| `C5_strategy_decides` | PASS | 0.000 | ninguna tasa de victoria en (30.0 %, 70.0 %); valor = casos dentro |
| `C6_indicator_range` | FAIL | 3.327 | ≥ 15 puntos en B, F, E, W |
| `C7_prediction_band` | FAIL | 0.599 | "sin cambio" entre 30.0 % y 36.0 %; valor = máx |x − 33 %| |
| `C8_no_spurious_collapse` | PASS | 0.000 | ninguna quiebra salvo buy_everything (Territorio); valor = quiebras no permitidas |
| `C9_annual_monthly` | FAIL | 2.473 | |Δ| ≤ 1 en indicadores y ≤ 0.1 t en c (N2, sin eventos, años 10 y 30); valor = máx(|Δ|/umbral); solo modelo 2.x |

<details><summary>C1_do_nothing_never_wins</summary>

- N1: 0.0 %
- N2: 0.0 %
- N3: 0.0 %
- Territorio: 0.0 %

</details>

<details><summary>C2_targeted_wins</summary>

- N1 conservation→conservation: 100.0 %
- N1 production→production: 100.0 %
- N1 innovation→innovation: 100.0 %
- N2 conservation→conservation: 100.0 %
- N2 production→production: 100.0 %
- N2 innovation→innovation: 100.0 %
- N3 conservation→conservation: 100.0 %
- N3 production→production: 100.0 %
- N3 innovation→innovation: 100.0 %
- Territorio conservation→conservation: 100.0 %
- Territorio production→production: 30.0 % ✗
- Territorio innovation→innovation: 100.0 %

</details>

<details><summary>C4_shortcuts_closed</summary>

- N1 tech_tax: 100.0 % ✗
- N1 extractive: 0.0 %
- N2 tech_tax: 0.0 %
- N2 extractive: 2.5 %
- N3 tech_tax: 0.0 %
- N3 extractive: 2.5 %
- Territorio settle_only: 0.0 %
- Territorio cheap_production: 0.0 %
- Territorio extractive: 20.0 % ✗
- Territorio buy_everything: 0.0 %

</details>

<details><summary>C6_indicator_range</summary>

- N1 B: 27.4 (extractive → green)
- N1 F: 20.5 (balanced → extractive)
- N1 E: 22.9 (tech_tax → extractive)
- N1 W: 3.3 (extractive → green) ✗
- N2 B: 31.7 (extractive → conservation)
- N2 F: 16.8 (balanced → extractive)
- N2 E: 23.5 (tech_tax → extractive)
- N2 W: 21.6 (extractive → green)
- N3 B: 30.8 (extractive → conservation)
- N3 F: 13.8 (balanced → extractive) ✗
- N3 E: 21.8 (tech_tax → extractive)
- N3 W: 23.3 (extractive → green)
- Territorio B: 30.7 (extractive → conservation)
- Territorio F: 13.5 (conservation → production) ✗
- Territorio E: 21.8 (buy_everything → extractive)
- Territorio W: 28.8 (do_nothing → innovation)

</details>

<details><summary>C7_prediction_band</summary>

- N1 B: 92.8 % ✗
- N1 E: 68.6 % ✗
- N1 c: 63.2 % ✗
- N2 B: 92.8 % ✗
- N2 E: 59.8 % ✗
- N2 c: 56.8 % ✗
- N3 B: 92.9 % ✗
- N3 E: 58.0 % ✗
- N3 c: 66.4 % ✗

</details>

<details><summary>C9_annual_monthly</summary>

- peor St: extractive año 10, anual 45.15 vs mensual 42.68 (Δ -2.47)
- peor c: extractive año 10, anual 9.05 vs mensual 9.00 (Δ -0.05)

</details>

## Comparación con `reports/balance-latest.json`

Anterior: modelo 1.1 (full), 2026-10-22; contra sus criterios completos.

| Criterio | Antes | Ahora | Valor antes → ahora | Cambio |
|---|---|---|---|---|
| `C1_do_nothing_never_wins` | FAIL | PASS | 0.075 → 0.000 | improved |
| `C2_targeted_wins` | FAIL | FAIL | 0.000 → 0.300 | improved |
| `C3_no_strategy_wins_all` | PASS | PASS | 0.225 → 0.000 | improved |
| `C4_shortcuts_closed` | FAIL | FAIL | 0.350 → 1.000 | worsened |
| `C5_strategy_decides` | FAIL | PASS | 5.000 → 0.000 | improved |
| `C6_indicator_range` | FAIL | FAIL | 0.341 → 3.327 | improved |
| `C7_prediction_band` | FAIL | FAIL | 0.670 → 0.599 | improved |
| `C8_no_spurious_collapse` | PASS | PASS | 0.000 → 0.000 | same |
| `C9_annual_monthly` | SKIP | FAIL | 1.529 → 2.473 | worsened |

## Nivel 1 (30 años)

Tasa de victoria con intervalo de Wilson al 95 %; rutas = % de semillas que cumplen cada ruta (con pisos); valores al final: mediana (p10–p90).

| Estrategia | Victoria | cons / prod / inno | todas | B | F | E | W | St | c | D/Y | Puntaje | Fin (p50) | Derrotas |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| do_nothing | 0 % [0 %–9 %] | 0 % / 0 % / 0 % | 0 % | 39.0 (39.0–39.0) | 35.7 (34.3–37.6) | 26.5 (26.2–26.9) | 95.0 (94.0–95.5) | 95.0 (94.7–95.3) | 5.57 (5.55–5.59) | 0.00 (0.00–0.00) | 437 | 2054.0 | — |
| green | 0 % [0 %–9 %] | 0 % / 0 % / 0 % | 0 % | 55.2 (55.2–55.3) | 33.7 (32.1–35.3) | 24.7 (24.3–24.7) | 97.8 (97.2–98.5) | 95.1 (94.6–95.6) | 3.76 (3.74–3.78) | 0.00 (0.00–0.00) | 567 | 2054.0 | — |
| extractive | 0 % [0 %–9 %] | 0 % / 0 % / 0 % | 0 % | 27.8 (27.7–27.8) | 47.2 (45.2–48.8) | 46.7 (46.3–47.0) | 94.5 (93.5–95.3) | 91.2 (90.5–91.6) | 6.59 (6.55–6.62) | 0.00 (0.00–0.00) | 384 | 2054.0 | — |
| production | 100 % [91 %–100 %] | 0 % / 100 % / 0 % | 0 % | 41.8 (41.7–41.8) | 36.3 (34.7–38.1) | 41.1 (40.7–41.5) | 97.4 (96.3–97.9) | 97.1 (96.9–97.2) | 5.77 (5.75–5.80) | 0.00 (0.00–0.00) | 462 | 2054.0 | — |
| innovation | 100 % [91 %–100 %] | 0 % / 0 % / 100 % | 0 % | 42.0 (42.0–42.0) | 39.3 (37.5–41.2) | 31.8 (31.6–32.1) | 97.7 (96.7–98.2) | 96.7 (96.4–97.0) | 4.43 (4.42–4.45) | 0.00 (0.00–0.00) | 500 | 2054.0 | — |
| conservation | 100 % [91 %–100 %] | 100 % / 0 % / 0 % | 0 % | 54.7 (54.6–54.7) | 31.9 (30.3–33.8) | 27.1 (26.6–27.5) | 97.2 (96.2–98.0) | 95.4 (94.6–95.9) | 4.90 (4.87–4.92) | 0.00 (0.00–0.00) | 526 | 2054.0 | — |
| balanced | 0 % [0 %–9 %] | 0 % / 0 % / 0 % | 0 % | 53.2 (53.1–53.2) | 26.8 (25.3–28.7) | 33.3 (32.3–34.1) | 97.5 (96.5–98.2) | 96.4 (95.8–96.9) | 3.98 (3.96–4.00) | 0.00 (0.00–0.00) | 563 | 2054.0 | — |
| tech_tax | 100 % [91 %–100 %] | 0 % / 0 % / 100 % | 0 % | 39.8 (39.7–39.8) | 34.1 (32.8–36.0) | 23.8 (23.5–24.2) | 96.0 (95.0–96.4) | 94.7 (94.1–95.3) | 4.39 (4.38–4.41) | 0.00 (0.00–0.00) | 480 | 2054.0 | — |

Recorrido entre estrategias (máx − mín de las medianas): B 27.4, F 20.5, E 22.9, W 3.3.

## Nivel 2 (30 años)

Tasa de victoria con intervalo de Wilson al 95 %; rutas = % de semillas que cumplen cada ruta (con pisos); valores al final: mediana (p10–p90).

| Estrategia | Victoria | cons / prod / inno | todas | B | F | E | W | St | c | D/Y | Puntaje | Fin (p50) | Derrotas |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| do_nothing | 0 % [0 %–9 %] | 0 % / 0 % / 0 % | 0 % | 39.3 (39.2–39.4) | 38.4 (36.7–41.7) | 30.9 (30.4–31.8) | 57.9 (53.9–60.7) | 68.0 (63.6–71.6) | 6.94 (6.90–7.02) | 0.00 (0.00–0.00) | 554 | 2054.0 | — |
| green | 100 % [91 %–100 %] | 100 % / 0 % / 0 % | 0 % | 54.9 (54.8–54.9) | 37.6 (36.1–40.5) | 29.9 (29.3–30.8) | 76.3 (74.2–79.1) | 86.1 (83.5–87.6) | 4.94 (4.90–5.01) | 0.00 (0.00–0.00) | 670 | 2054.0 | — |
| extractive | 3 % [0 %–13 %] | 0 % / 3 % / 0 % | 0 % | 28.7 (28.6–28.8) | 48.5 (45.5–51.2) | 50.3 (48.5–52.1) | 54.7 (49.5–59.2) | 51.2 (44.9–59.4) | 8.04 (7.95–8.13) | 0.00 (0.00–0.00) | 501 | 2054.0 | — |
| production | 100 % [91 %–100 %] | 0 % / 100 % / 0 % | 0 % | 42.0 (42.0–42.1) | 38.3 (36.0–40.6) | 46.1 (44.4–48.1) | 72.2 (68.3–75.0) | 88.5 (85.9–90.1) | 7.19 (7.10–7.28) | 0.00 (0.00–0.00) | 619 | 2054.0 | — |
| innovation | 100 % [91 %–100 %] | 0 % / 15 % / 100 % | 0 % | 42.2 (42.1–42.2) | 41.8 (39.4–44.3) | 38.4 (37.4–40.1) | 75.4 (72.6–78.6) | 90.7 (88.4–92.0) | 4.81 (4.77–4.90) | 0.00 (0.00–0.00) | 667 | 2054.0 | — |
| conservation | 100 % [91 %–100 %] | 100 % / 0 % / 0 % | 0 % | 60.4 (60.3–60.5) | 35.8 (34.4–38.6) | 32.4 (32.0–33.2) | 71.6 (70.1–74.7) | 84.4 (81.5–86.1) | 6.22 (6.17–6.30) | 0.00 (0.00–0.00) | 649 | 2054.0 | — |
| balanced | 100 % [91 %–100 %] | 100 % / 65 % / 0 % | 0 % | 52.8 (52.7–52.9) | 31.7 (29.1–33.0) | 40.6 (38.7–42.6) | 74.9 (72.1–77.8) | 89.7 (86.5–91.0) | 5.23 (5.15–5.34) | 0.00 (0.00–0.00) | 670 | 2054.0 | — |
| tech_tax | 0 % [0 %–9 %] | 0 % / 0 % / 0 % | 0 % | 39.8 (39.7–39.8) | 35.4 (34.0–38.2) | 26.8 (26.3–27.8) | 60.3 (57.8–63.3) | 70.5 (65.8–73.7) | 6.07 (6.02–6.14) | 0.00 (0.00–0.00) | 575 | 2054.0 | — |

Recorrido entre estrategias (máx − mín de las medianas): B 31.7, F 16.8, E 23.5, W 21.6.

## Nivel 3 (30 años)

Tasa de victoria con intervalo de Wilson al 95 %; rutas = % de semillas que cumplen cada ruta (con pisos); valores al final: mediana (p10–p90).

| Estrategia | Victoria | cons / prod / inno / eq | todas | B | F | E | W | St | c | D/Y | Puntaje | Fin (p50) | Derrotas |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| do_nothing | 0 % [0 %–9 %] | 0 % / 0 % / 0 % / 0 % | 0 % | 39.5 (39.5–39.5) | 39.1 (36.9–40.1) | 30.4 (28.5–30.8) | 57.6 (54.4–60.1) | 66.9 (63.0–71.5) | 5.72 (5.60–5.82) | 0.01 (0.01–0.01) | 645 | 2054.0 | — |
| green | 100 % [91 %–100 %] | 100 % / 0 % / 0 % / 100 % | 0 % | 54.9 (54.9–54.9) | 37.3 (36.3–38.1) | 27.4 (26.0–28.2) | 70.8 (68.3–72.8) | 76.9 (74.5–78.8) | 4.04 (3.99–4.11) | 0.01 (0.01–0.01) | 713 | 2054.0 | — |
| extractive | 3 % [0 %–13 %] | 0 % / 3 % / 0 % / 0 % | 0 % | 29.5 (29.4–29.5) | 45.2 (42.7–46.9) | 46.4 (43.6–48.4) | 47.5 (41.0–52.3) | 41.9 (35.6–50.0) | 6.62 (6.49–6.72) | 0.01 (0.01–0.01) | 642 | 2054.0 | — |
| production | 100 % [91 %–100 %] | 0 % / 100 % / 0 % / 100 % | 0 % | 42.5 (42.5–42.5) | 38.1 (36.5–39.2) | 43.1 (41.0–43.9) | 67.2 (64.4–70.0) | 85.5 (82.7–87.3) | 6.04 (5.95–6.11) | 0.01 (0.01–0.01) | 732 | 2054.0 | — |
| innovation | 100 % [91 %–100 %] | 10 % / 13 % / 100 % / 100 % | 0 % | 42.6 (42.6–42.7) | 41.7 (40.4–42.8) | 35.3 (33.6–36.7) | 70.6 (67.8–73.0) | 85.4 (83.4–87.3) | 3.88 (3.81–3.94) | 0.01 (0.01–0.01) | 760 | 2054.0 | — |
| conservation | 100 % [91 %–100 %] | 100 % / 0 % / 0 % / 100 % | 0 % | 60.3 (60.3–60.3) | 36.5 (35.2–37.8) | 29.9 (28.5–30.6) | 66.7 (63.7–69.3) | 75.0 (71.7–78.5) | 5.22 (5.14–5.29) | 0.01 (0.01–0.01) | 694 | 2054.0 | — |
| balanced | 100 % [91 %–100 %] | 100 % / 85 % / 0 % / 100 % | 0 % | 52.7 (52.7–52.8) | 31.4 (30.6–32.7) | 37.8 (36.1–39.0) | 69.8 (67.4–72.3) | 82.8 (80.1–85.2) | 4.29 (4.21–4.37) | 0.01 (0.01–0.01) | 762 | 2054.0 | — |
| tech_tax | 0 % [0 %–9 %] | 0 % / 0 % / 0 % / 0 % | 0 % | 39.9 (39.9–40.0) | 35.9 (34.0–36.6) | 24.6 (23.1–25.0) | 56.4 (53.2–58.6) | 58.5 (53.8–62.9) | 4.93 (4.85–4.99) | 0.01 (0.01–0.01) | 647 | 2054.0 | — |

Recorrido entre estrategias (máx − mín de las medianas): B 30.8, F 13.8, E 21.8, W 23.3.

## Territorio (360 meses)

Tasa de victoria con intervalo de Wilson al 95 %; rutas = % de semillas que cumplen cada ruta (con pisos); valores al final: mediana (p10–p90).

| Estrategia | Victoria | cons / prod / inno | todas | B | F | E | W | St | c | D/Y | Puntaje | Fin (p50) | Derrotas |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| do_nothing | 0 % [0 %–16 %] | 0 % / 0 % / 0 % | 0 % | 36.9 (33.4–38.8) | 37.6 (34.7–41.2) | 30.5 (28.5–32.0) | 48.0 (40.0–54.3) | 52.8 (44.9–65.1) | 6.77 (6.68–6.90) | 0.00 (0.00–0.00) | 521 | 2054.0 | — |
| conservation | 100 % [84 %–100 %] | 100 % / 0 % / 0 % | 0 % | 62.8 (61.6–63.5) | 30.9 (28.5–34.9) | 28.7 (26.7–30.6) | 74.3 (70.0–79.1) | 82.3 (78.8–87.2) | 5.54 (5.03–5.82) | 0.00 (0.00–0.03) | 656 | 2054.0 | — |
| production | 30 % [15 %–52 %] | 0 % / 30 % / 0 % | 0 % | 38.4 (34.7–40.3) | 44.5 (41.3–47.9) | 49.4 (48.1–51.9) | 76.1 (72.2–81.0) | 88.8 (86.9–91.9) | 7.25 (6.70–7.70) | 0.00 (0.00–0.01) | 619 | 2054.0 | — |
| innovation | 100 % [84 %–100 %] | 0 % / 0 % / 100 % | 0 % | 45.5 (44.2–48.1) | 35.7 (31.3–37.9) | 32.9 (31.3–34.9) | 76.9 (70.5–81.2) | 86.8 (82.7–89.5) | 3.95 (3.82–4.02) | 0.00 (0.00–0.03) | 674 | 2054.0 | — |
| settle_only | 0 % [0 %–16 %] | 0 % / 0 % / 0 % | 0 % | 42.0 (40.1–44.0) | 36.8 (32.6–40.4) | 31.1 (29.4–32.8) | 64.6 (59.5–71.1) | 76.4 (71.6–82.1) | 6.46 (5.99–6.85) | 0.00 (0.00–0.03) | 588 | 2054.0 | — |
| cheap_production | 0 % [0 %–16 %] | 0 % / 0 % / 0 % | 0 % | 41.5 (39.6–44.3) | 31.9 (28.5–35.4) | 35.9 (34.0–37.5) | 63.9 (59.1–68.1) | 77.7 (73.4–82.9) | 6.72 (5.96–7.06) | 0.00 (0.00–0.01) | 581 | 2054.0 | — |
| extractive | 20 % [8 %–42 %] | 0 % / 20 % / 0 % | 0 % | 32.1 (28.4–34.6) | 43.6 (38.3–48.6) | 50.2 (48.0–53.5) | 61.3 (55.6–66.2) | 66.9 (57.5–74.2) | 7.51 (6.90–7.95) | 0.00 (0.00–0.01) | 545 | 2054.0 | — |
| buy_everything | 0 % [0 %–16 %] | 0 % / 0 % / 0 % | 0 % | 53.9 (53.0–54.0) | 32.6 (30.0–35.6) | 28.4 (27.0–30.5) | 69.7 (66.2–73.5) | 78.9 (73.3–81.6) | 4.43 (4.37–4.51) | 0.00 (0.00–0.00) | 652 | 2054.0 | — |

Recorrido entre estrategias (máx − mín de las medianas): B 30.7, F 13.5, E 21.8, W 28.8.

## Banda de predicción (jugadores sintéticos)

Proporción de años en que `actualDirection` (src/components/tutorial/predictions.ts) da "sin cambio". Objetivo: 30–36 %.

| Nivel | años | B | E | c |
|---|---|---|---|---|
| N1 | 4500 | 93 % | 69 % | 63 % |
| N2 | 4500 | 93 % | 60 % | 57 % |
| N3 | 4500 | 93 % | 58 % | 66 % |

## Consistencia anual–mensual (N2, sin eventos)

Criterio activo (modelo 2.x).

| Estrategia | Año | Indicador | Anual | Mensual | Δ |
|---|---|---|---|---|---|
| do_nothing | 10 | B | 39.80 | 39.81 | 0.01 |
| do_nothing | 10 | F | 40.31 | 40.60 | 0.29 |
| do_nothing | 10 | E | 30.46 | 30.44 | -0.02 |
| do_nothing | 10 | W | 60.12 | 60.38 | 0.26 |
| do_nothing | 10 | St | 70.38 | 70.57 | 0.18 |
| do_nothing | 10 | c | 7.01 | 6.99 | -0.01 |
| do_nothing | 30 | B | 39.18 | 39.20 | 0.02 |
| do_nothing | 30 | F | 40.57 | 40.88 | 0.31 |
| do_nothing | 30 | E | 31.27 | 31.26 | -0.02 |
| do_nothing | 30 | W | 60.55 | 60.86 | 0.31 |
| do_nothing | 30 | St | 71.83 | 72.10 | 0.26 |
| do_nothing | 30 | c | 6.90 | 6.90 | 0.00 |
| green | 10 | B | 52.91 | 52.56 | -0.34 |
| green | 10 | F | 42.27 | 42.77 | 0.51 |
| green | 10 | E | 29.19 | 29.13 | -0.06 |
| green | 10 | W | 79.59 | 79.78 | 0.18 |
| green | 10 | St | 84.57 | 84.20 | -0.36 |
| green | 10 | c | 4.88 | 4.92 | 0.03 |
| green | 30 | B | 54.82 | 54.84 | 0.02 |
| green | 30 | F | 37.55 | 38.03 | 0.48 |
| green | 30 | E | 29.80 | 29.85 | 0.04 |
| green | 30 | W | 75.86 | 76.32 | 0.46 |
| green | 30 | St | 85.24 | 85.64 | 0.40 |
| green | 30 | c | 4.89 | 4.89 | 0.00 |
| extractive | 10 | B | 29.58 | 29.66 | 0.08 |
| extractive | 10 | F | 47.61 | 47.35 | -0.26 |
| extractive | 10 | E | 60.05 | 60.33 | 0.28 |
| extractive | 10 | W | 51.81 | 51.12 | -0.68 |
| extractive | 10 | St | 45.15 | 42.68 | -2.47 |
| extractive | 10 | c | 9.05 | 9.00 | -0.05 |
| extractive | 30 | B | 28.55 | 28.59 | 0.05 |
| extractive | 30 | F | 51.14 | 51.30 | 0.16 |
| extractive | 30 | E | 51.17 | 51.17 | -0.00 |
| extractive | 30 | W | 59.80 | 60.05 | 0.25 |
| extractive | 30 | St | 61.50 | 61.88 | 0.39 |
| extractive | 30 | c | 8.00 | 8.01 | 0.01 |

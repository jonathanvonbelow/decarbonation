# Balance del modelo 2.0-dev (full)

Generado por `npm run sim:check` (scripts/sim-check.ts) el 2026-10-27, en 400 s. Modelo por juego: niveles 2.0-dev, Territorio 2.0-dev. Semillas: 40 por estrategia y nivel (3 niveles), 20 por estrategia (Territorio); 150 jugadores sintéticos por nivel. Criterios: 00_INDICE_v6.md §6; estrategias: scripts/harness/strategies.ts.

## Criterios

| Criterio | Estado | Valor | Umbral |
|---|---|---|---|
| `C1_do_nothing_never_wins` | PASS | 0.000 | = 0 % en cada nivel y en Territorio |
| `C2_targeted_wins` | FAIL | 0.400 | ≥ 70.0 % |
| `C3_no_strategy_wins_all` | PASS | 0.125 | ≤ 50.0 % por estrategia |
| `C4_shortcuts_closed` | FAIL | 1.000 | ≤ 5.0 % |
| `C5_strategy_decides` | FAIL | 1.000 | ninguna tasa de victoria en (30.0 %, 70.0 %); valor = casos dentro |
| `C6_indicator_range` | FAIL | 4.929 | ≥ 15 puntos en B, F, E, W |
| `C7_prediction_band` | FAIL | 0.604 | "sin cambio" entre 30.0 % y 36.0 %; valor = máx |x − 33 %| |
| `C8_no_spurious_collapse` | PASS | 0.000 | ninguna quiebra salvo buy_everything (Territorio); valor = quiebras no permitidas |
| `C9_annual_monthly` | PASS | 0.000 | |Δ| ≤ 1 en indicadores y ≤ 0.1 t en c (N2, sin eventos, años 10 y 30); valor = máx(|Δ|/umbral); solo modelo 2.x |

<details><summary>C1_do_nothing_never_wins</summary>

- N1: 0.0 %
- N2: 0.0 %
- N3: 0.0 %
- Territorio: 0.0 %

</details>

<details><summary>C2_targeted_wins</summary>

- N1 conservation→conservation: 100.0 %
- N1 production→production: 95.0 %
- N1 innovation→innovation: 100.0 %
- N2 conservation→conservation: 100.0 %
- N2 production→production: 100.0 %
- N2 innovation→innovation: 100.0 %
- N3 conservation→conservation: 100.0 %
- N3 production→production: 95.0 %
- N3 innovation→innovation: 100.0 %
- Territorio conservation→conservation: 100.0 %
- Territorio production→production: 40.0 % ✗
- Territorio innovation→innovation: 100.0 %

</details>

<details><summary>C3_no_strategy_wins_all</summary>

- N3 innovation: 12.5 %

</details>

<details><summary>C4_shortcuts_closed</summary>

- N1 tech_tax: 100.0 % ✗
- N1 extractive: 0.0 %
- N2 tech_tax: 0.0 %
- N2 extractive: 0.0 %
- N3 tech_tax: 0.0 %
- N3 extractive: 2.5 %
- Territorio settle_only: 0.0 %
- Territorio cheap_production: 0.0 %
- Territorio extractive: 0.0 %
- Territorio buy_everything: 0.0 %

</details>

<details><summary>C5_strategy_decides</summary>

- Territorio production: 40.0 % ✗

</details>

<details><summary>C6_indicator_range</summary>

- N1 B: 27.4 (extractive → green)
- N1 F: 19.7 (balanced → extractive)
- N1 E: 22.6 (tech_tax → extractive)
- N1 W: 4.9 (extractive → innovation) ✗
- N2 B: 31.7 (extractive → conservation)
- N2 F: 15.9 (balanced → extractive)
- N2 E: 23.2 (tech_tax → extractive)
- N2 W: 26.2 (extractive → innovation)
- N3 B: 30.9 (extractive → conservation)
- N3 F: 14.6 (balanced → extractive) ✗
- N3 E: 20.7 (tech_tax → extractive)
- N3 W: 26.8 (extractive → innovation)
- Territorio B: 30.4 (extractive → conservation)
- Territorio F: 25.4 (buy_everything → extractive)
- Territorio E: 31.3 (buy_everything → production)
- Territorio W: 34.4 (buy_everything → innovation)

</details>

<details><summary>C7_prediction_band</summary>

- N1 B: 93.4 % ✗
- N1 E: 68.8 % ✗
- N1 c: 64.5 % ✗
- N2 B: 93.3 % ✗
- N2 E: 57.1 % ✗
- N2 c: 61.9 % ✗
- N3 B: 93.3 % ✗
- N3 E: 46.4 % ✗
- N3 c: 69.3 % ✗

</details>

<details><summary>C8_no_spurious_collapse</summary>

- Territorio buy_everything: 1/20 (permitida)

</details>

<details><summary>C9_annual_monthly</summary>

- peor B: do_nothing año 10, anual 39.81 vs mensual 39.81 (Δ 0.00)
- peor c: do_nothing año 10, anual 6.99 vs mensual 6.99 (Δ 0.00)

</details>

## Comparación con `reports/balance-latest.json`

Anterior: modelo 1.1 (full), 2026-10-22; contra sus criterios completos.

| Criterio | Antes | Ahora | Valor antes → ahora | Cambio |
|---|---|---|---|---|
| `C1_do_nothing_never_wins` | FAIL | PASS | 0.075 → 0.000 | improved |
| `C2_targeted_wins` | FAIL | FAIL | 0.000 → 0.400 | improved |
| `C3_no_strategy_wins_all` | PASS | PASS | 0.225 → 0.125 | improved |
| `C4_shortcuts_closed` | FAIL | FAIL | 0.350 → 1.000 | worsened |
| `C5_strategy_decides` | FAIL | FAIL | 5.000 → 1.000 | improved |
| `C6_indicator_range` | FAIL | FAIL | 0.341 → 4.929 | improved |
| `C7_prediction_band` | FAIL | FAIL | 0.670 → 0.604 | improved |
| `C8_no_spurious_collapse` | PASS | PASS | 0.000 → 0.000 | same |
| `C9_annual_monthly` | SKIP | PASS | 1.529 → 0.000 | improved |

## Nivel 1 (30 años)

Tasa de victoria con intervalo de Wilson al 95 %; rutas = % de semillas que cumplen cada ruta (con pisos); valores al final: mediana (p10–p90).

| Estrategia | Victoria | cons / prod / inno | todas | B | F | E | W | St | c | D/Y | Puntaje | Fin (p50) | Derrotas |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| do_nothing | 0 % [0 %–9 %] | 0 % / 0 % / 0 % | 0 % | 39.1 (39.0–39.1) | 35.5 (32.8–38.3) | 26.2 (25.8–26.6) | 94.3 (92.3–95.4) | 94.7 (94.1–95.1) | 5.57 (5.55–5.60) | 0.00 (0.00–0.00) | 437 | 2054.0 | — |
| green | 100 % [91 %–100 %] | 100 % / 0 % / 100 % | 0 % | 55.3 (55.2–55.3) | 33.3 (31.1–35.5) | 24.0 (23.6–24.2) | 96.6 (95.6–98.0) | 94.5 (93.9–95.1) | 3.75 (3.73–3.78) | 0.40 (0.39–0.40) | 566 | 2054.0 | — |
| extractive | 0 % [0 %–9 %] | 0 % / 0 % / 0 % | 0 % | 27.9 (27.8–28.0) | 46.4 (42.2–50.4) | 46.1 (45.6–46.6) | 92.5 (89.1–94.1) | 90.0 (89.1–90.8) | 6.59 (6.57–6.63) | 0.18 (0.18–0.18) | 383 | 2054.0 | — |
| production | 95 % [83 %–99 %] | 0 % / 95 % / 0 % | 0 % | 41.8 (41.8–41.9) | 36.0 (33.3–39.1) | 40.8 (40.3–41.2) | 97.3 (95.4–98.4) | 97.0 (96.8–97.2) | 5.77 (5.75–5.81) | 0.02 (0.02–0.02) | 462 | 2054.0 | — |
| innovation | 100 % [91 %–100 %] | 10 % / 0 % / 100 % | 0 % | 42.1 (42.0–42.1) | 39.0 (36.2–42.1) | 31.5 (31.1–31.8) | 97.4 (95.5–98.4) | 96.6 (96.2–96.8) | 4.42 (4.41–4.45) | 0.01 (0.01–0.01) | 500 | 2054.0 | — |
| conservation | 100 % [91 %–100 %] | 100 % / 0 % / 0 % | 0 % | 54.7 (54.7–54.8) | 32.0 (29.2–35.2) | 27.0 (26.3–27.4) | 96.8 (95.0–98.2) | 95.3 (94.3–95.6) | 4.90 (4.88–4.93) | 0.07 (0.06–0.07) | 525 | 2054.0 | — |
| balanced | 100 % [91 %–100 %] | 100 % / 0 % / 100 % | 0 % | 53.2 (53.1–53.2) | 26.7 (24.1–29.6) | 32.6 (31.1–33.7) | 96.2 (94.6–97.7) | 96.1 (95.2–96.4) | 3.97 (3.96–4.00) | 0.37 (0.37–0.37) | 562 | 2054.0 | — |
| tech_tax | 100 % [91 %–100 %] | 0 % / 0 % / 100 % | 0 % | 39.8 (39.8–39.9) | 33.9 (31.3–36.6) | 23.5 (23.0–23.8) | 94.7 (92.7–95.7) | 94.3 (93.4–94.8) | 4.38 (4.37–4.40) | 0.00 (0.00–0.00) | 480 | 2054.0 | — |

Recorrido entre estrategias (máx − mín de las medianas): B 27.4, F 19.7, E 22.6, W 4.9.

## Nivel 2 (30 años)

Tasa de victoria con intervalo de Wilson al 95 %; rutas = % de semillas que cumplen cada ruta (con pisos); valores al final: mediana (p10–p90).

| Estrategia | Victoria | cons / prod / inno | todas | B | F | E | W | St | c | D/Y | Puntaje | Fin (p50) | Derrotas |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| do_nothing | 0 % [0 %–9 %] | 0 % / 0 % / 0 % | 0 % | 39.4 (39.3–39.5) | 37.4 (34.4–40.7) | 30.5 (29.8–31.2) | 54.5 (49.3–59.3) | 66.2 (59.4–70.0) | 6.92 (6.90–7.00) | 0.00 (0.00–0.00) | 544 | 2054.0 | — |
| green | 100 % [91 %–100 %] | 100 % / 0 % / 0 % | 0 % | 54.9 (54.8–55.0) | 37.4 (35.1–40.1) | 29.2 (28.6–30.8) | 67.0 (63.7–70.8) | 78.2 (74.0–82.1) | 4.95 (4.90–5.03) | 0.27 (0.26–0.27) | 652 | 2054.0 | — |
| extractive | 0 % [0 %–9 %] | 0 % / 0 % / 0 % | 0 % | 28.8 (28.6–28.9) | 46.8 (43.7–50.9) | 49.6 (48.0–51.2) | 47.5 (41.4–53.1) | 43.1 (33.4–50.2) | 8.08 (7.98–8.19) | 0.05 (0.04–0.05) | 477 | 2054.0 | — |
| production | 100 % [91 %–100 %] | 0 % / 100 % / 0 % | 0 % | 42.1 (42.0–42.2) | 37.4 (33.8–41.3) | 45.9 (44.4–48.3) | 72.2 (67.3–76.1) | 88.5 (85.9–90.7) | 7.24 (7.15–7.35) | 0.00 (0.00–0.00) | 619 | 2054.0 | — |
| innovation | 100 % [91 %–100 %] | 0 % / 13 % / 100 % | 0 % | 42.2 (42.2–42.3) | 41.0 (36.3–44.3) | 37.6 (36.7–40.5) | 73.8 (68.3–77.7) | 89.6 (86.7–91.8) | 4.85 (4.78–4.93) | 0.26 (0.25–0.26) | 663 | 2054.0 | — |
| conservation | 100 % [91 %–100 %] | 100 % / 0 % / 0 % | 0 % | 60.4 (60.3–60.5) | 35.5 (31.5–38.6) | 32.2 (31.2–32.9) | 69.1 (63.8–72.6) | 82.3 (77.2–84.8) | 6.23 (6.19–6.32) | 0.00 (0.00–0.00) | 642 | 2054.0 | — |
| balanced | 100 % [91 %–100 %] | 100 % / 45 % / 0 % | 0 % | 52.8 (52.7–52.9) | 30.9 (27.3–33.8) | 39.8 (38.3–43.5) | 66.1 (59.8–71.5) | 84.7 (78.1–88.4) | 5.27 (5.19–5.38) | 0.25 (0.25–0.26) | 654 | 2054.0 | — |
| tech_tax | 0 % [0 %–9 %] | 0 % / 0 % / 0 % | 0 % | 39.8 (39.7–39.9) | 34.5 (31.6–37.4) | 26.4 (25.6–28.1) | 50.8 (46.5–54.8) | 58.8 (51.0–64.9) | 6.09 (6.02–6.16) | 0.00 (0.00–0.00) | 549 | 2054.0 | — |

Recorrido entre estrategias (máx − mín de las medianas): B 31.7, F 15.9, E 23.2, W 26.2.

## Nivel 3 (30 años)

Tasa de victoria con intervalo de Wilson al 95 %; rutas = % de semillas que cumplen cada ruta (con pisos); valores al final: mediana (p10–p90).

| Estrategia | Victoria | cons / prod / inno / eq | todas | B | F | E | W | St | c | D/Y | Puntaje | Fin (p50) | Derrotas |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| do_nothing | 0 % [0 %–9 %] | 0 % / 0 % / 0 % / 0 % | 0 % | 39.6 (39.5–39.6) | 37.4 (34.0–40.5) | 29.6 (27.3–31.1) | 53.9 (47.3–57.0) | 59.3 (50.5–65.4) | 5.62 (5.49–5.74) | 0.02 (0.02–0.02) | 617 | 2054.0 | — |
| green | 100 % [91 %–100 %] | 100 % / 0 % / 0 % / 40 % | 0 % | 54.9 (54.9–54.9) | 37.0 (34.5–40.0) | 25.9 (23.8–28.2) | 58.6 (52.1–63.0) | 60.2 (53.1–67.4) | 3.97 (3.91–4.07) | 0.37 (0.31–0.41) | 678 | 2054.0 | — |
| extractive | 3 % [0 %–13 %] | 0 % / 3 % / 0 % / 0 % | 0 % | 29.5 (29.4–29.6) | 44.3 (39.1–47.2) | 44.7 (40.5–49.2) | 39.8 (30.0–45.9) | 30.8 (22.8–40.5) | 6.55 (6.38–6.76) | 0.03 (0.03–0.05) | 616 | 2054.0 | — |
| production | 95 % [83 %–99 %] | 0 % / 95 % / 0 % / 78 % | 0 % | 42.6 (42.5–42.6) | 36.7 (32.4–40.1) | 42.1 (38.6–45.6) | 65.5 (58.8–71.3) | 83.4 (76.0–87.2) | 5.98 (5.81–6.13) | 0.02 (0.01–0.02) | 726 | 2054.0 | — |
| innovation | 100 % [91 %–100 %] | 70 % / 25 % / 100 % / 98 % | 13 % | 42.7 (42.6–42.7) | 40.1 (35.9–43.5) | 34.5 (31.2–37.5) | 66.6 (60.1–72.1) | 81.2 (75.2–85.4) | 3.85 (3.78–3.92) | 0.20 (0.18–0.24) | 747 | 2054.0 | — |
| conservation | 100 % [91 %–100 %] | 100 % / 0 % / 0 % / 65 % | 0 % | 60.3 (60.3–60.4) | 34.8 (31.8–39.0) | 29.1 (26.7–31.2) | 61.3 (55.9–67.0) | 68.2 (59.5–73.1) | 5.10 (4.98–5.22) | 0.05 (0.04–0.06) | 670 | 2054.0 | — |
| balanced | 100 % [91 %–100 %] | 100 % / 35 % / 0 % / 95 % | 0 % | 52.8 (52.8–52.8) | 29.8 (26.2–34.0) | 36.4 (32.5–39.9) | 57.2 (50.5–63.5) | 69.2 (60.3–76.5) | 4.25 (4.11–4.32) | 0.23 (0.21–0.27) | 738 | 2054.0 | — |
| tech_tax | 0 % [0 %–9 %] | 0 % / 0 % / 0 % / 0 % | 0 % | 40.0 (39.9–40.0) | 34.3 (30.9–37.2) | 24.0 (22.4–25.8) | 45.6 (39.1–48.1) | 39.2 (32.3–46.8) | 4.85 (4.80–4.96) | 0.01 (0.01–0.01) | 610 | 2054.0 | — |

Recorrido entre estrategias (máx − mín de las medianas): B 30.9, F 14.6, E 20.7, W 26.8.

## Territorio (360 meses)

Tasa de victoria con intervalo de Wilson al 95 %; rutas = % de semillas que cumplen cada ruta (con pisos); valores al final: mediana (p10–p90).

| Estrategia | Victoria | cons / prod / inno | todas | B | F | E | W | St | c | D/Y | Puntaje | Fin (p50) | Derrotas |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| do_nothing | 0 % [0 %–16 %] | 0 % / 0 % / 0 % | 0 % | 37.2 (33.6–38.9) | 37.3 (32.3–41.6) | 29.9 (28.5–31.9) | 50.1 (36.0–53.0) | 52.8 (39.0–62.2) | 6.77 (6.66–6.88) | 0.00 (0.00–0.00) | 519 | 2054.0 | — |
| conservation | 100 % [84 %–100 %] | 100 % / 0 % / 0 % | 0 % | 62.5 (61.7–64.0) | 30.5 (28.5–33.8) | 27.6 (24.9–29.2) | 68.2 (65.0–73.4) | 76.0 (71.0–80.5) | 5.62 (5.16–5.90) | 0.41 (0.29–0.59) | 639 | 2054.0 | — |
| production | 40 % [22 %–61 %] | 0 % / 40 % / 0 % | 0 % | 38.9 (34.8–40.7) | 43.9 (39.7–48.4) | 48.4 (47.6–50.9) | 73.4 (69.7–80.8) | 87.9 (85.5–92.5) | 7.25 (6.34–7.52) | 0.24 (0.14–0.31) | 619 | 2054.0 | — |
| innovation | 100 % [84 %–100 %] | 0 % / 0 % / 100 % | 0 % | 46.2 (43.8–47.5) | 34.4 (28.8–37.2) | 31.6 (29.4–33.1) | 77.2 (72.6–82.5) | 86.6 (82.3–88.4) | 3.96 (3.83–4.09) | 0.50 (0.35–0.59) | 672 | 2054.0 | — |
| settle_only | 0 % [0 %–16 %] | 0 % / 0 % / 0 % | 0 % | 42.1 (40.1–44.3) | 36.2 (29.8–40.6) | 30.9 (29.6–32.1) | 67.7 (60.0–74.2) | 76.6 (72.0–83.1) | 6.48 (5.75–6.78) | 0.00 (0.00–0.03) | 591 | 2054.0 | — |
| cheap_production | 0 % [0 %–16 %] | 0 % / 0 % / 0 % | 0 % | 41.7 (39.8–44.3) | 31.9 (26.8–37.8) | 34.9 (33.2–37.5) | 67.4 (57.9–72.1) | 79.2 (73.3–84.2) | 6.78 (5.97–7.06) | 0.00 (0.00–0.01) | 585 | 2054.0 | — |
| extractive | 0 % [0 %–16 %] | 0 % / 0 % / 0 % | 0 % | 32.1 (28.7–33.5) | 44.5 (39.1–47.0) | 46.4 (43.3–49.7) | 53.7 (45.7–64.3) | 54.6 (46.9–69.6) | 7.47 (6.71–7.89) | 0.56 (0.53–0.62) | 514 | 2054.0 | — |
| buy_everything | 0 % [0 %–16 %] | 0 % / 0 % / 0 % | 0 % | 52.7 (49.6–55.6) | 19.1 (18.3–19.9) | 17.1 (12.2–18.7) | 42.8 (32.1–50.0) | 43.7 (23.8–55.5) | 3.21 (3.02–3.49) | 0.72 (0.66–0.94) | 564 | 2034.3 | sustained 19, bankruptcy 1 |

Recorrido entre estrategias (máx − mín de las medianas): B 30.4, F 25.4, E 31.3, W 34.4.

## Banda de predicción (jugadores sintéticos)

Proporción de años en que `actualDirection` (src/components/tutorial/predictions.ts) da "sin cambio". Objetivo: 30–36 %.

| Nivel | años | B | E | c |
|---|---|---|---|---|
| N1 | 4500 | 93 % | 69 % | 65 % |
| N2 | 4500 | 93 % | 57 % | 62 % |
| N3 | 4436 | 93 % | 46 % | 69 % |

## Consistencia anual–mensual (N2, sin eventos)

Criterio activo (modelo 2.x).

| Estrategia | Año | Indicador | Anual | Mensual | Δ |
|---|---|---|---|---|---|
| do_nothing | 10 | B | 39.81 | 39.81 | 0.00 |
| do_nothing | 10 | F | 40.56 | 40.56 | 0.00 |
| do_nothing | 10 | E | 30.29 | 30.29 | 0.00 |
| do_nothing | 10 | W | 59.84 | 59.84 | 0.00 |
| do_nothing | 10 | St | 70.05 | 70.05 | 0.00 |
| do_nothing | 10 | c | 6.99 | 6.99 | 0.00 |
| do_nothing | 30 | B | 39.20 | 39.20 | 0.00 |
| do_nothing | 30 | F | 40.83 | 40.83 | 0.00 |
| do_nothing | 30 | E | 31.11 | 31.11 | 0.00 |
| do_nothing | 30 | W | 59.86 | 59.86 | 0.00 |
| do_nothing | 30 | St | 71.10 | 71.10 | 0.00 |
| do_nothing | 30 | c | 6.90 | 6.90 | 0.00 |
| green | 10 | B | 52.56 | 52.56 | 0.00 |
| green | 10 | F | 42.73 | 42.73 | 0.00 |
| green | 10 | E | 28.98 | 28.98 | 0.00 |
| green | 10 | W | 67.93 | 67.93 | 0.00 |
| green | 10 | St | 77.51 | 77.51 | 0.00 |
| green | 10 | c | 4.92 | 4.92 | 0.00 |
| green | 30 | B | 54.84 | 54.84 | 0.00 |
| green | 30 | F | 37.90 | 37.90 | 0.00 |
| green | 30 | E | 29.30 | 29.30 | 0.00 |
| green | 30 | W | 67.10 | 67.10 | 0.00 |
| green | 30 | St | 78.55 | 78.55 | 0.00 |
| green | 30 | c | 4.89 | 4.89 | 0.00 |
| extractive | 10 | B | 29.66 | 29.66 | 0.00 |
| extractive | 10 | F | 47.31 | 47.31 | 0.00 |
| extractive | 10 | E | 60.17 | 60.17 | 0.00 |
| extractive | 10 | W | 48.50 | 48.50 | 0.00 |
| extractive | 10 | St | 40.37 | 40.37 | 0.00 |
| extractive | 10 | c | 9.00 | 9.00 | 0.00 |
| extractive | 30 | B | 28.59 | 28.59 | 0.00 |
| extractive | 30 | F | 51.23 | 51.23 | 0.00 |
| extractive | 30 | E | 50.95 | 50.95 | 0.00 |
| extractive | 30 | W | 55.36 | 55.36 | 0.00 |
| extractive | 30 | St | 56.04 | 56.04 | 0.00 |
| extractive | 30 | c | 8.01 | 8.01 | 0.00 |

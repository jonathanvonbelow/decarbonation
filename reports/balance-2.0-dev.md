# Balance del modelo 2.0-dev (full)

Generado por `npm run sim:check` (scripts/sim-check.ts) el 2026-10-23, en 158 s. Modelo por juego: niveles 2.0-dev, Territorio 2.0-dev. Semillas: 40 por estrategia y nivel (3 niveles), 20 por estrategia (Territorio); 150 jugadores sintéticos por nivel. Criterios: 00_INDICE_v6.md §6; estrategias: scripts/harness/strategies.ts.

## Criterios

| Criterio | Estado | Valor | Umbral |
|---|---|---|---|
| `C1_do_nothing_never_wins` | PASS | 0.000 | = 0 % en cada nivel y en Territorio |
| `C2_targeted_wins` | FAIL | 0.225 | ≥ 70.0 % |
| `C3_no_strategy_wins_all` | PASS | 0.000 | ≤ 50.0 % por estrategia |
| `C4_shortcuts_closed` | FAIL | 1.000 | ≤ 5.0 % |
| `C5_strategy_decides` | FAIL | 2.000 | ninguna tasa de victoria en (30.0 %, 70.0 %); valor = casos dentro |
| `C6_indicator_range` | FAIL | 11.580 | ≥ 15 puntos en B, F, E, W |
| `C7_prediction_band` | FAIL | 0.670 | "sin cambio" entre 30.0 % y 36.0 %; valor = máx |x − 33 %| |
| `C8_no_spurious_collapse` | PASS | 0.000 | ninguna quiebra salvo buy_everything (Territorio); valor = quiebras no permitidas |
| `C9_annual_monthly` | PASS | 0.697 | |Δ| ≤ 1 en indicadores y ≤ 0.1 t en c (N2, sin eventos, años 10 y 30); valor = máx(|Δ|/umbral); solo modelo 2.x |

<details><summary>C1_do_nothing_never_wins</summary>

- N1: 0.0 %
- N2: 0.0 %
- N3: 0.0 %
- Territorio: 0.0 %

</details>

<details><summary>C2_targeted_wins</summary>

- N1 conservation→conservation: 100.0 %
- N1 production→production: 22.5 % ✗
- N1 innovation→innovation: 100.0 %
- N2 conservation→conservation: 85.0 %
- N2 production→production: 65.0 % ✗
- N2 innovation→innovation: 100.0 %
- N3 conservation→conservation: 100.0 %
- N3 production→production: 97.5 %
- N3 innovation→innovation: 100.0 %
- Territorio conservation→conservation: 95.0 %
- Territorio production→production: 30.0 % ✗
- Territorio innovation→innovation: 100.0 %

</details>

<details><summary>C4_shortcuts_closed</summary>

- N1 tech_tax: 100.0 % ✗
- N1 extractive: 0.0 %
- N2 tech_tax: 0.0 %
- N2 extractive: 0.0 %
- N3 tech_tax: 0.0 %
- N3 extractive: 0.0 %
- Territorio settle_only: 0.0 %
- Territorio cheap_production: 50.0 % ✗
- Territorio extractive: 10.0 % ✗
- Territorio buy_everything: 10.0 % ✗

</details>

<details><summary>C5_strategy_decides</summary>

- N2 production: 65.0 % ✗
- Territorio cheap_production: 50.0 % ✗

</details>

<details><summary>C6_indicator_range</summary>

- N1 B: 12.1 (extractive → green) ✗
- N1 F: 12.9 (extractive → green) ✗
- N1 E: 23.1 (tech_tax → extractive)
- N1 W: 18.3 (extractive → green)
- N2 B: 11.9 (extractive → conservation) ✗
- N2 F: 18.9 (extractive → green)
- N2 E: 25.5 (tech_tax → extractive)
- N2 W: 62.1 (extractive → green)
- N3 B: 11.6 (extractive → conservation) ✗
- N3 F: 13.6 (extractive → green) ✗
- N3 E: 24.3 (tech_tax → extractive)
- N3 W: 58.4 (extractive → balanced)
- Territorio B: 18.7 (do_nothing → conservation)
- Territorio F: 29.3 (do_nothing → conservation)
- Territorio E: 26.1 (buy_everything → extractive)
- Territorio W: 68.9 (do_nothing → conservation)

</details>

<details><summary>C7_prediction_band</summary>

- N1 B: 100.0 % ✗
- N1 E: 67.3 % ✗
- N1 c: 63.2 % ✗
- N2 B: 100.0 % ✗
- N2 E: 59.3 % ✗
- N2 c: 57.3 % ✗
- N3 B: 100.0 % ✗
- N3 E: 55.8 % ✗
- N3 c: 66.2 % ✗

</details>

<details><summary>C9_annual_monthly</summary>

- peor St: green año 10, anual 75.96 vs mensual 75.27 (Δ -0.70)
- peor c: extractive año 10, anual 9.05 vs mensual 9.00 (Δ -0.05)

</details>

## Comparación con `reports/balance-latest.json`

Anterior: modelo 1.1 (full), 2026-10-22; contra sus criterios completos.

| Criterio | Antes | Ahora | Valor antes → ahora | Cambio |
|---|---|---|---|---|
| `C1_do_nothing_never_wins` | FAIL | PASS | 0.075 → 0.000 | improved |
| `C2_targeted_wins` | FAIL | FAIL | 0.000 → 0.225 | improved |
| `C3_no_strategy_wins_all` | PASS | PASS | 0.225 → 0.000 | improved |
| `C4_shortcuts_closed` | FAIL | FAIL | 0.350 → 1.000 | worsened |
| `C5_strategy_decides` | FAIL | FAIL | 5.000 → 2.000 | improved |
| `C6_indicator_range` | FAIL | FAIL | 0.341 → 11.580 | improved |
| `C7_prediction_band` | FAIL | FAIL | 0.670 → 0.670 | same |
| `C8_no_spurious_collapse` | PASS | PASS | 0.000 → 0.000 | same |
| `C9_annual_monthly` | SKIP | PASS | 1.529 → 0.697 | improved |

## Nivel 1 (30 años)

Tasa de victoria con intervalo de Wilson al 95 %; rutas = % de semillas que cumplen cada ruta (con pisos); valores al final: mediana (p10–p90).

| Estrategia | Victoria | cons / prod / inno | todas | B | F | E | W | St | c | D/Y | Puntaje | Fin (p50) | Derrotas |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| do_nothing | 0 % [0 %–9 %] | 0 % / 0 % / 0 % | 0 % | 38.7 (38.7–38.7) | 31.6 (24.6–36.8) | 25.9 (24.0–26.8) | 94.4 (92.5–96.2) | 73.6 (70.3–79.0) | 5.57 (5.55–5.59) | 0.00 (0.00–0.00) | 434 | 2054.0 | — |
| green | 0 % [0 %–9 %] | 0 % / 0 % / 0 % | 0 % | 45.4 (45.4–45.4) | 41.8 (31.8–48.0) | 23.4 (22.9–23.5) | 98.5 (97.5–99.1) | 84.1 (78.2–88.5) | 3.76 (3.74–3.77) | 0.00 (0.00–0.00) | 526 | 2054.0 | — |
| extractive | 0 % [0 %–9 %] | 0 % / 0 % / 0 % | 0 % | 33.3 (33.3–33.3) | 28.9 (22.3–36.7) | 46.3 (42.5–47.7) | 80.2 (73.4–84.9) | 58.5 (50.8–64.9) | 6.59 (6.55–6.62) | 0.00 (0.00–0.00) | 406 | 2054.0 | — |
| production | 23 % [12 %–38 %] | 0 % / 23 % / 0 % | 0 % | 39.8 (39.8–39.8) | 33.3 (25.5–48.3) | 40.5 (38.0–41.2) | 98.0 (96.9–99.0) | 98.4 (97.4–98.8) | 5.77 (5.75–5.80) | 0.00 (0.00–0.00) | 453 | 2054.0 | — |
| innovation | 100 % [91 %–100 %] | 0 % / 0 % / 100 % | 0 % | 40.0 (40.0–40.0) | 32.9 (25.1–47.8) | 31.1 (28.8–31.8) | 97.6 (96.4–98.7) | 90.1 (83.2–94.2) | 4.43 (4.42–4.45) | 0.00 (0.00–0.00) | 490 | 2054.0 | — |
| conservation | 100 % [91 %–100 %] | 100 % / 0 % / 0 % | 0 % | 45.3 (45.2–45.3) | 32.9 (25.1–47.7) | 25.7 (23.7–26.3) | 97.5 (96.3–98.7) | 86.3 (77.9–91.8) | 4.89 (4.87–4.91) | 0.00 (0.00–0.00) | 486 | 2054.0 | — |
| balanced | 0 % [0 %–9 %] | 0 % / 0 % / 0 % | 0 % | 44.7 (44.7–44.7) | 32.9 (25.1–47.8) | 33.2 (30.8–33.9) | 98.1 (97.0–99.0) | 96.4 (93.6–98.0) | 3.97 (3.96–3.99) | 0.00 (0.00–0.00) | 530 | 2054.0 | — |
| tech_tax | 100 % [91 %–100 %] | 0 % / 0 % / 100 % | 0 % | 39.1 (39.1–39.1) | 31.5 (24.5–36.7) | 23.2 (21.5–24.1) | 96.3 (94.9–97.7) | 76.7 (74.8–78.8) | 4.39 (4.38–4.41) | 0.00 (0.00–0.00) | 476 | 2054.0 | — |

Recorrido entre estrategias (máx − mín de las medianas): B 12.1, F 12.9, E 23.1, W 18.3.

## Nivel 2 (30 años)

Tasa de victoria con intervalo de Wilson al 95 %; rutas = % de semillas que cumplen cada ruta (con pisos); valores al final: mediana (p10–p90).

| Estrategia | Victoria | cons / prod / inno | todas | B | F | E | W | St | c | D/Y | Puntaje | Fin (p50) | Derrotas |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| do_nothing | 0 % [0 %–9 %] | 0 % / 0 % / 0 % | 0 % | 37.9 (37.8–37.9) | 32.2 (22.8–41.4) | 30.1 (26.8–31.0) | 51.3 (39.3–59.2) | 21.7 (11.6–37.9) | 6.92 (6.90–6.97) | 0.00 (0.00–0.00) | 434 | 2054.0 | — |
| green | 95 % [83 %–99 %] | 95 % / 0 % / 0 % | 0 % | 44.1 (44.1–44.1) | 47.1 (35.3–63.2) | 28.2 (27.4–29.0) | 82.2 (74.0–89.9) | 69.9 (51.6–83.4) | 4.94 (4.89–5.00) | 0.00 (0.00–0.00) | 620 | 2054.0 | — |
| extractive | 0 % [0 %–9 %] | 0 % / 0 % / 0 % | 0 % | 35.1 (32.8–36.0) | 28.2 (23.0–37.7) | 51.7 (49.0–53.1) | 20.1 (16.3–27.2) | 4.8 (4.6–5.2) | 8.22 (8.07–8.39) | 0.00 (0.00–0.00) | 308 | 2044.0 | political 35 |
| production | 65 % [50 %–78 %] | 0 % / 65 % / 0 % | 0 % | 38.9 (38.9–38.9) | 35.2 (23.4–51.0) | 45.1 (41.2–47.1) | 75.5 (63.8–86.0) | 92.8 (83.3–96.2) | 7.19 (7.10–7.28) | 0.00 (0.00–0.00) | 651 | 2054.0 | — |
| innovation | 100 % [91 %–100 %] | 0 % / 0 % / 100 % | 0 % | 39.1 (39.0–39.1) | 38.9 (24.1–57.4) | 37.7 (34.7–39.2) | 75.8 (61.6–87.2) | 81.9 (52.6–92.8) | 4.81 (4.77–4.90) | 0.00 (0.00–0.00) | 635 | 2054.0 | — |
| conservation | 85 % [71 %–93 %] | 85 % / 0 % / 0 % | 0 % | 47.0 (46.9–47.0) | 40.8 (26.1–58.7) | 30.1 (27.9–30.7) | 75.4 (62.0–86.5) | 66.8 (38.6–86.0) | 6.22 (6.17–6.29) | 0.00 (0.00–0.00) | 590 | 2054.0 | — |
| balanced | 100 % [91 %–100 %] | 100 % / 18 % / 0 % | 0 % | 43.4 (43.4–43.5) | 36.1 (24.1–54.1) | 38.9 (35.7–40.7) | 77.9 (67.2–88.5) | 89.5 (75.8–95.8) | 5.22 (5.15–5.35) | 0.00 (0.00–0.00) | 671 | 2054.0 | — |
| tech_tax | 0 % [0 %–9 %] | 0 % / 0 % / 0 % | 0 % | 38.1 (38.1–38.1) | 34.0 (24.7–43.6) | 26.2 (23.9–27.3) | 66.0 (53.1–75.0) | 29.9 (19.1–57.4) | 6.07 (6.02–6.13) | 0.00 (0.00–0.00) | 494 | 2054.0 | — |

Recorrido entre estrategias (máx − mín de las medianas): B 11.9, F 18.9, E 25.5, W 62.1.

## Nivel 3 (30 años)

Tasa de victoria con intervalo de Wilson al 95 %; rutas = % de semillas que cumplen cada ruta (con pisos); valores al final: mediana (p10–p90).

| Estrategia | Victoria | cons / prod / inno / eq | todas | B | F | E | W | St | c | D/Y | Puntaje | Fin (p50) | Derrotas |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| do_nothing | 0 % [0 %–9 %] | 0 % / 0 % / 0 % / 0 % | 0 % | 39.3 (39.3–39.3) | 36.0 (28.4–47.0) | 29.5 (26.5–30.7) | 52.6 (41.9–62.2) | 24.1 (12.5–41.8) | 5.67 (5.56–5.79) | 0.01 (0.01–0.01) | 576 | 2054.0 | — |
| green | 100 % [91 %–100 %] | 100 % / 0 % / 0 % / 68 % | 0 % | 45.4 (45.4–45.4) | 47.1 (36.7–54.1) | 25.9 (24.1–26.3) | 76.7 (68.2–82.2) | 57.7 (39.4–66.2) | 4.03 (3.98–4.09) | 0.01 (0.01–0.01) | 677 | 2054.0 | — |
| extractive | 0 % [0 %–9 %] | 0 % / 0 % / 0 % / 0 % | 0 % | 36.7 (36.1–36.8) | 33.4 (26.9–43.4) | 48.8 (45.5–52.2) | 18.6 (14.1–25.0) | 4.8 (4.5–4.9) | 6.77 (6.69–6.90) | 0.04 (0.03–0.05) | 462 | 2041.0 | political 40 |
| production | 98 % [87 %–100 %] | 0 % / 98 % / 0 % / 98 % | 0 % | 40.4 (40.4–40.4) | 38.4 (33.9–47.9) | 42.5 (40.6–43.6) | 73.9 (68.7–80.5) | 92.5 (89.2–94.4) | 6.04 (5.95–6.11) | 0.01 (0.01–0.01) | 768 | 2054.0 | — |
| innovation | 100 % [91 %–100 %] | 0 % / 10 % / 100 % / 98 % | 0 % | 40.5 (40.5–40.5) | 41.3 (33.5–48.0) | 34.9 (32.5–36.2) | 72.9 (64.9–78.2) | 75.0 (56.8–84.0) | 3.88 (3.81–3.94) | 0.01 (0.01–0.01) | 739 | 2054.0 | — |
| conservation | 100 % [91 %–100 %] | 100 % / 0 % / 0 % / 3 % | 0 % | 48.2 (48.2–48.3) | 41.2 (32.1–47.3) | 27.9 (26.1–28.4) | 70.7 (61.3–76.2) | 57.6 (40.1–68.8) | 5.20 (5.10–5.27) | 0.01 (0.01–0.01) | 661 | 2054.0 | — |
| balanced | 100 % [91 %–100 %] | 100 % / 80 % / 0 % / 100 % | 0 % | 44.7 (44.7–44.7) | 41.2 (33.5–48.0) | 37.0 (35.1–38.2) | 77.0 (71.7–82.2) | 89.5 (82.7–93.4) | 4.29 (4.22–4.33) | 0.01 (0.01–0.01) | 780 | 2054.0 | — |
| tech_tax | 0 % [0 %–9 %] | 0 % / 0 % / 0 % / 0 % | 0 % | 39.5 (39.5–39.5) | 37.6 (27.9–49.5) | 24.4 (22.1–25.0) | 63.4 (52.8–72.5) | 27.1 (18.0–42.7) | 4.92 (4.81–5.01) | 0.01 (0.01–0.01) | 609 | 2054.0 | — |

Recorrido entre estrategias (máx − mín de las medianas): B 11.6, F 13.6, E 24.3, W 58.4.

## Territorio (360 meses)

Tasa de victoria con intervalo de Wilson al 95 %; rutas = % de semillas que cumplen cada ruta (con pisos); valores al final: mediana (p10–p90).

| Estrategia | Victoria | cons / prod / inno | todas | B | F | E | W | St | c | D/Y | Puntaje | Fin (p50) | Derrotas |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| do_nothing | 0 % [0 %–16 %] | 0 % / 0 % / 0 % | 0 % | 34.0 (31.2–37.7) | 25.2 (18.9–28.9) | 27.5 (25.0–29.9) | 19.6 (9.4–26.7) | 4.7 (3.0–13.3) | 6.85 (6.65–6.97) | 0.00 (0.00–0.00) | 261 | 2041.9 | political 16, sustained 4 |
| conservation | 95 % [76 %–99 %] | 95 % / 0 % / 0 % | 0 % | 52.7 (49.6–56.9) | 54.5 (48.3–67.2) | 27.4 (26.7–29.2) | 88.4 (83.4–96.5) | 79.2 (72.0–85.5) | 5.43 (5.16–5.92) | 0.00 (0.00–0.02) | 653 | 2054.0 | — |
| production | 30 % [15 %–52 %] | 0 % / 30 % / 0 % | 0 % | 44.5 (40.5–48.9) | 39.6 (29.9–62.6) | 50.5 (48.5–53.4) | 76.7 (70.3–88.9) | 86.7 (80.8–91.3) | 7.29 (6.70–7.66) | 0.00 (0.00–0.01) | 618 | 2054.0 | — |
| innovation | 100 % [84 %–100 %] | 5 % / 0 % / 100 % | 0 % | 45.6 (42.8–50.8) | 50.3 (35.4–60.0) | 32.9 (31.0–35.1) | 87.0 (77.8–91.9) | 82.7 (68.4–89.2) | 3.93 (3.81–4.06) | 0.00 (0.00–0.02) | 679 | 2054.0 | — |
| settle_only | 0 % [0 %–16 %] | 0 % / 0 % / 0 % | 0 % | 46.4 (42.7–49.8) | 49.1 (39.8–62.5) | 31.9 (30.2–33.8) | 80.9 (74.0–88.0) | 70.3 (51.8–83.1) | 6.47 (5.54–6.92) | 0.00 (0.00–0.03) | 606 | 2054.0 | — |
| cheap_production | 50 % [30 %–70 %] | 0 % / 50 % / 0 % | 0 % | 45.8 (41.0–51.0) | 45.7 (36.3–63.1) | 36.8 (35.2–38.5) | 80.6 (73.4–89.0) | 86.4 (76.0–94.1) | 6.71 (5.80–7.06) | 0.00 (0.00–0.01) | 645 | 2054.0 | — |
| extractive | 10 % [3 %–30 %] | 0 % / 10 % / 0 % | 0 % | 44.4 (40.0–46.5) | 50.3 (35.8–68.1) | 53.0 (50.3–55.2) | 46.0 (32.6–63.5) | 11.4 (9.0–25.8) | 7.54 (6.74–7.95) | 0.00 (0.00–0.01) | 392 | 2054.0 | — |
| buy_everything | 10 % [3 %–30 %] | 0 % / 0 % / 10 % | 0 % | 44.0 (42.9–45.1) | 35.7 (21.8–45.8) | 26.9 (23.2–28.3) | 68.9 (54.0–76.0) | 37.6 (20.6–54.8) | 4.43 (4.36–4.50) | 0.00 (0.00–0.00) | 537 | 2054.0 | — |

Recorrido entre estrategias (máx − mín de las medianas): B 18.7, F 29.3, E 26.1, W 68.9.

## Banda de predicción (jugadores sintéticos)

Proporción de años en que `actualDirection` (src/components/tutorial/predictions.ts) da "sin cambio". Objetivo: 30–36 %.

| Nivel | años | B | E | c |
|---|---|---|---|---|
| N1 | 4500 | 100 % | 67 % | 63 % |
| N2 | 4460 | 100 % | 59 % | 57 % |
| N3 | 4439 | 100 % | 56 % | 66 % |

## Consistencia anual–mensual (N2, sin eventos)

Criterio activo (modelo 2.x).

| Estrategia | Año | Indicador | Anual | Mensual | Δ |
|---|---|---|---|---|---|
| do_nothing | 10 | B | 39.30 | 39.30 | 0.00 |
| do_nothing | 10 | F | 40.33 | 40.33 | -0.00 |
| do_nothing | 10 | E | 30.40 | 30.37 | -0.02 |
| do_nothing | 10 | W | 61.60 | 61.61 | 0.01 |
| do_nothing | 10 | St | 56.03 | 55.63 | -0.40 |
| do_nothing | 10 | c | 7.01 | 6.99 | -0.01 |
| do_nothing | 30 | B | 37.81 | 37.81 | 0.01 |
| do_nothing | 30 | F | 41.00 | 41.00 | -0.00 |
| do_nothing | 30 | E | 31.07 | 31.05 | -0.02 |
| do_nothing | 30 | W | 61.62 | 61.63 | 0.01 |
| do_nothing | 30 | St | 39.38 | 39.53 | 0.16 |
| do_nothing | 30 | c | 6.90 | 6.90 | 0.00 |
| green | 10 | B | 41.30 | 41.21 | -0.09 |
| green | 10 | F | 40.39 | 40.38 | -0.00 |
| green | 10 | E | 27.71 | 27.76 | 0.05 |
| green | 10 | W | 79.25 | 79.21 | -0.04 |
| green | 10 | St | 75.96 | 75.27 | -0.70 |
| green | 10 | c | 4.88 | 4.92 | 0.03 |
| green | 30 | B | 44.06 | 43.96 | -0.10 |
| green | 30 | F | 41.10 | 41.10 | -0.00 |
| green | 30 | E | 28.13 | 28.12 | -0.01 |
| green | 30 | W | 78.32 | 78.31 | -0.01 |
| green | 30 | St | 62.80 | 63.01 | 0.21 |
| green | 30 | c | 4.89 | 4.89 | 0.00 |
| extractive | 10 | B | 37.41 | 37.46 | 0.04 |
| extractive | 10 | F | 40.59 | 40.59 | 0.00 |
| extractive | 10 | E | 61.26 | 61.49 | 0.23 |
| extractive | 10 | W | 34.22 | 34.12 | -0.10 |
| extractive | 10 | St | 16.93 | 16.41 | -0.52 |
| extractive | 10 | c | 9.05 | 9.00 | -0.05 |
| extractive | 30 | B | 32.74 | 32.79 | 0.06 |
| extractive | 30 | F | 41.77 | 41.77 | -0.00 |
| extractive | 30 | E | 51.99 | 52.01 | 0.02 |
| extractive | 30 | W | 30.16 | 30.27 | 0.12 |
| extractive | 30 | St | 5.72 | 5.79 | 0.08 |
| extractive | 30 | c | 8.00 | 8.01 | 0.01 |

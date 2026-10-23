# Balance del modelo 2.0-dev (full)

Generado por `npm run sim:check` (scripts/sim-check.ts) el 2026-10-23, en 418 s. Modelo por juego: niveles 2.0-dev, Territorio 2.0-dev. Semillas: 40 por estrategia y nivel (3 niveles), 20 por estrategia (Territorio); 150 jugadores sintéticos por nivel. Criterios: 00_INDICE_v6.md §6; estrategias: scripts/harness/strategies.ts.

## Criterios

| Criterio | Estado | Valor | Umbral |
|---|---|---|---|
| `C1_do_nothing_never_wins` | PASS | 0.000 | = 0 % en cada nivel y en Territorio |
| `C2_targeted_wins` | FAIL | 0.300 | ≥ 70.0 % |
| `C3_no_strategy_wins_all` | PASS | 0.000 | ≤ 50.0 % por estrategia |
| `C4_shortcuts_closed` | FAIL | 1.000 | ≤ 5.0 % |
| `C5_strategy_decides` | PASS | 0.000 | ninguna tasa de victoria en (30.0 %, 70.0 %); valor = casos dentro |
| `C6_indicator_range` | FAIL | 3.357 | ≥ 15 puntos en B, F, E, W |
| `C7_prediction_band` | FAIL | 0.599 | "sin cambio" entre 30.0 % y 36.0 %; valor = máx |x − 33 %| |
| `C8_no_spurious_collapse` | PASS | 0.000 | ninguna quiebra salvo buy_everything (Territorio); valor = quiebras no permitidas |
| `C9_annual_monthly` | FAIL | 2.453 | |Δ| ≤ 1 en indicadores y ≤ 0.1 t en c (N2, sin eventos, años 10 y 30); valor = máx(|Δ|/umbral); solo modelo 2.x |

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
- Territorio extractive: 0.0 %
- Territorio buy_everything: 0.0 %

</details>

<details><summary>C6_indicator_range</summary>

- N1 B: 27.4 (extractive → green)
- N1 F: 20.5 (balanced → extractive)
- N1 E: 22.8 (tech_tax → extractive)
- N1 W: 3.4 (extractive → green) ✗
- N2 B: 31.7 (extractive → conservation)
- N2 F: 16.9 (balanced → extractive)
- N2 E: 23.4 (tech_tax → extractive)
- N2 W: 21.4 (extractive → green)
- N3 B: 30.8 (extractive → conservation)
- N3 F: 13.9 (balanced → extractive) ✗
- N3 E: 21.7 (tech_tax → extractive)
- N3 W: 22.6 (extractive → innovation)
- Territorio B: 31.0 (extractive → conservation)
- Territorio F: 25.3 (buy_everything → extractive)
- Territorio E: 32.6 (buy_everything → production)
- Territorio W: 26.7 (do_nothing → production)

</details>

<details><summary>C7_prediction_band</summary>

- N1 B: 92.8 % ✗
- N1 E: 68.8 % ✗
- N1 c: 63.1 % ✗
- N2 B: 92.8 % ✗
- N2 E: 59.9 % ✗
- N2 c: 56.8 % ✗
- N3 B: 92.9 % ✗
- N3 E: 56.3 % ✗
- N3 c: 66.4 % ✗

</details>

<details><summary>C9_annual_monthly</summary>

- peor St: extractive año 10, anual 44.66 vs mensual 42.21 (Δ -2.45)
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
| `C6_indicator_range` | FAIL | FAIL | 0.341 → 3.357 | improved |
| `C7_prediction_band` | FAIL | FAIL | 0.670 → 0.599 | improved |
| `C8_no_spurious_collapse` | PASS | PASS | 0.000 → 0.000 | same |
| `C9_annual_monthly` | SKIP | FAIL | 1.529 → 2.453 | worsened |

## Nivel 1 (30 años)

Tasa de victoria con intervalo de Wilson al 95 %; rutas = % de semillas que cumplen cada ruta (con pisos); valores al final: mediana (p10–p90).

| Estrategia | Victoria | cons / prod / inno | todas | B | F | E | W | St | c | D/Y | Puntaje | Fin (p50) | Derrotas |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| do_nothing | 0 % [0 %–9 %] | 0 % / 0 % / 0 % | 0 % | 39.0 (39.0–39.0) | 35.7 (34.3–37.6) | 26.4 (26.1–26.8) | 94.9 (93.9–95.5) | 95.0 (94.6–95.2) | 5.57 (5.55–5.59) | 0.00 (0.00–0.00) | 437 | 2054.0 | — |
| green | 100 % [91 %–100 %] | 100 % / 0 % / 100 % | 0 % | 55.2 (55.2–55.3) | 33.6 (32.0–35.2) | 24.2 (23.8–24.3) | 97.8 (97.1–98.5) | 95.0 (94.4–95.4) | 3.76 (3.74–3.77) | 0.38 (0.37–0.38) | 566 | 2054.0 | — |
| extractive | 0 % [0 %–9 %] | 0 % / 0 % / 0 % | 0 % | 27.8 (27.7–27.8) | 47.2 (45.1–48.7) | 46.4 (46.0–46.7) | 94.4 (93.4–95.2) | 91.0 (90.3–91.4) | 6.58 (6.55–6.62) | 0.16 (0.16–0.16) | 384 | 2054.0 | — |
| production | 100 % [91 %–100 %] | 0 % / 100 % / 0 % | 0 % | 41.8 (41.7–41.8) | 36.3 (34.6–38.1) | 40.9 (40.5–41.3) | 97.3 (96.3–97.9) | 97.1 (96.8–97.2) | 5.77 (5.75–5.80) | 0.01 (0.01–0.01) | 462 | 2054.0 | — |
| innovation | 100 % [91 %–100 %] | 0 % / 0 % / 100 % | 0 % | 42.0 (42.0–42.0) | 39.2 (37.5–41.1) | 31.7 (31.4–32.0) | 97.7 (96.6–98.1) | 96.7 (96.3–96.9) | 4.43 (4.41–4.45) | 0.00 (0.00–0.00) | 500 | 2054.0 | — |
| conservation | 100 % [91 %–100 %] | 100 % / 0 % / 0 % | 0 % | 54.7 (54.6–54.7) | 31.8 (30.2–33.8) | 27.0 (26.5–27.3) | 97.2 (96.1–98.0) | 95.3 (94.6–95.9) | 4.89 (4.87–4.91) | 0.05 (0.05–0.05) | 526 | 2054.0 | — |
| balanced | 100 % [91 %–100 %] | 100 % / 0 % / 100 % | 0 % | 53.2 (53.1–53.2) | 26.7 (25.2–28.6) | 32.8 (31.8–33.6) | 97.4 (96.4–98.1) | 96.3 (95.7–96.7) | 3.98 (3.96–4.00) | 0.35 (0.34–0.35) | 563 | 2054.0 | — |
| tech_tax | 100 % [91 %–100 %] | 0 % / 0 % / 100 % | 0 % | 39.8 (39.7–39.8) | 34.1 (32.7–36.0) | 23.6 (23.3–24.0) | 95.9 (95.0–96.4) | 94.7 (94.1–95.2) | 4.39 (4.38–4.40) | 0.00 (0.00–0.00) | 480 | 2054.0 | — |

Recorrido entre estrategias (máx − mín de las medianas): B 27.4, F 20.5, E 22.8, W 3.4.

## Nivel 2 (30 años)

Tasa de victoria con intervalo de Wilson al 95 %; rutas = % de semillas que cumplen cada ruta (con pisos); valores al final: mediana (p10–p90).

| Estrategia | Victoria | cons / prod / inno | todas | B | F | E | W | St | c | D/Y | Puntaje | Fin (p50) | Derrotas |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| do_nothing | 0 % [0 %–9 %] | 0 % / 0 % / 0 % | 0 % | 39.3 (39.2–39.4) | 38.4 (36.7–41.6) | 30.7 (30.2–31.6) | 57.6 (53.6–60.4) | 67.6 (63.1–71.2) | 6.93 (6.89–7.01) | 0.00 (0.00–0.00) | 553 | 2054.0 | — |
| green | 100 % [91 %–100 %] | 100 % / 0 % / 0 % | 0 % | 54.9 (54.8–54.9) | 37.5 (36.0–40.4) | 29.4 (28.9–30.4) | 75.7 (73.6–78.6) | 85.5 (82.8–87.1) | 4.94 (4.90–5.00) | 0.24 (0.23–0.24) | 668 | 2054.0 | — |
| extractive | 3 % [0 %–13 %] | 0 % / 3 % / 0 % | 0 % | 28.7 (28.6–28.8) | 48.5 (45.4–51.1) | 50.1 (48.3–51.9) | 54.3 (49.2–58.8) | 50.5 (44.2–58.7) | 8.03 (7.95–8.13) | 0.03 (0.03–0.03) | 500 | 2054.0 | — |
| production | 100 % [91 %–100 %] | 0 % / 100 % / 0 % | 0 % | 42.0 (42.0–42.1) | 38.3 (35.9–40.5) | 45.9 (44.2–47.9) | 72.0 (68.0–74.7) | 88.3 (85.7–89.9) | 7.18 (7.10–7.28) | 0.00 (0.00–0.00) | 619 | 2054.0 | — |
| innovation | 100 % [91 %–100 %] | 0 % / 3 % / 100 % | 0 % | 42.2 (42.1–42.2) | 41.6 (39.3–44.1) | 37.9 (36.9–39.6) | 74.8 (72.0–78.0) | 90.3 (87.9–91.6) | 4.81 (4.76–4.89) | 0.24 (0.23–0.24) | 665 | 2054.0 | — |
| conservation | 100 % [91 %–100 %] | 100 % / 0 % / 0 % | 0 % | 60.4 (60.3–60.5) | 35.8 (34.4–38.5) | 32.3 (31.9–33.0) | 71.4 (69.9–74.5) | 84.1 (81.1–85.9) | 6.22 (6.16–6.30) | 0.00 (0.00–0.00) | 648 | 2054.0 | — |
| balanced | 100 % [91 %–100 %] | 100 % / 45 % / 0 % | 0 % | 52.8 (52.7–52.9) | 31.6 (29.0–32.9) | 40.1 (38.2–42.1) | 74.3 (71.5–77.3) | 89.2 (85.9–90.6) | 5.23 (5.14–5.33) | 0.22 (0.22–0.23) | 669 | 2054.0 | — |
| tech_tax | 0 % [0 %–9 %] | 0 % / 0 % / 0 % | 0 % | 39.8 (39.7–39.8) | 35.4 (33.9–38.2) | 26.6 (26.1–27.7) | 60.0 (57.6–63.0) | 70.0 (65.3–73.3) | 6.07 (6.01–6.14) | 0.00 (0.00–0.00) | 574 | 2054.0 | — |

Recorrido entre estrategias (máx − mín de las medianas): B 31.7, F 16.9, E 23.4, W 21.4.

## Nivel 3 (30 años)

Tasa de victoria con intervalo de Wilson al 95 %; rutas = % de semillas que cumplen cada ruta (con pisos); valores al final: mediana (p10–p90).

| Estrategia | Victoria | cons / prod / inno / eq | todas | B | F | E | W | St | c | D/Y | Puntaje | Fin (p50) | Derrotas |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| do_nothing | 0 % [0 %–9 %] | 0 % / 0 % / 0 % / 0 % | 0 % | 39.5 (39.5–39.5) | 39.1 (36.9–40.1) | 30.4 (28.4–30.7) | 57.6 (54.4–60.1) | 66.7 (62.8–71.3) | 5.71 (5.59–5.81) | 0.02 (0.01–0.02) | 643 | 2054.0 | — |
| green | 100 % [91 %–100 %] | 100 % / 0 % / 0 % / 100 % | 0 % | 54.9 (54.9–54.9) | 37.0 (36.1–37.8) | 26.5 (25.2–27.5) | 69.5 (67.1–71.7) | 74.5 (72.1–76.9) | 4.02 (3.97–4.10) | 0.29 (0.27–0.31) | 706 | 2054.0 | — |
| extractive | 3 % [0 %–13 %] | 0 % / 3 % / 0 % / 0 % | 0 % | 29.5 (29.4–29.5) | 45.2 (42.6–46.9) | 46.3 (43.5–48.3) | 47.4 (40.9–52.2) | 41.4 (35.2–50.2) | 6.61 (6.48–6.73) | 0.03 (0.02–0.03) | 639 | 2054.0 | — |
| production | 100 % [91 %–100 %] | 0 % / 100 % / 0 % / 98 % | 0 % | 42.5 (42.5–42.5) | 38.1 (36.5–39.2) | 43.1 (41.0–43.9) | 67.1 (64.3–70.0) | 85.4 (82.6–87.2) | 6.03 (5.94–6.10) | 0.01 (0.01–0.01) | 732 | 2054.0 | — |
| innovation | 100 % [91 %–100 %] | 10 % / 13 % / 100 % / 100 % | 0 % | 42.6 (42.6–42.7) | 41.5 (40.3–42.7) | 34.9 (33.2–36.3) | 70.0 (67.1–72.5) | 84.7 (82.4–86.6) | 3.87 (3.80–3.93) | 0.17 (0.15–0.19) | 756 | 2054.0 | — |
| conservation | 100 % [91 %–100 %] | 100 % / 0 % / 0 % / 100 % | 0 % | 60.3 (60.3–60.3) | 36.4 (35.2–37.8) | 29.8 (28.4–30.5) | 66.5 (63.6–69.1) | 74.6 (71.2–78.1) | 5.21 (5.12–5.28) | 0.04 (0.03–0.04) | 692 | 2054.0 | — |
| balanced | 100 % [91 %–100 %] | 100 % / 83 % / 0 % / 100 % | 0 % | 52.7 (52.7–52.8) | 31.3 (30.4–32.5) | 37.4 (35.6–38.6) | 69.1 (66.6–71.7) | 81.8 (78.7–84.3) | 4.28 (4.20–4.35) | 0.18 (0.16–0.20) | 760 | 2054.0 | — |
| tech_tax | 0 % [0 %–9 %] | 0 % / 0 % / 0 % / 0 % | 0 % | 39.9 (39.9–40.0) | 35.9 (34.0–36.6) | 24.6 (23.1–25.0) | 56.4 (53.2–58.6) | 58.4 (53.7–62.8) | 4.92 (4.84–4.99) | 0.01 (0.01–0.01) | 646 | 2054.0 | — |

Recorrido entre estrategias (máx − mín de las medianas): B 30.8, F 13.9, E 21.7, W 22.6.

## Territorio (360 meses)

Tasa de victoria con intervalo de Wilson al 95 %; rutas = % de semillas que cumplen cada ruta (con pisos); valores al final: mediana (p10–p90).

| Estrategia | Victoria | cons / prod / inno | todas | B | F | E | W | St | c | D/Y | Puntaje | Fin (p50) | Derrotas |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| do_nothing | 0 % [0 %–16 %] | 0 % / 0 % / 0 % | 0 % | 36.9 (33.4–38.8) | 37.6 (34.3–41.1) | 30.3 (28.4–31.4) | 47.8 (39.2–54.1) | 52.3 (42.7–64.6) | 6.77 (6.67–6.90) | 0.00 (0.00–0.00) | 521 | 2054.0 | — |
| conservation | 100 % [84 %–100 %] | 100 % / 0 % / 0 % | 0 % | 62.6 (61.5–64.0) | 31.1 (28.0–34.5) | 27.6 (25.3–29.3) | 72.0 (67.6–76.8) | 79.9 (74.3–83.3) | 5.64 (5.02–5.89) | 0.45 (0.31–0.59) | 647 | 2054.0 | — |
| production | 30 % [15 %–52 %] | 0 % / 30 % / 0 % | 0 % | 38.5 (34.5–40.8) | 44.1 (39.9–47.3) | 48.9 (47.6–50.7) | 74.5 (70.4–79.7) | 88.2 (86.4–91.8) | 7.22 (6.32–7.70) | 0.23 (0.15–0.32) | 617 | 2054.0 | — |
| innovation | 100 % [84 %–100 %] | 0 % / 0 % / 100 % | 0 % | 46.2 (42.3–48.2) | 35.1 (31.4–36.8) | 31.6 (28.5–33.5) | 72.9 (68.9–79.5) | 84.9 (80.6–87.1) | 3.97 (3.84–4.07) | 0.52 (0.37–0.60) | 665 | 2054.0 | — |
| settle_only | 0 % [0 %–16 %] | 0 % / 0 % / 0 % | 0 % | 42.1 (40.1–44.1) | 35.8 (32.5–39.8) | 31.1 (29.5–32.4) | 64.5 (59.2–71.1) | 75.7 (71.5–81.9) | 6.46 (5.98–6.83) | 0.00 (0.00–0.03) | 588 | 2054.0 | — |
| cheap_production | 0 % [0 %–16 %] | 0 % / 0 % / 0 % | 0 % | 41.7 (39.6–44.3) | 31.0 (28.1–35.3) | 35.0 (33.9–37.4) | 63.4 (58.8–68.0) | 77.2 (73.6–82.8) | 6.77 (5.96–7.07) | 0.00 (0.00–0.01) | 581 | 2054.0 | — |
| extractive | 0 % [0 %–16 %] | 0 % / 0 % / 0 % | 0 % | 31.6 (27.7–33.6) | 44.6 (38.9–47.6) | 46.8 (44.2–48.8) | 55.6 (47.4–64.2) | 57.4 (50.3–68.9) | 7.55 (6.61–7.89) | 0.55 (0.48–0.65) | 520 | 2054.0 | — |
| buy_everything | 0 % [0 %–16 %] | 0 % / 0 % / 0 % | 0 % | 52.7 (50.9–55.2) | 19.3 (18.2–19.6) | 16.3 (11.1–18.1) | 49.6 (36.7–53.6) | 47.7 (25.3–54.1) | 3.15 (3.07–3.29) | 0.73 (0.69–0.91) | 570 | 2034.8 | sustained 20 |

Recorrido entre estrategias (máx − mín de las medianas): B 31.0, F 25.3, E 32.6, W 26.7.

## Banda de predicción (jugadores sintéticos)

Proporción de años en que `actualDirection` (src/components/tutorial/predictions.ts) da "sin cambio". Objetivo: 30–36 %.

| Nivel | años | B | E | c |
|---|---|---|---|---|
| N1 | 4500 | 93 % | 69 % | 63 % |
| N2 | 4500 | 93 % | 60 % | 57 % |
| N3 | 4482 | 93 % | 56 % | 66 % |

## Consistencia anual–mensual (N2, sin eventos)

Criterio activo (modelo 2.x).

| Estrategia | Año | Indicador | Anual | Mensual | Δ |
|---|---|---|---|---|---|
| do_nothing | 10 | B | 39.80 | 39.81 | 0.01 |
| do_nothing | 10 | F | 40.28 | 40.56 | 0.29 |
| do_nothing | 10 | E | 30.31 | 30.29 | -0.02 |
| do_nothing | 10 | W | 59.89 | 60.15 | 0.26 |
| do_nothing | 10 | St | 70.03 | 70.22 | 0.19 |
| do_nothing | 10 | c | 7.00 | 6.99 | -0.01 |
| do_nothing | 30 | B | 39.18 | 39.20 | 0.02 |
| do_nothing | 30 | F | 40.53 | 40.83 | 0.31 |
| do_nothing | 30 | E | 31.12 | 31.11 | -0.02 |
| do_nothing | 30 | W | 60.30 | 60.61 | 0.31 |
| do_nothing | 30 | St | 71.42 | 71.69 | 0.27 |
| do_nothing | 30 | c | 6.89 | 6.90 | 0.00 |
| green | 10 | B | 52.91 | 52.56 | -0.34 |
| green | 10 | F | 42.23 | 42.74 | 0.51 |
| green | 10 | E | 29.05 | 28.98 | -0.07 |
| green | 10 | W | 79.44 | 79.62 | 0.18 |
| green | 10 | St | 84.38 | 84.01 | -0.37 |
| green | 10 | c | 4.88 | 4.92 | 0.03 |
| green | 30 | B | 54.82 | 54.84 | 0.02 |
| green | 30 | F | 37.44 | 37.90 | 0.46 |
| green | 30 | E | 29.36 | 29.30 | -0.06 |
| green | 30 | W | 75.31 | 75.67 | 0.35 |
| green | 30 | St | 84.57 | 84.88 | 0.30 |
| green | 30 | c | 4.89 | 4.89 | 0.00 |
| extractive | 10 | B | 29.58 | 29.66 | 0.08 |
| extractive | 10 | F | 47.57 | 47.31 | -0.26 |
| extractive | 10 | E | 59.89 | 60.17 | 0.28 |
| extractive | 10 | W | 51.53 | 50.84 | -0.68 |
| extractive | 10 | St | 44.66 | 42.21 | -2.45 |
| extractive | 10 | c | 9.05 | 9.00 | -0.05 |
| extractive | 30 | B | 28.55 | 28.59 | 0.05 |
| extractive | 30 | F | 51.09 | 51.24 | 0.15 |
| extractive | 30 | E | 50.98 | 50.95 | -0.02 |
| extractive | 30 | W | 59.47 | 59.70 | 0.22 |
| extractive | 30 | St | 60.88 | 61.22 | 0.34 |
| extractive | 30 | c | 8.00 | 8.01 | 0.01 |

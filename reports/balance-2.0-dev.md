# Balance del modelo 2.0-dev (full)

Generado por `npm run sim:check` (scripts/sim-check.ts) el 2026-10-23, en 174 s. Modelo por juego: niveles 2.0-dev, Territorio 2.0-dev. Semillas: 40 por estrategia y nivel (3 niveles), 20 por estrategia (Territorio); 150 jugadores sintéticos por nivel. Criterios: 00_INDICE_v6.md §6; estrategias: scripts/harness/strategies.ts.

## Criterios

| Criterio | Estado | Valor | Umbral |
|---|---|---|---|
| `C1_do_nothing_never_wins` | PASS | 0.000 | = 0 % en cada nivel y en Territorio |
| `C2_targeted_wins` | FAIL | 0.350 | ≥ 70.0 % |
| `C3_no_strategy_wins_all` | PASS | 0.000 | ≤ 50.0 % por estrategia |
| `C4_shortcuts_closed` | FAIL | 1.000 | ≤ 5.0 % |
| `C5_strategy_decides` | FAIL | 1.000 | ninguna tasa de victoria en (30.0 %, 70.0 %); valor = casos dentro |
| `C6_indicator_range` | FAIL | 9.001 | ≥ 15 puntos en B, F, E, W |
| `C7_prediction_band` | FAIL | 0.599 | "sin cambio" entre 30.0 % y 36.0 %; valor = máx |x − 33 %| |
| `C8_no_spurious_collapse` | PASS | 0.000 | ninguna quiebra salvo buy_everything (Territorio); valor = quiebras no permitidas |
| `C9_annual_monthly` | FAIL | 1.279 | |Δ| ≤ 1 en indicadores y ≤ 0.1 t en c (N2, sin eventos, años 10 y 30); valor = máx(|Δ|/umbral); solo modelo 2.x |

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
- Territorio production→production: 35.0 % ✗
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
- Territorio cheap_production: 0.0 %
- Territorio extractive: 0.0 %
- Territorio buy_everything: 0.0 %

</details>

<details><summary>C5_strategy_decides</summary>

- Territorio production: 35.0 % ✗

</details>

<details><summary>C6_indicator_range</summary>

- N1 B: 27.4 (extractive → green)
- N1 F: 20.5 (balanced → extractive)
- N1 E: 22.9 (tech_tax → extractive)
- N1 W: 9.0 (extractive → production) ✗
- N2 B: 31.7 (extractive → conservation)
- N2 F: 16.8 (balanced → extractive)
- N2 E: 23.6 (tech_tax → extractive)
- N2 W: 44.4 (extractive → production)
- N3 B: 31.1 (extractive → conservation)
- N3 F: 12.6 (balanced → extractive) ✗
- N3 E: 22.6 (tech_tax → extractive)
- N3 W: 50.0 (extractive → innovation)
- Territorio B: 30.0 (extractive → conservation)
- Territorio F: 13.8 (conservation → production) ✗
- Territorio E: 21.8 (buy_everything → extractive)
- Territorio W: 50.6 (do_nothing → innovation)

</details>

<details><summary>C7_prediction_band</summary>

- N1 B: 92.8 % ✗
- N1 E: 68.6 % ✗
- N1 c: 63.2 % ✗
- N2 B: 92.8 % ✗
- N2 E: 60.2 % ✗
- N2 c: 57.0 % ✗
- N3 B: 92.9 % ✗
- N3 E: 55.9 % ✗
- N3 c: 66.1 % ✗

</details>

<details><summary>C9_annual_monthly</summary>

- peor St: green año 30, anual 65.29 vs mensual 66.57 (Δ 1.28)
- peor c: extractive año 10, anual 9.05 vs mensual 9.00 (Δ -0.05)

</details>

## Comparación con `reports/balance-latest.json`

Anterior: modelo 1.1 (full), 2026-10-22; contra sus criterios completos.

| Criterio | Antes | Ahora | Valor antes → ahora | Cambio |
|---|---|---|---|---|
| `C1_do_nothing_never_wins` | FAIL | PASS | 0.075 → 0.000 | improved |
| `C2_targeted_wins` | FAIL | FAIL | 0.000 → 0.350 | improved |
| `C3_no_strategy_wins_all` | PASS | PASS | 0.225 → 0.000 | improved |
| `C4_shortcuts_closed` | FAIL | FAIL | 0.350 → 1.000 | worsened |
| `C5_strategy_decides` | FAIL | FAIL | 5.000 → 1.000 | improved |
| `C6_indicator_range` | FAIL | FAIL | 0.341 → 9.001 | improved |
| `C7_prediction_band` | FAIL | FAIL | 0.670 → 0.599 | improved |
| `C8_no_spurious_collapse` | PASS | PASS | 0.000 → 0.000 | same |
| `C9_annual_monthly` | SKIP | FAIL | 1.529 → 1.279 | improved |

## Nivel 1 (30 años)

Tasa de victoria con intervalo de Wilson al 95 %; rutas = % de semillas que cumplen cada ruta (con pisos); valores al final: mediana (p10–p90).

| Estrategia | Victoria | cons / prod / inno | todas | B | F | E | W | St | c | D/Y | Puntaje | Fin (p50) | Derrotas |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| do_nothing | 0 % [0 %–9 %] | 0 % / 0 % / 0 % | 0 % | 39.0 (39.0–39.0) | 35.7 (34.3–37.6) | 26.5 (26.2–26.9) | 95.7 (94.8–96.2) | 74.9 (73.3–78.4) | 5.57 (5.55–5.59) | 0.00 (0.00–0.00) | 437 | 2054.0 | — |
| green | 0 % [0 %–9 %] | 0 % / 0 % / 0 % | 0 % | 55.2 (55.2–55.3) | 33.7 (32.1–35.3) | 24.7 (24.3–24.7) | 98.0 (97.4–98.7) | 84.5 (81.4–86.3) | 3.76 (3.74–3.78) | 0.00 (0.00–0.00) | 567 | 2054.0 | — |
| extractive | 0 % [0 %–9 %] | 0 % / 0 % / 0 % | 0 % | 27.8 (27.7–27.8) | 47.2 (45.2–48.8) | 46.7 (46.3–47.0) | 89.3 (87.9–90.4) | 67.5 (65.4–68.8) | 6.59 (6.55–6.62) | 0.00 (0.00–0.00) | 384 | 2054.0 | — |
| production | 100 % [91 %–100 %] | 0 % / 100 % / 0 % | 0 % | 41.8 (41.7–41.8) | 36.3 (34.7–38.1) | 41.1 (40.7–41.5) | 98.3 (97.3–98.6) | 98.6 (98.3–98.8) | 5.77 (5.75–5.80) | 0.00 (0.00–0.00) | 462 | 2054.0 | — |
| innovation | 100 % [91 %–100 %] | 0 % / 0 % / 100 % | 0 % | 42.0 (42.0–42.0) | 39.3 (37.5–41.2) | 31.8 (31.6–32.1) | 98.2 (97.3–98.6) | 92.9 (91.2–94.1) | 4.43 (4.42–4.45) | 0.00 (0.00–0.00) | 500 | 2054.0 | — |
| conservation | 100 % [91 %–100 %] | 100 % / 0 % / 0 % | 0 % | 54.7 (54.6–54.7) | 31.9 (30.3–33.8) | 27.1 (26.6–27.5) | 97.6 (96.6–98.3) | 88.2 (85.2–90.3) | 4.90 (4.87–4.92) | 0.00 (0.00–0.00) | 526 | 2054.0 | — |
| balanced | 0 % [0 %–9 %] | 0 % / 0 % / 0 % | 0 % | 53.2 (53.1–53.2) | 26.8 (25.3–28.7) | 33.3 (32.3–34.1) | 97.7 (96.7–98.4) | 95.2 (93.8–96.3) | 3.98 (3.96–4.00) | 0.00 (0.00–0.00) | 563 | 2054.0 | — |
| tech_tax | 100 % [91 %–100 %] | 0 % / 0 % / 100 % | 0 % | 39.8 (39.7–39.8) | 34.1 (32.8–36.0) | 23.8 (23.5–24.2) | 97.1 (96.1–97.4) | 77.4 (76.4–78.4) | 4.39 (4.38–4.41) | 0.00 (0.00–0.00) | 480 | 2054.0 | — |

Recorrido entre estrategias (máx − mín de las medianas): B 27.4, F 20.5, E 22.9, W 9.0.

## Nivel 2 (30 años)

Tasa de victoria con intervalo de Wilson al 95 %; rutas = % de semillas que cumplen cada ruta (con pisos); valores al final: mediana (p10–p90).

| Estrategia | Victoria | cons / prod / inno | todas | B | F | E | W | St | c | D/Y | Puntaje | Fin (p50) | Derrotas |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| do_nothing | 0 % [0 %–9 %] | 0 % / 0 % / 0 % | 0 % | 39.3 (39.2–39.4) | 38.4 (36.7–41.4) | 30.8 (30.4–31.1) | 59.3 (55.1–62.1) | 32.3 (26.2–37.5) | 6.92 (6.90–6.97) | 0.00 (0.00–0.00) | 479 | 2054.0 | — |
| green | 100 % [91 %–100 %] | 100 % / 0 % / 0 % | 0 % | 54.9 (54.8–54.9) | 37.6 (36.1–40.5) | 29.9 (29.3–30.8) | 77.6 (75.9–81.0) | 68.9 (61.7–73.1) | 4.94 (4.90–5.01) | 0.00 (0.00–0.00) | 622 | 2054.0 | — |
| extractive | 0 % [0 %–9 %] | 0 % / 0 % / 0 % | 0 % | 28.7 (28.6–28.8) | 48.5 (45.5–51.2) | 50.3 (48.5–52.1) | 34.7 (30.5–38.1) | 6.2 (5.6–7.6) | 8.04 (7.95–8.13) | 0.00 (0.00–0.00) | 332 | 2054.0 | — |
| production | 100 % [91 %–100 %] | 0 % / 100 % / 0 % | 0 % | 42.0 (42.0–42.1) | 38.3 (36.0–40.6) | 46.1 (44.4–48.1) | 79.1 (75.9–81.4) | 94.6 (93.2–95.1) | 7.19 (7.10–7.28) | 0.00 (0.00–0.00) | 668 | 2054.0 | — |
| innovation | 100 % [91 %–100 %] | 0 % / 15 % / 100 % | 0 % | 42.2 (42.1–42.2) | 41.8 (39.4–44.3) | 38.4 (37.4–40.1) | 79.0 (76.1–81.5) | 87.6 (81.8–89.6) | 4.81 (4.77–4.90) | 0.00 (0.00–0.00) | 661 | 2054.0 | — |
| conservation | 100 % [91 %–100 %] | 100 % / 0 % / 0 % | 0 % | 60.4 (60.3–60.5) | 35.8 (34.4–38.6) | 32.4 (32.0–33.2) | 74.2 (71.9–77.2) | 72.6 (66.3–76.4) | 6.22 (6.17–6.30) | 0.00 (0.00–0.00) | 620 | 2054.0 | — |
| balanced | 100 % [91 %–100 %] | 100 % / 65 % / 0 % | 0 % | 52.8 (52.7–52.9) | 31.7 (29.1–33.0) | 40.6 (38.7–42.6) | 76.7 (73.6–79.0) | 90.5 (86.3–92.1) | 5.23 (5.15–5.34) | 0.00 (0.00–0.00) | 683 | 2054.0 | — |
| tech_tax | 0 % [0 %–9 %] | 0 % / 0 % / 0 % | 0 % | 39.8 (39.7–39.8) | 35.4 (34.0–38.2) | 26.7 (26.3–27.6) | 67.4 (65.1–70.1) | 32.8 (28.7–38.7) | 6.07 (6.01–6.13) | 0.00 (0.00–0.00) | 503 | 2054.0 | — |

Recorrido entre estrategias (máx − mín de las medianas): B 31.7, F 16.8, E 23.6, W 44.4.

## Nivel 3 (30 años)

Tasa de victoria con intervalo de Wilson al 95 %; rutas = % de semillas que cumplen cada ruta (con pisos); valores al final: mediana (p10–p90).

| Estrategia | Victoria | cons / prod / inno / eq | todas | B | F | E | W | St | c | D/Y | Puntaje | Fin (p50) | Derrotas |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| do_nothing | 0 % [0 %–9 %] | 0 % / 0 % / 0 % / 0 % | 0 % | 39.5 (39.5–39.6) | 37.9 (34.4–39.6) | 29.9 (28.3–30.8) | 54.7 (50.2–58.9) | 26.8 (20.7–33.0) | 5.67 (5.57–5.79) | 0.01 (0.01–0.01) | 587 | 2054.0 | — |
| green | 100 % [91 %–100 %] | 100 % / 0 % / 0 % / 85 % | 0 % | 54.9 (54.9–54.9) | 37.2 (36.2–38.5) | 27.3 (25.4–27.8) | 71.9 (69.5–74.0) | 53.2 (48.9–58.1) | 4.03 (3.99–4.11) | 0.01 (0.01–0.01) | 673 | 2054.0 | — |
| extractive | 0 % [0 %–9 %] | 0 % / 0 % / 0 % / 0 % | 0 % | 29.2 (29.2–29.3) | 44.0 (41.8–46.0) | 47.1 (43.7–50.0) | 23.7 (19.9–27.0) | 4.8 (4.6–5.0) | 6.74 (6.66–6.82) | 0.03 (0.02–0.05) | 471 | 2043.0 | political 40 |
| production | 100 % [91 %–100 %] | 0 % / 100 % / 0 % / 100 % | 0 % | 42.5 (42.5–42.5) | 38.1 (36.5–39.2) | 43.1 (41.0–43.9) | 73.5 (71.2–75.8) | 92.4 (90.5–93.5) | 6.04 (5.95–6.11) | 0.01 (0.01–0.01) | 768 | 2054.0 | — |
| innovation | 100 % [91 %–100 %] | 10 % / 13 % / 100 % / 100 % | 0 % | 42.6 (42.6–42.7) | 41.7 (40.4–42.8) | 35.3 (33.6–36.7) | 73.6 (70.9–75.7) | 78.5 (75.2–82.2) | 3.88 (3.81–3.94) | 0.01 (0.01–0.01) | 753 | 2054.0 | — |
| conservation | 100 % [91 %–100 %] | 100 % / 0 % / 0 % / 98 % | 0 % | 60.3 (60.3–60.3) | 36.5 (34.9–37.8) | 29.9 (28.5–30.2) | 68.7 (65.8–70.8) | 60.4 (54.0–66.4) | 5.21 (5.15–5.29) | 0.01 (0.01–0.01) | 675 | 2054.0 | — |
| balanced | 100 % [91 %–100 %] | 100 % / 85 % / 0 % / 100 % | 0 % | 52.7 (52.7–52.8) | 31.4 (30.6–32.7) | 37.8 (36.1–39.0) | 71.3 (68.5–73.5) | 84.1 (80.8–87.3) | 4.29 (4.21–4.37) | 0.01 (0.01–0.01) | 770 | 2054.0 | — |
| tech_tax | 0 % [0 %–9 %] | 0 % / 0 % / 0 % / 0 % | 0 % | 40.0 (39.9–40.0) | 35.3 (32.8–36.7) | 24.5 (22.7–25.0) | 60.9 (55.7–63.6) | 23.2 (19.9–28.2) | 4.91 (4.81–5.01) | 0.01 (0.01–0.01) | 599 | 2054.0 | — |

Recorrido entre estrategias (máx − mín de las medianas): B 31.1, F 12.6, E 22.6, W 50.0.

## Territorio (360 meses)

Tasa de victoria con intervalo de Wilson al 95 %; rutas = % de semillas que cumplen cada ruta (con pisos); valores al final: mediana (p10–p90).

| Estrategia | Victoria | cons / prod / inno | todas | B | F | E | W | St | c | D/Y | Puntaje | Fin (p50) | Derrotas |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| do_nothing | 0 % [0 %–16 %] | 0 % / 0 % / 0 % | 0 % | 36.3 (31.2–39.1) | 37.4 (34.2–41.1) | 29.6 (28.1–31.4) | 26.6 (19.8–35.6) | 4.8 (3.4–5.0) | 6.80 (6.65–6.85) | 0.00 (0.00–0.00) | 282 | 2048.0 | political 19 |
| conservation | 100 % [84 %–100 %] | 100 % / 0 % / 0 % | 0 % | 62.7 (61.3–64.7) | 30.6 (28.1–35.4) | 28.9 (27.5–30.2) | 76.2 (72.6–81.4) | 63.3 (52.3–71.8) | 5.47 (4.98–5.76) | 0.01 (0.00–0.03) | 607 | 2054.0 | — |
| production | 35 % [18 %–57 %] | 0 % / 35 % / 0 % | 0 % | 38.4 (34.7–41.2) | 44.5 (41.3–47.9) | 49.4 (48.1–51.9) | 74.6 (69.4–84.5) | 82.2 (76.4–89.8) | 7.25 (6.72–7.70) | 0.00 (0.00–0.01) | 592 | 2054.0 | — |
| innovation | 100 % [84 %–100 %] | 0 % / 0 % / 100 % | 0 % | 45.8 (43.7–47.9) | 35.7 (32.3–38.5) | 32.7 (31.7–35.4) | 77.2 (74.5–82.7) | 72.3 (63.4–79.6) | 3.96 (3.86–4.07) | 0.00 (0.00–0.03) | 633 | 2054.0 | — |
| settle_only | 0 % [0 %–16 %] | 0 % / 0 % / 0 % | 0 % | 42.3 (41.0–43.8) | 35.4 (31.7–39.5) | 31.0 (29.1–31.8) | 72.1 (66.6–77.5) | 51.5 (42.8–65.3) | 6.38 (5.53–6.72) | 0.00 (0.00–0.02) | 542 | 2054.0 | — |
| cheap_production | 0 % [0 %–16 %] | 0 % / 0 % / 0 % | 0 % | 41.4 (39.7–44.3) | 31.9 (29.5–35.4) | 35.9 (34.3–37.1) | 70.9 (64.5–75.0) | 69.0 (58.8–80.6) | 6.66 (5.97–7.06) | 0.00 (0.00–0.01) | 573 | 2054.0 | — |
| extractive | 0 % [0 %–16 %] | 0 % / 0 % / 0 % | 0 % | 32.7 (28.4–35.7) | 43.6 (40.0–48.2) | 50.2 (47.4–52.6) | 39.0 (35.2–48.8) | 10.5 (8.0–12.9) | 7.30 (6.47–7.91) | 0.00 (0.00–0.01) | 360 | 2054.0 | — |
| buy_everything | 0 % [0 %–16 %] | 0 % / 0 % / 0 % | 0 % | 53.9 (53.0–54.0) | 32.6 (30.0–35.6) | 28.4 (27.0–30.3) | 67.9 (60.7–70.2) | 37.5 (27.4–42.4) | 4.43 (4.37–4.51) | 0.00 (0.00–0.00) | 549 | 2054.0 | — |

Recorrido entre estrategias (máx − mín de las medianas): B 30.0, F 13.8, E 21.8, W 50.6.

## Banda de predicción (jugadores sintéticos)

Proporción de años en que `actualDirection` (src/components/tutorial/predictions.ts) da "sin cambio". Objetivo: 30–36 %.

| Nivel | años | B | E | c |
|---|---|---|---|---|
| N1 | 4500 | 93 % | 69 % | 63 % |
| N2 | 4475 | 93 % | 60 % | 57 % |
| N3 | 4433 | 93 % | 56 % | 66 % |

## Consistencia anual–mensual (N2, sin eventos)

Criterio activo (modelo 2.x).

| Estrategia | Año | Indicador | Anual | Mensual | Δ |
|---|---|---|---|---|---|
| do_nothing | 10 | B | 39.80 | 39.81 | 0.01 |
| do_nothing | 10 | F | 40.31 | 40.60 | 0.29 |
| do_nothing | 10 | E | 30.46 | 30.44 | -0.02 |
| do_nothing | 10 | W | 61.80 | 62.06 | 0.26 |
| do_nothing | 10 | St | 56.17 | 56.09 | -0.07 |
| do_nothing | 10 | c | 7.01 | 6.99 | -0.01 |
| do_nothing | 30 | B | 39.18 | 39.20 | 0.02 |
| do_nothing | 30 | F | 40.57 | 40.88 | 0.31 |
| do_nothing | 30 | E | 31.27 | 31.26 | -0.02 |
| do_nothing | 30 | W | 62.87 | 63.19 | 0.32 |
| do_nothing | 30 | St | 41.54 | 42.37 | 0.83 |
| do_nothing | 30 | c | 6.90 | 6.90 | 0.00 |
| green | 10 | B | 52.91 | 52.56 | -0.34 |
| green | 10 | F | 42.27 | 42.77 | 0.51 |
| green | 10 | E | 29.19 | 29.13 | -0.06 |
| green | 10 | W | 81.21 | 81.35 | 0.14 |
| green | 10 | St | 78.94 | 78.16 | -0.78 |
| green | 10 | c | 4.88 | 4.92 | 0.03 |
| green | 30 | B | 54.82 | 54.84 | 0.02 |
| green | 30 | F | 37.55 | 38.03 | 0.48 |
| green | 30 | E | 29.80 | 29.85 | 0.04 |
| green | 30 | W | 77.18 | 77.62 | 0.44 |
| green | 30 | St | 65.29 | 66.57 | 1.28 |
| green | 30 | c | 4.89 | 4.89 | 0.00 |
| extractive | 10 | B | 29.58 | 29.66 | 0.08 |
| extractive | 10 | F | 47.61 | 47.35 | -0.26 |
| extractive | 10 | E | 60.05 | 60.33 | 0.28 |
| extractive | 10 | W | 37.86 | 37.22 | -0.65 |
| extractive | 10 | St | 16.66 | 16.04 | -0.62 |
| extractive | 10 | c | 9.05 | 9.00 | -0.05 |
| extractive | 30 | B | 28.55 | 28.59 | 0.05 |
| extractive | 30 | F | 51.14 | 51.30 | 0.16 |
| extractive | 30 | E | 51.17 | 51.17 | -0.00 |
| extractive | 30 | W | 37.97 | 38.21 | 0.24 |
| extractive | 30 | St | 7.75 | 7.86 | 0.11 |
| extractive | 30 | c | 8.00 | 8.01 | 0.01 |

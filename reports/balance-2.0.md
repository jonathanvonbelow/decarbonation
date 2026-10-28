# Balance del modelo 2.0 (full)

Generado por `npm run sim:check` (scripts/sim-check.ts) el 2026-10-28, en 601 s. Modelo por juego: niveles 2.0, Territorio 2.0. Semillas: 40 por estrategia y nivel (3 niveles), 20 por estrategia (Territorio); 150 jugadores sintéticos por nivel. Criterios: 00_INDICE_v6.md §6; estrategias: scripts/harness/strategies.ts.

## Criterios

| Criterio | Estado | Valor | Umbral |
|---|---|---|---|
| `C1_do_nothing_never_wins` | PASS | 0.000 | = 0 % en cada nivel y en Territorio |
| `C2_targeted_wins` | PASS | 0.800 | ≥ 70.0 % |
| `C3_no_strategy_wins_all` | PASS | 0.050 | ≤ 50.0 % por estrategia |
| `C4_shortcuts_closed` | PASS | 0.000 | ≤ 5.0 % |
| `C5_strategy_decides` | PASS | 0.000 | ninguna tasa de victoria en (30.0 %, 70.0 %); valor = casos dentro |
| `C6_indicator_range` | PASS | 16.847 | ≥ 15 puntos en B, F, E, W (excepto W en N1, ver C6_EXCLUDED) |
| `C7_prediction_band` | PASS | 0.023 | "sin cambio" entre 30.0 % y 36.0 %; valor = máx |x − 33 %| |
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
- N1 production→production: 92.5 %
- N1 innovation→innovation: 100.0 %
- N2 conservation→conservation: 100.0 %
- N2 production→production: 92.5 %
- N2 innovation→innovation: 100.0 %
- N3 conservation→conservation: 100.0 %
- N3 production→production: 85.0 %
- N3 innovation→innovation: 95.0 %
- Territorio conservation→conservation: 100.0 %
- Territorio production→production: 80.0 %
- Territorio innovation→innovation: 100.0 %

</details>

<details><summary>C3_no_strategy_wins_all</summary>

- N2 balanced: 5.0 %

</details>

<details><summary>C4_shortcuts_closed</summary>

- N1 tech_tax: 0.0 %
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

<details><summary>C6_indicator_range</summary>

- N1 B: 27.4 (extractive → green)
- N1 F: 22.9 (balanced → extractive)
- N1 E: 22.6 (tech_tax → extractive)
- N1 W: 4.7 (extractive → innovation) (excluido de C6)
- N2 B: 31.7 (extractive → conservation)
- N2 F: 18.3 (balanced → extractive)
- N2 E: 23.3 (tech_tax → extractive)
- N2 W: 25.7 (extractive → innovation)
- N3 B: 30.9 (extractive → conservation)
- N3 F: 16.8 (balanced → extractive)
- N3 E: 20.9 (tech_tax → extractive)
- N3 W: 26.4 (extractive → innovation)
- Territorio B: 30.6 (extractive → conservation)
- Territorio F: 26.5 (buy_everything → extractive)
- Territorio E: 30.2 (buy_everything → production)
- Territorio W: 38.5 (do_nothing → innovation)

</details>

<details><summary>C7_prediction_band</summary>

- N1 B: 33.5 %
- N1 E: 35.3 %
- N1 c: 32.4 %
- N2 B: 34.0 %
- N2 E: 32.7 %
- N2 c: 31.9 %
- N3 B: 33.7 %
- N3 E: 33.1 %
- N3 c: 30.7 %

</details>

<details><summary>C9_annual_monthly</summary>

- peor B: do_nothing año 10, anual 39.81 vs mensual 39.81 (Δ 0.00)
- peor c: do_nothing año 10, anual 6.99 vs mensual 6.99 (Δ 0.00)

</details>

## Comparación con `reports/balance-latest.json`

Anterior: modelo 2.0-dev (full), 2026-10-28; contra sus criterios completos.

| Criterio | Antes | Ahora | Valor antes → ahora | Cambio |
|---|---|---|---|---|
| `C1_do_nothing_never_wins` | PASS | PASS | 0.000 → 0.000 | same |
| `C2_targeted_wins` | PASS | PASS | 0.800 → 0.800 | same |
| `C3_no_strategy_wins_all` | PASS | PASS | 0.050 → 0.050 | same |
| `C4_shortcuts_closed` | PASS | PASS | 0.000 → 0.000 | same |
| `C5_strategy_decides` | PASS | PASS | 0.000 → 0.000 | same |
| `C6_indicator_range` | PASS | PASS | 16.847 → 16.847 | same |
| `C7_prediction_band` | PASS | PASS | 0.023 → 0.023 | same |
| `C8_no_spurious_collapse` | PASS | PASS | 0.000 → 0.000 | same |
| `C9_annual_monthly` | PASS | PASS | 0.000 → 0.000 | same |

## Nivel 1 (30 años)

Tasa de victoria con intervalo de Wilson al 95 %; rutas = % de semillas que cumplen cada ruta (con pisos); valores al final: mediana (p10–p90).

| Estrategia | Victoria | cons / prod / inno | todas | B | F | E | W | St | c | D/Y | Puntaje | Fin (p50) | Derrotas |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| do_nothing | 0 % [0 %–9 %] | 0 % / 0 % / 0 % | 0 % | 39.1 (39.0–39.1) | 35.6 (32.7–38.7) | 26.2 (25.7–26.6) | 94.2 (92.2–95.5) | 94.7 (94.1–95.1) | 5.57 (5.55–5.60) | 0.00 (0.00–0.00) | 337 | 2054.0 | — |
| green | 100 % [91 %–100 %] | 100 % / 0 % / 0 % | 0 % | 55.3 (55.2–55.3) | 32.8 (30.5–35.6) | 24.0 (23.5–24.2) | 96.5 (95.5–98.0) | 94.5 (93.9–95.1) | 3.75 (3.73–3.78) | 0.40 (0.39–0.40) | 536 | 2054.0 | — |
| extractive | 0 % [0 %–9 %] | 0 % / 0 % / 0 % | 0 % | 27.9 (27.8–28.0) | 47.6 (43.1–52.3) | 46.1 (45.6–46.6) | 92.8 (89.4–94.5) | 90.2 (89.2–90.9) | 6.59 (6.57–6.63) | 0.18 (0.18–0.18) | 244 | 2054.0 | — |
| production | 93 % [80 %–97 %] | 0 % / 93 % / 0 % | 0 % | 41.8 (41.8–41.9) | 35.4 (32.2–39.0) | 40.7 (40.1–41.1) | 97.2 (95.4–98.3) | 97.0 (96.8–97.2) | 5.77 (5.75–5.81) | 0.02 (0.02–0.02) | 354 | 2054.0 | — |
| innovation | 100 % [91 %–100 %] | 0 % / 0 % / 100 % | 0 % | 42.1 (42.0–42.1) | 39.4 (36.2–43.2) | 31.5 (31.1–31.8) | 97.5 (95.6–98.5) | 96.6 (96.2–96.8) | 4.42 (4.41–4.45) | 0.01 (0.01–0.01) | 443 | 2054.0 | — |
| conservation | 100 % [91 %–100 %] | 100 % / 0 % / 0 % | 0 % | 54.7 (54.7–54.8) | 31.3 (28.1–34.7) | 26.8 (26.0–27.4) | 96.7 (95.0–98.2) | 95.2 (94.2–95.6) | 4.90 (4.88–4.93) | 0.07 (0.06–0.07) | 451 | 2054.0 | — |
| balanced | 100 % [91 %–100 %] | 100 % / 0 % / 85 % | 0 % | 53.2 (53.1–53.2) | 24.6 (21.8–27.6) | 31.7 (29.6–33.1) | 95.7 (94.1–97.2) | 95.8 (94.6–96.1) | 3.97 (3.96–4.00) | 0.37 (0.37–0.37) | 522 | 2054.0 | — |
| tech_tax | 0 % [0 %–9 %] | 0 % / 0 % / 0 % | 0 % | 39.8 (39.8–39.9) | 33.9 (31.0–36.8) | 23.5 (22.9–23.8) | 94.6 (92.7–95.8) | 94.3 (93.3–94.9) | 4.38 (4.37–4.40) | 0.00 (0.00–0.00) | 425 | 2054.0 | — |

Recorrido entre estrategias (máx − mín de las medianas): B 27.4, F 22.9, E 22.6, W 4.7.

## Nivel 2 (30 años)

Tasa de victoria con intervalo de Wilson al 95 %; rutas = % de semillas que cumplen cada ruta (con pisos); valores al final: mediana (p10–p90).

| Estrategia | Victoria | cons / prod / inno | todas | B | F | E | W | St | c | D/Y | Puntaje | Fin (p50) | Derrotas |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| do_nothing | 0 % [0 %–9 %] | 0 % / 0 % / 0 % | 0 % | 39.4 (39.3–39.5) | 37.1 (33.6–40.8) | 30.5 (29.7–31.2) | 54.4 (48.9–59.3) | 65.9 (58.9–69.9) | 6.92 (6.90–7.00) | 0.00 (0.00–0.00) | 513 | 2054.0 | — |
| green | 100 % [91 %–100 %] | 100 % / 0 % / 0 % | 0 % | 54.9 (54.8–55.0) | 36.8 (34.2–39.8) | 29.2 (28.6–30.8) | 66.7 (62.7–70.4) | 77.9 (73.6–81.9) | 4.95 (4.90–5.03) | 0.27 (0.26–0.27) | 645 | 2054.0 | — |
| extractive | 0 % [0 %–9 %] | 0 % / 0 % / 0 % | 0 % | 28.8 (28.6–28.9) | 47.1 (43.7–51.9) | 49.6 (48.0–51.2) | 48.0 (41.5–54.1) | 43.4 (33.4–50.9) | 8.08 (7.98–8.19) | 0.05 (0.04–0.05) | 436 | 2054.0 | — |
| production | 93 % [80 %–97 %] | 0 % / 93 % / 0 % | 0 % | 42.1 (42.0–42.2) | 36.0 (32.1–40.4) | 45.9 (44.3–48.2) | 71.0 (65.9–75.2) | 88.1 (85.0–90.3) | 7.24 (7.15–7.35) | 0.00 (0.00–0.00) | 583 | 2054.0 | — |
| innovation | 100 % [91 %–100 %] | 0 % / 13 % / 100 % | 0 % | 42.2 (42.2–42.3) | 40.8 (35.7–44.7) | 37.7 (36.7–40.5) | 73.7 (67.9–77.8) | 89.4 (86.4–91.9) | 4.85 (4.78–4.93) | 0.26 (0.25–0.26) | 657 | 2054.0 | — |
| conservation | 100 % [91 %–100 %] | 100 % / 0 % / 0 % | 0 % | 60.4 (60.3–60.5) | 34.6 (30.0–38.0) | 32.1 (31.0–32.8) | 68.3 (62.7–71.9) | 81.8 (76.4–84.5) | 6.23 (6.19–6.32) | 0.00 (0.00–0.00) | 619 | 2054.0 | — |
| balanced | 85 % [71 %–93 %] | 85 % / 5 % / 83 % | 5 % | 52.8 (52.7–52.9) | 28.8 (24.3–32.0) | 39.2 (37.2–43.2) | 63.8 (56.6–69.5) | 82.5 (74.5–87.2) | 5.27 (5.19–5.38) | 0.25 (0.25–0.26) | 637 | 2054.0 | — |
| tech_tax | 0 % [0 %–9 %] | 0 % / 0 % / 0 % | 0 % | 39.8 (39.7–39.9) | 33.8 (30.4–37.1) | 26.3 (25.4–28.1) | 50.1 (45.2–54.4) | 57.9 (49.9–64.4) | 6.09 (6.02–6.16) | 0.00 (0.00–0.00) | 527 | 2054.0 | — |

Recorrido entre estrategias (máx − mín de las medianas): B 31.7, F 18.3, E 23.3, W 25.7.

## Nivel 3 (30 años)

Tasa de victoria con intervalo de Wilson al 95 %; rutas = % de semillas que cumplen cada ruta (con pisos); valores al final: mediana (p10–p90).

| Estrategia | Victoria | cons / prod / inno / eq | todas | B | F | E | W | St | c | D/Y | Puntaje | Fin (p50) | Derrotas |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| do_nothing | 0 % [0 %–9 %] | 0 % / 0 % / 0 % / 0 % | 0 % | 39.6 (39.5–39.6) | 37.0 (33.1–40.6) | 29.6 (27.2–31.0) | 53.6 (47.0–56.9) | 58.9 (49.1–65.3) | 5.62 (5.49–5.74) | 0.02 (0.02–0.02) | 588 | 2054.0 | — |
| green | 100 % [91 %–100 %] | 100 % / 0 % / 0 % / 0 % | 0 % | 54.9 (54.9–54.9) | 36.3 (34.0–39.6) | 25.9 (23.7–28.2) | 58.4 (52.2–62.6) | 59.9 (52.5–67.2) | 3.97 (3.91–4.07) | 0.37 (0.31–0.41) | 670 | 2054.0 | — |
| extractive | 0 % [0 %–9 %] | 0 % / 0 % / 0 % / 0 % | 0 % | 29.5 (29.4–29.6) | 44.4 (38.9–47.7) | 44.7 (40.5–49.2) | 40.1 (30.0–46.2) | 30.5 (22.2–40.6) | 6.55 (6.38–6.76) | 0.03 (0.03–0.05) | 568 | 2054.0 | — |
| production | 85 % [71 %–93 %] | 0 % / 85 % / 0 % / 0 % | 0 % | 42.6 (42.5–42.6) | 35.4 (30.9–39.2) | 42.0 (38.5–45.3) | 64.2 (57.2–70.3) | 82.0 (75.1–86.5) | 5.98 (5.81–6.13) | 0.02 (0.01–0.02) | 681 | 2054.0 | — |
| innovation | 95 % [83 %–99 %] | 0 % / 25 % / 95 % / 40 % | 0 % | 42.7 (42.6–42.7) | 39.9 (35.0–43.7) | 34.5 (31.2–37.5) | 66.4 (59.5–72.1) | 81.2 (75.1–85.5) | 3.85 (3.78–3.92) | 0.20 (0.18–0.24) | 736 | 2054.0 | — |
| conservation | 100 % [91 %–100 %] | 100 % / 0 % / 0 % / 0 % | 0 % | 60.3 (60.3–60.4) | 33.9 (30.9–38.5) | 29.0 (26.7–31.2) | 60.6 (55.2–66.5) | 67.7 (57.8–72.9) | 5.10 (4.98–5.22) | 0.05 (0.04–0.06) | 646 | 2054.0 | — |
| balanced | 100 % [91 %–100 %] | 100 % / 13 % / 0 % / 5 % | 0 % | 52.8 (52.8–52.8) | 27.5 (23.8–32.1) | 35.5 (31.8–39.3) | 54.6 (47.9–60.9) | 65.1 (53.6–73.3) | 4.24 (4.11–4.32) | 0.23 (0.21–0.27) | 708 | 2054.0 | — |
| tech_tax | 0 % [0 %–9 %] | 0 % / 0 % / 0 % / 0 % | 0 % | 40.0 (39.9–40.0) | 33.6 (29.7–37.2) | 23.8 (22.4–25.7) | 44.5 (37.9–47.7) | 38.2 (30.5–46.4) | 4.85 (4.80–4.96) | 0.01 (0.01–0.01) | 589 | 2054.0 | — |

Recorrido entre estrategias (máx − mín de las medianas): B 30.9, F 16.8, E 20.9, W 26.4.

## Territorio (360 meses)

Tasa de victoria con intervalo de Wilson al 95 %; rutas = % de semillas que cumplen cada ruta (con pisos); valores al final: mediana (p10–p90).

| Estrategia | Victoria | cons / prod / inno | todas | B | F | E | W | St | c | D/Y | Puntaje | Fin (p50) | Derrotas |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| do_nothing | 0 % [0 %–16 %] | 0 % / 0 % / 0 % | 0 % | 38.6 (36.4–39.8) | 36.7 (33.6–40.4) | 29.5 (27.8–30.4) | 41.8 (37.4–49.8) | 4.9 (4.9–5.0) | 6.87 (6.75–6.98) | 0.00 (0.00–0.00) | 426 | 2038.8 | political 20 |
| conservation | 100 % [84 %–100 %] | 100 % / 0 % / 5 % | 0 % | 62.1 (61.5–62.9) | 29.8 (27.7–33.1) | 27.8 (25.6–29.1) | 72.5 (69.1–76.5) | 78.8 (74.3–82.5) | 5.57 (5.06–5.90) | 0.40 (0.29–0.58) | 627 | 2054.0 | — |
| production | 80 % [58 %–92 %] | 0 % / 80 % / 0 % | 0 % | 38.3 (33.5–40.1) | 44.3 (39.7–50.7) | 48.9 (47.3–51.5) | 78.5 (75.6–85.5) | 90.3 (89.1–93.9) | 7.30 (6.52–7.70) | 0.24 (0.13–0.30) | 593 | 2054.0 | — |
| innovation | 100 % [84 %–100 %] | 0 % / 0 % / 100 % | 0 % | 45.4 (43.7–46.7) | 34.3 (28.4–38.3) | 31.6 (29.3–33.3) | 80.3 (75.3–84.2) | 88.8 (85.8–91.0) | 3.95 (3.80–4.09) | 0.49 (0.35–0.58) | 683 | 2054.0 | — |
| settle_only | 0 % [0 %–16 %] | 0 % / 0 % / 0 % | 0 % | 40.9 (39.7–42.6) | 36.0 (29.3–43.1) | 31.0 (29.8–32.3) | 72.4 (66.6–76.3) | 81.5 (75.6–85.6) | 6.48 (5.75–6.83) | 0.00 (0.00–0.03) | 578 | 2054.0 | — |
| cheap_production | 0 % [0 %–16 %] | 0 % / 0 % / 0 % | 0 % | 40.5 (39.4–41.9) | 30.2 (25.4–36.4) | 34.9 (33.3–36.5) | 70.1 (63.0–74.3) | 81.3 (76.4–86.0) | 6.59 (5.88–7.02) | 0.00 (0.00–0.02) | 573 | 2054.0 | — |
| extractive | 0 % [0 %–16 %] | 0 % / 0 % / 0 % | 0 % | 31.5 (27.5–32.8) | 45.4 (36.6–49.8) | 47.5 (45.4–49.7) | 59.2 (52.1–70.7) | 65.9 (56.0–77.6) | 7.53 (6.53–7.89) | 0.54 (0.46–0.60) | 501 | 2054.0 | — |
| buy_everything | 0 % [0 %–16 %] | 0 % / 0 % / 0 % | 0 % | 52.5 (49.7–54.3) | 18.9 (17.5–19.7) | 18.7 (15.5–19.6) | 45.9 (37.9–53.4) | 50.0 (38.7–60.1) | 3.35 (3.14–3.64) | 0.69 (0.63–0.76) | 580 | 2033.3 | sustained 20 |

Recorrido entre estrategias (máx − mín de las medianas): B 30.6, F 26.5, E 30.2, W 38.5.

## Banda de predicción (jugadores sintéticos)

Proporción de años en que `actualDirection` (src/components/tutorial/predictions.ts) da "sin cambio". Objetivo: 30–36 %.

| Nivel | años | B | E | c |
|---|---|---|---|---|
| N1 | 4500 | 34 % | 35 % | 32 % |
| N2 | 4500 | 34 % | 33 % | 32 % |
| N3 | 4436 | 34 % | 33 % | 31 % |

## Consistencia anual–mensual (N2, sin eventos)

Criterio activo (modelo 2.x).

| Estrategia | Año | Indicador | Anual | Mensual | Δ |
|---|---|---|---|---|---|
| do_nothing | 10 | B | 39.81 | 39.81 | 0.00 |
| do_nothing | 10 | F | 40.66 | 40.66 | 0.00 |
| do_nothing | 10 | E | 30.29 | 30.29 | 0.00 |
| do_nothing | 10 | W | 59.92 | 59.92 | 0.00 |
| do_nothing | 10 | St | 70.09 | 70.09 | 0.00 |
| do_nothing | 10 | c | 6.99 | 6.99 | 0.00 |
| do_nothing | 30 | B | 39.20 | 39.20 | 0.00 |
| do_nothing | 30 | F | 40.94 | 40.94 | 0.00 |
| do_nothing | 30 | E | 31.11 | 31.11 | 0.00 |
| do_nothing | 30 | W | 59.98 | 59.98 | 0.00 |
| do_nothing | 30 | St | 71.22 | 71.22 | 0.00 |
| do_nothing | 30 | c | 6.90 | 6.90 | 0.00 |
| green | 10 | B | 52.56 | 52.56 | 0.00 |
| green | 10 | F | 43.35 | 43.35 | 0.00 |
| green | 10 | E | 28.99 | 28.99 | 0.00 |
| green | 10 | W | 68.48 | 68.48 | 0.00 |
| green | 10 | St | 77.92 | 77.92 | 0.00 |
| green | 10 | c | 4.92 | 4.92 | 0.00 |
| green | 30 | B | 54.84 | 54.84 | 0.00 |
| green | 30 | F | 37.51 | 37.51 | 0.00 |
| green | 30 | E | 29.29 | 29.29 | 0.00 |
| green | 30 | W | 66.84 | 66.84 | 0.00 |
| green | 30 | St | 78.44 | 78.44 | 0.00 |
| green | 30 | c | 4.89 | 4.89 | 0.00 |
| extractive | 10 | B | 29.66 | 29.66 | 0.00 |
| extractive | 10 | F | 47.03 | 47.03 | 0.00 |
| extractive | 10 | E | 60.16 | 60.16 | 0.00 |
| extractive | 10 | W | 47.91 | 47.91 | 0.00 |
| extractive | 10 | St | 39.52 | 39.52 | 0.00 |
| extractive | 10 | c | 9.00 | 9.00 | 0.00 |
| extractive | 30 | B | 28.59 | 28.59 | 0.00 |
| extractive | 30 | F | 52.22 | 52.22 | 0.00 |
| extractive | 30 | E | 50.95 | 50.95 | 0.00 |
| extractive | 30 | W | 56.30 | 56.30 | 0.00 |
| extractive | 30 | St | 57.06 | 57.06 | 0.00 |
| extractive | 30 | c | 8.01 | 8.01 | 0.00 |

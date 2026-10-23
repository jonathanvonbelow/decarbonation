# Balance del modelo 2.0-dev (full)

Generado por `npm run sim:check` (scripts/sim-check.ts) el 2026-10-23, en 297 s. Modelo por juego: niveles 2.0-dev, Territorio 2.0-dev. Semillas: 40 por estrategia y nivel (3 niveles), 20 por estrategia (Territorio); 150 jugadores sintéticos por nivel. Criterios: 00_INDICE_v6.md §6; estrategias: scripts/harness/strategies.ts.

## Criterios

| Criterio | Estado | Valor | Umbral |
|---|---|---|---|
| `C1_do_nothing_never_wins` | FAIL | 0.075 | = 0 % en cada nivel y en Territorio |
| `C2_targeted_wins` | FAIL | 0.100 | ≥ 70.0 % |
| `C3_no_strategy_wins_all` | PASS | 0.000 | ≤ 50.0 % por estrategia |
| `C4_shortcuts_closed` | FAIL | 1.000 | ≤ 5.0 % |
| `C5_strategy_decides` | FAIL | 2.000 | ninguna tasa de victoria en (30.0 %, 70.0 %); valor = casos dentro |
| `C6_indicator_range` | FAIL | 0.911 | ≥ 15 puntos en B, F, E, W |
| `C7_prediction_band` | FAIL | 0.670 | "sin cambio" entre 30.0 % y 36.0 %; valor = máx |x − 33 %| |
| `C8_no_spurious_collapse` | PASS | 0.000 | ninguna quiebra salvo buy_everything (Territorio); valor = quiebras no permitidas |
| `C9_annual_monthly` | PASS | 0.710 | |Δ| ≤ 1 en indicadores y ≤ 0.1 t en c (N2, sin eventos, años 10 y 30); valor = máx(|Δ|/umbral); solo modelo 2.x |

<details><summary>C1_do_nothing_never_wins</summary>

- N1: 7.5 %
- N2: 2.5 %
- N3: 7.5 %
- Territorio: 0.0 %

</details>

<details><summary>C2_targeted_wins</summary>

- N1 conservation→conservation: 100.0 %
- N1 production→production: 22.5 % ✗
- N1 innovation→innovation: 100.0 %
- N2 conservation→conservation: 87.5 %
- N2 production→production: 10.0 % ✗
- N2 innovation→innovation: 72.5 %
- N3 conservation→conservation: 100.0 %
- N3 production→production: 15.0 % ✗
- N3 innovation→innovation: 100.0 %
- Territorio conservation→conservation: 95.0 %
- Territorio production→production: 35.0 % ✗
- Territorio innovation→innovation: 100.0 %

</details>

<details><summary>C4_shortcuts_closed</summary>

- N1 tech_tax: 100.0 % ✗
- N1 extractive: 0.0 %
- N2 tech_tax: 10.0 % ✗
- N2 extractive: 0.0 %
- N3 tech_tax: 12.5 % ✗
- N3 extractive: 0.0 %
- Territorio settle_only: 0.0 %
- Territorio cheap_production: 35.0 % ✗
- Territorio extractive: 20.0 % ✗
- Territorio buy_everything: 5.0 %

</details>

<details><summary>C5_strategy_decides</summary>

- Territorio production: 35.0 % ✗
- Territorio cheap_production: 35.0 % ✗

</details>

<details><summary>C6_indicator_range</summary>

- N1 B: 12.1 (extractive → green) ✗
- N1 F: 13.5 (extractive → green) ✗
- N1 E: 0.9 (tech_tax → extractive) ✗
- N1 W: 25.4 (extractive → green)
- N2 B: 14.2 (extractive → conservation) ✗
- N2 F: 19.7 (extractive → green)
- N2 E: 7.4 (extractive → innovation) ✗
- N2 W: 45.6 (extractive → green)
- N3 B: 13.9 (extractive → conservation) ✗
- N3 F: 12.8 (extractive → green) ✗
- N3 E: 8.0 (extractive → innovation) ✗
- N3 W: 41.2 (extractive → green)
- Territorio B: 16.5 (do_nothing → conservation)
- Territorio F: 25.3 (do_nothing → conservation)
- Territorio E: 11.4 (do_nothing → innovation) ✗
- Territorio W: 71.6 (do_nothing → conservation)

</details>

<details><summary>C7_prediction_band</summary>

- N1 B: 100.0 % ✗
- N1 E: 100.0 % ✗
- N1 c: 63.2 % ✗
- N2 B: 100.0 % ✗
- N2 E: 90.3 % ✗
- N2 c: 56.6 % ✗
- N3 B: 100.0 % ✗
- N3 E: 85.8 % ✗
- N3 c: 65.1 % ✗

</details>

<details><summary>C9_annual_monthly</summary>

- peor W: extractive año 10, anual 32.65 vs mensual 33.36 (Δ 0.71)
- peor c: extractive año 10, anual 9.05 vs mensual 9.00 (Δ -0.05)

</details>

## Comparación con `reports/balance-latest.json`

Anterior: modelo 1.1 (full), 2026-10-22; contra sus criterios completos.

| Criterio | Antes | Ahora | Valor antes → ahora | Cambio |
|---|---|---|---|---|
| `C1_do_nothing_never_wins` | FAIL | FAIL | 0.075 → 0.075 | same |
| `C2_targeted_wins` | FAIL | FAIL | 0.000 → 0.100 | improved |
| `C3_no_strategy_wins_all` | PASS | PASS | 0.225 → 0.000 | improved |
| `C4_shortcuts_closed` | FAIL | FAIL | 0.350 → 1.000 | worsened |
| `C5_strategy_decides` | FAIL | FAIL | 5.000 → 2.000 | improved |
| `C6_indicator_range` | FAIL | FAIL | 0.341 → 0.911 | improved |
| `C7_prediction_band` | FAIL | FAIL | 0.670 → 0.670 | same |
| `C8_no_spurious_collapse` | PASS | PASS | 0.000 → 0.000 | same |
| `C9_annual_monthly` | SKIP | PASS | 1.529 → 0.710 | improved |

## Nivel 1 (30 años)

Tasa de victoria con intervalo de Wilson al 95 %; rutas = % de semillas que cumplen cada ruta (con pisos); valores al final: mediana (p10–p90).

| Estrategia | Victoria | cons / prod / inno | todas | B | F | E | W | St | c | D/Y | Puntaje | Fin (p50) | Derrotas |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| do_nothing | 8 % [3 %–20 %] | 0 % / 8 % / 0 % | 0 % | 38.7 (38.7–38.7) | 31.6 (24.6–36.8) | 25.1 (25.1–25.1) | 19.2 (16.1–22.2) | 84.9 (83.7–87.6) | 5.57 (5.55–5.59) | 0.00 (0.00–0.00) | 434 | 2054.0 | — |
| green | 0 % [0 %–9 %] | 0 % / 0 % / 0 % | 0 % | 45.4 (45.4–45.4) | 41.9 (31.8–48.1) | 25.0 (25.0–25.0) | 43.1 (40.0–79.3) | 85.3 (83.7–89.0) | 3.76 (3.74–3.77) | 0.00 (0.00–0.00) | 528 | 2054.0 | — |
| extractive | 0 % [0 %–9 %] | 0 % / 0 % / 0 % | 0 % | 33.3 (33.3–33.3) | 28.4 (21.8–36.1) | 25.9 (25.9–25.9) | 17.7 (13.7–20.2) | 81.5 (81.1–81.9) | 6.59 (6.55–6.62) | 0.00 (0.00–0.00) | 375 | 2054.0 | — |
| production | 23 % [12 %–38 %] | 0 % / 23 % / 0 % | 0 % | 39.8 (39.8–39.8) | 32.9 (25.1–47.8) | 25.7 (25.7–25.7) | 20.0 (16.1–47.2) | 89.5 (88.9–91.7) | 5.77 (5.75–5.80) | 0.00 (0.00–0.00) | 431 | 2054.0 | — |
| innovation | 100 % [91 %–100 %] | 0 % / 23 % / 100 % | 0 % | 40.0 (40.0–40.0) | 32.8 (25.0–47.6) | 25.4 (25.4–25.4) | 28.3 (24.4–55.5) | 86.8 (85.6–91.7) | 4.43 (4.42–4.45) | 0.00 (0.00–0.00) | 482 | 2054.0 | — |
| conservation | 100 % [91 %–100 %] | 100 % / 23 % / 0 % | 0 % | 45.3 (45.2–45.3) | 32.9 (25.1–47.7) | 25.1 (25.1–25.1) | 28.5 (24.6–55.7) | 87.6 (86.4–92.6) | 4.89 (4.87–4.91) | 0.00 (0.00–0.00) | 485 | 2054.0 | — |
| balanced | 0 % [0 %–9 %] | 0 % / 0 % / 0 % | 0 % | 44.7 (44.7–44.7) | 32.7 (24.9–47.4) | 25.6 (25.6–25.6) | 36.7 (32.8–63.9) | 87.0 (86.0–89.3) | 3.97 (3.96–3.99) | 0.00 (0.00–0.00) | 518 | 2054.0 | — |
| tech_tax | 100 % [91 %–100 %] | 0 % / 0 % / 100 % | 0 % | 39.1 (39.1–39.1) | 31.6 (24.6–36.8) | 25.0 (25.0–25.0) | 27.5 (24.4–30.5) | 85.1 (84.3–86.5) | 4.39 (4.38–4.41) | 0.00 (0.00–0.00) | 479 | 2054.0 | — |

Recorrido entre estrategias (máx − mín de las medianas): B 12.1, F 13.5, E 0.9, W 25.4.

## Nivel 2 (30 años)

Tasa de victoria con intervalo de Wilson al 95 %; rutas = % de semillas que cumplen cada ruta (con pisos); valores al final: mediana (p10–p90).

| Estrategia | Victoria | cons / prod / inno | todas | B | F | E | W | St | c | D/Y | Puntaje | Fin (p50) | Derrotas |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| do_nothing | 3 % [0 %–13 %] | 0 % / 3 % / 0 % | 0 % | 37.9 (37.8–37.9) | 32.3 (22.8–41.4) | 30.1 (26.8–36.4) | 15.6 (10.5–24.1) | 60.2 (58.3–65.6) | 6.94 (6.90–7.02) | 0.00 (0.00–0.00) | 350 | 2054.0 | — |
| green | 95 % [83 %–99 %] | 95 % / 55 % / 0 % | 0 % | 44.1 (44.1–44.1) | 47.2 (35.3–63.3) | 32.7 (26.8–40.0) | 61.0 (37.3–84.6) | 62.7 (60.3–64.0) | 4.94 (4.89–5.00) | 0.00 (0.00–0.00) | 627 | 2054.0 | — |
| extractive | 0 % [0 %–9 %] | 0 % / 0 % / 0 % | 0 % | 32.8 (32.8–32.8) | 27.5 (19.4–37.2) | 26.0 (21.6–35.3) | 15.3 (9.7–24.1) | 54.9 (54.0–56.8) | 8.05 (7.95–8.13) | 0.00 (0.00–0.00) | 281 | 2054.0 | — |
| production | 10 % [4 %–23 %] | 0 % / 10 % / 0 % | 0 % | 38.9 (38.9–38.9) | 34.8 (23.1–50.6) | 27.4 (22.5–37.2) | 17.4 (12.4–51.7) | 61.7 (61.0–68.2) | 7.19 (7.10–7.28) | 0.00 (0.00–0.00) | 416 | 2054.0 | — |
| innovation | 73 % [57 %–84 %] | 0 % / 50 % / 73 % | 0 % | 39.1 (39.0–39.1) | 38.8 (24.0–57.3) | 33.4 (26.9–48.8) | 25.2 (21.0–67.1) | 67.5 (64.2–71.2) | 4.81 (4.77–4.90) | 0.00 (0.00–0.00) | 500 | 2054.0 | — |
| conservation | 88 % [74 %–95 %] | 88 % / 33 % / 0 % | 0 % | 47.0 (46.9–47.0) | 40.7 (26.2–58.6) | 30.1 (26.8–36.4) | 26.6 (22.0–68.9) | 64.5 (62.5–68.2) | 6.22 (6.17–6.30) | 0.00 (0.00–0.00) | 497 | 2054.0 | — |
| balanced | 95 % [83 %–99 %] | 95 % / 33 % / 0 % | 0 % | 43.4 (43.4–43.5) | 35.9 (23.9–53.7) | 30.0 (22.3–49.0) | 34.7 (30.2–76.9) | 61.0 (60.0–64.3) | 5.22 (5.15–5.35) | 0.00 (0.00–0.00) | 554 | 2054.0 | — |
| tech_tax | 10 % [4 %–23 %] | 0 % / 10 % / 0 % | 0 % | 38.1 (38.1–38.1) | 34.1 (24.7–43.7) | 32.7 (26.8–40.0) | 16.6 (11.8–45.5) | 60.4 (58.5–67.6) | 6.07 (6.02–6.14) | 0.00 (0.00–0.00) | 398 | 2054.0 | — |

Recorrido entre estrategias (máx − mín de las medianas): B 14.2, F 19.7, E 7.4, W 45.6.

## Nivel 3 (30 años)

Tasa de victoria con intervalo de Wilson al 95 %; rutas = % de semillas que cumplen cada ruta (con pisos); valores al final: mediana (p10–p90).

| Estrategia | Victoria | cons / prod / inno / eq | todas | B | F | E | W | St | c | D/Y | Puntaje | Fin (p50) | Derrotas |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| do_nothing | 8 % [3 %–20 %] | 0 % / 8 % / 0 % / 0 % | 0 % | 39.3 (39.3–39.3) | 35.0 (28.0–47.5) | 21.7 (14.3–30.1) | 10.6 (4.1–37.6) | 59.8 (58.0–64.8) | 5.69 (5.56–5.82) | 0.01 (0.01–0.01) | 496 | 2054.0 | — |
| green | 100 % [91 %–100 %] | 100 % / 15 % / 0 % / 43 % | 0 % | 45.4 (45.4–45.4) | 47.1 (35.2–54.3) | 24.3 (17.1–34.2) | 48.1 (31.0–76.0) | 61.1 (57.6–63.9) | 4.03 (3.91–4.10) | 0.01 (0.01–0.01) | 665 | 2054.0 | — |
| extractive | 0 % [0 %–9 %] | 0 % / 0 % / 0 % / 0 % | 0 % | 34.4 (34.4–34.4) | 34.3 (26.9–42.0) | 18.0 (13.7–27.7) | 6.9 (2.4–17.1) | 54.6 (53.9–55.2) | 6.57 (6.45–6.72) | 0.01 (0.01–0.01) | 508 | 2054.0 | — |
| production | 15 % [7 %–29 %] | 0 % / 15 % / 0 % / 0 % | 0 % | 40.4 (40.4–40.4) | 38.3 (28.7–50.6) | 23.6 (16.1–31.9) | 15.5 (8.1–45.1) | 61.0 (60.2–65.5) | 6.03 (5.87–6.13) | 0.01 (0.01–0.01) | 601 | 2054.0 | — |
| innovation | 100 % [91 %–100 %] | 0 % / 23 % / 100 % / 18 % | 0 % | 40.5 (40.5–40.5) | 38.3 (30.7–54.3) | 26.0 (18.6–35.1) | 21.1 (15.6–61.8) | 66.1 (63.4–70.6) | 3.88 (3.76–3.96) | 0.01 (0.01–0.01) | 630 | 2054.0 | — |
| conservation | 100 % [91 %–100 %] | 100 % / 5 % / 0 % / 3 % | 0 % | 48.2 (48.2–48.3) | 41.0 (29.3–50.0) | 21.7 (16.0–29.3) | 21.1 (13.6–55.3) | 63.6 (61.1–66.4) | 5.18 (5.06–5.29) | 0.01 (0.01–0.01) | 586 | 2054.0 | — |
| balanced | 100 % [91 %–100 %] | 100 % / 18 % / 0 % / 28 % | 0 % | 44.7 (44.7–44.7) | 38.2 (31.9–54.1) | 25.9 (17.8–35.3) | 31.7 (25.5–70.1) | 60.4 (59.7–63.1) | 4.29 (4.15–4.36) | 0.01 (0.01–0.01) | 681 | 2054.0 | — |
| tech_tax | 13 % [5 %–26 %] | 0 % / 13 % / 0 % / 0 % | 0 % | 39.5 (39.5–39.5) | 36.5 (28.0–46.8) | 24.1 (15.9–32.2) | 11.4 (4.7–39.7) | 59.1 (57.5–62.1) | 4.93 (4.78–5.02) | 0.01 (0.01–0.01) | 531 | 2054.0 | — |

Recorrido entre estrategias (máx − mín de las medianas): B 13.9, F 12.8, E 8.0, W 41.2.

## Territorio (360 meses)

Tasa de victoria con intervalo de Wilson al 95 %; rutas = % de semillas que cumplen cada ruta (con pisos); valores al final: mediana (p10–p90).

| Estrategia | Victoria | cons / prod / inno | todas | B | F | E | W | St | c | D/Y | Puntaje | Fin (p50) | Derrotas |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| do_nothing | 0 % [0 %–16 %] | 0 % / 0 % / 0 % | 0 % | 36.7 (34.5–39.3) | 30.5 (20.7–36.1) | 27.6 (25.2–31.9) | 6.1 (0.2–8.6) | 62.0 (56.3–66.2) | 6.91 (6.70–7.01) | 0.00 (0.00–0.00) | 337 | 2034.0 | sustained 20 |
| conservation | 95 % [76 %–99 %] | 95 % / 40 % / 0 % | 0 % | 53.1 (49.4–56.8) | 55.8 (46.7–64.6) | 34.5 (29.6–49.0) | 77.7 (54.5–87.8) | 71.2 (68.2–77.2) | 5.56 (5.24–5.90) | 0.00 (0.00–0.02) | 652 | 2054.0 | — |
| production | 35 % [18 %–57 %] | 0 % / 35 % / 0 % | 0 % | 45.1 (41.6–52.9) | 46.9 (34.5–61.0) | 38.4 (29.4–48.6) | 49.4 (30.1–72.7) | 70.0 (66.3–76.7) | 7.25 (6.61–7.69) | 0.00 (0.00–0.02) | 552 | 2054.0 | — |
| innovation | 100 % [84 %–100 %] | 0 % / 50 % / 100 % | 0 % | 46.4 (42.8–51.0) | 50.0 (38.4–59.3) | 39.0 (26.6–51.9) | 60.6 (45.1–92.3) | 70.9 (67.0–76.8) | 3.97 (3.83–4.06) | 0.00 (0.00–0.02) | 657 | 2054.0 | — |
| settle_only | 0 % [0 %–16 %] | 0 % / 0 % / 0 % | 0 % | 46.6 (44.1–51.0) | 48.0 (41.7–61.5) | 36.8 (30.3–50.6) | 59.8 (35.0–75.6) | 70.9 (67.5–77.7) | 6.42 (5.83–6.88) | 0.00 (0.00–0.02) | 593 | 2054.0 | — |
| cheap_production | 35 % [18 %–57 %] | 0 % / 35 % / 0 % | 0 % | 46.9 (42.0–50.9) | 46.6 (36.6–61.4) | 36.1 (25.9–43.0) | 50.7 (31.8–66.3) | 70.5 (67.9–75.7) | 6.59 (6.18–7.00) | 0.00 (0.00–0.02) | 578 | 2054.0 | — |
| extractive | 20 % [8 %–42 %] | 0 % / 20 % / 0 % | 0 % | 43.5 (40.0–47.4) | 48.7 (34.7–68.7) | 34.6 (28.5–48.2) | 53.6 (28.1–78.5) | 64.3 (60.5–70.5) | 7.48 (6.93–7.94) | 0.00 (0.00–0.02) | 436 | 2054.0 | — |
| buy_everything | 5 % [1 %–24 %] | 0 % / 0 % / 5 % | 0 % | 44.0 (42.9–45.1) | 35.7 (22.0–45.9) | 32.4 (26.7–44.0) | 14.8 (7.9–39.5) | 59.1 (57.0–63.7) | 4.43 (4.25–4.51) | 0.00 (0.00–0.00) | 456 | 2054.0 | sustained 6 |

Recorrido entre estrategias (máx − mín de las medianas): B 16.5, F 25.3, E 11.4, W 71.6.

## Banda de predicción (jugadores sintéticos)

Proporción de años en que `actualDirection` (src/components/tutorial/predictions.ts) da "sin cambio". Objetivo: 30–36 %.

| Nivel | años | B | E | c |
|---|---|---|---|---|
| N1 | 4500 | 100 % | 100 % | 63 % |
| N2 | 4500 | 100 % | 90 % | 57 % |
| N3 | 4500 | 100 % | 86 % | 65 % |

## Consistencia anual–mensual (N2, sin eventos)

Criterio activo (modelo 2.x).

| Estrategia | Año | Indicador | Anual | Mensual | Δ |
|---|---|---|---|---|---|
| do_nothing | 10 | B | 39.30 | 39.30 | 0.00 |
| do_nothing | 10 | F | 40.33 | 40.33 | -0.00 |
| do_nothing | 10 | E | 30.02 | 30.02 | -0.00 |
| do_nothing | 10 | W | 33.41 | 34.10 | 0.69 |
| do_nothing | 10 | St | 68.50 | 68.60 | 0.10 |
| do_nothing | 10 | c | 7.01 | 6.99 | -0.01 |
| do_nothing | 30 | B | 37.81 | 37.81 | 0.01 |
| do_nothing | 30 | F | 40.99 | 40.99 | -0.00 |
| do_nothing | 30 | E | 30.07 | 30.07 | -0.00 |
| do_nothing | 30 | W | 19.02 | 19.35 | 0.33 |
| do_nothing | 30 | St | 62.06 | 62.56 | 0.50 |
| do_nothing | 30 | c | 6.90 | 6.90 | 0.00 |
| green | 10 | B | 41.30 | 41.21 | -0.09 |
| green | 10 | F | 40.40 | 40.39 | -0.00 |
| green | 10 | E | 30.02 | 30.02 | 0.00 |
| green | 10 | W | 46.13 | 45.85 | -0.28 |
| green | 10 | St | 68.20 | 68.29 | 0.09 |
| green | 10 | c | 4.88 | 4.92 | 0.03 |
| green | 30 | B | 44.06 | 43.96 | -0.10 |
| green | 30 | F | 41.15 | 41.15 | -0.00 |
| green | 30 | E | 30.04 | 30.04 | 0.00 |
| green | 30 | W | 39.82 | 39.87 | 0.05 |
| green | 30 | St | 61.15 | 61.29 | 0.14 |
| green | 30 | c | 4.89 | 4.89 | 0.00 |
| extractive | 10 | B | 37.41 | 37.46 | 0.04 |
| extractive | 10 | F | 40.40 | 40.40 | -0.00 |
| extractive | 10 | E | 30.39 | 30.38 | -0.01 |
| extractive | 10 | W | 32.65 | 33.36 | 0.71 |
| extractive | 10 | St | 66.59 | 66.70 | 0.11 |
| extractive | 10 | c | 9.05 | 9.00 | -0.05 |
| extractive | 30 | B | 32.74 | 32.79 | 0.06 |
| extractive | 30 | F | 41.18 | 41.18 | -0.00 |
| extractive | 30 | E | 30.91 | 30.91 | -0.00 |
| extractive | 30 | W | 18.22 | 18.55 | 0.33 |
| extractive | 30 | St | 54.00 | 54.15 | 0.15 |
| extractive | 30 | c | 8.00 | 8.01 | 0.01 |

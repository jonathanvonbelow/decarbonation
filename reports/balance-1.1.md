# Balance del modelo 1.1 (full)

Generado por `npm run sim:check` (scripts/sim-check.ts) el 2026-10-22, en 153 s. Modelo por juego: niveles 1.1, Territorio 1.1. Semillas: 40 por estrategia y nivel (3 niveles), 20 por estrategia (Territorio); 150 jugadores sintéticos por nivel. Criterios: 00_INDICE_v6.md §6; estrategias: scripts/harness/strategies.ts.

## Criterios

| Criterio | Estado | Valor | Umbral |
|---|---|---|---|
| `C1_do_nothing_never_wins` | FAIL | 0.075 | = 0 % en cada nivel y en Territorio |
| `C2_targeted_wins` | FAIL | 0.000 | ≥ 70.0 % |
| `C3_no_strategy_wins_all` | PASS | 0.225 | ≤ 50.0 % por estrategia |
| `C4_shortcuts_closed` | FAIL | 0.350 | ≤ 5.0 % |
| `C5_strategy_decides` | FAIL | 5.000 | ninguna tasa de victoria en (30.0 %, 70.0 %); valor = casos dentro |
| `C6_indicator_range` | FAIL | 0.341 | ≥ 15 puntos en B, F, E, W |
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
- N2 conservation→conservation: 37.5 % ✗
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
- N3 conservation: 7.5 %

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

- N2 conservation: 37.5 % ✗
- N2 balanced: 40.0 % ✗
- Territorio production: 35.0 % ✗
- Territorio innovation: 60.0 % ✗
- Territorio cheap_production: 35.0 % ✗

</details>

<details><summary>C6_indicator_range</summary>

- N1 B: 7.7 (extractive → green) ✗
- N1 F: 10.2 (tech_tax → green) ✗
- N1 E: 0.3 (tech_tax → extractive) ✗
- N1 W: 5.7 (extractive → green) ✗
- N2 B: 10.2 (extractive → conservation) ✗
- N2 F: 20.9 (extractive → green)
- N2 E: 8.7 (extractive → innovation) ✗
- N2 W: 28.1 (extractive → green)
- N3 B: 9.8 (extractive → conservation) ✗
- N3 F: 12.2 (extractive → green) ✗
- N3 E: 8.2 (extractive → innovation) ✗
- N3 W: 21.3 (extractive → green)
- Territorio B: 15.9 (do_nothing → conservation)
- Territorio F: 25.8 (do_nothing → conservation)
- Territorio E: 10.4 (do_nothing → production) ✗
- Territorio W: 60.3 (do_nothing → conservation)

</details>

<details><summary>C7_prediction_band</summary>

- N1 B: 100.0 % ✗
- N1 E: 100.0 % ✗
- N1 c: 61.5 % ✗
- N2 B: 100.0 % ✗
- N2 E: 86.5 % ✗
- N2 c: 23.7 % ✗
- N3 B: 100.0 % ✗
- N3 E: 86.1 % ✗
- N3 c: 48.7 % ✗

</details>

<details><summary>C9_annual_monthly</summary>

- peor W: green año 30, anual 21.57 vs mensual 22.27 (Δ 0.71)
- peor c: green año 30, anual 8.57 vs mensual 8.42 (Δ -0.15)
- modelo 1.x: informativo, el criterio aplica desde el modelo 2.0 (fase 35)

</details>

## Comparación con `reports/balance-latest.json`

Anterior: modelo 1.0 (full), 2026-10-22; contra sus criterios completos.

| Criterio | Antes | Ahora | Valor antes → ahora | Cambio |
|---|---|---|---|---|
| `C1_do_nothing_never_wins` | FAIL | FAIL | 0.075 → 0.075 | same |
| `C2_targeted_wins` | FAIL | FAIL | 0.000 → 0.000 | same |
| `C3_no_strategy_wins_all` | PASS | PASS | 0.225 → 0.225 | same |
| `C4_shortcuts_closed` | FAIL | FAIL | 0.350 → 0.350 | same |
| `C5_strategy_decides` | FAIL | FAIL | 4.000 → 5.000 | worsened |
| `C6_indicator_range` | FAIL | FAIL | 0.389 → 0.341 | worsened |
| `C7_prediction_band` | FAIL | FAIL | 0.670 → 0.670 | same |
| `C8_no_spurious_collapse` | PASS | PASS | 0.000 → 0.000 | same |
| `C9_annual_monthly` | SKIP | SKIP | 1.529 → 1.529 | same |

## Nivel 1 (30 años)

Tasa de victoria con intervalo de Wilson al 95 %; rutas = % de semillas que cumplen cada ruta (con pisos); valores al final: mediana (p10–p90).

| Estrategia | Victoria | cons / prod / inno | todas | B | F | E | W | St | c | D/Y | Puntaje | Fin (p50) | Derrotas |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| do_nothing | 0 % [0 %–9 %] | 0 % / 0 % / 0 % | 0 % | 38.9 (38.9–38.9) | 31.6 (24.6–36.8) | 25.1 (25.1–25.1) | 19.2 (16.1–22.2) | 89.9 (88.7–91.9) | 7.37 (7.22–7.67) | 0.00 (0.00–0.00) | 367 | 2054.0 | — |
| green | 0 % [0 %–9 %] | 0 % / 0 % / 0 % | 0 % | 44.0 (44.0–44.0) | 41.8 (31.7–47.9) | 25.0 (25.0–25.0) | 24.8 (21.7–61.0) | 88.1 (87.4–92.5) | 3.10 (3.05–3.15) | 0.00 (0.00–0.00) | 547 | 2054.0 | — |
| extractive | 0 % [0 %–9 %] | 0 % / 0 % / 0 % | 0 % | 36.2 (36.2–36.2) | 31.6 (24.6–36.9) | 25.4 (25.4–25.4) | 19.1 (16.0–22.1) | 91.8 (90.9–93.1) | 9.10 (8.93–9.48) | 0.00 (0.00–0.00) | 292 | 2054.0 | — |
| production | 100 % [91 %–100 %] | 0 % / 23 % / 100 % | 0 % | 39.9 (39.9–39.9) | 32.8 (25.0–47.6) | 25.3 (25.3–25.3) | 20.2 (16.2–47.4) | 92.1 (91.0–96.6) | 5.35 (5.28–5.50) | 0.00 (0.00–0.00) | 447 | 2054.0 | — |
| innovation | 100 % [91 %–100 %] | 0 % / 23 % / 100 % | 0 % | 40.0 (40.0–40.0) | 32.7 (24.9–47.5) | 25.2 (25.2–25.2) | 21.4 (17.5–48.6) | 91.1 (90.3–95.6) | 4.86 (4.79–5.01) | 0.00 (0.00–0.00) | 465 | 2054.0 | — |
| conservation | 100 % [91 %–100 %] | 100 % / 23 % / 100 % | 23 % | 43.8 (43.8–43.8) | 32.8 (25.0–47.6) | 25.1 (25.1–25.1) | 21.0 (17.1–48.2) | 91.6 (90.5–95.7) | 3.51 (3.44–3.64) | 0.00 (0.00–0.00) | 531 | 2054.0 | — |
| balanced | 0 % [0 %–9 %] | 0 % / 0 % / 0 % | 0 % | 43.7 (43.7–43.7) | 32.7 (24.9–47.4) | 25.2 (25.2–25.2) | 22.3 (18.3–49.4) | 88.6 (87.8–92.4) | 3.03 (2.96–3.15) | 0.00 (0.00–0.00) | 549 | 2054.0 | — |
| tech_tax | 0 % [0 %–9 %] | 0 % / 0 % / 0 % | 0 % | 39.1 (39.1–39.1) | 31.6 (24.6–36.8) | 25.0 (25.0–25.0) | 20.5 (17.3–23.5) | 90.0 (89.4–91.3) | 6.85 (6.71–7.15) | 0.00 (0.00–0.00) | 387 | 2054.0 | — |

Recorrido entre estrategias (máx − mín de las medianas): B 7.7, F 10.2, E 0.3, W 5.7.

## Nivel 2 (30 años)

Tasa de victoria con intervalo de Wilson al 95 %; rutas = % de semillas que cumplen cada ruta (con pisos); valores al final: mediana (p10–p90).

| Estrategia | Victoria | cons / prod / inno | todas | B | F | E | W | St | c | D/Y | Puntaje | Fin (p50) | Derrotas |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| do_nothing | 0 % [0 %–9 %] | 0 % / 0 % / 0 % | 0 % | 38.1 (38.1–38.1) | 32.6 (24.7–43.7) | 28.3 (24.2–36.4) | 16.3 (12.6–45.5) | 61.1 (59.8–67.6) | 13.37 (12.90–13.90) | 0.00 (0.00–0.00) | 223 | 2054.0 | — |
| green | 83 % [68 %–91 %] | 83 % / 43 % / 0 % | 0 % | 42.9 (42.9–42.9) | 47.2 (35.2–63.1) | 31.1 (26.8–40.0) | 43.9 (19.0–66.0) | 61.7 (59.3–64.0) | 8.43 (8.29–8.57) | 0.00 (0.00–0.00) | 521 | 2054.0 | — |
| extractive | 0 % [0 %–9 %] | 0 % / 0 % / 0 % | 0 % | 35.6 (35.6–35.6) | 26.2 (19.3–37.0) | 24.2 (19.9–32.9) | 15.8 (10.9–22.9) | 56.3 (55.8–60.9) | 14.58 (14.08–15.13) | 0.00 (0.00–0.00) | 176 | 2054.0 | — |
| production | 0 % [0 %–9 %] | 0 % / 0 % / 0 % | 0 % | 39.2 (39.2–39.2) | 34.9 (24.0–50.5) | 26.7 (21.7–35.6) | 18.2 (12.9–58.6) | 62.0 (60.2–68.2) | 10.39 (10.24–10.70) | 0.00 (0.00–0.00) | 295 | 2054.0 | — |
| innovation | 25 % [14 %–40 %] | 0 % / 25 % / 0 % | 0 % | 39.3 (39.3–39.3) | 38.7 (23.9–57.1) | 32.9 (26.7–44.2) | 19.5 (15.2–61.8) | 66.1 (63.4–71.2) | 8.50 (8.37–8.75) | 0.00 (0.00–0.00) | 387 | 2054.0 | — |
| conservation | 38 % [24 %–53 %] | 38 % / 13 % / 0 % | 0 % | 45.8 (45.8–45.8) | 40.6 (26.0–57.9) | 30.0 (25.7–36.3) | 19.1 (14.6–61.4) | 62.8 (60.4–68.2) | 8.36 (8.22–8.65) | 0.00 (0.00–0.00) | 388 | 2054.0 | — |
| balanced | 40 % [26 %–55 %] | 40 % / 18 % / 0 % | 0 % | 42.7 (42.6–42.7) | 35.8 (23.9–50.5) | 29.4 (21.9–42.0) | 19.9 (15.8–62.2) | 59.5 (57.3–64.3) | 8.29 (8.14–8.57) | 0.00 (0.00–0.00) | 391 | 2054.0 | — |
| tech_tax | 0 % [0 %–9 %] | 0 % / 0 % / 0 % | 0 % | 38.3 (38.3–38.4) | 32.6 (24.7–43.7) | 29.7 (25.4–39.4) | 17.7 (13.8–49.5) | 62.6 (59.8–67.8) | 13.37 (12.90–13.90) | 0.00 (0.00–0.00) | 260 | 2054.0 | — |

Recorrido entre estrategias (máx − mín de las medianas): B 10.2, F 20.9, E 8.7, W 28.1.

## Nivel 3 (30 años)

Tasa de victoria con intervalo de Wilson al 95 %; rutas = % de semillas que cumplen cada ruta (con pisos); valores al final: mediana (p10–p90).

| Estrategia | Victoria | cons / prod / inno / eq | todas | B | F | E | W | St | c | D/Y | Puntaje | Fin (p50) | Derrotas |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| do_nothing | 8 % [3 %–20 %] | 0 % / 8 % / 0 % / 0 % | 0 % | 39.4 (39.4–39.5) | 35.9 (28.0–47.5) | 21.3 (14.3–30.1) | 10.6 (4.1–37.7) | 60.4 (59.0–64.8) | 8.57 (8.30–8.72) | 0.01 (0.01–0.01) | 457 | 2054.0 | — |
| green | 100 % [91 %–100 %] | 100 % / 18 % / 0 % / 5 % | 0 % | 43.9 (43.9–44.0) | 46.9 (33.2–54.2) | 24.2 (15.4–34.2) | 29.8 (12.8–56.8) | 59.5 (56.4–63.9) | 4.87 (4.76–4.87) | 0.01 (0.01–0.01) | 588 | 2054.0 | — |
| extractive | 0 % [0 %–9 %] | 0 % / 0 % / 0 % / 0 % | 0 % | 37.0 (37.0–37.0) | 34.7 (26.8–41.9) | 17.6 (13.5–28.0) | 8.5 (1.9–16.4) | 58.6 (57.5–59.6) | 9.69 (9.52–9.85) | 0.01 (0.01–0.01) | 439 | 2054.0 | — |
| production | 13 % [5 %–26 %] | 0 % / 13 % / 0 % / 0 % | 0 % | 40.4 (40.4–40.4) | 38.2 (29.5–50.5) | 23.3 (17.1–31.5) | 15.6 (8.3–45.2) | 60.2 (58.9–65.5) | 6.50 (6.42–6.56) | 0.01 (0.01–0.01) | 545 | 2054.0 | — |
| innovation | 100 % [91 %–100 %] | 0 % / 25 % / 100 % / 8 % | 0 % | 40.4 (40.4–40.4) | 38.2 (30.5–49.8) | 25.8 (16.5–34.8) | 15.8 (8.3–54.8) | 64.8 (62.2–69.7) | 5.22 (5.16–5.27) | 0.01 (0.01–0.01) | 568 | 2054.0 | — |
| conservation | 100 % [91 %–100 %] | 100 % / 8 % / 100 % / 3 % | 8 % | 46.8 (46.8–46.8) | 40.9 (29.7–49.8) | 21.7 (14.7–31.1) | 13.3 (6.1–43.3) | 61.1 (59.1–65.8) | 4.95 (4.84–5.01) | 0.01 (0.01–0.01) | 556 | 2054.0 | — |
| balanced | 100 % [91 %–100 %] | 100 % / 20 % / 0 % / 3 % | 0 % | 43.7 (43.7–43.7) | 36.7 (30.6–49.8) | 25.5 (17.5–34.9) | 17.6 (11.1–54.6) | 59.0 (56.5–62.2) | 4.81 (4.75–4.87) | 0.01 (0.01–0.01) | 582 | 2054.0 | — |
| tech_tax | 10 % [4 %–23 %] | 0 % / 10 % / 0 % / 0 % | 0 % | 39.7 (39.7–39.7) | 36.5 (28.0–46.8) | 24.1 (15.9–32.1) | 12.8 (5.9–41.5) | 60.0 (58.3–63.5) | 8.57 (8.32–8.72) | 0.01 (0.01–0.01) | 496 | 2054.0 | — |

Recorrido entre estrategias (máx − mín de las medianas): B 9.8, F 12.2, E 8.2, W 21.3.

## Territorio (360 meses)

Tasa de victoria con intervalo de Wilson al 95 %; rutas = % de semillas que cumplen cada ruta (con pisos); valores al final: mediana (p10–p90).

| Estrategia | Victoria | cons / prod / inno | todas | B | F | E | W | St | c | D/Y | Puntaje | Fin (p50) | Derrotas |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| do_nothing | 0 % [0 %–16 %] | 0 % / 0 % / 0 % | 0 % | 36.8 (34.5–39.4) | 32.6 (24.5–36.6) | 27.1 (24.7–31.5) | 4.0 (0.2–9.0) | 62.1 (57.2–67.3) | 16.89 (15.84–17.85) | 0.00 (0.00–0.00) | 216 | 2033.7 | sustained 20 |
| conservation | 95 % [76 %–99 %] | 95 % / 45 % / 0 % | 0 % | 52.7 (49.2–57.2) | 58.4 (47.2–65.1) | 36.5 (30.0–49.2) | 64.4 (47.5–78.5) | 71.4 (67.7–75.6) | 2.38 (0.72–4.31) | 0.01 (0.00–0.02) | 685 | 2054.0 | — |
| production | 35 % [18 %–57 %] | 0 % / 35 % / 0 % | 0 % | 46.1 (42.7–49.5) | 47.8 (36.8–61.9) | 37.5 (28.4–44.6) | 45.7 (28.9–69.5) | 71.2 (66.4–78.7) | 9.47 (7.10–11.23) | 0.00 (0.00–0.03) | 490 | 2054.0 | — |
| innovation | 60 % [39 %–78 %] | 5 % / 55 % / 0 % | 0 % | 46.7 (43.3–50.9) | 50.3 (37.8–61.0) | 37.3 (31.3–53.7) | 54.2 (34.9–80.8) | 71.1 (68.0–75.8) | 4.62 (2.49–6.29) | 0.00 (0.00–0.03) | 607 | 2054.0 | — |
| settle_only | 0 % [0 %–16 %] | 0 % / 0 % / 0 % | 0 % | 46.2 (44.3–51.0) | 49.0 (41.1–60.4) | 37.0 (31.4–47.9) | 59.6 (31.5–73.1) | 70.9 (67.1–77.7) | 8.76 (7.15–10.37) | 0.01 (0.00–0.03) | 538 | 2054.0 | — |
| cheap_production | 35 % [18 %–57 %] | 0 % / 35 % / 0 % | 0 % | 47.3 (43.4–52.1) | 47.2 (38.0–59.7) | 35.6 (28.6–41.6) | 54.4 (33.7–72.4) | 71.3 (68.5–78.0) | 8.29 (4.15–10.61) | 0.01 (0.00–0.03) | 534 | 2054.0 | — |
| extractive | 30 % [15 %–52 %] | 0 % / 30 % / 0 % | 0 % | 44.9 (42.7–48.9) | 48.3 (39.2–65.1) | 34.5 (25.4–45.1) | 52.4 (33.2–73.1) | 69.7 (67.5–77.2) | 10.02 (7.52–11.44) | 0.00 (0.00–0.02) | 472 | 2054.0 | — |
| buy_everything | 0 % [0 %–16 %] | 0 % / 0 % / 0 % | 0 % | 42.8 (41.7–44.1) | 35.5 (27.8–45.8) | 33.0 (26.8–40.3) | 8.2 (5.2–25.8) | 62.2 (58.5–64.8) | 7.60 (7.23–9.05) | 0.00 (0.00–0.00) | 377 | 2048.4 | sustained 15 |

Recorrido entre estrategias (máx − mín de las medianas): B 15.9, F 25.8, E 10.4, W 60.3.

## Banda de predicción (jugadores sintéticos)

Proporción de años en que `actualDirection` (src/components/tutorial/predictions.ts) da "sin cambio". Objetivo: 30–36 %.

| Nivel | años | B | E | c |
|---|---|---|---|---|
| N1 | 4500 | 100 % | 100 % | 61 % |
| N2 | 4500 | 100 % | 86 % | 24 % |
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
| green | 10 | B | 41.43 | 41.47 | 0.04 |
| green | 10 | F | 40.38 | 40.39 | 0.00 |
| green | 10 | E | 30.01 | 30.01 | 0.00 |
| green | 10 | W | 47.00 | 47.33 | 0.34 |
| green | 10 | St | 68.20 | 68.29 | 0.09 |
| green | 10 | c | 11.79 | 11.66 | -0.13 |
| green | 30 | B | 42.92 | 43.01 | 0.09 |
| green | 30 | F | 41.05 | 41.06 | 0.00 |
| green | 30 | E | 30.03 | 30.03 | -0.00 |
| green | 30 | W | 21.57 | 22.27 | 0.71 |
| green | 30 | St | 60.51 | 60.72 | 0.21 |
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

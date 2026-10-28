# Análisis de sensibilidad — modelo 2.0 (Morris)

Generado por `npx tsx scripts/sensitivity.ts --r 20` (semilla del diseño 51; 1302 corridas, 74 s). Especificación: `mejora-general/files/51_validacion_cierre_deploy.md` §1.

**Diseño.** Efectos elementales de Morris sobre 30 factores (15 de `CONTROL_PARAMS`, 15 de `PARAMS_V2`; las tablas `costShare`, `rampYears`, `fatigueYears`, `bE` se escalan enteras con un solo multiplicador). Cada factor varía en [0.8, 1.2] × su valor nominal, grilla de p = 4 niveles, Δ = 0.667 del rango (paso de 26.7 % del nominal), r = 20 trayectorias (la spec pide r = 10; con 100 ms por corrida se duplicó para estabilizar el orden). Respuestas: B, F, E, W, c y D/Y del Nivel 2 a los 30 años (un fin de partida se registra y el modelo sigue hasta el año 30, para comparar siempre el mismo horizonte), estrategias `green` y `production` del arnés, sin eventos (`noShocks`, como el golden). μ\*, μ y σ están en unidades de la respuesta por rango completo (−20 % → +20 %).

**Índice global** = promedio, sobre los 12 pares (estrategia, respuesta), de μ\*/máx μ\* del par (1 = el más influyente en todo).

## Orden global

| # | Factor | Fuente | Índice | μ* E (green) | μ* E (production) | μ* W (green) | μ* W (production) |
|---|---|---|---|---|---|---|---|
| 1 | `Tasa_Impositiva_General_Sobre_PBI` | CP | 0.675 | 13.71 | 11.67 | 22.90 | 16.52 |
| 2 | `Gasto_Publico_Base_Nivel_2` | CP | 0.595 | 12.08 | 9.19 | 19.27 | 13.14 |
| 3 | `Eficiencia_Minima_Politicas` | CP | 0.307 | 0.12 | 4.91 | 0.83 | 2.86 |
| 4 | `Tasa_Crecimiento_Poblacional_Base` | CP | 0.307 | 0.21 | 0.24 | 5.20 | 4.69 |
| 5 | `fatigueYears (×tabla)` | PARAMS_V2 | 0.259 | 0.21 | 2.03 | 0.41 | 1.97 |
| 6 | `Tasa_Base_Crecimiento_PBI` | CP | 0.187 | 0.47 | 0.33 | 0.94 | 0.81 |
| 7 | `Poblacion_Inicial` | CP | 0.169 | 0.00 | 0.00 | 0.06 | 0.41 |
| 8 | `food.yieldTrend` | PARAMS_V2 | 0.165 | 0.16 | 0.19 | 4.04 | 3.84 |
| 9 | `costShare (×tabla)` | PARAMS_V2 | 0.147 | 3.91 | 1.28 | 7.35 | 1.50 |
| 10 | `Tasa_de_interes_Nivel_2` | CP | 0.117 | 2.93 | 2.03 | 5.83 | 3.14 |
| 11 | `Tasa_de_BNNP_a_CC_Base` | CP | 0.116 | 0.11 | 0.41 | 0.34 | 0.92 |
| 12 | `energy.incomeElasticity` | PARAMS_V2 | 0.111 | 0.00 | 0.00 | 0.04 | 0.42 |
| 13 | `bE (×tabla)` | PARAMS_V2 | 0.077 | 0.10 | 4.70 | 0.11 | 4.52 |
| 14 | `food.kappa1` | PARAMS_V2 | 0.066 | 0.07 | 0.14 | 1.02 | 2.12 |
| 15 | `zSAR` | PARAMS_V2 | 0.063 | 0.06 | 0.05 | 0.07 | 0.09 |
| 16 | `land.rentBeta` | PARAMS_V2 | 0.058 | 0.12 | 0.19 | 0.12 | 0.10 |
| 17 | `food.kappa2` | PARAMS_V2 | 0.040 | 0.01 | 0.08 | 0.39 | 1.55 |
| 18 | `Velocidad_Ajuste_Biodiversidad` | CP | 0.034 | 0.09 | 0.01 | 0.20 | 0.02 |
| 19 | `rampYears (×tabla)` | PARAMS_V2 | 0.029 | 0.07 | 0.01 | 0.21 | 0.10 |
| 20 | `Velocidad_Ajuste_Seg_Economica` | CP | 0.019 | 0.59 | 0.65 | 0.63 | 0.68 |
| 21 | `relaxation.E.landValue` | PARAMS_V2 | 0.011 | 0.14 | 0.61 | 0.13 | 0.52 |
| 22 | `Velocidad_Ajuste_Seg_Alimentaria` | CP | 0.009 | 0.01 | 0.00 | 0.39 | 0.09 |
| 23 | `Velocidad_Ajuste_Conflicto` | CP | 0.009 | 0.00 | 0.00 | 1.49 | 0.79 |
| 24 | `pressure.phiScale` | PARAMS_V2 | 0.006 | 0.00 | 0.00 | 0.76 | 0.73 |
| 25 | `finance.riskPremium` | PARAMS_V2 | 0.006 | 0.28 | 0.00 | 0.48 | 0.00 |
| 26 | `energy.adjust` | PARAMS_V2 | 0.005 | 0.00 | 0.00 | 0.01 | 0.00 |
| 27 | `conflictWeights.gini` | PARAMS_V2 | 0.005 | 0.00 | 0.00 | 0.59 | 0.59 |
| 28 | `Velocidad_Ajuste_Presiones` | CP | 0.000 | 0.00 | 0.00 | 0.04 | 0.05 |
| 29 | `Recuperacion_Politicas_Anios` | CP | 0.000 | 0.00 | 0.00 | 0.00 | 0.00 |
| 30 | `Velocidad_Ajuste_Colapso` | CP | 0.000 | 0.00 | 0.00 | 0.00 | 0.00 |

## Detalle — `green` (μ* / μ / σ)

| Factor | B | F | E | W | c | D/Y |
|---|---|---|---|---|---|---|
| `Tasa_Impositiva_General_Sobre_PBI` | 0.44 / -0.26 / 0.80 | 2.76 / 1.72 / 3.24 | 13.71 / 13.71 / 10.27 | 22.90 / 22.87 / 17.95 | 0.172 / 0.172 / 0.161 | 1.053 / -1.053 / 0.740 |
| `Gasto_Publico_Base_Nivel_2` | 0.48 / 0.32 / 0.79 | 2.58 / -1.41 / 3.05 | 12.08 / -12.05 / 9.93 | 19.27 / -18.84 / 16.41 | 0.170 / -0.169 / 0.185 | 1.025 / 1.025 / 0.659 |
| `Eficiencia_Minima_Politicas` | 2.20 / 2.20 / 0.30 | 0.15 / 0.15 / 0.07 | 0.12 / 0.03 / 0.18 | 0.83 / 0.83 / 0.43 | 0.238 / -0.238 / 0.030 | 0.007 / 0.006 / 0.006 |
| `Tasa_Crecimiento_Poblacional_Base` | 0.00 / 0.00 / 0.00 | 6.01 / -6.01 / 1.21 | 0.21 / -0.21 / 0.14 | 5.20 / -5.20 / 1.08 | 0.172 / -0.172 / 0.027 | 0.000 / 0.000 / 0.000 |
| `fatigueYears (×tabla)` | 2.21 / 2.21 / 0.31 | 0.20 / -0.13 / 0.16 | 0.21 / -0.07 / 0.22 | 0.41 / 0.40 / 0.42 | 0.258 / -0.258 / 0.037 | 0.006 / 0.005 / 0.008 |
| `Tasa_Base_Crecimiento_PBI` | 0.01 / -0.01 / 0.04 | 0.19 / 0.05 / 0.32 | 0.47 / 0.42 / 0.93 | 0.94 / 0.63 / 1.74 | 0.297 / 0.297 / 0.044 | 0.035 / -0.034 / 0.048 |
| `Poblacion_Inicial` | 0.00 / 0.00 / 0.00 | 0.00 / 0.00 / 0.00 | 0.00 / 0.00 / 0.00 | 0.06 / -0.06 / 0.02 | 0.310 / -0.310 / 0.061 | 0.000 / 0.000 / 0.000 |
| `food.yieldTrend` | 0.00 / 0.00 / 0.00 | 4.63 / 4.63 / 0.85 | 0.16 / 0.16 / 0.12 | 4.04 / 4.04 / 0.72 | 0.000 / 0.000 / 0.000 | 0.000 / 0.000 / 0.000 |
| `costShare (×tabla)` | 0.14 / 0.05 / 0.23 | 1.00 / -0.41 / 1.44 | 3.91 / -3.85 / 5.92 | 7.35 / -6.82 / 10.71 | 0.056 / -0.051 / 0.066 | 0.251 / 0.251 / 0.276 |
| `Tasa_de_interes_Nivel_2` | 0.02 / 0.01 / 0.05 | 0.75 / -0.74 / 1.27 | 2.93 / -2.93 / 4.69 | 5.83 / -5.83 / 8.91 | 0.032 / -0.032 / 0.036 | 0.076 / 0.076 / 0.102 |
| `Tasa_de_BNNP_a_CC_Base` | 0.09 / -0.09 / 0.02 | 0.46 / 0.46 / 0.09 | 0.11 / 0.11 / 0.04 | 0.34 / 0.34 / 0.08 | 0.051 / 0.051 / 0.013 | 0.000 / 0.000 / 0.000 |
| `energy.incomeElasticity` | 0.00 / 0.00 / 0.00 | 0.00 / 0.00 / 0.00 | 0.00 / 0.00 / 0.00 | 0.04 / -0.04 / 0.03 | 0.142 / 0.142 / 0.068 | 0.000 / 0.000 / 0.000 |
| `bE (×tabla)` | 0.00 / 0.00 / 0.00 | 0.03 / -0.03 / 0.01 | 0.10 / -0.10 / 0.03 | 0.11 / -0.11 / 0.03 | 0.000 / 0.000 / 0.000 | 0.000 / 0.000 / 0.000 |
| `food.kappa1` | 0.00 / 0.00 / 0.00 | 1.24 / -0.97 / 1.20 | 0.07 / -0.06 / 0.09 | 1.02 / -0.70 / 1.12 | 0.000 / 0.000 / 0.000 | 0.000 / 0.000 / 0.000 |
| `zSAR` | 0.46 / 0.46 / 0.09 | 0.02 / 0.02 / 0.01 | 0.06 / 0.06 / 0.02 | 0.07 / 0.07 / 0.02 | 0.000 / 0.000 / 0.000 | 0.000 / 0.000 / 0.000 |
| `land.rentBeta` | 0.02 / -0.02 / 0.01 | 0.69 / -0.69 / 0.14 | 0.12 / -0.12 / 0.04 | 0.12 / -0.02 / 0.14 | 0.035 / 0.035 / 0.008 | 0.000 / 0.000 / 0.000 |
| `food.kappa2` | 0.00 / 0.00 / 0.00 | 0.54 / -0.54 / 0.60 | 0.01 / -0.01 / 0.01 | 0.39 / -0.39 / 0.43 | 0.000 / 0.000 / 0.000 | 0.000 / 0.000 / 0.000 |
| `Velocidad_Ajuste_Biodiversidad` | 0.44 / 0.43 / 0.54 | 0.04 / 0.04 / 0.01 | 0.09 / 0.09 / 0.05 | 0.20 / 0.20 / 0.08 | 0.000 / 0.000 / 0.000 | 0.000 / 0.000 / 0.000 |
| `rampYears (×tabla)` | 0.27 / -0.27 / 0.09 | 0.40 / 0.40 / 0.06 | 0.07 / 0.04 / 0.08 | 0.21 / 0.19 / 0.13 | 0.024 / 0.024 / 0.009 | 0.004 / 0.003 / 0.006 |
| `Velocidad_Ajuste_Seg_Economica` | 0.00 / 0.00 / 0.00 | 0.17 / -0.16 / 0.23 | 0.59 / -0.58 / 0.82 | 0.63 / -0.61 / 0.89 | 0.000 / 0.000 / 0.000 | 0.000 / 0.000 / 0.000 |
| `relaxation.E.landValue` | 0.00 / 0.00 / 0.00 | 0.04 / -0.04 / 0.02 | 0.14 / -0.14 / 0.07 | 0.13 / -0.13 / 0.06 | 0.000 / 0.000 / 0.000 | 0.000 / 0.000 / 0.000 |
| `Velocidad_Ajuste_Seg_Alimentaria` | 0.00 / 0.00 / 0.00 | 0.42 / -0.42 / 0.22 | 0.01 / -0.01 / 0.01 | 0.39 / -0.39 / 0.20 | 0.000 / 0.000 / 0.000 | 0.000 / 0.000 / 0.000 |
| `Velocidad_Ajuste_Conflicto` | 0.00 / 0.00 / 0.00 | 0.00 / 0.00 / 0.00 | 0.00 / 0.00 / 0.00 | 1.49 / -1.49 / 1.44 | 0.000 / 0.000 / 0.000 | 0.000 / 0.000 / 0.000 |
| `pressure.phiScale` | 0.00 / 0.00 / 0.00 | 0.00 / 0.00 / 0.00 | 0.00 / 0.00 / 0.00 | 0.76 / -0.76 / 0.08 | 0.000 / 0.000 / 0.000 | 0.000 / 0.000 / 0.000 |
| `finance.riskPremium` | 0.00 / 0.00 / 0.01 | 0.06 / -0.05 / 0.11 | 0.28 / -0.28 / 0.47 | 0.48 / -0.48 / 0.79 | 0.002 / 0.002 / 0.004 | 0.009 / 0.009 / 0.015 |
| `energy.adjust` | 0.00 / 0.00 / 0.00 | 0.00 / 0.00 / 0.00 | 0.00 / 0.00 / 0.00 | 0.01 / 0.01 / 0.01 | 0.019 / 0.007 / 0.025 | 0.000 / 0.000 / 0.000 |
| `conflictWeights.gini` | 0.00 / 0.00 / 0.00 | 0.00 / 0.00 / 0.00 | 0.00 / 0.00 / 0.00 | 0.59 / 0.59 / 0.10 | 0.000 / 0.000 / 0.000 | 0.000 / 0.000 / 0.000 |
| `Velocidad_Ajuste_Presiones` | 0.00 / 0.00 / 0.00 | 0.00 / 0.00 / 0.00 | 0.00 / 0.00 / 0.00 | 0.04 / -0.01 / 0.05 | 0.000 / 0.000 / 0.000 | 0.000 / 0.000 / 0.000 |
| `Recuperacion_Politicas_Anios` | 0.00 / 0.00 / 0.00 | 0.00 / 0.00 / 0.00 | 0.00 / 0.00 / 0.00 | 0.00 / 0.00 / 0.00 | 0.000 / 0.000 / 0.000 | 0.000 / 0.000 / 0.000 |
| `Velocidad_Ajuste_Colapso` | 0.00 / 0.00 / 0.00 | 0.00 / 0.00 / 0.00 | 0.00 / 0.00 / 0.00 | 0.00 / 0.00 / 0.00 | 0.000 / 0.000 / 0.000 | 0.000 / 0.000 / 0.000 |

Fines de partida en el diseño de Morris (620 corridas; el modelo sigue hasta el año 30): Bancarrota Nacional: 176.

## Detalle — `production` (μ* / μ / σ)

| Factor | B | F | E | W | c | D/Y |
|---|---|---|---|---|---|---|
| `Tasa_Impositiva_General_Sobre_PBI` | 0.14 / -0.14 / 0.29 | 2.77 / 2.77 / 3.13 | 11.67 / 11.67 / 12.80 | 16.52 / 16.52 / 19.31 | 0.099 / 0.099 / 0.124 | 0.760 / -0.760 / 0.654 |
| `Gasto_Publico_Base_Nivel_2` | 0.12 / 0.12 / 0.26 | 2.07 / -2.07 / 2.92 | 9.19 / -9.19 / 12.01 | 13.14 / -13.14 / 17.81 | 0.083 / -0.083 / 0.120 | 0.726 / 0.726 / 0.605 |
| `Eficiencia_Minima_Politicas` | 0.58 / 0.58 / 0.04 | 1.03 / -1.03 / 0.39 | 4.91 / 4.91 / 0.70 | 2.86 / 2.86 / 0.71 | 0.038 / 0.038 / 0.017 | 0.007 / 0.007 / 0.012 |
| `Tasa_Crecimiento_Poblacional_Base` | 0.00 / 0.00 / 0.00 | 6.51 / -6.51 / 1.09 | 0.24 / -0.24 / 0.12 | 4.69 / -4.69 / 0.85 | 0.267 / -0.267 / 0.034 | 0.000 / 0.000 / 0.000 |
| `fatigueYears (×tabla)` | 0.47 / 0.47 / 0.05 | 0.16 / -0.11 / 0.21 | 2.03 / 2.03 / 0.27 | 1.97 / 1.97 / 0.31 | 0.032 / 0.032 / 0.011 | 0.001 / 0.001 / 0.002 |
| `Tasa_Base_Crecimiento_PBI` | 0.01 / -0.01 / 0.03 | 0.08 / 0.07 / 0.19 | 0.33 / 0.28 / 0.83 | 0.81 / -0.07 / 1.35 | 0.457 / 0.457 / 0.069 | 0.024 / -0.024 / 0.041 |
| `Poblacion_Inicial` | 0.00 / 0.00 / 0.00 | 0.00 / 0.00 / 0.00 | 0.00 / 0.00 / 0.00 | 0.41 / -0.41 / 0.09 | 0.455 / -0.455 / 0.080 | 0.000 / 0.000 / 0.000 |
| `food.yieldTrend` | 0.00 / 0.00 / 0.00 | 5.01 / 5.01 / 0.80 | 0.19 / 0.19 / 0.14 | 3.84 / 3.84 / 0.71 | 0.000 / 0.000 / 0.000 | 0.000 / 0.000 / 0.000 |
| `costShare (×tabla)` | 0.05 / 0.05 / 0.11 | 0.32 / -0.24 / 0.57 | 1.28 / -0.99 / 2.30 | 1.50 / -1.21 / 2.76 | 0.014 / -0.011 / 0.021 | 0.111 / 0.111 / 0.129 |
| `Tasa_de_interes_Nivel_2` | 0.03 / 0.03 / 0.07 | 0.58 / -0.58 / 0.98 | 2.03 / -2.03 / 3.76 | 3.14 / -3.14 / 5.61 | 0.025 / -0.025 / 0.043 | 0.055 / 0.055 / 0.079 |
| `Tasa_de_BNNP_a_CC_Base` | 0.30 / -0.30 / 0.05 | 1.28 / 1.28 / 0.19 | 0.41 / 0.41 / 0.08 | 0.92 / 0.92 / 0.16 | 0.127 / 0.127 / 0.023 | 0.000 / 0.000 / 0.000 |
| `energy.incomeElasticity` | 0.00 / 0.00 / 0.00 | 0.00 / 0.00 / 0.00 | 0.00 / 0.00 / 0.00 | 0.42 / -0.42 / 0.12 | 0.385 / 0.385 / 0.099 | 0.000 / 0.000 / 0.000 |
| `bE (×tabla)` | 0.00 / 0.00 / 0.00 | 1.46 / 1.46 / 0.30 | 4.70 / 4.70 / 0.63 | 4.52 / 4.52 / 0.47 | 0.000 / 0.000 / 0.000 | 0.000 / 0.000 / 0.000 |
| `food.kappa1` | 0.00 / 0.00 / 0.00 | 2.55 / -2.55 / 1.27 | 0.14 / -0.14 / 0.13 | 2.12 / -2.12 / 1.04 | 0.000 / 0.000 / 0.000 | 0.000 / 0.000 / 0.000 |
| `zSAR` | 0.30 / -0.30 / 0.05 | 0.01 / -0.01 / 0.00 | 0.05 / -0.05 / 0.01 | 0.09 / -0.09 / 0.02 | 0.000 / 0.000 / 0.000 | 0.000 / 0.000 / 0.000 |
| `land.rentBeta` | 0.09 / -0.09 / 0.02 | 0.52 / -0.52 / 0.09 | 0.19 / -0.19 / 0.04 | 0.10 / -0.08 / 0.09 | 0.087 / 0.087 / 0.013 | 0.000 / 0.000 / 0.000 |
| `food.kappa2` | 0.00 / 0.00 / 0.00 | 1.80 / 1.79 / 0.70 | 0.08 / 0.08 / 0.05 | 1.55 / 1.55 / 0.39 | 0.000 / 0.000 / 0.000 | 0.000 / 0.000 / 0.000 |
| `Velocidad_Ajuste_Biodiversidad` | 0.11 / -0.10 / 0.06 | 0.00 / 0.00 / 0.00 | 0.01 / -0.01 / 0.01 | 0.02 / 0.01 / 0.04 | 0.000 / 0.000 / 0.000 | 0.000 / 0.000 / 0.000 |
| `rampYears (×tabla)` | 0.02 / -0.02 / 0.01 | 0.01 / 0.00 / 0.01 | 0.01 / -0.01 / 0.01 | 0.10 / -0.10 / 0.05 | 0.008 / 0.008 / 0.002 | 0.000 / 0.000 / 0.000 |
| `Velocidad_Ajuste_Seg_Economica` | 0.00 / 0.00 / 0.00 | 0.19 / -0.19 / 0.18 | 0.65 / -0.65 / 0.70 | 0.68 / -0.68 / 0.75 | 0.000 / 0.000 / 0.000 | 0.000 / 0.000 / 0.000 |
| `relaxation.E.landValue` | 0.00 / 0.00 / 0.00 | 0.17 / 0.17 / 0.04 | 0.61 / 0.61 / 0.08 | 0.52 / 0.52 / 0.07 | 0.000 / 0.000 / 0.000 | 0.000 / 0.000 / 0.000 |
| `Velocidad_Ajuste_Seg_Alimentaria` | 0.00 / 0.00 / 0.00 | 0.13 / -0.09 / 0.16 | 0.00 / 0.00 / 0.01 | 0.09 / -0.05 / 0.14 | 0.000 / 0.000 / 0.000 | 0.000 / 0.000 / 0.000 |
| `Velocidad_Ajuste_Conflicto` | 0.00 / 0.00 / 0.00 | 0.00 / 0.00 / 0.00 | 0.00 / 0.00 / 0.00 | 0.79 / -0.79 / 1.09 | 0.000 / 0.000 / 0.000 | 0.000 / 0.000 / 0.000 |
| `pressure.phiScale` | 0.00 / 0.00 / 0.00 | 0.00 / 0.00 / 0.00 | 0.00 / 0.00 / 0.00 | 0.73 / -0.73 / 0.16 | 0.000 / 0.000 / 0.000 | 0.000 / 0.000 / 0.000 |
| `finance.riskPremium` | 0.00 / 0.00 / 0.00 | 0.00 / 0.00 / 0.00 | 0.00 / 0.00 / 0.00 | 0.00 / 0.00 / 0.00 | 0.000 / 0.000 / 0.000 | 0.000 / 0.000 / 0.000 |
| `energy.adjust` | 0.00 / 0.00 / 0.00 | 0.00 / 0.00 / 0.00 | 0.00 / 0.00 / 0.00 | 0.00 / 0.00 / 0.00 | 0.000 / 0.000 / 0.000 | 0.000 / 0.000 / 0.000 |
| `conflictWeights.gini` | 0.00 / 0.00 / 0.00 | 0.00 / 0.00 / 0.00 | 0.00 / 0.00 / 0.00 | 0.59 / 0.59 / 0.11 | 0.000 / 0.000 / 0.000 | 0.000 / 0.000 / 0.000 |
| `Velocidad_Ajuste_Presiones` | 0.00 / 0.00 / 0.00 | 0.00 / 0.00 / 0.00 | 0.00 / 0.00 / 0.00 | 0.05 / -0.05 / 0.02 | 0.000 / 0.000 / 0.000 | 0.000 / 0.000 / 0.000 |
| `Recuperacion_Politicas_Anios` | 0.00 / 0.00 / 0.00 | 0.00 / 0.00 / 0.00 | 0.00 / 0.00 / 0.00 | 0.00 / 0.00 / 0.00 | 0.000 / 0.000 / 0.000 | 0.000 / 0.000 / 0.000 |
| `Velocidad_Ajuste_Colapso` | 0.00 / 0.00 / 0.00 | 0.00 / 0.00 / 0.00 | 0.00 / 0.00 / 0.00 | 0.00 / 0.00 / 0.00 | 0.000 / 0.000 / 0.000 | 0.000 / 0.000 / 0.000 |

Fines de partida en el diseño de Morris (620 corridas; el modelo sigue hasta el año 30): Bancarrota Nacional: 84.

## Una variable a la vez (+20 %), comparación con el prototipo

Δ de cada respuesta a los 30 años contra la corrida nominal (Nivel 2, sin eventos). Solo los factores con algún |Δ| ≥ 1 punto (o ≥ 0,05 en c / D/Y), ordenados por |ΔE| de `green`.

Nominal: `green` B 54.8, F 37.5, E 29.3, W 66.8, c 4.886, D/Y 0.271; `production` B 42.0, F 39.2, E 46.4, W 74.0, c 7.135, D/Y 0.000.

| Factor | ΔB green | ΔF green | ΔE green | ΔW green | Δc green | ΔD/Y green | ΔB production | ΔF production | ΔE production | ΔW production | Δc production | ΔD/Y production | fin de partida |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `Gasto_Publico_Base_Nivel_2` | 0.4 | -2.3 | -14.4 | -23.6 | -0.159 | 0.925 | 0.0 | -1.0 | -5.4 | -6.0 | -0.031 | 0.683 | green: Bancarrota Nacional 2051 |
| `costShare (×tabla)` | 0.0 | -0.3 | -1.6 | -2.2 | 0.008 | 0.285 | 0.0 | -0.0 | -0.0 | -0.0 | 0.000 | 0.004 | — |
| `Tasa_Impositiva_General_Sobre_PBI` | 0.0 | 0.1 | 0.4 | 0.6 | 0.002 | -0.271 | 0.0 | 0.0 | 0.0 | 0.0 | 0.000 | 0.000 | — |
| `Tasa_Crecimiento_Poblacional_Base` | 0.0 | -3.1 | -0.1 | -2.6 | -0.094 | 0.000 | 0.0 | -3.1 | -0.1 | -2.2 | -0.139 | 0.000 | — |
| `fatigueYears (×tabla)` | 1.0 | -0.1 | -0.1 | 0.1 | -0.122 | 0.006 | 0.2 | -0.1 | 1.0 | 0.9 | 0.017 | 0.000 | — |
| `Tasa_de_BNNP_a_CC_Base` | -0.1 | 0.2 | 0.1 | 0.2 | 0.024 | 0.000 | -0.2 | 0.6 | 0.2 | 0.4 | 0.062 | 0.000 | — |
| `bE (×tabla)` | 0.0 | -0.0 | -0.1 | -0.1 | 0.000 | 0.000 | 0.0 | 0.7 | 2.4 | 2.1 | 0.000 | 0.000 | — |
| `food.yieldTrend` | 0.0 | 2.4 | 0.1 | 1.9 | 0.000 | 0.000 | 0.0 | 2.4 | 0.0 | 1.7 | 0.000 | 0.000 | — |
| `Eficiencia_Minima_Politicas` | 1.2 | 0.1 | -0.0 | 0.3 | -0.124 | 0.005 | 0.3 | -0.5 | 2.6 | 1.3 | 0.019 | 0.000 | — |
| `Tasa_Base_Crecimiento_PBI` | 0.0 | 0.0 | 0.0 | -0.0 | 0.151 | 0.009 | 0.0 | 0.0 | 0.0 | -0.2 | 0.218 | 0.000 | — |
| `food.kappa1` | 0.0 | -0.5 | -0.0 | -0.3 | 0.000 | 0.000 | 0.0 | -1.1 | -0.0 | -0.9 | 0.000 | 0.000 | — |
| `Poblacion_Inicial` | 0.0 | 0.0 | 0.0 | -0.0 | -0.129 | 0.000 | 0.0 | 0.0 | 0.0 | -0.2 | -0.194 | 0.000 | — |
| `energy.incomeElasticity` | 0.0 | 0.0 | 0.0 | -0.0 | 0.089 | 0.000 | 0.0 | 0.0 | 0.0 | -0.2 | 0.216 | 0.000 | — |

**Aviso de `Gasto_Publico_Base_*`.** El prototipo da, con +20 % sobre γ₂ y la cartera verde, ΔE = −13,6 y ΔW = −22,6; el motor TS da ΔE = -14.4 y ΔW = -23.6 a los 30 años (fin de partida: Bancarrota Nacional 2051). El aviso del panel de facilitación y del manual ("+20 % de γ le quita a una cartera verde unos 14 puntos de seguridad económica en el Nivel 2") se confirma (|ΔE| entre 10 y 18).

<!-- escrito a mano: se conserva al regenerar -->
## Lectura (fase 51, escrita a mano; `scripts/sensitivity.ts` conserva todo lo que sigue a la marca)

1. **El balance fiscal domina.** `Tasa_Impositiva_General_Sobre_PBI` (τ₀) y `Gasto_Publico_Base_Nivel_2` (γ₂) son los dos
   factores más influyentes con mucha distancia (índice 0,68 y 0,60; el tercero 0,31). Actúan por la misma vía: juntos fijan el
   superávit primario antes de las políticas (0,15 − 0,125 = 2,5 % del PBI); cuando la combinación lo vuelve negativo la deuda
   crece, sube el estrés fiscal φ y caen E, W y St. Por eso σ ≈ μ\* (efecto no lineal, umbral) y, una variable a la vez, +20 % de
   τ₀ casi no cambia nada mientras +20 % de γ₂ lleva a la cartera verde a la quiebra. La spec esperaba γ como dominante: se
   cumple, con τ₀ al mismo nivel (el prototipo solo probó +20 % de cada parámetro, que no ve el lado del déficit de τ₀).
2. **Aviso verificado.** +20 % de γ₂ con la cartera verde: ΔE = −14,4, ΔW = −23,6 en TS contra −13,6 / −22,6 del prototipo
   (mismo orden de magnitud y signo). El aviso del panel y del manual se mantiene; en la fase 51 el panel marca también τ₀ como
   sensible (`SENSITIVE_PARAM_KEYS`) y el manual y la descripción del parámetro lo nombran.
3. **Después:** `Eficiencia_Minima_Politicas` (tercero, como en el prototipo: mueve B y c de la cartera verde y E de la
   productiva), crecimiento de población y rendimientos (`Tasa_Crecimiento_Poblacional_Base`, `food.yieldTrend`: F y W por la
   oferta per cápita), fatiga (`fatigueYears`) y costos (`costShare`, tasa de interés). `food.kappa1` (que la spec ubicaba tercero
   tras su recalibración 2,5 → 3,0 de la 49b) queda 14.º: con ±20 % mueve F en ≈ 1–2 puntos.
4. **Las velocidades de ajuste casi no cambian el destino a 30 años** (k_B, k_F, k_E, k_C, k_P, k_π con índice ≤ 0,035; k_P y
   k_π ≈ 0): cambian el camino, no el estado final, como anticipaba la spec. `Recuperacion_Politicas_Anios` da 0 porque ninguna
   de las dos carteras apaga políticas (solo actúa en reposo).
5. `Poblacion_Inicial` e `energy.incomeElasticity` solo mueven c (componente AFOLU per cápita y energía por ingreso), sin efecto
   en los indicadores acotados.

## Comportamiento de referencia (spec 51 §3; tests/sim/reference.spec.ts, tests/sim/extremes.spec.ts)

| Comportamiento | Prototipo / spec | Motor TS | Estado |
|---|---|---|---|
| Deforestación sin políticas (bosque no protegido → cultivos, año 1) | ≈ 1,1–1,2 %/año | 1,09 % (N1), 1,10 % (N2), 1,02 % (N3) | cumple (N3 apenas debajo: arranca con otra mezcla) |
| Ídem con CR en su décimo año | < 0,3 % (0,23 %) | 0,12 % (N1), 0,13 % (N2), 0,02 % (N3) | cumple |
| Transición forestal con AS + CR + GS (N2) | deja de caer antes del año 5; 16,5 → 16,9 % en 15 años | mínimo en el año 3 (16,40 %); 16,67 → 16,86 % | cumple |
| Ídem sin políticas | 16,5 → 14,7 % | 16,67 → 14,75 % | cumple |
| Aprendizaje (programas, λ = 1,5 años: AS, GS, PIE) | ~85 % del efecto en 3 años | rampa 0,865 a los 3 años (CR, λ = 2,5: 0,70) | cumple |
| Recuperación de F tras una caída (k_F = 0,35) | mitad en ≈ 1,6 años, 90 % en ≈ 5,3 | analítico 1,61 / 5,35; motor (caída de 20 puntos en N2) ≈ 1,65 / ≈ 5,6 años (F realimenta por E) | cumple con la realimentación |
| Todo en CC (N2, 30 años) | B 20,6; F ≈ 87 (91 en el prototipo corregido); c ≈ 8,5 | B 20,62; F 91,2; c 8,52 | idéntico al prototipo |
| Todo en BNP | hambruna 2028; c ≈ 3,6 | hambruna 2028; c 3,60 | idéntico |
| τ = 20 durante 30 años en N3 | E ≈ 15, conflicto ≈ 72, deuda ≈ 0 | E 15,2; C 71,6; D/Y 0,013 | cumple |
| CR + AGUA + CN + SE + AS sin impuestos | N3 quiebra 2041; N2 D/Y ≈ 0,7 sin quiebra | N3 quiebra 2041; N2 D/Y 0,74 | cumple |
| Población × 10 | c₀ 7,13 → 5,21 | 7,135 → 5,213 | idéntico |
| 100 años sin eventos ni políticas, población y PBI constantes | todo converge (|Δ| < 0,01 desde el año 60) | **no**: máx |Δ| 0,056 (St) — el bosque no protegido sigue cayendo ~1 %/año (frontera); el prototipo da lo mismo (0,056). Con la frontera también quieta: |Δ| < 0,001 desde el año 30 | desvío de la spec (no del motor): la condición necesita también tasas de frontera 0 |

Nota de método: en los casos "todo en un uso" el test vuelve a anclar el pool agrícola a la mezcla nueva, como hace el
prototipo (que ancla `Aag0` en el primer paso de suelo); el motor lo ancla en `createInitialState`. Sin ese re-anclaje el pool
redistribuye CC hacia CA/PRG/PF según la mezcla del nivel y B termina en 26 en lugar de 20,6.

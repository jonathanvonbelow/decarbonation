# 48 — Predicción anual 2.0 e índices de investigación

| | |
|---|---|
| **Objetivo** | Que la predicción anual (la variable dependiente del artículo de aprendizaje social) sea informativa: bandas de “sin cambio” calibradas por terciles para cada indicador y nivel, medición de habilidad contra líneas de base ingenuas, y un conjunto de índices de sesión para el debriefing y el análisis. |
| **Rama** | `v6-modelo-v2` |
| **Depende de** | 47 (modelo completo) y 33 (jugadores sintéticos del arnés) |
| **Cierra** | N-04b (predicción resuelta de antemano) |
| **Riesgo** | Medio (toca telemetría de investigación) |

## 1. Bandas por terciles

En 1.1 la banda es 1 % del rango (1 punto en B y E, 0,15 t en c) y “sin cambio” acierta casi siempre. En 2.0 la banda
de cada indicador y nivel es el **percentil 33 de |ΔX| anual** de los jugadores sintéticos del arnés (fase 33,
`randomPlayers.ts`), de modo que, a priori, “sin cambio” ocurre un tercio de las veces.

Script nuevo `scripts/prediction-bands.ts` → genera `src/components/tutorial/predictionBands.json`:

```json
{ "modelVersion": "2.0",
  "bands": { "1": { "biodiversity": 0.160, "economicSecurity": 0.275, "co2EqEmissionsPerCapita": 0.039 },
             "2": { "biodiversity": 0.159, "economicSecurity": 0.390, "co2EqEmissionsPerCapita": 0.037 },
             "3": { "biodiversity": 0.157, "economicSecurity": 0.556, "co2EqEmissionsPerCapita": 0.029 } } }
```

(Valores del prototipo; el script los recalcula con el motor TS y **falla** si `modelVersion` del JSON no coincide con
`MODEL_VERSION`.) Proporciones resultantes en el prototipo (suben / igual / bajan): B ≈ 35/33/32; E ≈ 41/33/25;
c ≈ 16/33/51 (el CO₂ tiende a bajar).

`actualDirection` (`src/components/tutorial/predictions.ts`) usa la banda del nivel actual; se borra `RANGE` y
`FLAT_THRESHOLD_FRACTION`. La tira de predicción (`PredictionStrip.tsx`) no muestra la banda al jugador (no cambia la
tarea); el debriefing sí la explica.

Las variaciones de B son pequeñas en valor absoluto (≈ 0,2–0,5 puntos por año): el tablero muestra B con un decimal
para que la dirección sea visible.

## 2. Habilidad contra líneas de base

Por cada predicción se guardan también las de dos líneas de base sobre el mismo ítem:

- **persistencia:** predecir la dirección real del año anterior para ese indicador;
- **climatología:** las proporciones a priori del nivel (§1); su Brier esperado es constante.

```
Brier (categórico, 3 clases) de una predicción determinista: 0 si acierta, 2 si falla
SS_pers = 1 − Brier_jugador / Brier_persistencia          (promedios sobre la sesión)
SS_clim = 1 − Brier_jugador / Brier_climatología
```

`SS > 0` = el jugador predice mejor que la regla ingenua. Es la variable recomendada para el artículo (en lugar de la
precisión cruda), estratificada por `model_version`.

## 3. Índices de sesión

| Índice | Definición | Uso |
|---|---|---|
| `skill_persistence`, `skill_climatology` | §2 | variable dependiente |
| `regret_mean` | por año: simular desde el estado previo, con la misma semilla, las carteras vecinas (activar o desactivar una política, respetando máximo y permanencia) y tomar `max(S_alt) − S_jugador` al año siguiente; promedio | calidad de decisión independiente de la suerte |
| `safe_just_gap` | promedio de faltantes bajo pisos sociales (F ≥ 🟧[40], E ≥ 🟧[35], W ≥ 🟧[55]) y excesos sobre techos ecológicos (c ≤ 🟧[0,8·c₀], B ≥ 🟧[45], bosque ≥ bosque₀), cada uno normalizado por su escala | debriefing: espacio seguro y justo |
| `resilience_months` | tras cada evento con choque sobre F o E, meses (o años) hasta recuperar el 90 % de la caída; promedio | robustez de la cartera |
| `carbon_budget_used` | `B_t` final (fase 38) | emisiones acumuladas |
| `land_concentration`, `just_transition` | G y J finales (fase 45) | dimensión distributiva |
| `policy_entropy`, `policy_reversals` | entropía de la fracción de tiempo de cada política activa (normalizada); cantidad de desactivaciones | estilo de exploración |

Funciones puras en `src/sim/v2/research.ts`; `oneYearRegret(stateBefore, seed, CP)` hace a lo sumo 11 llamadas a
`stepYear` (barato). En Territorio, el arrepentimiento se calcula una vez por año calendario sobre las políticas (no
sobre la bandeja ni el mapa).

## 4. Telemetría y Supabase

`supabase/research_indices_migration.sql`:

```sql
ALTER TABLE public.predictions   ADD COLUMN IF NOT EXISTS band NUMERIC;
ALTER TABLE public.predictions   ADD COLUMN IF NOT EXISTS persistence_pred TEXT CHECK (persistence_pred IN ('down','flat','up'));
ALTER TABLE public.game_sessions ADD COLUMN IF NOT EXISTS research_indices JSONB
  CHECK (research_indices IS NULL OR (jsonb_typeof(research_indices) = 'object' AND pg_column_size(research_indices) <= 4096));
ALTER TABLE public.territorio_feedback ADD COLUMN IF NOT EXISTS research_indices JSONB
  CHECK (research_indices IS NULL OR (jsonb_typeof(research_indices) = 'object' AND pg_column_size(research_indices) <= 4096));
```

- `logPrediction` agrega `band` y `persistence_pred`.
- `finalizeGameSession` agrega `research_indices`.
- El resumen anónimo de Territorio (`buildSummary`) agrega `research_indices` (sin datos personales).
- `supabase/analytics_queries.sql`: consultas de precisión, `SS_pers` y `SS_clim` por `model_version`, nivel e
  indicador.

## 5. Debriefing

`DebriefingModal.tsx` (3 niveles) y la pantalla final de Territorio (`screens.tsx`) muestran: habilidad frente a la
regla ingenua (“acertaste 62 %; repetir lo del año anterior habría acertado 48 %”), arrepentimiento medio, brecha
seguro-y-justo y presupuesto de carbono. Textos es/en.

## 6. Tests

- Con las bandas del JSON, sobre los jugadores sintéticos, “sin cambio” = 33 % ± 3 en cada indicador y nivel (C7).
- Brier y SS con casos a mano (todas aciertan ⇒ SS = 1 si la base falla alguna; base perfecta ⇒ SS ≤ 0).
- `oneYearRegret` = 0 si la cartera del jugador es la mejor vecina.
- La fila insertada en `predictions` incluye `model_version`, `band` y `persistence_pred`.

## 7. Territorio (opcional)

🟧[No incluido por defecto.] Si el equipo quiere la variable dependiente también en Territorio: al cerrar cada
diciembre, una tira de predicción de tres indicadores para el año siguiente, con las mismas bandas del Nivel 2
(Territorio usa fórmulas y estado inicial del N2) y la misma telemetría anónima en `territorio_feedback` (agregada por
sesión, no por ítem).

## 8. Verificación

- [ ] `npm run sim:check` completo: C7 pasa.
- [ ] SQL listo para aplicar; el cliente degrada en silencio si las columnas no existen.
- [ ] `npx tsc --noEmit`, `npm test`, `npm run build`, `npm run i18n:audit` limpios.

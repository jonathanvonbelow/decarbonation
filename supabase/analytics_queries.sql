-- =============================================================================
-- DecarboNation v2.6 — Analytics Queries para Supabase Studio
-- Ejecutar en: Supabase Dashboard > SQL Editor
-- Actualizado para el schema mínimo recortado — ver
-- ultimo-ajuste/05_datos_minimos_supabase.md. `annual_snapshots` ahora es una
-- fila por sesión con el estado FINAL (no una serie año a año), por lo que ya
-- no existen columnas `anio` / `biodiversidad` / etc. sin sufijo `_final`.
-- =============================================================================


-- =============================================================================
-- SECCIÓN 1: Métricas generales de participación
-- =============================================================================

-- Total de sesiones por resultado (victoria / derrota / abandono / demo)
SELECT
    resultado,
    COUNT(*)                                        AS total_sesiones,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) AS porcentaje
FROM public.game_sessions
GROUP BY resultado
ORDER BY total_sesiones DESC;

-- Sesiones por día (últimos 30 días)
SELECT
    DATE(started_at)  AS dia,
    COUNT(*)          AS sesiones
FROM public.game_sessions
WHERE started_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(started_at)
ORDER BY dia;

-- Total usuarios únicos: autenticados (tienen perfil) vs sesiones demo
-- Nota: COUNT(DISTINCT user_id) es 0 para filas demo (user_id IS NULL),
-- por eso usamos SUM(CASE ...) para contar usuarios únicos autenticados
-- y COUNT(*) para sesiones demo.
SELECT
    CASE
        WHEN gs.user_id IS NOT NULL THEN 'autenticado'
        ELSE 'demo'
    END AS tipo_usuario,
    -- Para demos: user_id es NULL, COUNT(DISTINCT NULL) = 0, usamos COUNT(*) en su lugar
    CASE
        WHEN gs.user_id IS NOT NULL
            THEN COUNT(DISTINCT gs.user_id)
        ELSE COUNT(*)
    END                         AS usuarios_unicos,
    COUNT(*)                    AS total_sesiones
FROM public.game_sessions gs
GROUP BY tipo_usuario;

-- Distribución de niveles alcanzados
SELECT
    nivel_alcanzado,
    COUNT(*)                                        AS total,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) AS porcentaje
FROM public.game_sessions
GROUP BY nivel_alcanzado
ORDER BY nivel_alcanzado;

-- Temporalidad de las partidas: distribución de año_inicio / año_fin
SELECT
    anio_inicio,
    anio_fin,
    COUNT(*) AS total_sesiones
FROM public.game_sessions
WHERE anio_inicio IS NOT NULL OR anio_fin IS NOT NULL
GROUP BY anio_inicio, anio_fin
ORDER BY anio_inicio, anio_fin;


-- =============================================================================
-- SECCIÓN 2: Estado final de las partidas (annual_snapshots — versión mínima)
-- Ya no hay serie año a año: solo el estado final por sesión. Ver
-- ultimo-ajuste/05_datos_minimos_supabase.md sección 3 ("qué se pierde con
-- este recorte").
-- =============================================================================

-- Score final promedio, agrupado por resultado
SELECT
    gs.resultado,
    ROUND(AVG(s.score_final), 4)        AS score_final_promedio,
    COUNT(*)                             AS num_sesiones
FROM public.annual_snapshots s
JOIN public.game_sessions gs ON gs.id = s.session_id
GROUP BY gs.resultado
ORDER BY gs.resultado;

-- Biodiversidad y CO2 final promedio (toda la población)
SELECT
    ROUND(AVG(biodiversidad_final), 4)  AS biodiversidad_final_promedio,
    ROUND(AVG(co2_final), 4)            AS co2_final_promedio,
    COUNT(*)                             AS num_sesiones
FROM public.annual_snapshots;

-- Comparativa de indicadores finales por resultado de sesión
SELECT
    gs.resultado,
    ROUND(AVG(s.biodiversidad_final), 4)   AS biodiversidad_final_promedio,
    ROUND(AVG(s.co2_final), 4)             AS co2_final_promedio,
    ROUND(AVG(s.seg_alimentaria_final), 4) AS seg_alimentaria_final_promedio,
    ROUND(AVG(s.seg_economica_final), 4)   AS seg_economica_final_promedio
FROM public.annual_snapshots s
JOIN public.game_sessions gs ON gs.id = s.session_id
GROUP BY gs.resultado
ORDER BY gs.resultado;


-- =============================================================================
-- SECCIÓN 3: Políticas activas al final de la partida
-- =============================================================================

-- Frecuencia de cada política en politicas_activas_final (JSONB, array de strings)
SELECT
    politica,
    COUNT(*) AS frecuencia
FROM public.annual_snapshots,
     jsonb_array_elements_text(politicas_activas_final) AS politica
GROUP BY politica
ORDER BY frecuencia DESC;

-- Top 5 combinaciones exactas de políticas activas al final, en sesiones ganadoras
SELECT
    s.politicas_activas_final::TEXT AS combinacion_politicas,
    COUNT(*)                         AS frecuencia
FROM public.annual_snapshots s
JOIN public.game_sessions gs ON gs.id = s.session_id
WHERE gs.resultado = 'victoria'
GROUP BY s.politicas_activas_final::TEXT
ORDER BY frecuencia DESC
LIMIT 5;


-- =============================================================================
-- SECCIÓN 4: Perfil de jugadores (encuesta pre — recortada a 3 preguntas)
-- =============================================================================

-- Distribución de vínculo con el tema climático
SELECT
    vinculo_clima,
    COUNT(*)                                        AS total,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) AS porcentaje
FROM public.pre_survey
WHERE vinculo_clima IS NOT NULL
GROUP BY vinculo_clima
ORDER BY total DESC;

-- Experiencia previa con simulaciones de política pública (sí/no)
SELECT
    experiencia_simulacion,
    COUNT(*)                                        AS total,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) AS porcentaje
FROM public.pre_survey
WHERE experiencia_simulacion IS NOT NULL
GROUP BY experiencia_simulacion
ORDER BY experiencia_simulacion;

-- Distribución por bloque de convocatoria (1-4, ver
-- ultimo-ajuste/04_recalibracion_actores_y_convocatoria.md) — permite
-- filtrar el análisis de septiembre por bloque.
SELECT
    bloque_convocatoria,
    COUNT(*)                                        AS total,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) AS porcentaje
FROM public.pre_survey
WHERE bloque_convocatoria IS NOT NULL
GROUP BY bloque_convocatoria
ORDER BY bloque_convocatoria;


-- =============================================================================
-- SECCIÓN 5: Resultados de encuesta post (recortada a 4 preguntas)
-- =============================================================================

-- Promedios clave de encuesta post
SELECT
    ROUND(AVG(utilidad_sintesis), 2)  AS utilidad_sintesis_promedio,
    ROUND(AVG(nps), 2)                AS nps_raw_promedio,
    COUNT(*)                           AS total_respuestas
FROM public.post_survey;

-- Net Promoter Score (NPS) calculado
-- NPS = (% promotores con nps >= 9) - (% detractores con nps <= 6), en escala 0–100
WITH nps_clasificado AS (
    SELECT
        CASE
            WHEN nps >= 9 THEN 'promotor'
            WHEN nps <= 6 THEN 'detractor'
            ELSE 'neutro'
        END AS categoria
    FROM public.post_survey
    WHERE nps IS NOT NULL
),
totales AS (
    SELECT COUNT(*) AS total FROM nps_clasificado
)
SELECT
    ROUND(
        (SUM(CASE WHEN categoria = 'promotor' THEN 1 ELSE 0 END)::NUMERIC / NULLIF(totales.total, 0)
         - SUM(CASE WHEN categoria = 'detractor' THEN 1 ELSE 0 END)::NUMERIC / NULLIF(totales.total, 0))
        * 100, 1
    ) AS nps_score,
    SUM(CASE WHEN categoria = 'promotor'  THEN 1 ELSE 0 END) AS promotores,
    SUM(CASE WHEN categoria = 'neutro'    THEN 1 ELSE 0 END) AS neutros,
    SUM(CASE WHEN categoria = 'detractor' THEN 1 ELSE 0 END) AS detractores,
    totales.total                                              AS total_respuestas
FROM nps_clasificado, totales
GROUP BY totales.total;

-- Distribución de sorpresa_yn (¿Te sorprendió algo?)
SELECT
    sorpresa_yn,
    COUNT(*)                                        AS total,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) AS porcentaje
FROM public.post_survey
WHERE sorpresa_yn IS NOT NULL
GROUP BY sorpresa_yn
ORDER BY sorpresa_yn;

-- Conteo de respuestas abiertas no nulas (cuántos escribieron texto libre)
SELECT
    COUNT(*) FILTER (WHERE sorpresa_texto   IS NOT NULL AND sorpresa_texto   <> '') AS escribieron_sorpresa,
    COUNT(*) FILTER (WHERE comentarios      IS NOT NULL AND comentarios      <> '') AS escribieron_comentarios,
    COUNT(*)                                                                         AS total_respuestas_post
FROM public.post_survey;


-- =============================================================================
-- SECCIÓN 6: Duración de sesiones
-- =============================================================================

-- Duración promedio, mínimo, máximo y mediana por resultado
-- duracion_segundos ya está almacenado; también calculamos desde timestamps
SELECT
    resultado,
    COUNT(*)                                                          AS sesiones,
    ROUND(AVG(duracion_segundos) / 60.0, 1)                          AS duracion_media_min,
    ROUND(MIN(duracion_segundos) / 60.0, 1)                          AS duracion_min_min,
    ROUND(MAX(duracion_segundos) / 60.0, 1)                          AS duracion_max_min,
    -- PERCENTILE_CONT devuelve double precision; se requiere cast a NUMERIC
    -- para que ROUND(numeric, integer) funcione en PostgreSQL
    ROUND((PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY duracion_segundos))::NUMERIC / 60.0, 1)
                                                                      AS mediana_min
FROM public.game_sessions
WHERE duracion_segundos IS NOT NULL
GROUP BY resultado
ORDER BY resultado;

-- Histograma de duraciones (bucket de 10 minutos)
SELECT
    bucket_10min * 10                         AS desde_minuto,
    (bucket_10min + 1) * 10 - 1               AS hasta_minuto,
    COUNT(*)                                  AS sesiones
FROM (
    SELECT FLOOR(duracion_segundos / 600)::INT AS bucket_10min
    FROM public.game_sessions
    WHERE duracion_segundos IS NOT NULL
) sub
GROUP BY bucket_10min
ORDER BY bucket_10min;


-- =============================================================================
-- SECCIÓN 7: Vistas materializadas sugeridas
-- (Revisar con el equipo antes de ejecutar; requieren permisos de superusuario
--  o rol owner en las tablas subyacentes.)
-- =============================================================================

-- Vista materializada: session_summary
-- Consolida game_sessions + profiles + estado final + encuestas pre y post en
-- una sola fila. Útil para exportar un CSV completo después de cada taller.
/*
CREATE MATERIALIZED VIEW public.session_summary AS
SELECT
    gs.id                       AS session_id,
    gs.started_at,
    gs.ended_at,
    gs.duracion_segundos,
    gs.anio_inicio,
    gs.anio_fin,
    gs.nivel_alcanzado,
    gs.resultado,
    p.email,
    p.nombre,
    p.afiliacion,
    p.rol,
    snap.biodiversidad_final,
    snap.co2_final,
    snap.seg_alimentaria_final,
    snap.seg_economica_final,
    snap.score_final,
    snap.politicas_activas_final,
    pre.vinculo_clima,
    pre.experiencia_simulacion,
    pre.bloque_convocatoria,
    post.utilidad_sintesis,
    post.nps,
    post.sorpresa_yn,
    post.sorpresa_texto,
    post.comentarios
FROM public.game_sessions gs
LEFT JOIN public.profiles           p    ON p.id   = gs.user_id
LEFT JOIN public.annual_snapshots   snap ON snap.session_id = gs.id
LEFT JOIN public.pre_survey         pre  ON pre.session_id  = gs.id
LEFT JOIN public.post_survey        post ON post.session_id = gs.id;

-- Actualizar bajo demanda (no automático):
-- REFRESH MATERIALIZED VIEW public.session_summary;
*/

-- ===================== Territorio: cuestionario (v5/25) =====================
-- Respuestas por taller
SELECT COALESCE(taller_codigo, '(sin codigo)') AS taller, COUNT(*) AS n,
       ROUND(AVG(comprension), 2) AS comprension, ROUND(AVG(ritmo), 2) AS ritmo,
       ROUND(AVG(mapa_utilidad), 2) AS mapa, ROUND(AVG(tradeoffs), 2) AS tradeoffs,
       ROUND(AVG(realismo), 2) AS realismo, ROUND(AVG(uso_taller), 2) AS uso_taller
FROM public.territorio_feedback GROUP BY 1 ORDER BY n DESC;

-- Elementos mas utiles (multi-respuesta)
SELECT e AS elemento, COUNT(*) FROM public.territorio_feedback, unnest(elementos_utiles) e
GROUP BY 1 ORDER BY 2 DESC;

-- Mejora prioritaria por rol
SELECT rol, mejora_prioritaria, COUNT(*) FROM public.territorio_feedback
GROUP BY 1, 2 ORDER BY 1, 3 DESC;

-- Aprendizaje percibido segun como termino la partida
SELECT partida_estado, resultado, COALESCE(ruta_lograda, ruta_cercana) AS ruta,
       COUNT(*) AS n, ROUND(AVG(tradeoffs), 2) AS tradeoffs
FROM public.territorio_feedback GROUP BY 1, 2, 3 ORDER BY n DESC;

-- Textos abiertos para analisis cualitativo (exportar como CSV desde el SQL Editor)
SELECT created_at, taller_codigo, rol, contexto_uso, aprendizaje_texto, mejoras_texto, taller_conceptos_texto
FROM public.territorio_feedback
WHERE num_nonnulls(aprendizaje_texto, mejoras_texto, taller_conceptos_texto) > 0
ORDER BY created_at;


-- =============================================================================
-- v6 / fase 48: predicción 2.0 — precisión y habilidad (skill) frente a líneas de base
-- (mejora-general/files/48_prediccion_e_indices.md §2). Requiere supabase/model_version_migration.sql y
-- supabase/research_indices_migration.sql. Estratificar SIEMPRE por model_version: las bandas de "sin cambio" del
-- modelo 1.x (1 % del rango) y del 2.0 (terciles) no son comparables.
--   Brier categórico de una predicción determinista: 0 si acierta, 2 si falla.
--   SS_pers = 1 − Brier_jugador / Brier_persistencia;  SS_clim = 1 − Brier_jugador / Brier_climatología.
-- La climatología son las proporciones a priori del nivel (src/components/tutorial/predictionBands.json, campo
-- `climatology`); el bloque VALUES de abajo la copia para model_version '2.0' (y '2.0-dev', mismas proporciones) y hay que regenerarlo
-- cuando cambie el JSON (npx tsx scripts/prediction-bands.ts).
-- =============================================================================

-- Sesiones por versión del modelo y resultado (no mezclar 1.x y 2.0 en ningún análisis de aprendizaje)
SELECT model_version, resultado, COUNT(*) AS n
FROM public.game_sessions
GROUP BY 1, 2 ORDER BY 1, 2;

-- Precisión cruda por versión del modelo, nivel e indicador
SELECT model_version, level, indicator, COUNT(*) AS n,
       ROUND(AVG(CASE WHEN correct THEN 1 ELSE 0 END), 3) AS precision,
       -- sin persistence_pred (modelo 1.x o antes de la migración) la fila no cuenta: AVG ignora NULL
       ROUND(AVG(CASE WHEN persistence_pred IS NULL THEN NULL WHEN persistence_pred = actual THEN 1 ELSE 0 END), 3) AS precision_persistencia,
       ROUND(AVG(band), 4) AS banda
FROM public.predictions
GROUP BY 1, 2, 3 ORDER BY 1, 2, 3;

-- SS_pers y SS_clim por versión del modelo, nivel e indicador (solo filas con persistence_pred: modelo 2.0)
WITH clim(model_version, level, indicator, p_down, p_flat, p_up) AS (
  VALUES
    ('2.0', 1, 'biodiversity', 0.3294, 0.3333, 0.3372),
    ('2.0', 1, 'economicSecurity', 0.2437, 0.3333, 0.4229),
    ('2.0', 1, 'co2EqEmissionsPerCapita', 0.5144, 0.3334, 0.1522),
    ('2.0', 2, 'biodiversity', 0.3204, 0.3338, 0.3458),
    ('2.0', 2, 'economicSecurity', 0.2556, 0.3334, 0.411),
    ('2.0', 2, 'co2EqEmissionsPerCapita', 0.4956, 0.3334, 0.171),
    ('2.0', 3, 'biodiversity', 0.3071, 0.3334, 0.3595),
    ('2.0', 3, 'economicSecurity', 0.3236, 0.3333, 0.3431),
    ('2.0', 3, 'co2EqEmissionsPerCapita', 0.5033, 0.3333, 0.1634),
    -- '2.0-dev' (fases 35–50, mismas bandas): por si alguna fila de prueba quedó con la etiqueta de desarrollo
    ('2.0-dev', 1, 'biodiversity', 0.3294, 0.3333, 0.3372),
    ('2.0-dev', 1, 'economicSecurity', 0.2437, 0.3333, 0.4229),
    ('2.0-dev', 1, 'co2EqEmissionsPerCapita', 0.5144, 0.3334, 0.1522),
    ('2.0-dev', 2, 'biodiversity', 0.3204, 0.3338, 0.3458),
    ('2.0-dev', 2, 'economicSecurity', 0.2556, 0.3334, 0.411),
    ('2.0-dev', 2, 'co2EqEmissionsPerCapita', 0.4956, 0.3334, 0.171),
    ('2.0-dev', 3, 'biodiversity', 0.3071, 0.3334, 0.3595),
    ('2.0-dev', 3, 'economicSecurity', 0.3236, 0.3333, 0.3431),
    ('2.0-dev', 3, 'co2EqEmissionsPerCapita', 0.5033, 0.3333, 0.1634)
), scored AS (
  SELECT pr.model_version, pr.level, pr.indicator,
         CASE WHEN pr.predicted = pr.actual THEN 0 ELSE 2 END AS brier_jugador,
         CASE WHEN pr.persistence_pred = pr.actual THEN 0 ELSE 2 END AS brier_pers,
         POWER(c.p_down - CASE WHEN pr.actual = 'down' THEN 1 ELSE 0 END, 2)
       + POWER(c.p_flat - CASE WHEN pr.actual = 'flat' THEN 1 ELSE 0 END, 2)
       + POWER(c.p_up   - CASE WHEN pr.actual = 'up'   THEN 1 ELSE 0 END, 2) AS brier_clim
  FROM public.predictions pr
  LEFT JOIN clim c ON c.model_version = pr.model_version AND c.level = pr.level AND c.indicator = pr.indicator
  WHERE pr.persistence_pred IS NOT NULL
)
SELECT model_version, level, indicator, COUNT(*) AS n,
       ROUND(1 - AVG(brier_jugador) / NULLIF(AVG(brier_pers), 0), 3) AS ss_persistencia,
       ROUND((1 - AVG(brier_jugador) / NULLIF(AVG(brier_clim), 0))::numeric, 3) AS ss_climatologia
FROM scored
GROUP BY 1, 2, 3 ORDER BY 1, 2, 3;

-- SS por sesión (la variable dependiente recomendada para el artículo), con su versión del modelo
SELECT gs.id AS session_id, gs.model_version,
       (gs.research_indices ->> 'skill_persistence')::numeric  AS ss_persistencia,
       (gs.research_indices ->> 'skill_climatology')::numeric  AS ss_climatologia,
       (gs.research_indices ->> 'n_predictions')::int          AS n_predicciones
FROM public.game_sessions gs
WHERE gs.research_indices IS NOT NULL
ORDER BY gs.model_version, gs.started_at;

-- Índices de sesión promedio por versión del modelo y resultado (3 niveles)
SELECT model_version, resultado, COUNT(*) AS n,
       ROUND(AVG((research_indices ->> 'regret_mean')::numeric), 2)        AS arrepentimiento,
       ROUND(AVG((research_indices ->> 'safe_just_gap')::numeric), 3)      AS brecha_seguro_justo,
       ROUND(AVG((research_indices ->> 'resilience_months')::numeric), 1)  AS resiliencia_meses,
       ROUND(AVG((research_indices ->> 'carbon_budget_used')::numeric), 3) AS presupuesto_carbono,
       ROUND(AVG((research_indices ->> 'policy_entropy')::numeric), 3)     AS entropia_politicas,
       ROUND(AVG((research_indices ->> 'policy_reversals')::numeric), 2)   AS desactivaciones
FROM public.game_sessions
WHERE research_indices IS NOT NULL
GROUP BY 1, 2 ORDER BY 1, 2;

-- Territorio: mismos índices desde el cuestionario anónimo (sin predicción, spec §7)
SELECT model_version, resultado, COUNT(*) AS n,
       ROUND(AVG((research_indices ->> 'regret_mean')::numeric), 2)        AS arrepentimiento,
       ROUND(AVG((research_indices ->> 'safe_just_gap')::numeric), 3)      AS brecha_seguro_justo,
       ROUND(AVG((research_indices ->> 'carbon_budget_used')::numeric), 3) AS presupuesto_carbono,
       ROUND(AVG((research_indices ->> 'land_concentration')::numeric), 3) AS concentracion_g,
       ROUND(AVG((research_indices ->> 'just_transition')::numeric), 3)    AS transicion_justa_j
FROM public.territorio_feedback
WHERE research_indices IS NOT NULL
GROUP BY 1, 2 ORDER BY 1, 2;

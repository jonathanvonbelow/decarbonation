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

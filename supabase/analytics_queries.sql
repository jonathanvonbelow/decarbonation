-- =============================================================================
-- DecarboNation v2.6 — Analytics Queries para Supabase Studio
-- Ejecutar en: Supabase Dashboard > SQL Editor
-- Última actualización: 2026-06-05
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


-- =============================================================================
-- SECCIÓN 2: Curvas de aprendizaje (score por año de simulación)
-- =============================================================================

-- Score promedio por año de simulación, agrupado por resultado
-- Compara trayectorias de jugadores ganadores vs perdedores
SELECT
    anio,
    resultado,
    ROUND(AVG(s.score_general), 4)     AS score_promedio,
    COUNT(DISTINCT s.session_id)        AS num_sesiones
FROM public.annual_snapshots s
JOIN public.game_sessions gs ON gs.id = s.session_id
GROUP BY anio, resultado
ORDER BY anio, resultado;

-- Biodiversidad y CO2 promedio por año simulado (toda la población)
SELECT
    anio,
    ROUND(AVG(biodiversidad), 4)      AS biodiversidad_promedio,
    ROUND(AVG(co2_per_capita), 4)     AS co2_per_capita_promedio,
    COUNT(*)                           AS num_snapshots
FROM public.annual_snapshots
GROUP BY anio
ORDER BY anio;

-- Comparativa de biodiversidad y CO2 por año y resultado de sesión
SELECT
    anio,
    gs.resultado,
    ROUND(AVG(s.biodiversidad), 4)      AS biodiversidad_promedio,
    ROUND(AVG(s.co2_per_capita), 4)     AS co2_per_capita_promedio
FROM public.annual_snapshots s
JOIN public.game_sessions gs ON gs.id = s.session_id
GROUP BY anio, gs.resultado
ORDER BY anio, gs.resultado;


-- =============================================================================
-- SECCIÓN 3: Políticas más usadas
-- =============================================================================

-- Frecuencia de cada política en politicas_activas JSONB
-- politicas_activas es un array JSON de strings, e.g. ["reforestacion","solar"]
SELECT
    politica,
    COUNT(*) AS frecuencia
FROM public.annual_snapshots,
     jsonb_array_elements_text(politicas_activas) AS politica
GROUP BY politica
ORDER BY frecuencia DESC;

-- Top 5 combinaciones de políticas en sesiones ganadoras
-- Muestra las combinaciones exactas más frecuentes al cierre de sesión (último año)
WITH ultimo_snapshot AS (
    -- Tomamos el snapshot del año más alto de cada sesión ganadora
    SELECT DISTINCT ON (s.session_id)
        s.session_id,
        s.politicas_activas
    FROM public.annual_snapshots s
    JOIN public.game_sessions gs ON gs.id = s.session_id
    WHERE gs.resultado = 'victoria'
    ORDER BY s.session_id, s.anio DESC
)
SELECT
    politicas_activas::TEXT AS combinacion_politicas,
    COUNT(*)                AS frecuencia
FROM ultimo_snapshot
GROUP BY politicas_activas::TEXT
ORDER BY frecuencia DESC
LIMIT 5;


-- =============================================================================
-- SECCIÓN 4: Perfil de jugadores (encuesta pre)
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

-- Distribución de familiaridad con AFOLU: promedio y conteo por valor
SELECT
    familiaridad_afolu,
    COUNT(*)                                        AS total,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) AS porcentaje
FROM public.pre_survey
WHERE familiaridad_afolu IS NOT NULL
GROUP BY familiaridad_afolu
ORDER BY familiaridad_afolu;

-- Promedio general de familiaridad_afolu
SELECT
    ROUND(AVG(familiaridad_afolu), 2) AS familiaridad_afolu_promedio,
    COUNT(*)                           AS respuestas
FROM public.pre_survey
WHERE familiaridad_afolu IS NOT NULL;

-- Top países/regiones participantes
SELECT
    pais_region,
    COUNT(*) AS total_participantes
FROM public.pre_survey
WHERE pais_region IS NOT NULL AND pais_region <> ''
GROUP BY pais_region
ORDER BY total_participantes DESC
LIMIT 20;

-- Distribución de expectativas antes del juego
SELECT
    expectativa,
    COUNT(*)                                        AS total,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) AS porcentaje
FROM public.pre_survey
WHERE expectativa IS NOT NULL
GROUP BY expectativa
ORDER BY total DESC;


-- =============================================================================
-- SECCIÓN 5: Resultados de encuesta post
-- =============================================================================

-- Promedios clave de encuesta post
SELECT
    ROUND(AVG(cambio_percepcion), 2)  AS cambio_percepcion_promedio,
    ROUND(AVG(utilidad_docente), 2)   AS utilidad_docente_promedio,
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
    COUNT(*) FILTER (WHERE cambio_texto     IS NOT NULL AND cambio_texto     <> '') AS escribieron_cambio,
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
-- Consolida game_sessions + profiles + encuestas pre y post en una sola fila.
-- Útil para exportar un CSV completo después de cada taller.
/*
CREATE MATERIALIZED VIEW public.session_summary AS
SELECT
    gs.id                       AS session_id,
    gs.started_at,
    gs.ended_at,
    gs.duracion_segundos,
    gs.nivel_alcanzado,
    gs.resultado,
    p.email,
    p.nombre,
    p.afiliacion,
    p.rol,
    pre.vinculo_clima,
    pre.experiencia_simulacion,
    pre.familiaridad_afolu,
    pre.expectativa,
    pre.pais_region,
    post.cambio_percepcion,
    post.cambio_texto,
    post.utilidad_docente,
    post.nps,
    post.sorpresa_yn,
    post.sorpresa_texto,
    post.comentarios
FROM public.game_sessions gs
LEFT JOIN public.profiles           p    ON p.id   = gs.user_id
LEFT JOIN public.pre_survey         pre  ON pre.session_id  = gs.id
LEFT JOIN public.post_survey        post ON post.session_id = gs.id;

-- Actualizar bajo demanda (no automático):
-- REFRESH MATERIALIZED VIEW public.session_summary;
*/

-- Vista materializada: learning_curve
-- Score general por año de simulación y resultado, listo para Recharts.
-- Estructura: { anio, resultado, score_promedio, num_sesiones }
/*
CREATE MATERIALIZED VIEW public.learning_curve AS
SELECT
    s.anio,
    gs.resultado,
    ROUND(AVG(s.score_general), 4)    AS score_promedio,
    COUNT(DISTINCT s.session_id)       AS num_sesiones
FROM public.annual_snapshots s
JOIN public.game_sessions gs ON gs.id = s.session_id
GROUP BY s.anio, gs.resultado
ORDER BY s.anio, gs.resultado;

-- Actualizar bajo demanda:
-- REFRESH MATERIALIZED VIEW public.learning_curve;
*/

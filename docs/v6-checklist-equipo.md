# Paquete v6 — pasos pendientes para el equipo

Cierre de la fase 51 (2026-10-28). Claude Code dejó todo listo **en local**: no hizo merge a `main`, no empujó ramas ni tags,
no desplegó y no aplicó SQL en Supabase (restricción del usuario; además no tiene credenciales). Lo que sigue, en orden.

Estado de partida:

- Rama `v6-modelo-1-1` (modelo 1.1, tag local `model-v1.1`) y rama `v6-modelo-v2` (modelo 2.0, tag local `model-v2.0` sobre el
  commit de la fase 51), las dos sobre `main` @ `144c321` (tag local `model-v1.0`). Nada de esto está en `origin`.
- `v6-modelo-v2` vive en el worktree `…\03_Desarrollo y Software\decarbonation-v6` (`git worktree list`).
- `npm run sim:check` completo: C1–C9 PASS (`reports/balance-2.0.md`); `tsc`, `npm test` (49 archivos, 751 tests), `build`,
  `i18n:audit` y los generadores docentes `--check` en verde.

## 1. Revisar los vistos buenos

- [ ] Leer `docs/v6-spec-vs-motor.md`, sección **"Requiere visto bueno del equipo"** (11 decisiones: W de N1 fuera de C6,
      uso público 8 → 6 %, F de producción de Territorio 44 → 40,5, F de producción N3 33 → 31, κ₁ 2,5 → 3,0, paso anual de
      12 sub-pasos, canal de abandono 1,2/3, pisos de ROUTES3, escrutinio 1,5·c₀, estacionalidad, τ₀ marcado sensible).
- [ ] Leer `reports/sensitivity-2.0.md` (Morris) y `reports/situations-audit.md`.
- [ ] Si alguna decisión se rechaza: es un cambio de modelo → nueva fase, `sim:check` completo y, si cambia trayectorias
      después de recolectar datos, otra versión (`2.0.1` / `2.1`, nunca reutilizar `2.0`).

## 2. Supabase (SQL Editor del proyecto)

- [ ] Verificar que el proyecto esté **activo**: el free tier se pausa tras 7 días sin actividad. Si está pausado, reanudarlo
      desde el panel antes de cualquier taller (responsable: Jonathan).
- [ ] Pegar y correr `supabase/model_version_migration.sql` (idempotente; si ya se aplicó con la 1.1, correrlo de nuevo no
      hace nada). Las filas viejas quedan `'1.0'`; el CHECK acepta `'2.0'`.
- [ ] Pegar y correr `supabase/research_indices_migration.sql` (columnas `band`, `persistence_pred`, `research_indices`).
- [ ] Comprobar: `SELECT model_version, COUNT(*) FROM game_sessions GROUP BY 1;` y lo mismo en `predictions` /
      `territorio_feedback`.
- Sin migrar, el cliente reintenta sin las columnas nuevas (no se pierden filas), pero los datos 2.0 no quedan etiquetados.

## 3. Ramas y tags (desde el checkout principal)

```bash
git push origin v6-modelo-1-1 v6-modelo-v2
git push origin model-v1.0 model-v1.1      # model-v2.0 todavía no: se mueve al commit del merge (paso 4)
```

## 4. PR y merge

Elegir uno:

- **Directo a 2.0 (recomendado):** PR `v6-modelo-v2` → `main`. Descripción: resumen de `docs/DESIGN_DECISIONS_LOG.md`
  (entrada "v6 fase 51: cierre") con enlaces a `reports/balance-2.0.md`, `reports/sensitivity-2.0.md`,
  `reports/situations-audit.md` y `docs/v6-spec-vs-motor.md`. `v6-modelo-v2` ya contiene la 1.1.
- **1.1 primero para talleres inmediatos:** PR `v6-modelo-1-1` → `main`, desplegar, y más tarde el PR de `v6-modelo-v2`
  (que se rebasa/fusiona sin conflictos de modelo: parte de `v6-modelo-1-1`).

Tras el merge de la 2.0:

```bash
git tag -f model-v2.0 <sha-del-merge-en-main>   # o dejarlo en el commit de la fase 51 si se fusiona con fast-forward
git push origin model-v2.0
```

## 5. Deploy en Vercel

- [ ] Revisar el *preview* de la rama (Vercel lo crea al empujar): `/`, `/play?demo=1`, `/play`, `/territorio`,
      `/territorio/encuesta`, `/docentes`, `/docentes/ecuaciones` en es y en en.
- [ ] Variables: `GEMINI_API_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY` (sin cambios respecto de v5).
- [ ] Promover a producción con el merge a `main`.
- **Rollback:** en Vercel, *Deployments* → el último deploy de `main` anterior al merge → *Promote to Production*
  (instantáneo); en git, `git revert -m 1 <sha-del-merge>`. Las filas que ya se hayan guardado con `'2.0'` quedan bien
  etiquetadas: no hay que tocar la base.

## 6. Limpieza local

- [ ] Borrar `C:\o35` (temporales de una fase anterior: `fp.mts`, `new.json`, `old.json`; fuera de los repos).
- [ ] Cuando el merge esté hecho: `git worktree remove "…\decarbonation-v6"` desde el checkout principal.

## 7. QA en producción

- [ ] Juego de 3 niveles: una partida por nivel (es y en, escritorio y celular); en Supabase, filas de `predictions` con
      `model_version = '2.0'`, `band` y `persistence_pred`.
- [ ] `/play?demo=1` termina el nivel 1 en 2029 (bug de la demo corregido en la 51).
- [ ] Territorio: partida completa con conservación y con producción; quiebra con "comprar todo"; cuestionario con código
      de taller (`?taller=…`); el resumen guarda `modelVersion` `'2.0'` e índices de investigación.
- [ ] Panel de facilitación: cada parámetro mueve algo; `Tasa_Impositiva_General_Sobre_PBI` y `Gasto_Publico_Base_*`
      aparecen como "muy sensible".
- [ ] DecarboNito responde con objetivos y fiscal en contexto y no menciona instrumentos en el Nivel 1 (requiere clave real
      de Gemini: en local se probó con una clave de relleno, sin respuestas).

## Deudas conocidas que no bloquean el despliegue

- Territorio a 375 px: la fila de controles (pausa, velocidad, idioma, salir) se superpone con los íconos de paneles y el
  puntaje del HUD (QA de la fase 51). Se puede jugar, pero conviene arreglarlo antes de talleres con celulares.
- Barra de progreso en 0 para condiciones de ruta que leen el estado actual (renovables, bosque, D/Y, pactos).
- Áreas iniciales de maqueta sin fuente territorial (L-5 de `docs/audit-equations.md`).
- Paper técnico del modelo 2.0: no está en el repo; actualizar sus tablas con los números del arnés TS.
- Sin `.env.local` el dev server queda en blanco (`new GoogleGenAI` sin clave); usar una clave de relleno para pruebas locales.

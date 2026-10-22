# 51 — Validación del modelo 2.0, cierre, merge y despliegue

| | |
|---|---|
| **Objetivo** | Validar el modelo 2.0 (sensibilidad, condiciones extremas, comportamiento de referencia), cerrar la documentación, fusionar `v6-modelo-v2` a `main` y desplegar. |
| **Rama** | `v6-modelo-v2` → PR a `main` |
| **Depende de** | todo el paquete |
| **Riesgo** | Medio |

## 1. Análisis de sensibilidad (Morris)

Script nuevo `scripts/sensitivity.ts`: método de efectos elementales de Morris sobre los escalares de `CONTROL_PARAMS`
del modelo 2.0 y una selección de `PARAMS_V2` (≈ 30 parámetros; r = 10 trayectorias, 4 niveles). Salida: μ* y σ por
parámetro sobre seis respuestas a los 30 años en N2 (B, F, E, W, c, D/Y) para las estrategias `green` y `production`.
`reports/sensitivity-2.0.md` ordena por μ*.

Resultado esperado (prototipo, una variable a la vez, +20 %): el parámetro dominante es `Gasto_Publico_Base_Nivel_2`
(cartera verde: ΔE = −13,6, ΔW = −22,6); le siguen `Eficiencia_Minima_Politicas` y `kappa1`; las velocidades de ajuste
casi no cambian el estado a 30 años (cambian el camino, no el destino). Si el análisis TS no coincide en orden de
magnitud, investigar antes de cerrar.

Se elige Morris en lugar de Sobol por costo: Sobol necesita decenas de miles de corridas para 30 parámetros; Morris
alcanza para ordenar y descartar.

## 2. Condiciones extremas (`tests/sim/extremes.spec.ts`)

| Caso | Esperado (prototipo, N2 salvo indicación) |
|---|---|
| Todo el territorio en CC | B < 25 (20,6 a 30 años); F alto (≈ 87); c ≈ 8,5; ningún NaN |
| Todo el territorio en BNP | sin producción: hambruna (F ≤ 10) en pocos años (prototipo: 2028); B sube; c ≈ 3,6 (solo energía menos sumidero) |
| τ = 20 durante 30 años en N3 | E ≈ 15, conflicto ≈ 72, deuda casi nula; nada fuera de rango |
| CR, AGUA, CN, SE y AS a la vez, sin impuestos | N3: quiebra antes de 2054 (prototipo: 2041); N2: D/Y ≈ 0,7 sin quiebra |
| Población × 10 | componente AFOLU per cápita ÷ 10 (c₀ de 7,13 a 5,21) |
| Sin eventos ni políticas, con población y PBI constantes (mock), 100 años | todas las variables convergen (|Δ| anual < 0,01 desde el año 60). Con las tendencias exógenas activas no convergen (población, ingreso, rendimientos): es esperado |

## 3. Comportamiento de referencia (cualitativo)

- Deforestación sin políticas: ≈ 1,1–1,2 %/año del bosque no protegido hacia cultivos (como 1.1); con CR en su décimo
  año, < 0,3 % (prototipo: 0,23 %).
- Transición forestal: con AS + CR + GS, el bosque total deja de caer antes del año 5 (prototipo: 16,5 % → 16,9 % en 15
  años; sin políticas, 16,5 % → 14,7 %).
- Curva de aprendizaje de políticas: una política nueva alcanza ~85 % de su efecto en 3 años (programas).
- Recuperación tras sequía: con k_F = 0,35, F recupera la mitad de la caída en ≈ 1,6 años y el 90 % en ≈ 5,3 años.

Anotar en el reporte si alguno no se cumple y por qué.

## 4. Cierre de documentación

- `MODEL_VERSION = '2.0'`.
- `docs/audit-equations.md`: cada ítem de la auditoría (C-, L-, I-, P-, E-, S-, N-, T-) con estado final y fase.
- `docs/DESIGN_DECISIONS_LOG.md`: resumen v6 con desvíos y deudas.
- `CLAUDE.md`: sección de arquitectura del motor (integrador único `advance`, `src/sim/v2/`, anclas, `PARAMS_V2`,
  arnés y `sim:check`, prototipo de referencia, regla de versiones del modelo).
- `src/sim/v2/README.md`: mapa final de módulos.
- Paper técnico del modelo 2.0 (en el proyecto): actualizar las tablas de caracterización con los números del
  arnés TS (los del paper son del prototipo).

## 5. Merge y despliegue

1. `npm run sim:check` completo en verde; `npx tsc --noEmit`, `npm test`, `npm run build`, `npm run i18n:audit`.
2. PR `v6-modelo-v2` → `main` con: resumen para el equipo, enlace a `reports/balance-2.0.md`,
   `reports/sensitivity-2.0.md`, `reports/situations-audit.md`.
3. Pendientes para el equipo (Claude Code no tiene credenciales): aplicar `supabase/model_version_migration.sql` (si no
   se aplicó con 1.1) y `supabase/research_indices_migration.sql`; empujar los tags `model-v1.0`, `model-v1.1`,
   `model-v2.0`; revisar el preview de Vercel de la rama.
4. Si se eligió congelar el juego de 3 niveles en 1.1 (índice, decisión 3): confirmar que `/play` sigue importando de
   `src/sim-v1` y que `MODEL_VERSION_BY_GAME.niveles = '1.1'`.

## 6. QA manual

- [ ] Juego de 3 niveles: una partida por nivel con cada ruta, es y en, escritorio y celular; predicciones registradas
      con `model_version = '2.0'`, `band` y `persistence_pred` (ver en Supabase si está migrado).
- [ ] Territorio: partida completa con conservación y con producción; quiebra con “comprar todo”; cuestionario con
      código de taller; resumen con `model_version` e índices.
- [ ] Panel de facilitación: cada parámetro cambia algo visible.
- [ ] DecarboNito responde con objetivos y fiscal en el contexto; no menciona instrumentos en N1.
- [ ] Paquete docente: hoja de ecuaciones y tabla de parámetros regeneradas; guía y plan sin referencias a 1.1.
- [ ] Antes del primer taller con 2.0: 🟧[Responsable: Jonathan] confirma Supabase activo.

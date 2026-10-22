# 32 — Versionado del modelo y línea base

| | |
|---|---|
| **Objetivo** | Que cada dato de investigación quede atado a la versión del modelo que lo produjo, y congelar el modelo actual como `1.0` antes de cambiar nada. |
| **Rama** | `v6-modelo-1-1` (desde `main`) |
| **Depende de** | — |
| **Cierra** | Requisito transversal de la auditoría (separar partidas jugadas con modelos distintos) |
| **Riesgo** | Bajo |

## 1. Por qué

El paquete cambia ecuaciones en dos tandas (1.1 y 2.0). Las tablas `game_sessions`, `predictions` y
`territorio_feedback` ya tienen datos de talleres. Si no se guarda la versión, el artículo de aprendizaje social no
puede distinguir una predicción hecha con el modelo viejo (donde “sin cambio” casi siempre acertaba) de una hecha con
el nuevo.

## 2. Archivos afectados

| Archivo | Cambio |
|---|---|
| `src/sim/version.ts` (nuevo) | `MODEL_VERSION` y `MODEL_VERSION_BY_GAME` |
| `src/sim/index.ts` | reexporta `MODEL_VERSION` |
| `src/services/supabaseService.ts` | `createGameSession` escribe `model_version` |
| `src/services/predictionTelemetry.ts` | inserta `model_version` |
| `src/territorio/survey/summary.ts`, `types.ts`, `feedbackService.ts` | agrega `model_version` al resumen |
| `supabase/model_version_migration.sql` (nuevo) | columnas nuevas |
| `tests/sim/version.spec.ts` (nuevo) | la versión es semver y coincide con el log |
| `scripts/reference/` (nuevo) | copiar `modelo_v2.py`, `export_situations.ts`, `golden_v2.csv` de este paquete |
| `docs/DESIGN_DECISIONS_LOG.md`, `docs/audit-equations.md` | entradas |

## 3. Implementación

### 3.1 `src/sim/version.ts`

```ts
/**
 * Version of the simulation model (equations + parameters), independent of the app version.
 *
 * Bump rules (docs/audit-equations.md):
 *   - patch (1.0 -> 1.0.1): text or UI only, no number in any trajectory changes;
 *   - minor (1.0 -> 1.1): bug fixes that change trajectories but keep the model's structure;
 *   - major (1.x -> 2.0): new state variables or equation forms.
 * Every research row (game_sessions, predictions, territorio_feedback) stores this string, so
 * analyses can stratify by model. Never reuse a version string for different equations.
 */
export const MODEL_VERSION = '1.0' as const;

/**
 * Per-game override, only used if the team decides to keep the 3-level game on an older model
 * while Territorio moves ahead (00_INDICE_v6.md, decision 3). Both point at MODEL_VERSION by default.
 */
export const MODEL_VERSION_BY_GAME: Record<'niveles' | 'territorio', string> = {
  niveles: MODEL_VERSION,
  territorio: MODEL_VERSION,
};
```

Reexportar desde `src/sim/index.ts`: `export { MODEL_VERSION, MODEL_VERSION_BY_GAME } from './version';`

### 3.2 SQL — `supabase/model_version_migration.sql`

```sql
-- v6 / fase 32: versión del modelo en cada fila de investigación.
-- Las filas existentes quedan con '1.0': todo lo recolectado hasta hoy usó el modelo 1.0.
ALTER TABLE public.game_sessions       ADD COLUMN IF NOT EXISTS model_version TEXT NOT NULL DEFAULT '1.0';
ALTER TABLE public.predictions         ADD COLUMN IF NOT EXISTS model_version TEXT NOT NULL DEFAULT '1.0';
ALTER TABLE public.territorio_feedback ADD COLUMN IF NOT EXISTS model_version TEXT
  CHECK (model_version IS NULL OR model_version ~ '^[0-9]+\.[0-9]+(\.[0-9]+)?(-dev)?$');

CREATE INDEX IF NOT EXISTS predictions_model_version_idx ON public.predictions (model_version);
CREATE INDEX IF NOT EXISTS game_sessions_model_version_idx ON public.game_sessions (model_version);
```

`territorio_feedback` es insert-only para `anon`: la columna nueva no cambia la política RLS. Verificar que la
política de INSERT no enumera columnas (si las enumera, agregar `model_version`).

### 3.3 Escritura en el cliente

- `createGameSession(userId, nivel, anioInicio)` → agregar `model_version: MODEL_VERSION_BY_GAME.niveles` al insert.
- `logPrediction(...)` → agregar `model_version: MODEL_VERSION_BY_GAME.niveles`.
- Resumen de Territorio (`buildSummary` en `src/territorio/survey/summary.ts`) → campo `model_version:
  MODEL_VERSION_BY_GAME.territorio`; propagar en `types.ts` (`TerritorioFeedbackRow`) y en la sanitización de
  `feedbackService.ts` (`text(row.model_version, 16)`).
- Si la tabla todavía no tiene la columna (proyecto sin migrar), el insert falla: mantener el patrón actual de
  degradación silenciosa (`warnedOnce`) y, en `feedbackService.ts`, reintentar una vez sin `model_version` para no
  perder la respuesta del cuestionario.

### 3.4 Tag de la línea base

Antes del primer commit de la fase 34:

```bash
git tag -a model-v1.0 -m "Modelo 1.0 congelado antes del paquete v6 (auditoría 19/10/2026)"
```

Claude Code no puede hacer push: dejar el comando en el log para que el equipo lo empuje con `git push origin model-v1.0`.

### 3.5 Material de referencia

Copiar `scripts/reference/modelo_v2.py`, `export_situations.ts` y `golden_v2.csv` de este paquete. Agregar a
`scripts/reference/README.md`:

```md
Prototipo de referencia del modelo 2.0 (Python, sin dependencias). No lo importa la app.
- python3 scripts/reference/modelo_v2.py            # tablas de caracterización
- python3 scripts/reference/modelo_v2.py --golden   # regenera golden_v2.csv
- npx tsx scripts/reference/export_situations.ts scripts/reference/situations.json   # para la parte de Territorio
```

Agregar `scripts/reference/situations.json` a `.gitignore` (se regenera desde el catálogo).

## 4. Tests

`tests/sim/version.spec.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { MODEL_VERSION } from '../../src/sim';

describe('model version', () => {
  it('is semver-like', () => expect(MODEL_VERSION).toMatch(/^\d+\.\d+(\.\d+)?(-dev)?$/));
  it('is recorded in docs/audit-equations.md', () => {
    const audit = readFileSync('docs/audit-equations.md', 'utf8');
    expect(audit).toContain(`Modelo ${MODEL_VERSION.replace('-dev', '')}`);
  });
});
```

Agregar en `docs/audit-equations.md` una sección `## Historial de versiones del modelo` con la fila
`Modelo 1.0 — commit 144c321 — estado auditado el 19/10/2026`.

## 5. Verificación

- [ ] `npx tsc --noEmit`, `npm test`, `npm run build`, `npm run i18n:audit` limpios.
- [ ] `npm run sim` da exactamente los mismos números que antes (esta fase no toca ecuaciones).
- [ ] El SQL corre dos veces sin error (idempotente) en un Postgres local o se revisa a mano.
- [ ] Un envío del cuestionario de Territorio sin la columna migrada no se pierde (test en `tests/territorio/feedbackService.spec.ts`).

## 6. Registro

Entrada en `docs/DESIGN_DECISIONS_LOG.md`: “v6 fase 32 — versión del modelo en los datos de investigación”, con el
comando del tag pendiente de push y el SQL pendiente de aplicar.

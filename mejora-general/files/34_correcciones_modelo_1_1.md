# 34 — Correcciones obligatorias: modelo 1.1

| | |
|---|---|
| **Objetivo** | Corregir los errores de implementación de la auditoría que no requieren cambiar la forma del modelo, y publicar el resultado en `main` como modelo `1.1` antes de los talleres. |
| **Rama** | `v6-modelo-1-1` → PR a `main` |
| **Depende de** | 33 |
| **Cierra** | N-01, N-02, N-03, N-08, N-09, N-14 (juego de 3 niveles); T-02, T-03, T-06, T-07, T-08 (parcial), T-12 (Territorio) |
| **Riesgo** | Medio: cambia trayectorias. Por eso sube `MODEL_VERSION` a `1.1`. |

Lo que **no** entra acá (requiere el modelo 2.0): indicadores inmóviles (N-04/T-04), colapso social (N-05), finanzas
(N-06/T-05), desgaste (N-07), carbono (N-12/T-11), puntaje (N-11/T-10), sorteo de eventos (N-10/T-09), situaciones
(T-01), umbrales de rutas (N-13).

## 1. Neutralidad de Carbono nunca pierde eficiencia (N-01, T-02)

**Dónde.** `src/constants.ts`, línea 120: `stellaName` quedó dentro del comentario de `costFactor`.

```ts
// antes (una sola línea):
description: "…", costFactor: 0.07,  // Increased: … teaches fiscal tradeoff stellaName: "Políticas_de_Carbono_Neutralidad",
// después:
description: "Implementa medidas amplias para reducir emisiones netas (renovables, impuestos al carbono).",
costFactor: 0.07, // carbon neutrality is ambitious and expensive: teaches the fiscal trade-off
stellaName: "Políticas_de_Carbono_Neutralidad",
```

**Test** (`tests/sim/invariants.spec.ts`, nuevo invariante `INV-15`):

```ts
it('INV-15: every decaying policy has a stellaName and a matching activation counter', () => {
  (Object.values(INITIAL_POLICIES) as PolicyState[]).forEach((p) => {
    if ((p.efficiencyDecayDuration ?? 0) > 0) {
      expect(p.stellaName, p.id).toBeTruthy();
      expect(`Tiempo_Activacion_${p.stellaName}` in INITIAL_STELLA_STOCKS, p.id).toBe(true);
    }
  });
});
```

Y en `tests/sim/stepYear.spec.ts`: CN activa 10 años sin eventos ⇒ `currentEfficiency ≈ e^(−10/20) = 0,607 ± 0,01`.

## 2. Esfuerzo parejo por defecto en el Nivel 1 (N-02)

**Dónde.** `src/App.tsx`, `togglePolicy` (≈ línea 1034). Hoy, al activar, el esfuerzo queda en 0; en el Nivel 1 el
panel de instrumentos no se muestra (`PolicyInstrumentsPanel.tsx`, línea 75), así que los canales de carbono de CN
(que dependen del esfuerzo en renovables y captura) nunca se activan.

**Corrección.** Al activar cualquier política con instrumentos, repartir el esfuerzo en partes iguales (igual que
`togglePolicy` de Territorio, `src/territorio/session.ts`). Extraer la lógica a una función pura compartida:

```ts
// src/sim/policies.ts
/** Even split of 100 % effort across a policy's instruments; remainder goes to the first one. */
export function evenEffort(policy: PolicyState): void {
  if (!policy.instruments) return;
  const ids = Object.keys(policy.instruments);
  if (ids.length === 0) return;
  const share = Math.floor(100 / ids.length);
  ids.forEach((id, i) => {
    policy.instruments![id].effortPercentage = i === 0 ? 100 - share * (ids.length - 1) : share;
  });
  policy.totalInstrumentEffortApplied = 100;
}
```

Usarla en `App.tsx` (activación, todos los niveles: en N2+ el jugador puede redistribuir después) y en
`src/territorio/session.ts` (reemplaza el bloque inline). En N1 el comportamiento de las demás políticas no cambia,
porque `getPolicyEfficiency` ignora el esfuerzo en `currentLevel < 2`.

**Test.** N1, solo CN activa: `co2EqEmissionsPerCapita` del año 1 < el de `do_nothing` del año 1.

## 3. Pactos como impulsos, no como saltos de nivel (N-03, T-03)

**Dónde.** `INITIAL_PACTS` (`src/constants.ts`, líneas 317–369); aplicación en `src/sim/index.ts` (paso 5) y
`src/sim/monthly.ts` (paso 5).

**Problema.** `effects()` devuelve, por ejemplo, `biodiversity: B + 5`, que se aplica **cada año** activo.
Medido: Tratado de Biodiversidad lleva B de 40 a 100 en 13 años; el Acuerdo Global de Carbono lleva E a 0 en 15.

**Corrección.** Separar en `Pact` dos tipos de efecto:

```ts
// src/types.ts
export interface PactImpulses {
  /** Added to the policy-impact sum of each indicator function, like one more policy at efficiency 1. */
  biodiversity?: number;
  foodSecurity?: number;
  economicSecurity?: number;
}
export interface Pact {
  // …campos actuales…
  impulses?: PactImpulses;
}
```

- `effects()` conserva **solo** los efectos sobre indicadores derivados (CO₂ × 0,95 / × 0,90, estabilidad +3 del año),
  que ya no se acumulan porque se recalculan cada año (`src/sim/deferred.ts`), y `landUseChangeFactors`.
- Los efectos sobre B, F, E pasan a `impulses`, sumados dentro de `calculateBiodiversityChange`,
  `calculateFoodSecurityChange` y `calculateEconomicSecurityChange` al `policyImpact` (antes de la ponderación).

Valores (equivalentes a una política fuerte, no mayores):

| Pacto | `impulses` | Comparación |
|---|---|---|
| `biodiversityTreaty` | `biodiversity: +0.40`, `economicSecurity: −0.05` | CR pesa +0,50 en B |
| `globalCarbonAccord` | `economicSecurity: −0.10` | CN pesa −0,05 en E |
| `techTransferInitiative` | `economicSecurity: +0.15` | PIE pesa +0,30 |

Agregar a las firmas un parámetro `pacts: Record<string, Pact>` (o el total ya sumado) y pasarlo desde `stepYear`
y `stepMonth`. En `stepMonth` el impulso entra igual que las políticas (la función anual ya se escala con `toward`).

**Invariante `INV-16`**: ningún pacto aporta más que la política de mayor peso sobre el mismo indicador
(`|impulse| ≤ max_j |weight_j|` para B, F, E en `INDICATOR_IMPACT_WEIGHTS`).

## 4. Pactos sin funciones al iniciar un nivel (N-14)

En `createInitialState` (`src/sim/index.ts`), después de `pacts: JSON.parse(JSON.stringify(INITIAL_PACTS))`,
restaurar `effects` desde `INITIAL_PACTS` (mismo bloque que usa `stepYear`). Extraer a
`restorePactFunctions(pacts)` en `src/sim/deferred.ts` y usarlo en los tres lugares (`stepYear`, `stepMonth`,
`createInitialState`). Test: `typeof createInitialState(2).gameStatePatch.pacts.biodiversityTreaty.effects === 'function'`.

## 5. Sequía: área del nivel vigente (N-09, T-08)

`src/constants.ts`, línea 676: reemplazar `TOTAL_LAND_AREA` (500 kHa fijo) por el área total del estado:

```ts
const total = (Object.values(gs.landUses) as LandUse[]).reduce((s, lu) => s + lu.area, 0) || 1;
if (gs.landUses[LandUseType.ConventionalCrops].area / total > 0.25) chance += 0.02;
```

El área que la sequía retira de CC y CA sigue sin destino en 1.1 (lo resuelve el barbecho de la fase 37). Dejar la
excepción documentada en `INV-01`.

## 6. Reactivar una política no restaura su eficiencia (T-06)

**Dónde.** `src/territorio/session.ts`, línea 377 (`p.currentEfficiency = p.initialEfficiency || 1`) y el bloque
equivalente de `App.tsx` (≈ línea 1060).

```ts
// src/sim/policies.ts
/** Efficiency a policy would have right now given its accumulated active time (no reset on re-activation). */
export function efficiencyFromCounter(policy: PolicyState, stella: StellaStocks): number {
  if (!policy.stellaName || !policy.efficiencyDecayDuration || !policy.initialEfficiency) return policy.initialEfficiency ?? 1;
  const years = (stella as any)[`Tiempo_Activacion_${policy.stellaName}`] ?? 0;
  return policy.initialEfficiency * Math.exp(-years / policy.efficiencyDecayDuration);
}
```

Usarla al activar en ambos juegos. `previousEfficiencyForNotification` se inicializa con el mismo valor (el aviso de
40 % no se repite por reactivar). Test: desactivar y reactivar en el mismo mes no cambia la eficiencia mostrada.

## 7. Bosque protegido declarado, separado del automático (T-07)

**Problema.** `publicNaturePct` (`src/territorio/routes.ts`) y el mantenimiento (`src/sim/monthly.ts`, línea 254)
usan todo el BNP, que incluye los 20 kHa iniciales y lo que protege el flujo base (0,8 %/año) sin decisión.

**Corrección.** Agregar a `GameState` un contador del área declarada por el jugador:

```ts
// src/types.ts (GameState)
/** kHa of protected native forest the player declared (or that matured from public restoration). Territorio only. */
declaredProtectedArea?: number;
```

- `declarePublicUse` (protected) suma `kHa * cells.length`.
- En `computeLandUseFlows`, el flujo `RES_to_BNP` también suma a `declaredProtectedArea` (lo restaurado por el Estado
  sigue siendo público); hacerlo en `stepMonth`, que es quien aplica el flujo en Territorio.
- `publicNaturePct` = (declarado + HUM + RES) / total.
- Mantenimiento = (declarado + HUM + RES + ENR) × costo.

**Recalibración mínima.** Sin el bosque automático, la ruta de integridad ecológica pierde ≈ 4–6 puntos de “uso público”.
Correr `npm run sim:territorio` y bajar `cond.publicNature` de 12 a 🟧[el valor que vuelva a dar 3/3 a
`conservation` y 0/3 a `do_nothing`; esperado ≈ 7 %]. Regenerar la tabla docente con
`npx tsx scripts/routes-table-html.ts`.

## 8. Efectos diferidos de las situaciones (T-12)

`resolveSituation` (`src/territorio/situations/index.ts`, línea 177) aplica en el acto los ajustes sobre indicadores
derivados, que el mes siguiente se recalculan desde cero. Corrección:

1. `resolveSituation` devuelve `deferred` sin aplicarlo.
2. `Session` gana `pendingDeferred: DeferredAdjustment[]`.
3. `decideSituation` y las expiraciones de `advanceMonth` acumulan ahí.
4. `stepMonth` acepta `options.extraDeferred` y los aplica en el paso 11.5 junto con los del evento; `advanceMonth`
   los pasa y vacía la lista.

Test: una situación sintética con `co2EqEmissionsPerCapita: −5 %` reduce el CO₂ del mes siguiente en ≈ 5 %.

## 9. Interfaz honesta (N-08)

1. **Panel de facilitación** (`src/components/facilitator/FacilitatorPanel.tsx`): quitar de `PARAM_GROUPS_ES/EN` las
   claves que el motor no lee: `Tasa_disipacion_agricola_Nivel_1..3`, `Tasa_disipacion_ambientalista_Nivel_1..3`,
   `Max_Emisiones_Referencia_Anual`, `Monto_del_Prestamo_Unico`. Test nuevo
   `tests/sim/facilitatorParams.spec.ts`: para cada clave del panel, modificarla ×1,5 cambia algún número del estado
   tras 5 años de `stepYear` con la estrategia `balanced`.
2. **Manual del facilitador** (`FacilitatorManual.tsx`, líneas 98–99 y 130–140): borrar la “sinergia Conservación +
   Carbono” y el “antagonismo Carbono + Subsidios” (no existen); corregir el ejemplo de presión agrícola (la política
   agroecológica la *reduce*); decir que la disipación es 0,10 fija para agrícola y ambientalista.
3. **Hoja docente** (`docentes-ecuaciones.html`) y `src/components/equations/descriptions.ts`: quitar “la eficiencia
   se ve afectada por el entorno político”; describir presiones como impulso lineal con disipación (no curva en S).
4. **Pistas de instrumentos** (`INSTRUMENT_IMPACT_HINTS`): mientras rija 1.1, el panel muestra debajo de las pistas
   “Orientativo: en el modelo 1.1 el efecto se calcula a nivel de política; solo Renovables y Captura tienen un efecto
   propio sobre el CO₂.” (es/en en `src/i18n/ui/*.ts`). La fase 36 vuelve reales las pistas.
5. **Parámetros muertos**: borrar de `CONTROL_PARAMS` y de `ControlParams` las 70 claves que ningún camino del motor
   lee (lista en el anexo A del PDF de auditoría del juego de 3 niveles). `npx tsc --noEmit` encuentra cualquier
   referencia residual. Los `Duracion_Efecto_*` se borran: las duraciones reales viven en `INITIAL_POLICIES`.

## 10. Versión y verificación de balance

- `MODEL_VERSION = '1.1'`; fila en `docs/audit-equations.md` (“Modelo 1.1 — correcciones de la auditoría”), con una
  línea por ID cerrado.
- `npm run sim:check -- --report-only` → `reports/balance-1.1.md`. Comparar con 1.0. Esperable: la ruta de innovación
  se vuelve algo más difícil (CN ahora decae); las rutas que usaban pactos pierden el atajo. Si una estrategia dirigida
  baja de su tasa de 1.0 en más de 20 puntos, ajustar **solo** el umbral de esa ruta y documentarlo; no tocar ecuaciones.
- `npm run sim` y `npm run sim:territorio` con los mismos chequeos de siempre (nadie gana sin jugar).

## 11. Verificación

- [ ] `npx tsc --noEmit`, `npm test` (con INV-15 e INV-16), `npm run build`, `npm run i18n:audit` limpios.
- [ ] `reports/balance-1.1.md` generado; diferencias con 1.0 explicadas en el log.
- [ ] Tabla de rutas de la hoja docente regenerada.
- [ ] PR a `main` con el resumen de cambios de comportamiento para el equipo docente.
- [ ] Recordatorio en el log: aplicar `supabase/model_version_migration.sql` y empujar el tag `model-v1.0`.

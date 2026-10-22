# 37 — Uso del suelo: matriz conservativa, barbecho y reasignación agrícola por renta

| | |
|---|---|
| **Objetivo** | Que toda transición de suelo sea una transferencia (el área se conserva siempre, también con eventos), que plantaciones y pasturas participen de la dinámica, y que las políticas productivas cambien la mezcla agrícola por la vía de la renta relativa. |
| **Rama** | `v6-modelo-v2` |
| **Depende de** | 36 |
| **Cierra** | L-1/T-08 (área perdida en sequías), L-4 (PF y PRG fijos), R-matriz completa |
| **Riesgo** | Medio |

## 1. Nuevo uso del suelo: barbecho

Agregar `LandUseType.Fallow` (`FAL`) en `src/types.ts`, en `INITIAL_LAND_USES` con área 0 en los tres niveles,
nombre “Barbecho / tierra degradada” (es) y “Fallow / degraded land” (en) en `src/legacyContent/gameData.ts`.
Tasas de carbono y hábitat en `PARAMS_V2` (flujo −2,0 tCO₂e/ha/año por rebrote; stock 55 Mg C/ha; hábitat 0,3).
Peso productivo 0. En Territorio ya existe el tipo de parcela `'fallow'`: a partir de esta fase **representa área
del modelo**, no área perdida (ver §5).

## 2. Flujos anuales (kHa/año)

Con η de la fase 36 (canal `land` para los flujos de frontera, canal `prod` para las rentas):

```
Frontera y protección (como 1.1):
  F(BNNP→BNP) = A_BNNP · (0,008 + 0,05·η_CR^land) · m_protect
  F(BNNP→CC)  = A_BNNP · (0,010 + 0,04·η_PAI^land + 0,01·η_FRA^land) · (1 − η_CR^land) · m_deforest
  F(BNNP→CA)  = A_BNNP · (0,002 + 0,02·η_AS^land) · (1 − η_CR^land)
  F(CA→BNNP)  = A_CA · (0,001 + 0,01·η_AS^land)
  F(RES→BNP)  = A_RES · 0,04
  F(FAL→BNNP) = A_FAL · 0,05                      (regeneración natural)

Reasignación agrícola (reemplaza a CC→CA de 1.1):
  pool = Σ_{k∈{CC,CA,PRG,PF}} 0,02·A_k + 0,25·A_FAL
  r_k  = ln(A_k,0) + Δr_k                          (renta anclada: sin políticas, el pool se reparte en las proporciones iniciales)
  Δr_CC  = 0,6·η_PAI^prod + 0,3·η_PEA^prod − 0,25·η_AS^prod − 0,2·η_CN^tax
  Δr_CA  = 0,8·η_AS^prod − 0,2·η_PAI^prod
  Δr_PRG = 0,4·η_GS^prod + 0,1·η_PEA^prod
  Δr_PF  = 0,2·η_PIE^prod + 0,15·η_FRA^prod
  F(i→k) = (contribución de i al pool) · e^{β r_k} / Σ_j e^{β r_j},   β = 1,   k ≠ i
```

`m_protect`, `m_deforest` vienen de pactos (fase 43; 1 por defecto). Antes de aplicar, **netear los flujos
bilaterales** del pool: si existen F(i→j) y F(j→i), queda solo la diferencia positiva. El pool es un mecanismo de
asignación; lo real es la transición neta, y sin netear el ida y vuelta generaría emisiones de cambio de uso
espurias en la fase 38.

Aplicación con `dt` y sin negativos:

```
salida_i = Σ_j F(i→j)·dt;   escala_i = min(1, A_i / salida_i)
A_i −= F(i→j)·dt·escala_i;  A_j += F(i→j)·dt·escala_i       (conserva Σ A exactamente)
```

Devolver además los flujos realizados en **hectáreas** (`kHa × 1000`) por par `(i, j)`: los lee el carbono (38) y el
mapa de Territorio (`stepMonth().flows`).

## 3. Eventos que quitan área

Todo efecto `landUseChange` de eventos y situaciones con signo negativo se convierte en transferencia **al barbecho**
(`target → FAL`); con signo positivo, en transferencia **desde** el barbecho (si no alcanza, desde PRG y luego CC,
en ese orden). Implementarlo en `applyRandomEventEffects` (`src/sim/events.ts`) con un helper:

```ts
/** Moves `kHa` from `from` to `to`, clamped to what `from` holds. Returns the amount moved. */
export function transferArea(landUses: Record<LandUseType, LandUse>, from: LandUseType, to: LandUseType, kHa: number): number
```

Con esto `INV-01` (conservación de área) vale **con eventos activos**: borrar la excepción documentada en
`tests/sim/invariants.spec.ts` y extender el test al núcleo con eventos.

## 4. Implementación

| Archivo | Cambio |
|---|---|
| `src/sim/v2/land.ts` (nuevo) | `landFlows(state, eff, CP)`, `applyLandFlows(landUses, flows, dt)`, `transferArea` |
| `src/sim/landUse.ts` | queda como reexport de compatibilidad (`computeLandUseFlows` → `landFlows`) o se borra si nadie más lo usa |
| `src/sim/v2/core.ts` | paso 5 llama a la matriz 2.0 |
| `src/sim/events.ts` | §3 |
| `src/sim/territory.ts` | §5 |
| `src/constants.ts`, `src/types.ts`, `src/legacyContent/gameData.ts` | barbecho |

Las anclas (`agriAreas0`) se guardan en `computeAnchors` (fase 35). Si un uso agrícola arranca en 0 kHa, usar
1e-6 para que su logaritmo sea finito (ese uso queda prácticamente excluido del pool, como corresponde).

## 5. Mapa de Territorio

`parcelTargets` (`src/sim/territory.ts`) hoy calcula el barbecho como “lo que el modelo dejó de contar”. Ahora el
barbecho es un uso más: `raw.fallow = landUses.FAL.area / kHaPerParcel`, y el resto del mapa se reparte igual.
`SOURCES` agrega: `[LandUseType.Fallow]: [CC, CA]` (sequías), y `BNNP` puede crecer desde `Fallow`
(regeneración). `declarePublicUse` sobre barbecho resta del área `FAL` del modelo (antes no restaba nada).
Revisar `tests/sim/territory.spec.ts`: las expectativas que suponían barbecho = área perdida se actualizan.

## 6. Tests

- `INV-01` con eventos: |Σ A(t) − Σ A(0)| < 1e-9 durante 30 años, 50 semillas.
- Sin políticas y con los flujos de frontera en cero (test con `PARAMS_V2.land` modificado), la participación de cada
  uso agrícola en el total agrícola cambia menos de 0,1 puntos en 30 años (equilibrio anclado). Con la frontera
  activa, CC gana ≈ 3 puntos en N1 por la deforestación (prototipo: 25,0 → 27,9).
- AS activa 30 años: CA sube ≥ 3 puntos en lo agrícola (prototipo: N1 25,0 → 29,5; N2 14,0 → 17,7). PAI + PEA: CC sube
  ≥ 7 puntos (prototipo: N1 25,0 → 35,3; N2 30,0 → 38,2).
- Netear: en equilibrio no hay flujos bilaterales positivos en ambos sentidos.
- Sequía: el área retirada aparece en `FAL` y vuelve a BNNP y al pool con las tasas de §2.

## 7. Verificación

- [ ] `npm run sim:check -- --quick` sin empeorar criterios (anotar cambios en recorrido de F y E).
- [ ] El mapa de Territorio muestra barbecho que se regenera (verificar a mano en `npm run dev`, `/territorio.html`).
- [ ] `npx tsc --noEmit`, `npm test`, `npm run build`, `npm run i18n:audit` limpios.
- [ ] `docs/audit-equations.md`: L-1 y L-4 pasan a OK.

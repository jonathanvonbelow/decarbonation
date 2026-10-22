# 36 — Políticas: puesta en marcha, desgaste con recuperación e instrumentos que importan

| | |
|---|---|
| **Objetivo** | Reemplazar el decaimiento exponencial de por vida por una eficiencia con puesta en marcha, desgaste, piso institucional y recuperación en reposo; hacer que cada instrumento actúe sobre canales distintos con rendimientos decrecientes; cobrar el costo según el esfuerzo. |
| **Rama** | `v6-modelo-v2` |
| **Depende de** | 35 |
| **Cierra** | N-07 (desgaste de por vida), R-3 (instrumentos), P-3 (costo sin relación con el esfuerzo), pistas de instrumentos sin ecuación (N-08, parte) |
| **Riesgo** | Medio |

## 1. Ecuaciones

Para cada política $j$ con $u_j \in \{0,1\}$:

```
reloj de puesta en marcha:  τ_j ← τ_j + dt   si u_j = 1;   τ_j ← 0           si u_j = 0
reloj de desgaste:          T_j ← T_j + dt   si u_j = 1;   T_j ← T_j·e^(−dt/ρ) si u_j = 0
eficiencia base:            η_j = u_j · (1 − e^(−τ_j/λ_j)) · [η_min + (1 − η_min)·e^(−T_j/δ_j)]
canal c de la política:     χ_j^c = Σ_k μ_jk^c·φ(e_jk) / Σ_k μ_jk^c·φ(25),   φ(e) = 1 − e^(−e/40)
eficiencia efectiva:        η_j^c = η_j · χ_j^c
costo anual:                K_j = κ_j · Y · (0,3 + 0,7·ē_j),   ē_j = min(100, Σ_k e_jk)/100
```

- λ (puesta en marcha), δ (desgaste), κ (costo): `PARAMS_V2.rampYears`, `fatigueYears`, `costShare`.
- `η_min = CP.Eficiencia_Minima_Politicas` (0,35), `ρ = CP.Recuperacion_Politicas_Anios` (5).
- Con reparto parejo (25/25/25/25), χ = 1 en todos los canales: el Nivel 1 se comporta como “política al 100 %”.
- Con esfuerzo total bajo, χ < 1 (12,5 por instrumento ⇒ χ = 0,58); con todo en un instrumento, el canal donde ese
  instrumento es relevante sube hasta ≈ 1,04 y los demás caen. Concentrar tiene costo de oportunidad, no es gratis.

Consecuencias de diseño que el juego debe enseñar:

1. Una política recién activada rinde poco el primer año (programas: λ = 1,5 años ⇒ 49 % al año 1).
2. Una política vieja no muere: tiende a η_min = 35 % (burocracia, captura, normalización).
3. Desactivar tiene sentido: tras 5 años en reposo, el desgaste acumulado cae a 37 %.
4. La permanencia mínima de 5 años (`POLICY_LOCK_IN_DURATION`) sigue vigente: impide prender y apagar cada año para
   “resetear” el desgaste.

## 2. Canales por instrumento — `PARAMS_V2.instruments`

Tres canales genéricos para todas las políticas, más los de energía de Neutralidad de Carbono:

| Canal | Lo leen |
|---|---|
| `land` | flujos de uso del suelo (37), hábitat y calidad de manejo en biodiversidad (40), flujos de carbono del suelo (38) |
| `prod` | rendimientos y exportación (41), seguridad económica (39), rentas de la reasignación agrícola (37) |
| `social` | conflicto y transición justa (45), presiones (42) |
| `elec`, `other`, `tax` (solo CN) | participación renovable, eficiencia no eléctrica, recaudación del impuesto al carbono (38, 44) |

Relevancia μ (1 = alta, 0,6 = media, 0,3 = baja), orden de instrumentos igual al de `INITIAL_POLICY_INSTRUMENTS`.
La etiqueta “apoyo”/“restricción” la usa el índice de transición justa (45).

| Política | Instrumentos (orden) | land | prod | social | Etiqueta |
|---|---|---|---|---|---|
| AS | bioinsumos, capacitación, corredores, certificación | .3 .6 1 .3 | 1 .6 .3 .6 | .6 1 .3 1 | apoyo, apoyo, apoyo, apoyo |
| CR | áreas protegidas, PSA, invasoras, guardaparques | 1 .6 .6 1 | .3 .3 .3 .3 | .3 1 .3 .3 | restr., apoyo, neutro, restr. |
| GS | silvopastoriles, pasturas, forraje/sequía, genética | 1 .6 .3 .3 | .6 1 .6 .6 | .6 .6 1 .3 | apoyo ×4 |
| AGUA | riego, fuentes/recarga, cosecha de lluvia, reúso | .3 1 .3 .3 | 1 .3 .6 .6 | .6 .3 1 .6 | apoyo, restr., apoyo, apoyo |
| CN | impuesto, renovables, eficiencia, captura | — | — | 1 .3 .3 .3 | restr., apoyo, apoyo, neutro |
| CN (energía) | | elec: .6 1 .3 0 · other: .6 .15 1 .5 · tax: 1 0 0 0 | | | |
| PAI | agroquímicos, infraestructura, maquinaria, variedades | .6 1 .6 .3 | 1 .6 .6 1 | .3 .6 .3 .3 | neutro ×4 |
| PEA | acuerdos, logística, marca país, flexibilización | .6 .6 .3 .3 | 1 .6 .6 .6 | .3 .3 .3 .6 | neutro ×4 |
| PIE | zonas francas, trámites, garantías, roadshows | .6 .3 .3 .3 | 1 .6 .6 .6 | .3 .3 .3 .3 | neutro ×4 |
| FRA | EIA rápida, moratorias, permisos, consulta no vinculante | 1 .6 1 .3 | .6 .3 .6 .3 | .6 .6 .3 1 | neutro ×4 |
| SE | combustibles, tarifas industria, hidrocarburos, gas residencial | 1 .6 1 .3 (canal `land` = emisiones fósiles) | .3 1 .6 .3 | .6 .3 .3 1 | neutro ×4 |

Escribirlo como:

```ts
export const INSTRUMENT_CHANNELS: Record<Pid, { ids: string[]; land: number[]; prod: number[]; social: number[];
  tag: ('support' | 'restriction' | 'neutral')[]; elec?: number[]; other?: number[]; tax?: number[] }> = { … };
```

`ids` repite las claves de `INITIAL_POLICY_INSTRUMENTS` en orden; un test verifica que coincidan (si alguien
reordena instrumentos, el test falla en lugar de mezclar canales en silencio).

## 3. Implementación

### 3.1 `src/sim/v2/policies.ts` (nuevo; reemplaza el núcleo de `src/sim/policies.ts`)

```ts
export interface PolicyEfficiency { base: number; land: number; prod: number; social: number; elec?: number; other?: number; tax?: number; }

/** Advances the two policy clocks by dt (years). Mutates the cloned policies (advance() owns the copy). */
export function tickPolicyClocks(policies: Record<Policy, PolicyState>, dt: number, CP: ControlParams): void {
  (Object.values(policies) as PolicyState[]).forEach((p) => {
    if (p.isActive) {
      p.rampTime = (p.rampTime ?? 0) + dt;
      p.fatigueTime = (p.fatigueTime ?? 0) + dt;
    } else {
      p.rampTime = 0;
      p.fatigueTime = (p.fatigueTime ?? 0) * Math.exp(-dt / CP.Recuperacion_Politicas_Anios);
    }
  });
}

export function baseEfficiency(p: PolicyState, pid: Pid, CP: ControlParams): number {
  if (!p.isActive) return 0;
  const ramp = 1 - Math.exp(-(p.rampTime ?? 0) / PARAMS_V2.rampYears[pid]);
  const floor = CP.Eficiencia_Minima_Politicas;
  const fatigue = floor + (1 - floor) * Math.exp(-(p.fatigueTime ?? 0) / PARAMS_V2.fatigueYears[pid]);
  return ramp * fatigue;
}

export function channelStrength(efforts: number[], relevance: number[]): number {
  const e0 = PARAMS_V2.effortE0;
  const den = relevance.reduce((s, r) => s + r * phiEffort(25, e0), 0) || 1;
  return relevance.reduce((s, r, k) => s + r * phiEffort(efforts[k] ?? 0, e0), 0) / den;
}

export function computeEfficiencies(policies: Record<Policy, PolicyState>, level: number, CP: ControlParams): Record<Pid, PolicyEfficiency> { … }

export function policyCost(policies: Record<Policy, PolicyState>, gdp: number): number { … }
```

Reglas:

- En el Nivel 1 el esfuerzo es siempre parejo (la fase 34 ya lo asigna al activar); `computeEfficiencies` no
  distingue niveles: el esfuerzo manda en todos.
- `PolicyState.currentEfficiency` pasa a guardar `base` (para la UI y Gemini). `initialEfficiency` y
  `efficiencyDecayDuration` se borran de `INITIAL_POLICIES`.
- `costFactor` de `INITIAL_POLICIES` se borra; el costo sale de `PARAMS_V2.costShare` con la fórmula de §1.
- Borrar `Tiempo_Activacion_*` y `Conteo_*` de `StellaStocks` e `INITIAL_STELLA_STOCKS`, y la función
  `efficiencyFromCounter` de la fase 34 (la reemplaza `baseEfficiency`). En Territorio y en `App.tsx`, al activar
  una política su eficiencia mostrada es `baseEfficiency` (0 al activar: está arrancando).

### 3.2 Avisos al jugador

`checkEfficiencyWarning` cambia de criterio: avisa una vez cuando el factor de desgaste
`(η − η_min)/(1 − η_min)` cae por debajo de 0,5 (“esta política perdió la mitad de su empuje; si la dejás descansar,
se recupera”). Agregar un estado visual “en marcha (NN %)” mientras la rampa está por debajo de 0,9. Textos es/en en
`src/i18n/ui/*.ts` y `src/i18n/territorio/*.ts`.

### 3.3 Integración en `advance()` (pasos 2 y 4)

```ts
tickPolicyClocks(next.policies, dt, CP);
const eff = computeEfficiencies(next.policies, next.currentLevel, CP);   // pasado a los pasos 5-8
```

Mientras los submodelos siguientes no estén reescritos, `getPolicyEfficiency` (1.1) se redefine como
`eff[pid].prod` para no romper `landUse.ts`, `indicators.ts`, etc. Cada fase posterior cambia a su canal.

## 4. Tests — `tests/sim/policies.v2.spec.ts`

- `baseEfficiency` con `rampTime = λ` y `fatigueTime = 0` = 1 − e⁻¹ = 0,632.
- Con `fatigueTime → ∞`, tiende a `η_min`.
- 5 años inactiva: `fatigueTime` se multiplica por e⁻¹.
- `channelStrength([25,25,25,25], r) = 1` para cualquier `r`; `channelStrength([0,0,0,0], r) = 0`.
- `policyCost`: política al 50 % de esfuerzo cuesta 0,3 + 0,35 = 0,65 κ·Y.
- Las claves de `INSTRUMENT_CHANNELS[pid].ids` coinciden con `INITIAL_POLICY_INSTRUMENTS[PID[pid]]`.
- Monotonía (INV-12 del plan original): con todo lo demás igual, más esfuerzo en un instrumento nunca reduce el
  canal donde ese instrumento tiene relevancia > 0.

## 5. Verificación

- [ ] `npm run sim:check -- --quick`: los criterios no empeoran respecto de 35 (la eficiencia cambia pero los
      submodelos son todavía 1.1; anotar los cambios de números).
- [ ] La UI muestra “en marcha” y “desgastada” en ambos juegos.
- [ ] `npx tsc --noEmit`, `npm test`, `npm run build`, `npm run i18n:audit` limpios.
- [ ] Fila en `docs/audit-equations.md`: cierra P-1/N-07 y P-3.

# 45 — Conflicto distributivo y transición justa

| | |
|---|---|
| **Objetivo** | Que el conflicto social vea la distribución: la concentración de la tierra en usos de escala (CC y PF) y la proporción entre instrumentos de apoyo y de restricción en las políticas de transición. Conecta el juego con la línea de investigación sobre desigualdad de la tierra y conflictos territoriales en el Bosque Atlántico. |
| **Rama** | `v6-modelo-v2` |
| **Depende de** | 39 (marco de C), 36 (etiquetas de instrumentos), 44 (estrés fiscal) |
| **Cierra** | Propuesta de conflicto distributivo de la auditoría |
| **Riesgo** | Bajo |

## 1. Índices

```
Concentración de la tierra productiva:
  G = (A_CC + A_PF) / (A_CC + A_CA + A_PRG + A_PF)

Carga de restricción y apoyo de la transición (con η^social de la fase 36 y las etiquetas de INSTRUMENT_CHANNELS):
  R_load  = η_CR + 0,5·η_CN^tax + 0,3·η_AGUA          (políticas que restringen el uso o encarecen la producción)
  Support = 0,5·(η_AS + η_GS)                           (políticas que acompañan al productor)
  J       = Support / (Support + R_load)   (1 si ambos son 0)       índice de transición justa ∈ [0,1]
```

En la implementación, `R_load` y `Support` se calculan **por instrumento**: cada instrumento etiquetado como
`restriction` suma `η_j · e_jk/100` a `R_load`, cada `support` a `Support` (las constantes de arriba son el resultado
con reparto parejo, y son las que usa el prototipo). Así, una política de conservación que pone el esfuerzo en Pago
por Servicios Ambientales (apoyo) genera menos conflicto que la misma política con todo en guardaparques (restricción).

## 2. Términos nuevos en el objetivo del conflicto (fase 39, §3)

```
D_C += 3,0·(G − G_0) + 0,6·(1 − J)·R_load
```

Lectura para el jugador: expandir monocultivos y plantaciones concentra la tierra y genera conflicto aunque suba el PBI;
restringir sin acompañar también.

## 3. Índices visibles

`G` y `J` se muestran en el panel social (fase 50) y se guardan en los índices de investigación de la sesión (fase 48).
DecarboNito puede decir, por ejemplo: “Tu política de conservación es casi toda restricción: probá mover esfuerzo a PSA”.

## 4. Implementación

| Archivo | Cambio |
|---|---|
| `src/sim/v2/social.ts` (nuevo) | `landConcentration(landUses)`, `justTransition(policies, eff)` |
| `src/sim/v2/indicators.ts` | `targetC` suma los dos términos |
| `src/types.ts` | `ModelState.social = { concentration, justTransition, restrictionLoad }` |

## 5. Tests

- Sin políticas, J = 1 y el término de transición vale 0.
- CR con todo el esfuerzo en PSA ⇒ R_load menor que con todo en guardaparques ⇒ C* menor.
- Pasar 30 kHa de CA a CC sube G y C*.

## 6. Verificación

- [ ] `npm run sim:check -- --quick`: `tech_tax` (impuesto al carbono sin acompañamiento) sigue sin ganar; la estrategia
      `extractive` tiene el bienestar más bajo de N2 (prototipo: W ≈ 47–55).
- [ ] `npx tsc --noEmit`, `npm test`, `npm run build` limpios.

# 43 — Pactos internacionales como desplazamientos del objetivo

| | |
|---|---|
| **Objetivo** | Pasar los pactos del parche de la fase 34 (impulsos dentro del integrador 1.1) al marco 2.0: mientras un pacto está activo, desplaza los objetivos de los indicadores y los parámetros de energía y suelo; sus costos escalan con el PBI. |
| **Rama** | `v6-modelo-v2` |
| **Depende de** | 39–42 |
| **Cierra** | N-03/T-03 en la forma definitiva |
| **Riesgo** | Bajo |

## 1. Efectos por pacto (`PARAMS_V2.pacts`)

| Pacto | Desbloqueo | Entrada / anual (fracción del PBI) | Mientras está activo |
|---|---|---|---|
| Tratado de Biodiversidad | 2030 | 0,03 / 0,002 | `D_B += 0,25`; `D_E −= 0,05`; `m_protect = 1,5`, `m_deforest = 0,5` en la matriz (37) |
| Acuerdo Global de Carbono | 2035 | 0,05 / 0,004 | `D_E −= 0,10`; `D_Pc −= 0,15` (respaldo internacional); `s* += 0,05`, `u* += 0,05` (38) |
| Transferencia Tecnológica | 2038 | 0,10 / 0,008 | `D_E += 0,15`; `s* += 0,10`, `u* += 0,05` |

Comparación con políticas: CR aporta `qB = 0,55` a `D_B`; el tratado, 0,25 (≈ media política). PIE aporta 0,55 a
`D_E`; la transferencia, 0,15. **Ningún pacto supera a la política más fuerte sobre el mismo indicador** (invariante
INV-16, que se reescribe sobre `PARAMS_V2`).

En 1.1, el tratado llevaba B de 40 a 100 en 13 años. En 2.0 (prototipo, N2, año 30): la estrategia de conservación
termina con B = 60,3 con tratado y 54,2 sin él (≈ +6 puntos); el tratado solo, sin políticas, lleva B de 39,2 a 45,4 y no
gana ninguna ruta; los tres pactos juntos, sin políticas, tampoco. El efecto es estacionario: no crece con los años
de pertenencia.

## 2. Implementación

| Archivo | Cambio |
|---|---|
| `src/sim/v2/pacts.ts` (nuevo) | `pactShift(state, key)`, `pactLandFactors(state)`, `pactEnergyShift(state)`, `pactCosts(state, gdp)` |
| `src/constants.ts` | `INITIAL_PACTS`: se borran `effects`, `costToJoin`, `annualCost`; quedan `id`, `name`, `description`, `unlockYear`, `isActive` |
| `src/types.ts` | `Pact` sin `effects` (función) ni `impulses`; la clave de efectos es el `id` |
| `src/sim/deferred.ts` | se borran `applyPactEffectsOnDerived` y `restorePactFunctions` (ya no hay funciones que restaurar tras clonar con JSON) |
| `src/sim/index.ts`, `monthly.ts`, `territorio/session.ts`, `App.tsx` | se borran las restauraciones de `effects` tras cada clon |
| `src/App.tsx` (`togglePact`), `src/territorio/session.ts` (`togglePact`) | costo de entrada = `entry × PBI_Real`; se paga con la regla de inversión pública de la fase 44 |

Eliminar las funciones de los pactos simplifica el estado: `GameState` vuelve a ser JSON puro y desaparece una
fuente de errores (N-14).

## 3. Tests

- Con el tratado activo, `D_B` aumenta exactamente 0,25 y no cambia con los años de pertenencia.
- `pactCosts` escala con el PBI.
- `JSON.parse(JSON.stringify(state))` es un clon completo (no se pierde nada al clonar).
- INV-16 sobre `PARAMS_V2`.

## 4. Verificación

- [ ] `npm run sim:check -- --quick`: la estrategia `innovation` (accord + tech) y `conservation` (treaty) no ganan
      por el pacto solo: probar en el arnés la variante “solo pacto” y confirmar que no gana ninguna ruta.
- [ ] La UI de pactos muestra el costo en función del PBI actual (es/en).
- [ ] `npx tsc --noEmit`, `npm test`, `npm run build` limpios.

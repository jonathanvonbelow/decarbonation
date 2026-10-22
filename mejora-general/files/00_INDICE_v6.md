# 00 — Índice y orquestación v6: modelo 1.1 (correcciones) y modelo 2.0 (motores rediseñados)

> **Para Claude Code.** Este paquete corrige los errores del modelo de simulación que detectó la auditoría del
> 19/10/2026 y reescribe los dos motores (juego de 3 niveles y DecarboNation Territorio) a un modelo 2.0
> calibrado. Ejecutá los archivos **en orden**, uno por fase, con commit propio. Leé este índice completo antes de
> tocar código. Leé también `referencia/modelo_v2.py`: es el prototipo ejecutable de todas las ecuaciones nuevas y
> la fuente de los valores de referencia (*golden*) contra los que se verifica el port a TypeScript.
>
> Los campos marcados con 🟧[ … ] son decisiones o valores que el equipo puede editar. Si un 🟧 no fue
> reemplazado, usá el valor por defecto que aparece adentro y dejalo anotado en el log.

---

## 1. Ubicación de estos archivos en el repo

Copiar a `mejora-general/files/` (continúan la numeración del paquete v5, que terminó en `31`):

```
mejora-general/files/
├── 00_INDICE_v6.md                         ← este archivo
├── 32_versionado_del_modelo.md
├── 33_arnes_completo.md
├── 34_correcciones_modelo_1_1.md            ← va a main (hotfix antes de talleres)
├── 35_motor_v2_estructura.md                ← desde acá, rama v6-modelo-v2
├── 36_politicas_eficiencia_instrumentos.md
├── 37_uso_del_suelo_matriz.md
├── 38_carbono_unidades_fisicas.md
├── 39_indicadores_por_relajacion.md
├── 40_biodiversidad_especies_area.md
├── 41_seguridad_alimentaria_balance.md
├── 42_presiones_sectoriales.md
├── 43_pactos_internacionales.md
├── 44_finanzas_publicas.md
├── 45_conflicto_distributivo.md
├── 46_eventos_y_paso_mensual.md
├── 47_territorio_situaciones_usos_publicos.md
├── 48_prediccion_e_indices.md
├── 49_recalibracion_rutas_puntaje.md
├── 50_interfaz_docentes_decarbonito.md
└── 51_validacion_cierre_deploy.md
```

Y el material de referencia (no se compila, no lo importa la app):

```
scripts/reference/
├── modelo_v2.py              ← prototipo de referencia (Python 3.10+, sin dependencias)
├── export_situations.ts      ← exporta el catálogo de situaciones a JSON para el prototipo
└── golden_v2.csv             ← valores de referencia sin eventos (3 niveles × 3 estrategias × años 1/10/30)
```

## 2. Estado de partida (verificado contra `main` @ `144c321`, 13/10/2026)

| Área | Estado | Problema (ID de la auditoría) |
|---|---|---|
| Políticas | Decaimiento `e^(−T/δ)` con contador que no se reinicia; δ de 3 a 25 años | Neutralidad de Carbono no decae por un `stellaName` comentado (N-01/T-02); N1 sin esfuerzo en instrumentos (N-02); desgaste de por vida (N-07); reactivación muestra 100 % (T-06) |
| Indicadores | B, F, E integradores con ganancia 0,1; conflicto con escalones en 45 | Casi inmóviles (N-04/T-04); bienestar condenado desde el inicio (N-05) |
| Pactos | Salto de nivel por año activo | Dominan B y E (N-03/T-03) |
| Finanzas | Sin gasto base; bancarrota con umbral inalcanzable | Tesoro sin escasez (N-06/T-05) |
| Carbono | Factor 40.000, `max(0,·)`, sin sector energía | Unidades no físicas (N-12/T-11) |
| Territorio | Situaciones como saltos permanentes de nivel | El resultado lo decide la semilla (T-01) |
| Interfaz | Panel de facilitación con 8 parámetros sin efecto | Promesas sin ecuación (N-08) |

Los dos PDF de auditoría (`DecarboNation_Juego3Niveles_Especificacion_y_Correcciones.pdf`,
`DecarboNation_Territorio_Especificacion_y_Correcciones.pdf`) y el paper técnico del modelo 2.0 están en el proyecto.
Cuando este paquete y el código discrepen en un hecho del estado actual, **gana el código**: anotá la diferencia en el log.

## 3. Decisiones del equipo (no reabrir sin avisar)

1. **Dos versiones del modelo.** `1.1` = el modelo actual con los errores corregidos (fase 34), se publica en `main`
   antes de los talleres. `2.0` = motores rediseñados (fases 35–51), en la rama `v6-modelo-v2`, y se fusiona a `main`
   solo cuando `npm run sim:check` pasa completo (fase 51).
2. **Los datos de investigación se separan por versión.** Cada sesión, predicción y cuestionario guarda
   `model_version`. Ningún análisis mezcla versiones sin estratificar.
3. 🟧[**Los dos juegos reciben el modelo 2.0.**] Alternativa: congelar el juego de 3 niveles en 1.1 hasta cerrar la
   recolección del artículo y aplicar 2.0 solo a Territorio. Si se elige la alternativa, en la fase 51 se fusiona
   2.0 detrás de `MODEL_VERSION_BY_GAME = { niveles: '1.1', territorio: '2.0' }` (ver 32 §4).
4. **Población del territorio:** 🟧[400.000] habitantes en los tres niveles y en Territorio (densidad 67–80 hab/km²).
   Con esa escala el perfil de emisiones queda con AFOLU ≈ 20–35 % del total, comparable al 39 % del inventario
   argentino; con 10 millones el uso del suelo dejaría de pesar en el CO₂ per cápita.
5. **Carbono en unidades físicas** (tCO₂e, Mg C/ha) con sector energía explícito. Se elimina el factor 40.000.
6. **Ancla en el estado inicial.** Todo indicador acotado tiende a un objetivo logístico que, sin políticas, coincide
   con su valor inicial: el jugador ve moverse solo lo que él o el territorio movieron.
7. **Fuera de alcance de este ciclo:** Modo Facilitador ampliado, v3.0 con datos reales de Argentina, “La Aventura”,
   narrativa visual 2.6. Nada de esto se toca.

## 4. Orden de ejecución y dependencias

```
32 Versionado ──► 33 Arnés ──► 34 Correcciones 1.1 ──► (merge a main, deploy, talleres)
                                     │
                                     ▼  rama v6-modelo-v2
35 Estructura ──► 36 Políticas ──► 37 Suelo ──► 38 Carbono ──► 39 Indicadores ──► 40 Biodiversidad ──► 41 Alimentaria
                                                                      │
      ┌───────────────────────────────────────────────────────────────┘
      ▼
42 Presiones ──► 43 Pactos ──► 44 Finanzas ──► 45 Conflicto ──► 46 Eventos/mensual ──► 47 Territorio
                                                                                             │
48 Predicción e índices ◄────────────────────────────────────────────────────────────────────┘
      │
      ▼
49 Recalibración ──► 50 Interfaz y docentes ──► 51 Validación, merge y deploy
```

| # | Archivo | Depende de | Produce | Riesgo |
|---|---|---|---|---|
| 32 | Versionado | — | `MODEL_VERSION`, columnas `model_version`, tag `model-v1.0` | Bajo |
| 33 | Arnés completo | 32 | `npm run sim:check`, reportes de línea base 1.0 | Bajo |
| 34 | Correcciones 1.1 | 33 | Modelo 1.1 en `main` | Medio (cambia balance) |
| 35 | Estructura v2 | 34 | `src/sim/v2/`, `advance()` común, anclas, golden test | Medio |
| 36 | Políticas | 35 | Puesta en marcha, fatiga, recuperación, instrumentos | Medio |
| 37 | Uso del suelo | 36 | Matriz conservativa, barbecho, reasignación por renta | Medio |
| 38 | Carbono | 37 | tCO₂e, LUC, energía, presupuesto | Alto (cambia escala de c) |
| 39 | Indicadores | 38 | Marco logístico + E, conflicto, colapso | Alto |
| 40 | Biodiversidad | 39 | Especies-área en logit, conectividad | Medio |
| 41 | Alimentaria | 39 | Balance oferta/demanda | Medio |
| 42 | Presiones | 39 | Presiones en S, ancladas | Medio |
| 43 | Pactos | 39–42 | Pactos como desplazamiento de objetivo | Bajo |
| 44 | Finanzas | 39 | Gasto base, deuda automática, quiebra | Alto |
| 45 | Conflicto distributivo | 39, 44 | Concentración de tierra, transición justa | Bajo |
| 46 | Eventos y mensual | 35–45 | Bernoulli independiente, AR(1), estacionalidad | Medio |
| 47 | Territorio | 46 | Situaciones como impulsos, usos públicos, rutas | Alto |
| 48 | Predicción e índices | 47 | Bandas por terciles, habilidad, índices | Medio |
| 49 | Recalibración | 48 | Rutas y puntaje de ambos juegos | Alto |
| 50 | Interfaz y docentes | 49 | UI, manuales, hoja docente, DecarboNito | Bajo (volumen) |
| 51 | Validación y cierre | todo | Sensibilidad, QA, merge, deploy | Medio |

**Ruta mínima si falta tiempo:** 32 → 33 → 34 (deploy) → 35 → 36 → 39 → 43 → 44 → 47 → 48 → 49 → 51. Las fases
37, 38, 40, 41, 42, 45 y 46 mejoran el realismo pero el juego funciona sin ellas (con los submodelos de 1.1). Si se
recorta, anotarlo en el log y en `src/sim/v2/README.md`.

## 5. Reglas globales (valen para todas las fases)

- **Ramas.** Fases 32–34 en `v6-modelo-1-1` → PR a `main`. Fases 35–51 en `v6-modelo-v2`, creada desde `main` *después*
  del merge de 34. Un commit por fase: `feat(v6): NN — <título corto>` (o `fix`/`docs`).
- **Se levanta la regla “el juego de 3 niveles no cambia de comportamiento”** solo para `src/sim/` y solo en este
  paquete, porque el cambio es el objetivo. Se reemplaza por: *todo cambio de comportamiento queda registrado en
  `docs/audit-equations.md`, sube `MODEL_VERSION` y se verifica con `npm run sim:check`.*
- **Parámetros solo en archivos de parámetros.** Ningún número nuevo del modelo vive en una función: va a
  `src/sim/v2/params.ts` (tablas) o a `ControlParams` (escalares que el facilitador puede tocar). Cada parámetro lleva
  comentario con unidad, fuente o “criterio experto”, y el ID de la fase.
- **Pureza y determinismo** (como hoy): nada en `src/sim/` importa React, usa `Math.random` o `Date.now`. Toda
  aleatoriedad entra por `Rng`.
- **El prototipo manda en las ecuaciones, el arnés manda en la calibración.** Si el port a TS diverge de
  `golden_v2.csv` más allá de la tolerancia, se busca la diferencia de implementación; no se agranda la tolerancia.
  Si una recalibración posterior cambia un parámetro, se actualiza el prototipo y se regenera el golden en el mismo
  commit.
- **Cada fase** agrega una entrada fechada a `docs/DESIGN_DECISIONS_LOG.md` (qué se hizo, desvíos, deudas,
  verificación) y, si toca ecuaciones, una fila en `docs/audit-equations.md` con el ID de la auditoría que cierra.
- **Cada fase deja la rama compilando y con tests en verde:** `npx tsc --noEmit`, `npm test`, `npm run build`,
  `npm run i18n:audit`. Desde la fase 35, además, `npm run sim:check -- --quick` no debe empeorar respecto de la fase
  anterior (el reporte compara automáticamente).
- **Textos nuevos bilingües** con el patrón existente (diccionarios tipados en React; pares `data-lang` en páginas
  estáticas). Terminología fija del índice v5.
- **No inventar cifras en textos.** Toda cifra docente se lee del código (`scripts/routes-table-html.ts` y el nuevo
  `scripts/params-table-html.ts` de la fase 50).
- **Sin credenciales.** El SQL se deja listo para pegar en el SQL Editor de Supabase; Claude Code no lo aplica.

## 6. Criterios de aceptación del modelo 2.0 (los verifica `npm run sim:check`)

Medidos por el prototipo de referencia; la implementación en TS debe cumplirlos con el arnés completo.

| Criterio | Juego de 3 niveles (40 semillas) | Territorio (20 semillas) |
|---|---|---|
| “Sin hacer nada” nunca gana | 0 % en N1, N2, N3 | 0 % |
| La estrategia dirigida gana su ruta | ≥ 70 % (prototipo: 75–100 %) | ≥ 70 % (prototipo: 90–100 %) |
| Ninguna estrategia gana todas las rutas a la vez | sí | sí |
| Atajos cerrados | `tech_tax` y `extractive` ≤ 5 % | `settle_only`, `cheap_production`, `extractive`, `buy_everything` ≤ 5 % |
| La estrategia decide, no la semilla | ninguna estrategia del arnés con tasa de victoria entre 30 % y 70 % | ídem |
| Recorrido de indicadores entre estrategias extremas (año 30) | ≥ 15 puntos en B, F, E y W | ≥ 15 puntos en B, F, E y W |
| Banda de predicción equilibrada | “sin cambio” = 33 % ± 3 en B, E y c | — (Territorio no tiene predicción; ver 48 §7) |
| Sin colapsos espurios | ninguna estrategia del arnés termina en quiebra salvo `buy_everything` en Territorio | ídem |
| Consistencia anual–mensual | |Δ| ≤ 1 punto en indicadores y ≤ 0,1 t en c a los años 10 y 30 (N2, sin eventos) | — |

## 7. Verificación al final de cada fase

```bash
npx tsc --noEmit
npm test
npm run build
npm run i18n:audit
npm run sim:check -- --quick     # desde la fase 33; completo (sin --quick) en 34, 49 y 51
```

## 8. Riesgos fuera de este paquete (anotar, no resolver)

- Supabase free tier se pausa tras 7 días: 🟧[Responsable: Jonathan] confirma el proyecto activo antes de cada taller.
- La API key de Gemini sigue en el bundle del cliente (deuda documentada en v5, fase 24).
- Las cifras de calibración del prototipo son de un modelo de juego, no de un territorio real: no se presentan como
  proyecciones del Bosque Atlántico. La hoja docente lo dice explícitamente (fase 50).

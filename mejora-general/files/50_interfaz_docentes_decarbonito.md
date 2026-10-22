# 50 — Interfaz, manuales, paquete docente y DecarboNito al día con el modelo 2.0

| | |
|---|---|
| **Objetivo** | Que todo lo que ve el jugador, el facilitador y el docente describa el modelo 2.0 tal como funciona, y que las variables nuevas (objetivos, energía, deuda, transición justa) sean visibles donde ayudan a decidir. |
| **Rama** | `v6-modelo-v2` |
| **Depende de** | 49 |
| **Cierra** | N-08 en su forma definitiva; documentación desalineada |
| **Riesgo** | Bajo (volumen) |

## 1. Juego de 3 niveles

| Componente | Cambio |
|---|---|
| `src/components/Dashboard.tsx` | Cada indicador muestra una flecha hacia su **objetivo** (`model.targets`): “va hacia 52”. B con un decimal. Bloque de carbono: total per cápita, desglose energía / suelo / cambio de uso, participación renovable, presupuesto de carbono usado. Bloque fiscal (N3; en N1–N2 solo saldo primario): deuda/PBI, saldo primario, carga de intereses, estado “sin espacio fiscal”. |
| `src/components/PolicyToggle.tsx` | Estado de la política: “en marcha (NN %)”, “plena”, “desgastada (NN %)”; costo anual actual (depende del esfuerzo). |
| `src/components/PolicyInstrumentsPanel.tsx` | Las pistas por instrumento salen de `INSTRUMENT_CHANNELS` (fase 36): canal con relevancia ≥ 0,6 ⇒ “alto/medio”; etiqueta apoyo/restricción. Se borra `INSTRUMENT_IMPACT_HINTS` y el aviso “orientativo” de la fase 34. Mostrar el costo marginal de subir el esfuerzo. |
| `src/components/levelSpecific/*` | Índices G (concentración) y J (transición justa) en el panel social de N2–N3. |
| `src/components/tutorial/chapters.ts`, `PredictionStrip.tsx`, `DebriefingModal.tsx` | Textos sobre eficiencia (puesta en marcha, desgaste, recuperación), esfuerzo y canales; debriefing con los índices de la fase 48. |
| `src/components/equations/EquationsManual.tsx`, `descriptions.ts` | Reescritos con las nueve familias de ecuaciones 2.0 (§4). |
| `src/components/facilitator/FacilitatorPanel.tsx` | Grupos nuevos (§3). |
| `src/components/facilitator/FacilitatorManual.tsx` | Reescrito para 2.0; incluye la advertencia de sensibilidad de `Gasto_Publico_Base_*`. |

## 2. Territorio

| Componente | Cambio |
|---|---|
| `src/territorio/hud.tsx` | Indicadores con flecha al objetivo; CO₂ con desglose y presupuesto; espacio fiscal. |
| `src/territorio/panels.tsx` | Usos públicos: costo actual (√(Y/Y₀)), aviso de conectividad (“contiguo al bosque: rinde más”), error `no-fiscal-space`. Políticas: estado de rampa/desgaste. Bandeja: cada decisión muestra “efecto: se desvanece en ~18 meses” cuando corresponde. |
| `src/territorio/advisorRules.ts` | Cues nuevos, una vez por partida salvo críticos: espacio fiscal bajo (D/Y > 0,5), política desgastada por debajo de 0,5, conservación con J < 0,4 (“restringir sin acompañar”), lote aislado del bosque, presupuesto de carbono > 1,2. `territorioContext` agrega objetivos, energía, fiscal, G y J. |
| `src/territorio/news.ts` | Titulares para quiebra cercana, salto de participación renovable, barbecho que se regenera. |
| `src/territorio/screens.tsx` | Pantalla final con los índices de la fase 48. |

## 3. Panel de facilitación

Grupos (es/en), solo con claves que el motor lee (el test `facilitatorParams.spec.ts` de la fase 34 se mantiene):

| Grupo | Claves |
|---|---|
| Crecimiento y población | `Tasa_Base_Crecimiento_PBI`, `Tasa_Crecimiento_Poblacional_Base`, `Poblacion_Inicial` (solo al reiniciar nivel) |
| Velocidades de ajuste | `Velocidad_Ajuste_Biodiversidad`, `_Seg_Alimentaria`, `_Seg_Economica`, `_Conflicto`, `_Colapso`, `_Presiones` |
| Políticas | `Eficiencia_Minima_Politicas`, `Recuperacion_Politicas_Anios` |
| Finanzas | `Tasa_Impositiva_General_Sobre_PBI`, `Gasto_Publico_Base_Nivel_1..3`, `Tasa_de_interes_Nivel_1..3`, `Pago_deuda_anual_Nivel_1..3`, `Max_Additional_Tax_Rate_Percentage`, `Ano_Activacion_Prestamo` |

## 4. Paquete docente y hoja de ecuaciones

- `docentes-ecuaciones.html`: reemplazar “las siete familias” por las nueve del modelo 2.0 (políticas; uso del suelo;
  carbono; marco de indicadores; biodiversidad; alimentación; economía y conflicto; presiones; finanzas), con las
  ecuaciones del paper técnico, en es/en (`data-lang`).
- Script nuevo `scripts/params-table-html.ts` que genera la tabla de parámetros desde `PARAMS_V2` y `CONTROL_PARAMS`
  (mismo patrón que `routes-table-html.ts`): nombre, valor, unidad, fuente o “criterio experto”.
- Sección “Rigor”: qué está calibrado por simulación (umbrales de rutas, bandas de predicción, γ), qué viene de
  literatura (stocks de carbono del Bosque Atlántico, exponente z, perfil del inventario nacional) y qué es criterio
  experto (flujos de carbono por uso, coeficientes de políticas). **Decir explícitamente** que las cifras son de un
  modelo de juego y no proyecciones del Bosque Atlántico.
- Guía, plan de clase, diapositivas y espacio asincrónico (variantes Territorio y 3 niveles, es/en): revisar toda
  mención a mecánicas (“las políticas pierden eficiencia con el tiempo”, “el tesoro”, “los pactos”) y actualizarla.
  `npm run i18n:audit` cubre los pares de idioma.

## 5. DecarboNito

- `CHATBOT_BASE_INSTRUCTION` y `chatbotSystemInstruction` de cada nivel (`src/constants.ts`): agregar las mecánicas
  2.0 que el jugador puede usar (puesta en marcha y descanso de políticas, canales de instrumentos, espacio fiscal y
  deuda, transición justa). Mantener la regla de N1 de no mencionar instrumentos (el panel no existe en N1).
- `src/services/geminiService.ts`: el contexto del juego incluye, por indicador, valor y objetivo (“va hacia”), el
  desglose de CO₂, deuda/PBI y saldo primario, G y J. El agente (`decarbonitoAgent.ts`) no cambia de acciones.
- `src/game/uiActionRegistry.ts`: si alguna acción `read` devolvía `Tiempo_Activacion_*` o `effects` de pactos,
  actualizar a los campos nuevos.

## 6. i18n

Claves nuevas en `src/i18n/ui/es.ts`/`en.ts` y `src/i18n/territorio/es.ts`/`en.ts` (el build falla si falta una
traducción). Nombres de dominio nuevos (barbecho) en `src/legacyContent/gameData.ts`.

## 7. Verificación

- [ ] Recorrido manual en `npm run dev`, es y en, escritorio y celular: `/play.html` niveles 1–3 (con `?demo=1`),
      `/territorio.html`, `/docentes-ecuaciones.html`.
- [ ] Ningún texto menciona mecánicas de 1.1 (buscar: “Tiempo_Activacion”, “decaimiento exponencial”, “40.000”,
      “tesoro ≥”, “esfuerzo tecnológico”).
- [ ] `npx tsc --noEmit`, `npm test`, `npm run build`, `npm run i18n:audit` limpios.

# 18 — Tutoriales, onboarding y debriefing v3

**Depende de:** `14_decarbonito_overlay.md` (anclas + capa), `15_decarbonito_agent_actions.md`, `17_multiples_vias_victoria.md`, `12_i18n_completo.md`
**Toca:** `components/common/TutorialModal.tsx` (se reemplaza), `components/tutorial/*` (nuevo), `PlayerManual`, `PlayerReportGuideModal`, `constants.ts`

---

## 1. Diagnóstico

El tutorial actual son **nueve pantallas de texto antes de tocar el juego**. Aproximadamente 1.400
palabras que describen una interfaz que el jugador todavía no vio. Es el patrón que la investigación
de onboarding en juegos identifica como el peor posible: máxima carga cognitiva, mínima retención,
y ocurre justo en el momento de mayor riesgo de abandono.

Además queda desactualizado en cada release. Hoy mismo describe "a la derecha, encontrarás el panel
de DecarboNito" — que después del archivo `14` deja de existir.

Y hay un problema más profundo, ya identificado por el equipo: **los jugadores no podían articular
qué estaban aprendiendo**. Eso no lo arregla un tutorial; lo arregla un ciclo de
predicción → acción → sorpresa → reflexión. Este archivo construye las cuatro partes.

---

## 2. Arquitectura del aprendizaje

Cinco momentos, cada uno con su mecanismo:

| Momento | Mecanismo | Dónde |
|---|---|---|
| **Entrada** (0–90 s) | Apertura en frío: una decisión real antes de cualquier explicación | §3 |
| **Andamiaje** (min 2–10) | Capítulos guiados por DecarboNito, señalando controles reales | §4 |
| **Predicción** (cada año) | El jugador anota qué espera antes de simular; el juego le muestra el error | §5 |
| **Justo a tiempo** | Consejos disparados por el estado, no por el reloj | §6 |
| **Salida** | Debriefing estructurado con evidencia de la propia partida | §7 |

---

## 3. Apertura en frío

Al iniciar por primera vez, **no** aparece un modal de bienvenida. Aparece el tablero, con todo
atenuado salvo dos políticas, y DecarboNito con un globo:

> *"Sos responsable de la política climática de este país. Tenés una decisión sobre la mesa:
> ¿expandimos la agricultura intensiva o protegemos el bosque nativo? Elegí una y vemos qué pasa."*

El jugador activa una de las dos. DecarboNito confirma (`nod`), y ofrece: *"Ahora simulemos un año
y miremos tres números."* Se simula. Los tres indicadores relevantes se animan con su delta y el
bot dice qué pasó, en una frase, apuntando a cada uno.

Recién entonces: *"Eso es el juego entero. Todo lo demás son detalles. ¿Te los muestro ahora o
preferís explorar?"* → dos botones: **Mostrame** (arranca el capítulo 1) / **Explorar**
(cierra el andamiaje; los capítulos quedan disponibles desde el botón de ayuda).

Requisitos duros:

- Tiempo hasta la primera decisión con consecuencia visible: **< 90 segundos**.
- Cero modales bloqueantes.
- Se puede saltar completo con un enlace discreto "Ya conozco el juego" (persiste en `localStorage`).
- Ambas opciones iniciales son **defendibles**: ninguna es la respuesta correcta. Es la primera
  lección del juego y hay que enseñarla en el primer minuto.

---

## 4. Motor de capítulos guiados

### 4.1 Modelo de datos

```ts
// src/components/tutorial/types.ts
import type { AnchorId } from '@/components/decarbonito/anchors';
import type { DnState, DnEmotion } from '@/components/decarbonito/types';
import type { SimState } from '@/sim/types';

export interface TutorialStep {
  id: string;
  /** i18n key for the bubble text. Never a literal. */
  textKey: string;
  /** Interpolations resolved against live game state at render time. */
  values?: (s: SimState) => Record<string, string | number>;
  /** DecarboNito travels here and points before speaking. */
  anchor?: AnchorId;
  pose?: { state: DnState; emotion?: DnEmotion };
  /** Dim everything except the anchor. Only true inside guided chapters. */
  spotlight?: boolean;
  /** How the step is completed. */
  advance:
    | { on: 'click' }                                        // botón "Siguiente"
    | { on: 'anchorClick'; anchorId: AnchorId }              // el jugador toca el control real
    | { on: 'gameEvent'; event: TutorialGameEvent }          // p. ej. 'policyActivated'
    | { on: 'predicate'; check: (s: SimState) => boolean }
    | { on: 'timeout'; ms: number };
  /** Skipped when false — lets a chapter adapt to what the player already did. */
  when?: (s: SimState) => boolean;
  /** Optional agent action the bot performs to demonstrate (tutorial mode only). */
  demo?: { action: string; args: Record<string, unknown> };
}

export interface TutorialChapter {
  id: ChapterId;
  titleKey: string;
  /** Minimum level at which the chapter is offered. */
  level: number;
  /** Auto-offered the first time this condition holds. */
  trigger?: (s: SimState) => boolean;
  estimatedSeconds: number;
  steps: TutorialStep[];
}
```

### 4.2 Motor

```tsx
// src/components/tutorial/useTutorialEngine.ts
/**
 * Drives a chapter: positions DecarboNito, waits for the step's advance condition,
 * and persists progress. The tutorial never mutates game state by itself — when a step
 * needs a demonstration it goes through the action registry in `tutorial` mode (file 15),
 * so every scripted change is logged with actor='tutorial' and excluded from learning analytics.
 */
export function useTutorialEngine() {
  const dn = useDecarboNito();
  const { t } = useT();
  const [active, setActive] = useState<{ chapter: TutorialChapter; index: number } | null>(null);

  const runStep = useCallback(async (step: TutorialStep, s: SimState) => {
    if (step.when && !step.when(s)) return next();
    if (step.anchor) await dn.focusOn(step.anchor, { spotlight: step.spotlight });
    if (step.pose) dn.play(step.pose.state, step.pose.emotion);
    dn.say(t(step.textKey, step.values?.(s)), {
      priority: 3, ttl: null,
      actions: step.advance.on === 'click'
        ? [{ labelKey: 'tutorial.next', onSelect: next }]
        : undefined,
    });
    // ... suscripción a la condición de avance, con escape por 'Esc' y botón "Salir del tutorial"
  }, [dn, t]);
  // ...
}
```

Reglas de comportamiento:

- **Siempre interrumpible.** `Esc` o "Salir del tutorial" en cualquier paso. Se guarda el punto.
- **Nunca bloquea un control que el paso pide tocar.** El *spotlight* atenúa, no deshabilita.
- Si el jugador hace algo distinto de lo pedido, el bot lo reconoce (*"probaste otra cosa, bien:
  mirá qué pasó"*) y salta al paso siguiente que siga teniendo sentido. Nada de "no, hacé clic acá".
- Progreso persistido en `localStorage` (`decarbonation.tutorial.<chapterId>`) y en Supabase.

### 4.3 Contenido de los capítulos

Ocho capítulos, todos cortos. La duración total del andamiaje completo es de ~9 minutos, contra los
~6 de lectura pasiva del tutorial actual — pero repartidos a lo largo de la partida y sobre
controles reales.

| # | `id` | Nivel | Seg. | Contenido |
|---|---|---|---|---|
| 0 | `coldOpen` | 1 | 90 | La decisión inicial (§3) |
| 1 | `board` | 1 | 70 | Los indicadores: qué mide cada uno, colores, y que **bajo en CO₂ es bueno** (fuente habitual de confusión). Señala 3 tiles reales |
| 2 | `policies` | 1 | 80 | Activar/desactivar, límite de 5, bloqueo temporal, costo fiscal. El jugador activa una de verdad |
| 3 | `routes` | 1 | 90 | **Nuevo**: las rutas de victoria. "No hay una sola forma de ganar." Muestra las tres tarjetas y el progreso actual |
| 4 | `prediction` | 1 | 60 | **Nuevo**: cómo funciona la predicción anual (§5). Se hace una en vivo |
| 5 | `decarbonito` | 1 | 70 | Qué puede hacer el asesor: preguntar, señalar, y **operar controles**. Demo real: "pedime que active una política" |
| 6 | `instruments` | 2 | 90 | Instrumentos y esfuerzo. Explica explícitamente que **activar sin asignar esfuerzo no produce efecto** |
| 7 | `pressures` | 2 | 80 | Presiones sectoriales, curva de normalización, polarización y estabilidad |
| 8 | `finance` | 3 | 100 | Préstamos, deuda, presión fiscal adicional, pactos. Advertencia sobre el préstamo como deuda |

Los capítulos 6–8 **no se ofrecen al entrar al nivel**: se disparan la primera vez que el jugador
toca el control correspondiente (`trigger`). Enseñar el instrumento en el momento en que se necesita
es la diferencia entre información y aprendizaje.

### 4.4 Reescritura del contenido existente

El texto de los nueve pasos actuales de `TutorialModal.tsx` no se tira: se **redistribuye**.

| Contenido actual | Destino |
|---|---|
| "¡Bienvenido a DecarboNation!" | Se elimina (lo reemplaza la apertura en frío) |
| "Panel de Control Superior" | Capítulo 1, recortado a 2 frases + señalamiento |
| "Indicadores de Sostenibilidad" | Capítulo 1 |
| "Tomando Decisiones: Las Políticas" | Capítulo 2 |
| "Afinando el Impacto: Instrumentos" | Capítulo 6 |
| "Territorio y Avance del Tiempo" | Capítulo 1 (gráfico) + capítulo 4 (simular) |
| "DecarboNito: Tu Asesor IA" | Capítulo 5, **reescrito**: ya no está "a la derecha" |
| "Progresión y Desafíos Futuros" | Manual del Jugador (no es tutorial, es referencia) |
| "Finanzas Avanzadas y Pactos" | Capítulo 8 |
| "¡Todo Listo para Liderar!" | Se elimina |

`TutorialModal.tsx` se borra. El **Manual del Jugador** se mantiene como referencia consultable y se
actualiza en tres puntos: chat flotante, rutas de victoria, y capacidad de operación del asesor.

---

## 5. Mecánica de predicción (la pieza pedagógica central)

Antes de simular un año, aparece una tira compacta sobre el botón de simular:

```
Antes de simular, ¿qué esperás?
Biodiversidad   ↓  ↔  ↑        Emisiones   ↓  ↔  ↑        Seguridad económica   ↓  ↔  ↑
                                                            [ Simular año → ]
```

Tres clics, seis segundos. **Opcional pero activada por defecto**; se puede desactivar en ajustes
(en talleres largos conviene dejarla; en demos rápidas, no).

Después de simular, cada indicador predicho muestra:

- **Acierto**: marca en `chlorophyll`, sin fanfarria.
- **Error**: marca en `ochre` y DecarboNito ofrece *una* frase de explicación causal, tomada del
  `SimTrace` del archivo `16` — no inventada: *"esperabas que subiera; bajó 3,1 porque la conversión
  a cultivos convencionales pesó más que la conservación"*.

Por qué esto importa más que cualquier otra mejora de este paquete:

1. **Hace visible el modelo mental del jugador**, que es exactamente lo que el juego quiere
   modificar. Sin predicción, el jugador no sabe qué creía; con ella, se entera de que se equivocó.
2. **Genera el dato que necesita el artículo.** La serie de predicciones por jugador y año es una
   medida directa de aprendizaje: la tasa de acierto debería crecer a lo largo de la partida. Es
   una variable dependiente mucho más defendible que el puntaje final.
3. Convierte cada simulación en un momento de tensión, que es lo que faltaba en el ritmo del juego.

```sql
create table if not exists predictions (
  id bigint generated always as identity primary key,
  session_id uuid not null,
  year int not null,
  level int not null,
  indicator text not null,
  predicted text not null check (predicted in ('down','flat','up')),
  actual text not null check (actual in ('down','flat','up')),
  delta numeric not null,
  correct boolean generated always as (predicted = actual) stored,
  created_at timestamptz not null default now()
);
create index on predictions (session_id, year);
```

Umbral de "sin cambio" (`flat`): |Δ| < 1% del rango del indicador. Documentarlo, porque define la
dificultad de acertar.

---

## 6. Consejos justo a tiempo

Reemplazan el consejo genérico. Se disparan por estado, respetan el presupuesto de proactividad del
archivo `14` (2 por año) y **nunca se repiten**.

| Disparador | Mensaje |
|---|---|
| 5 políticas activas y se intenta una sexta | Explica el límite y ofrece señalar la de menor eficiencia |
| Política activa con esfuerzo total 0 (nivel ≥ 2) | "Esta política está activa pero sin esfuerzo asignado: no está haciendo nada" |
| Eficiencia < 40% | Señala la fila y explica el decaimiento |
| Una presión > 70 dos años seguidos | Explica la curva de normalización y qué políticas la mueven |
| Tesoro negativo | Señala el indicador y enumera las tres palancas fiscales disponibles en ese nivel |
| Tres años sin cambiar ninguna política | "¿Estás esperando algo en particular? Puedo mostrarte qué se está moviendo solo" |
| Faltan 2 años para terminar el nivel y ninguna ruta > 60% | Muestra la ruta más cercana y su cuello de botella |
| Predicción errada 3 veces seguidas en el mismo indicador | Ofrece explicar cómo se calcula ese indicador |

---

## 7. Debriefing estructurado

`PlayerReportGuideModal` deja de ser una lista de preguntas genéricas y pasa a ser un
**informe con evidencia + reflexión guiada**, en tres pantallas.

### Pantalla 1 — Qué hiciste (evidencia, sin juicio)

Generado desde el historial de la partida:

- Línea de tiempo de decisiones: qué política se activó cada año y qué pasó con dos indicadores.
- Ruta lograda (o la más cercana) y su cuello de botella.
- **Perfil estratégico**: reparto porcentual del esfuerzo entre políticas ambientales, productivas y
  tecnológicas, contra el promedio de todos los jugadores.
- **Curva de predicción**: tasa de acierto por año. El gráfico que muestra si aprendiste.
- Los tres años de mayor cambio, con la causa principal según `SimTrace`.

### Pantalla 2 — Qué aprendiste (reflexión guiada)

Cinco preguntas, con campo de texto libre. Se guardan en Supabase (con consentimiento) y alimentan
el análisis cualitativo del artículo:

1. ¿Qué esperabas que pasara al principio que no pasó?
2. ¿Cuál fue el trade-off más difícil y por qué lo resolviste así?
3. ¿La ruta que lograste es la que te habías propuesto? ¿Cuándo cambiaste de idea?
4. ¿Qué harías distinto con el conocimiento que tenés ahora?
5. ¿Qué de esto se parece a una decisión real de política pública que conozcas?

DecarboNito ofrece dialogar sobre cualquiera de las respuestas (botón por pregunta), con el estado
final y el `SimTrace` en contexto. **No corrige**: repregunta.

### Pantalla 3 — Qué sigue

- Comparación con otras rutas: "ganaste por la vía productiva; ¿probás la ecológica?" con un botón
  que reinicia el nivel con esa ruta destacada.
- Tarjeta compartible con el resultado (archivo `20`).
- Enlace al Manual del Jugador y a la sección de ecuaciones del indicador que peor le fue.

### Versión para talleres grupales

Un botón "Modo taller" imprime/exporta las pantallas 1 y 2 en una hoja A4 (PDF vía `window.print()`
con hoja de estilos dedicada), para que los grupos comparen resultados en plenario. Es lo que pide
la dinámica de debriefing presencial y evita depender de que cada participante tenga la pantalla.

---

## 8. Telemetría del tutorial

```sql
create table if not exists tutorial_events (
  id bigint generated always as identity primary key,
  session_id uuid not null,
  chapter text not null,
  step text,
  action text not null check (action in ('offered','started','step_completed','skipped','abandoned','completed')),
  elapsed_ms int,
  created_at timestamptz not null default now()
);
```

Métricas a vigilar: tasa de finalización por capítulo, paso donde más gente abandona, y correlación
entre capítulos completados y desempeño. Si un capítulo tiene >40% de abandono, está mal escrito o
llega en mal momento: acortarlo o mover su disparador.

---

## Verificación

1. Un jugador nuevo llega a su primera decisión con consecuencia visible en **menos de 90 s**
   (cronometrar con tres personas distintas).
2. Ningún texto del tutorial menciona la ubicación del chat ni "a la derecha".
3. Los ocho capítulos corren completos en español y en inglés, señalando anclas que existen
   (ningún `facepalm` por ancla ausente).
4. Salir con `Esc` en cualquier paso y reanudar desde el mismo punto tras recargar.
5. La predicción se registra en Supabase con `predicted`, `actual` y `delta` coherentes.
6. El debriefing muestra la curva de predicción y la ruta lograda correctas para la partida jugada.
7. `npm run i18n:audit` limpio: todo el contenido del tutorial vive en los diccionarios.
8. Las acciones demostradas por el tutorial quedan registradas con `actor='tutorial'` y no
   contaminan el análisis de decisiones del jugador.

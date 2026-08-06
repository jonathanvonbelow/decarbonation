# 15 — DecarboNito operador: acciones de interfaz por lenguaje natural

**Depende de:** `14_decarbonito_overlay.md` (registro de anclas + capa), `12_i18n_completo.md`
**Habilita:** `18_tutoriales_v3.md`
**Toca:** `src/services/`, `src/game/uiActionRegistry.ts`, `api/gemini.ts` (nuevo), `src/App.tsx`

---

## 1. Alcance

El jugador escribe *"activá agroecología y ponele todo el esfuerzo a los sistemas
silvopastoriles"* o *"mostrame dónde veo las emisiones"*, y DecarboNito **ejecuta** o **muestra**.

Tres modos de operación, seleccionables por el jugador y forzados por contexto:

| Modo | Qué puede hacer | Cuándo |
|---|---|---|
| `observer` | Solo responder y señalar (`highlight`, `explain`). Cero mutación de estado | Por defecto en **instancias de investigación** y evaluación |
| `assist` | Todo lo anterior + mutar estado **con confirmación explícita** del jugador | Por defecto en juego libre |
| `tutorial` | Todo lo anterior + ejecutar sin confirmar dentro de un capítulo guiado | Solo durante tutoriales (archivo `18`) |

**Restricción dura, sin excepciones:** `simulateYear`, `setLevel`, `requestLoan` y `resetGame`
**siempre** requieren confirmación del jugador, incluso en `tutorial`. Son irreversibles o cambian
la unidad de análisis de la partida; que las dispare un modelo por su cuenta arruina tanto la
experiencia como el dato de investigación.

---

## 2. Arquitectura

```
Jugador (texto libre)
   │
   ▼
ConversationPanel ──► agentTurn()  ──►  /api/gemini (Edge Function)
   │                                        │  tools: functionDeclarations
   │                                        ▼
   │                                   Gemini 3.6 Flash
   │                                        │  functionCalls[]
   ▼                                        ▼
ActionExecutor ◄──── validate(zod) ◄─── ActionRegistry
   │
   ├─► preview: coreografía (moveTo → point → highlight) + tarjeta de confirmación
   ├─► apply:   dispatch al estado del juego (mismos handlers que usa la UI)
   └─► result:  functionResponse de vuelta al modelo → texto final en el globo
```

Principio rector: **el agente no toca el estado directamente**. Llama exactamente a los mismos
handlers que llama un clic humano (`togglePolicy`, `setInstrumentEffort`, …). Cualquier validación
o efecto secundario ya existente se aplica igual. Si un handler no existe como función pura y
reutilizable, extraerlo antes.

---

## 3. Registro de acciones

### 3.1 Contrato

```ts
// src/game/uiActionRegistry.ts
import { z } from 'zod';
import type { GameState } from '@/types';
import type { AnchorId } from '@/components/decarbonito/anchors';

export type ActionKind = 'read' | 'navigate' | 'mutate' | 'advance';

export interface ActionContext {
  state: GameState;
  locale: 'es' | 'en';
  /** Same handlers the UI uses. Injected from App.tsx. */
  handlers: GameHandlers;
  dn: DnApi;
}

export interface ActionDef<S extends z.ZodTypeAny = z.ZodTypeAny> {
  name: string;
  kind: ActionKind;
  /** i18n key for the model-facing description; resolved per locale at prompt build time. */
  descriptionKey: string;
  schema: S;
  /** True if this action must be confirmed by the player regardless of mode. */
  alwaysConfirm?: boolean;
  /** Minimum level at which the action is meaningful. Below it, the action is not exposed. */
  minLevel?: number;
  /** Which anchor to travel to / point at before executing. */
  anchorFor?: (args: z.infer<S>, ctx: ActionContext) => AnchorId | null;
  /** Cheap, side-effect-free check. Returns a human sentence explaining why it can't run. */
  validate?: (args: z.infer<S>, ctx: ActionContext) => string | null;
  /** One-line, already-translated summary shown in the confirmation card. */
  preview: (args: z.infer<S>, ctx: ActionContext) => string;
  /** Performs the change. Must be idempotent-safe and never throw for user errors. */
  execute: (args: z.infer<S>, ctx: ActionContext) => Promise<ActionResult> | ActionResult;
}

export interface ActionResult {
  ok: boolean;
  /** Sent back to the model as functionResponse. Keep it factual and compact. */
  data: Record<string, unknown>;
  /** Shown to the player in the bubble. Already translated. */
  message: string;
}
```

### 3.2 Catálogo (16 acciones)

| # | `name` | kind | Argumentos | Confirma |
|---|---|---|---|---|
| 1 | `list_policies` | read | `{ onlyActive?: boolean }` | no |
| 2 | `explain_indicator` | read | `{ indicator: enum }` | no |
| 3 | `read_state` | read | `{ fields?: string[] }` | no |
| 4 | `diagnose_trajectory` | read | `{}` → proyección a 3 años y riesgos | no |
| 5 | `highlight_element` | navigate | `{ anchorId: string; note?: string }` | no |
| 6 | `open_panel` | navigate | `{ panel: enum }` | no |
| 7 | `show_chart` | navigate | `{ series: enum }` | no |
| 8 | `start_tutorial_chapter` | navigate | `{ chapter: enum }` | no |
| 9 | `activate_policy` | mutate | `{ policyId }` | sí (assist) |
| 10 | `deactivate_policy` | mutate | `{ policyId }` | sí (assist) |
| 11 | `set_instrument_effort` | mutate | `{ policyId, instrumentId, effort:0-100 }` | sí (assist) |
| 12 | `distribute_effort` | mutate | `{ policyId, strategy: 'even'\|'focus', focusInstrumentId? }` | sí (assist) |
| 13 | `toggle_pact` | mutate | `{ pactId }` — L3 | sí (assist) |
| 14 | `set_tax_pressure` | mutate | `{ percentage: 0-20 }` — L3 | sí (assist) |
| 15 | `request_loan` | mutate | `{ amount }` — L3 | **siempre** |
| 16 | `simulate_year` | advance | `{ years?: 1 }` | **siempre** |

`set_level` y `reset_game` quedan **fuera** del registro a propósito: son metajuego y su uso por
el agente contamina la trazabilidad de la partida.

### 3.3 Ejemplo completo de definición

```ts
export const activatePolicy: ActionDef = {
  name: 'activate_policy',
  kind: 'mutate',
  descriptionKey: 'agent.actions.activatePolicy.description',
  schema: z.object({
    policyId: z.string().describe('Exact policy id, as returned by list_policies'),
  }),
  anchorFor: ({ policyId }) => ANCHORS.policyRow(policyId),
  validate: ({ policyId }, { state, locale }) => {
    const policy = state.policies[policyId];
    if (!policy) return tFor(locale, 'agent.errors.unknownPolicy', { id: policyId });
    if (policy.isActive) return tFor(locale, 'agent.errors.alreadyActive', { name: policy.name });
    const activeCount = Object.values(state.policies).filter(p => p.isActive).length;
    if (activeCount >= MAX_ACTIVE_POLICIES)
      return tFor(locale, 'agent.errors.policyLimit', { max: MAX_ACTIVE_POLICIES });
    return null;
  },
  preview: ({ policyId }, { state, locale }) =>
    tFor(locale, 'agent.preview.activatePolicy', {
      name: policyName(state, policyId, locale),
      cost: (state.policies[policyId].costFactor * 100).toFixed(1),
    }),
  execute: ({ policyId }, { handlers, state, locale }) => {
    handlers.togglePolicy(policyId);
    return {
      ok: true,
      data: { policyId, activeCount: countActive(state) + 1 },
      message: tFor(locale, 'agent.done.activatePolicy', { name: policyName(state, policyId, locale) }),
    };
  },
};
```

> **Regla:** toda cadena que ve el jugador pasa por `t()`. Toda cadena que ve el modelo
> (descripciones de herramientas) también, porque el modelo debe razonar en el idioma de la partida.

---

## 4. Capa de modelo

### 4.1 Migración obligatoria de modelo

`gemini-2.5-flash` se retira el **16 de octubre de 2026**. Además, la familia 3.x **deprecó
`temperature`, `top_p` y `top_k`**: si quedan en el `config`, se ignoran o rompen la llamada.

```ts
// src/services/geminiClient.ts
/**
 * Model id is configuration, never a literal. Google's retirement cadence is ~9 months;
 * hardcoding the id is how this app breaks silently in production.
 */
export const MODEL = import.meta.env.VITE_GEMINI_MODEL ?? 'gemini-3.6-flash';
export const MODEL_FALLBACK = import.meta.env.VITE_GEMINI_MODEL_FALLBACK ?? 'gemini-3.5-flash-lite';
```

```bash
# .env.local  y  Vercel → Settings → Environment Variables
GEMINI_API_KEY=...                       # solo servidor (ver §5)
VITE_GEMINI_MODEL=gemini-3.6-flash
VITE_GEMINI_MODEL_FALLBACK=gemini-3.5-flash-lite
```

Actualizar el SDK: `npm i @google/genai@^2.15.0`. Verificar en el changelog de la API antes del
taller si `gemini-3.6-flash` sigue siendo GA; si Google lo movió, solo cambia la variable de entorno.

### 4.2 Declaración de herramientas y bucle

```ts
// src/services/decarbonitoAgent.ts
import { GoogleGenAI, FunctionCallingConfigMode, type FunctionDeclaration } from '@google/genai';
import { zodToJsonSchema } from 'zod-to-json-schema';

/** Builds the tool list for the current level, locale and mode. */
export function buildTools(ctx: ActionContext, mode: AgentMode): FunctionDeclaration[] {
  return Object.values(REGISTRY)
    .filter(a => (a.minLevel ?? 1) <= ctx.state.currentLevel)
    .filter(a => (mode === 'observer' ? a.kind === 'read' || a.kind === 'navigate' : true))
    .map(a => ({
      name: a.name,
      description: tFor(ctx.locale, a.descriptionKey),
      parametersJsonSchema: zodToJsonSchema(a.schema, { target: 'openApi3' }),
    }));
}

const MAX_STEPS = 5;  // hard cap on the tool-use loop, per player turn

export async function agentTurn(userText: string, ctx: ActionContext, mode: AgentMode) {
  const tools = [{ functionDeclarations: buildTools(ctx, mode) }];
  const history: Content[] = [...ctx.chatHistory, { role: 'user', parts: [{ text: userText }] }];

  for (let step = 0; step < MAX_STEPS; step++) {
    const res = await callModel({
      contents: history,
      config: {
        systemInstruction: buildSystemInstruction(ctx, mode),
        tools,
        toolConfig: { functionCallingConfig: { mode: FunctionCallingConfigMode.AUTO } },
      },
    });

    // Gemini 3.x devuelve thought signatures: reinyectar las parts tal cual para
    // conservar el razonamiento entre turnos de herramienta.
    history.push({ role: 'model', parts: res.candidates[0].content.parts });

    const calls = res.functionCalls ?? [];
    if (calls.length === 0) return { text: res.text, history };

    const responses: Part[] = [];
    for (const call of calls) {
      const result = await executeCall(call, ctx, mode);   // §4.3
      responses.push({ functionResponse: { id: call.id, name: call.name, response: result.data } });
    }
    history.push({ role: 'user', parts: responses });
  }
  return { text: tFor(ctx.locale, 'agent.errors.tooManySteps'), history };
}
```

### 4.3 Ejecución con coreografía y confirmación

```ts
async function executeCall(call: FunctionCall, ctx: ActionContext, mode: AgentMode) {
  const action = REGISTRY[call.name];
  if (!action) return fail(ctx, 'agent.errors.unknownAction', { name: call.name });

  const parsed = action.schema.safeParse(call.args ?? {});
  if (!parsed.success) return fail(ctx, 'agent.errors.badArguments', { name: call.name });

  const invalid = action.validate?.(parsed.data, ctx);
  if (invalid) {
    ctx.dn.play('facepalm');
    return { ok: false, data: { error: invalid }, message: invalid };
  }

  // 1. Coreografía: viajar y señalar ANTES de tocar nada. El jugador tiene que ver qué se toca.
  const anchor = action.anchorFor?.(parsed.data, ctx) ?? null;
  if (anchor) await ctx.dn.focusOn(anchor);

  // 2. Confirmación
  const needsConfirm =
    action.alwaysConfirm || (action.kind !== 'read' && action.kind !== 'navigate' && mode === 'assist');
  if (needsConfirm) {
    const accepted = await ctx.dn.confirm({
      text: action.preview(parsed.data, ctx),
      confirmKey: 'agent.confirm.yes',
      cancelKey: 'agent.confirm.no',
    });
    if (!accepted) {
      ctx.dn.play('nod', 'neutral');
      return { ok: false, data: { cancelledByUser: true }, message: tFor(ctx.locale, 'agent.cancelled') };
    }
  }

  // 3. Ejecución + telemetría
  const result = await action.execute(parsed.data, ctx);
  ctx.dn.play(result.ok ? 'nod' : 'facepalm', result.ok ? 'happy' : 'alarmed');
  logAgentAction({ action: action.name, args: parsed.data, mode, ok: result.ok });   // §7
  return result;
}
```

`dn.confirm()` es una extensión del provider del archivo `14`: renderiza una tarjeta dentro del
globo con el `preview`, dos botones y un temporizador de 30 s (al vencer, cancela).

### 4.4 Instrucción de sistema del agente

Se agrega a `CHATBOT_BASE_INSTRUCTION` (que ya existe y se mantiene) un bloque de operación:

```
CAPACIDAD DE OPERACIÓN
Podés operar la interfaz con las herramientas disponibles. Reglas:
1. Ejecutá solo lo que el jugador pidió. Nunca encadenes acciones "de yapa".
2. Si la petición es ambigua (varias políticas posibles), NO adivines: preguntá con una sola
   pregunta corta y ofrecé como máximo tres opciones.
3. Antes de mutar el estado, explicá en una línea el trade-off principal de esa decisión.
   El jugador tiene que entender qué está eligiendo, no solo obtener el resultado.
4. Nunca simules un año por iniciativa propia. Es la decisión más importante del jugador.
5. Si el jugador te pide "jugá por mí" o "ganá el nivel", rechazalo y ofrecé en cambio explicar dos
   estrategias posibles. Tu función es que aprenda, no reemplazarlo.
6. Después de ejecutar, en una sola frase decí qué cambió y qué mirar en el próximo año.
7. Los ids de políticas e instrumentos se obtienen con list_policies. Nunca los inventes.
```

La regla 5 es pedagógica y no negociable: un agente que juega solo destruye tanto el aprendizaje
como el dato de investigación sobre toma de decisiones.

---

## 5. Proxy en el servidor (seguridad)

Hoy la key de Gemini viaja al cliente. Con herramientas expuestas, eso permite que cualquiera use
la key del proyecto para otra cosa. Mover la llamada a una función de Vercel:

```ts
// api/gemini.ts  — Vercel Edge Function
import { GoogleGenAI } from '@google/genai';

export const config = { runtime: 'edge' };

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 20;
const buckets = new Map<string, { count: number; reset: number }>();

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  // Rate limit por sesión (header enviado por el cliente, no confiable pero suficiente
  // para evitar bucles accidentales) + por IP.
  const key = req.headers.get('x-dn-session') ?? req.headers.get('x-forwarded-for') ?? 'anon';
  const now = Date.now();
  const bucket = buckets.get(key) ?? { count: 0, reset: now + WINDOW_MS };
  if (now > bucket.reset) { bucket.count = 0; bucket.reset = now + WINDOW_MS; }
  if (++bucket.count > MAX_PER_WINDOW) return new Response('Rate limited', { status: 429 });
  buckets.set(key, bucket);

  const body = await req.json();
  // Allowlist estricta: el cliente no elige el modelo ni el systemInstruction crudo.
  const model = process.env.GEMINI_MODEL ?? 'gemini-3.6-flash';
  try {
    const res = await ai.models.generateContent({ model, contents: body.contents, config: body.config });
    return Response.json({ text: res.text, functionCalls: res.functionCalls ?? [], candidates: res.candidates });
  } catch (err) {
    // Degradación: reintento único con el modelo de respaldo antes de rendirse.
    try {
      const res = await ai.models.generateContent({
        model: process.env.GEMINI_MODEL_FALLBACK ?? 'gemini-3.5-flash-lite',
        contents: body.contents, config: body.config,
      });
      return Response.json({ text: res.text, functionCalls: res.functionCalls ?? [], degraded: true });
    } catch {
      return new Response(JSON.stringify({ error: 'upstream' }), { status: 502 });
    }
  }
}
```

En el cliente, `callModel()` hace `fetch('/api/gemini', ...)`. Quitar `GEMINI_API_KEY` de
`vite.config.ts` (`define`) y de cualquier `import.meta.env` del bundle.

> **Checkpoint.** `npm run build && grep -r "AIza" dist/` no debe devolver nada.

---

## 6. Manejo de fallas

| Falla | Comportamiento |
|---|---|
| Sin API key configurada | El chat funciona en modo "solo tutoriales guiados" (archivo `18`), con aviso claro; el juego **nunca** se bloquea |
| 429 / 502 | `facepalm`, mensaje con reintento manual, backoff exponencial 1 s → 4 s → 10 s, máximo 3 |
| El modelo alucina un id | `validate` lo rechaza; el error vuelve como `functionResponse` y el modelo se corrige solo (por eso el bucle tiene 5 pasos) |
| Ancla no montada (panel cerrado) | La acción abre primero el panel (`open_panel`) y reintenta una vez |
| El jugador cancela | Se devuelve `cancelledByUser: true`; el modelo debe cerrar sin insistir |
| Latencia > 8 s | `think` + texto "esto está tardando"; a los 20 s, aborta |

---

## 7. Telemetría e integridad de la investigación

Esta sección es **requisito del artículo sobre aprendizaje social**, no un extra.

Toda mutación de estado se registra en Supabase con su **procedencia**:

```sql
-- migración: agregar a la tabla de eventos de partida
alter table game_events add column if not exists actor text
  not null default 'player' check (actor in ('player','agent','tutorial','system'));
alter table game_events add column if not exists agent_mode text;      -- observer|assist|tutorial
alter table game_events add column if not exists agent_prompt_hash text; -- sha256 del pedido, sin texto
create index if not exists game_events_actor_idx on game_events (session_id, actor);
```

Consecuencias de diseño:

- Las decisiones ejecutadas por el agente **no cuentan como decisiones del jugador** en el análisis
  de aprendizaje. Se analizan por separado (uso de andamiaje).
- En las instancias de evaluación formal, el modo se fija en `observer` mediante un flag de sesión
  (`?mode=observer` o configuración de la instancia), y el selector queda deshabilitado.
- Se guarda el **hash** del pedido, no el texto, salvo consentimiento explícito para guardar
  transcripciones. Documentarlo en el consentimiento informado.

Métricas derivadas útiles para el artículo: proporción de acciones delegadas vs. propias por nivel,
evolución de la delegación a lo largo de la partida (¿el jugador se independiza?), y correlación
entre uso del agente y desempeño final.

---

## 8. Pruebas

```ts
// tests/agent/registry.spec.ts
describe('uiActionRegistry', () => {
  it('every action has a unique name and a zod schema', ...);
  it('mutate actions never execute when validate() returns a message', ...);
  it('observer mode exposes zero mutate/advance tools', () => {
    const tools = buildTools(ctx, 'observer');
    expect(tools.map(t => t.name)).not.toContain('activate_policy');
    expect(tools.map(t => t.name)).not.toContain('simulate_year');
  });
  it('activate_policy respects MAX_ACTIVE_POLICIES', ...);
  it('set_instrument_effort clamps total effort per policy to 100', ...);
  it('anchorFor returns a registered anchor id for every mutate action', ...);
});

// tests/agent/loop.spec.ts — con un cliente de modelo simulado
it('stops after MAX_STEPS and returns a graceful message', ...);
it('feeds validation errors back as functionResponse instead of throwing', ...);
it('never calls simulate_year without confirmation, even in tutorial mode', ...);
```

Guion de prueba manual (ambos idiomas):

1. "¿Qué política me conviene para bajar emisiones?" → responde, **no** ejecuta.
2. "Activá conservación de bienes naturales" → viaja, señala la fila, pide confirmación, ejecuta.
3. "Activá seis políticas" → ejecuta hasta el límite y explica por qué se detuvo.
4. "Poné 60% en silvopastoriles y 60% en pasturas" → detecta que suma >100 y pregunta.
5. "Simulá cinco años" → confirma **una vez por año**, o rechaza y explica que se avanza de a uno.
6. "Jugá vos y ganame el nivel 2" → rechaza y ofrece explicar dos estrategias.
7. "Activate the agroecological policy" (en inglés) → funciona igual, con textos en inglés.

---

## Verificación

1. `npm test` con la suite del agente en verde.
2. La key de Gemini no aparece en el bundle.
3. En modo `observer`, ninguna acción muta el estado (verificable con un snapshot del `GameState`
   antes y después de 10 pedidos).
4. Cada acción ejecutada aparece en Supabase con `actor='agent'` y su `agent_mode`.
5. Con `VITE_GEMINI_MODEL` apuntando a un modelo inexistente, la app degrada al fallback y avisa,
   sin pantalla en blanco.

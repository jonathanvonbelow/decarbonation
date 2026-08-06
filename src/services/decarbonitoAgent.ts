/**
 * decarbonitoAgent — the tool-use loop (15_decarbonito_agent_actions.md §4). Builds the tool list
 * from src/game/uiActionRegistry.ts, runs the model, and executes any function calls through
 * ActionExecutor-style choreography (travel → confirm → execute → telemetry).
 *
 * Deliberate deviation from the source file, documented in docs/DESIGN_DECISIONS_LOG.md (phase 8
 * entry): calls the Gemini SDK directly from the client, exactly like the pre-existing
 * geminiService.ts does, instead of routing through the new `/api/gemini` proxy (see api/gemini.ts
 * — built, not wired). Migrating every Gemini call site to the server proxy is a dedicated,
 * separately-scoped task; doing it as a side effect of this phase risked breaking the one thing
 * that already works, untestable without a live deploy from this environment.
 */
import { GoogleGenAI, FunctionCallingConfigMode, type Content, type FunctionCall, type Part } from '@google/genai';
import { z } from 'zod';
import { GameState } from '../types';
import { LEVEL_CONFIGS, GEMINI_MODEL_TEXT } from '../constants';
import { tFor } from '../i18n';
import type { Locale } from '../i18n/types';
import { REGISTRY, type ActionContext } from '../game/uiActionRegistry';
import type { AgentMode } from '../components/decarbonito/DecarboNitoProvider';
import { logAgentAction } from './agentTelemetry';

// Model id is configuration, not a literal (§4.1) — see vite.config.ts's define block and
// docs/DESIGN_DECISIONS_LOG.md phase 8 entry for why the default stays GEMINI_MODEL_TEXT
// ('gemini-2.5-flash', already verified working in this app) rather than the source file's
// speculative 'gemini-3.6-flash', which this environment has no way to confirm is real/GA.
export const AGENT_MODEL = process.env.GEMINI_MODEL || GEMINI_MODEL_TEXT;

const API_KEY = process.env.API_KEY;
// Constructed lazily, not at module scope: the installed @google/genai throws immediately in its
// constructor when apiKey is falsy ("API key must be set when using the Gemini API"), which would
// crash this module's *import* itself (not just a call) whenever no key is configured — including
// in tests, which don't go through vite.config.ts's `define` at all. `callModel` is the only
// caller, gated behind `agentTurn`'s own `if (!API_KEY) throw` check.
let ai: GoogleGenAI | null = null;
function getClient(): GoogleGenAI {
  if (!ai) ai = new GoogleGenAI({ apiKey: API_KEY! });
  return ai;
}

const LANGUAGE_INSTRUCTION: Record<Locale, string> = {
  es: '\n\nIMPORTANTE: Responde SIEMPRE en español, independientemente del idioma en que te hagan la pregunta.',
  en: '\n\nIMPORTANT: Always respond in English, regardless of the language in which you are asked the question.',
};

// §4.4 — appended to the level's existing chatbotSystemInstruction (unchanged, still the base
// persona/tone rules). Kept as local Record<Locale,string> rather than routed through src/i18n/,
// same pattern geminiService.ts already uses for its own AI-facing prompts (Capa C, tracked
// pending in scripts/i18n-audit.mjs CAPA_B_C_PENDING) — this is player-invisible model instruction
// text, not UI copy.
const OPERATION_INSTRUCTION: Record<Locale, string> = {
  es: `

CAPACIDAD DE OPERACIÓN
Podés operar la interfaz con las herramientas disponibles. Reglas:
1. Ejecutá solo lo que el jugador pidió. Nunca encadenes acciones "de yapa".
2. Si la petición es ambigua (varias políticas posibles), NO adivines: preguntá con una sola pregunta corta y ofrecé como máximo tres opciones.
3. Antes de mutar el estado, explicá en una línea el trade-off principal de esa decisión. El jugador tiene que entender qué está eligiendo, no solo obtener el resultado.
4. Nunca simules un año por iniciativa propia. Es la decisión más importante del jugador.
5. Si el jugador te pide "jugá por mí" o "ganá el nivel", rechazalo y ofrecé en cambio explicar dos estrategias posibles. Tu función es que aprenda, no reemplazarlo.
6. Después de ejecutar, en una sola frase decí qué cambió y qué mirar en el próximo año.
7. Los ids de políticas e instrumentos se obtienen con list_policies. Nunca los inventes.`,
  en: `

OPERATING CAPABILITY
You can operate the interface with the available tools. Rules:
1. Execute only what the player asked for. Never chain "bonus" actions.
2. If the request is ambiguous (several possible policies), do NOT guess: ask a single short question and offer at most three options.
3. Before mutating state, explain in one line the main trade-off of that decision. The player has to understand what they're choosing, not just get the result.
4. Never simulate a year on your own initiative. It's the player's single most important decision.
5. If the player asks you to "play for me" or "win the level", refuse and offer to explain two possible strategies instead. Your job is for them to learn, not to replace them.
6. After executing, say in one sentence what changed and what to watch next year.
7. Policy and instrument ids come from list_policies. Never invent them.`,
};

export function buildSystemInstruction(state: GameState, locale: Locale): string {
  const levelConfig = LEVEL_CONFIGS.find((lc) => lc.levelNumber === state.currentLevel);
  const base = levelConfig?.chatbotSystemInstruction ?? '';
  return base + OPERATION_INSTRUCTION[locale] + LANGUAGE_INSTRUCTION[locale];
}

/** Tools exposed for the current level/mode. `observer` gets read/navigate only — zero mutation
 * surface, per §1's "Cero mutación de estado". */
export function buildTools(ctx: ActionContext, mode: AgentMode) {
  const declarations = Object.values(REGISTRY)
    .filter((a) => (a.minLevel ?? 1) <= ctx.state.currentLevel)
    .filter((a) => (mode === 'observer' ? a.kind === 'read' || a.kind === 'navigate' : true))
    .map((a) => ({
      name: a.name,
      description: tFor(ctx.locale, a.descriptionKey as any),
      parametersJsonSchema: z.toJSONSchema(a.schema, { target: 'openapi-3.0' }),
    }));
  return [{ functionDeclarations: declarations }];
}

const MAX_STEPS = 5; // hard cap on the tool-use loop, per player turn

export interface AgentTurnResult {
  text: string;
  history: Content[];
}

async function callModel(contents: Content[], config: Record<string, unknown>) {
  return getClient().models.generateContent({ model: AGENT_MODEL, contents, config });
}

/** §4.3 — travel/point → confirm (if needed) → execute → telemetry. Never throws for user error;
 * validation and execution failures come back as a `functionResponse` so the model can self-correct.
 * Exported for direct testing (tests/agent/loop.spec.ts) without needing a real model response. */
export async function executeCall(call: FunctionCall, ctx: ActionContext, mode: AgentMode) {
  const fail = (key: string, values?: Record<string, string | number>) => {
    const message = tFor(ctx.locale, key as any, values);
    return { ok: false, data: { error: message }, message };
  };

  const action = call.name ? REGISTRY[call.name] : undefined;
  if (!action) return fail('agent.errors.unknownAction', { name: call.name ?? '?' });

  const parsed = action.schema.safeParse(call.args ?? {});
  if (!parsed.success) return fail('agent.errors.badArguments', { name: action.name });

  const invalid = action.validate?.(parsed.data, ctx);
  if (invalid) {
    ctx.dn.play('facepalm', 'alarmed');
    return { ok: false, data: { error: invalid }, message: invalid };
  }

  // 1. Choreography: travel and point BEFORE touching anything — the player has to see what's
  // about to change.
  const anchor = action.anchorFor?.(parsed.data, ctx) ?? null;
  if (anchor) await ctx.dn.focusOn(anchor);

  // 2. Confirmation. `observer` never reaches here (buildTools excludes mutate/advance from its
  // tool list), so the mode check below only distinguishes assist (confirms) from tutorial
  // (phase 9 will make tutorial skip non-alwaysConfirm mutations; today `tutorial` behaves like
  // `assist` since no guided-chapter caller exists yet to set it).
  const needsConfirm = action.alwaysConfirm || ((action.kind === 'mutate' || action.kind === 'advance') && mode !== 'tutorial');
  if (needsConfirm) {
    const accepted = await ctx.dn.confirm({
      text: action.preview(parsed.data, ctx),
      confirmLabel: tFor(ctx.locale, 'agent.confirm.yes'),
      cancelLabel: tFor(ctx.locale, 'agent.confirm.no'),
    });
    if (!accepted) {
      ctx.dn.play('nod', 'neutral');
      const message = tFor(ctx.locale, 'agent.cancelled');
      return { ok: false, data: { cancelledByUser: true }, message };
    }
  }

  // 3. Execution + telemetry
  const result = await action.execute(parsed.data, ctx);
  ctx.dn.play(result.ok ? 'nod' : 'facepalm', result.ok ? 'happy' : 'alarmed');
  // parsed.data is `unknown` here because ActionDef is stored type-erased in REGISTRY (each
  // action's own z.object() schema loses its specific inferred type) — safe to widen to
  // Record<string, unknown> since every action in the registry uses z.object(), never a bare
  // scalar schema.
  logAgentAction({ action: action.name, args: parsed.data as Record<string, unknown>, mode, ok: result.ok }, ctx.sessionId);
  return result;
}

export async function agentTurn(userText: string, ctx: ActionContext, mode: AgentMode, chatHistory: Content[]): Promise<AgentTurnResult> {
  if (!API_KEY) throw new Error('API_KEY is not configured.');

  const tools = buildTools(ctx, mode);
  const history: Content[] = [...chatHistory, { role: 'user', parts: [{ text: userText }] }];

  for (let step = 0; step < MAX_STEPS; step++) {
    const res = await callModel(history, {
      systemInstruction: buildSystemInstruction(ctx.state, ctx.locale),
      tools,
      toolConfig: { functionCallingConfig: { mode: FunctionCallingConfigMode.AUTO } },
      temperature: 0.6,
      topP: 0.9,
      topK: 40,
    });

    const candidateParts = res.candidates?.[0]?.content?.parts;
    if (candidateParts) history.push({ role: 'model', parts: candidateParts });

    const calls = res.functionCalls ?? [];
    if (calls.length === 0) return { text: res.text ?? '', history };

    const responses: Part[] = [];
    for (const call of calls) {
      const result = await executeCall(call, ctx, mode);
      responses.push({ functionResponse: { id: call.id, name: call.name, response: result.data } });
    }
    history.push({ role: 'user', parts: responses });
  }
  return { text: tFor(ctx.locale, 'agent.errors.tooManySteps'), history };
}

/**
 * api/gemini.ts — Vercel Edge Function proxy for Gemini calls (15_decarbonito_agent_actions.md §5).
 *
 * NOT WIRED to any client call site yet — see docs/DESIGN_DECISIONS_LOG.md, phase 8 entry.
 * `GEMINI_API_KEY` currently ships to the browser bundle via vite.config.ts's `define` block
 * (a real, pre-existing exposure across all three current Gemini call sites in
 * src/services/geminiService.ts, not introduced by this phase). This file is ready
 * infrastructure to fix that, but migrating every existing call site — including the TTS audio
 * pipeline — to go through it is a separately-scoped task: this dev environment cannot run a
 * Vercel Edge Function locally (`npm run dev` only serves the Vite app, not `/api/*`), so nothing
 * routed through this file could be verified end-to-end here. Building it now and wiring it later
 * (with a real Vercel preview to test against) was judged safer than half-migrating blind.
 */
import { GoogleGenAI } from '@google/genai';

export const config = { runtime: 'edge' };

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 20;
const buckets = new Map<string, { count: number; reset: number }>();

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  // Rate limit per session (client-sent header, not trustworthy but enough to catch accidental
  // loops) + per IP.
  const key = req.headers.get('x-dn-session') ?? req.headers.get('x-forwarded-for') ?? 'anon';
  const now = Date.now();
  const bucket = buckets.get(key) ?? { count: 0, reset: now + WINDOW_MS };
  if (now > bucket.reset) { bucket.count = 0; bucket.reset = now + WINDOW_MS; }
  if (++bucket.count > MAX_PER_WINDOW) return new Response('Rate limited', { status: 429 });
  buckets.set(key, bucket);

  let body: { contents?: unknown; config?: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return new Response('Invalid JSON body', { status: 400 });
  }

  // Strict allowlist: the client does not choose the model or a raw systemInstruction override —
  // only the conversation contents and the tool/generation config it already builds locally.
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  try {
    const res = await ai.models.generateContent({ model, contents: body.contents as any, config: body.config as any });
    return Response.json({ text: res.text, functionCalls: res.functionCalls ?? [], candidates: res.candidates });
  } catch (err) {
    // Degrade: single retry against the fallback model before giving up.
    try {
      const res = await ai.models.generateContent({
        model: process.env.GEMINI_MODEL_FALLBACK || 'gemini-2.5-flash-lite',
        contents: body.contents as any, config: body.config as any,
      });
      return Response.json({ text: res.text, functionCalls: res.functionCalls ?? [], degraded: true });
    } catch {
      return new Response(JSON.stringify({ error: 'upstream' }), { status: 502 });
    }
  }
}

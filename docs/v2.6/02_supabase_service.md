# U2 — Supabase Service Layer

## Overview

`services/supabaseService.ts` provides the complete Supabase integration for DecarboNation v2.6. It follows the same singleton + null-guard pattern used by `services/geminiService.ts`, so the app works in "demo mode" (no credentials) without throwing errors.

## Exported API

### Client

| Export | Type | Description |
|--------|------|-------------|
| `supabase` | `SupabaseClient \| null` | Singleton client. `null` when env vars are missing. |

### Auth functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `signInWithGoogle` | `() => Promise<void>` | Triggers Google OAuth redirect via `supabase.auth.signInWithOAuth`. |
| `signOut` | `() => Promise<void>` | Signs out the current user. |
| `getSession` | `() => Promise<Session \| null>` | Returns the active session or `null`. |
| `onAuthStateChange` | `(callback) => subscription` | Subscribes to auth state changes. Returns an object with `data.subscription.unsubscribe()`. |

### Game session functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `createGameSession` | `(userId, nivel) => Promise<string \| null>` | Inserts a row in `game_sessions`, returns the new row `id`. |
| `finalizeGameSession` | `(sessionId, resultado, nivelAlcanzado) => Promise<void>` | Updates `ended_at`, `resultado`, and `nivel_alcanzado` for the given session. |
| `upsertAnnualSnapshot` | `(sessionId, anio, indicators, politicasActivas) => Promise<void>` | Upserts a row in `annual_snapshots` keyed on `(session_id, anio)`. |

### Survey functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `insertPreSurvey` | `(userId, sessionId, data: PreSurveyData) => Promise<void>` | Inserts a row in `pre_surveys`. |
| `insertPostSurvey` | `(userId, sessionId, data: PostSurveyData) => Promise<void>` | Inserts a row in `post_surveys`. |

### Interfaces

```typescript
export interface PreSurveyData {
  vinculo_clima: string;
  experiencia_simulacion: string;
  familiaridad_afolu: number;   // 1-5
  expectativa: string;
  pais_region: string;
  comentario_abierto?: string;
}

export interface PostSurveyData {
  estrategia_efectiva: string;
  sorpresa_yn: boolean;
  sorpresa_texto?: string;
  cambio_percepcion: number;    // 1-5
  cambio_texto?: string;
  utilidad_docente: number;     // 1-5
  nps: number;                  // 0-10
  comentarios?: string;
}
```

---

## Required environment variables

| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | Project URL, e.g. `https://abcdefgh.supabase.co` |
| `SUPABASE_ANON_KEY` | Public anon key from the Supabase dashboard |

Both values are found in the Supabase dashboard under **Project Settings → API**.

### Adding to `.env.local` (local development)

Create or edit `.env.local` in the project root:

```
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
```

`.env.local` is already git-ignored. Never commit real credentials.

### Adding to Vercel (production)

1. Open your Vercel project → **Settings → Environment Variables**.
2. Add `SUPABASE_URL` and `SUPABASE_ANON_KEY` for the **Production** (and optionally **Preview**) environments.
3. Redeploy the project for the variables to take effect.

---

## Null-guard / demo mode

When `SUPABASE_URL` or `SUPABASE_ANON_KEY` are absent (e.g. during local dev without credentials, or CI builds), the module:

1. Logs a single `console.error` at import time.
2. Sets `export const supabase = null`.
3. Every exported function checks `if (!supabase)`, logs a `console.warn`, and returns gracefully (`null`, `void`, or a no-op subscription) **without throwing**.

This means the full game loop, Gemini chatbot, and UI work in demo mode with no runtime errors related to Supabase.

---

## Adding env vars to `vite.config.ts` (done by U9 / integration unit)

The current `vite.config.ts` only exposes `GEMINI_API_KEY`. When U9 integrates authentication, the following two entries must be added to the `define` block:

```typescript
// vite.config.ts — add inside define: { ... }
'process.env.SUPABASE_URL': JSON.stringify(env.SUPABASE_URL),
'process.env.SUPABASE_ANON_KEY': JSON.stringify(env.SUPABASE_ANON_KEY),
```

Until that change lands, `process.env.SUPABASE_URL` resolves to `undefined` at build time, which is handled correctly by the null-guard.

---

## Database schema (reference)

The service assumes the following tables exist in your Supabase project. DDL migration is managed separately (see `docs/v2.6/03_db_schema.sql` when available).

### `game_sessions`

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` PK | Auto-generated |
| `user_id` | `uuid` | FK to `auth.users` |
| `nivel_inicio` | `int` | Level at session start |
| `started_at` | `timestamptz` | Set on insert |
| `ended_at` | `timestamptz` | Set by `finalizeGameSession` |
| `resultado` | `text` | `'victoria' \| 'derrota' \| 'abandono' \| 'demo'` |
| `nivel_alcanzado` | `int` | Set by `finalizeGameSession` |

### `annual_snapshots`

| Column | Type | Notes |
|--------|------|-------|
| `session_id` | `uuid` | FK to `game_sessions.id` |
| `anio` | `int` | Simulation year |
| `indicators` | `jsonb` | Key/value indicator map |
| `politicas_activas` | `text[]` | Active policy names |
| `updated_at` | `timestamptz` | Updated on upsert |
| **PK** | `(session_id, anio)` | Unique constraint for upsert |

### `pre_surveys`

| Column | Type |
|--------|------|
| `id` | `uuid` PK |
| `user_id` | `uuid` |
| `session_id` | `uuid \| null` |
| + all fields from `PreSurveyData` | various |

### `post_surveys`

| Column | Type |
|--------|------|
| `id` | `uuid` PK |
| `user_id` | `uuid` |
| `session_id` | `uuid \| null` |
| + all fields from `PostSurveyData` | various |

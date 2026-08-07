/**
 * funnelTelemetryLite — landing-only twin of funnelTelemetry.ts. Same `funnel_events` table,
 * same degrade-gracefully behavior, but calls the Supabase REST endpoint directly via `fetch`
 * instead of importing `@supabase/supabase-js` (services/supabaseService.ts's singleton).
 *
 * Why a separate file instead of just reusing funnelTelemetry.ts: the landing (index.html,
 * docentes.html) is a React-free static page precisely so it doesn't ship the game's bundle
 * (20_landing_shareables.md §2, "~40 kB"). Importing supabaseService.ts pulls the whole
 * @supabase/supabase-js client into the landing's own JS chunk — measured at 55.6 kB gzip on its
 * own, more than the entire landing page budget. The game's own bundle already includes
 * supabase-js for auth/session persistence, so funnelTelemetry.ts keeps using the real client
 * there (no size regression); this file exists only so src/landing.ts doesn't have to.
 */
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

export function logFunnelEventLite(event: string, properties: Record<string, string | number | boolean | null | undefined> = {}): void {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return;

  fetch(`${SUPABASE_URL}/rest/v1/funnel_events`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ event, properties }),
    keepalive: true, // survives the page navigating away right after (e.g. the play_click event)
  }).catch(() => { /* best-effort telemetry -- table may not be migrated yet, network may be down */ });
}

/**
 * Minimal shell-caching service worker (20_landing_shareables.md §6). Caches the game's own
 * shell (play.html + its JS/CSS/font assets) as they're fetched, not the running game's state —
 * the simulation is entirely client-side already (src/sim/*), so a cached shell is enough for the
 * game to load and be playable with the network down. Only DecarboNito (the Gemini calls) and
 * Supabase persistence need a live connection; both already degrade gracefully without one
 * (see services/geminiService.ts's error handling and supabaseService.ts's `null` singleton).
 *
 * Deliberately NOT a precache-manifest service worker (no vite-plugin-pwa or workbox dependency
 * added this phase — see docs/DESIGN_DECISIONS_LOG.md, phase 11 entry for why): this is a
 * runtime stale-while-revalidate strategy instead (serve from cache immediately if present,
 * refresh the cache from the network in the background for next time). Simpler, no build-time
 * asset manifest injection needed, and its correctness doesn't depend on Vite's hashed output
 * filenames staying in sync with a separately-maintained list — the tradeoff is the very first
 * visit to a new deploy must happen online (nothing is cached yet), which matches the real
 * workshop scenario this is for: load once at home/office with a connection, then it works in
 * the field.
 */
const CACHE_NAME = 'decarbonation-shell-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  // Only same-origin GET requests -- never intercept the Gemini/Supabase calls (cross-origin,
  // and caching an AI response or a mutating request would be actively wrong).
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  // Never cache API routes (Vercel functions) -- always live.
  if (new URL(request.url).pathname.startsWith('/api/')) return;

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(request);
      const network = fetch(request)
        .then((response) => {
          if (response.ok) cache.put(request, response.clone());
          return response;
        })
        .catch(() => cached); // offline: fall back to whatever's cached, if anything
      return cached || network;
    })
  );
});

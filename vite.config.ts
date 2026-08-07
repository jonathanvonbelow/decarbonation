import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react(), tailwindcss()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.SUPABASE_URL': JSON.stringify(env.SUPABASE_URL),
        'process.env.SUPABASE_ANON_KEY': JSON.stringify(env.SUPABASE_ANON_KEY),
        // Model id as configuration, never a literal (15_decarbonito_agent_actions.md §4.1) — the
        // agent's model is overridable without a redeploy of code, just an env var change. Falls
        // back to the already-verified GEMINI_MODEL_TEXT ('gemini-2.5-flash') in constants.ts;
        // see docs/DESIGN_DECISIONS_LOG.md phase 8 entry for why this does NOT default to the
        // source file's 'gemini-3.6-flash' (unverifiable from this environment).
        'process.env.GEMINI_MODEL': JSON.stringify(env.GEMINI_MODEL),
      },
      resolve: {
        dedupe: ['react', 'react-dom'],
        alias: {
          '@': path.resolve(__dirname, './src'),
        }
      },
      build: {
        sourcemap: true,
        // Phase 11 (20_landing_shareables.md §2): the landing is a separate, React-free static
        // page at "/" so it doesn't ship the game's ~480kB gzip bundle to a visitor who hasn't
        // decided to play yet. `index.html` (landing) and `docentes.html` are both plain HTML
        // sharing only `src/index.css` (design tokens) and `src/landing.ts` (lang toggle +
        // funnel events) -- neither imports React. `play.html` is the actual game SPA, what
        // `index.html` used to be before this phase. Vercel routes the clean `/play` and
        // `/docentes` URLs to these files via vercel.json rewrites (see that file's own comment
        // for why a rewrite, not a rename, was used).
        rollupOptions: {
          input: {
            main: path.resolve(__dirname, 'index.html'),
            play: path.resolve(__dirname, 'play.html'),
            docentes: path.resolve(__dirname, 'docentes.html'),
            // One page per teacher resource (user request, post-launch): each gets the landing's
            // own design system, not a raw file download. vercel.json maps these to clean
            // /docentes/<resource> URLs, same rewrite pattern as /play and /docentes above.
            docentesGuia: path.resolve(__dirname, 'docentes-guia.html'),
            docentesConsignas: path.resolve(__dirname, 'docentes-consignas.html'),
            docentesEcuaciones: path.resolve(__dirname, 'docentes-ecuaciones.html'),
            docentesPlanClase: path.resolve(__dirname, 'docentes-plan-clase.html'),
            docentesDiapositivas: path.resolve(__dirname, 'docentes-diapositivas.html'),
          },
        },
      },
    };
});

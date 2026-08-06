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
      },
    };
});

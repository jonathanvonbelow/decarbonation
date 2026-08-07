import './index.css';

import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { I18nProvider } from './i18n';
import { DecarboNitoLab } from './components/decarbonito/DecarboNitoLab';
import { ErrorBoundary } from './components/common/ErrorBoundary';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// Dev-only visual test bench for the DecarboNito avatar (13_decarbonito_character.md §5.3).
// Checked before the real app so it never touches auth/Supabase/game state — just the hash.
const isDecarboNitoLab = window.location.hash.startsWith('#dev/decarbonito');

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      {isDecarboNitoLab ? <DecarboNitoLab /> : (
        <I18nProvider>
          <App />
        </I18nProvider>
      )}
    </ErrorBoundary>
  </React.StrictMode>
);

// Phase 11 (20_landing_shareables.md §6): registers the shell-caching service worker (public/
// sw.js) so the game keeps working with the network down mid-workshop. Only ever runs from
// play.html (this module is never loaded by the landing or /docentes). Gated on hostname rather
// than `import.meta.env.DEV`/`PROD` -- this project deliberately declares no ambient vite/client
// types (see src/i18n/index.tsx's own comment on the same tradeoff) -- registering under `vite
// dev` would cache dev's unbundled module graph and fight HMR, which is not what "cache the
// shell" means here.
const isLocalDev = ['localhost', '127.0.0.1'].includes(window.location.hostname);
if ('serviceWorker' in navigator && !isLocalDev) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('[sw] registration failed:', err);
    });
  });
}

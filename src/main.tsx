import './index.css';

import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { I18nProvider } from './i18n';
import { DecarboNitoLab } from './components/decarbonito/DecarboNitoLab';

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
    {isDecarboNitoLab ? <DecarboNitoLab /> : (
      <I18nProvider>
        <App />
      </I18nProvider>
    )}
  </React.StrictMode>
);

import '../index.css';

import React from 'react';
import ReactDOM from 'react-dom/client';
import { ErrorBoundary } from '../components/common/ErrorBoundary';
import { I18nProvider } from '../i18n';
import { TerritorioApp } from './TerritorioApp';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Could not find root element to mount to');

// Preview entry (mejora-general/files/21_fusion_ecosim.md §9). Deliberately does not register the
// service worker or touch Supabase: it is a demo-mode preview of what comes next, not the game.
ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <I18nProvider>
        <TerritorioApp />
      </I18nProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);

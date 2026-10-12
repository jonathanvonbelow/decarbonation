import '../../index.css';

import React from 'react';
import ReactDOM from 'react-dom/client';
import { ErrorBoundary } from '../../components/common/ErrorBoundary';
import { I18nProvider } from '../../i18n';
import { flushFeedbackQueue } from './feedbackService';
import { SurveyPage } from './SurveyPage';
import { captureWorkshopCode } from './workshopCode';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Could not find root element to mount to');

// Anonymous questionnaire: no Supabase client, no service worker (26_cuestionario_territorio.md §4.2).
captureWorkshopCode();
void flushFeedbackQueue();

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <I18nProvider>
        <SurveyPage />
      </I18nProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);

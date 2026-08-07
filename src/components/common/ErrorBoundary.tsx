import React from 'react';
import { detectLocale, tFor } from '../../i18n';

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * §8 last row: "Error de simulación: Nunca pantalla en blanco: ErrorBoundary con estado, semilla
 * y botón de reporte." No component anywhere in this codebase caught render errors before this
 * phase -- a thrown error inside the tree unmounted to a blank white page.
 *
 * Deviation from the source wording, documented in docs/DESIGN_DECISIONS_LOG.md: "semilla" (seed)
 * assumes a reproducible run, but `runSimulationRound` (src/App.tsx) deliberately passes
 * `Math.random` rather than the seeded `makeRng` from src/sim/rng.ts (see that function's own
 * comment: "keep the same unpredictability players always had" -- the seeded RNG exists only for
 * tests/the balance harness, not live play). There is no seed to show. The report block instead
 * carries what's actually diagnostic here: the error message/stack, a timestamp, and the URL hash
 * — copyable in one click so a player can paste it into a bug report.
 */
export class ErrorBoundary extends React.Component<React.PropsWithChildren, ErrorBoundaryState> {
  constructor(props: React.PropsWithChildren) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary] Uncaught render error:', error, info.componentStack);
  }

  private handleReload = (): void => {
    window.location.reload();
  };

  private handleCopyReport = (): void => {
    const report = this.reportText();
    navigator.clipboard?.writeText(report).catch(() => { /* clipboard denied -- report is still on screen to select manually */ });
  };

  private reportText(): string {
    const { error } = this.state;
    return [
      `DecarboNation error report — ${new Date().toISOString()}`,
      `URL: ${window.location.href}`,
      `Message: ${error?.message ?? '(unknown)'}`,
      error?.stack ? `Stack:\n${error.stack}` : null,
    ].filter(Boolean).join('\n');
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    // No React context is reachable here (this boundary wraps I18nProvider itself, on purpose --
    // a crash inside the provider must still be caught), so locale comes from the same
    // localStorage/navigator detection I18nProvider uses internally, via the non-hook `tFor`.
    const locale = detectLocale();
    const t = (key: Parameters<typeof tFor>[1]) => tFor(locale, key);

    return (
      <div className="min-h-screen bg-level-ambience text-bone flex items-center justify-center p-6">
        <div className="panel p-6 max-w-lg w-full">
          <h1 className="text-xl font-bold text-ember font-[var(--font-display)] mb-2">{t('errorBoundary.title')}</h1>
          <p className="text-sm text-ash mb-4">{t('errorBoundary.body')}</p>
          <pre className="text-[11px] text-ash-dim bg-basalt-900 rounded p-3 mb-4 overflow-auto max-h-40 whitespace-pre-wrap">
            {this.reportText()}
          </pre>
          <div className="flex gap-3">
            <button
              onClick={this.handleReload}
              className="px-4 py-2 bg-hydro text-basalt-950 font-semibold rounded-lg hover:brightness-110 transition-colors"
            >
              {t('errorBoundary.reload')}
            </button>
            <button
              onClick={this.handleCopyReport}
              className="px-4 py-2 bg-basalt-700 hover:bg-basalt-600 text-bone font-semibold rounded-lg transition-colors"
            >
              {t('errorBoundary.copyReport')}
            </button>
          </div>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;

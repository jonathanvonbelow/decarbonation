/**
 * DebriefingModal — structured 3-screen debriefing (18_tutoriales_v3.md §7), replacing both
 * ClosingSynthesisModal.tsx and the dead (never-imported) PlayerReportGuideModal.tsx.
 *
 * Screen 1 (evidence) reuses the existing AI synthesis pipeline (geminiService.ts's
 * generateClosingSynthesis/buildFallbackSynthesis, unchanged — no reason to duplicate a working,
 * already non-evaluative 4-section generator) and adds two things the source spec asks for that
 * the old modal didn't have: the route achieved/closest (phase 5's evaluateLevel) and a prediction
 * accuracy summary (phase 9). Explicitly NOT built: the "perfil estratégico ... contra el promedio
 * de todos los jugadores" cross-session comparison (§7) — that needs an aggregate query across
 * every session in Supabase, real infrastructure this pass doesn't build; and the "tres años de
 * mayor cambio" callouts, since SimTrace (src/sim/trace.ts) only has before/after deltas, not the
 * itemized causal breakdown that would make "biggest change" attribution honest rather than a
 * guess — same gap phase 2 flagged and phase 9 still doesn't close (see docs/DESIGN_DECISIONS_LOG.md).
 */
import React, { useEffect, useMemo, useState } from 'react';
import { GameState, HistoricalDataPoint, ClosingSynthesis } from '../../types';
import { useT } from '../../i18n';
import { generateClosingSynthesis, buildFallbackSynthesis } from '../../services/geminiService';
import { evaluateLevel } from '../../sim';
import { useDecarboNito } from '../decarbonito/DecarboNitoProvider';
import { saveReflectionAnswers, type ReflectionAnswers } from '../../services/reflectionResponses';
import type { PredictionResult } from './predictions';
import { logFunnelEvent } from '../../services/funnelTelemetry';

const GEMINI_TIMEOUT_MS = 20000;

type Tab = 'evidence' | 'reflection' | 'next';

interface DebriefingModalProps {
  gameState: GameState;
  historicalData: HistoricalDataPoint[];
  predictionResults: PredictionResult[];
  sessionId?: string | null;
  onClose: () => void;
  onRestart?: () => void;
  /** Phase 11 (20_landing_shareables.md §4): true for a `/play?demo=1` run. Swaps the "next"
   *  tab's CTA for the demo-specific one ("esto fue una muestra..." + link to the full game). */
  isDemo?: boolean;
}

const DebriefingModal: React.FC<DebriefingModalProps> = ({ gameState, historicalData, predictionResults, sessionId, onClose, onRestart, isDemo }) => {
  const { t, locale } = useT();
  const dn = useDecarboNito();
  const [tab, setTab] = useState<Tab>('evidence');
  const [loading, setLoading] = useState(true);
  const [synthesis, setSynthesis] = useState<ClosingSynthesis | null>(null);
  const [answers, setAnswers] = useState<ReflectionAnswers>({ q1: '', q2: '', q3: '', q4: '', q5: '' });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    // See ClosingSynthesisModal's original comment (kept verbatim in spirit): `cancelled` guards
    // against a stale result from StrictMode's double-invoke, not a ref that would block the real
    // (second) invocation from ever running.
    let cancelled = false;
    const withTimeout = <T,>(p: Promise<T>, ms: number): Promise<T> =>
      Promise.race([p, new Promise<T>((_, reject) => setTimeout(() => reject(new Error('Debriefing synthesis timed out.')), ms))]);
    (async () => {
      let result: ClosingSynthesis;
      try {
        result = await withTimeout(generateClosingSynthesis(gameState, historicalData, locale), GEMINI_TIMEOUT_MS);
      } catch (error) {
        console.error('Falling back to local debriefing synthesis:', error);
        result = buildFallbackSynthesis(gameState, historicalData, locale);
      }
      if (!cancelled) { setSynthesis(result); setLoading(false); }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const outcome = useMemo(() => evaluateLevel(gameState, { ...gameState, indicators: gameState.levelBaseline }), [gameState]);

  const predictionStats = useMemo(() => {
    if (predictionResults.length === 0) return null;
    const correct = predictionResults.filter((r) => r.correct).length;
    return { correct, total: predictionResults.length, pct: Math.round((correct / predictionResults.length) * 100) };
  }, [predictionResults]);

  // Fase 11 (20_landing_shareables.md §5): "resultado compartible". La tarjeta con imagen OG
  // dinámica (@vercel/og, api/og.tsx, /r/:id firmado) que pide la fuente NO se construyó --
  // requiere una Vercel Edge Function nueva y este entorno de desarrollo no puede ejecutar
  // funciones edge para verificarla (mismo límite ya documentado en api/gemini.ts desde la fase
  // 8). En su lugar: un resumen de texto plano, compartido vía `navigator.share()` en móvil o
  // copiado al portapapeles en escritorio -- menos vistoso, pero real y verificable acá.
  const [shareCopied, setShareCopied] = useState(false);
  const handleShare = async () => {
    const routeName = outcome.achieved ? t(outcome.achieved.nameKey as any) : t(outcome.closest.route.nameKey as any);
    const lines = [
      `DecarboNation — ${t('header.level')} ${gameState.currentLevel} · ${gameState.year}`,
      routeName,
      `${t('header.score')} ${gameState.indicators.generalScore.toFixed(0)}`,
      predictionStats ? t('debriefing.predictionAccuracy', { correct: predictionStats.correct, total: predictionStats.total, pct: predictionStats.pct }) : null,
      'decarbonation.vercel.app',
    ].filter((l): l is string => !!l);
    const text = lines.join('\n');

    logFunnelEvent('share_clicked', { surface: 'debrief' });
    if (navigator.share) {
      try { await navigator.share({ text }); } catch { /* user cancelled the native share sheet */ }
    } else {
      try {
        await navigator.clipboard.writeText(text);
        setShareCopied(true);
        setTimeout(() => setShareCopied(false), 2500);
      } catch { /* clipboard denied -- silently do nothing rather than throw */ }
    }
  };

  const handleSave = () => {
    saveReflectionAnswers(answers, gameState.currentLevel, sessionId);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const talkAbout = (question: string, answer: string) => {
    dn.openConversation(answer.trim() ? `${question}\n\n${answer}` : question);
    onClose();
  };

  const tabs: { id: Tab; labelKey: string }[] = [
    { id: 'evidence', labelKey: 'debriefing.tabEvidence' },
    { id: 'reflection', labelKey: 'debriefing.tabReflection' },
    { id: 'next', labelKey: 'debriefing.tabNext' },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[1000] p-4 animate-fade-in print:bg-white print:static print:p-0" role="dialog" aria-modal="true" aria-labelledby="debriefing-title">
      <div className="bg-custom-light-gray print:bg-white print:text-black p-6 sm:p-8 rounded-lg shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col text-gray-100 print:max-h-none print:shadow-none">
        <div className="flex justify-between items-start mb-2 print:hidden">
          <div>
            <h2 id="debriefing-title" className="text-2xl sm:text-3xl font-bold text-custom-accent">{t('debriefing.title')}</h2>
            <p className="text-sm text-gray-400 mt-1">{t('debriefing.subtitle')}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-3xl leading-none" aria-label={t('debriefing.close')}>&times;</button>
        </div>

        <div className="flex gap-1 border-b border-gray-700 mb-4 print:hidden">
          {tabs.map((tb) => (
            <button
              key={tb.id}
              onClick={() => setTab(tb.id)}
              className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${tab === tb.id ? 'border-custom-accent text-custom-accent' : 'border-transparent text-gray-400 hover:text-gray-200'}`}
            >
              {t(tb.labelKey as any)}
            </button>
          ))}
          <button
            onClick={() => window.print()}
            className="ml-auto px-3 py-2 text-xs text-gray-400 hover:text-gray-200 self-center"
          >
            {t('debriefing.printMode')}
          </button>
        </div>

        <div className="overflow-y-auto flex-grow space-y-5 pr-2 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800 print:overflow-visible">
          {/* Screen 1 — evidence. Rendered under `print:block` regardless of active tab so "modo
              taller" prints screens 1+2 together per §7, without a second print-only layout. */}
          <section className={tab === 'evidence' ? 'block space-y-5' : 'hidden print:block print:space-y-5 print:mt-6'}>
            {loading || !synthesis ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-300 print:hidden">
                <div className="w-10 h-10 border-4 border-custom-accent border-t-transparent rounded-full animate-spin mb-4" />
                <p>{t('debriefing.loading')}</p>
              </div>
            ) : (
              <>
                {synthesis.isFallback && <p className="text-xs italic text-gray-400 border border-gray-700 rounded-md p-2 print:hidden">{t('debriefing.fallbackNotice')}</p>}
                <div>
                  {outcome.achieved ? (
                    <p className="text-sm text-chlorophyll font-medium">{t('debriefing.routeAchieved', { route: t(outcome.achieved.nameKey as any) })}</p>
                  ) : (
                    <p className="text-sm text-ochre font-medium">
                      {t('debriefing.routeClosest', { route: t(outcome.closest.route.nameKey as any), condition: outcome.closest.bottleneck ? t(outcome.closest.bottleneck.labelKey as any) : '' })}
                    </p>
                  )}
                  <p className="text-sm text-gray-300 mt-1">
                    {predictionStats ? t('debriefing.predictionAccuracy', { correct: predictionStats.correct, total: predictionStats.total, pct: predictionStats.pct }) : t('debriefing.predictionNone')}
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-blue-300 mb-1">{t('debriefing.sectionDecisions')}</h3>
                  <p className="text-sm text-gray-200 whitespace-pre-line">{synthesis.decisionsTaken}</p>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-blue-300 mb-1">{t('debriefing.sectionTradeOffs')}</h3>
                  <p className="text-sm text-gray-200 whitespace-pre-line">{synthesis.tradeOffs}</p>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-blue-300 mb-1">{t('debriefing.sectionEffects')}</h3>
                  <p className="text-sm text-gray-200 whitespace-pre-line">{synthesis.crossSectoralEffects}</p>
                </div>
              </>
            )}
          </section>

          {/* Screen 2 — reflection */}
          <section className={tab === 'reflection' ? 'block space-y-4' : 'hidden print:block print:space-y-4 print:mt-6'}>
            <p className="text-sm text-gray-300">{t('debriefing.reflection.intro')}</p>
            {(['q1', 'q2', 'q3', 'q4', 'q5'] as const).map((qKey) => (
              <div key={qKey}>
                <label className="block text-sm font-medium text-gray-200 mb-1" htmlFor={`reflection-${qKey}`}>
                  {t(`debriefing.reflection.${qKey}` as any)}
                </label>
                <textarea
                  id={`reflection-${qKey}`}
                  value={answers[qKey]}
                  onChange={(e) => setAnswers((prev) => ({ ...prev, [qKey]: e.target.value }))}
                  rows={2}
                  className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-200 text-sm resize-y print:border-none print:bg-transparent print:min-h-[3em]"
                />
                <button
                  onClick={() => talkAbout(t(`debriefing.reflection.${qKey}` as any), answers[qKey])}
                  className="mt-1 text-xs text-purple-300 hover:text-purple-200 print:hidden"
                >
                  {t('debriefing.reflection.talkToDecarboNito')}
                </button>
              </div>
            ))}
            <button onClick={handleSave} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm font-semibold rounded-lg print:hidden">
              {saved ? t('debriefing.reflection.saved') : t('debriefing.reflection.save')}
            </button>
          </section>

          {/* Screen 3 — what's next. Not printed: purely navigational. */}
          <section className={tab === 'next' ? 'block space-y-3 print:hidden' : 'hidden'}>
            {isDemo && (
              // §4: "esto fue una muestra; la partida completa tiene tres niveles, finanzas y
              // pactos" + botón para empezar la partida completa. `href="/play"` (sin `?demo=1`)
              // recarga en modo completo -- una recarga real, no un cambio de estado en memoria,
              // porque el propio flag `isDemoRef` de App.tsx solo se lee una vez al montar.
              <div className="p-3 bg-hydro/10 border border-hydro/40 rounded-lg">
                <p className="text-sm text-bone mb-2">{t('debriefing.demo.notice')}</p>
                <a href="/play" className="inline-block px-3 py-1.5 text-xs bg-hydro text-basalt-950 font-semibold rounded-md">
                  {t('debriefing.demo.cta')}
                </a>
              </div>
            )}
            {outcome.achieved && (
              <div className="p-3 bg-gray-800 rounded-lg">
                <p className="text-sm text-gray-200 mb-2">{t('debriefing.next.routeSuggestion', { route: t(outcome.achieved.nameKey as any) })}</p>
                {onRestart && (
                  <button onClick={() => { onRestart(); onClose(); }} className="px-3 py-1.5 text-xs bg-hydro text-basalt-950 font-semibold rounded-md">
                    {t('tutorial.restart')}
                  </button>
                )}
              </div>
            )}
            <button className="block text-sm text-blue-300 hover:text-blue-200" onClick={onClose}>{t('debriefing.next.manualLink')}</button>
            <button className="block text-sm text-blue-300 hover:text-blue-200" onClick={onClose}>{t('debriefing.next.equationsLink')}</button>
            <button onClick={handleShare} className="px-3 py-1.5 text-xs bg-basalt-700 hover:bg-basalt-600 text-bone font-semibold rounded-md">
              {shareCopied ? t('debriefing.share.copied') : t('debriefing.share.button')}
            </button>
          </section>
        </div>

        <div className="flex justify-end pt-4 border-t border-gray-700 print:hidden">
          <button onClick={onClose} className="px-4 py-2 bg-custom-accent hover:bg-blue-600 text-white font-semibold rounded-lg transition-colors">
            {t('debriefing.close')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DebriefingModal;

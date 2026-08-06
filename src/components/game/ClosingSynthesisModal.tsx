import React, { useEffect, useState } from 'react';
import { GameState, HistoricalDataPoint, ClosingSynthesis } from '../../types';
import { useLanguageContext } from '../../contexts/LanguageContext';
import { generateClosingSynthesis, buildFallbackSynthesis } from '../../services/geminiService';

const T = {
  es: {
    title: 'Síntesis de Cierre',
    subtitle: 'Una lectura personalizada de tu sesión en el laboratorio de escenarios.',
    loading: 'Generando tu síntesis de cierre…',
    closeLabel: 'Cerrar síntesis',
    sectionDecisions: '1. Decisiones tomadas',
    sectionTradeOffs: '2. Trade-offs identificados',
    sectionEffects: '3. Efectos intersectoriales',
    sectionQuestions: '4. Preguntas para la reflexión',
    copy: 'Copiar texto',
    copied: '¡Copiado!',
    download: 'Descargar .txt',
    close: 'Cerrar',
    fallbackNotice: 'Esta síntesis fue generada localmente a partir de los datos de tu sesión (sin conexión con el asistente de IA).',
  },
  en: {
    title: 'Closing Synthesis',
    subtitle: 'A personalized read of your scenario-lab session.',
    loading: 'Generating your closing synthesis…',
    closeLabel: 'Close synthesis',
    sectionDecisions: '1. Decisions taken',
    sectionTradeOffs: '2. Trade-offs identified',
    sectionEffects: '3. Cross-sectoral effects',
    sectionQuestions: '4. Questions for reflection',
    copy: 'Copy text',
    copied: 'Copied!',
    download: 'Download .txt',
    close: 'Close',
    fallbackNotice: 'This synthesis was generated locally from your session data (without reaching the AI assistant).',
  },
} as const;

// Hard cap so a hung/slow Gemini call can never leave the player staring at a
// spinner forever — past this, we fall back to the local, data-driven synthesis.
const GEMINI_TIMEOUT_MS = 20000;

interface ClosingSynthesisModalProps {
  gameState: GameState;
  historicalData: HistoricalDataPoint[];
  onClose: () => void;
}

const ClosingSynthesisModal: React.FC<ClosingSynthesisModalProps> = ({ gameState, historicalData, onClose }) => {
  const { language } = useLanguageContext();
  const t = T[language];

  const [loading, setLoading] = useState(true);
  const [synthesis, setSynthesis] = useState<ClosingSynthesis | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // No extra "already fetched" ref guard here: this component is only ever mounted
    // once per session (App.tsx toggles it via a boolean flag, not a remount-prone key),
    // and gating on a ref would break the fetch under React.StrictMode — StrictMode
    // double-invokes effects on the SAME component instance (mount → cleanup → mount),
    // so a ref set to true by the first (discarded) invocation would block the second,
    // real invocation from ever starting the request and leave the modal stuck loading.
    // The `cancelled` flag below is the correct guard: it only discards a *stale* result
    // (from the first, cleaned-up invocation) without preventing the real one from running.
    let cancelled = false;

    const withTimeout = <T,>(promise: Promise<T>, ms: number): Promise<T> =>
      Promise.race([
        promise,
        new Promise<T>((_, reject) => setTimeout(() => reject(new Error('Closing synthesis timed out.')), ms)),
      ]);

    (async () => {
      let result: ClosingSynthesis;
      try {
        result = await withTimeout(generateClosingSynthesis(gameState, historicalData, language), GEMINI_TIMEOUT_MS);
      } catch (error) {
        console.error('Falling back to local closing synthesis:', error);
        result = buildFallbackSynthesis(gameState, historicalData, language);
      }
      if (!cancelled) {
        setSynthesis(result);
        setLoading(false);
      }
    })();

    return () => { cancelled = true; };
    // Intentionally run once on mount: the session data is final by the time this modal shows.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const buildPlainText = (s: ClosingSynthesis): string => {
    const lines: string[] = [];
    lines.push(t.title);
    lines.push('');
    lines.push(t.sectionDecisions);
    lines.push(s.decisionsTaken);
    lines.push('');
    lines.push(t.sectionTradeOffs);
    lines.push(s.tradeOffs);
    lines.push('');
    lines.push(t.sectionEffects);
    lines.push(s.crossSectoralEffects);
    lines.push('');
    lines.push(t.sectionQuestions);
    s.reflectionQuestions.forEach(q => lines.push(`- ${q}`));
    return lines.join('\n');
  };

  const handleCopy = async () => {
    if (!synthesis) return;
    try {
      await navigator.clipboard.writeText(buildPlainText(synthesis));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Error copying closing synthesis to clipboard:', error);
    }
  };

  const handleDownload = () => {
    if (!synthesis) return;
    const blob = new Blob([buildPlainText(synthesis)], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `decarbonation-sintesis-cierre-nivel${gameState.currentLevel}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[1000] p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="closing-synthesis-title"
    >
      <div className="bg-custom-light-gray p-6 sm:p-8 rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col text-gray-100">
        <div className="flex justify-between items-start mb-2">
          <div>
            <h2 id="closing-synthesis-title" className="text-2xl sm:text-3xl font-bold text-custom-accent">{t.title}</h2>
            <p className="text-sm text-gray-400 mt-1">{t.subtitle}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-3xl leading-none" aria-label={t.closeLabel}>
            &times;
          </button>
        </div>

        <div className="overflow-y-auto flex-grow my-4 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800 pr-2 space-y-5">
          {loading || !synthesis ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-300">
              <div className="w-10 h-10 border-4 border-custom-accent border-t-transparent rounded-full animate-spin mb-4" />
              <p>{t.loading}</p>
            </div>
          ) : (
            <>
              {synthesis.isFallback && (
                <p className="text-xs italic text-gray-400 border border-gray-700 rounded-md p-2">{t.fallbackNotice}</p>
              )}
              <div>
                <h3 className="text-lg font-semibold text-blue-300 mb-1">{t.sectionDecisions}</h3>
                <p className="text-sm text-gray-200 whitespace-pre-line">{synthesis.decisionsTaken}</p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-blue-300 mb-1">{t.sectionTradeOffs}</h3>
                <p className="text-sm text-gray-200 whitespace-pre-line">{synthesis.tradeOffs}</p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-blue-300 mb-1">{t.sectionEffects}</h3>
                <p className="text-sm text-gray-200 whitespace-pre-line">{synthesis.crossSectoralEffects}</p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-blue-300 mb-1">{t.sectionQuestions}</h3>
                <ul className="list-disc list-inside space-y-1 pl-4">
                  {synthesis.reflectionQuestions.map((q, idx) => (
                    <li key={idx} className="text-sm text-gray-200">{q}</li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-center pt-4 border-t border-gray-700 gap-3">
          <div className="flex gap-2 w-full sm:w-auto">
            <button
              onClick={handleCopy}
              disabled={loading || !synthesis}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors flex-1 sm:flex-none"
            >
              {copied ? t.copied : t.copy}
            </button>
            <button
              onClick={handleDownload}
              disabled={loading || !synthesis}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors flex-1 sm:flex-none"
            >
              {t.download}
            </button>
          </div>
          <button onClick={onClose} className="px-4 py-2 bg-custom-accent hover:bg-blue-600 text-white font-semibold rounded-lg transition-colors w-full sm:w-auto">
            {t.close}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ClosingSynthesisModal;

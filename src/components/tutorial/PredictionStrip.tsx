/**
 * PredictionStrip — the compact predict-before-simulate UI (18_tutoriales_v3.md §5). "Tres clics,
 * seis segundos. Opcional pero activada por defecto." Renders above the simulate button
 * (Dashboard.tsx). Owns its own enabled/disabled toggle (localStorage); the selections themselves
 * are lifted to App.tsx since `runSimulationRound` needs to read them at simulate time.
 */
import React, { useState } from 'react';
import { useT } from '../../i18n';
import {
  PREDICTED_INDICATORS, loadPredictionEnabled, savePredictionEnabled,
  type PredictedIndicatorKey, type PredictionDirection, type PredictionResult, type PredictionSelections,
} from './predictions';

const INDICATOR_LABEL_KEY: Record<PredictedIndicatorKey, string> = {
  biodiversity: 'cond.biodiversity',
  co2EqEmissionsPerCapita: 'cond.emissions',
  economicSecurity: 'cond.economicSecurity',
};

const ARROWS: { dir: PredictionDirection; symbol: string; labelKey: string }[] = [
  { dir: 'down', symbol: '↓', labelKey: 'prediction.down' },
  { dir: 'flat', symbol: '↔', labelKey: 'prediction.flat' },
  { dir: 'up', symbol: '↑', labelKey: 'prediction.up' },
];

interface PredictionStripProps {
  selections: PredictionSelections;
  onChange: (next: PredictionSelections) => void;
  lastResults: PredictionResult[] | null;
  disabled?: boolean;
}

export const PredictionStrip: React.FC<PredictionStripProps> = ({ selections, onChange, lastResults, disabled }) => {
  const { t } = useT();
  const [enabled, setEnabled] = useState(loadPredictionEnabled);

  const toggle = (next: boolean) => {
    setEnabled(next);
    savePredictionEnabled(next);
  };

  if (!enabled) {
    return (
      <button
        type="button"
        onClick={() => toggle(true)}
        className="text-[12px] text-ash-dim hover:text-ash underline decoration-dotted mb-2"
      >
        {t('prediction.show')}
      </button>
    );
  }

  const resultFor = (key: PredictedIndicatorKey) => lastResults?.find((r) => r.indicator === key) ?? null;

  return (
    <div className="bg-basalt-800 border border-basalt-600 rounded-lg p-3 mb-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[13px] text-ash">{t('prediction.question')}</p>
        <button type="button" onClick={() => toggle(false)} className="text-[11px] text-ash-dim hover:text-ash underline decoration-dotted shrink-0 ml-2">
          {t('prediction.hide')}
        </button>
      </div>
      <div className="flex flex-wrap gap-4">
        {PREDICTED_INDICATORS.map((key) => {
          const result = resultFor(key);
          return (
            <div key={key} className="flex items-center gap-1.5">
              <span className="text-[12px] text-ash-dim">{t(INDICATOR_LABEL_KEY[key] as any)}</span>
              {ARROWS.map((a) => (
                <button
                  key={a.dir}
                  type="button"
                  disabled={disabled}
                  onClick={() => onChange({ ...selections, [key]: selections[key] === a.dir ? undefined : a.dir })}
                  aria-pressed={selections[key] === a.dir}
                  title={t(a.labelKey as any)}
                  className={`w-7 h-7 rounded-md text-sm font-bold transition-colors disabled:opacity-40 ${
                    selections[key] === a.dir ? 'bg-hydro text-basalt-950' : 'bg-basalt-700 text-ash hover:text-bone'
                  }`}
                >
                  {a.symbol}
                </button>
              ))}
              {result && (
                <span className={`text-sm ml-0.5 ${result.correct ? 'text-chlorophyll' : 'text-ochre'}`} aria-hidden="true">
                  {result.correct ? '✓' : '✗'}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PredictionStrip;

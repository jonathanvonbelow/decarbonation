/**
 * Phase 50 (mejora-general/files/50_interfaz_docentes_decarbonito.md §1): the carbon, public-finance and
 * just-transition blocks of the 3-level dashboard. Every number comes from `src/game/modelView.ts` (the model 2.0
 * sub-state); nothing is computed here.
 *
 * The spec puts G and J in "the social panel of levels 2–3" (`src/components/levelSpecific/*`); no such panel exists
 * (RegionalStatusDashboard is illustrative and InnovationGlobalDashboard is about pacts and loans), so they live in
 * this `SocialPanel`, shown from level 2 next to the carbon and finance blocks (docs/DESIGN_DECISIONS_LOG.md, phase 50).
 */
import React from 'react';
import type { GameState } from '../types';
import { useFormat, useT } from '../i18n';
import { carbonView, fiscalView, justTransitionLow, socialView, stressBand } from '../game/modelView';
import { PARAMS_V2 } from '../sim/v2/params';

const F = PARAMS_V2.finance;
const E = PARAMS_V2.energy;
/** Thresholds of the fiscal rules in the copy, read from PARAMS_V2 (percent). */
const FISCAL_COPY = {
  floor: 100 * F.reserveFloor, dy: 100 * F.debtThreshold, dyBreak: 100 * F.bankruptcyDebtRatio, ci: 100 * F.bankruptcyInterestBurden,
  years: F.bankruptcyYears, limit: 12 * F.bankruptcyYears,
};

const Row: React.FC<{ label: string; value: string; tone?: string; tip?: string }> = ({ label, value, tone = 'text-bone', tip }) => (
  // A native title, not <Tooltip>: its inline-block wrapper would put consecutive rows on one line.
  <div className={`flex items-baseline justify-between gap-3 py-0.5 text-sm ${tip ? 'cursor-help' : ''}`} title={tip}>
    <span className="text-ash">{label}</span>
    <span data-numeric className={`tnum ${tone}`}>{value}</span>
  </div>
);

const Shell: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="panel p-4">
    <h3 className="label-eyebrow mb-2">{title}</h3>
    {children}
  </div>
);

/** CO₂ per inhabitant by source, renewables, efficiency and the carbon budget (every level). */
export const CarbonPanel: React.FC<{ gameState: GameState }> = ({ gameState }) => {
  const { t } = useT();
  const fmt = useFormat();
  const v = carbonView(gameState);
  if (!v) return null;
  const share = (x: number) => fmt.pct(100 * x, 0);
  return (
    <Shell title={t('model.carbon.title')}>
      <Row label={t('model.carbon.perCapita')} value={`${fmt.num(v.perCapita, 2)} t`} tip={t('model.carbon.sourcesTip')} />
      <div className="ml-3 border-l border-basalt-700 pl-3">
        <Row label={t('model.carbon.energy')} value={`${fmt.num(v.energy, 2)} t`} />
        <Row label={t('model.carbon.afolu')} value={`${fmt.num(v.afolu, 2)} t`} tone={v.afolu < 0 ? 'text-chlorophyll' : 'text-bone'} />
        <Row label={t('model.carbon.luc')} value={`${fmt.num(v.luc, 2)} t`} tone={v.luc > 0.05 ? 'text-ochre' : 'text-bone'} />
      </div>
      <Row label={t('model.carbon.renewables')} value={share(v.renewableShare)} tip={t('model.carbon.energyTip', { k: 100 * E.adjust })} />
      <Row label={t('model.carbon.efficiency')} value={share(v.efficiency)} tip={t('model.carbon.energyTip', { k: 100 * E.adjust })} />
      <Row
        label={t('model.carbon.budget')}
        value={v.budget === null ? t('model.carbon.budgetNone') : fmt.num(v.budget, 2)}
        tone={v.budget !== null && v.budget > 1 ? 'text-ember' : 'text-bone'}
        tip={t('model.carbon.budgetTip', { cut: 100 * E.budgetCut2054 })}
      />
    </Shell>
  );
};

/** Level 3: debt/GDP, primary balance, interest burden, stress and "no fiscal space"; levels 1–2: primary balance only. */
export const FiscalPanel: React.FC<{ gameState: GameState }> = ({ gameState }) => {
  const { t } = useT();
  const fmt = useFormat();
  const v = fiscalView(gameState);
  if (!v) return null;
  const full = gameState.currentLevel >= 3;
  const band = stressBand(v.stress);
  const pct = (x: number) => fmt.pct(100 * x, 1);
  return (
    <Shell title={t('model.fiscal.title')}>
      <Row label={t('model.fiscal.primary')} value={pct(v.primaryShare)} tone={v.primaryShare < 0 ? 'text-ochre' : 'text-bone'} tip={t('model.fiscal.primaryTip', FISCAL_COPY)} />
      {full && (
        <>
          <Row label={t('model.fiscal.debtRatio')} value={pct(v.debtRatio)} tone={v.debtRatio > 0.6 ? 'text-ember' : v.debtRatio > 0.4 ? 'text-ochre' : 'text-bone'} tip={t('model.fiscal.rules', FISCAL_COPY)} />
          <Row label={t('model.fiscal.burden')} value={pct(v.interestBurden)} tone={v.interestBurden > 0.2 ? 'text-ember' : 'text-bone'} />
          <p className={`mt-1 text-xs ${band === 'high' ? 'text-ember' : band === 'mid' ? 'text-ochre' : 'text-chlorophyll'}`}>
            {t(band === 'high' ? 'model.fiscal.stressHigh' : band === 'mid' ? 'model.fiscal.stressMid' : 'model.fiscal.stressLow')}
          </p>
          {v.noFiscalSpace && <p className="mt-1 text-xs text-ember">{t('model.fiscal.noSpace', FISCAL_COPY)}</p>}
          {v.breachMonths > 0 && <p className="mt-1 text-xs text-ember">{t('model.fiscal.breach', { ...FISCAL_COPY, months: v.breachMonths })}</p>}
        </>
      )}
    </Shell>
  );
};

/** Levels 2–3: land concentration G and just transition J (phase 45), with the "restricting without support" warning. */
export const SocialPanel: React.FC<{ gameState: GameState }> = ({ gameState }) => {
  const { t } = useT();
  const fmt = useFormat();
  const v = socialView(gameState);
  if (!v) return null;
  const low = justTransitionLow(v);
  return (
    <Shell title={t('model.social.title')}>
      <Row
        label={t('model.social.concentration')}
        value={fmt.num(v.concentration, 2)}
        tone={v.concentration > v.concentration0 + 0.02 ? 'text-ochre' : 'text-bone'}
        tip={t('model.social.concentrationTip', { start: fmt.num(v.concentration0, 2) })}
      />
      <Row label={t('model.social.just')} value={fmt.num(v.justTransition, 2)} tone={low ? 'text-ember' : 'text-bone'} tip={t('model.social.justTip')} />
      {low && <p className="mt-1 text-xs text-ember">{t('model.social.justLow')}</p>}
    </Shell>
  );
};

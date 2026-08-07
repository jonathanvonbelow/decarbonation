
import React from 'react';
import { MAX_LEVELS } from '../constants';
import Tooltip from './common/Tooltip';
import { useT } from '../i18n';
import { ANCHORS, useAnchor } from './decarbonito/anchors';
import { useDecarboNito } from './decarbonito/DecarboNitoProvider';
import type { BadgeId } from '../game/badges';

interface HeaderProps {
  year: number;
  targetYear?: number;
  score: number;
  level: number;
  levelName?: string;
  headerSuffix?: string;
  gameOver: boolean;
  setCurrentLevelManually: (levelNumber: number) => void;
  scoreTooltipText: string;
  scoreColorClass: string;
  onShowTutorial: () => void;
  onShowFacilitatorManual: () => void;
  onShowPlayerManual: () => void;
  onShowEquationsManual: () => void;
  onShowAbout: () => void;
  wonLevels: number[];
  onToggleFacilitatorPanel: () => void;
  onAbandon?: () => void;
  /** Most recently earned badge, or null. §7: "fila discreta en el header (solo la última
   *  obtenida) + grilla completa en el perfil" -- the profile grid doesn't exist yet (deferred,
   *  see docs/DESIGN_DECISIONS_LOG.md), so this chip is the entire presentation for now. */
  latestBadge?: BadgeId | null;
}


const Header: React.FC<HeaderProps> = ({
  year,
  targetYear,
  score,
  level,
  levelName,
  headerSuffix,
  gameOver,
  setCurrentLevelManually,
  scoreTooltipText,
  scoreColorClass,
  onShowTutorial,
  onShowFacilitatorManual,
  onShowPlayerManual,
  onShowEquationsManual,
  onShowAbout,
  wonLevels,
  onToggleFacilitatorPanel,
  onAbandon,
  latestBadge,
}) => {
  const { t, locale, setLocale } = useT();
  const toggleLanguage = () => setLocale(locale === 'es' ? 'en' : 'es');
  const dn = useDecarboNito();
  const scoreRef = useAnchor<HTMLDivElement>(ANCHORS.score, t('header.score'));
  const yearRef = useAnchor<HTMLDivElement>(ANCHORS.year, t('header.year'));
  const levelRef = useAnchor<HTMLDivElement>(ANCHORS.levelBadge, t('header.level'));
  const localeRef = useAnchor<HTMLButtonElement>(ANCHORS.localeSwitch, t('header.toggleLanguageLabel'));
  const helpRef = useAnchor<HTMLButtonElement>(ANCHORS.helpButton, t('header.tutorial'));

  return (
    <header className="bg-basalt-900 text-bone p-4 border-b border-basalt-700">
      <div className="container mx-auto flex flex-col sm:flex-row justify-between items-center">
        <div className="flex items-center mb-2 sm:mb-0">
          <h1 className="text-3xl font-bold text-chlorophyll font-[var(--font-display)] tracking-tight">
            DecarboNation <span className="text-xl text-hydro">{headerSuffix}</span>
          </h1>
          <div className="flex flex-wrap items-center ml-2 sm:ml-4">
            <button
              ref={helpRef}
              onClick={onShowTutorial}
              className="m-1 px-3 py-1.5 text-xs bg-basalt-700 hover:bg-basalt-600 text-bone font-semibold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-hydro"
              aria-label={t('header.tutorial')}
            >
              {t('header.tutorial')}
            </button>
            <button
              onClick={onShowPlayerManual}
              className="m-1 px-3 py-1.5 text-xs bg-basalt-700 hover:bg-basalt-600 text-bone font-semibold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-hydro"
              aria-label={t('header.playerManual')}
            >
              {t('header.playerManual')}
            </button>
            <button
              onClick={onShowFacilitatorManual}
              className="m-1 px-3 py-1.5 text-xs bg-basalt-700 hover:bg-basalt-600 text-bone font-semibold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-hydro"
              aria-label={t('header.facilitators')}
            >
              {t('header.facilitators')}
            </button>
            <button
              onClick={onShowEquationsManual}
              className="m-1 px-3 py-1.5 text-xs bg-basalt-700 hover:bg-basalt-600 text-bone font-semibold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-hydro"
              aria-label={t('header.equations')}
            >
              {t('header.equations')}
            </button>
            <button
              onClick={onShowAbout}
              className="m-1 px-3 py-1.5 text-xs bg-basalt-700 hover:bg-basalt-600 text-bone font-semibold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-ash-dim"
              aria-label={t('header.about')}
              title={t('header.about')}
            >
              {t('header.about')}
            </button>
            {onAbandon && !gameOver && (
              <button
                onClick={onAbandon}
                className="m-1 px-3 py-1.5 text-xs text-ember hover:brightness-125 border border-ember/40 hover:border-ember rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-ember"
                aria-label={t('header.abandon')}
              >
                {t('header.abandon')}
              </button>
            )}
            <button
              ref={localeRef}
              onClick={toggleLanguage}
              className="m-1 px-3 py-1.5 text-xs text-ash hover:text-bone border border-basalt-600 hover:border-ash-dim rounded-lg transition-colors focus:outline-none focus:ring-1 focus:ring-ash-dim"
              aria-label={t('header.toggleLanguageLabel')}
              title={t('header.toggleLanguageLabel')}
            >
              {t('header.toggleLanguageFlag')} {t('header.toggleLanguageLabel')}
            </button>
          </div>
        </div>
        <div className="flex space-x-4 sm:space-x-6 items-center">
          <div ref={levelRef} className="text-center">
            <span className="label-eyebrow">{t('header.level')}</span>
            <span className="text-xl font-semibold">{level}</span>
          </div>
          <div ref={yearRef} className="text-center">
            <span className="label-eyebrow">{t('header.year')}</span>
            {targetYear ? (
              <Tooltip text={t('header.yearTooltip', { target: targetYear })} position="bottom">
                <span className="text-xl font-semibold cursor-help">{`${year} / ${targetYear}`}</span>
              </Tooltip>
            ) : (
              <span className="text-xl font-semibold">{year}</span>
            )}
          </div>
          <Tooltip text={scoreTooltipText} position="bottom">
            <div ref={scoreRef} className="text-center cursor-help">
              <span className="label-eyebrow">{t('header.score')}</span>
              <span className={`text-xl font-semibold ${scoreColorClass}`}>
                {score.toFixed(1)}
              </span>
            </div>
          </Tooltip>
          {gameOver && <span className="text-lg font-semibold text-ember px-2 py-1 bg-ember/15 rounded">{t('header.gameOver')}</span>}
          {latestBadge && (
            <Tooltip text={t(`badges.${latestBadge}.desc` as any)} position="bottom">
              <div className="text-center cursor-help">
                <span className="label-eyebrow">{t('badges.latestLabel')}</span>
                <span className="text-sm font-semibold text-chlorophyll">🏅 {t(`badges.${latestBadge}.name` as any)}</span>
              </div>
            </Tooltip>
          )}
          {dn.hidden && (
            <button
              onClick={() => dn.setHidden(false)}
              className="w-10 h-10 rounded-full bg-hydro text-basalt-950 flex items-center justify-center text-lg font-bold focus:outline-none focus:ring-2 focus:ring-hydro"
              aria-label={t('dn.menu.hide')}
              title={t('dn.avatarLabel')}
            >
              🤖
            </button>
          )}
          <button
            onClick={onToggleFacilitatorPanel}
            className="text-ash hover:text-bone text-xl ml-2 focus:outline-none focus:ring-1 focus:ring-ash-dim rounded"
            aria-label={t('header.facilitatorPanel')}
            title={t('header.facilitatorPanel')}
          >
            &#9881;
          </button>
        </div>
      </div>
      {levelName && !gameOver && (
        <div className="text-center text-base text-ash mt-1 sm:mt-0 sm:absolute sm:left-1/2 sm:-translate-x-1/2 sm:top-12">{t('header.currentFocus')}: {levelName}</div>
      )}
      {!gameOver && (
        <div className="container mx-auto flex justify-center space-x-2 mt-2">
          {[...Array(MAX_LEVELS)].map((_, i) => {
            const levelNum = i + 1;
            const isDisabled = level === levelNum || gameOver;
            return (
              <Tooltip
                key={`level-btn-tooltip-${levelNum}`}
                text={isDisabled && level === levelNum ? t('header.alreadyAtLevel', { n: levelNum }) : t('header.setLevel', { n: levelNum })}
                position="bottom"
              >
                <button
                  key={levelNum}
                  onClick={() => setCurrentLevelManually(levelNum)}
                  disabled={isDisabled}
                  className={`px-3 py-1 text-xs rounded transition-colors mr-1 last:mr-0
                    ${level === levelNum ? 'bg-hydro text-basalt-950 cursor-default' :
                      (gameOver ? 'bg-basalt-700 text-ash-dim cursor-not-allowed' : 'bg-basalt-700 hover:bg-basalt-600 text-bone')
                    }
                  `}
                  aria-disabled={isDisabled}
                >
                  {t('header.setLevelShort', { n: levelNum })}
                </button>
              </Tooltip>
            );
          })}
        </div>
      )}
    </header>
  );
};

export default Header;

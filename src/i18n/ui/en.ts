import type { UI_ES } from './es';

/** Structural mirror of UI_ES: any missing or extra key is a TypeScript error. */
type UIShape = typeof UI_ES;

export const UI_EN: UIShape = {
  toast: {
    close: 'Close',
  },
  header: {
    tutorial: 'Help/Tutorial',
    playerManual: "Player's Manual",
    facilitators: 'Facilitators',
    equations: 'Equations',
    about: 'About',
    abandon: 'Abandon',
    gameOver: 'GAME OVER',
    level: 'Level',
    year: 'Year',
    yearTooltip: 'The level ends in the year {target}.',
    score: 'Score',
    currentFocus: 'Current Focus',
    setLevel: 'Set Level {n}',
    alreadyAtLevel: 'Already at Level {n}',
    setLevelShort: 'Set Lvl {n}',
    facilitatorPanel: 'Facilitator panel',
    toggleLanguageLabel: 'Español',
    toggleLanguageFlag: '🇦🇷',
  },
  gameLog: {
    title: 'Activity Log',
    empty: 'No activities logged yet.',
    expand: 'Expand log',
    collapse: 'Collapse log',
  },
  policyToggle: {
    currentEfficiency: 'Current Efficiency:',
    efficiencyNote: 'Efficiency varies over time and political factors.',
    lockedUntil: '🔒 Locked until year {year}.',
    efficiencyTitle: 'Efficiency: {value}%',
  },
};

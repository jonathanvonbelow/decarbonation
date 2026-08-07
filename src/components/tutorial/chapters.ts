/**
 * The 9 chapters of 18_tutoriales_v3.md §4.3's table (0-8; the table itself calls it "ocho
 * capítulos" while listing nine rows including coldOpen — all nine are implemented here). Kept
 * deliberately lean per chapter (2-4 steps) so the *engine* being real matters more than every
 * chapter matching the source's exact word count — see docs/DESIGN_DECISIONS_LOG.md, phase 9 entry.
 *
 * `demo` (the source spec's optional agent-driven live demonstration inside a step) is not
 * implemented: wiring the tutorial engine to phase 8's `executeCall` in `tutorial` mode is real
 * work with its own edge cases (what if the demo's target anchor/policy doesn't exist for this
 * player's state?) — chapters that would have used it (5: decarbonito) instead narrate/point,
 * documented as a trim, not a silent omission.
 */
import { Policy } from '../../types';
import { ANCHORS } from '../decarbonito/anchors';
import type { TutorialChapter } from './types';

const countActivePolicies = (s: { policies: Record<string, { isActive: boolean }> }) =>
  Object.values(s.policies).filter((p) => p.isActive).length;

export const CHAPTERS: TutorialChapter[] = [
  {
    id: 'coldOpen',
    titleKey: 'tutorial.coldOpen.title',
    level: 1,
    estimatedSeconds: 90,
    // No `trigger` — launched explicitly, once, by TutorialRunner's first-visit check (§3).
    steps: [
      {
        id: 'choice',
        textKey: 'tutorial.coldOpen.choice',
        pose: { state: 'explain', emotion: 'curious' },
        advance: { on: 'gameEvent', event: 'policyActivated' },
      },
      {
        id: 'confirmed',
        textKey: 'tutorial.coldOpen.confirmed',
        anchor: ANCHORS.simulateButton,
        spotlight: true,
        pose: { state: 'nod', emotion: 'happy' },
        advance: { on: 'gameEvent', event: 'yearSimulated' },
      },
      {
        // Special-cased in TutorialRunner: this step's completion offers the "Mostrame"/"Explorar"
        // fork (§3) instead of a generic "Siguiente" — the one branch point in the whole engine.
        id: 'resultIntro',
        textKey: 'tutorial.coldOpen.resultIntro',
        anchor: ANCHORS.indicatorBiodiversity,
        pose: { state: 'explain' },
        advance: { on: 'click' },
      },
    ],
  },
  {
    id: 'board',
    titleKey: 'tutorial.board.title',
    level: 1,
    estimatedSeconds: 70,
    steps: [
      { id: 'biodiversity', textKey: 'tutorial.board.biodiversity', anchor: ANCHORS.indicatorBiodiversity, spotlight: true, advance: { on: 'click' } },
      { id: 'emissions', textKey: 'tutorial.board.emissions', anchor: ANCHORS.indicatorEmissions, spotlight: true, advance: { on: 'click' } },
      { id: 'chart', textKey: 'tutorial.board.chart', anchor: ANCHORS.landUseChart, spotlight: true, advance: { on: 'click' } },
    ],
  },
  {
    id: 'policies',
    titleKey: 'tutorial.policies.title',
    level: 1,
    estimatedSeconds: 80,
    steps: [
      { id: 'intro', textKey: 'tutorial.policies.intro', anchor: ANCHORS.policyList, spotlight: true, advance: { on: 'click' } },
      {
        id: 'tryOne', textKey: 'tutorial.policies.tryOne', anchor: ANCHORS.policyList,
        // Only asks for a *first* activation if the player hasn't already got one going —
        // `when` lets the chapter adapt instead of asking for something already done (§4.2).
        when: (s) => countActivePolicies(s) === 0,
        advance: { on: 'gameEvent', event: 'policyActivated' },
      },
    ],
  },
  {
    id: 'routes',
    titleKey: 'tutorial.routes.title',
    level: 1,
    estimatedSeconds: 90,
    steps: [
      { id: 'intro', textKey: 'tutorial.routes.intro', anchor: ANCHORS.winRoutesPanel, spotlight: true, advance: { on: 'click' } },
    ],
  },
  {
    id: 'prediction',
    titleKey: 'tutorial.prediction.title',
    level: 1,
    estimatedSeconds: 60,
    steps: [
      { id: 'intro', textKey: 'tutorial.prediction.intro', anchor: ANCHORS.simulateButton, spotlight: true, advance: { on: 'click' } },
    ],
  },
  {
    id: 'decarbonito',
    titleKey: 'tutorial.decarbonito.title',
    level: 1,
    estimatedSeconds: 70,
    steps: [
      { id: 'capabilities', textKey: 'tutorial.decarbonito.capabilities', anchor: ANCHORS.avatar, advance: { on: 'click' } },
      { id: 'tryAsking', textKey: 'tutorial.decarbonito.tryAsking', anchor: ANCHORS.avatar, advance: { on: 'gameEvent', event: 'chatOpened' } },
    ],
  },
  {
    id: 'instruments',
    titleKey: 'tutorial.instruments.title',
    level: 2,
    estimatedSeconds: 90,
    // Triggered the first time the instrument panel is actually reachable, not on level entry
    // (§4.3) — "teaching the instrument when it's needed is the difference between information
    // and learning."
    trigger: (s) => s.currentLevel >= 2 && countActivePolicies(s) > 0,
    steps: [
      { id: 'intro', textKey: 'tutorial.instruments.intro', anchor: ANCHORS.instrumentPanel, spotlight: true, advance: { on: 'click' } },
    ],
  },
  {
    id: 'pressures',
    titleKey: 'tutorial.pressures.title',
    level: 2,
    estimatedSeconds: 80,
    trigger: (s) => s.currentLevel >= 2,
    steps: [
      // No dedicated pressure-tile anchors exist yet (only the summary indicators do) — points at
      // political stability, the indicator pressures ultimately feed into.
      { id: 'intro', textKey: 'tutorial.pressures.intro', anchor: ANCHORS.indicatorPoliticalStability, spotlight: true, advance: { on: 'click' } },
    ],
  },
  {
    id: 'finance',
    titleKey: 'tutorial.finance.title',
    level: 3,
    estimatedSeconds: 100,
    trigger: (s) => s.currentLevel >= 3,
    steps: [
      { id: 'intro', textKey: 'tutorial.finance.intro', anchor: ANCHORS.loanControl, spotlight: true, advance: { on: 'click' } },
    ],
  },
];

export const CHAPTERS_BY_ID: Record<string, TutorialChapter> = Object.fromEntries(CHAPTERS.map((c) => [c.id, c]));

// Policies chapter 0/2 point the player at *a* policy without picking one for them (the source
// spec's cold open explicitly wants both options "defendible" — no anchor on a specific row would
// bias the choice). NaturalConservation/IntensiveAgriculture are the two the source brief names.
export const COLD_OPEN_POLICIES: [Policy, Policy] = [Policy.IntensiveAgriculture, Policy.NaturalConservation];

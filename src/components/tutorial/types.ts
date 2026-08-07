/**
 * Tutorial chapter data model (18_tutoriales_v3.md §4.1), adapted to this codebase's real types.
 * `SimState` is a type alias for `GameState` (src/sim/types.ts) — the source file's own name,
 * kept for fidelity even though it's the same type.
 */
import type { AnchorId } from '../decarbonito/anchors';
import type { DnEmotion, DnState } from '../decarbonito/types';
import type { SimState } from '../../sim/types';
import type { TranslationKey } from '../../i18n';

export type ChapterId =
  | 'coldOpen' | 'board' | 'policies' | 'routes' | 'prediction'
  | 'decarbonito' | 'instruments' | 'pressures' | 'finance';

export type TutorialGameEvent = 'policyActivated' | 'policyDeactivated' | 'yearSimulated' | 'chatOpened';

export interface TutorialStep {
  id: string;
  /** i18n key for the bubble text. Never a literal. */
  textKey: TranslationKey;
  /** Interpolations resolved against live game state at render time. */
  values?: (s: SimState) => Record<string, string | number>;
  /** DecarboNito travels here and points before speaking. */
  anchor?: AnchorId;
  pose?: { state: DnState; emotion?: DnEmotion };
  /** Dim everything except the anchor. Only true inside guided chapters. */
  spotlight?: boolean;
  /** How the step is completed. */
  advance:
    | { on: 'click' } // "Siguiente" button
    | { on: 'anchorClick'; anchorId: AnchorId } // the player touches the real control
    | { on: 'gameEvent'; event: TutorialGameEvent }
    | { on: 'predicate'; check: (s: SimState) => boolean }
    | { on: 'timeout'; ms: number };
  /** Skipped when false — lets a chapter adapt to what the player already did. */
  when?: (s: SimState) => boolean;
}

export interface TutorialChapter {
  id: ChapterId;
  titleKey: TranslationKey;
  /** Minimum level at which the chapter is offered. */
  level: number;
  /** Auto-offered the first time this condition holds (chapters 6-8: triggered by touching the
   * relevant control, not offered on level entry — 18_tutoriales_v3.md §4.3). `coldOpen` has no
   * trigger: it is launched explicitly, once, by the engine's own first-visit check. */
  trigger?: (s: SimState) => boolean;
  estimatedSeconds: number;
  steps: TutorialStep[];
}

export interface TutorialProgress {
  completedChapters: ChapterId[];
  /** chapterId -> step index, for resuming after a reload mid-chapter. */
  inProgress: Partial<Record<ChapterId, number>>;
  skippedAll: boolean;
}

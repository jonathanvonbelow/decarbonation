/**
 * Situations: the things that land on the desk of whoever governs the territory.
 *
 * Design (pedido del usuario, decisión 1): a situation never pauses the clock. It arrives, it sits
 * in the inbox, and while it sits there it *wears the government down* — a little pressure or social
 * conflict every month, which is what an unresolved problem actually costs. If it is still open when
 * its deadline passes it resolves itself the bad way (the last option, the one nobody chose).
 *
 * Everything a situation does is written in the model's own language (`RandomEventEffect`: the same
 * indicators, Stella stocks and land-use changes the 3-level game's random events use), so no
 * situation can move a number the model does not already own.
 */
import type { GameState, RandomEventEffect } from '../../types';

export type SituationActor = 'farmer' | 'ngo' | 'citizen' | 'industry' | 'science' | 'government' | 'international';

export type SituationCategory =
  | 'climate' | 'ecology' | 'production' | 'society' | 'politics' | 'economy' | 'technology' | 'international';

export type SituationTone = 'good' | 'bad' | 'neutral';

/**
 * Pressure and conflict a situation causes every month it stays unresolved, in catalogue points: since phase 42 each
 * point shifts the target of that indicator by PARAMS_V2.relaxation.wearLogit logit units (× age factor 1–2).
 */
export interface SituationWear {
  conflict?: number;
  ppAgricola?: number;
  ppAmbientalista?: number;
  ppSocial?: number;
}

export interface SituationOption {
  id: string;
  es: string;
  en: string;
  /** Catalogue price, paid as a public investment when chosen (× √(Y/Y0), capped at 2.5: `situationCost`). */
  cost?: number;
  effects: RandomEventEffect[];
}

export interface SituationDef {
  id: string;
  actor: SituationActor;
  category: SituationCategory;
  tone: SituationTone;
  /** Months before it resolves itself with the last option. */
  deadline: number;
  /** Relative frequency among the situations whose `when` holds. */
  weight: number;
  wear: SituationWear;
  /**
   * Half-life in months of the impulses its options leave on the indicators' targets (phase 47). Without it, the
   * default 18 months (PARAMS_V2.situations.halfLifeMonths); set only for structural effects (works, laws), at most 10
   * situations, each documented where it is declared.
   */
  halfLifeMonths?: number;
  /** Extra condition on the state; without it the situation can always appear. */
  when?: (s: GameState) => boolean;
  es: { title: string; body: string };
  en: { title: string; body: string };
  /** At least two; the last one is what happens if the player never decides. */
  options: SituationOption[];
}

/** A situation actually sitting in the player's inbox. */
export interface OpenSituation {
  id: string;
  defId: string;
  /** Month index when it arrived, and the month it expires. */
  openedAt: number;
  expiresAt: number;
  /** Wear already accumulated, in points of the indicators it pushed (phase 47), for the debriefing. */
  worn: number;
}

export type SituationResolution = 'chosen' | 'expired';

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

/** Pressure and conflict a situation adds every month it stays unresolved. */
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
  /** Paid from Reservas_del_Tesoro when chosen. */
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
  /** Wear already accumulated, in pressure points, for the debriefing. */
  worn: number;
}

export type SituationResolution = 'chosen' | 'expired';

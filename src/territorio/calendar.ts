/**
 * Calendar of the Territorio preview's single level (mejora-general/files/21_fusion_ecosim.md §6).
 * Its own module so both the session rules and the news feed read the same dates.
 */
import { INITIAL_YEAR, YEARS_PER_LEVEL } from '../constants';
import { MONTHS_PER_YEAR } from '../sim';

export const TERRITORIO_LEVEL = 2;
export const START_YEAR = INITIAL_YEAR;
export const END_YEAR = INITIAL_YEAR + YEARS_PER_LEVEL;
export const TOTAL_MONTHS = YEARS_PER_LEVEL * MONTHS_PER_YEAR;
/** After five years the player re-splits effort among a policy's instruments. */
export const INSTRUMENTS_UNLOCK_YEAR = START_YEAR + 5;
// Loan and additional tax pressure unlock at CONTROL_PARAMS.Ano_Activacion_Prestamo (the model's
// own loan-activation year); each pact at its own `unlockYear`.

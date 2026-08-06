/**
 * Sim-layer types.
 *
 * mejora-general/files/16_auditoria_ecuaciones.md §2.1 envisions a slim `SimState`/`SimInput`
 * pair fully decoupled from the app's `GameState`. This extraction takes a pragmatic shortcut:
 * `GameState` (src/types.ts) is already plain data with zero React/UI dependency — it just also
 * carries a few UI-bookkeeping fields (`gameLog`, `isSimulating`, `_pendingLevelIntroTrigger`,
 * etc.) that `stepYear` below simply ignores/passes through untouched. Splitting a truly minimal
 * `SimState` is a reasonable follow-up once a caller (e.g. the win-routes baseline snapshot in
 * phase 5, or the Monte Carlo harness) needs a smaller serializable shape — tracked in
 * docs/DESIGN_DECISIONS_LOG.md rather than done speculatively here.
 */
import type { GameState } from '../types';

export type SimState = GameState;

export { type SimTrace } from './trace';

/**
 * Types for DecarboNitoAvatar (mejora-general/files/13_decarbonito_character.md).
 *
 * `DecarboNitoAvatar` is a pure, isolated component: it only knows `state`/`emotion`/`tone`,
 * never the game's own state. The logic that decides *when* to show which state lives in phase 7
 * (14_decarbonito_overlay.md) — this file and DecarboNitoAvatar.tsx have no dependency on it.
 */

/** 14 animation states (source requires >=10). See DecarboNitoAvatar.tsx `bodyVariants` for timing. */
export type DnState =
  | 'idle' | 'wave' | 'point' | 'think' | 'explain' | 'celebrate' | 'alert'
  | 'worry' | 'sleep' | 'load' | 'travel' | 'peek' | 'nod' | 'facepalm';

/** Facial expression, independent of state — freely combinable (e.g. state="point" emotion="focused"). */
export type DnEmotion = 'neutral' | 'happy' | 'focused' | 'alarmed' | 'sleepy' | 'curious';

/** Visor/ring color tint, communicates urgency without text. */
export type DnTone = 'normal' | 'caution' | 'critical' | 'success';

export interface DnAvatarProps {
  state?: DnState;
  emotion?: DnEmotion;
  tone?: DnTone;
  /** Rendered pixel size (square-ish, actual aspect is 120:140). Below 40 the antenna and arms are dropped. */
  size?: number;
  /** Degrees, 0 = right. Used by `point` and `travel` to orient body, arm and beam. */
  targetAngle?: number;
  /** Beam length in local SVG units (see phase 7: computed from the anchor distance). */
  beamLength?: number;
  /** Fires when a non-looping state finishes — lets the controller return to idle. */
  onStateComplete?: (state: DnState) => void;
  className?: string;
}

/** All 14 states, in the source file's catalog order — shared by the lab grid and any future consumer. */
export const DN_STATES: DnState[] = [
  'idle', 'wave', 'point', 'think', 'explain', 'celebrate', 'alert',
  'worry', 'sleep', 'load', 'travel', 'peek', 'nod', 'facepalm',
];

export const DN_EMOTIONS: DnEmotion[] = ['neutral', 'happy', 'focused', 'alarmed', 'sleepy', 'curious'];

export const DN_TONES: DnTone[] = ['normal', 'caution', 'critical', 'success'];

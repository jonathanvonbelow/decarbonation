/**
 * DecarboNito's 3D renders (DecarboNito_3D_pack, incorporado el 2026-09-21).
 *
 * The character used to be drawn as inline SVG; it is now a set of stills of the same ceramic
 * robot — ivory body, mint joints, amber eyes and the sprout on its head — keyed out of their
 * forest background, trimmed and exported to WebP (`public/assets/decarbonito/`).
 *
 * The component's contract did not change: the fourteen states of `DnState` still exist, and each
 * one maps to the pose that reads closest to it. Expression now lives in the render rather than in
 * separately animated eyes, so `DnEmotion` only picks the pose for the states that have no strong
 * pose of their own (a worried idle is the alert render standing still, not a shaking one).
 */
import type { DnEmotion, DnState } from './types';

export type DnPose = 'hero_idle_34' | 'front_idle' | 'talk' | 'wave' | 'alert' | 'think' | 'celebrate' | 'point' | 'bust';

export const poseUrl = (pose: DnPose): string => `/assets/decarbonito/${pose}.webp`;

/** Pose per state. Several states share a render and are told apart by their motion. */
const POSE_FOR_STATE: Record<DnState, DnPose> = {
  idle: 'hero_idle_34',
  wave: 'wave',
  point: 'point',
  think: 'think',
  explain: 'talk',
  celebrate: 'celebrate',
  alert: 'alert',
  worry: 'alert',
  sleep: 'front_idle',
  load: 'think',
  travel: 'hero_idle_34',
  peek: 'front_idle',
  nod: 'talk',
  facepalm: 'think',
};

/** Emotion only decides the pose where the state does not: a still character has one face per render. */
const POSE_FOR_IDLE_EMOTION: Partial<Record<DnEmotion, DnPose>> = {
  alarmed: 'alert',
  focused: 'think',
  happy: 'front_idle',
  curious: 'think',
};

export function poseFor(state: DnState, emotion: DnEmotion): DnPose {
  if (state === 'idle') return POSE_FOR_IDLE_EMOTION[emotion] ?? POSE_FOR_STATE.idle;
  return POSE_FOR_STATE[state] ?? POSE_FOR_STATE.idle;
}

/**
 * The hand that points is the character's own left, i.e. screen-left. Mirroring the still is what
 * makes it point at anything on the other side.
 */
export const pointsLeft = (targetAngle: number): boolean => Math.abs(targetAngle) > 90;

let preloaded = false;
/** Warms every pose once, so changing state never shows a gap while the file loads. */
export function preloadPoses(): void {
  if (preloaded || typeof Image === 'undefined') return;
  preloaded = true;
  (['hero_idle_34', 'front_idle', 'talk', 'wave', 'alert', 'think', 'celebrate', 'point', 'bust'] as DnPose[])
    .forEach((pose) => { new Image().src = poseUrl(pose); });
}

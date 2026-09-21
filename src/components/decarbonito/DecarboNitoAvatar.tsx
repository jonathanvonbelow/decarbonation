/**
 * DecarboNitoAvatar — pure, isolated animated avatar (mejora-general/files/13_decarbonito_character.md,
 * re-skinned with the 3D pack on 2026-09-21).
 *
 * Deliberately knows nothing about the game: only `state`/`emotion`/`tone`/`size`/`targetAngle`/
 * `beamLength` come in as props, and `onStateComplete` goes out when a one-shot animation ends.
 * The controller that decides *when* to show which state (chat activity, indicator thresholds,
 * `highlight_element` calls) is phase 7's job (14_decarbonito_overlay.md) — not this file's.
 *
 * The character is now a set of 3D renders (see sprites.ts) instead of inline SVG shapes. What the
 * SVG used to animate limb by limb, the stills carry in the pose itself; this file animates the
 * whole figure — a float, a nod, a shake, a pop — and keeps the two things the renders cannot do:
 * the tone glow, and the pointing beam that phase 8 aims at runtime-computed screen coordinates
 * (15_decarbonito_agente_acciones.md). The beam stays an SVG overlay in the avatar's own box, so
 * the pointing contract is unchanged.
 */
import React, { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import type { Variants } from 'motion/react';
import type { DnAvatarProps, DnState, DnTone } from './types';
import { poseFor, pointsLeft, poseUrl, preloadPoses } from './sprites';

/* ── Design tokens (kept local so the avatar can be dropped into any surface) ── */
const TONE: Record<DnTone, { accent: string; glow: string }> = {
  normal: { accent: '#5FB3C9', glow: 'rgba(95,179,201,0.30)' },
  caution: { accent: '#E0A458', glow: 'rgba(224,164,88,0.34)' },
  critical: { accent: '#E8613C', glow: 'rgba(232,97,60,0.38)' },
  success: { accent: '#6FD08C', glow: 'rgba(111,208,140,0.34)' },
};

/** The whole figure moves: each state is one gesture of the body, not of its parts. */
const figureVariants: Variants = {
  idle: { y: [0, -4, 0], rotate: 0, scale: 1, transition: { duration: 3.4, repeat: Infinity, ease: 'easeInOut' } },
  wave: { y: [0, -7, 0, -7, 0], rotate: [0, -3, 0, -3, 0], transition: { duration: 1.4, ease: 'easeInOut' } },
  point: { y: 0, scale: 1.02, transition: { duration: 0.3, ease: [0.34, 1.56, 0.64, 1] } },
  think: { y: [0, -2, 0], rotate: [0, -2, 0], transition: { duration: 3.6, repeat: Infinity, ease: 'easeInOut' } },
  explain: { y: [0, -3, 0], transition: { duration: 1.8, repeat: Infinity, ease: 'easeInOut' } },
  celebrate: { y: [0, -18, 0, -10, 0], scale: [1, 1.06, 1, 1.03, 1], transition: { duration: 1.8, ease: 'easeOut' } },
  alert: { x: [0, -5, 5, -4, 4, 0], transition: { duration: 0.6, repeat: 1 } },
  worry: { y: [0, 2, 0], rotate: [0, 2.5, 0], transition: { duration: 2.6, repeat: Infinity, ease: 'easeInOut' } },
  sleep: { y: [0, 2, 0], scale: 0.96, transition: { duration: 4.6, repeat: Infinity, ease: 'easeInOut' } },
  load: { y: [0, -3, 0], transition: { duration: 1, repeat: Infinity, ease: 'easeInOut' } },
  travel: { y: -8, rotate: 0, transition: { duration: 0.3 } },
  peek: { y: [30, -6, 0], transition: { duration: 0.8, ease: [0.34, 1.56, 0.64, 1] } },
  nod: { rotate: [0, 8, 0, 8, 0], transition: { duration: 0.7 } },
  facepalm: { y: [0, 5, 5, 0], rotate: [0, -4, -4, 0], transition: { duration: 1.2 } },
};

/** The chest light breathes; it pulses while talking and flashes on alert. */
const glowVariants: Variants = {
  idle: { opacity: [0.45, 0.75, 0.45], scale: [1, 1.06, 1], transition: { duration: 3.4, repeat: Infinity, ease: 'easeInOut' } },
  explain: { opacity: [0.5, 0.95, 0.5], scale: [1, 1.12, 1], transition: { duration: 0.9, repeat: Infinity, ease: 'easeInOut' } },
  nod: { opacity: [0.5, 0.9, 0.5], transition: { duration: 0.7, repeat: Infinity } },
  alert: { opacity: [0.9, 0.3, 0.9, 0.3, 0.9], transition: { duration: 0.6, repeat: 1 } },
  celebrate: { opacity: [0.6, 1, 0.6], scale: [1, 1.3, 1], transition: { duration: 0.9, repeat: 1 } },
  load: { opacity: [0.35, 0.85, 0.35], transition: { duration: 1.1, repeat: Infinity, ease: 'linear' } },
  sleep: { opacity: 0.18, scale: 0.9, transition: { duration: 0.8 } },
};

/** States that end by themselves and should hand control back to the caller. */
const ONE_SHOT: DnState[] = ['wave', 'celebrate', 'alert', 'peek', 'nod', 'facepalm'];
const ONE_SHOT_MS: Partial<Record<DnState, number>> = {
  wave: 1400, celebrate: 1800, alert: 1000, peek: 800, nod: 700, facepalm: 1200,
};

/** Picks the closest defined variant, falling back to `idle`. */
const pick = (v: Variants, s: DnState): string => (s in v ? s : 'idle');

export const DecarboNitoAvatar: React.FC<DnAvatarProps> = ({
  state = 'idle',
  emotion = 'neutral',
  tone = 'normal',
  size = 96,
  targetAngle = 0,
  beamLength = 0,
  variant = 'full',
  onStateComplete,
  className = '',
}) => {
  const reduced = useReducedMotion();
  const colors = TONE[tone];
  const [ready, setReady] = useState(false);

  useEffect(() => { preloadPoses(); }, []);

  /* Notify the controller when a one-shot animation is over. */
  useEffect(() => {
    if (!onStateComplete || !ONE_SHOT.includes(state)) return;
    const ms = reduced ? 0 : (ONE_SHOT_MS[state] ?? 800);
    const id = setTimeout(() => onStateComplete(state), ms);
    return () => clearTimeout(id);
  }, [state, onStateComplete, reduced]);

  const anim = reduced ? 'idle' : state;
  const height = size * (140 / 120);

  if (variant === 'bust') {
    return (
      <span
        className={`inline-block overflow-hidden rounded-full ${className}`}
        style={{ width: size, height: size, background: colors.glow }}
        role="img"
        aria-label="DecarboNito"
      >
        <img src={poseUrl('bust')} alt="" width={size} height={size} className="h-full w-full object-cover" />
      </span>
    );
  }

  /* The pointing hand is the character's own left; mirror the still to reach the other side. */
  const flip = state === 'point' && !pointsLeft(targetAngle);
  const beamOriginX = flip ? 96 : 24;

  return (
    <div
      className={className}
      style={{ width: size, height, position: 'relative', willChange: 'transform' }}
      role="img"
      aria-label="DecarboNito"
    >
      {/* Tone glow: the one thing the renders cannot say by themselves. */}
      <motion.span
        aria-hidden
        variants={glowVariants}
        animate={pick(glowVariants, anim)}
        style={{
          position: 'absolute', left: '50%', top: '42%', width: size * 0.82, height: size * 0.82,
          marginLeft: -(size * 0.41), marginTop: -(size * 0.41), borderRadius: '9999px',
          background: `radial-gradient(circle, ${colors.glow} 0%, transparent 70%)`,
          pointerEvents: 'none',
        }}
      />

      {/* Ground shadow — shrinks as the bot rises, which is what sells the hover. */}
      <motion.span
        aria-hidden
        animate={reduced ? {} : { scaleX: [1, 0.86, 1], opacity: [0.4, 0.26, 0.4] }}
        transition={{ duration: 3.4, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position: 'absolute', left: '50%', bottom: 2, width: size * 0.5, height: size * 0.09,
          marginLeft: -(size * 0.25), borderRadius: '9999px', background: '#000', filter: 'blur(3px)',
          pointerEvents: 'none',
        }}
      />

      <motion.img
        src={poseUrl(poseFor(state, emotion))}
        alt=""
        variants={figureVariants}
        animate={pick(figureVariants, anim)}
        onLoad={() => setReady(true)}
        draggable={false}
        style={{
          position: 'absolute', left: '50%', bottom: size * 0.04, height: height * 0.92, width: 'auto',
          translateX: '-50%', scaleX: flip ? -1 : 1, transformOrigin: '50% 100%',
          filter: `drop-shadow(0 6px 10px rgba(0,0,0,0.45)) ${state === 'sleep' ? 'saturate(0.6) brightness(0.8)' : ''}`,
          opacity: ready ? 1 : 0, transition: 'opacity 160ms linear',
          pointerEvents: 'none', userSelect: 'none',
        }}
      />

      {/* Pointing beam: rotated to the target, scaled to the measured distance. */}
      {state === 'point' && beamLength > 0 && (
        <svg
          viewBox="0 0 120 140"
          width={size}
          height={height}
          style={{ position: 'absolute', inset: 0, overflow: 'visible', pointerEvents: 'none' }}
          aria-hidden
        >
          <motion.g
            id="dn-beam"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{ transformOrigin: `${beamOriginX}px 62px`, rotate: targetAngle }}
          >
            <motion.rect
              x={beamOriginX} y="59" height="6" rx="3" fill={colors.accent} opacity="0.45"
              initial={{ width: 0 }} animate={{ width: beamLength }}
              transition={{ duration: 0.4, ease: [0.22, 0.61, 0.36, 1] }}
            />
            <motion.circle
              cx={beamOriginX + beamLength} cy="62" r="5" fill={colors.accent}
              animate={{ scale: [1, 1.5, 1], opacity: [1, 0.4, 1] }}
              transition={{ duration: 1.1, repeat: Infinity }}
            />
          </motion.g>
        </svg>
      )}
    </div>
  );
};

export default DecarboNitoAvatar;

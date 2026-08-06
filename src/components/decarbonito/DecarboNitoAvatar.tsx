/**
 * DecarboNitoAvatar — pure, isolated animated avatar (mejora-general/files/13_decarbonito_character.md).
 *
 * Deliberately knows nothing about the game: only `state`/`emotion`/`tone`/`size`/`targetAngle`/
 * `beamLength` come in as props, and `onStateComplete` goes out when a one-shot animation ends.
 * The controller that decides *when* to show which state (chat activity, indicator thresholds,
 * `highlight_element` calls) is phase 7's job (14_decarbonito_overlay.md) — not this file's.
 *
 * SVG + Motion was chosen over Lottie/Rive/sprites specifically because phase 8
 * (15_decarbonito_agente_acciones.md) needs DecarboNito to point at arbitrary runtime-computed
 * screen coordinates — only inline SVG nodes with programmatic transforms make that possible.
 */
import React, { useEffect } from 'react';
import { motion, useAnimationControls, useReducedMotion } from 'motion/react';
import type { Variants } from 'motion/react';
import type { DnAvatarProps, DnEmotion, DnState, DnTone } from './types';

/* ── Design tokens (kept local so the avatar can be dropped into any surface) ── */
const TONE: Record<DnTone, { visor: string; eye: string; ring: string }> = {
  normal:   { visor: '#08100E', eye: '#5FB3C9', ring: '#5FB3C9' },
  caution:  { visor: '#150E06', eye: '#E0A458', ring: '#E0A458' },
  critical: { visor: '#170804', eye: '#E8613C', ring: '#E8613C' },
  success:  { visor: '#0C1607', eye: '#C8E6A0', ring: '#6FD08C' },
};

const CHASSIS = '#1F332C';
const CHASSIS_HI = '#2B4239';
const LEAF = '#6FD08C';
const METAL = '#E9E7DF';

/* ── Eyes: one small component per expression, swapped wholesale ────────────── */
const Eyes: React.FC<{ emotion: DnEmotion; color: string }> = ({ emotion, color }) => {
  const L = 50, R = 70, CY = 61; // eye centres inside the visor
  switch (emotion) {
    case 'happy':
      return (
        <g stroke={color} strokeWidth="3.5" strokeLinecap="round" fill="none">
          <path d={`M${L - 7} ${CY + 2} q7 -9 14 0`} />
          <path d={`M${R - 7} ${CY + 2} q7 -9 14 0`} />
        </g>
      );
    case 'focused':
      return (
        <g fill={color}>
          <rect x={L - 6} y={CY - 2.5} width="12" height="5" rx="2.5" />
          <rect x={R - 6} y={CY - 2.5} width="12" height="5" rx="2.5" />
        </g>
      );
    case 'alarmed':
      return (
        <g>
          <circle cx={L} cy={CY} r="7.5" fill={color} opacity="0.35" />
          <circle cx={R} cy={CY} r="7.5" fill={color} opacity="0.35" />
          <circle cx={L} cy={CY} r="3" fill={color} />
          <circle cx={R} cy={CY} r="3" fill={color} />
        </g>
      );
    case 'sleepy':
      return (
        <g stroke={color} strokeWidth="3" strokeLinecap="round" opacity="0.7">
          <path d={`M${L - 6} ${CY} h12`} />
          <path d={`M${R - 6} ${CY} h12`} />
        </g>
      );
    case 'curious':
      return (
        <g fill={color}>
          <circle cx={L} cy={CY} r="4" />
          <circle cx={R} cy={CY - 1} r="6" />
        </g>
      );
    default: // neutral
      return (
        <g fill={color}>
          <circle cx={L} cy={CY} r="5.5" />
          <circle cx={R} cy={CY} r="5.5" />
        </g>
      );
  }
};

/* ── Motion variants, one entry per state ──────────────────────────────────────────────────
 * Deliberate deviation from the source file: it types these `as const`. With real React/Motion
 * types installed (see docs/DESIGN_DECISIONS_LOG.md, phase 6 entry -- @types/react was missing
 * from the project entirely), `as const` turns keyframe arrays like `[0, -4, 0]` into readonly
 * tuples, which Motion's `Target`/`StyleKeyframesDefinition` (mutable `AnyResolvedKeyframe[]`)
 * rejects. Typing each object as `Variants` instead keeps them just as literal-safe for `pick`'s
 * `keyof T` usage (still checked structurally against DnState at every call site) while matching
 * what Motion's own types expect. ──────────────────────────────────────────────────────────── */
const bodyVariants: Variants = {
  idle:      { y: [0, -4, 0], rotate: 0, transition: { duration: 3.2, repeat: Infinity, ease: 'easeInOut' } },
  wave:      { y: [0, -6, -2], rotate: [0, -6, -4, -6, 0], transition: { duration: 1.4, ease: 'easeInOut' } },
  point:     { y: -2, transition: { duration: 0.35, ease: [0.22, 0.61, 0.36, 1] } },
  think:     { y: [0, -3, 0], rotate: [0, 1.5, -1.5, 0], transition: { duration: 2.6, repeat: Infinity, ease: 'easeInOut' } },
  explain:   { y: [0, -3, 0], rotate: [0, 2, -2, 0], transition: { duration: 2.0, repeat: Infinity, ease: 'easeInOut' } },
  celebrate: { y: [0, -22, 0, -14, 0], transition: { duration: 1.8, times: [0, 0.25, 0.5, 0.7, 1], ease: 'easeOut' } },
  alert:     { x: [0, -5, 5, -4, 4, 0], transition: { duration: 0.5, repeat: 1 } },
  worry:     { y: [8, 11, 8], rotate: -7, transition: { duration: 2.4, repeat: Infinity, ease: 'easeInOut' } },
  sleep:     { y: [14, 16, 14], rotate: 3, transition: { duration: 4, repeat: Infinity, ease: 'easeInOut' } },
  load:      { y: [0, -2, 0], scale: [1, 1.02, 1], transition: { duration: 1, repeat: Infinity, ease: 'easeInOut' } },
  travel:    { y: -6, transition: { duration: 0.3 } },
  peek:      { y: [26, -6, 0], transition: { duration: 0.8, ease: [0.34, 1.56, 0.64, 1] } },
  nod:       { rotate: [0, 9, 0, 9, 0], transition: { duration: 0.7 } },
  facepalm:  { y: [0, 6, 6, 0], rotate: [0, -4, -4, 0], transition: { duration: 1.2 } },
};

const armRightVariants: Variants = {
  idle:      { rotate: 0 },
  wave:      { rotate: [0, -70, -50, -70, 0], transition: { duration: 1.4, ease: 'easeInOut' } },
  point:     { rotate: -62, transition: { duration: 0.3, ease: [0.34, 1.56, 0.64, 1] } },
  explain:   { rotate: [0, -34, -6, -34, 0], transition: { duration: 2.0, repeat: Infinity } },
  celebrate: { rotate: [-20, -95, -20], transition: { duration: 1.8, repeat: 1 } },
  facepalm:  { rotate: [0, -108, -108, 0], transition: { duration: 1.2 } },
};

const armLeftVariants: Variants = {
  idle:      { rotate: 0 },
  explain:   { rotate: [0, 8, 34, 8, 0], transition: { duration: 2.0, repeat: Infinity } },
  celebrate: { rotate: [20, 95, 20], transition: { duration: 1.8, repeat: 1 } },
  worry:     { rotate: 26, transition: { duration: 0.6 } },
};

const ringVariants: Variants = {
  idle:      { rotate: 360, transition: { duration: 14, repeat: Infinity, ease: 'linear' } },
  load:      { rotate: 360, transition: { duration: 1.1, repeat: Infinity, ease: 'linear' } },
  celebrate: { rotate: 360, scale: [1, 1.25, 1], transition: { duration: 0.9, repeat: 2, ease: 'easeOut' } },
  sleep:     { rotate: 0, opacity: 0.25, transition: { duration: 0.8 } },
};

/** States that end by themselves and should hand control back to the caller. */
const ONE_SHOT: DnState[] = ['wave', 'celebrate', 'alert', 'peek', 'nod', 'facepalm'];
const ONE_SHOT_MS: Partial<Record<DnState, number>> = {
  wave: 1400, celebrate: 1800, alert: 1000, peek: 800, nod: 700, facepalm: 1200,
};

/**
 * Picks the closest defined variant, falling back to `idle`.
 * Returns a plain `string` (not `keyof T`, as the source pseudocode has it): now that every
 * variants object above is typed `Variants` (an indexed `{ [key: string]: Variant }`), `keyof T`
 * would be `string | number` -- Motion's `VariantLabels` prop only accepts `string | string[]`.
 */
const pick = (v: Variants, s: DnState): string => (s in v ? s : 'idle');

export const DecarboNitoAvatar: React.FC<DnAvatarProps> = ({
  state = 'idle',
  emotion = 'neutral',
  tone = 'normal',
  size = 96,
  targetAngle = 0,
  beamLength = 0,
  onStateComplete,
  className = '',
}) => {
  const reduced = useReducedMotion();
  const blink = useAnimationControls();
  const colors = TONE[tone];
  const detail = size >= 40 ? 'full' : 'minimal';

  /* Random blink loop — the single cheapest trick that makes it read as alive. */
  useEffect(() => {
    if (reduced || state === 'sleep') return;
    let cancelled = false;
    const loop = async () => {
      while (!cancelled) {
        await new Promise((r) => setTimeout(r, 3800 + Math.random() * 3400));
        if (cancelled) return;
        await blink.start({ scaleY: [1, 0.08, 1], transition: { duration: 0.16 } });
      }
    };
    void loop();
    return () => { cancelled = true; };
  }, [blink, reduced, state]);

  /* Notify the controller when a one-shot animation is over. */
  useEffect(() => {
    if (!onStateComplete || !ONE_SHOT.includes(state)) return;
    const ms = reduced ? 0 : (ONE_SHOT_MS[state] ?? 800);
    const id = setTimeout(() => onStateComplete(state), ms);
    return () => clearTimeout(id);
  }, [state, onStateComplete, reduced]);

  const anim = reduced ? 'idle' : state;
  const bodyTilt = state === 'point' || state === 'travel'
    ? Math.max(-14, Math.min(14, targetAngle / 8))
    : 0;

  return (
    <svg
      width={size}
      height={size * (140 / 120)}
      viewBox="0 0 120 140"
      className={className}
      role="img"
      aria-label="DecarboNito"
      style={{ overflow: 'visible', willChange: 'transform' }}
    >
      {/* Ground shadow — shrinks as the bot rises, which is what sells the hover */}
      <motion.ellipse
        id="dn-shadow" cx="60" cy="132" rx="26" ry="5" fill="#000" opacity="0.35"
        animate={reduced ? {} : { rx: [26, 22, 26], opacity: [0.35, 0.24, 0.35] }}
        transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Pointing beam: rotated to the target, scaled to the measured distance */}
      {state === 'point' && beamLength > 0 && (
        <motion.g
          id="dn-beam"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          style={{ transformOrigin: '96px 74px', rotate: targetAngle }}
        >
          <motion.rect
            x="96" y="71" height="6" rx="3" fill={colors.eye} opacity="0.45"
            initial={{ width: 0 }} animate={{ width: beamLength }}
            transition={{ duration: 0.4, ease: [0.22, 0.61, 0.36, 1] }}
          />
          <motion.circle
            cx={96 + beamLength} cy="74" r="5" fill={colors.eye}
            animate={{ scale: [1, 1.5, 1], opacity: [1, 0.4, 1] }}
            transition={{ duration: 1.1, repeat: Infinity }}
          />
        </motion.g>
      )}

      {/* Lift ring */}
      <motion.g
        id="dn-ring"
        variants={ringVariants} animate={pick(ringVariants, anim)}
        style={{ transformOrigin: '60px 112px' }}
      >
        <ellipse cx="60" cy="112" rx="30" ry="8" fill="none" stroke={colors.ring} strokeWidth="2.5" opacity="0.75" />
        <ellipse cx="60" cy="112" rx="18" ry="4.5" fill="none" stroke={colors.ring} strokeWidth="1.5" opacity="0.4" />
      </motion.g>

      {/* Body group: everything that floats together */}
      <motion.g
        id="dn-body"
        variants={bodyVariants} animate={pick(bodyVariants, anim)}
        style={{ transformOrigin: '60px 70px', rotate: bodyTilt }}
      >
        {/* Thrust cone */}
        <motion.path
          id="dn-thrust" d="M44 100 L60 116 L76 100 Z" fill={colors.ring} opacity="0.18"
          animate={reduced ? {} : { opacity: [0.18, 0.3, 0.18] }}
          transition={{ duration: 1.6, repeat: Infinity }}
        />

        {detail === 'full' && (
          <>
            {/* Antenna with leaf sprout */}
            <motion.g
              id="dn-antenna" style={{ transformOrigin: '60px 30px' }}
              animate={reduced ? {} : (state === 'think'
                ? { rotate: [-9, 9, -9] }
                : state === 'facepalm' ? { rotate: 22 } : { rotate: [-3, 3, -3] })}
              transition={{ duration: state === 'think' ? 1.2 : 3.6, repeat: Infinity, ease: 'easeInOut' }}
            >
              <path d="M60 30 L60 14" stroke={CHASSIS_HI} strokeWidth="3" strokeLinecap="round" />
              <path d="M60 14 q-9 -3 -8 -11 q9 1 8 11 Z" fill={LEAF} />
              <path d="M60 16 q9 -3 8 -11 q-9 1 -8 11 Z" fill={LEAF} opacity="0.7" />
            </motion.g>

            {/* Arms */}
            <motion.g id="dn-arm-l" variants={armLeftVariants} animate={pick(armLeftVariants, anim)}
                      style={{ transformOrigin: '26px 62px' }}>
              <rect x="10" y="58" width="14" height="30" rx="7" fill={CHASSIS_HI} />
              <circle cx="17" cy="86" r="5" fill={METAL} opacity="0.8" />
            </motion.g>
            <motion.g id="dn-arm-r" variants={armRightVariants} animate={pick(armRightVariants, anim)}
                      style={{ transformOrigin: '94px 62px' }}>
              <rect x="96" y="58" width="14" height="30" rx="7" fill={CHASSIS_HI} />
              <circle cx="103" cy="86" r="5" fill={METAL} opacity="0.8" />
            </motion.g>
          </>
        )}

        {/* Chassis */}
        <rect x="22" y="30" width="76" height="72" rx="26" fill={CHASSIS} stroke={CHASSIS_HI} strokeWidth="2" />
        <rect x="28" y="34" width="64" height="10" rx="5" fill="#FFF" opacity="0.05" />

        {/* Visor */}
        <motion.rect
          id="dn-visor" x="31" y="44" width="58" height="34" rx="17"
          animate={{ fill: colors.visor }} transition={{ duration: 0.3 }}
        />

        {/* Eyes (blink applies scaleY around the visor centre) */}
        <motion.g id="dn-eyes" animate={blink} style={{ transformOrigin: '60px 61px' }}>
          <Eyes emotion={state === 'sleep' ? 'sleepy' : emotion} color={colors.eye} />
        </motion.g>

        {/* Scan sweep while thinking */}
        {state === 'think' && !reduced && (
          <motion.rect
            x="33" y="46" width="12" height="30" rx="6" fill={colors.eye} opacity="0.18"
            animate={{ x: [33, 75, 33] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}

        {/* Chest badge */}
        {detail === 'full' && (
          <motion.path
            id="dn-badge" d="M60 84 q-7 0 -7 6 q0 6 7 6 q7 0 7 -6 q0 -6 -7 -6 Z"
            fill={colors.eye} opacity="0.55"
            animate={state === 'load' && !reduced ? { opacity: [0.25, 0.9, 0.25] } : {}}
            transition={{ duration: 1, repeat: Infinity }}
          />
        )}
      </motion.g>

      {/* Sleep marker */}
      {state === 'sleep' && !reduced && (
        <motion.text
          x="96" y="34" fontSize="16" fill={colors.eye} fontFamily="IBM Plex Mono, monospace"
          animate={{ y: [34, 18], opacity: [0, 0.9, 0] }}
          transition={{ duration: 4, repeat: Infinity }}
        >z</motion.text>
      )}

      {/* Celebration sparks */}
      {state === 'celebrate' && !reduced && [0, 72, 144, 216, 288].map((deg) => (
        <motion.circle
          key={deg} cx="60" cy="66" r="3" fill="#C8E6A0"
          animate={{
            cx: 60 + Math.cos((deg * Math.PI) / 180) * 52,
            cy: 66 + Math.sin((deg * Math.PI) / 180) * 52,
            opacity: [1, 0], scale: [1, 0.3],
          }}
          transition={{ duration: 1.1, delay: 0.15, ease: 'easeOut' }}
        />
      ))}
    </svg>
  );
};

export default DecarboNitoAvatar;

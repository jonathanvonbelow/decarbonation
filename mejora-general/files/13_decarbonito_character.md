# 13 — DecarboNito: personaje animado

> Requiere `09` y `11`. Produce un componente puro y aislado: `DecarboNitoAvatar` no conoce el
> estado del juego, solo recibe `state` y `emotion`. La lógica de cuándo animar está en `14`.

---

## 1. Brief del personaje

**Qué es.** Un dron de relevamiento de campo reconvertido en asesor. No es una mascota, no es un
asistente corporativo: es el aparato que sobrevuela parcelas midiendo carbono, y que además opina.
Esa procedencia justifica que flote, que tenga un anillo de sustentación, que "escanee" cuando
piensa y que apunte a las cosas con un haz de luz en lugar de con un dedo.

**Por qué importa el detalle.** El asesor pasa de ser un panel de texto a ser el segundo personaje
en pantalla. Si se ve como un chatbot genérico —círculo azul con dos puntos— refuerza exactamente la
percepción de "formulario animado" que el archivo `10` identifica como problema. El personaje es una
de las dos apuestas visuales del producto (la otra es la Cinta de Carbono).

**Rasgos formales:**

| Rasgo | Decisión | Razón |
|---|---|---|
| Silueta | Cápsula ancha con visor horizontal, sin patas | Legible a 32 px (favicon) y a 160 px (tutorial) |
| Ojos | Dos, dentro de un visor oscuro | Rango expresivo mucho mayor que un ojo único |
| Antena | Con brote foliar en la punta | Único elemento orgánico: firma el tema AFOLU sin ser literal |
| Brazos | Dos segmentos cortos, flotantes, sin articulación visible | Animables con transformaciones simples; sin rig complejo |
| Anillo | Elipse de sustentación bajo el chasis | Da la altura que justifica que flote sobre la interfaz |
| Paleta | Chasis `basalt-700`, visor `basalt-950`, ojos `hydro`, brote `chlorophyll`, acentos `bone` | Vive dentro del sistema de diseño, no fuera |
| Color de estado | El visor y el anillo cambian de tinte: `hydro` normal · `ochre` alerta · `ember` crítico · `bloom` celebración | Comunica urgencia sin texto |

**Escalas de uso:** 32 px (favicon, avatar de mensaje) · 48 px (notificación flotante) · 96 px
(estado de reposo sobre la interfaz) · 160 px (tutorial, pantallas de nivel).
El brote y los brazos se ocultan por debajo de 40 px (`detail="minimal"`).

---

## 2. Decisión técnica

| Técnica | Peso | Control programático | Costo de producción | Veredicto |
|---|---|---|---|---|
| **SVG en línea + Motion** | ~6 kB | Total: cada parte es un nodo animable y consultable | Medio | ✅ **Elegida** |
| Lottie (`lottie-web`) | ~250 kB + JSON por animación | Bajo: hay que exportar de After Effects cada variante | Alto (requiere AE) | ❌ |
| Rive | ~180 kB runtime | Alto, con máquina de estados propia | Alto (editor + licencia) | ❌ |
| Sprite sheet PNG | Ligero | Nulo: no se puede apuntar a coordenadas dinámicas | Medio | ❌ |
| GIF / video | Pesado | Nulo | Bajo | ❌ |

El factor decisivo es el archivo `15`: DecarboNito debe **apuntar a coordenadas arbitrarias de la
pantalla** (un switch de política, un slider) calculadas en runtime. Con Lottie o sprites eso es
imposible sin trucos. Con SVG + Motion, el brazo y el haz se orientan con una rotación calculada.

---

## 3. Anatomía del SVG

`viewBox="0 0 120 140"`. Cada parte lleva `id` estable para poder animarla y testearla.

| `id` | Elemento | Transformaciones habituales |
|---|---|---|
| `dn-shadow` | Elipse en el piso | `scaleX`, `opacity` (sigue la altura) |
| `dn-ring` | Anillo de sustentación | `rotate`, `scaleX`, `stroke` (color de estado) |
| `dn-thrust` | Cono de sustentación | `opacity`, `scaleY` |
| `dn-body` | Chasis | `translateY` (flotación), `rotate` (inclinación) |
| `dn-visor` | Visor | `fill` (color de estado) |
| `dn-eyes` | Grupo de ojos | Se reemplaza según `emotion` |
| `dn-antenna` | Antena + brote | `rotate` con origen en la base |
| `dn-arm-l` / `dn-arm-r` | Brazos | `rotate` con origen en el hombro |
| `dn-beam` | Haz de señalización | `opacity`, `rotate`, `scaleX` (longitud hasta el objetivo) |
| `dn-badge` | Insignia de pecho | `opacity` (parpadea en carga) |

```
        ╭─ brote (chlorophyll)
        │
        ╽  antena
     ╭───────────╮
   ╭─┤  ▄▄▄▄▄▄▄  ├─╮      brazos a los lados
   │ │  ◕     ◕  │ │      visor + ojos
   ╰─┤  ▀▀▀▀▀▀▀  ├─╯
     │     ◈     │        insignia
     ╰───────────╯
        ╲     ╱           cono de sustentación
      ─────────────       anillo
       ·  sombra  ·
```

---

## 4. Catálogo de estados de animación

14 estados (el requerimiento era ≥10). Todos se componen sobre la flotación de base, que nunca se
detiene salvo en `sleep`.

| # | Estado | Disparador típico | Duración | Bucle | Descripción del movimiento |
|---|---|---|---|---|---|
| 1 | `idle` | Por defecto | 3,2 s | ∞ | Flotación senoidal ±4 px, anillo girando lento, parpadeo cada 4–7 s aleatorio |
| 2 | `wave` | Saludo inicial, cambio de nivel | 1,4 s | no | Brazo derecho sube y oscila 3 veces; cuerpo se inclina 6° hacia el jugador |
| 3 | `point` | Señalar un control (tutorial, `highlight_element`) | 0,6 s + sostenido | sostiene | El cuerpo rota hacia el objetivo, brazo se extiende, haz aparece con largo calculado |
| 4 | `think` | Esperando respuesta del modelo | ∞ | ∞ | Ojos barren de lado a lado, antena oscila, tres puntos orbitan sobre la cabeza |
| 5 | `explain` | Entregando una explicación larga | 2,0 s | ∞ mientras dura | Ambos brazos gesticulan alternadamente; leve balanceo |
| 6 | `celebrate` | Nivel superado, ruta completada | 1,8 s | no | Doble salto vertical, giro de 360° del anillo, destellos, ojos en arco feliz |
| 7 | `alert` | Indicador cruza umbral de precaución | 1,0 s | 2× | Sacudida horizontal rápida, visor a `ochre`, antena rígida |
| 8 | `worry` | Trayectoria de colapso detectada | 2,4 s | ∞ | Desciende 8 px, se inclina, brazos caídos, visor `ember` con pulso lento |
| 9 | `sleep` | 90 s sin interacción | 4,0 s | ∞ | Se posa (sombra se contrae), visor casi apagado, burbuja "z" cada ciclo |
| 10 | `load` | Procesando acción / simulación en curso | 1,0 s | ∞ | Anillo acelera, insignia parpadea, cuerpo pulsa 2% |
| 11 | `travel` | Desplazándose a otra zona de la pantalla | var. | no | Se inclina 12° hacia la dirección de avance, estela corta, aterriza con rebote |
| 12 | `peek` | Entrada desde el borde tras estar oculto | 0,8 s | no | Asoma medio cuerpo desde el borde, mira, entra del todo |
| 13 | `nod` | Confirmar una acción del jugador | 0,7 s | no | Dos asentimientos con el cuerpo, ojos felices |
| 14 | `facepalm` | Error de la API, acción imposible | 1,2 s | no | Brazo sube al visor, cuerpo cae 6 px, antena se dobla |

**Expresiones** (independientes del estado): `neutral`, `happy`, `focused`, `alarmed`, `sleepy`,
`curious`. Se combinan libremente: `state="point" emotion="focused"`.

---

## 5. Implementación

### 5.1 `src/components/decarbonito/types.ts`

```ts
export type DnState =
  | 'idle' | 'wave' | 'point' | 'think' | 'explain' | 'celebrate' | 'alert'
  | 'worry' | 'sleep' | 'load' | 'travel' | 'peek' | 'nod' | 'facepalm';

export type DnEmotion = 'neutral' | 'happy' | 'focused' | 'alarmed' | 'sleepy' | 'curious';

export type DnTone = 'normal' | 'caution' | 'critical' | 'success';

export interface DnAvatarProps {
  state?: DnState;
  emotion?: DnEmotion;
  tone?: DnTone;
  /** Rendered pixel size (square). Below 40 the antenna and arms are dropped. */
  size?: number;
  /** Degrees, 0 = right. Used by `point` and `travel` to orient body, arm and beam. */
  targetAngle?: number;
  /** Beam length in local SVG units (see 14: computed from the anchor distance). */
  beamLength?: number;
  /** Fires when a non-looping state finishes — lets the controller return to idle. */
  onStateComplete?: (state: DnState) => void;
  className?: string;
}
```

### 5.2 `src/components/decarbonito/DecarboNitoAvatar.tsx`

```tsx
import React, { useEffect, useMemo, useRef } from 'react';
import { motion, useAnimationControls, useReducedMotion } from 'motion/react';
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

/* ── Motion variants, one entry per state ──────────────────────────────────── */
const bodyVariants = {
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
} as const;

const armRightVariants = {
  idle:      { rotate: 0 },
  wave:      { rotate: [0, -70, -50, -70, 0], transition: { duration: 1.4, ease: 'easeInOut' } },
  point:     { rotate: -62, transition: { duration: 0.3, ease: [0.34, 1.56, 0.64, 1] } },
  explain:   { rotate: [0, -34, -6, -34, 0], transition: { duration: 2.0, repeat: Infinity } },
  celebrate: { rotate: [-20, -95, -20], transition: { duration: 1.8, repeat: 1 } },
  facepalm:  { rotate: [0, -108, -108, 0], transition: { duration: 1.2 } },
} as const;

const armLeftVariants = {
  idle:      { rotate: 0 },
  explain:   { rotate: [0, 8, 34, 8, 0], transition: { duration: 2.0, repeat: Infinity } },
  celebrate: { rotate: [20, 95, 20], transition: { duration: 1.8, repeat: 1 } },
  worry:     { rotate: 26, transition: { duration: 0.6 } },
} as const;

const ringVariants = {
  idle:      { rotate: 360, transition: { duration: 14, repeat: Infinity, ease: 'linear' } },
  load:      { rotate: 360, transition: { duration: 1.1, repeat: Infinity, ease: 'linear' } },
  celebrate: { rotate: 360, scale: [1, 1.25, 1], transition: { duration: 0.9, repeat: 2, ease: 'easeOut' } },
  sleep:     { rotate: 0, opacity: 0.25, transition: { duration: 0.8 } },
} as const;

/** States that end by themselves and should hand control back to the caller. */
const ONE_SHOT: DnState[] = ['wave', 'celebrate', 'alert', 'peek', 'nod', 'facepalm'];
const ONE_SHOT_MS: Partial<Record<DnState, number>> = {
  wave: 1400, celebrate: 1800, alert: 1000, peek: 800, nod: 700, facepalm: 1200,
};

/** Picks the closest defined variant, falling back to `idle`. */
const pick = <T extends object>(v: T, s: DnState): keyof T =>
  (s in v ? s : 'idle') as keyof T;

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
        await new Promise(r => setTimeout(r, 3800 + Math.random() * 3400));
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
      {state === 'celebrate' && !reduced && [0, 72, 144, 216, 288].map(deg => (
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
```

### 5.3 Banco de pruebas visual

Crear una ruta oculta `/#dev/decarbonito` (o un componente montado con `?dev=dn`) que renderice una
grilla de **14 estados × 6 expresiones × 4 tonos**, con controles para `size`, `targetAngle` y
`beamLength`. Sin esto, revisar animaciones implica jugar hasta que se disparen, lo que hace la
iteración carísima.

```tsx
// src/components/decarbonito/DecarboNitoLab.tsx  (dev-only)
const STATES: DnState[] = ['idle','wave','point','think','explain','celebrate','alert',
                           'worry','sleep','load','travel','peek','nod','facepalm'];

export const DecarboNitoLab = () => {
  const [emotion, setEmotion] = useState<DnEmotion>('neutral');
  const [tone, setTone] = useState<DnTone>('normal');
  return (
    <div className="p-8 grid grid-cols-4 gap-6">
      {/* controls omitted for brevity */}
      {STATES.map(s => (
        <figure key={s} className="panel p-4 flex flex-col items-center gap-2">
          <DecarboNitoAvatar state={s} emotion={emotion} tone={tone} size={96}
                             targetAngle={-30} beamLength={70} />
          <figcaption className="font-mono text-[13px] text-ash">{s}</figcaption>
        </figure>
      ))}
    </div>
  );
};
```

---

## 6. Rendimiento

- **Solo `transform` y `opacity`.** Ninguna variante anima `width`, `top` o `left`, salvo el haz
  (que es corto y poco frecuente).
- **Pausar fuera de pantalla:** el layer del archivo `14` debe cortar las animaciones con
  `document.visibilityState === 'hidden'`. Un bucle infinito corriendo en una pestaña de fondo
  durante un taller de dos horas calienta la máquina sin ningún beneficio.
- **Un solo avatar montado a la vez** en tamaño grande. Los avatares de 32 px dentro de los mensajes
  del chat deben usar `state="idle"` con `detail="minimal"` y sin bucle de parpadeo (pasar
  `emotion` estático y `size < 40`).
- Presupuesto: el avatar completo no debe superar **1,5 ms de trabajo de main thread por frame**.
  Verificar en DevTools → Performance con la secuencia de celebración corriendo.

---

## 7. Accesibilidad

- El SVG lleva `role="img"` y `aria-label="DecarboNito"`. **La animación no comunica información
  crítica**: todo lo que el estado del avatar expresa (alerta, error, éxito) debe existir también en
  el texto de la burbuja, que se anuncia por `aria-live` (archivo `14`).
- Con `prefers-reduced-motion`, todos los estados colapsan a la pose de `idle` sin bucles: el
  personaje sigue presente y expresivo por su expresión y su tono de color, pero no se mueve.
- Ningún parpadeo supera 3 destellos por segundo (riesgo fotosensible). Verificado: el máximo es el
  parpadeo de la insignia en `load`, a 1 Hz.

---

## 8. Derivados del personaje

Producir desde el mismo SVG, sin rediseñar:

| Recurso | Cómo |
|---|---|
| `favicon.svg` | `state="idle"`, `detail="minimal"`, sin sombra, fondo transparente |
| Avatar de mensaje (32 px) | Recorte solo del chasis + visor |
| Imagen Open Graph (archivo `20`) | Pose `wave` sobre la Cinta de Carbono, exportada a PNG 1200×630 |
| Pantalla de carga | `state="load"` centrado, con la frase de carga bajo el personaje |
| Sello de ruta ganada (archivo `17`) | `state="celebrate"` con `tone` según la ruta |

Exportar los PNG con:
`npx playwright screenshot --viewport-size=1200,630 "http://localhost:5173/#dev/decarbonito?pose=wave" og.png`

---

## Verificación

- [ ] `/#dev/decarbonito` muestra los 14 estados animando sin errores de consola.
- [ ] Con `prefers-reduced-motion` activo, ningún estado se mueve, pero todos siguen distinguiéndose
      por expresión y color.
- [ ] A 32 px la silueta sigue siendo reconocible (probarlo como favicon real).
- [ ] `state="point"` con `targetAngle` de −90 a 90 orienta correctamente cuerpo, brazo y haz.
- [ ] Performance: 60 fps sostenidos con el avatar en `celebrate` mientras corre la simulación.
- [ ] `onStateComplete` dispara exactamente una vez por cada estado de una sola pasada.

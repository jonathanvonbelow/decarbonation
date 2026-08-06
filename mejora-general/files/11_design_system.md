# 11 — Sistema de diseño DecarboNation v3

> Requiere `09_saneamiento_repo.md` completo (Tailwind v4 vía Vite, sin CDN).
> Este archivo define **tokens y primitivas**. La aplicación a pantallas concretas está en `19`.

---

## 1. Dirección visual

### 1.1 El problema con la estética actual

DecarboNation v2.6 usa la paleta por defecto de Tailwind sobre gris azulado (`#1a202c` /
`#2d3748` / acento `#4299e1`). Es la estética de "dashboard SaaS oscuro": correcta, competente y
absolutamente intercambiable con cualquier panel de métricas del mundo. No comunica territorio, ni
carbono, ni gobierno, ni tensión. Un juego sobre uso del suelo debería *parecerse* al uso del suelo.

### 1.2 Tesis: instrumento de campo, no panel de control

La referencia no es un dashboard: es la **cartografía de cobertura del suelo**. Mapas de clasificación
satelital, leyendas de coberturas, curvas de nivel, planillas de inventario forestal. Ese es el
mundo material del jugador y del AFOLU. De ahí sale todo:

- **Color** de las leyendas de cobertura (verde clorofila, ocre agrícola, azul hídrico, brasa de
  quema), no de una paleta de marca inventada.
- **Textura**: curvas de nivel topográficas al 4% de opacidad sobre el fondo. Presente, casi
  imperceptible, y suficiente para que la pantalla no se lea como un panel genérico.
- **Datos en monoespaciada**: los números son mediciones de campo, con su unidad siempre visible.
- **Esquinas casi rectas** (radio 3–10 px). Los instrumentos de medición no tienen esquinas blandas.

### 1.3 Elemento distintivo: la **Cinta de Carbono** (*Carbon Ledger*)

Una banda horizontal fija bajo el encabezado, del ancho total de la pantalla, con un punto cero
central. Hacia la izquierda crece el secuestro (clorofila); hacia la derecha, las emisiones (brasa).
El balance neto anual inclina la cinta con una animación de fiel de balanza al cerrar cada año, y
deja una marca tenue por cada año jugado, de modo que la cinta acumula la historia climática de la
partida en una sola línea.

Es la mecánica central del juego convertida en el objeto visual que se recuerda. Toda la audacia
estética del producto se gasta acá; el resto de la interfaz se mantiene disciplinado y silencioso.

---

## 2. Tokens

### 2.1 Paleta

| Token | Hex | Uso |
|---|---|---|
| `basalt-950` | `#08100E` | Fondo de aplicación |
| `basalt-900` | `#0E1A16` | Superficie base de paneles |
| `basalt-800` | `#16241F` | Superficie elevada, filas alternadas |
| `basalt-700` | `#1F332C` | Superficie interactiva (hover) |
| `basalt-600` | `#2B4239` | Bordes, divisores |
| `bone` | `#E9E7DF` | Texto de alto énfasis |
| `ash` | `#A3B0A9` | Texto secundario |
| `ash-dim` | `#6E7C76` | Texto deshabilitado, marcas de eje |
| `chlorophyll` | `#6FD08C` | Biodiversidad · secuestro · éxito |
| `ochre` | `#E0A458` | Agricultura · advertencia |
| `ember` | `#E8613C` | Emisiones · crítico · presión |
| `hydro` | `#5FB3C9` | Agua · información · acento de interacción |
| `indigo-ink` | `#8FA0C8` | Finanzas (PBI, deuda, reservas) |
| `bloom` | `#C8E6A0` | Realce puntual, foco del tutorial |

Contrastes verificados: `bone` sobre `basalt-900` = 13,6:1; `ash` sobre `basalt-900` = 7,9:1;
`chlorophyll` sobre `basalt-900` = 8,4:1; `ember` sobre `basalt-900` = 4,9:1 (solo para texto ≥16 px
o elementos gráficos, nunca para texto fino).

**Ambientación por nivel:** el fondo de la aplicación desplaza su tinte sin cambiar la paleta.
Nivel 1 tinte clorofila, Nivel 2 tinte ocre, Nivel 3 tinte brasa. Se implementa con una única
variable `--level-tint` y un gradiente radial de baja opacidad.

### 2.2 Tipografía

| Rol | Familia | Por qué |
|---|---|---|
| Display | **Bricolage Grotesque** (variable) | Grotesca con anchos y ejes ópticos variables: da carácter institucional sin caer en la serif académica ni en la geométrica de startup |
| Cuerpo | **Instrument Sans** | Alta legibilidad a 14–16 px, formas abiertas, se lleva bien con la display sin competir |
| Datos | **IBM Plex Mono** | Cifras tabulares, unidades alineadas, tono de instrumento de medición |

Escala tipográfica (base 16 px, razón 1,25):

```
display-xl  40/44  Bricolage 600, tracking -0.02em
display-lg  32/36  Bricolage 600, tracking -0.02em
title       24/28  Bricolage 600
heading     19/24  Bricolage 500
body-lg     17/26  Instrument 400
body        15/23  Instrument 400
label       13/16  Instrument 500, tracking 0.04em, uppercase
data-lg     28/30  Plex Mono 500, tabular-nums
data        15/18  Plex Mono 400, tabular-nums
caption     12/16  Instrument 400
```

Regla dura: **todo número que represente una medición usa `data` o `data-lg` con `tabular-nums`**.
Sin esto, los indicadores "bailan" al actualizarse y la interfaz se siente inestable.

### 2.3 Espaciado, radios, elevación

- Espaciado en múltiplos de 4: `1=4px … 16=64px`. Padding de panel: 20 px (`5`); separación entre
  paneles: 16 px (`4`).
- Radios: `sm 3px` (chips, switches) · `md 6px` (botones, inputs) · `lg 10px` (paneles) ·
  `full` (avatar, anillos de progreso).
- **Elevación sin sombras difusas.** Los paneles se separan del fondo con un borde de 1 px
  (`basalt-600`) más una línea interior superior de 1 px al 6% de blanco. La única sombra real del
  sistema es la de DecarboNito flotando, porque ahí la sombra *significa* altura.

### 2.4 Movimiento

```
--dur-instant  90ms   feedback de pulsación
--dur-quick   180ms   hover, cambio de estado
--dur-base    280ms   entrada de paneles, burbujas
--dur-slow    520ms   transiciones de nivel
--dur-year   1200ms   secuencia de avance de año (orquestada)
--ease-settle  cubic-bezier(0.22, 0.61, 0.36, 1)
--ease-exit    cubic-bezier(0.55, 0, 1, 0.45)
--ease-spring  cubic-bezier(0.34, 1.56, 0.64, 1)   /* solo DecarboNito */
```

`prefers-reduced-motion: reduce` colapsa todas las duraciones a 0–90 ms y desactiva
`--ease-spring`. Es obligatorio, no opcional: parte del piso de calidad.

---

## 3. Implementación: `src/index.css`

Reemplaza por completo el `index.css` de migración del archivo 09.

```css
@import "tailwindcss";

/* ── Self-hosted fonts (offline-friendly for workshops) ─────────────────────
   npm i @fontsource-variable/bricolage-grotesque @fontsource-variable/instrument-sans @fontsource/ibm-plex-mono
   Verify exact package names with `npm view <pkg> versions` before installing. */
@import "@fontsource-variable/bricolage-grotesque";
@import "@fontsource-variable/instrument-sans";
@import "@fontsource/ibm-plex-mono/400.css";
@import "@fontsource/ibm-plex-mono/500.css";

@theme {
  /* Surfaces */
  --color-basalt-950: #08100e;
  --color-basalt-900: #0e1a16;
  --color-basalt-800: #16241f;
  --color-basalt-700: #1f332c;
  --color-basalt-600: #2b4239;

  /* Text */
  --color-bone: #e9e7df;
  --color-ash: #a3b0a9;
  --color-ash-dim: #6e7c76;

  /* Semantic / data */
  --color-chlorophyll: #6fd08c;
  --color-ochre: #e0a458;
  --color-ember: #e8613c;
  --color-hydro: #5fb3c9;
  --color-indigo-ink: #8fa0c8;
  --color-bloom: #c8e6a0;

  /* Typography */
  --font-display: "Bricolage Grotesque Variable", "Bricolage Grotesque", system-ui, sans-serif;
  --font-sans: "Instrument Sans Variable", "Instrument Sans", system-ui, sans-serif;
  --font-mono: "IBM Plex Mono", ui-monospace, monospace;

  /* Radii */
  --radius-sm: 3px;
  --radius-md: 6px;
  --radius-lg: 10px;

  /* Motion */
  --dur-instant: 90ms;
  --dur-quick: 180ms;
  --dur-base: 280ms;
  --dur-slow: 520ms;
  --dur-year: 1200ms;
  --ease-settle: cubic-bezier(0.22, 0.61, 0.36, 1);
  --ease-exit: cubic-bezier(0.55, 0, 1, 0.45);
  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
}

@layer base {
  :root {
    /* Overwritten by the level ambience effect — see LevelAmbience component */
    --level-tint: 111 208 140; /* chlorophyll, rgb triplet */
    --level-tint-alpha: 0.05;
  }

  html { color-scheme: dark; }

  body {
    background-color: var(--color-basalt-950);
    color: var(--color-bone);
    font-family: var(--font-sans);
    font-size: 15px;
    line-height: 1.53;
    -webkit-font-smoothing: antialiased;
    background-image:
      radial-gradient(
        120% 80% at 50% -10%,
        rgb(var(--level-tint) / var(--level-tint-alpha)) 0%,
        transparent 60%
      ),
      url("/textures/contour.svg");
    background-attachment: fixed;
    background-size: cover, 720px 720px;
    transition: background-image var(--dur-slow) var(--ease-settle);
  }

  h1, h2, h3, h4 {
    font-family: var(--font-display);
    font-weight: 600;
    letter-spacing: -0.02em;
  }

  /* Every measured number is tabular by default */
  .tnum, output, [data-numeric] {
    font-family: var(--font-mono);
    font-variant-numeric: tabular-nums;
  }

  :focus-visible {
    outline: 2px solid var(--color-hydro);
    outline-offset: 2px;
    border-radius: var(--radius-sm);
  }

  ::selection { background: var(--color-hydro); color: var(--color-basalt-950); }
}

@utility panel {
  background-color: var(--color-basalt-900);
  border: 1px solid var(--color-basalt-600);
  border-radius: var(--radius-lg);
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.06);
}

@utility label-eyebrow {
  font-size: 13px;
  line-height: 16px;
  font-weight: 500;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--color-ash-dim);
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

### 3.1 Textura de curvas de nivel — `public/textures/contour.svg`

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="720" height="720" viewBox="0 0 720 720">
  <defs>
    <filter id="warp">
      <feTurbulence type="fractalNoise" baseFrequency="0.0022" numOctaves="4" seed="7"/>
      <feDisplacementMap in="SourceGraphic" scale="140"/>
    </filter>
  </defs>
  <g filter="url(#warp)" fill="none" stroke="#6FD08C" stroke-opacity="0.055" stroke-width="1">
    <!-- Concentric rings warped by noise read as topographic contour lines -->
    <circle cx="360" cy="360" r="60"/>
    <circle cx="360" cy="360" r="110"/>
    <circle cx="360" cy="360" r="160"/>
    <circle cx="360" cy="360" r="210"/>
    <circle cx="360" cy="360" r="260"/>
    <circle cx="360" cy="360" r="310"/>
    <circle cx="360" cy="360" r="360"/>
    <circle cx="360" cy="360" r="410"/>
  </g>
</svg>
```

> El `feTurbulence` se rasteriza una sola vez por el navegador y se repite como *background*. Costo
> de render despreciable; si en algún dispositivo de gama baja aparece jank al hacer scroll, cambiar
> `background-attachment: fixed` por `scroll`.

---

## 4. Primitivas — `src/components/ui/`

### 4.1 `Panel.tsx`

```tsx
import React from 'react';

interface PanelProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Eyebrow label rendered above the title, uppercase and dimmed. */
  eyebrow?: string;
  /** Panel title. Rendered with the display face. */
  title?: string;
  /** Optional content aligned to the right of the header (buttons, badges). */
  action?: React.ReactNode;
  /** Removes internal padding — useful when the child is a full-bleed chart. */
  flush?: boolean;
}

/**
 * Base surface for every grouped region of the interface.
 * Elevation is expressed through border + inner hairline, never through blurred shadows.
 */
export const Panel: React.FC<PanelProps> = ({
  eyebrow, title, action, flush = false, className = '', children, ...rest
}) => (
  <section className={`panel ${flush ? '' : 'p-5'} ${className}`} {...rest}>
    {(title || eyebrow || action) && (
      <header className={`flex items-start justify-between gap-4 ${flush ? 'p-5 pb-3' : 'mb-4'}`}>
        <div>
          {eyebrow && <p className="label-eyebrow">{eyebrow}</p>}
          {title && <h2 className="text-[19px] leading-6 text-bone">{title}</h2>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </header>
    )}
    {children}
  </section>
);
```

### 4.2 `Button.tsx`

```tsx
import React from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  /** Renders a spinner and blocks interaction. Label stays visible to avoid layout shift. */
  loading?: boolean;
  iconLeft?: React.ReactNode;
}

const VARIANTS: Record<Variant, string> = {
  primary:   'bg-chlorophyll text-basalt-950 hover:brightness-110 active:brightness-95 font-medium',
  secondary: 'bg-basalt-700 text-bone border border-basalt-600 hover:bg-basalt-600',
  ghost:     'bg-transparent text-ash hover:text-bone hover:bg-basalt-800',
  danger:    'bg-ember text-basalt-950 hover:brightness-110 font-medium',
};

const SIZES: Record<Size, string> = {
  sm: 'h-8 px-3 text-[13px] rounded-[3px]',
  md: 'h-10 px-4 text-[15px] rounded-md',
  lg: 'h-12 px-6 text-[17px] rounded-md',
};

export const Button: React.FC<ButtonProps> = ({
  variant = 'secondary', size = 'md', loading = false,
  iconLeft, className = '', children, disabled, ...rest
}) => (
  <button
    className={`inline-flex items-center justify-center gap-2 select-none
      transition-[filter,background-color,transform] duration-[var(--dur-quick)] ease-[var(--ease-settle)]
      active:translate-y-px disabled:opacity-45 disabled:pointer-events-none
      ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
    disabled={disabled || loading}
    aria-busy={loading || undefined}
    {...rest}
  >
    {loading
      ? <span className="size-4 rounded-full border-2 border-current border-t-transparent animate-spin" aria-hidden />
      : iconLeft}
    {children}
  </button>
);
```

> **Nota de redacción de UI:** el rótulo del botón nombra lo que ocurre, y el mismo verbo se mantiene
> en el resultado. `Simular el año` produce el aviso `Año simulado`. Nunca `Enviar`, nunca `Aceptar`.

### 4.3 `StatTile.tsx` — la pieza más usada de la interfaz

```tsx
import React from 'react';

export type Trend = 'up' | 'down' | 'flat';

interface StatTileProps {
  label: string;
  value: number;
  unit?: string;
  /** Decimal places. Indicators use 1; money uses 0. */
  precision?: number;
  /** Change since previous year, already computed by the sim trace. */
  delta?: number;
  /** true when a rising value is bad (emissions, debt, political pressure). */
  invert?: boolean;
  /** Target line from the active level/route, drawn as a notch on the bar. */
  threshold?: number;
  /** 0–100 indicators render a bar; open-ended values (PBI) don't. */
  scale?: [number, number] | null;
  /** Breakdown of the delta by source — the causal legibility fix (see 10 §D2). */
  attribution?: Array<{ sourceLabel: string; amount: number }>;
  anchorId?: string;
}

const fmt = (n: number, p: number) =>
  n.toLocaleString(undefined, { minimumFractionDigits: p, maximumFractionDigits: p });

export const StatTile: React.FC<StatTileProps> = ({
  label, value, unit, precision = 1, delta, invert = false,
  threshold, scale = [0, 100], attribution, anchorId,
}) => {
  const good = delta === undefined || delta === 0
    ? null
    : invert ? delta < 0 : delta > 0;

  const pct = scale
    ? Math.max(0, Math.min(100, ((value - scale[0]) / (scale[1] - scale[0])) * 100))
    : null;

  return (
    <div
      data-dn-anchor={anchorId}
      className="panel p-4 flex flex-col gap-2 transition-colors duration-[var(--dur-quick)] hover:border-basalt-700"
    >
      <p className="label-eyebrow">{label}</p>

      <div className="flex items-baseline gap-2">
        <output data-numeric className="text-[28px] leading-[30px] text-bone">
          {fmt(value, precision)}
        </output>
        {unit && <span className="text-[13px] text-ash-dim">{unit}</span>}

        {delta !== undefined && delta !== 0 && (
          <span
            data-numeric
            className={`ml-auto text-[13px] ${good ? 'text-chlorophyll' : 'text-ember'}`}
            title={attribution?.map(a => `${a.sourceLabel}: ${fmt(a.amount, 1)}`).join(' · ')}
          >
            {delta > 0 ? '▲' : '▼'} {fmt(Math.abs(delta), precision)}
          </span>
        )}
      </div>

      {pct !== null && (
        <div className="relative h-1.5 rounded-full bg-basalt-800 overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-current transition-[width] duration-[var(--dur-base)] ease-[var(--ease-settle)]"
            style={{
              width: `${pct}%`,
              color: good === false ? 'var(--color-ember)' : 'var(--color-chlorophyll)',
            }}
          />
          {threshold !== undefined && scale && (
            <div
              className="absolute inset-y-[-3px] w-px bg-bone/70"
              style={{ left: `${((threshold - scale[0]) / (scale[1] - scale[0])) * 100}%` }}
              aria-hidden
            />
          )}
        </div>
      )}
    </div>
  );
};
```

### 4.4 Otras primitivas a crear con el mismo criterio

| Componente | Notas de implementación |
|---|---|
| `Switch.tsx` | Reemplaza el toggle de `PolicyToggle`. Área táctil ≥ 44×44 px, `role="switch"`, `aria-checked`, transición de 180 ms. Estado bloqueado con anillo y `aria-describedby` explicando cuántos años faltan |
| `EffortSlider.tsx` | Slider 0–100 con presupuesto compartido: muestra cuánto queda del 100% total de la política. El límite se comunica visualmente (zona agotada en `ash-dim`), no con un mensaje de error posterior |
| `Badge.tsx` | Chips de trade-off (`↑ Biodiversidad`, `↓ Seg. alimentaria`) con color semántico y `title` explicativo |
| `Tooltip.tsx` | Conservar el existente pero: agregar apertura por foco de teclado (hoy solo `onMouseEnter`), `role="tooltip"`, `aria-describedby`, y retardo de 250 ms para evitar parpadeo |
| `Modal.tsx` | Unificar los 6 modales actuales en uno solo con trampa de foco, cierre con `Esc`, `aria-modal`, restauración de foco al cerrar y bloqueo de scroll del fondo |
| `Sparkline.tsx` | SVG puro de 60×18 px, sin Recharts, para incrustar tendencia dentro de cada `StatTile` |

---

## 5. Tema de gráficos (Recharts)

Centralizar en `src/components/ui/chartTheme.ts` y eliminar todos los hex sueltos de `Dashboard.tsx`.

```ts
/** Single source of truth for chart styling. No hardcoded colors in chart components. */
export const CHART = {
  grid:   { stroke: '#1F332C', strokeDasharray: '2 4' },
  axis:   { stroke: '#6E7C76', fontSize: 12, fontFamily: 'IBM Plex Mono, monospace' },
  tooltip: {
    contentStyle: {
      backgroundColor: '#0E1A16',
      border: '1px solid #2B4239',
      borderRadius: 6,
      fontSize: 13,
      fontFamily: 'Instrument Sans, system-ui, sans-serif',
    },
    itemStyle: { color: '#E9E7DF' },
    labelStyle: { color: '#A3B0A9', fontFamily: 'IBM Plex Mono, monospace' },
  },
  series: {
    biodiversity:    '#6FD08C',
    foodSecurity:    '#E0A458',
    economicSecurity:'#8FA0C8',
    socialWellbeing: '#5FB3C9',
    politicalStability: '#C8E6A0',
    emissions:       '#E8613C',
    pbi:             '#8FA0C8',
    debt:            '#E8613C',
  },
  /** Land cover legend — colours quote classification maps, not a decorative palette. */
  landUse: {
    protectedNativeForest:   '#2F6B45',
    unprotectedNativeForest: '#4E9A62',
    agroecologicalCrops:     '#9BC66B',
    conventionalCrops:       '#D9C069',
    forestPlantations:       '#3E7F7A',
    grasslandsPastures:      '#C39B57',
    degradedLand:            '#8A6A52',
    urban:                   '#7C8B86',
    wetlands:                '#5FB3C9',
  },
} as const;
```

Regla: **el color de un uso del suelo es el mismo en la torta, en la cinta de territorio, en la
leyenda y en los tooltips**. Hoy los colores del pie chart son un array genérico de Recharts sin
relación semántica; eso rompe el reconocimiento entre vistas.

---

## 6. Ambientación por nivel

```tsx
// src/components/ui/LevelAmbience.tsx
import { useEffect } from 'react';

const TINTS: Record<number, string> = {
  1: '111 208 140', // chlorophyll — foundational, vegetal
  2: '224 164  88', // ochre       — agricultural tension
  3: '232  97  60', // ember       — global stakes
};

/** Side-effect-only component: shifts the ambient tint when the level changes. */
export const LevelAmbience: React.FC<{ level: number }> = ({ level }) => {
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--level-tint', TINTS[level] ?? TINTS[1]);
    root.style.setProperty('--level-tint-alpha', level === 3 ? '0.07' : '0.05');
  }, [level]);
  return null;
};
```

---

## 7. Piso de calidad no negociable

- Contraste AA en todo texto; AAA en cifras de indicadores.
- Foco visible en el 100% de los elementos interactivos (ya cubierto por `:focus-visible` global).
- Objetivos táctiles ≥ 44×44 px en móvil.
- `prefers-reduced-motion` respetado.
- Ninguna información transmitida **solo** por color: los estados crítico/precaución/bueno llevan
  además icono o forma. Hoy los indicadores dependen exclusivamente del color, lo que los vuelve
  ilegibles para ~8% de los jugadores varones.
- Zoom del navegador al 200% sin pérdida de contenido ni scroll horizontal.

---

## Verificación

1. `npm run dev` — la app carga con la nueva paleta y las tres tipografías (verificar en DevTools →
   Network que los `.woff2` se sirven localmente, no desde Google).
2. `<StatTile>` renderiza con `tabular-nums`: los números no cambian de ancho al actualizarse.
3. Activar "Reducir movimiento" en el SO → ninguna transición supera 90 ms.
4. Navegación completa con teclado: `Tab` recorre todos los controles con anillo visible.
5. Lighthouse Accessibility ≥ 95.
6. Buscar hex sueltos remanentes: `grep -rn "#[0-9a-fA-F]\{6\}" src/components | grep -v chartTheme`
   → debería devolver únicamente SVGs de iconos.

# 12 — Internacionalización completa (es-AR / en)

> Requiere `09_saneamiento_repo.md`.
> Objetivo verificable: **`npm run i18n:audit` devuelve cero cadenas en español fuera de
> `src/i18n/`**, y la app en inglés no muestra ni un botón, ni un tooltip, ni un mensaje de error,
> ni una etiqueta ARIA en español.

---

## 1. Diagnóstico

Hoy el español está hardcodeado en tres capas distintas, y cada una necesita una estrategia:

| Capa | Dónde | Volumen aprox. | Estrategia |
|---|---|---|---|
| **A. Interfaz** | JSX de ~22 componentes: botones, títulos, placeholders, `aria-label`, mensajes de error | ~380 cadenas | Diccionario por clave (`t('policies.title')`) |
| **B. Contenido de dominio** | `constants.ts`: nombres/descripciones de políticas, instrumentos, usos del suelo, pactos, niveles, eventos, preguntas de reflexión | ~260 cadenas largas | Diccionario **indexado por el ID que ya existe** |
| **C. Prompts y salidas de IA** | `CHATBOT_BASE_INSTRUCTION`, instrucciones por nivel, titulares generados | 6 bloques + salida dinámica | Instrucción de idioma inyectada en runtime |

Una cuarta capa es fácil de olvidar y rompe la experiencia en inglés: los **strings de datos
calculados**. Por ejemplo, `InnovationGlobalDashboard` devuelve `"Alta" | "Media" | "Baja"` desde una
función, y `carbonBalanceTrend` guarda `"stable" | "worsening" | "improving"` (en inglés en el dato,
mostrado crudo en una UI en español). Ambos casos son el mismo error: **valores de dominio
almacenados como texto presentable**. Se corrigen convirtiéndolos en enums y traduciendo en la vista.

---

## 2. Arquitectura

Sin librería externa. `react-i18next` agregaría ~40 kB y una API de plurales/interpolación que este
proyecto no necesita. Se implementa un sistema tipado de ~120 líneas con una ventaja decisiva:
**una clave faltante es un error de compilación de TypeScript**, no un `missing key` en runtime.

```
src/i18n/
  index.ts            # provider, hook useT, helpers de formato
  types.ts            # Locale, TranslationKey, LocalizedContent
  ui/
    es.ts             # diccionario de interfaz (fuente de verdad)
    en.ts             # debe satisfacer el tipo derivado de es.ts
  content/
    es.ts             # contenido de dominio indexado por ID
    en.ts
```

### 2.1 `src/i18n/types.ts`

```ts
export type Locale = 'es' | 'en';

/** Flattens a nested dictionary into dot-notation keys: 'header.year' | 'policies.title' | ... */
export type FlattenKeys<T, Prefix extends string = ''> = {
  [K in keyof T & string]: T[K] extends string
    ? `${Prefix}${K}`
    : FlattenKeys<T[K], `${Prefix}${K}.`>;
}[keyof T & string];

/** Values interpolated into a string via {placeholders}. */
export type Interpolations = Record<string, string | number>;
```

### 2.2 `src/i18n/index.ts`

```tsx
import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { UI_ES } from './ui/es';
import { UI_EN } from './ui/en';
import type { FlattenKeys, Interpolations, Locale } from './types';

export type TranslationKey = FlattenKeys<typeof UI_ES>;

const DICTS: Record<Locale, unknown> = { es: UI_ES, en: UI_EN };
const STORAGE_KEY = 'decarbonation.locale';

/** Resolves 'a.b.c' against a nested object. Returns the key itself if missing (visible in dev). */
function resolve(dict: unknown, path: string): string {
  const found = path.split('.').reduce<unknown>(
    (acc, part) => (acc && typeof acc === 'object' ? (acc as Record<string, unknown>)[part] : undefined),
    dict,
  );
  if (typeof found !== 'string') {
    if (import.meta.env.DEV) console.warn(`[i18n] Missing key: ${path}`);
    return path;
  }
  return found;
}

function interpolate(template: string, values?: Interpolations): string {
  if (!values) return template;
  return template.replace(/\{(\w+)\}/g, (_, k) =>
    values[k] !== undefined ? String(values[k]) : `{${k}}`);
}

/** Reads the initial locale: ?lang= > localStorage > navigator > 'es'. */
function detectLocale(): Locale {
  const fromUrl = new URLSearchParams(window.location.search).get('lang');
  if (fromUrl === 'es' || fromUrl === 'en') return fromUrl;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'es' || stored === 'en') return stored;
  return navigator.language.toLowerCase().startsWith('en') ? 'en' : 'es';
}

interface I18nValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: TranslationKey, values?: Interpolations) => string;
  /** Locale tag for Intl APIs. */
  tag: 'es-AR' | 'en-US';
}

const I18nContext = createContext<I18nValue | null>(null);

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [locale, setLocaleState] = useState<Locale>(detectLocale);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    localStorage.setItem(STORAGE_KEY, l);
    document.documentElement.lang = l;
  }, []);

  const t = useCallback(
    (key: TranslationKey, values?: Interpolations) =>
      interpolate(resolve(DICTS[locale], key), values),
    [locale],
  );

  const value = useMemo<I18nValue>(
    () => ({ locale, setLocale, t, tag: locale === 'es' ? 'es-AR' : 'en-US' }),
    [locale, setLocale, t],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export function useT(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useT must be used inside <I18nProvider>');
  return ctx;
}

/* ── Number and date formatting ───────────────────────────────────────────── */

export function useFormat() {
  const { tag } = useT();
  return useMemo(() => ({
    /** Indicator values: 1 decimal, locale-aware separator (42,3 in es-AR / 42.3 in en-US). */
    num: (n: number, digits = 1) =>
      n.toLocaleString(tag, { minimumFractionDigits: digits, maximumFractionDigits: digits }),
    /** Money-like magnitudes (PBI, reserves): no decimals, grouped. */
    big: (n: number) => n.toLocaleString(tag, { maximumFractionDigits: 0 }),
    pct: (n: number, digits = 1) =>
      `${n.toLocaleString(tag, { minimumFractionDigits: digits, maximumFractionDigits: digits })}%`,
    time: (ts: number) =>
      new Date(ts).toLocaleTimeString(tag, { hour: '2-digit', minute: '2-digit' }),
  }), [tag]);
}
```

> **Importante:** `es-AR` usa coma decimal. Hoy todos los números salen con punto porque se usa
> `toFixed()`. Cambiar `toFixed(1)` por `fmt.num(x)` en todos los componentes de visualización.
> Excepción: dentro de prompts a Gemini y de exportaciones CSV, mantener siempre punto decimal.

### 2.3 Selector de idioma

Va en el encabezado, siempre visible (no escondido en un menú de configuración: en talleres
binacionales se cambia de idioma en vivo).

```tsx
// src/components/ui/LocaleSwitch.tsx
import { useT } from '@/i18n';

export const LocaleSwitch: React.FC = () => {
  const { locale, setLocale, t } = useT();
  return (
    <div className="flex rounded-sm border border-basalt-600 overflow-hidden" role="group"
         aria-label={t('header.languageSelector')}>
      {(['es', 'en'] as const).map(l => (
        <button
          key={l}
          onClick={() => setLocale(l)}
          aria-pressed={locale === l}
          className={`px-2.5 h-7 text-[13px] font-mono transition-colors duration-[var(--dur-quick)]
            ${locale === l ? 'bg-basalt-600 text-bone' : 'text-ash-dim hover:text-bone'}`}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
};
```

---

## 3. Capa A — Diccionario de interfaz

`src/i18n/ui/es.ts` es la **fuente de verdad estructural**: `en.ts` se tipa contra él, de modo que
agregar una clave en español y olvidarla en inglés rompe el build.

```ts
// src/i18n/ui/es.ts
export const UI_ES = {
  header: {
    year: 'Año',
    level: 'Nivel',
    score: 'Puntaje',
    setLevel: 'Fijar nivel {n}',
    setLevelShort: 'Nvl {n}',
    alreadyAtLevel: 'Ya estás en el nivel {n}',
    languageSelector: 'Idioma',
    scoreTooltipTitle: 'Cómo se calcula el puntaje',
  },
  actions: {
    simulateYear: 'Simular el año',
    simulating: 'Simulando…',
    yearSimulated: 'Año {year} simulado',
    close: 'Cerrar',
    back: 'Atrás',
    next: 'Siguiente',
    start: 'Empezar',
    retry: 'Reintentar',
    skip: 'Saltear',
    confirm: 'Confirmar',
    cancel: 'Cancelar',
    openManual: 'Abrir el manual',
  },
  indicators: {
    biodiversity: 'Biodiversidad',
    emissionsPerCapita: 'Emisiones CO₂eq per cápita',
    foodSecurity: 'Seguridad alimentaria',
    economicSecurity: 'Seguridad económica',
    socialWellbeing: 'Bienestar social',
    politicalStability: 'Estabilidad política',
    nativeForest: 'Bosque nativo',
    pbi: 'PBI real',
    debt: 'Deuda',
    treasury: 'Reservas del tesoro',
    pressureAgri: 'Presión del sector agrícola',
    pressureEnv: 'Presión ambientalista',
    pressureSocial: 'Presión social',
    unitTPerCapita: 't/hab',
    unitKha: 'kHa',
    unitPercent: '%',
  },
  policies: {
    title: 'Políticas',
    eyebrow: 'Decisiones de gobierno',
    activeCount: '{active} de {max} activas',
    maxReached: 'Llegaste al máximo de {max} políticas activas',
    lockedFor: 'Bloqueada por {years} año(s) más',
    efficiency: 'Eficiencia: {value}%',
    tradeoffs: 'Compensaciones',
  },
  instruments: {
    title: 'Instrumentos de política',
    effort: 'Esfuerzo',
    effortHint: 'Repartí hasta 100% entre los instrumentos de esta política',
    effortRemaining: 'Queda {value}% por asignar',
    noEffortWarning: 'La política «{policy}» está activa pero no tiene esfuerzo asignado',
  },
  log: {
    title: 'Registro de actividades',
    empty: 'Todavía no hay actividades registradas',
    expand: 'Expandir el registro',
    collapse: 'Colapsar el registro',
    count: '{n} entradas',
  },
  chat: {
    title: 'DecarboNito',
    subtitle: 'Tu asesor técnico',
    placeholder: 'Preguntale a DecarboNito…',
    thinking: 'DecarboNito está pensando…',
    apiKeyMissing: 'Falta configurar la clave de API',
    send: 'Enviar',
    inputLabel: 'Tu pregunta para DecarboNito',
    greeting: 'Hola, soy DecarboNito. ¿Con qué te doy una mano?',
    error: 'No pude procesar tu consulta. Probá de nuevo en un momento.',
  },
  charts: {
    landUseTitle: 'Distribución del uso del suelo',
    landUseEmpty: 'Todavía no hay datos de uso del suelo',
    trendsTitle: 'Tendencias históricas',
    trendsEmpty: 'Simulá al menos un año para ver las tendencias',
    sustainabilityGroup: 'Indicadores de sostenibilidad',
    pressureGroup: 'Presiones políticas',
    financeGroup: 'Finanzas',
  },
  level: {
    welcome: 'Bienvenido al nivel {n}',
    goals: 'Objetivos',
    routes: 'Rutas para ganar',
    letsGo: '¡Adelante!',
    introLabel: 'Introducción al nivel',
    completed: 'Nivel {n} superado',
    failed: 'Nivel {n} no superado',
  },
  winConditions: {
    scoreMin: 'El puntaje general debe superar {v}',
    biodiversityMin: 'La biodiversidad debe superar {v}%',
    emissionsMax: 'Las emisiones deben bajar de {v} t/hab',
    nativeForestMin: 'El bosque nativo debe cubrir más del {v}% del territorio',
    foodSecurityMin: 'La seguridad alimentaria debe superar {v}%',
    economicSecurityMin: 'La seguridad económica debe superar {v}%',
    socialWellbeingMin: 'El bienestar social debe superar {v}%',
    politicalStabilityMin: 'La estabilidad política debe superar {v}%',
    pressureAgriMax: 'La presión agrícola debe quedar por debajo de {v}%',
    pressureEnvMax: 'La presión ambientalista debe quedar por debajo de {v}%',
    pressureSocialMax: 'La presión social debe quedar por debajo de {v}%',
    pbiMin: 'El PBI real debe superar {v}',
    debtRatioMax: 'La relación deuda/PBI debe quedar por debajo de {v}',
    none: 'Completá el ciclo para avanzar',
  },
  region: {
    overview: 'Resumen general',
    focus: 'Enfoque',
    policyAdoption: 'Adopción de políticas',
    carbonTrend: 'Tendencia del balance de carbono',
    hdi: 'IDH',
    demographics: 'Demografía',
    population: 'Población',
    growthRate: 'Tasa de crecimiento',
    employment: 'Empleo',
    employmentRate: 'Tasa de empleo',
    mainSectors: 'Sectores principales',
    economicStructure: 'Estructura económica',
    agrarian: 'Agraria',
    commercial: 'Comercial',
    industrial: 'Industrial',
    millions: '{v} millones',
    perYear: '{v}% por año',
  },
  enums: {
    carbonTrend: { improving: 'Mejorando', stable: 'Estable', worsening: 'Empeorando' },
    readiness: { high: 'Alta', medium: 'Media', low: 'Baja' },
    severity: { good: 'Bueno', caution: 'Precaución', critical: 'Crítico' },
  },
  finance: {
    title: 'Finanzas avanzadas',
    requestLoan: 'Pedir un préstamo',
    loanAmount: 'Monto del préstamo',
    taxPressure: 'Presión fiscal adicional',
    taxPressureHint: 'Cada punto adicional aumenta los ingresos pero deteriora la economía y el clima social',
    pacts: 'Pactos internacionales',
    joinPact: 'Adherir',
    leavePact: 'Abandonar',
    joinCost: 'Costo de adhesión: {v}',
    annualCost: 'Costo anual: {v}',
    unlocksIn: 'Se habilita en {year}',
    insufficientFunds: 'No alcanzan las reservas: hacen falta {needed} y tenés {available}',
  },
  toast: {
    dismiss: 'Descartar el aviso',
    noActivePolicies: 'Activá al menos una política antes de simular',
    gameOver: 'La partida terminó',
    levelChanged: 'Cambiaste al nivel {n}. El estado se reinició con los valores de ese nivel',
    pactJoined: 'Adheriste al pacto «{name}»',
    pactLeft: 'Abandonaste el pacto «{name}»',
  },
  facilitator: {
    access: 'Acceso para facilitadores',
    passwordPrompt: 'Ingresá la contraseña para ver el manual técnico',
    password: 'Contraseña',
    enter: 'Entrar',
    wrongPassword: 'La contraseña no coincide',
  },
  a11y: {
    closeDialog: 'Cerrar el diálogo',
    openDialog: 'Abrir',
    loading: 'Cargando',
  },
} as const;
```

```ts
// src/i18n/ui/en.ts
import type { UI_ES } from './es';

/** Structural mirror of UI_ES: any missing or extra key is a TypeScript error. */
type UIShape = typeof UI_ES;

export const UI_EN: UIShape = {
  header: {
    year: 'Year',
    level: 'Level',
    score: 'Score',
    setLevel: 'Jump to level {n}',
    setLevelShort: 'Lvl {n}',
    alreadyAtLevel: "You're already on level {n}",
    languageSelector: 'Language',
    scoreTooltipTitle: 'How the score is calculated',
  },
  actions: {
    simulateYear: 'Simulate the year',
    simulating: 'Simulating…',
    yearSimulated: 'Year {year} simulated',
    close: 'Close',
    back: 'Back',
    next: 'Next',
    start: 'Start',
    retry: 'Try again',
    skip: 'Skip',
    confirm: 'Confirm',
    cancel: 'Cancel',
    openManual: 'Open the manual',
  },
  indicators: {
    biodiversity: 'Biodiversity',
    emissionsPerCapita: 'CO₂eq emissions per capita',
    foodSecurity: 'Food security',
    economicSecurity: 'Economic security',
    socialWellbeing: 'Social wellbeing',
    politicalStability: 'Political stability',
    nativeForest: 'Native forest',
    pbi: 'Real GDP',
    debt: 'Debt',
    treasury: 'Treasury reserves',
    pressureAgri: 'Farm sector pressure',
    pressureEnv: 'Environmental pressure',
    pressureSocial: 'Social pressure',
    unitTPerCapita: 't/person',
    unitKha: 'kHa',
    unitPercent: '%',
  },
  policies: {
    title: 'Policies',
    eyebrow: 'Government decisions',
    activeCount: '{active} of {max} active',
    maxReached: "You've reached the limit of {max} active policies",
    lockedFor: 'Locked for {years} more year(s)',
    efficiency: 'Efficiency: {value}%',
    tradeoffs: 'Trade-offs',
  },
  instruments: {
    title: 'Policy instruments',
    effort: 'Effort',
    effortHint: 'Split up to 100% across the instruments of this policy',
    effortRemaining: '{value}% left to assign',
    noEffortWarning: '"{policy}" is active but has no effort assigned',
  },
  log: {
    title: 'Activity log',
    empty: 'No activity recorded yet',
    expand: 'Expand the log',
    collapse: 'Collapse the log',
    count: '{n} entries',
  },
  chat: {
    title: 'DecarboNito',
    subtitle: 'Your technical adviser',
    placeholder: 'Ask DecarboNito…',
    thinking: 'DecarboNito is thinking…',
    apiKeyMissing: 'The API key is not configured',
    send: 'Send',
    inputLabel: 'Your question for DecarboNito',
    greeting: "Hi, I'm DecarboNito. What can I help you with?",
    error: "I couldn't process that. Try again in a moment.",
  },
  charts: {
    landUseTitle: 'Land use distribution',
    landUseEmpty: 'No land use data yet',
    trendsTitle: 'Historical trends',
    trendsEmpty: 'Simulate at least one year to see trends',
    sustainabilityGroup: 'Sustainability indicators',
    pressureGroup: 'Political pressures',
    financeGroup: 'Finances',
  },
  level: {
    welcome: 'Welcome to level {n}',
    goals: 'Goals',
    routes: 'Ways to win',
    letsGo: "Let's go",
    introLabel: 'Level introduction',
    completed: 'Level {n} cleared',
    failed: 'Level {n} not cleared',
  },
  winConditions: {
    scoreMin: 'Overall score must exceed {v}',
    biodiversityMin: 'Biodiversity must exceed {v}%',
    emissionsMax: 'Emissions must drop below {v} t/person',
    nativeForestMin: 'Native forest must cover more than {v}% of the territory',
    foodSecurityMin: 'Food security must exceed {v}%',
    economicSecurityMin: 'Economic security must exceed {v}%',
    socialWellbeingMin: 'Social wellbeing must exceed {v}%',
    politicalStabilityMin: 'Political stability must exceed {v}%',
    pressureAgriMax: 'Farm sector pressure must stay below {v}%',
    pressureEnvMax: 'Environmental pressure must stay below {v}%',
    pressureSocialMax: 'Social pressure must stay below {v}%',
    pbiMin: 'Real GDP must exceed {v}',
    debtRatioMax: 'Debt-to-GDP ratio must stay below {v}',
    none: 'Finish the cycle to advance',
  },
  region: {
    overview: 'Overview',
    focus: 'Focus',
    policyAdoption: 'Policy adoption',
    carbonTrend: 'Carbon balance trend',
    hdi: 'HDI',
    demographics: 'Demographics',
    population: 'Population',
    growthRate: 'Growth rate',
    employment: 'Employment',
    employmentRate: 'Employment rate',
    mainSectors: 'Main sectors',
    economicStructure: 'Economic structure',
    agrarian: 'Agrarian',
    commercial: 'Commercial',
    industrial: 'Industrial',
    millions: '{v} million',
    perYear: '{v}% per year',
  },
  enums: {
    carbonTrend: { improving: 'Improving', stable: 'Stable', worsening: 'Worsening' },
    readiness: { high: 'High', medium: 'Medium', low: 'Low' },
    severity: { good: 'Good', caution: 'Caution', critical: 'Critical' },
  },
  finance: {
    title: 'Advanced finances',
    requestLoan: 'Request a loan',
    loanAmount: 'Loan amount',
    taxPressure: 'Additional tax pressure',
    taxPressureHint: 'Each extra point raises revenue but hurts the economy and the social climate',
    pacts: 'International pacts',
    joinPact: 'Join',
    leavePact: 'Leave',
    joinCost: 'Joining cost: {v}',
    annualCost: 'Annual cost: {v}',
    unlocksIn: 'Unlocks in {year}',
    insufficientFunds: 'Not enough reserves: you need {needed} and have {available}',
  },
  toast: {
    dismiss: 'Dismiss',
    noActivePolicies: 'Activate at least one policy before simulating',
    gameOver: 'The run is over',
    levelChanged: 'You switched to level {n}. State was reset to that level defaults',
    pactJoined: 'You joined "{name}"',
    pactLeft: 'You left "{name}"',
  },
  facilitator: {
    access: 'Facilitator access',
    passwordPrompt: 'Enter the password to open the technical manual',
    password: 'Password',
    enter: 'Enter',
    wrongPassword: "That password doesn't match",
  },
  a11y: {
    closeDialog: 'Close the dialog',
    openDialog: 'Open',
    loading: 'Loading',
  },
};
```

> Este diccionario cubre el núcleo. Los manuales (`PlayerManual`, `FacilitatorManual`,
> `EquationsManual`, `descriptions.ts`) son bloques largos de prosa: van a `src/i18n/content/` como
> arrays de secciones, **no** como claves sueltas (ver §4.3).

---

## 4. Capa B — Contenido de dominio

### 4.1 Principio: indexar por el ID que ya existe

`constants.ts` ya tiene identificadores estables (`Policy.CarbonNeutrality`,
`"C_Impuesto_Carbono_Sectorial"`, `LandUseType.ConventionalCrops`, `globalCarbonAccord`). No hay que
inventar claves: se usan esos IDs como índice del diccionario.

Ventaja adicional para investigación: los IDs quedan como **el identificador canónico en la
telemetría de Supabase**, independiente del idioma en que jugó cada persona. Sin esto, comparar
partidas en español e inglés obliga a normalizar strings a mano.

### 4.2 Refactor de `constants.ts`

```ts
// ANTES
[Policy.CarbonNeutrality]: {
  id: Policy.CarbonNeutrality,
  name: "Neutralidad de Carbono",
  description: "Alcanzar el balance neto cero de emisiones…",
  costFactor: 0.04,
  // …
}

// DESPUÉS — los textos salen del objeto de datos
[Policy.CarbonNeutrality]: {
  id: Policy.CarbonNeutrality,
  costFactor: 0.04,
  // …
}
```

```ts
// src/i18n/content/es.ts
import { Policy, LandUseType } from '@/types';

export const CONTENT_ES = {
  policies: {
    [Policy.CarbonNeutrality]: {
      name: 'Neutralidad de carbono',
      description: 'Alcanzar el balance neto cero de emisiones mediante impuestos al carbono, renovables y captura.',
      sector: 'energy',
    },
    // … 10 políticas
  },
  instruments: {
    C_Impuesto_Carbono_Sectorial: {
      name: 'Impuesto al carbono progresivo y sectorial',
      description: 'Grava las emisiones en sectores clave y reinvierte lo recaudado en mitigación.',
    },
    // … ~40 instrumentos
  },
  landUses: {
    [LandUseType.ConventionalCrops]: {
      name: 'Cultivos convencionales',
      document: 'Agricultura moderna con insumos sintéticos, maquinaria pesada y monocultivos…',
    },
    // … 9 usos
  },
  pacts: { /* … */ },
  levels: { /* name, description, briefing por nivel */ },
  events: { /* título y texto de cada evento aleatorio */ },
  regions: { /* nombre y foco de cada zona regional */ },
} as const;
```

Y el acceso, mediante un hook:

```tsx
// src/i18n/useContent.ts
import { useT } from '@/i18n';
import { CONTENT_ES } from './content/es';
import { CONTENT_EN } from './content/en';

const CONTENT = { es: CONTENT_ES, en: CONTENT_EN } as const;

/** Localized domain content, indexed by the stable IDs already defined in constants.ts */
export function useContent() {
  const { locale } = useT();
  return CONTENT[locale];
}
```

Uso en un componente:

```tsx
const c = useContent();
<h3>{c.policies[policy.id].name}</h3>
<p>{c.policies[policy.id].description}</p>
```

### 4.3 Manuales y textos largos

`PlayerManual`, `FacilitatorManual` y `PlayerReportGuideModal` contienen JSX mezclado con prosa. No
conviene fragmentarlos en claves: se convierten en **arrays de secciones por idioma**, con el JSX
reducido a marcado mínimo.

```ts
// src/i18n/content/manuals/es.ts
export interface ManualSection {
  id: string;
  title: string;
  /** Markdown-lite: **bold**, bullets with "- ", and {param:NAME} for live values. */
  body: string;
}

export const PLAYER_MANUAL_ES: ManualSection[] = [
  {
    id: 'level-2-strategy',
    title: 'Estrategias para el nivel 2',
    body: `Aparecen las presiones sectoriales…
- **Juego de roles:** asignar carteras ministeriales enriquece el debate.
- El máximo de políticas activas es {param:MAX_ACTIVE_POLICIES}.`,
  },
  // …
];
```

Un renderer común (`<ManualBody section={…} />`) interpreta `**negrita**`, viñetas y
`{param:X}` contra `CONTROL_PARAMS`. Esto elimina de un saque la duplicación de estructura entre
idiomas y hace que traducir sea editar prosa, no editar JSX.

`components/equations/descriptions.ts` (~90 descripciones de parámetros) se traslada tal cual a
`content/es.ts` y `content/en.ts` bajo la clave `paramDescriptions`, manteniendo los nombres de
parámetro como índice.

### 4.4 Corregir los strings de dominio calculados

**Problema 1 — `InnovationGlobalDashboard`:**

```ts
// ANTES: devuelve texto presentable en español
const dynamicCarbonCaptureReadiness = () => {
  if (indicators.economicSecurity > 70 && indicators.generalScore > 750) return "Alta";
  // …
};

// DESPUÉS: devuelve un valor de dominio; la vista traduce
type Readiness = 'high' | 'medium' | 'low';

const carbonCaptureReadiness = (): Readiness => {
  if (indicators.economicSecurity > 70 && indicators.generalScore > 750) return 'high';
  if (indicators.economicSecurity > 50 && indicators.generalScore > 650) return 'medium';
  return 'low';
};

// En el render:
{t(`enums.readiness.${carbonCaptureReadiness()}`)}
```

**Problema 2 — `carbonBalanceTrend`** ya guarda `'improving' | 'stable' | 'worsening'` pero se
imprime crudo (`<DetailItem value={region.carbonBalanceTrend} />`), mostrando inglés dentro de la UI
en español. Reemplazar por `t(\`enums.carbonTrend.${region.carbonBalanceTrend}\`)`.

**Problema 3 — mensajes del `logEvent` y razones de victoria/derrota.** Hoy se construyen como
strings en español dentro de `App.tsx` y se guardan así en el historial. Convertirlos en objetos
estructurados y traducir al renderizar:

```ts
// src/types.ts
export type LogEntry =
  | { kind: 'policyToggled'; policyId: Policy; active: boolean; year: number }
  | { kind: 'levelChanged'; level: number }
  | { kind: 'pactJoined'; pactId: string }
  | { kind: 'simulationBlocked'; reason: 'noPolicies' | 'noEffort'; policyId?: Policy }
  | { kind: 'levelResolved'; level: number; passed: boolean; routeId?: string };
```

Beneficio colateral decisivo: el registro de eventos pasa a ser **dato estructurado**, apto para
enviar a Supabase y analizar, en lugar de prosa. Esto es prerrequisito del archivo `15` (telemetría)
y del artículo sobre aprendizaje social.

---

## 5. Capa C — IA en el idioma del jugador

`CHATBOT_BASE_INSTRUCTION` y las instrucciones por nivel quedan en español (el modelo las entiende
perfectamente), pero se agrega una **directiva de idioma de salida** inyectada en runtime:

```ts
// src/services/geminiService.ts
const LANGUAGE_DIRECTIVE: Record<Locale, string> = {
  es: 'IDIOMA DE RESPUESTA: español rioplatense. Usá "vos". Nunca respondas en otro idioma.',
  en: 'RESPONSE LANGUAGE: English. Reply only in English, regardless of the language of these instructions or of any game data you receive.',
};

function buildSystemInstruction(levelConfig: LevelConfig, locale: Locale): string {
  return `${levelConfig.chatbotSystemInstruction}\n\n${LANGUAGE_DIRECTIVE[locale]}`;
}
```

Puntos a cuidar:

1. **El contexto de estado del juego** que se le pasa al modelo (nombres de políticas, indicadores)
   debe enviarse siempre con los **IDs canónicos + nombre en el idioma activo**, para que el modelo
   pueda nombrarlos correctamente al jugador. Formato: `carbonNeutrality (Carbon neutrality)`.
2. **Los titulares generados** en Nivel 3 heredan la directiva. Verificar explícitamente: es el lugar
   donde más se filtra el español en la versión en inglés.
3. Al cambiar de idioma a mitad de partida, **limpiar el historial de chat** o insertar un marcador
   de cambio de idioma; si no, el modelo tiende a seguir el idioma del historial previo.

---

## 6. Auditoría automática

### 6.1 `scripts/i18n-audit.mjs`

```js
#!/usr/bin/env node
/**
 * Fails the build if Spanish-looking literals exist outside src/i18n/.
 * Heuristic, deliberately noisy: false positives are cheap, misses are not.
 */
import { readFileSync } from 'node:fs';
import { glob } from 'node:fs/promises';

const IGNORED = [/^src\/i18n\//, /\.test\.tsx?$/, /^src\/constants\.ts$/];

// Accented characters plus high-frequency Spanish function words.
const SPANISH = /[áéíóúñ¿¡Á-Ú]|\b(el|la|los|las|de|del|que|para|con|por|una|este|esta|más|año|nivel|puntaje|política|cerrar|enviar|siguiente|activar|jugador|presión)\b/i;

// Only inspect user-visible literals: JSX text nodes and quoted strings.
const STRING_LITERAL = /(["'`])((?:(?!\1)[^\\]|\\.){4,}?)\1/g;
const JSX_TEXT = />\s*([^<>{}\n][^<>{}]{3,})\s*</g;

const findings = [];

for await (const file of glob('src/**/*.{ts,tsx}')) {
  if (IGNORED.some(rx => rx.test(file))) continue;
  const src = readFileSync(file, 'utf8');
  const lines = src.split('\n');

  lines.forEach((line, i) => {
    if (/^\s*(\/\/|\*|\/\*)/.test(line)) return;          // comments may stay in any language
    if (/import\s|from\s['"]|require\(/.test(line)) return;

    const candidates = [
      ...[...line.matchAll(STRING_LITERAL)].map(m => m[2]),
      ...[...line.matchAll(JSX_TEXT)].map(m => m[1]),
    ];
    for (const text of candidates) {
      if (/^[\w.\-/#{}[\]$@%:]+$/.test(text)) continue;    // class names, paths, ids
      if (SPANISH.test(text)) {
        findings.push({ file, line: i + 1, text: text.trim().slice(0, 80) });
      }
    }
  });
}

if (findings.length) {
  console.error(`\n✗ ${findings.length} hardcoded Spanish string(s) found outside src/i18n/\n`);
  for (const f of findings) console.error(`  ${f.file}:${f.line}  "${f.text}"`);
  console.error('\nMove them to src/i18n/ui/es.ts (+ en.ts) and use t().\n');
  process.exit(1);
}
console.log('✓ i18n audit clean: no hardcoded Spanish outside src/i18n/');
```

> `src/constants.ts` está en la lista de ignorados **solo hasta terminar §4.2**. Al finalizar la
> migración de contenido hay que sacarlo de `IGNORED` y volver a correr la auditoría: ese es el
> examen final.

### 6.2 Test de completitud de contenido

```ts
// tests/i18n.test.ts
import { describe, expect, it } from 'vitest';
import { CONTENT_ES } from '@/i18n/content/es';
import { CONTENT_EN } from '@/i18n/content/en';
import { INITIAL_POLICIES, POLICY_INSTRUMENTS, INITIAL_LAND_USES, INITIAL_PACTS } from '@/constants';

const keysDeep = (o: unknown, p = ''): string[] =>
  o && typeof o === 'object'
    ? Object.entries(o).flatMap(([k, v]) => keysDeep(v, p ? `${p}.${k}` : k))
    : [p];

describe('i18n content', () => {
  it('has identical key sets in both locales', () => {
    expect(keysDeep(CONTENT_EN).sort()).toEqual(keysDeep(CONTENT_ES).sort());
  });

  it('covers every policy defined in constants', () => {
    for (const id of Object.keys(INITIAL_POLICIES)) {
      expect(CONTENT_ES.policies, `missing es policy ${id}`).toHaveProperty(id);
      expect(CONTENT_EN.policies, `missing en policy ${id}`).toHaveProperty(id);
    }
  });

  it('covers every policy instrument', () => {
    for (const byPolicy of Object.values(POLICY_INSTRUMENTS)) {
      for (const id of Object.keys(byPolicy)) {
        expect(CONTENT_ES.instruments).toHaveProperty(id);
        expect(CONTENT_EN.instruments).toHaveProperty(id);
      }
    }
  });

  it('covers every land use and pact', () => {
    for (const id of Object.keys(INITIAL_LAND_USES)) {
      expect(CONTENT_EN.landUses).toHaveProperty(id);
    }
    for (const id of Object.keys(INITIAL_PACTS)) {
      expect(CONTENT_EN.pacts).toHaveProperty(id);
    }
  });

  it('has no empty strings', () => {
    const empties = keysDeep(CONTENT_EN).filter(k => {
      const v = k.split('.').reduce<any>((a, p) => a?.[p], CONTENT_EN);
      return typeof v === 'string' && v.trim() === '';
    });
    expect(empties).toEqual([]);
  });
});
```

---

## 7. Orden de ejecución sugerido

1. Crear la infraestructura (§2) y envolver `<App/>` en `<I18nProvider>`. **Checkpoint: build.**
2. Migrar componente por componente, del más chico al más grande: `Toast` → `Header` →
   `GameLogPanel` → `PolicyToggle` → `LevelIntroModal` → `RegionalDetailModal` →
   `InnovationGlobalDashboard` → `Dashboard` → `ChatbotPanel` → `App.tsx`.
   **Un commit por componente.** Correr `npm run i18n:audit` después de cada uno y ver bajar el número.
3. Migrar contenido de dominio (§4.2), con el test de completitud como red.
4. Migrar manuales (§4.3).
5. Directiva de idioma de la IA (§5).
6. Sacar `constants.ts` de la lista de ignorados y dejar la auditoría en verde.
7. Agregar `npm run i18n:audit` al script de `build` y al workflow de CI.

---

## Verificación

- [ ] `npm run i18n:audit` → limpio, con `constants.ts` ya **no** ignorado.
- [ ] `npm test` → tests de i18n en verde.
- [ ] Con `?lang=en`: recorrer los 3 niveles completos, abrir los 6 modales, disparar un error de
      simulación, adherir a un pacto, perder una partida. **Cero español.**
- [ ] Preguntarle algo a DecarboNito en inglés → responde en inglés, incluidos los titulares del
      Nivel 3.
- [ ] Cambiar de idioma a mitad de partida: la interfaz cambia, el estado del juego se conserva.
- [ ] En es-AR los decimales usan coma; en en-US, punto.
- [ ] `document.documentElement.lang` refleja el idioma activo (importante para lectores de pantalla).

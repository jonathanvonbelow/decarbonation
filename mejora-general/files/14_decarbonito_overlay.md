# 14 — Capa flotante: DecarboNito sobre toda la interfaz

**Depende de:** `09_saneamiento_repo.md`, `11_design_system.md`, `12_i18n_completo.md`, `13_decarbonito_character.md`
**Habilita:** `15_decarbonito_agent_actions.md`, `18_tutoriales_v3.md`
**Toca:** `src/App.tsx`, `src/components/decarbonito/*`, `src/components/ChatbotPanel.tsx` (se reemplaza), `src/components/GameLogPanel.tsx`

---

## 1. Qué cambia conceptualmente

Hoy DecarboNito es **una columna**. Ocupa entre 30% y 40% del ancho útil de forma permanente,
esté hablando o no, y compite visualmente con el tablero que el jugador tiene que leer. El feedback
("el chat molesta", "no se ve bien el tablero", "el chat era ilegible") son síntomas del mismo
error de diseño: *un asesor no es un panel, es un personaje que aparece cuando hace falta*.

Después de este archivo:

| Antes | Después |
|---|---|
| Columna derecha fija `h-[60vh]` | Capa `fixed inset-0` con `pointer-events: none`, sobre todo el layout |
| El bot solo existe dentro del chat | El bot puede posarse en cualquier punto de la pantalla y señalar cualquier control |
| Todo mensaje es una burbuja de chat | Tres superficies: **globo** (efímero), **notificación** (persiste hasta descartar), **conversación** (panel bajo demanda) |
| El tablero usa 2/3 del ancho | El tablero usa el 100% del ancho |
| Chat siempre abierto | Chat se abre con clic en el personaje, tecla `C`, o cuando el propio bot lo pide |

**Regla de oro:** la capa nunca bloquea el juego. `pointer-events: none` en el contenedor,
`pointer-events: auto` solo en el avatar, el globo y el panel de conversación.

---

## 2. Arquitectura

```
<App>
  <I18nProvider>
    <DecarboNitoProvider>          ← estado, cola de mensajes, máquina de posición
       <Header/> <Dashboard/> ...  ← el juego, ancho completo, sin columna de chat
       <DecarboNitoLayer/>         ← portal a #dn-root: avatar + globo + notificaciones + panel
    </DecarboNitoProvider>
  </I18nProvider>
</App>
```

Cuatro piezas nuevas:

| Archivo | Responsabilidad |
|---|---|
| `decarbonito/anchors.ts` | Registro de anclas: mapea `anchorId → DOMRect` en vivo |
| `decarbonito/DecarboNitoProvider.tsx` | Estado, cola con prioridades, API imperativa |
| `decarbonito/DecarboNitoLayer.tsx` | Render: posición, viaje, globo, notificaciones |
| `decarbonito/ConversationPanel.tsx` | Panel de conversación flotante (reemplaza `ChatbotPanel`) |

---

## 3. Registro de anclas

Cualquier elemento de la interfaz al que DecarboNito deba poder viajar o señalar se marca con
`useAnchor`. El mismo registro lo consume el agente de acciones (archivo `15`) y el motor de
tutoriales (archivo `18`), así que **es la pieza más reutilizada de todo el paquete**.

### 3.1 `src/components/decarbonito/anchors.ts`

```ts
/**
 * Live registry of "anchorable" UI elements. DecarboNito, the action agent and the tutorial
 * engine all address the interface through these stable IDs instead of CSS selectors, so that
 * restyling never breaks pointing, highlighting or guided steps.
 */
import { useEffect, useRef } from 'react';

/** Stable IDs. Adding a new one here is the only way to make an element addressable. */
export const ANCHORS = {
  // Header
  score: 'score',
  year: 'year',
  levelBadge: 'level-badge',
  localeSwitch: 'locale-switch',
  helpButton: 'help-button',
  // Board
  indicatorBiodiversity: 'ind-biodiversity',
  indicatorEmissions: 'ind-emissions',
  indicatorFoodSecurity: 'ind-food-security',
  indicatorEconomicSecurity: 'ind-economic-security',
  indicatorSocialWellbeing: 'ind-social-wellbeing',
  indicatorPoliticalStability: 'ind-political-stability',
  landUseChart: 'land-use-chart',
  historyChart: 'history-chart',
  winRoutesPanel: 'win-routes-panel',        // ver archivo 17
  // Controls
  policyList: 'policy-list',
  policyRow: (policyId: string) => `policy-row:${policyId}`,
  instrumentPanel: 'instrument-panel',
  instrumentSlider: (instrumentId: string) => `instrument-slider:${instrumentId}`,
  simulateButton: 'simulate-button',
  pactList: 'pact-list',
  loanControl: 'loan-control',
  taxSlider: 'tax-slider',
  // DecarboNito
  avatar: 'dn-avatar',
} as const;

export type AnchorId = string;

type Entry = { el: HTMLElement; label?: string };
const registry = new Map<AnchorId, Entry>();
const listeners = new Set<() => void>();

function notify() { listeners.forEach(fn => fn()); }

export function registerAnchor(id: AnchorId, el: HTMLElement, label?: string): () => void {
  registry.set(id, { el, label });
  notify();
  return () => { registry.delete(id); notify(); };
}

/** Current viewport rect of an anchor, or null if it is unmounted or fully hidden. */
export function getAnchorRect(id: AnchorId): DOMRect | null {
  const entry = registry.get(id);
  if (!entry || !entry.el.isConnected) return null;
  const rect = entry.el.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) return null;
  return rect;
}

export function getAnchorElement(id: AnchorId): HTMLElement | null {
  return registry.get(id)?.el ?? null;
}

/** Human-readable list, injected into the agent prompt so the model knows what exists. */
export function listAnchors(): { id: AnchorId; label?: string }[] {
  return [...registry.entries()].map(([id, e]) => ({ id, label: e.label }));
}

export function subscribeAnchors(fn: () => void): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

/**
 * Attaches a stable anchor id to a DOM node.
 * @example const ref = useAnchor(ANCHORS.simulateButton, t('board.simulate'));
 */
export function useAnchor<T extends HTMLElement = HTMLElement>(id: AnchorId, label?: string) {
  const ref = useRef<T>(null);
  useEffect(() => {
    if (!ref.current) return;
    ref.current.dataset.dnAnchor = id;
    return registerAnchor(id, ref.current, label);
  }, [id, label]);
  return ref;
}
```

### 3.2 Instrumentación mínima requerida

Agregar `useAnchor` a estos componentes (una línea cada uno). Sin esto, el bot no puede señalar nada.

```tsx
// components/Header.tsx
const scoreRef = useAnchor<HTMLDivElement>(ANCHORS.score, t('header.score'));
<div ref={scoreRef} className="text-center cursor-help"> ... </div>

// components/PolicyPanel.tsx — dentro del map de políticas
const rowRef = useAnchor<HTMLLIElement>(ANCHORS.policyRow(policy.id), policyName);

// components/Dashboard.tsx — botón de simular
const simulateRef = useAnchor<HTMLButtonElement>(ANCHORS.simulateButton, t('board.simulate'));
```

> **Checkpoint 1.** `npm run build` verde y, en consola del navegador,
> `window.__dn?.listAnchors().length` ≥ 20 (exponer `listAnchors` en `window.__dn` solo en dev).

---

## 4. Provider: estado y cola

### 4.1 Modelo de estado

```ts
// src/components/decarbonito/DecarboNitoProvider.tsx
import type { DnState, DnEmotion, DnTone } from './types';
import type { AnchorId } from './anchors';

/** Where the avatar physically sits. */
export type DnPlacement =
  | { kind: 'dock'; corner: 'br' | 'bl' | 'tr' | 'tl' }  // resting corner, draggable
  | { kind: 'anchor'; anchorId: AnchorId; offset?: { dx: number; dy: number } }
  | { kind: 'free'; x: number; y: number };              // viewport px, used while dragging

export type DnSurface = 'bubble' | 'notification' | 'conversation';

export interface DnMessage {
  id: string;
  /** Already-translated text. Callers pass t(...) results, never raw keys. */
  text: string;
  surface: DnSurface;
  tone: DnTone;
  /** 0 = ambient tip, 1 = normal, 2 = event, 3 = critical/blocking. Higher preempts lower. */
  priority: 0 | 1 | 2 | 3;
  /** ms before auto-dismiss. null = stays until dismissed or replaced. */
  ttl: number | null;
  /** Optional: travel to this anchor and point at it while speaking. */
  pointAt?: AnchorId;
  /** Optional inline actions rendered as buttons inside the bubble. */
  actions?: { labelKey: string; onSelect: () => void }[];
  createdAt: number;
}

export interface DnApi {
  /** Ephemeral speech bubble. Returns the message id. */
  say(text: string, opts?: Partial<Omit<DnMessage, 'id' | 'text' | 'createdAt'>>): string;
  /** Persistent notification (level events, threshold crossings, agent results). */
  notify(text: string, opts?: Partial<Omit<DnMessage, 'id' | 'text' | 'createdAt'>>): string;
  /** Play a one-shot animation state. Returns to idle automatically. */
  play(state: DnState, emotion?: DnEmotion): void;
  /** Travel to an anchor (or corner) with the `travel` animation. Resolves on arrival. */
  moveTo(placement: DnPlacement): Promise<void>;
  /** Travel + point + highlight ring. Used by tutorials and the agent. */
  focusOn(anchorId: AnchorId, opts?: { text?: string; holdMs?: number }): Promise<void>;
  /** Clear the highlight and return to the resting dock. */
  release(): void;
  /** Conversation panel control. */
  openConversation(seed?: string): void;
  closeConversation(): void;
  dismiss(id: string): void;
  /** Reflects model latency: shows `think` while true. */
  setBusy(busy: boolean): void;
}
```

### 4.2 Reglas de la cola

Implementar exactamente estas reglas — evitan el efecto "bot cargoso", que es el modo de falla
más común de un asistente encarnado:

1. **Un solo globo a la vez.** Un mensaje de prioridad ≥ la del actual lo reemplaza; uno de
   prioridad menor se encola (máximo 3 en cola; el resto se descarta y se registra en el log).
2. **Silencio mínimo.** Tras cerrarse un globo, no aparece otro espontáneo (prioridad ≤ 1) durante
   **6 s**. Los disparados por acción del jugador no esperan.
3. **Presupuesto de proactividad.** Máximo **2 mensajes espontáneos por año simulado**. Se resetea
   en cada `simulateYear`. Si se agota, los tips se acumulan y se ofrecen juntos en el informe anual.
4. **Nunca dos veces lo mismo.** Hash del texto en un `Set` por partida; un tip repetido no se emite.
5. **Prioridad 3 es rara.** Solo: colapso inminente, error de API bloqueante, fin de nivel.
6. **`sleep` a los 90 s** sin interacción del jugador; despierta con `peek` ante cualquier evento.

### 4.3 Implementación del provider

```tsx
export const DecarboNitoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [placement, setPlacement] = useState<DnPlacement>(() => loadPlacement());
  const [state, setState] = useState<DnState>('idle');
  const [emotion, setEmotion] = useState<DnEmotion>('neutral');
  const [current, setCurrent] = useState<DnMessage | null>(null);
  const [notifications, setNotifications] = useState<DnMessage[]>([]);
  const [conversationOpen, setConversationOpen] = useState(false);
  const [highlight, setHighlight] = useState<AnchorId | null>(null);

  const queue = useRef<DnMessage[]>([]);
  const lastSpokeAt = useRef(0);
  const seen = useRef(new Set<string>());
  const proactiveBudget = useRef(2);
  const idleTimer = useRef<number | null>(null);

  // ... pump(): desencola respetando "silencio mínimo" y TTL con setTimeout
  // ... resetIdleTimer(): 90 s → setState('sleep')
  // ... useEffect: document.visibilityState === 'hidden' → congelar timers

  const focusOn = useCallback(async (anchorId: AnchorId, opts) => {
    const rect = getAnchorRect(anchorId);
    if (!rect) {                       // el ancla no está montada: degradar con elegancia
      setState('facepalm');
      say(t('dn.anchorNotVisible'), { tone: 'caution', priority: 1 });
      return;
    }
    setHighlight(anchorId);
    await moveTo({ kind: 'anchor', anchorId });
    setState('point');
    if (opts?.text) say(opts.text, { priority: 2, ttl: opts.holdMs ?? 6000, pointAt: anchorId });
  }, [say, moveTo]);

  // ...
};

export const useDecarboNito = (): DnApi & { state: DnState; placement: DnPlacement } => {
  const ctx = useContext(DecarboNitoContext);
  if (!ctx) throw new Error('useDecarboNito must be used inside <DecarboNitoProvider>');
  return ctx;
};
```

> Persistir `placement` (esquina elegida por el jugador) en `localStorage` bajo
> `decarbonation.dn.placement`. Persistir también `dn.muted` (ver §8).

---

## 5. La capa de render

### 5.1 Posicionamiento y viaje

```tsx
// src/components/decarbonito/DecarboNitoLayer.tsx
const AVATAR = 96;   // px
const MARGIN = 20;

/** Converts a placement into viewport coordinates of the avatar's top-left corner. */
function resolvePosition(p: DnPlacement, vw: number, vh: number): { x: number; y: number } {
  if (p.kind === 'free') return { x: p.x, y: p.y };
  if (p.kind === 'dock') {
    const right = p.corner.endsWith('r');
    const bottom = p.corner.startsWith('b');
    return {
      x: right ? vw - AVATAR - MARGIN : MARGIN,
      y: bottom ? vh - AVATAR - MARGIN : MARGIN + 72, // 72 = alto del header
    };
  }
  const rect = getAnchorRect(p.anchorId);
  if (!rect) return resolvePosition({ kind: 'dock', corner: 'br' }, vw, vh);
  // Se posa al costado del ancla, del lado con más espacio libre, sin taparla.
  const preferRight = rect.right + AVATAR + 24 < vw;
  return {
    x: (preferRight ? rect.right + 16 : rect.left - AVATAR - 16) + (p.offset?.dx ?? 0),
    y: clamp(rect.top + rect.height / 2 - AVATAR / 2, 80, vh - AVATAR - MARGIN) + (p.offset?.dy ?? 0),
  };
}
```

**Animación del viaje.** Resorte crítico amortiguado sobre `transform: translate3d()`, nunca sobre
`top/left`. Implementar con un `useSpring` propio de ~30 líneas (rAF + integración semi-implícita)
o, si ya se instaló `motion` en el archivo `13`, con `animate()` de esa librería. Duración objetivo:
420–700 ms según distancia (`d/1.8` ms, acotado). Durante el viaje: `state = 'travel'` y
`targetAngle = atan2(dy, dx)` para que se incline en la dirección correcta.

**Reposicionamiento reactivo:** suscribirse a `resize`, `scroll` (capture) y a `subscribeAnchors`.
Si el ancla se mueve más de 8 px, reubicar sin animación de viaje (solo interpolar 120 ms).

### 5.2 Globo de diálogo

```tsx
interface BubbleProps {
  message: DnMessage;
  avatarRect: { x: number; y: number };
  onDismiss: () => void;
}
```

Especificación:

- Ancho `min(340px, calc(100vw - 32px))`, `max-height: 40vh` con scroll interno.
- **Colocación automática**: preferencia `top-start` respecto del avatar; si no entra, `bottom-start`,
  luego `left`, luego `right`. Colisión contra el viewport con 12 px de margen. Usar
  `@floating-ui/react` (`useFloating` + `flip` + `shift` + `arrow`) — es la única dependencia nueva
  de este archivo (~9 kB gz) y evita 200 líneas de matemática de colisiones propensas a bugs.
- **Cola del globo** apuntando siempre al avatar (`arrow` middleware).
- Fondo `--color-basalt-800` con borde `--color-basalt-600`; el tono cambia el borde y el ícono:
  `caution → --color-ochre`, `critical → --color-ember`, `success → --color-chlorophyll`.
- **Entrada**: `scale(.92) translateY(6px) opacity 0 → 1` en `--dur-quick` con `--ease-settle`.
- **Texto**: se revela con un efecto de tipeo *solo* para mensajes de prioridad ≥ 2 y a
  **90 caracteres/segundo**, con posibilidad de completarlo al instante haciendo clic. Nunca para
  texto largo del chat (ahí es puro ruido).
- **Acciones inline**: hasta 2 botones (`Button` variante `secondary`, tamaño `sm`), p. ej.
  *"Mostrame"* / *"Ahora no"*.
- `role="status"` + `aria-live="polite"` (`assertive` solo en prioridad 3).

### 5.3 Anillo de resaltado

Cuando `highlight !== null`, dibujar sobre el ancla un rectángulo redondeado de 2 px en
`--color-chlorophyll`, con `box-shadow: 0 0 0 9999px rgba(8,14,12,.55)` para oscurecer el resto
**solo en modo tutorial** (en modo ayuda no se oscurece nada: el jugador tiene que poder seguir
mirando el tablero). Pulso de opacidad 1 → .45 → 1 cada 1,6 s. `pointer-events: none`.

### 5.4 Notificaciones emergentes

Pila en la esquina opuesta al avatar, máximo 3 visibles, apiladas con `translateY` y `scale(.97)`
decreciente. Cada una: ícono de tono, texto (2 líneas máx. + "ver más"), botón cerrar, y barra de
progreso de TTL. Al hacer clic, se abre la conversación con ese mensaje como contexto.

---

## 6. El panel de conversación

`ChatbotPanel.tsx` se **elimina** y se reemplaza por `ConversationPanel.tsx`.

| Aspecto | Especificación |
|---|---|
| Superficie | Flotante, anclado al avatar; `width: 400px`, `height: min(560px, 70vh)` |
| Apertura | Clic en el avatar · tecla `C` · `openConversation()` desde el agente · clic en notificación |
| Cierre | `Esc` · clic en la X · clic fuera (solo si no hay respuesta en curso) |
| Estados | `collapsed` (solo avatar) · `open` · `expanded` (720 px, para lecturas largas) |
| Arrastre | El avatar es arrastrable; el panel lo sigue. Al soltar cerca de un borde, hace *snap* a la esquina |
| Móvil (<768px) | Hoja inferior a pantalla completa con *drag handle*; el avatar queda como burbuja flotante de 56 px |
| Historial | Mismo `chatMessages` del estado actual; se conserva el modelo de datos existente |
| Composición | Textarea autoexpandible (1–4 líneas), `Enter` envía, `Shift+Enter` salto de línea |
| Sugerencias | 3 chips contextuales arriba del input (ya existen: mantener la lógica de `suggestedQuestions`) |
| Estado vacío | Saludo del bot + 3 chips + una línea sobre qué puede hacer (incluye "puedo operar los controles por vos") |

### 6.1 Reflow de `App.tsx`

```diff
- <main className="container mx-auto p-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
-   <div className="lg:col-span-2 space-y-4">
+ <main className="mx-auto w-full max-w-[1600px] px-4 pb-24 space-y-4">
      <Dashboard ... />
      <PolicyPanel ... />
      {level >= 2 && <InstrumentPanel ... />}
-   </div>
-   <div className="lg:col-span-1 flex flex-col gap-4">
-     <ChatbotPanel ... />
-     <GameLogPanel logs={logs} />
-   </div>
  </main>
+ <GameLogDrawer logs={logs} />        {/* cajón inferior colapsado, ver §6.2 */}
+ <DecarboNitoLayer />
```

Con el ancho liberado, el tablero pasa a una grilla de 12 columnas: indicadores en tiras de 3–4
columnas, gráficos de 6, panel de políticas de 8 + rutas de victoria de 4 (archivo `17`).
`pb-24` reserva el carril inferior donde descansan el avatar y el cajón de log.

### 6.2 `GameLogPanel` → `GameLogDrawer`

El log de actividad deja de ser un panel lateral y pasa a ser un cajón inferior: barra de 32 px
fija abajo a la izquierda con el último evento y un contador; al hacer clic, sube a 40vh.
Reusar la lógica de colapso ya implementada; solo cambia el contenedor y la posición.

> **Checkpoint 2.** Con el chat cerrado, el tablero ocupa el 100% del ancho. Con el chat abierto,
> nada del tablero queda oculto en pantallas ≥1280 px. En 375 px de ancho, el juego es usable y el
> avatar no tapa el botón de simular.

---

## 7. Integración con los eventos del juego

Reemplazar las llamadas actuales a `addMessageToChat(..., 'system', 'level_event')` por la API
del provider. Mapa de traducción:

| Evento del juego | Superficie | Prioridad | Animación | Tono |
|---|---|---|---|---|
| Arranque de partida | globo + `wave` | 1 | `wave` | normal |
| Inicio de nivel | notificación | 2 | `wave` → `explain` | normal |
| Indicador cruza umbral de precaución | globo, apuntando al indicador | 2 | `alert` + `point` | caution |
| Indicador en zona crítica | notificación persistente | 3 | `worry` | critical |
| Eficiencia de política < 40% | globo, apuntando a la fila de la política | 2 | `point` | caution |
| Evento aleatorio / noticia | notificación | 2 | `peek` | normal |
| Nivel superado | notificación + confeti | 3 | `celebrate` | success |
| Fin de partida | abre conversación con debriefing (archivo `18`) | 3 | `explain` | según resultado |
| Esperando a Gemini | — | — | `think` + `setBusy(true)` | — |
| Acción del agente ejecutada | globo corto | 1 | `nod` | success |
| Error de API | notificación | 3 | `facepalm` | critical |

```tsx
// Ejemplo, en el handler de fin de simulación:
if (crossed.caution.length > 0) {
  const ind = crossed.caution[0];
  dn.notify(t('dn.thresholdCaution', { indicator: t(`indicators.${ind}.label`) }), {
    priority: 2, tone: 'caution', pointAt: ANCHORS[indicatorAnchorOf(ind)],
  });
}
```

---

## 8. Control del jugador (no negociable)

Un personaje que no se puede callar es un personaje que se odia. Incluir siempre:

- **Menú contextual del avatar** (clic derecho o botón "···"): *Silenciar avisos* · *Solo avisos
  críticos* · *Cambiar de esquina* · *Ocultar DecarboNito*.
- **Modo oculto**: el avatar se reduce a un botón de 40 px en el header. Todo sigue funcionando; los
  mensajes se acumulan en el log con un badge.
- Persistir la preferencia y **respetarla entre sesiones**.
- `prefers-reduced-motion: reduce` → sin viaje (aparición directa con *fade*), sin tipeo, sin
  flotación; solo cambios de expresión.

---

## Verificación

1. `npm run build` y `npm test` en verde.
2. El archivo `components/ChatbotPanel.tsx` ya no existe y no hay imports colgados.
3. Con `?dnlab=1` (banco de pruebas del archivo `13`) se pueden disparar los 14 estados desde la capa real.
4. En consola: `window.__dn.focusOn('simulate-button')` → el bot viaja, señala y aparece el anillo.
5. Simular un año con un indicador en caída fuerte: aparece un globo apuntando al indicador correcto.
6. Disparar 6 mensajes espontáneos seguidos: solo se emiten 2 (presupuesto de proactividad).
7. Activar "Silenciar avisos": no aparece ningún globo espontáneo; los críticos siguen llegando al log.
8. Con `prefers-reduced-motion` activo, no hay animación de viaje ni tipeo.
9. Lighthouse Accessibility ≥ 95 con el chat abierto (foco atrapado en el panel, `Esc` cierra).

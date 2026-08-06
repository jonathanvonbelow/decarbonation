/**
 * DecarboNitoProvider — state, message queue and imperative API for the floating overlay
 * (mejora-general/files/14_decarbonito_overlay.md §4). DecarboNitoLayer.tsx renders what this
 * provider decides; ConversationPanel.tsx reads `conversationOpen` from it. Neither the sim
 * engine nor App.tsx's game logic import from here directly except through `useDecarboNito()`.
 *
 * Queue rules (§4.2), implemented as literally as the state machine allows:
 *  1. One bubble at a time; priority >= current replaces it, lower priority queues (max 3).
 *  2. Minimum silence: 6s after a bubble closes before another *spontaneous* (priority <= 1)
 *     one appears. Anything explicitly triggered (`opts.immediate`) skips this.
 *  3. Proactivity budget: max 2 spontaneous messages per simulated year, reset by
 *     `resetProactiveBudget()` (called from App.tsx's runSimulationRound).
 *  4. Never the same text twice in a playthrough (spontaneous messages only — a real "collapse
 *     imminent" alert should be able to repeat even with identical wording).
 *  5. Priority 3 is reserved for rare, important moments by convention (not enforced here).
 *  6. `sleep` after 90s without *player* interaction (pointerdown/keydown); wakes with `peek`
 *     when any bubble/notification arrives while asleep.
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { DnEmotion, DnState, DnTone } from './types';
import { type AnchorId, getAnchorRect } from './anchors';

export type DnCorner = 'br' | 'bl' | 'tr' | 'tl';

export type DnPlacement =
  | { kind: 'dock'; corner: DnCorner }
  | { kind: 'anchor'; anchorId: AnchorId; offset?: { dx: number; dy: number } }
  | { kind: 'free'; x: number; y: number };

export type DnSurface = 'bubble' | 'notification';

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
  /** Anchor DecarboNito is pointing at while this message is shown, if any. */
  pointAt?: AnchorId;
  actions?: { labelKey: string; label: string; onSelect: () => void }[];
  createdAt: number;
}

export type DnMessageOpts = Partial<
  Pick<DnMessage, 'tone' | 'priority' | 'ttl' | 'pointAt' | 'actions'>
> & {
  /** Bypasses the silence window, proactivity budget and dedup — for direct player/agent-triggered messages. */
  immediate?: boolean;
};

export type DnNotifyMode = 'all' | 'criticalOnly' | 'muted';

/** Agent operation modes (mejora-general/files/15_decarbonito_agent_actions.md §1). `tutorial` is
 * a defined-but-unused value until phase 9 (18_tutoriales_v3.md) builds guided chapters — the type
 * exists now so the registry/agent code doesn't need touching again when that phase flips it on. */
export type AgentMode = 'observer' | 'assist' | 'tutorial';

export interface ConfirmOptions {
  text: string;
  confirmLabel: string;
  cancelLabel: string;
  /** ms before auto-cancelling. Default 30000 per §4.3. */
  timeoutMs?: number;
}

export interface DnApi {
  say(text: string, opts?: DnMessageOpts): string;
  notify(text: string, opts?: DnMessageOpts): string;
  play(state: DnState, emotion?: DnEmotion): void;
  moveTo(placement: DnPlacement): Promise<void>;
  focusOn(anchorId: AnchorId, opts?: { text?: string; holdMs?: number }): Promise<void>;
  release(): void;
  openConversation(seed?: string): void;
  closeConversation(): void;
  dismiss(id: string): void;
  setBusy(busy: boolean): void;
  resetProactiveBudget(): void;
  setNotifyMode(mode: DnNotifyMode): void;
  setHidden(hidden: boolean): void;
  setCorner(corner: DnCorner): void;
  /** Renders a confirmation card in the bubble (preview text + accept/cancel). Resolves `false`
   * on cancel or timeout. Used by the agent (phase 8) before any mutating action in `assist` mode. */
  confirm(opts: ConfirmOptions): Promise<boolean>;
}

interface DnContextValue extends DnApi {
  state: DnState;
  emotion: DnEmotion;
  placement: DnPlacement;
  current: DnMessage | null;
  notifications: DnMessage[];
  conversationOpen: boolean;
  conversationSeed: string | null;
  highlight: AnchorId | null;
  notifyMode: DnNotifyMode;
  hidden: boolean;
  onStateComplete: (finished: DnState) => void;
  mode: AgentMode;
  setMode: (mode: AgentMode) => void;
  /** True when `?mode=observer` is present in the URL — the mode selector must be disabled. */
  modeLockedByUrl: boolean;
}

const DecarboNitoContext = createContext<DnContextValue | null>(null);

/**
 * Escape hatch for App.tsx: `runSimulationRound`, the chat handlers and the level-conclusion
 * effect all predate this file and live in the top-level `App` component, which sits *above*
 * `<DecarboNitoProvider>` in the tree (it renders the provider as part of its own JSX) — so they
 * cannot call `useDecarboNito()`. Splitting App.tsx's ~1400 lines into a provider-descendant
 * component was judged too invasive for this phase. The provider publishes its API here on every
 * render instead; callers do `dnApiRef.current?.say(...)` and no-op safely before the provider
 * has mounted. Same pattern as `window.__dn` below, just always-on instead of dev-only.
 */
export const dnApiRef: { current: DnApi | null } = { current: null };

/** Same escape hatch as `dnApiRef`, for the one piece of state App.tsx's agent wiring needs to
 * read that isn't part of the imperative `DnApi` surface: the current `AgentMode`. */
export const dnModeRef: { current: AgentMode } = { current: 'assist' };

const PLACEMENT_KEY = 'decarbonation.dn.placement';
const NOTIFY_MODE_KEY = 'decarbonation.dn.notifyMode';
const HIDDEN_KEY = 'decarbonation.dn.hidden';
const AGENT_MODE_KEY = 'decarbonation.dn.agentMode';
const MIN_SILENCE_MS = 6000;
const MAX_QUEUE = 3;
const IDLE_SLEEP_MS = 90000;
const CONFIRM_TIMEOUT_MS = 30000;

let seq = 0;
const genId = () => `dn-${Date.now()}-${seq++}`;

function loadPlacement(): DnPlacement {
  try {
    const raw = localStorage.getItem(PLACEMENT_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.kind === 'dock' && ['br', 'bl', 'tr', 'tl'].includes(parsed.corner)) return parsed;
    }
  } catch { /* ignore malformed/unavailable storage */ }
  return { kind: 'dock', corner: 'br' };
}

function loadNotifyMode(): DnNotifyMode {
  try {
    const raw = localStorage.getItem(NOTIFY_MODE_KEY);
    if (raw === 'all' || raw === 'criticalOnly' || raw === 'muted') return raw;
  } catch { /* ignore */ }
  return 'all';
}

function loadHidden(): boolean {
  try { return localStorage.getItem(HIDDEN_KEY) === 'true'; } catch { return false; }
}

/** `?mode=observer` forces observer mode for the whole session — evaluation instances (§7 of the
 * source file) pin it this way instead of trusting a client-side toggle the player could flip. */
function urlForcedMode(): AgentMode | null {
  try {
    const fromUrl = new URLSearchParams(window.location.search).get('mode');
    return fromUrl === 'observer' ? 'observer' : null;
  } catch { return null; }
}

function loadAgentMode(): AgentMode {
  const forced = urlForcedMode();
  if (forced) return forced;
  try {
    const raw = localStorage.getItem(AGENT_MODE_KEY);
    if (raw === 'observer' || raw === 'assist') return raw;
  } catch { /* ignore */ }
  return 'assist'; // default for free play per source §1
}

export const DecarboNitoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<DnState>('idle');
  const [emotion, setEmotion] = useState<DnEmotion>('neutral');
  const [placement, setPlacementState] = useState<DnPlacement>(loadPlacement);
  const [current, setCurrent] = useState<DnMessage | null>(null);
  const [notifications, setNotifications] = useState<DnMessage[]>([]);
  const [conversationOpen, setConversationOpen] = useState(false);
  const [conversationSeed, setConversationSeed] = useState<string | null>(null);
  const [highlight, setHighlight] = useState<AnchorId | null>(null);
  const [notifyMode, setNotifyModeState] = useState<DnNotifyMode>(loadNotifyMode);
  const [hidden, setHiddenState] = useState<boolean>(loadHidden);
  const modeLockedByUrl = useMemo(() => urlForcedMode() !== null, []);
  const [mode, setModeState] = useState<AgentMode>(loadAgentMode);

  const currentRef = useRef<DnMessage | null>(null);
  const queueRef = useRef<DnMessage[]>([]);
  const dismissTimerRef = useRef<number | null>(null);
  const pumpTimerRef = useRef<number | null>(null);
  const lastCloseAtRef = useRef(0);
  const seenRef = useRef(new Set<string>());
  const proactiveBudgetRef = useRef(2);
  const idleTimerRef = useRef<number | null>(null);
  const notifyModeRef = useRef(notifyMode);
  const placementRef = useRef(placement);

  useEffect(() => { currentRef.current = current; }, [current]);
  useEffect(() => { notifyModeRef.current = notifyMode; }, [notifyMode]);
  useEffect(() => { placementRef.current = placement; }, [placement]);
  useEffect(() => { dnModeRef.current = mode; }, [mode]);

  const clearDismissTimer = () => {
    if (dismissTimerRef.current !== null) { window.clearTimeout(dismissTimerRef.current); dismissTimerRef.current = null; }
  };
  const clearPumpTimer = () => {
    if (pumpTimerRef.current !== null) { window.clearTimeout(pumpTimerRef.current); pumpTimerRef.current = null; }
  };

  const showBubble = useCallback((msg: DnMessage) => {
    clearDismissTimer();
    setCurrent(msg);
    if (msg.ttl !== null) {
      dismissTimerRef.current = window.setTimeout(() => {
        setCurrent((cur) => (cur?.id === msg.id ? null : cur));
        lastCloseAtRef.current = Date.now();
      }, msg.ttl);
    }
  }, []);

  /** Pulls the next queued bubble, respecting the minimum-silence window for spontaneous ones. */
  const pump = useCallback(() => {
    clearPumpTimer();
    if (currentRef.current || queueRef.current.length === 0) return;
    const next = queueRef.current[0];
    const spontaneous = next.priority <= 1;
    const elapsed = Date.now() - lastCloseAtRef.current;
    if (spontaneous && elapsed < MIN_SILENCE_MS) {
      pumpTimerRef.current = window.setTimeout(pump, MIN_SILENCE_MS - elapsed);
      return;
    }
    queueRef.current.shift();
    showBubble(next);
  }, [showBubble]);

  useEffect(() => { if (!current) pump(); }, [current, pump]);

  const resetIdleTimer = useCallback(() => {
    if (idleTimerRef.current !== null) { window.clearTimeout(idleTimerRef.current); idleTimerRef.current = null; }
    setState((s) => (s === 'sleep' ? 'peek' : s));
    idleTimerRef.current = window.setTimeout(() => setState('sleep'), IDLE_SLEEP_MS);
  }, []);

  useEffect(() => {
    resetIdleTimer();
    const onActivity = () => resetIdleTimer();
    window.addEventListener('pointerdown', onActivity);
    window.addEventListener('keydown', onActivity);
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        if (idleTimerRef.current !== null) { window.clearTimeout(idleTimerRef.current); idleTimerRef.current = null; }
      } else {
        resetIdleTimer();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('pointerdown', onActivity);
      window.removeEventListener('keydown', onActivity);
      document.removeEventListener('visibilitychange', onVisibility);
      if (idleTimerRef.current !== null) window.clearTimeout(idleTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const wakeIfAsleep = useCallback(() => {
    setState((s) => (s === 'sleep' ? 'peek' : s));
    resetIdleTimer();
  }, [resetIdleTimer]);

  const emit = useCallback((text: string, surface: DnSurface, opts?: DnMessageOpts): string => {
    const id = genId();
    const priority = opts?.priority ?? 1;

    if (notifyModeRef.current === 'muted') return id;
    if (notifyModeRef.current === 'criticalOnly' && priority < 3) return id;

    if (!opts?.immediate && priority <= 1) {
      if (seenRef.current.has(text)) return id;
      if (proactiveBudgetRef.current <= 0) return id;
      proactiveBudgetRef.current -= 1;
      seenRef.current.add(text);
    }

    const msg: DnMessage = {
      id, text, surface,
      tone: opts?.tone ?? 'normal',
      priority,
      ttl: opts?.ttl !== undefined ? opts.ttl : (surface === 'notification' ? null : 6000),
      pointAt: opts?.pointAt,
      actions: opts?.actions,
      createdAt: Date.now(),
    };

    wakeIfAsleep();

    if (surface === 'notification') {
      setNotifications((prev) => [msg, ...prev].slice(0, 3));
      return id;
    }

    const spontaneous = !opts?.immediate && priority <= 1;
    const elapsed = Date.now() - lastCloseAtRef.current;
    if (!currentRef.current && !(spontaneous && elapsed < MIN_SILENCE_MS)) {
      showBubble(msg);
    } else if (currentRef.current && priority >= currentRef.current.priority) {
      showBubble(msg);
    } else if (queueRef.current.length < MAX_QUEUE) {
      queueRef.current.push(msg);
      pump();
    } else {
      // eslint-disable-next-line no-console
      console.warn('[DecarboNito] message dropped (queue full):', text);
    }
    return id;
  }, [showBubble, pump, wakeIfAsleep]);

  const say = useCallback((text: string, opts?: DnMessageOpts) => emit(text, 'bubble', opts), [emit]);
  const notify = useCallback((text: string, opts?: DnMessageOpts) => emit(text, 'notification', opts), [emit]);

  const play = useCallback((next: DnState, nextEmotion?: DnEmotion) => {
    setState(next);
    if (nextEmotion) setEmotion(nextEmotion);
  }, []);

  const onStateComplete = useCallback((finished: DnState) => {
    setState((s) => (s === finished ? 'idle' : s));
  }, []);

  const setBusy = useCallback((busy: boolean) => {
    setState((s) => {
      if (busy) return 'think';
      return s === 'think' ? 'idle' : s;
    });
  }, []);

  const persistPlacement = (p: DnPlacement) => {
    if (p.kind === 'dock') {
      try { localStorage.setItem(PLACEMENT_KEY, JSON.stringify(p)); } catch { /* ignore */ }
    }
  };

  const moveTo = useCallback((next: DnPlacement): Promise<void> => {
    setPlacementState(next);
    persistPlacement(next);
    setState((s) => (s === 'sleep' ? s : 'travel'));
    // The real travel spring lives in DecarboNitoLayer (transform-based, 420-700ms per the
    // source spec); this promise is a conservative estimate so callers (focusOn, tutorials in
    // phase 9) can `await` a "roughly arrived" signal without the provider needing DOM access.
    return new Promise((resolve) => {
      window.setTimeout(() => {
        setState((s) => (s === 'travel' ? 'idle' : s));
        resolve();
      }, 600);
    });
  }, []);

  const focusOn = useCallback(async (anchorId: AnchorId, opts?: { text?: string; holdMs?: number }) => {
    const rect = getAnchorRect(anchorId);
    if (!rect) {
      // The anchor isn't mounted (wrong level, collapsed panel, etc.) — degrade gracefully
      // instead of silently doing nothing, per §4.3.
      setState('facepalm');
      return;
    }
    setHighlight(anchorId);
    await moveTo({ kind: 'anchor', anchorId });
    setState('point');
    if (opts?.text) showBubble({
      id: genId(), text: opts.text, surface: 'bubble', tone: 'normal', priority: 2,
      ttl: opts.holdMs ?? 6000, pointAt: anchorId, createdAt: Date.now(),
    });
  }, [moveTo, showBubble]);

  const release = useCallback(() => {
    setHighlight(null);
    const lastCorner: DnCorner = placementRef.current.kind === 'dock' ? placementRef.current.corner : 'br';
    void moveTo({ kind: 'dock', corner: lastCorner });
  }, [moveTo]);

  const openConversation = useCallback((seed?: string) => {
    setConversationOpen(true);
    setConversationSeed(seed ?? null);
  }, []);
  const closeConversation = useCallback(() => setConversationOpen(false), []);

  const dismiss = useCallback((id: string) => {
    setCurrent((cur) => {
      if (cur?.id === id) { lastCloseAtRef.current = Date.now(); clearDismissTimer(); return null; }
      return cur;
    });
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    queueRef.current = queueRef.current.filter((m) => m.id !== id);
  }, []);

  const resetProactiveBudget = useCallback(() => { proactiveBudgetRef.current = 2; }, []);

  const setNotifyMode = useCallback((mode: DnNotifyMode) => {
    setNotifyModeState(mode);
    try { localStorage.setItem(NOTIFY_MODE_KEY, mode); } catch { /* ignore */ }
  }, []);

  const setHidden = useCallback((next: boolean) => {
    setHiddenState(next);
    try { localStorage.setItem(HIDDEN_KEY, String(next)); } catch { /* ignore */ }
  }, []);

  const setCorner = useCallback((corner: DnCorner) => { void moveTo({ kind: 'dock', corner }); }, [moveTo]);

  const setMode = useCallback((next: AgentMode) => {
    if (modeLockedByUrl) return; // evaluation instances: the selector is disabled in the UI too, this is the belt-and-suspenders check
    setModeState(next);
    try { localStorage.setItem(AGENT_MODE_KEY, next); } catch { /* ignore */ }
  }, [modeLockedByUrl]);

  const confirm = useCallback((opts: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      let settled = false;
      const id = genId();
      const settle = (value: boolean) => {
        if (settled) return;
        settled = true;
        if (timer !== null) window.clearTimeout(timer);
        resolve(value);
      };
      const timer = window.setTimeout(() => { settle(false); dismiss(id); }, opts.timeoutMs ?? CONFIRM_TIMEOUT_MS);
      showBubble({
        id, text: opts.text, surface: 'bubble', tone: 'normal', priority: 2, ttl: null,
        actions: [
          { labelKey: 'agent.confirm.yes', label: opts.confirmLabel, onSelect: () => settle(true) },
          { labelKey: 'agent.confirm.no', label: opts.cancelLabel, onSelect: () => settle(false) },
        ],
        createdAt: Date.now(),
      });
    });
  }, [showBubble, dismiss]);

  // 'C' opens/closes the conversation panel; Esc closes it (also handled locally by the panel
  // for focus-trap reasons, kept here too as a safety net for when focus is elsewhere).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing = target && ['INPUT', 'TEXTAREA'].includes(target.tagName);
      if (e.key.toLowerCase() === 'c' && !typing) setConversationOpen((o) => !o);
      if (e.key === 'Escape') setConversationOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Dev-only introspection, per the source file's checkpoints (`window.__dn?.listAnchors()`,
  // `window.__dn.focusOn(...)`). Gated on hostname rather than an env flag: this project has no
  // `import.meta.env`/`NODE_ENV` define wired up (see vite.config.ts), and localhost is a good
  // enough proxy for "not the production Vercel deploy".
  const isDevHost = typeof window !== 'undefined' && ['localhost', '127.0.0.1'].includes(window.location.hostname);
  useEffect(() => {
    if (!isDevHost) return;
    (window as any).__dn = { say, notify, play, moveTo, focusOn, release, openConversation, closeConversation, confirm, listAnchors: () => import('./anchors').then((m) => m.listAnchors()) };
    return () => { delete (window as any).__dn; };
  }, [isDevHost, say, notify, play, moveTo, focusOn, release, openConversation, closeConversation, confirm]);

  useEffect(() => {
    dnApiRef.current = {
      say, notify, play, moveTo, focusOn, release, openConversation, closeConversation, dismiss,
      setBusy, resetProactiveBudget, setNotifyMode, setHidden, setCorner, confirm,
    };
    return () => { dnApiRef.current = null; };
  }, [say, notify, play, moveTo, focusOn, release, openConversation, closeConversation, dismiss, setBusy, resetProactiveBudget, setNotifyMode, setHidden, setCorner, confirm]);

  const value = useMemo<DnContextValue>(() => ({
    state, emotion, placement, current, notifications, conversationOpen, conversationSeed,
    highlight, notifyMode, hidden, mode, setMode, modeLockedByUrl,
    say, notify, play, moveTo, focusOn, release, openConversation, closeConversation, dismiss,
    setBusy, resetProactiveBudget, setNotifyMode, setHidden, setCorner, onStateComplete, confirm,
  }), [
    state, emotion, placement, current, notifications, conversationOpen, conversationSeed,
    highlight, notifyMode, hidden, mode, setMode, modeLockedByUrl,
    say, notify, play, moveTo, focusOn, release, openConversation, closeConversation, dismiss,
    setBusy, resetProactiveBudget, setNotifyMode, setHidden, setCorner, onStateComplete, confirm,
  ]);

  return <DecarboNitoContext.Provider value={value}>{children}</DecarboNitoContext.Provider>;
};

export const useDecarboNito = (): DnContextValue => {
  const ctx = useContext(DecarboNitoContext);
  if (!ctx) throw new Error('useDecarboNito must be used inside <DecarboNitoProvider>');
  return ctx;
};

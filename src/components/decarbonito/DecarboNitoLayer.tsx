/**
 * DecarboNitoLayer — the render layer of the floating overlay (14_decarbonito_overlay.md §5).
 * `fixed inset-0 pointer-events-none`, sitting above the whole game; `pointer-events: auto` is
 * re-enabled only on the avatar, the bubble and the notification stack, so the layer never blocks
 * the board underneath (the file's "regla de oro").
 *
 * Not a real DOM portal (the spec's `#dn-root`): this component is already mounted once, at the
 * end of App.tsx's tree, so a plain `fixed` div reaches the same visual result without the extra
 * portal-target plumbing.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, useReducedMotion, type PanInfo } from 'motion/react';
import { useFloating, autoUpdate, offset, flip, shift, arrow, FloatingArrow } from '@floating-ui/react';
import { useT } from '../../i18n';
import type { ChatMessage } from '../../types';
import { useDecarboNito, type DnCorner, type DnMessage, type DnPlacement } from './DecarboNitoProvider';
import { ANCHORS, getAnchorRect, subscribeAnchors, useAnchor } from './anchors';
import { DecarboNitoAvatar } from './DecarboNitoAvatar';
import ConversationPanel from './ConversationPanel';

const AVATAR = 96;
const MARGIN = 20;
const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

/** Converts a placement into viewport coordinates of the avatar's top-left corner. */
function resolvePosition(p: DnPlacement, vw: number, vh: number): { x: number; y: number } {
  if (p.kind === 'free') return { x: p.x, y: p.y };
  if (p.kind === 'dock') {
    const right = p.corner.endsWith('r');
    const bottom = p.corner.startsWith('b');
    return {
      x: right ? vw - AVATAR - MARGIN : MARGIN,
      y: bottom ? vh - AVATAR - MARGIN : MARGIN + 72, // 72 = header height
    };
  }
  const rect = getAnchorRect(p.anchorId);
  if (!rect) return resolvePosition({ kind: 'dock', corner: 'br' }, vw, vh);
  const preferRight = rect.right + AVATAR + 24 < vw;
  return {
    x: (preferRight ? rect.right + 16 : rect.left - AVATAR - 16) + (p.offset?.dx ?? 0),
    y: clamp(rect.top + rect.height / 2 - AVATAR / 2, 80, vh - AVATAR - MARGIN) + (p.offset?.dy ?? 0),
  };
}

function nearestCorner(x: number, y: number, vw: number, vh: number): DnCorner {
  const right = x + AVATAR / 2 > vw / 2;
  const bottom = y + AVATAR / 2 > vh / 2;
  return `${bottom ? 'b' : 't'}${right ? 'r' : 'l'}` as DnCorner;
}

const TONE_BORDER: Record<string, string> = {
  normal: 'border-basalt-600', caution: 'border-ochre', critical: 'border-ember', success: 'border-chlorophyll',
};
const TONE_TO_MOTION_TONE: Record<string, 'normal' | 'caution' | 'critical' | 'success'> = {
  normal: 'normal', caution: 'caution', critical: 'critical', success: 'success',
};

interface DecarboNitoLayerProps {
  messages: ChatMessage[];
  onUserSubmit: (input: string) => Promise<void>;
  isLoading: boolean;
  apiKeyAvailable: boolean;
  currentLevelName: string;
  suggestedQuestions: string[];
}

export const DecarboNitoLayer: React.FC<DecarboNitoLayerProps> = (chatProps) => {
  const { t } = useT();
  const dn = useDecarboNito();
  const reduced = useReducedMotion();
  const [viewport, setViewport] = useState({ vw: window.innerWidth, vh: window.innerHeight });
  const [menuOpen, setMenuOpen] = useState(false);
  const avatarBoxRef = useRef<HTMLDivElement | null>(null);
  const anchorAvatarRef = useAnchor<HTMLDivElement>(ANCHORS.avatar, 'DecarboNito');

  // Both refs point at the same node: one registers it as an addressable anchor, the other is
  // what the resize/position math below reads from directly.
  const setAvatarRef = (el: HTMLDivElement | null) => {
    avatarBoxRef.current = el;
    (anchorAvatarRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
  };

  const [pos, setPos] = useState(() => resolvePosition(dn.placement, viewport.vw, viewport.vh));

  useEffect(() => {
    const onResize = () => setViewport({ vw: window.innerWidth, vh: window.innerHeight });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Recompute on placement change, viewport resize, or the anchor we're pinned to moving/scrolling.
  useEffect(() => {
    const recompute = () => setPos(resolvePosition(dn.placement, viewport.vw, viewport.vh));
    recompute();
    const unsubAnchors = subscribeAnchors(recompute);
    window.addEventListener('scroll', recompute, true);
    return () => { unsubAnchors(); window.removeEventListener('scroll', recompute, true); };
  }, [dn.placement, viewport.vw, viewport.vh]);

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    const corner = nearestCorner(info.point.x - AVATAR / 2, info.point.y - AVATAR / 2, viewport.vw, viewport.vh);
    dn.setCorner(corner);
  };

  // Floating bubble, anchored to the avatar (§5.2): flip/shift/arrow instead of ~200 lines of
  // hand-rolled collision math, per the source file's own reasoning for pulling in this dependency.
  const arrowRef = useRef<SVGSVGElement | null>(null);
  const { refs, floatingStyles, context, middlewareData } = useFloating({
    open: !!dn.current,
    placement: 'top-start',
    whileElementsMounted: autoUpdate,
    middleware: [offset(12), flip(), shift({ padding: 12 }), arrow({ element: arrowRef })],
  });

  useEffect(() => { refs.setReference(avatarBoxRef.current); }, [refs, pos]);

  const toneClass = dn.current ? TONE_BORDER[dn.current.tone] : '';

  // Notification stack sits in the opposite corner from the avatar's current dock corner (or
  // bottom-left by default when docked elsewhere) so it never overlaps the character.
  const notifCorner: DnCorner = dn.placement.kind === 'dock'
    ? (`${dn.placement.corner.startsWith('b') ? 't' : 'b'}${dn.placement.corner.endsWith('r') ? 'l' : 'r'}` as DnCorner)
    : 'tl';
  const notifStyle: React.CSSProperties = {
    position: 'fixed',
    [notifCorner.startsWith('t') ? 'top' : 'bottom']: MARGIN,
    [notifCorner.endsWith('r') ? 'right' : 'left']: MARGIN,
  } as React.CSSProperties;

  if (dn.hidden) return null;

  return (
    <div className="fixed inset-0 z-[70]" style={{ pointerEvents: 'none' }}>
      {/* Highlight ring over the anchor DecarboNito is currently pointing at */}
      {dn.highlight && <HighlightRing anchorId={dn.highlight} />}

      {/* Notification stack */}
      <div style={{ ...notifStyle, pointerEvents: 'auto' }} className="flex flex-col gap-2 w-[min(320px,calc(100vw-32px))]">
        {dn.notifications.slice(0, 3).map((n, i) => (
          <NotificationCard key={n.id} message={n} stackIndex={i} onDismiss={() => dn.dismiss(n.id)} onOpen={() => dn.openConversation(n.text)} />
        ))}
      </div>

      {/* Avatar */}
      <motion.div
        ref={setAvatarRef}
        drag
        dragMomentum={false}
        dragElastic={0.12}
        onDragEnd={handleDragEnd}
        animate={{ x: pos.x, y: pos.y }}
        transition={reduced ? { duration: 0 } : { type: 'spring', damping: 26, stiffness: 260 }}
        style={{ position: 'fixed', top: 0, left: 0, width: AVATAR, pointerEvents: 'auto', cursor: 'grab', touchAction: 'none' }}
        className="group"
        onClick={() => { if (!menuOpen) dn.openConversation(); }}
        onContextMenu={(e) => { e.preventDefault(); setMenuOpen((o) => !o); }}
        role="button"
        tabIndex={0}
        aria-label={t('dn.avatarLabel')}
        aria-haspopup="dialog"
      >
        <DecarboNitoAvatar
          state={dn.state}
          emotion={dn.emotion}
          tone={TONE_TO_MOTION_TONE[dn.current?.tone ?? 'normal']}
          size={AVATAR}
          onStateComplete={dn.onStateComplete}
        />
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setMenuOpen((o) => !o); }}
          className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-basalt-800 border border-basalt-600 text-ash text-xs opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
          aria-label={t('dn.menuButton')}
          title={t('dn.menuButton')}
        >
          &#8942;
        </button>
      </motion.div>

      {menuOpen && (
        <DnContextMenu
          onClose={() => setMenuOpen(false)}
          anchorPos={pos}
        />
      )}

      {/* Speech bubble */}
      {dn.current && (
        <div
          ref={refs.setFloating}
          style={{ ...floatingStyles, pointerEvents: 'auto', zIndex: 80 }}
          role="status"
          aria-live={dn.current.priority >= 3 ? 'assertive' : 'polite'}
          className={`w-[min(340px,calc(100vw-32px))] max-h-[40vh] overflow-y-auto rounded-xl border bg-basalt-800 text-bone p-3 shadow-xl ${toneClass}`}
        >
          <FloatingArrow ref={arrowRef} context={context} fill="var(--color-basalt-800)" />
          <BubbleText text={dn.current.text} priority={dn.current.priority} reduced={!!reduced} />
          {dn.current.actions && dn.current.actions.length > 0 && (
            <div className="flex gap-2 mt-2">
              {dn.current.actions.slice(0, 2).map((a, i) => (
                <button
                  key={i}
                  onClick={() => { a.onSelect(); dn.dismiss(dn.current!.id); }}
                  className="px-3 py-1.5 text-[13px] rounded-md bg-basalt-700 hover:bg-basalt-600 text-bone transition-colors"
                >
                  {a.label}
                </button>
              ))}
            </div>
          )}
          <button
            onClick={() => dn.dismiss(dn.current!.id)}
            className="absolute top-1.5 right-1.5 text-ash-dim hover:text-ash text-xs w-5 h-5 flex items-center justify-center"
            aria-label={t('dn.dismissBubble')}
          >
            &#10005;
          </button>
        </div>
      )}

      {/* Conversation panel — replaces ChatbotPanel; anchored to the avatar, opened on click/'C'/notification click. */}
      {dn.conversationOpen && (
        <ConversationPanel
          {...chatProps}
          anchorEl={avatarBoxRef.current}
          onClose={dn.closeConversation}
        />
      )}
    </div>
  );
};

/** Typewriter only for priority >= 2 (per §5.2) at 90 chars/sec, skippable with a click. Priority
 * 0/1 and reduced-motion render the full text immediately — no ruido for long/ambient text. */
const BubbleText: React.FC<{ text: string; priority: number; reduced: boolean }> = ({ text, priority, reduced }) => {
  const shouldType = priority >= 2 && !reduced;
  const [shown, setShown] = useState(shouldType ? '' : text);
  const doneRef = useRef(!shouldType);

  useEffect(() => {
    if (!shouldType) { setShown(text); doneRef.current = true; return; }
    doneRef.current = false;
    setShown('');
    let i = 0;
    const CHARS_PER_MS = 90 / 1000;
    let raf: number;
    let start: number | null = null;
    const step = (ts: number) => {
      if (start === null) start = ts;
      const target = Math.min(text.length, Math.floor((ts - start) * CHARS_PER_MS));
      if (target !== i) { i = target; setShown(text.slice(0, i)); }
      if (i < text.length) raf = requestAnimationFrame(step);
      else doneRef.current = true;
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, shouldType]);

  return (
    <p
      className="whitespace-pre-wrap text-sm pr-4 cursor-text"
      onClick={() => { if (!doneRef.current) { setShown(text); doneRef.current = true; } }}
    >
      {shown}
    </p>
  );
};

const NotificationCard: React.FC<{ message: DnMessage; stackIndex: number; onDismiss: () => void; onOpen: () => void }> = ({ message, stackIndex, onDismiss, onOpen }) => {
  const { t } = useT();
  return (
    <motion.div
      initial={{ opacity: 0, y: -8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 - stackIndex * 0.02 }}
      className={`rounded-lg border bg-basalt-800 text-bone p-3 shadow-lg cursor-pointer ${TONE_BORDER[message.tone] ?? 'border-basalt-600'}`}
      onClick={onOpen}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[13px] leading-snug line-clamp-2 flex-1">{message.text}</p>
        <button
          onClick={(e) => { e.stopPropagation(); onDismiss(); }}
          className="text-ash-dim hover:text-ash text-xs w-5 h-5 flex items-center justify-center shrink-0"
          aria-label={t('dn.dismissBubble')}
        >
          &#10005;
        </button>
      </div>
    </motion.div>
  );
};

const HighlightRing: React.FC<{ anchorId: string }> = ({ anchorId }) => {
  const [rect, setRect] = useState(() => getAnchorRect(anchorId));
  useEffect(() => {
    const recompute = () => setRect(getAnchorRect(anchorId));
    recompute();
    const unsub = subscribeAnchors(recompute);
    window.addEventListener('resize', recompute);
    window.addEventListener('scroll', recompute, true);
    return () => { unsub(); window.removeEventListener('resize', recompute); window.removeEventListener('scroll', recompute, true); };
  }, [anchorId]);
  if (!rect) return null;
  return (
    <motion.div
      style={{
        position: 'fixed', left: rect.left - 4, top: rect.top - 4, width: rect.width + 8, height: rect.height + 8,
        borderRadius: 10, border: '2px solid var(--color-chlorophyll)', pointerEvents: 'none',
      }}
      animate={{ opacity: [1, 0.45, 1] }}
      transition={{ duration: 1.6, repeat: Infinity }}
    />
  );
};

const DnContextMenu: React.FC<{ onClose: () => void; anchorPos: { x: number; y: number } }> = ({ onClose, anchorPos }) => {
  const { t } = useT();
  const dn = useDecarboNito();
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose(); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onClick); document.removeEventListener('keydown', onKey); };
  }, [onClose]);

  const item = (label: string, onClick: () => void) => (
    <button
      onClick={() => { onClick(); onClose(); }}
      className="w-full text-left px-3 py-2 text-[13px] text-bone hover:bg-basalt-700 transition-colors"
    >
      {label}
    </button>
  );

  return (
    <div
      ref={menuRef}
      style={{ position: 'fixed', left: clampMenuX(anchorPos.x), top: anchorPos.y, pointerEvents: 'auto', zIndex: 90 }}
      className="w-56 rounded-lg border border-basalt-600 bg-basalt-800 shadow-xl py-1"
      role="menu"
    >
      {item(t('dn.menu.muteAll'), () => dn.setNotifyMode(dn.notifyMode === 'muted' ? 'all' : 'muted'))}
      {item(t('dn.menu.criticalOnly'), () => dn.setNotifyMode(dn.notifyMode === 'criticalOnly' ? 'all' : 'criticalOnly'))}
      {item(t('dn.menu.changeCorner'), () => {
        const corners: DnCorner[] = ['br', 'bl', 'tl', 'tr'];
        const current = dn.placement.kind === 'dock' ? dn.placement.corner : 'br';
        const next = corners[(corners.indexOf(current) + 1) % corners.length];
        dn.setCorner(next);
      })}
      {item(t('dn.menu.hide'), () => dn.setHidden(true))}
    </div>
  );
};

function clampMenuX(x: number): number {
  const menuWidth = 224;
  return clamp(x, 8, window.innerWidth - menuWidth - 8);
}

export default DecarboNitoLayer;

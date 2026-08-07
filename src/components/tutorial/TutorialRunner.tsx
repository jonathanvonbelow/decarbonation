/**
 * TutorialRunner — drives the chapter engine (18_tutoriales_v3.md §4.2). Rendered once, as a
 * sibling of DecarboNitoLayer inside <DecarboNitoProvider> (see App.tsx), watching `gameState` as
 * a prop rather than reading it imperatively — that's what lets `predicate`/`gameEvent` advance
 * conditions be evaluated on every render without any extra event bus.
 *
 * Positioning/pointing/spotlighting all go through `useDecarboNito()` (phase 7); the tutorial
 * itself never mutates game state — every step only calls `dn.say`/`dn.focusOn`/`dn.play`, exactly
 * like the source file's own principle for the agent (phase 8) applies here too.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { GameState } from '../../types';
import { useT } from '../../i18n';
import { useDecarboNito } from '../decarbonito/DecarboNitoProvider';
import { getAnchorElement } from '../decarbonito/anchors';
import { CHAPTERS, CHAPTERS_BY_ID } from './chapters';
import type { ChapterId, TutorialChapter, TutorialGameEvent, TutorialStep } from './types';
import { getProgress, markChapterCompleted, markSkippedAll, markStepProgress } from './progress';
import { logTutorialEvent } from '../../services/tutorialTelemetry';

export interface TutorialApi {
  openMenu: () => void;
  closeMenu: () => void;
  launchChapter: (id: ChapterId) => void;
}

/** Same escape-hatch pattern as dnApiRef/dnModeRef (phases 7-8): Header.tsx's "Ayuda/Tutorial"
 * button lives above this component in some render paths and needs an imperative way in. */
export const tutorialApiRef: { current: TutorialApi | null } = { current: null };

const countActivePolicies = (s: GameState) => Object.values(s.policies).filter((p) => p.isActive).length;

function eventFired(event: TutorialGameEvent, before: GameState, after: GameState, chatOpenedNow: boolean): boolean {
  switch (event) {
    case 'policyActivated': return countActivePolicies(after) > countActivePolicies(before);
    case 'policyDeactivated': return countActivePolicies(after) < countActivePolicies(before);
    case 'yearSimulated': return after.year > before.year;
    case 'chatOpened': return chatOpenedNow;
    default: return false;
  }
}

interface ActiveState { chapter: TutorialChapter; stepIndex: number }

export const TutorialRunner: React.FC<{ gameState: GameState; sessionId?: string | null }> = ({ gameState, sessionId }) => {
  const dn = useDecarboNito();
  const { t } = useT();
  const [menuOpen, setMenuOpen] = useState(false);
  const [active, setActive] = useState<ActiveState | null>(null);

  const gameStateRef = useRef(gameState);
  useEffect(() => { gameStateRef.current = gameState; }, [gameState]);

  const stepStartStateRef = useRef<GameState | null>(null);
  const currentBubbleIdRef = useRef<string | null>(null);
  const anchorClickCleanupRef = useRef<(() => void) | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const triggeredThisSessionRef = useRef(new Set<ChapterId>());
  const startedAtRef = useRef(0);
  const firstMountRef = useRef(true);

  const clearAdvanceListeners = () => {
    if (anchorClickCleanupRef.current) { anchorClickCleanupRef.current(); anchorClickCleanupRef.current = null; }
    if (timeoutRef.current !== null) { window.clearTimeout(timeoutRef.current); timeoutRef.current = null; }
  };

  const exitTutorial = useCallback(() => {
    if (active) logTutorialEvent({ chapter: active.chapter.id, step: active.chapter.steps[active.stepIndex]?.id, action: 'abandoned', elapsedMs: Date.now() - startedAtRef.current }, sessionId);
    clearAdvanceListeners();
    if (currentBubbleIdRef.current) dn.dismiss(currentBubbleIdRef.current);
    dn.release();
    setActive(null);
  }, [active, dn]);

  const advance = useCallback(() => {
    setActive((prev) => (prev ? { ...prev, stepIndex: prev.stepIndex + 1 } : prev));
  }, []);

  // Esc always interrupts, from any step (§4.2 "Siempre interrumpible").
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') exitTutorial(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, exitTutorial]);

  // Sets up the current step: travel/point, pose, bubble text + advance wiring. Runs once per
  // (chapter, stepIndex) pair.
  useEffect(() => {
    if (!active) return;
    const { chapter, stepIndex } = active;
    const step = chapter.steps[stepIndex];
    clearAdvanceListeners();

    if (!step) {
      // Chapter finished.
      markChapterCompleted(chapter.id);
      logTutorialEvent({ chapter: chapter.id, action: 'completed', elapsedMs: Date.now() - startedAtRef.current }, sessionId);
      dn.release();
      setActive(null);
      // Cold open's one branch point (§3): offer to keep going into "board" or let the player
      // explore on their own. Special-cased here rather than generalizing TutorialStep's advance
      // model for a fork only this one chapter needs.
      if (chapter.id === 'coldOpen') {
        window.setTimeout(() => {
          // DecarboNitoLayer's bubble already dismisses itself whenever any of its own action
          // buttons is clicked (see DecarboNitoLayer.tsx) — neither branch needs to dismiss here.
          dn.say(t('tutorial.coldOpen.resultIntro'), {
            priority: 3, ttl: null, immediate: true,
            actions: [
              { labelKey: 'tutorial.coldOpen.showMe', label: t('tutorial.coldOpen.showMe'), onSelect: () => tutorialApiRef.current?.launchChapter('board') },
              { labelKey: 'tutorial.coldOpen.explore', label: t('tutorial.coldOpen.explore'), onSelect: () => {} },
            ],
          });
        }, 300);
      }
      return;
    }

    if (step.when && !step.when(gameStateRef.current)) { advance(); return; }

    markStepProgress(chapter.id, stepIndex);
    stepStartStateRef.current = gameStateRef.current;
    startedAtRef.current = Date.now();
    logTutorialEvent({ chapter: chapter.id, step: step.id, action: stepIndex === 0 ? 'started' : 'step_completed' }, sessionId);

    let cancelled = false;
    (async () => {
      if (step.anchor) await dn.focusOn(step.anchor, { spotlight: step.spotlight });
      if (cancelled) return;
      if (step.pose) dn.play(step.pose.state, step.pose.emotion);

      const text = t(step.textKey, step.values?.(gameStateRef.current));
      const exitAction = { labelKey: 'tutorial.exit', label: t('tutorial.exit'), onSelect: exitTutorial };
      const actions = step.advance.on === 'click'
        ? [{ labelKey: 'tutorial.next', label: t('tutorial.next'), onSelect: advance }]
        : stepIndex === 0 && chapter.id === 'coldOpen'
          ? [{ labelKey: 'tutorial.skipAll', label: t('tutorial.skipAll'), onSelect: () => { markSkippedAll(); exitTutorial(); } }]
          : [exitAction];
      currentBubbleIdRef.current = dn.say(text, { priority: 3, ttl: null, immediate: true, actions });

      if (step.advance.on === 'anchorClick') {
        const el = getAnchorElement(step.advance.anchorId);
        if (el) {
          const handler = () => advance();
          el.addEventListener('click', handler, { once: true });
          anchorClickCleanupRef.current = () => el.removeEventListener('click', handler);
        }
      } else if (step.advance.on === 'timeout') {
        timeoutRef.current = window.setTimeout(advance, step.advance.ms);
      }
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?.chapter.id, active?.stepIndex]);

  // Reactive advance conditions ('predicate'/'gameEvent') and manual "en curso" re-render trigger
  // (dn.conversationOpen changes don't touch `gameState`, so 'chatOpened' needs its own watch).
  useEffect(() => {
    if (!active || !stepStartStateRef.current) return;
    const step = active.chapter.steps[active.stepIndex];
    if (!step) return;
    if (step.advance.on === 'predicate' && step.advance.check(gameState)) advance();
    else if (step.advance.on === 'gameEvent' && eventFired(step.advance.event, stepStartStateRef.current, gameState, dn.conversationOpen)) advance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState, dn.conversationOpen, active?.chapter.id, active?.stepIndex]);

  const launchChapter = useCallback((id: ChapterId) => {
    const chapter = CHAPTERS_BY_ID[id];
    if (!chapter) return;
    clearAdvanceListeners();
    const progress = getProgress();
    const resumeAt = progress.inProgress[id] ?? 0;
    setMenuOpen(false);
    setActive({ chapter, stepIndex: resumeAt });
  }, []);

  // First-visit cold open (§3) + auto-launch of level/state-triggered chapters (§4.3), both gated
  // so they never interrupt an already-running chapter or repeat within the same session after an
  // Esc exit.
  useEffect(() => {
    if (active) return;
    const progress = getProgress();

    if (firstMountRef.current) {
      firstMountRef.current = false;
      if (!progress.skippedAll && !progress.completedChapters.includes('coldOpen')) {
        launchChapter('coldOpen');
        return;
      }
    }

    for (const chapter of CHAPTERS) {
      if (!chapter.trigger) continue;
      if (progress.completedChapters.includes(chapter.id)) continue;
      if (triggeredThisSessionRef.current.has(chapter.id)) continue;
      if (chapter.level > gameState.currentLevel) continue;
      if (chapter.trigger(gameState)) {
        triggeredThisSessionRef.current.add(chapter.id);
        launchChapter(chapter.id);
        return;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState, active]);

  useEffect(() => {
    tutorialApiRef.current = {
      openMenu: () => setMenuOpen(true),
      closeMenu: () => setMenuOpen(false),
      launchChapter,
    };
    return () => { tutorialApiRef.current = null; };
  }, [launchChapter]);

  if (!menuOpen) return null;

  const progress = getProgress();
  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[95] p-4"
      role="dialog" aria-modal="true" aria-label={t('tutorial.menuTitle')}
      onClick={() => setMenuOpen(false)}
    >
      <div
        className="bg-basalt-900 border border-basalt-600 rounded-xl p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start mb-2">
          <h2 className="text-xl font-semibold text-bone">{t('tutorial.menuTitle')}</h2>
          <button onClick={() => setMenuOpen(false)} className="text-ash-dim hover:text-bone text-2xl leading-none" aria-label={t('tutorial.close')}>&times;</button>
        </div>
        <p className="text-sm text-ash-dim mb-4">{t('tutorial.menuIntro')}</p>
        <ul className="space-y-2">
          {CHAPTERS.map((c) => {
            const done = progress.completedChapters.includes(c.id);
            const locked = c.level > gameState.currentLevel;
            return (
              <li key={c.id} className="flex items-center justify-between gap-3 p-3 rounded-lg bg-basalt-800 border border-basalt-700">
                <div className="min-w-0">
                  <p className="text-bone text-sm font-medium truncate">{t(c.titleKey)}</p>
                  {locked && <p className="text-[12px] text-ash-dim">{t('tutorial.chapterLocked', { level: c.level })}</p>}
                  {done && !locked && <p className="text-[12px] text-chlorophyll">{t('tutorial.chapterDone')}</p>}
                </div>
                <button
                  onClick={() => launchChapter(c.id)}
                  disabled={locked}
                  className="shrink-0 px-3 py-1.5 text-[13px] rounded-md bg-hydro text-basalt-950 font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {done ? t('tutorial.restart') : t('tutorial.start')}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
};

export default TutorialRunner;

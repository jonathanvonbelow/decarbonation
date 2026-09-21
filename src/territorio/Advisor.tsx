/**
 * DecarboNito inside the Territorio preview.
 *
 * The overlay itself (avatar, bubbles, notifications, conversation panel) is the same one the
 * 3-level game uses — `DecarboNitoProvider` + `DecarboNitoLayer` are game-agnostic, so nothing was
 * forked. What this component adds is everything that *is* specific to the preview:
 *
 *   - the monthly watch: after every step it asks `cueFor` (src/territorio/advisorRules.ts) whether
 *     there is one thing worth saying, resolves its text against the preview's dictionary and
 *     emits it. A cue never pauses the clock — same rule as the situations.
 *   - the chat: questions go to `askTerritorio` with a context built from the session, not from
 *     LEVEL_CONFIGS. He can read the whole region; he cannot touch it.
 *   - the yearly budget reset, so "2 spontaneous messages per year" means per simulated year and
 *     not per minute of wall clock.
 *
 * Deliberately NOT wired: the action agent (`uiActionRegistry`). In this preview DecarboNito
 * advises and points; every change to the region stays the player's. That is the same boundary the
 * fusion spec draws for the player's own hands (only public uses are declared directly), and it
 * avoids an agent that could spend the treasury while the clock runs.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { DecarboNitoLayer } from '../components/decarbonito/DecarboNitoLayer';
import { useDecarboNito } from '../components/decarbonito/DecarboNitoProvider';
import { useT } from '../i18n';
import type { TranslationKey } from '../i18n';
import { getEventName } from '../legacyContent/gameData';
import { askTerritorio } from '../services/geminiService';
import type { ChatMessage } from '../types';
import { cueFor, territorioContext, type Cue } from './advisorRules';
import { fill, useCopy } from './copy';
import { SITUATION_BY_ID } from './situations';
import type { Session } from './session';

const apiKeyAvailable = !!process.env.API_KEY;

export function Advisor({ session, active }: { session: Session; active: boolean }) {
  const dn = useDecarboNito();
  const { c, locale } = useCopy();
  const { t: tMain } = useT();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const sessionRef = useRef(session);
  const prevRef = useRef<Session | null>(null);
  const seenRef = useRef(new Set<string>());
  /** Seed of the game already welcomed, so a restart gets its own greeting. */
  const welcomedRef = useRef<number | null>(null);
  sessionRef.current = session;

  /** Cue values may carry ids (i18n keys, situation ids, event ids); resolve them to real names. */
  const resolve = useCallback((cue: Cue): string => {
    const template = (c.advisor.cues as Record<string, string>)[cue.key];
    if (!template) return '';
    const values: Record<string, string | number> = { ...cue.values };
    if (typeof values.route === 'string') values.route = tMain(values.route as TranslationKey);
    if (typeof values.condition === 'string') values.condition = tMain(values.condition as TranslationKey);
    if (typeof values.floor === 'string') values.floor = tMain(values.floor as TranslationKey);
    if (typeof values.situation === 'string') {
      const def = SITUATION_BY_ID[values.situation];
      if (def) values.situation = def[locale].title;
    }
    if (typeof values.event === 'string') values.event = getEventName(values.event, locale);
    return fill(template, values);
  }, [c, locale, tMain]);

  // Welcome, once per game.
  useEffect(() => {
    if (!active || welcomedRef.current === session.seed) return;
    welcomedRef.current = session.seed;
    dn.say(c.advisor.welcome, { immediate: true, priority: 1, ttl: 9000 });
  }, [active, session.seed, c.advisor.welcome, dn]);

  // The monthly watch.
  useEffect(() => {
    const prev = prevRef.current;
    prevRef.current = session;
    if (!active || !prev) return;
    // A restart is not a month: forget what he has said and compare from the new game onwards.
    if (prev.seed !== session.seed || session.monthIndex < prev.monthIndex) {
      seenRef.current.clear();
      setMessages([]);
      return;
    }
    if (session.monthIndex === prev.monthIndex) return;
    if (session.game.year !== prev.game.year) dn.resetProactiveBudget();

    const cue = cueFor(prev, session);
    if (!cue) return;
    if (!cue.repeatable && seenRef.current.has(cue.id)) return;
    seenRef.current.add(cue.id);

    const text = resolve(cue);
    if (!text) return;
    const opts = {
      tone: cue.tone, priority: cue.priority, pointAt: cue.anchor,
      immediate: cue.priority >= 2,
      ttl: cue.surface === 'bubble' ? (cue.priority >= 3 ? 12000 : 8000) : null,
    } as const;
    if (cue.surface === 'notification') dn.notify(text, opts);
    else dn.say(text, opts);
  }, [session, active, dn, resolve]);

  const onUserSubmit = useCallback(async (input: string) => {
    const now = Date.now();
    setMessages((prev) => [...prev, { sender: 'user', text: input, timestamp: now }]);
    setIsLoading(true);
    dn.setBusy(true);
    try {
      const answer = await askTerritorio(input, territorioContext(sessionRef.current, locale), locale);
      setMessages((prev) => [...prev, { sender: 'bot', text: answer, timestamp: Date.now() }]);
    } catch (error) {
      setMessages((prev) => [...prev, {
        sender: 'system',
        text: error instanceof Error ? error.message : String(error),
        timestamp: Date.now(),
        emphasisType: 'system_error',
      }]);
    } finally {
      setIsLoading(false);
      dn.setBusy(false);
    }
  }, [dn, locale]);

  return (
    <DecarboNitoLayer
      messages={messages}
      onUserSubmit={onUserSubmit}
      isLoading={isLoading}
      apiKeyAvailable={apiKeyAvailable}
      currentLevelName={c.advisor.focus}
      suggestedQuestions={c.advisor.suggestions}
    />
  );
}

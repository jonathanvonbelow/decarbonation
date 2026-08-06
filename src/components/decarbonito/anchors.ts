/**
 * Live registry of "anchorable" UI elements (mejora-general/files/14_decarbonito_overlay.md §3).
 * DecarboNito, the action agent (phase 8) and the tutorial engine (phase 9) all address the
 * interface through these stable IDs instead of CSS selectors, so that restyling never breaks
 * pointing, highlighting or guided steps. This is the most reused piece of the whole package.
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
  winRoutesPanel: 'win-routes-panel', // ver archivo 17
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

function notify() { listeners.forEach((fn) => fn()); }

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

/** Human-readable list, injected into the agent prompt (phase 8) so the model knows what exists. */
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, label]);
  return ref;
}

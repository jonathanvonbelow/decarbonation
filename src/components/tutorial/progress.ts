/**
 * Tutorial progress persistence (18_tutoriales_v3.md §4.2: "Progreso persistido en localStorage
 * ... y en Supabase"). localStorage drives resumption (works offline, in demo mode); the Supabase
 * side is best-effort telemetry only (tests/agent/*'s pattern from phase 8 — see
 * tutorialTelemetry.ts) and never gates anything the player can do.
 */
import type { ChapterId, TutorialProgress } from './types';

const KEY = 'decarbonation.tutorial.progress';

function load(): TutorialProgress {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.completedChapters)) return parsed;
    }
  } catch { /* ignore malformed/unavailable storage */ }
  return { completedChapters: [], inProgress: {}, skippedAll: false };
}

function save(p: TutorialProgress) {
  try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* ignore */ }
}

export function getProgress(): TutorialProgress {
  return load();
}

export function markStepProgress(chapterId: ChapterId, stepIndex: number) {
  const p = load();
  p.inProgress = { ...p.inProgress, [chapterId]: stepIndex };
  save(p);
}

export function markChapterCompleted(chapterId: ChapterId) {
  const p = load();
  if (!p.completedChapters.includes(chapterId)) p.completedChapters.push(chapterId);
  const { [chapterId]: _removed, ...rest } = p.inProgress;
  p.inProgress = rest;
  save(p);
}

export function markSkippedAll() {
  const p = load();
  p.skippedAll = true;
  save(p);
}

export function resetProgress() {
  save({ completedChapters: [], inProgress: {}, skippedAll: false });
}

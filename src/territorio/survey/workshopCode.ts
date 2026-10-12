/**
 * Workshop code carried from the game link (`/territorio?taller=CODE`) to the questionnaire, which
 * may be opened from a button that does not repeat the parameter. Kept in sessionStorage so it
 * lives as long as the tab and never leaks into a later, unrelated visit.
 */
const KEY = 'dn_taller_v1';
export const WORKSHOP_CODE_RE = /^[A-Za-z0-9_-]{2,32}$/;

const read = (): string | null => {
  try {
    const v = sessionStorage.getItem(KEY);
    return v && WORKSHOP_CODE_RE.test(v) ? v : null;
  } catch {
    return null;
  }
};

/** Reads `?taller=` from the URL (valid codes are stored) or falls back to the stored code. */
export function captureWorkshopCode(search: string = typeof window !== 'undefined' ? window.location.search : ''): string | null {
  const fromUrl = new URLSearchParams(search).get('taller');
  if (fromUrl && WORKSHOP_CODE_RE.test(fromUrl)) {
    try { sessionStorage.setItem(KEY, fromUrl); } catch { /* storage unavailable */ }
    return fromUrl;
  }
  return read();
}

export const activeWorkshopCode = (): string | null => read();

/** Adds `?taller=` (or `&taller=`) to an internal link when a code is active; never duplicates it. */
export function withWorkshopCode(href: string): string {
  const code = read();
  if (!code || /[?&]taller=/.test(href)) return href;
  return `${href}${href.includes('?') ? '&' : '?'}taller=${encodeURIComponent(code)}`;
}

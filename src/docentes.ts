/**
 * Teacher package behavior (mejora-general/files/27_paquete_docente_dos_versiones.md). Static
 * pages, no React: the es/en toggle plus the version switch (Territorio / 3-level game).
 *
 * Markup contract: `[data-version-tab="territorio|niveles"]` buttons and `[data-version="..."]`
 * sections. Without this script every section is visible, one under the other.
 */
import { initLocale } from './shared/locale';

export type Version = 'territorio' | 'niveles';
export const VERSION_KEY = 'dn_docentes_version_v1';
const isVersion = (v: string | null | undefined): v is Version => v === 'territorio' || v === 'niveles';

/** `?v=` wins, then the remembered choice, then Territorio (the recommended version). */
export function resolveVersion(search: string, stored: string | null): Version {
  const fromUrl = new URLSearchParams(search).get('v');
  if (isVersion(fromUrl)) return fromUrl;
  return isVersion(stored) ? stored : 'territorio';
}

/** Internal teacher-package links keep the chosen version; other links are left alone. */
export function withVersion(href: string, version: Version, base = 'https://decarbonation.vercel.app'): string {
  const url = new URL(href, base);
  if (url.origin !== new URL(base).origin || !url.pathname.startsWith('/docentes')) return href;
  url.searchParams.set('v', version);
  return `${url.pathname}${url.search}${url.hash}`;
}

function readStored(): string | null {
  try { return localStorage.getItem(VERSION_KEY); } catch { return null; }
}

function apply(version: Version, persist: boolean): void {
  document.querySelectorAll<HTMLElement>('[data-version]').forEach((el) => { el.hidden = el.dataset.version !== version; });
  document.querySelectorAll<HTMLElement>('[data-version-tab]').forEach((tab) => {
    const on = tab.dataset.versionTab === version;
    tab.setAttribute('aria-selected', String(on));
    tab.tabIndex = on ? 0 : -1;
  });
  document.querySelectorAll<HTMLAnchorElement>('a[href]').forEach((a) => {
    const original = a.dataset.href0 ?? a.getAttribute('href') ?? '';
    a.dataset.href0 = original;
    if (a.hasAttribute('data-no-version')) return;
    a.setAttribute('href', withVersion(original, version));
  });
  document.documentElement.dataset.version = version;
  if (persist) {
    const url = new URL(window.location.href);
    url.searchParams.set('v', version);
    window.history.replaceState(null, '', url);
    try { localStorage.setItem(VERSION_KEY, version); } catch { /* ignore */ }
  }
}

function initVersionSwitch(): void {
  const initial = resolveVersion(window.location.search, readStored());
  apply(initial, false);
  const tabs = Array.from(document.querySelectorAll<HTMLElement>('[data-version-tab]'));
  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => apply(tab.dataset.versionTab as Version, true));
    tab.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      e.preventDefault();
      const next = tabs[(i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length];
      next.focus();
      next.click();
    });
  });
}

if (typeof document !== 'undefined') {
  initLocale();
  initVersionSwitch();
}

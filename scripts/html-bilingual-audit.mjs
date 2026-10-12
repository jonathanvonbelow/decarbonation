/**
 * Bilingual audit of the static pages (v5/29 §4): index.html and docentes*.html.
 *  1. every `data-lang="es"` element is immediately followed by its `data-lang="en"` twin (and vice versa);
 *  2. no visible text sits outside a `data-lang` element, except proper names and non-linguistic text.
 * Dependency-free: a tiny tokenizer is enough for these hand-written pages.
 */
import { readFileSync } from 'node:fs';
import { glob } from 'node:fs/promises';

const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);
const RAW = new Set(['script', 'style']);
/** Proper names / literals that legitimately appear in both languages. */
const ALLOWED = [
  /^!DOCTYPE/i, /^[\w.-]+(\/[\w.?=&-]*)+$|^[\w-]+\.html$/, /Fundaci.n Bariloche · FCF-UNaM · CONICET/,/^DecarboNation$/, /^IKI$/, /^[A-Z]{2,6}$/, /^\d+(\s*\/\s*\d+)?$/];

function parse(html) {
  const root = { tag: '#root', attrs: {}, children: [], parent: null };
  let cur = root;
  const re = /<!--[\s\S]*?-->|<(\/?)([a-zA-Z][\w-]*)([^>]*?)(\/?)>|([^<]+)/g;
  let m;
  while ((m = re.exec(html))) {
    if (m[0].startsWith('<!--')) continue;
    if (m[5] !== undefined) {
      cur.children.push({ text: m[5], parent: cur });
      continue;
    }
    const [, closing, nameRaw, attrStr, selfClose] = m;
    const tag = nameRaw.toLowerCase();
    if (closing) {
      let n = cur;
      while (n && n.tag !== tag) n = n.parent;
      if (n && n.parent) cur = n.parent;
      continue;
    }
    const attrs = {};
    for (const a of attrStr.matchAll(/([\w:-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g)) attrs[a[1]] = a[2] ?? a[3] ?? a[4] ?? '';
    const el = { tag, attrs, children: [], parent: cur };
    cur.children.push(el);
    if (RAW.has(tag)) {
      const end = html.indexOf(`</${tag}`, re.lastIndex);
      re.lastIndex = end === -1 ? html.length : html.indexOf('>', end) + 1;
      continue;
    }
    if (!VOID.has(tag) && !selfClose) cur = el;
  }
  return root;
}

const langOf = (el) => el.attrs?.['data-lang'];
const hasLangAncestor = (node) => { for (let n = node.parent; n; n = n.parent) if (n.attrs && ('data-lang' in n.attrs || n.attrs['aria-hidden'] === 'true')) return true; return false; };
const inHeadOrCode = (node) => { for (let n = node.parent; n; n = n.parent) if (['head', 'code', 'pre', 'noscript'].includes(n.tag)) return true; return false; };

export async function auditStaticHtml() {
  const findings = [];
  for await (const file of glob('{index,docentes*}.html')) {
    const tree = parse(readFileSync(file, 'utf8'));
    const walk = (el) => {
      const kids = el.children;
      kids.forEach((child, i) => {
        if (child.text !== undefined) {
          const t = child.text.replace(/&[a-z#0-9]+;/gi, ' ').trim();
          if (/\p{L}{2}/u.test(t) && !hasLangAncestor(child) && !inHeadOrCode(child) && !ALLOWED.some((rx) => rx.test(t))) {
            findings.push(`${file}: text outside data-lang: "${t.slice(0, 60)}"`);
          }
          return;
        }
        const lang = langOf(child);
        const siblings = kids.filter((k) => k.text === undefined);
        const idx = siblings.indexOf(child);
        if (lang === 'es' && langOf(siblings[idx + 1] ?? {}) !== 'en') findings.push(`${file}: data-lang="es" <${child.tag}> without an "en" twin right after it`);
        if (lang === 'en' && langOf(siblings[idx - 1] ?? {}) !== 'es') findings.push(`${file}: data-lang="en" <${child.tag}> without an "es" twin right before it`);
        walk(child);
      });
    };
    walk(tree);
  }
  return findings;
}

if (process.argv[1]?.endsWith('html-bilingual-audit.mjs')) {
  const f = await auditStaticHtml();
  console.log(f.join('\n') || 'ok');
}

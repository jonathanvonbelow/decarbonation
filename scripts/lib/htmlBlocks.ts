/**
 * Generated blocks of the static teacher pages (phase 50): a block lives between `<!-- BEGIN:name -->` and
 * `<!-- END:name -->` in an HTML file and is regenerated from the code, never edited by hand.
 *
 *   npx tsx scripts/<generator>.ts           prints the blocks
 *   npx tsx scripts/<generator>.ts --write   rewrites them in place
 *   npx tsx scripts/<generator>.ts --check   exits 1 if a page is out of date (tests/docentes/generatedTables.spec.ts)
 */
import { readFileSync, writeFileSync } from 'node:fs';

export function replaceBlock(html: string, name: string, content: string): string {
  const begin = `<!-- BEGIN:${name} -->`;
  const end = `<!-- END:${name} -->`;
  const i = html.indexOf(begin);
  const j = html.indexOf(end);
  if (i < 0 || j < i) throw new Error(`block ${name} not found`);
  return `${html.slice(0, i + begin.length)}\n${content}\n${html.slice(j)}`;
}

/** Applies `blocks` to `file` per the CLI flags. Returns true when the file is (or now is) up to date. */
export function runBlocks(file: string, blocks: Record<string, string>, argv: string[] = process.argv.slice(2)): boolean {
  const before = readFileSync(file, 'utf8');
  const eol = before.includes('\r\n') ? '\r\n' : '\n';
  let after = before.replace(/\r\n/g, '\n');
  Object.entries(blocks).forEach(([name, content]) => { after = replaceBlock(after, name, content); });
  after = after.replace(/\n/g, eol);
  if (argv.includes('--write')) {
    if (after !== before) writeFileSync(file, after);
    console.log(`${file}: ${after === before ? 'up to date' : 'updated'}`);
    return true;
  }
  if (argv.includes('--check')) {
    const ok = after === before;
    console.log(`${file}: ${ok ? 'up to date' : 'OUT OF DATE — run with --write'}`);
    if (!ok) process.exitCode = 1;
    return ok;
  }
  Object.entries(blocks).forEach(([name, content]) => console.log(`<!-- ${name} -->\n${content}`));
  return true;
}

export const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

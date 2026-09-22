/**
 * Prints which photograph each of the hundred situations would get (src/territorio/newsArt.ts),
 * grouped by theme, so a mapping that sends a school closure to a tractor blockade is visible
 * without playing until it appears:  npx tsx scripts/news-art-audit.ts
 */
import { SITUATIONS } from '../src/territorio/situations';
import { themeForSituation } from '../src/territorio/newsArt';

const byTheme = new Map<string, string[]>();
SITUATIONS.forEach((def) => {
  const theme = themeForSituation(def) ?? 'sin foto';
  if (!byTheme.has(theme)) byTheme.set(theme, []);
  byTheme.get(theme)!.push(`${def.id} [${def.category}] — ${def.es.title}`);
});
[...byTheme.entries()]
  .sort((a, b) => b[1].length - a[1].length)
  .forEach(([theme, list]) => {
    console.log(`\n=== ${theme} (${list.length})`);
    list.forEach((line) => console.log('   ' + line));
  });

/** Times a full Territorio game on the 100×100 map: npx tsx scripts/territorio-perf.ts [seed] */
import { advanceMonth, createSession, TOTAL_MONTHS } from '../src/territorio/session';

const seed = Number(process.argv[2] ?? 3);
const t0 = Date.now();
let s = createSession(seed);
const create = Date.now() - t0;
const times: number[] = [];
let changes = 0;
for (let i = 0; i < TOTAL_MONTHS && !s.outcome; i++) {
  const a = Date.now();
  s = advanceMonth(s);
  times.push(Date.now() - a);
  changes += s.lastChanges.list.length;
}
times.sort((a, b) => a - b);
const sum = times.reduce((a, b) => a + b, 0);
console.log(`create ${create} ms | ${times.length} months in ${sum} ms | mean ${(sum / times.length).toFixed(1)} ms | p50 ${times[times.length >> 1]} | p95 ${times[Math.floor(times.length * 0.95)]} | max ${times[times.length - 1]} | ${changes} parcel changes (${(changes / times.length).toFixed(1)}/month)`);
console.log('outcome', s.outcome?.kind, 'year', s.game.year);

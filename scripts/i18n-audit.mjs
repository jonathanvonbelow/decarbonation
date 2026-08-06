#!/usr/bin/env node
/**
 * Fails if Spanish-looking literals exist outside src/i18n/ (or per-component T = {es,en} blocks
 * still pending migration -- see docs/DESIGN_DECISIONS_LOG.md, phase-3 entry: this project's
 * component-local dictionaries are a legitimate intermediate state during the Capa A migration,
 * not the "hardcoded string" problem this script is meant to catch. IGNORED_COMPONENTS lists the
 * components not yet migrated to the centralized src/i18n/ dictionary; shrink it as each phase-3
 * follow-up migrates the next component (mejora-general/files/12_i18n_completo.md §7 order).
 *
 * Heuristic, deliberately noisy: false positives are cheap, misses are not.
 */
import { readFileSync } from 'node:fs';
import { glob } from 'node:fs/promises';

const IGNORED = [/^src\/i18n\//, /\.test\.tsx?$/, /^src\/constants\.ts$/, /^src\/legacyContent\//];

// Capa B (contenido de dominio) y Capa C (prompts de IA) del archivo 12 -- estrategias de
// migracion distintas a la Capa A (interfaz) que cubre esta fase. Ver docs/DESIGN_DECISIONS_LOG.md,
// fase 3: quedan para la fase 12 ("Cierre de i18n"), cuando constants.ts tambien sale de la lista
// de ignorados. Enumerados aparte de IGNORED_COMPONENTS para que quede claro que no son "Capa A
// pendiente" sino directamente otro alcance.
const CAPA_B_C_PENDING = [
  'src/services/geminiService.ts',
  'src/services/suggestionService.ts',
  'src/components/equations/descriptions.ts',
  // Policy/LandUseType enum *values* are themselves Spanish prose used as stable IDs throughout
  // the app (Policy.ForeignInvestment = "Politicas de Inversion Extranjera (P-PIE)") -- exactly
  // the domain-content-as-ID pattern file 12 SS4.1 describes indexing by, not translating in place.
  'src/types.ts',
  // src/sim/* narrative log strings (logEvent lines, game-over reasons) were ported verbatim from
  // the pre-extraction App.tsx in phase 2 -- pre-existing Spanish, not new. Structuring them as
  // typed LogEntry objects (file 12 SS4.4.3) so the *view* translates them is deferred to when
  // phase 9 (tutorials/debriefing) or phase 12 touches this area.
  'src/sim/economy.ts',
  'src/sim/events.ts',
  'src/sim/index.ts',
  'src/sim/policies.ts',
];

// Components still using their own local `T = { es: {...}, en: {...} }` dictionary instead of
// the centralized src/i18n/ui/{es,en}.ts -- tracked explicitly so the audit stays actionable.
// Migrated so far (phase 3, this pass): Toast, Header, GameLogPanel, PolicyToggle.
const IGNORED_COMPONENTS = [
  'src/components/PolicyInstrumentsPanel.tsx',
  'src/components/PlayerReportGuideModal.tsx',
  'src/components/levelSpecific/RegionalStatusDashboard.tsx',
  'src/components/levelSpecific/InnovationGlobalDashboard.tsx',
  'src/components/levelSpecific/EventsNewsPanel.tsx',
  'src/components/levelSpecific/RegionalDetailModal.tsx',
  'src/components/Dashboard.tsx',
  'src/components/common/CoverScreen.tsx',
  'src/components/player/PlayerManual.tsx',
  'src/components/game/ClosingSynthesisModal.tsx',
  'src/components/game/GameSummaryPanel.tsx',
  'src/components/common/LevelIntroModal.tsx',
  'src/components/common/TutorialModal.tsx',
  'src/components/common/LevelUpBanner.tsx',
  'src/components/surveys/SurveyPre.tsx',
  'src/components/surveys/SurveyPost.tsx',
  'src/components/equations/EquationsManual.tsx',
  'src/components/facilitator/FacilitatorManual.tsx',
  'src/components/facilitator/FacilitatorPanel.tsx',
  'src/components/auth/LoginScreen.tsx',
  'src/App.tsx',
  // Dev-only test bench (mejora-general/files/13_decarbonito_character.md §5.3), mounted only
  // behind #dev/decarbonito (src/main.tsx) -- never reachable in the normal play flow, so its
  // labels are out of Capa A scope the same way scripts/*.ts (outside src/) are.
  'src/components/decarbonito/DecarboNitoLab.tsx',
];

// Accented characters plus high-frequency Spanish function words.
const SPANISH = /[áéíóúñ¿¡Á-Ú]|\b(el|la|los|las|de|del|que|para|con|por|una|este|esta|más|año|nivel|puntaje|política|cerrar|enviar|siguiente|activar|jugador|presión)\b/i;

// Only inspect user-visible literals: JSX text nodes and quoted strings.
const STRING_LITERAL = /(["'`])((?:(?!\1).){4,}?)\1/g;
const JSX_TEXT = />\s*([^<>{}\n][^<>{}]{3,})\s*</g;

const findings = [];

for await (const file of glob('src/**/*.{ts,tsx}')) {
  const posixFile = file.replaceAll('\\', '/');
  if (IGNORED.some((rx) => rx.test(posixFile))) continue;
  if (IGNORED_COMPONENTS.includes(posixFile)) continue;
  if (CAPA_B_C_PENDING.includes(posixFile)) continue;

  const src = readFileSync(file, 'utf8');
  const lines = src.split('\n');

  lines.forEach((line, i) => {
    if (/^\s*(\/\/|\*|\/\*)/.test(line)) return; // comments may stay in any language
    if (/import\s|from\s['"]|require\(/.test(line)) return;

    const candidates = [
      ...[...line.matchAll(STRING_LITERAL)].map((m) => m[2]),
      ...[...line.matchAll(JSX_TEXT)].map((m) => m[1]),
    ];
    for (const text of candidates) {
      if (/^[\w.\-/#{}[\]$@%:]+$/.test(text)) continue; // class names, paths, ids
      if (SPANISH.test(text)) {
        findings.push({ file: posixFile, line: i + 1, text: text.trim().slice(0, 80) });
      }
    }
  });
}

if (findings.length) {
  console.error(`\n✗ ${findings.length} hardcoded Spanish string(s) found outside src/i18n/ and outside not-yet-migrated components\n`);
  for (const f of findings) console.error(`  ${f.file}:${f.line}  "${f.text}"`);
  console.error('\nMove them to src/i18n/ui/es.ts (+ en.ts) and use t(), or add the file to IGNORED_COMPONENTS if it is a known pending migration.\n');
  process.exit(1);
}
console.log(
  `✓ i18n audit clean (${IGNORED_COMPONENTS.length} Capa A component(s) + ${CAPA_B_C_PENDING.length} Capa B/C file(s) still pending migration, tracked explicitly above).`,
);

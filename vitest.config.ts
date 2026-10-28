import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.spec.ts', 'tests/**/*.spec.tsx'],
    // Phase 46: the annual step is 12 monthly sub-steps; the 30-year multi-seed invariants take 2–4 s alone and can pass
    // the 5 s default when every file runs in parallel.
    testTimeout: 20_000,
    coverage: { include: ['src/sim/**/*.ts'], thresholds: { lines: 80, functions: 85 } },
  },
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
});

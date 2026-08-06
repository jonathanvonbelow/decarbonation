import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.spec.ts'],
    coverage: { include: ['src/sim/**'], thresholds: { lines: 80, functions: 85 } },
  },
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
});

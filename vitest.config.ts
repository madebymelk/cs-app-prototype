import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config.ts';

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      include: ['src/**/*.test.{ts,tsx}'],
      css: { modules: { classNameStrategy: 'non-scoped' } },
      coverage: {
        provider: 'v8',
        // docs/07 M1: 100% of domain rules unit-tested. types.ts holds types only.
        include: ['src/domain/**/*.ts'],
        exclude: ['src/domain/**/*.test.ts', 'src/domain/types.ts'],
        reporter: ['text-summary', 'text'],
        thresholds: { lines: 100, branches: 100, functions: 100, statements: 100 },
      },
    },
  }),
);

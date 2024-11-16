/// <reference types="vitest" />
import { configDefaults, defineConfig } from 'vitest/config'

export default defineConfig({
  esbuild: {
    jsx: 'automatic',
    jsxImportSource: __dirname + '/../src/jsx',
  },
  test: {
    globals: true,
    include: ['**/src/**/(*.)+(spec|test).+(ts|tsx|js)', '**/scripts/**/(*.)+(spec|test).+(ts|tsx|js)', '**/build/**/(*.)+(spec|test).+(ts|tsx|js)'],
    exclude: [...configDefaults.exclude, '**/sandbox/**', '**/*.case.test.+(ts|tsx|js)'],
    setupFiles: ['./.vitest.config/setup-vitest.ts'],
    coverage: {
      enabled: true,
      provider: 'v8',
      reportsDirectory: './coverage/raw/default',
      reporter: ['json', 'text', 'html'],
      exclude: [
        ...(configDefaults.coverage.exclude ?? []),
        'benchmarks',
        'runtime-tests',
        'build/build.ts',
        'src/test-utils',
        'perf-measures',

        // types are compile-time only, so their coverage cannot be measured
        'src/**/types.ts',
        'src/jsx/intrinsic-elements.ts',
        'src/utils/http-status.ts',
      ],
    },
    pool: 'forks',
  },
})

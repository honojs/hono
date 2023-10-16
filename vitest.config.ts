/// <reference types="vitest" />
import { configDefaults, defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    include: ['**/src/**/(*.)+(spec|test).+(ts|tsx|js)'],
    exclude: [...configDefaults.exclude, '**/sandbox/**'],
    setupFiles: ['./src/test-utils/setup-vitest.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text'],
    },
  },
})

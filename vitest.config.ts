/// <reference types="vitest" />
import { configDefaults, defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    include: ['**/src/**/(*.)+(spec|test).+(ts|tsx|js)'],
    exclude: [...configDefaults.exclude, '**/sandbox/**'],
    environment: 'miniflare',
    coverage: {
      provider: 'v8',
      reporter: ['text'],
    },
  },
})

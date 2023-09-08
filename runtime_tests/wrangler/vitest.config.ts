/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    include: ['**/runtime_tests/wrangler/**/(*.)+(test).+(ts|tsx)'],
    exclude: ['**/runtime_tests/wrangler/vitest.config.ts'],
  },
})

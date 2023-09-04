/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    include: ['**/runtime_tests/fastly/**/(*.)+(test).+(ts|tsx)'],
    exclude: ['vitest.config.ts'],
  },
})

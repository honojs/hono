/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    include: ['**/(*.)+(test).+(ts|tsx)'],
    exclude: ['vitest.config.ts']
  }
})

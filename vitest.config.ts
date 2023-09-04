/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    include: ['**/src/**/(*.)+(spec|test).+(ts|tsx|js)'],
    environment: 'miniflare',
  },
})

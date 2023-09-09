/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    include: ['**/runtime_tests/lambda/**/*.+(ts|tsx|js)'],
    exclude: ['**/runtime_tests/lambda/vitest.config.ts'],
  },
})

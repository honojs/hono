/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    include: ['**/runtime_tests/lambda-edge/**/*.+(ts|tsx|js)'],
    exclude: ['**/runtime_tests/lambda-edge/vitest.config.ts']
  }
})

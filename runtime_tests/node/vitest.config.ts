/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    env: {
      NAME: 'Node',
    },
    globals: true,
    include: ['**/runtime_tests/node/**/*.+(ts|tsx|js)'],
    exclude: ['**/runtime_tests/node/vitest.config.ts'],
  },
})

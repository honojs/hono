/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import config from '../../vitest.config'

export default defineConfig({
  test: {
    globals: true,
    include: ['**/runtime-tests/bun/**/*.+(ts|tsx|js)'],
    coverage: {
      ...config.test?.coverage,
      reportsDirectory: './coverage/raw/runtime-bun',
    },
  },
})

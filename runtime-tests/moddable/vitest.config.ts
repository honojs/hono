/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import config from '../../vitest.config'

export default defineConfig({
  test: {
    globals: true,
    include: ['**/runtime-tests/moddable/**/*.+(ts|tsx|js)'],
    exclude: ['**/runtime-tests/moddable/vitest.config.ts'],
    coverage: {
      ...config.test?.coverage,
      reportsDirectory: './coverage/raw/moddable',
    },
  },
})

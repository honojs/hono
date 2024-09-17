/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import config from '../../vitest.config'

export default defineConfig({
  test: {
    globals: true,
    include: ['**/runtime-tests/workerd/**/(*.)+(test).+(ts|tsx)'],
    exclude: ['**/runtime-tests/workerd/vitest.config.ts'],
    coverage: {
      ...config.test?.coverage,
      reportsDirectory: './coverage/raw/runtime-workerd',
    },
  },
})

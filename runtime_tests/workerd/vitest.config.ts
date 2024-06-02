/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import config from '../../vitest.config'

export default defineConfig({
  test: {
    globals: true,
    include: ['**/runtime_tests/workerd/**/(*.)+(test).+(ts|tsx)'],
    exclude: ['**/runtime_tests/workerd/vitest.config.ts'],
    coverage: {
      ...config.test?.coverage,
      reportsDirectory: './coverage/raw/runtime-workerd',
    },
  },
})

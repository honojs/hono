/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import config from '../../vitest.config'

export default defineConfig({
  test: {
    env: {
      NAME: 'Node',
    },
    globals: true,
    include: ['**/runtime-tests/lambda-edge/**/*.+(ts|tsx|js)'],
    exclude: ['**/runtime-tests/lambda-edge/vitest.config.ts'],
    coverage: {
      ...config.test?.coverage,
      reportsDirectory: './coverage/raw/runtime-lambda-edge',
    },
  },
})

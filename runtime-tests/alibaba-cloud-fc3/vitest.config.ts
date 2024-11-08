/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import config from '../../vitest.config'

export default defineConfig({
  test: {
    env: {
      NAME: 'Node',
    },
    globals: true,
    include: ['**/runtime-tests/alibaba-cloud-fc3/**/*.+(ts|tsx|js)'],
    exclude: ['**/runtime-tests/alibaba-cloud-fc3/vitest.config.ts'],
    coverage: {
      ...config.test?.coverage,
      reportsDirectory: './coverage/raw/runtime-alibaba-cloud-fc3',
    },
  },
})

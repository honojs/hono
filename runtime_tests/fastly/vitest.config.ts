/// <reference types="vitest" />
import fastlyCompute from 'vite-plugin-fastly-js-compute'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [fastlyCompute()],
  test: {
    globals: true,
    include: ['**/runtime_tests/fastly/**/(*.)+(test).+(ts|tsx)'],
    exclude: ['**/runtime_tests/fastly/vitest.config.ts'],
  },
})

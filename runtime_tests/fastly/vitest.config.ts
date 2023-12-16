/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import fastlyCompute from "vite-plugin-fastly-js-compute";

export default defineConfig({
  plugins: [fastlyCompute()],
  test: {
    globals: true,
    include: ['**/runtime_tests/fastly/**/(*.)+(test).+(ts|tsx)'],
    exclude: ['**/runtime_tests/fastly/vitest.config.ts'],
  },
})

import fastlyCompute from 'vite-plugin-fastly-js-compute'
import { defineProject } from 'vitest/config'

export default defineProject({
  plugins: [fastlyCompute()],
  test: {
    globals: true,
    name: 'fastly',
  },
})

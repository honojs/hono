import { defineConfig } from 'vite-plus'

export default defineConfig({
  pack: {
    entry: ['src/**/*.ts', '!src/**/*.test.ts', '!src/**/*.d.ts'],
    tsconfig: 'tsconfig.json',
    unbundle: true,
    format: ['esm'],
    dts: true,
    outExtensions: () => ({ js: '.js', dts: '.d.ts' }),
  },
  test: {
    globals: true,
  },
})

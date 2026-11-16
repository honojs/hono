import { defineConfig } from 'vite-plus'
import { appendExportEmptyToDts } from '../../build/dts-plugins'

export default defineConfig({
  pack: {
    entry: ['src/**/*.ts', '!src/**/*.test.ts', '!src/**/*.d.ts'],
    tsconfig: 'tsconfig.json',
    unbundle: true,
    format: ['esm'],
    dts: true,
    plugins: [appendExportEmptyToDts],
    outExtensions: () => ({ js: '.js', dts: '.d.ts' }),
  },
  test: {
    globals: true,
  },
})

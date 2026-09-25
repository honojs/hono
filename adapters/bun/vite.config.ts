import { defineConfig } from 'vite-plus'

const common = {
  entry: ['src/**/*.ts', '!src/**/*.test.ts'],
  tsconfig: 'tsconfig.json',
  unbundle: true,
  clean: false,
}

export default defineConfig({
  pack: [
    {
      ...common,
      format: ['esm'],
      outDir: 'dist',
      dts: false,
      outExtensions: () => ({ js: '.js' }),
    },
    {
      ...common,
      format: ['cjs'],
      outDir: 'dist/cjs',
      dts: false,
      outExtensions: () => ({ js: '.js' }),
    },
    {
      ...common,
      format: ['esm'],
      outDir: 'dist/types',
      dts: { emitDtsOnly: true },
      outExtensions: () => ({ dts: '.d.ts' }),
    },
  ],
  test: {
    globals: true,
  },
})

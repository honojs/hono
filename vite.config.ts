import { defineConfig } from 'vite-plus'
import oxfmtConfig from './.oxfmtrc.json' with { type: 'json' }
import oxlintConfig from './.oxlintrc.json' with { type: 'json' }

const entry = ['src/**/*.ts', '!src/**/*.test.ts', '!src/**/*.test.tsx']
const common = {
  entry,
  tsconfig: 'tsconfig.build.json',
  unbundle: true,
  clean: false,
}

export default defineConfig({
  fmt: oxfmtConfig,
  lint: oxlintConfig,
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
})

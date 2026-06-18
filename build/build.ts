/*
  This script is heavily inspired by `built.ts` used in @kaze-style/react.
  https://github.com/taishinaritomi/kaze-style/blob/main/scripts/build.ts
  MIT License
  Copyright (c) 2022 Taishi Naritomi
*/

/// <reference types="bun-types" />

import { $, Glob } from 'bun'
import { build, context } from 'esbuild'
import type { Plugin, PluginBuild, BuildOptions } from 'esbuild'
import fs from 'fs'
import path from 'path'
import { removePrivateFields } from './remove-private-fields'
import { validateExports } from './validate-exports'

const isWatch = process.argv.includes('--watch')

const readJsonExports = (path: string) => JSON.parse(fs.readFileSync(path, 'utf-8')).exports

const [packageJsonExports, jsrJsonExports] = ['./package.json', './jsr.json'].map(readJsonExports)

// Validate exports of package.json and jsr.json
validateExports(packageJsonExports, jsrJsonExports, 'jsr.json')
validateExports(jsrJsonExports, packageJsonExports, 'package.json')

const ignorePatterns = [
  'src/**/*.test.ts',
  'src/mod.ts',
  'src/middleware.ts',
  'src/deno/**/*.ts',
].map((pattern) => new Glob(pattern))
const entryPoints: string[] = []
for await (const file of new Glob('src/**/*.ts').scan('.')) {
  if (!ignorePatterns.some((ignore) => ignore.match(file))) {
    entryPoints.push(file)
  }
}

/*
  This plugin is inspired by the following.
  https://github.com/evanw/esbuild/issues/622#issuecomment-769462611
*/
const addExtension = (extension: string = '.js', fileExtension: string = '.ts'): Plugin => ({
  name: 'add-extension',
  setup(build: PluginBuild) {
    build.onResolve({ filter: /.*/ }, (args) => {
      if (args.importer) {
        const p = path.join(args.resolveDir, args.path)
        let tsPath = `${p}${fileExtension}`

        let importPath = ''
        if (fs.existsSync(tsPath)) {
          importPath = args.path + extension
        } else {
          tsPath = path.join(args.resolveDir, args.path, `index${fileExtension}`)
          if (fs.existsSync(tsPath)) {
            if (args.path.endsWith('/')) {
              importPath = `${args.path}index${extension}`
            } else {
              importPath = `${args.path}/index${extension}`
            }
          }
        }
        return { path: importPath, external: true }
      }
    })
  },
})

const commonOptions: BuildOptions = {
  entryPoints,
  logLevel: 'info',
  platform: 'node',
}

const cjsConfig: BuildOptions = {
  ...commonOptions,
  outbase: './src',
  outdir: './dist/cjs',
  format: 'cjs',
}

const esmConfig: BuildOptions = {
  ...commonOptions,
  bundle: true,
  outbase: './src',
  outdir: './dist',
  format: 'esm',
  plugins: [addExtension('.js')],
}

const runBuild = async (config: BuildOptions) => {
  if (isWatch) {
    const ctx = await context(config)
    await ctx.watch()
  } else {
    await build(config)
  }
}

await Promise.all([
  runBuild(esmConfig),
  runBuild(cjsConfig),
  $`tsc ${
    isWatch ? ['-w'] : []
  } --emitDeclarationOnly --declaration --project tsconfig.build.json`.nothrow(),
])

// Remove #private fields
const dtsEntries: string[] = []
for await (const file of new Glob('dist/types/**/*.d.ts').scan('.')) {
  dtsEntries.push(file)
}
await removePrivateFields(dtsEntries)

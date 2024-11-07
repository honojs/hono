/*
  This script is heavily inspired by `built.ts` used in @kaze-style/react.
  https://github.com/taishinaritomi/kaze-style/blob/main/scripts/build.ts
  MIT License
  Copyright (c) 2022 Taishi Naritomi
*/

/// <reference types="bun-types/bun" />

import arg from 'arg'
import { $, stdout } from 'bun'
import { build } from 'esbuild'
import type { Plugin, PluginBuild, BuildOptions } from 'esbuild'
import * as glob from 'glob'
import fs from 'fs'
import path from 'path'
import { removePrivateFields } from './remove-private-fields'

const args = arg({
  '--watch': Boolean,
})

const isWatch = args['--watch'] || false

const entryPoints = glob.sync('./src/**/*.ts', {
  ignore: ['./src/**/*.test.ts', './src/mod.ts', './src/middleware.ts', './src/deno/**/*.ts'],
})

const readJsonExports = (path: string) => JSON.parse(fs.readFileSync(path, 'utf-8')).exports

const [packageJsonExports, jsrJsonExports] = ['./package.json', './jsr.json'].map(readJsonExports)

const validateExports = (
  source: Record<string, unknown>,
  target: Record<string, unknown>,
  fileName: string
) => {
  const isEntryInTarget = (entry: string): boolean => {
    if (entry in target) {
      return true
    }

    // e.g., "./utils/*" -> "./utils"
    const wildcardPrefix = entry.replace(/\/\*$/, '')
    if (entry.endsWith('/*')) {
      return Object.keys(target).some(
        (targetEntry) =>
          targetEntry.startsWith(wildcardPrefix + '/') && targetEntry !== wildcardPrefix
      )
    }

    const separatedEntry = entry.split('/')
    while (separatedEntry.length > 0) {
      const pattern = `${separatedEntry.join('/')}/*`
      if (pattern in target) {
        return true
      }
      separatedEntry.pop()
    }

    return false
  }

  Object.keys(source).forEach((sourceEntry) => {
    if (!isEntryInTarget(sourceEntry)) {
      throw new Error(`Missing ${sourceEntry} in ${fileName}`)
    }
  })
}

validateExports(packageJsonExports, jsrJsonExports, 'jsr.json')
validateExports(jsrJsonExports, packageJsonExports, 'package.json')

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
  watch: isWatch,
  entryPoints,
  logLevel: 'info',
  platform: 'node',
}

const cjsBuild = () =>
  build({
    ...commonOptions,
    outbase: './src',
    outdir: './dist/cjs',
    format: 'cjs',
  })

const esmBuild = () =>
  build({
    ...commonOptions,
    bundle: true,
    outbase: './src',
    outdir: './dist',
    format: 'esm',
    plugins: [addExtension('.js')],
  })

Promise.all([esmBuild(), cjsBuild()])

await $`tsc ${
  isWatch ? '-w' : ''
} --emitDeclarationOnly --declaration --project tsconfig.build.json`.nothrow()

// Remove #private fields
const dtsEntries = glob.globSync('./dist/types/**/*.d.ts')
const writer = stdout.writer()
writer.write('\n')
let lastOutputLength = 0
for (let i = 0; i < dtsEntries.length; i++) {
  const entry = dtsEntries[i]

  const message = `Removing private fields(${i}/${dtsEntries.length}): ${entry}`
  writer.write(`\r${' '.repeat(lastOutputLength)}`)
  lastOutputLength = message.length
  writer.write(`\r${message}`)

  fs.writeFileSync(entry, removePrivateFields(entry))
}
writer.write('\n')

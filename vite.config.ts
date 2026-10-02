import { RolldownMagicString } from 'rolldown'
import { parse, Visitor } from 'rolldown/utils'
import { defineConfig } from 'vite-plus'
import type { TsdownPluginOption } from 'vite-plus/pack'
import oxfmtConfig from './.oxfmtrc.json' with { type: 'json' }
import oxlintConfig from './.oxlintrc.json' with { type: 'json' }
import { appendExportEmptyToDts } from './build/dts-plugins'

const removeDtsPrivateFieldsPlugin: TsdownPluginOption = {
  name: 'hono:remove-dts-private-fields',
  async renderChunk(code, id) {
    if (!id.fileName.endsWith('.d.ts')) {
      return
    }

    const ast = await parse(id.fileName, code)
    const ms = new RolldownMagicString(code, { filename: id.fileName })

    new Visitor({
      ClassDeclaration: (node) => {
        node.body.body.forEach((elem) => {
          if (elem.type === 'PropertyDefinition' && elem.key.type === 'PrivateIdentifier') {
            this.info(`Removing private field from ${id.fileName}`)
            ms.remove(elem.start, elem.end)
          }
        })
      },
    }).visit(ast.program)

    return ms.toString()
  },
}

const validatePackageExportsPlugin: TsdownPluginOption = {
  name: 'hono:validate-package-exports',
  async buildStart() {
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
          throw new Error(`Missing "${sourceEntry}" in '${fileName}'`)
        }
      })
    }

    const pkgJson = await import('./package.json', { with: { type: 'json' } })
    const jsrJson = await import('./jsr.json', { with: { type: 'json' } })

    validateExports(pkgJson.exports, jsrJson.exports, 'jsr.json')
    validateExports(jsrJson.exports, pkgJson.exports, 'package.json')
  },
}

export default defineConfig({
  fmt: oxfmtConfig,
  lint: oxlintConfig,
  pack: {
    entry: ['src/**/*.ts', '!src/**/*.test.ts', '!src/**/*.test.tsx'],
    tsconfig: 'tsconfig.build.json',
    unbundle: true,
    format: ['esm'],
    dts: true,
    outExtensions: () => ({ js: '.js', dts: '.d.ts' }),
    plugins: [validatePackageExportsPlugin, removeDtsPrivateFieldsPlugin, appendExportEmptyToDts],
  },
})

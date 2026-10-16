import { existsSync, readFileSync } from 'node:fs'
import { basename, dirname, join, relative, resolve, sep } from 'node:path'
import { RolldownMagicString } from 'rolldown'
import { parse } from 'rolldown/utils'
import type { TsdownPluginOption } from 'vite-plus/pack'

const DECLARATION_TYPES = new Set([
  'TSTypeAliasDeclaration',
  'TSInterfaceDeclaration',
  'TSDeclareFunction',
  'TSEnumDeclaration',
  'TSModuleDeclaration',
  'VariableDeclaration',
  'ClassDeclaration',
  'FunctionDeclaration',
])

/**
 * Append `export {}` to an emitted `.d.ts` module that has top-level declarations without `export`,
 * exactly as tsc does when it emits declaration files.
 *
 * Without it TypeScript treats every top-level declaration of a `.d.ts` module as exported, so
 * consumers' declaration emit may reference internal aliases through `<pkg>/dist/...`, which is
 * not reachable via the package exports (TS2883). The bundled dts emit does not add it.
 */
export const appendExportEmptyToDts: TsdownPluginOption = {
  name: 'hono:append-export-empty-to-dts',
  async renderChunk(code, chunk) {
    if (!chunk.fileName.endsWith('.d.ts')) {
      return
    }

    const { body } = (await parse(chunk.fileName, code)).program

    let isModule = false
    let hasPrivateDeclaration = false
    for (const statement of body) {
      if (statement.type === 'ImportDeclaration' || statement.type.startsWith('Export')) {
        isModule = true
        // `export {}` or `export = x` already turns the implicit export off
        if (
          (statement.type === 'ExportNamedDeclaration' &&
            !statement.declaration &&
            statement.specifiers.length === 0) ||
          statement.type === 'TSExportAssignment'
        ) {
          return
        }
      } else if (DECLARATION_TYPES.has(statement.type)) {
        hasPrivateDeclaration = true
      }
    }

    if (isModule && hasPrivateDeclaration) {
      return `${code}\nexport {};\n`
    }
  },
}

const SOURCE_EXTENSIONS = ['.ts', '.tsx']

const resolveSource = (base: string): string | undefined => {
  for (const ext of SOURCE_EXTENSIONS) {
    if (existsSync(base + ext)) {
      return base + ext
    }
  }
  for (const ext of SOURCE_EXTENSIONS) {
    const index = join(base, `index${ext}`)
    if (existsSync(index)) {
      return index
    }
  }
}

const nameOf = (node: { type: string; name?: string; value?: string }): string =>
  node.name ?? String(node.value)

/**
 * Import through the barrel (`./client`) again where the source does, instead of the file that
 * declares the type (`./client/types.js`), as tsc emits.
 *
 * The bundled dts emit resolves every import to the declaring file, so a consumer who imports
 * `hono` no longer loads `client/index.d.ts`, and tsc cannot name `ClientRequest` as
 * `import("hono/client").ClientRequest` in the consumer's declaration emit (TS2883).
 */
export const keepBarrelImportsInDts: TsdownPluginOption = {
  name: 'hono:keep-barrel-imports-in-dts',
  async renderChunk(code, chunk) {
    if (!chunk.fileName.endsWith('.d.ts') || !chunk.facadeModuleId) {
      return
    }
    const source = resolveSource(chunk.facadeModuleId.replace(/\.d\.ts$/, ''))
    if (!source) {
      return
    }

    const sourceDir = dirname(source)
    const barrels = new Map<string, Set<string>>()
    for (const statement of (await parse(source, readFileSync(source, 'utf8'))).program.body) {
      if (statement.type !== 'ImportDeclaration' && statement.type !== 'ExportNamedDeclaration') {
        continue
      }
      const specifier = statement.source?.value
      if (!specifier?.startsWith('.')) {
        continue
      }
      const target = resolveSource(resolve(sourceDir, specifier))
      if (!target || !/^index\.tsx?$/.test(basename(target))) {
        continue
      }
      const names = barrels.get(dirname(target)) ?? new Set<string>()
      for (const s of statement.specifiers) {
        if (s.type === 'ImportSpecifier') {
          names.add(nameOf(s.imported))
        } else if (s.type === 'ExportSpecifier') {
          names.add(nameOf(s.local))
        }
      }
      barrels.set(dirname(target), names)
    }
    if (barrels.size === 0) {
      return
    }

    const chunkDir = dirname(chunk.facadeModuleId)
    const ms = new RolldownMagicString(code, { filename: chunk.fileName })
    let changed = false
    for (const statement of (await parse(chunk.fileName, code)).program.body) {
      if (statement.type !== 'ImportDeclaration' || !statement.source.value.startsWith('.')) {
        continue
      }
      const target = resolve(chunkDir, statement.source.value.replace(/\.js$/, ''))
      const names = barrels.get(dirname(target))
      if (!names || basename(target) === 'index' || !statement.specifiers) {
        continue
      }
      const viaBarrel = statement.specifiers.filter(
        (s) => s.type === 'ImportSpecifier' && names.has(nameOf(s.imported))
      )
      if (viaBarrel.length === 0) {
        continue
      }
      let barrel = relative(chunkDir, join(dirname(target), 'index.js'))
        .split(sep)
        .join('/')
      if (!barrel.startsWith('.')) {
        barrel = `./${barrel}`
      }
      if (viaBarrel.length === statement.specifiers.length) {
        ms.overwrite(statement.source.start + 1, statement.source.end - 1, barrel)
      } else {
        const keyword = statement.importKind === 'type' ? 'import type' : 'import'
        const list = (specifiers: typeof viaBarrel) =>
          specifiers.map((s) => code.slice(s.start, s.end)).join(', ')
        const rest = statement.specifiers.filter((s) => !viaBarrel.includes(s))
        ms.overwrite(
          statement.start,
          statement.end,
          `${keyword} { ${list(viaBarrel)} } from "${barrel}";\n` +
            `${keyword} { ${list(rest)} } from ${code.slice(statement.source.start, statement.source.end)};`
        )
      }
      changed = true
    }
    if (changed) {
      return ms.toString()
    }
  },
}

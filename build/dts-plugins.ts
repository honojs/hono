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

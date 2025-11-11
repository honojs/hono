import type { PropertyDefinition, ParseResult } from 'oxc-parser'
import { parseSync, Visitor } from 'oxc-parser'
import { readFile, writeFile } from 'fs/promises'

export async function removePrivateFields(files: string[]) {
  const start = performance.now()
  const parsed = await Promise.all(
    files.map(async (file) => {
      const sourceCode = await readFile(file, 'utf-8')
      const ast = parseSync(file, sourceCode)
      return { file, sourceCode, ast }
    })
  )

  await Promise.all(
    parsed.map(async ({ file, sourceCode, ast }) => {
      const sourceCodeWithoutPrivateFields = removePrivateFieldFromSourceCode(ast, sourceCode)
      if (sourceCodeWithoutPrivateFields) {
        await writeFile(file, sourceCodeWithoutPrivateFields)
      }
    })
  )
  const end = performance.now()
  console.log(`Done removing private fields in ${(end - start).toFixed(2)}ms`)
}

export function removePrivateFieldFromSourceCode(ast: ParseResult, sourceCode: string) {
  const removals: PropertyDefinition[] = []
  new Visitor({
    ClassDeclaration: (node) => {
      node.body.body.forEach((elem) => {
        if (elem.type === 'PropertyDefinition' && elem.key.type === 'PrivateIdentifier') {
          removals.push(elem)
        }
      })
    },
  }).visit(ast.program)

  if (removals.length === 0) {
    return
  }

  let sourceCodeWithoutPrivateFields = sourceCode
  for (const elem of removals) {
    sourceCodeWithoutPrivateFields = removeRange(
      sourceCodeWithoutPrivateFields,
      elem.start,
      elem.end
    )
  }

  return sourceCodeWithoutPrivateFields
}

function removeRange(str: string, start: number, end: number) {
  return str.slice(0, start) + ' '.repeat(end - start) + str.slice(end)
}

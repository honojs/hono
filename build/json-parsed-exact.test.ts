import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const compiler = createRequire(import.meta.url).resolve('typescript/bin/tsc')
const project = fileURLToPath(
  new URL('./fixtures/json-parsed-exact/tsconfig.json', import.meta.url)
)

describe('JSONParsed with exactOptionalPropertyTypes', () => {
  it('keeps an optional property optional without adding undefined', { timeout: 30_000 }, () => {
    const result = spawnSync(process.execPath, [compiler, '--project', project], {
      encoding: 'utf8',
    })
    expect(result.stdout + result.stderr).toBe('')
    expect(result.status).toBe(0)
  })
})

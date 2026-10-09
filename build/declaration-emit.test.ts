import { spawnSync } from 'node:child_process'
import { cpSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const compiler = createRequire(import.meta.url).resolve('typescript/bin/tsc')
const fixture = fileURLToPath(new URL('./fixtures/declaration-emit', import.meta.url))
const packageRoot = fileURLToPath(new URL('..', import.meta.url))

describe('published declarations', () => {
  it('let consumers emit declarations for types inferred from hono', () => {
    // The fixture must live outside this package: inside it, tsc can always reach
    // `dist/*` with a relative path and never reports TS2883.
    const project = mkdtempSync(join(tmpdir(), 'hono-declaration-emit-'))
    try {
      cpSync(fixture, project, { recursive: true })
      mkdirSync(join(project, 'node_modules'))
      symlinkSync(packageRoot, join(project, 'node_modules', 'hono'), 'dir')
      writeFileSync(join(project, 'package.json'), '{ "type": "module" }\n')

      const result = spawnSync(
        process.execPath,
        [compiler, '--project', project, '--outDir', join(project, 'out')],
        { encoding: 'utf8' }
      )
      // Without `export {}` in the bundled `.d.ts`, tsc fails with TS2883 here:
      // internal aliases such as the return type of `c.json()` look exported from
      // `hono/dist/...`, which is not reachable through the package exports.
      expect(result.stdout + result.stderr).toBe('')
      expect(result.status).toBe(0)
    } finally {
      rmSync(project, { recursive: true, force: true })
    }
  })
})

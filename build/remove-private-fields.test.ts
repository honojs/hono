/// <reference types="vitest/globals" />

import { removePrivateFields } from './remove-private-fields'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'

describe('removePrivateFields', () => {
  it('Works', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'removePrivateFields'))
    const tsPath = path.join(tmpDir, 'class.ts')
    await fs.writeFile(tsPath, 'class X { #private: number = 0; a: number = 0 }')
    expect(removePrivateFields(tsPath)).toBe(`class X {
    a: number = 0;
}
`)
  })
  it('Should throw error when path does not exist', () => {
    expect(() => removePrivateFields('./unknown.ts')).toThrowError(Error)
  })
})

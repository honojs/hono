/// <reference types="vitest/globals" />

import { validateExports } from './validate-exports'

const mockExports1 = {
  './a': './a.ts',
  './b': './b.ts',
  './c/a': './c.ts',
  './d/*': './d/*.ts',
}

const mockExports2 = {
  './a': './a.ts',
  './b': './b.ts',
  './c/a': './c.ts',
  './d/a': './d/a.ts',
}

const mockExports3 = {
  './a': './a.ts',
  './c/a': './c.ts',
  './d/*': './d/*.ts',
}

describe('validateExports', () => {
  it('Works', async () => {
    expect(() => validateExports(mockExports1, mockExports1, 'package.json')).not.toThrowError()
    expect(() => validateExports(mockExports1, mockExports2, 'jsr.json')).not.toThrowError()
    expect(() => validateExports(mockExports1, mockExports3, 'package.json')).toThrowError()
  })
})

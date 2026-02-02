/// <reference types="vitest/globals" />

import { parseSync } from 'oxc-parser'
import { removePrivateFieldFromSourceCode } from './remove-private-fields'

describe('removePrivateFields', () => {
  it('should remove private fields from declarations', () => {
    const sourceCode = `
    import type { Result, Router } from '../../router';
    export declare class PatternRouter<T> implements Router<T> {
        #private;
        name: string;
        add(method: string, path: string, handler: T): void;
        match(method: string, path: string): Result<T>;
    }
    `.trim()

    const ast = parseSync('types.d.ts', sourceCode)
    const result = removePrivateFieldFromSourceCode(ast, sourceCode)
    expect(result).toBeDefined()

    // expected code should be same, but the `#private;` is replaced with spaces
    const expected = sourceCode.replace('#private;', ' '.repeat(9))
    expect(result).toMatch(expected)
  })
})

import { describe, it, expect } from 'vitest'
import { joinPaths, dirname } from './utils'

describe('joinPath', () => {
  it('Should joined path is valid.', () => {
    expect(joinPaths('test')).toBe('test') //single
    expect(joinPaths('.test')).toBe('.test') //single with dot
    expect(joinPaths('/.test')).toBe('/.test') //single with dot with root
    expect(joinPaths('test', 'test2')).toBe('test/test2') // single and single
    expect(joinPaths('test', 'test2', '../test3')).toBe('test/test3') // single and single and single with parent
    expect(joinPaths('.', '../')).toBe('..') // dot and parent
    expect(joinPaths('test/', 'test2/')).toBe('test/test2') // trailing slashes
    expect(joinPaths('./test', './test2')).toBe('test/test2') // dot and slash
    expect(joinPaths('', 'test')).toBe('test') // empty path
    expect(joinPaths('/test', '/test2')).toBe('/test/test2') // root path
    expect(joinPaths('../', 'test')).toBe('../test') // parent and single
    expect(joinPaths('test', '..', 'test2')).toBe('test2') // single triple dot and single
    expect(joinPaths('test', '...', 'test2')).toBe('test/.../test2') // single triple dot and single
    expect(joinPaths('test', './test2', '.test3.')).toBe('test/test2/.test3.') // single and single with slash and single with dot
    expect(joinPaths('test', '../', '.test2')).toBe('.test2') // single and parent and single with dot
    expect(joinPaths('.test../test2/../')).toBe('.test..') //shuffle
    expect(joinPaths('.test./.test2/../')).toBe('.test.') //shuffle2
  })
  it('Should windows path is valid.', () => {
    expect(joinPaths('a\\b\\c', 'd\\e')).toBe('a/b/c/d/e')
  })
})
describe('dirname', () => {
  it('Should dirname is valid.', () => {
    expect(dirname('parent/child')).toBe('parent')
    expect(dirname('windows\\test.txt')).toBe('windows')
  })
})

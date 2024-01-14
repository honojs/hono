import { describe, it, expect } from 'vitest'
import { joinPaths, dirname } from './utils'

describe('joinPath', () => {
  it('Should joined path is valid.', () => {
    expect(joinPaths('test', 'test2')).toBe('test/test2')
    expect(joinPaths('test', 'test2', '../test3')).toBe('test/test3')
    expect(joinPaths('.', '../')).toBe('..')
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

import { relative } from './relative'

const relativeTestCases: [string, string, string][] = [
  ['/a/b/c', '/a/b/d/e', '../d/e'],
  ['/a/b/c', '/a/b/c/d/e/f/g', 'd/e/f/g'],
  ['/a/b/c', '/a/c/d/e/f/g', '../../c/d/e/f/g'],
  ['/a/b/c', '/a/c/d/e', '../../c/d/e'],
  ['/a/b/c', '/a/c', '../../c'],
  ['/a/b/c', '/d/e/f/g', '../../../d/e/f/g'],
  ['/a/b/c', '/d/e', '../../../d/e'],
  ['/a/b/c', '/d', '../../../d'],
  ['/a/b/c', '/a/b/c', ''],
  ['/a/b/c', '/a/b/c/', ''],
  ['/a/b/c', '/a/b/c/d/e/f/g', 'd/e/f/g'],
]

describe('relative', () => {
  it('Should return relative path', () => {
    for (const [from, to, expected] of relativeTestCases) {
      expect(relative(from, to)).toBe(expected)
    }
  })
})

import { join as posixJoin } from 'node:path/posix'
import { defaultJoin } from './path'

describe('defaultJoin', () => {
  describe('Comparison with node:path/posix.join', () => {
    it('Should behave like path.posix.join for all path operations', () => {
      const testCases = [
        // Basic path joining
        ['/home/yusuke/work/app/public', 'static/main.html'],
        ['public', 'sub/', 'file.html'],
        ['', 'file.html'],
        ['public', ''],
        ['public/', 'file.html'],
        ['public', 'static', 'main.html'],
        ['assets', 'images', 'logo.png'],

        // Parent directory references
        ['public', '../parent/file.html'],
        ['public', '../../grandparent/file.html'],
        ['/abs/path', '../relative.html'],
        ['a/b', '../c'],
        ['a/b/c', '../../d'],

        // Current directory references
        ['./public', 'static/main.html'],
        ['public', './file.html'],
        ['./public', '/absolute/path.html'],
        ['.', 'file.html'],
        ['public/.', 'file.html'],

        // Edge cases
        [],
        ['.'],
        [''],
        ['/'],
        ['a', 'b', 'c'],

        // Backslash handling (security)
        ['static', 'test\\file.txt'],
        ['public', 'path\\with\\backslash'],
      ]

      testCases.forEach(([...args]) => {
        const expected = posixJoin(...args)
        const actual = defaultJoin(...args)
        expect(actual).toBe(expected)
      })
    })
  })
})

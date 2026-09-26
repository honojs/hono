import { UnsupportedPathError } from '../../router'
import { runTest } from '../common.case.test'
import { PatternRouter } from './router'

describe('Pattern', () => {
  runTest({
    skip: [
      {
        reason: 'UnsupportedPath',
        tests: [
          'Duplicate param name > self',
          // A named capture group has to be a valid identifier, so `year-:month`
          // and `id.json` cannot be expressed. `add()` throws instead.
          'Multiple params in one segment > GET /date/2026-09',
          'Multiple params in one segment > GET /a/1.json',
        ],
      },
      {
        reason: 'PatternRouter allows trailing slashes',
        tests: ['Trailing slash > GET /book/'],
      },
    ],
    newRouter: () => new PatternRouter(),
  })

  describe('Duplicate param name', () => {
    it('self', () => {
      const router = new PatternRouter<string>()
      expect(() => {
        router.add('GET', '/:id/:id', 'foo')
      }).toThrowError(UnsupportedPathError)
    })
  })

  describe('Multiple params in one segment', () => {
    it('throws, because the parameter name is not a valid capture group name', () => {
      const router = new PatternRouter<string>()
      expect(() => {
        router.add('GET', '/date/:year-:month', 'foo')
      }).toThrowError(UnsupportedPathError)
      expect(() => {
        router.add('GET', '/a/:id.json', 'foo')
      }).toThrowError(UnsupportedPathError)
    })
  })
  describe('Trailing slash', () => {
    const router = new PatternRouter<string>()

    beforeEach(() => {
      router.add('GET', '/book', 'GET /book')
      router.add('GET', '/book/:id', 'GET /book/:id')
    })

    it('GET /book/', () => {
      const [res] = router.match('GET', '/book/')
      expect(res.length).toBe(1)
      expect(res[0][0]).toBe('GET /book')
    })
  })
})

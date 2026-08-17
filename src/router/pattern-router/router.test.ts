import { UnsupportedPathError } from '../../router'
import { runTest } from '../common.case.test'
import { PatternRouter } from './router'

describe('Pattern', () => {
  runTest({
    skip: [
      {
        reason: 'UnsupportedPath',
        tests: ['Duplicate param name > self'],
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
  describe('Suffix wildcard', () => {
    const router = new PatternRouter<string>()
    router.add('GET', '/assets*', 'assets')

    it('GET /assets/app.js', () => {
      const [res] = router.match('GET', '/assets/app.js')
      expect(res.length).toBe(1)
      expect(res[0][0]).toBe('assets')
    })

    it('GET /assets', () => {
      const [res] = router.match('GET', '/assets')
      expect(res.length).toBe(1)
      expect(res[0][0]).toBe('assets')
    })

    it('GET /asset', () => {
      const [res] = router.match('GET', '/asset')
      expect(res.length).toBe(0)
    })
  })

  describe('Trailing wildcard', () => {
    const router = new PatternRouter<string>()
    router.add('GET', '/path/*', 'path')

    it('GET /path', () => {
      const [res] = router.match('GET', '/path')
      expect(res.length).toBe(1)
      expect(res[0][0]).toBe('path')
    })

    it('GET /path/to/file', () => {
      const [res] = router.match('GET', '/path/to/file')
      expect(res.length).toBe(1)
      expect(res[0][0]).toBe('path')
    })

    it('GET /pathfoo', () => {
      const [res] = router.match('GET', '/pathfoo')
      expect(res.length).toBe(0)
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

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
  describe('Trailing slash', () => {
    let router: PatternRouter<string>

    beforeEach(() => {
      router = new PatternRouter<string>()
      router.add('GET', '/book', 'GET /book')
      router.add('GET', '/book/:id', 'GET /book/:id')
    })

    it('GET /book/', () => {
      const [res] = router.match('GET', '/book/')
      expect(res.length).toBe(0)
    })
    it('GET /book/42', () => {
      const [res] = router.match('GET', '/book/42')
      expect(res.length).toBe(1)
      expect(res[0][0]).toBe('GET /book/:id')
    })
    it('GET /book/42/', () => {
      const [res] = router.match('GET', '/book/42/')
      expect(res.length).toBe(0)
    })
  })
})
